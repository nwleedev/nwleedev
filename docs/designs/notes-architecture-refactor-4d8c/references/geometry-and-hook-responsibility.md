# 메모 조작 실패와 Hook 책임 조사

기존 메모 조작 검사에는 저장 완료 전에 IndexedDB를 읽을 수 있는 경합이 있지만, 이것이 관찰된 실패의 원인인지와 실제 메모 조작에도 결함이 있는지는 아직 확인되지 않았다. 이 자료는 [메모 조작과 모듈 책임 요구사항](../requirements.md)의 구현 순서를 정하는 개발자를 위한 것이다. 조사 기준일은 2026-09-25이며, 저장소의 React 19.2.8, Next.js 16.3.3, Playwright 1.62.1 구현과 기존 검사 코드를 확인했다.

## 메모 조작 실패에서 확인된 사실

[이전 실행 기록](../plan.md#u1-변경-전-동작과-비용을-고정한다)에는 메모의 여덟 방향 크기 조절과 확대 후 이동 및 크기 조절 검사가 Chromium, Firefox, WebKit에서 각각 실패한 사실이 남아 있다. 동일 검사의 실패가 리팩토링 전에도 있었으므로 새 Hook 파일 배치가 처음 일으킨 회귀로 볼 근거는 없다. 다만 기록에는 첫 불일치가 포인터 입력, 화면 미리보기, IndexedDB 저장 또는 검사 시점 가운데 어디서 발생했는지 구분한 자료가 없다.

[`NoteCard`](../../../../apps/notes/src/_pages/notes/ui/note-card.tsx)는 이동 핸들과 여덟 크기 조절 지점의 포인터 이벤트를 [`useNoteGeometryGesture`](../../../../apps/notes/src/_pages/notes/model/use-note-geometry-gesture.ts)에 전달한다. Hook은 `clientX`, `clientY`의 차이를 현재 배율로 나눠 저장 좌표를 계산하고, 포인터를 놓을 때 화면 미리보기를 바꾼 뒤 `persist`를 기다리지 않고 시작한다.

메모 변경은 [`useNotesDataModel`](../../../../apps/notes/src/_pages/notes/model/use-notes-data-model.ts)의 순차 변경 queue를 지나 [`IndexedDbNoteRepository.save`](../../../../apps/notes/src/entities/note/api/indexed-db-note-repository.ts)로 전달된다. Repository의 Promise는 [공통 IndexedDB transaction 완료 처리](../../../../apps/notes/src/shared/lib/indexed-db/index.ts)가 `complete`를 받은 뒤 끝난다. [IndexedDB 표준](https://www.w3.org/TR/IndexedDB/#transaction-committing)도 `complete`를 transaction의 성공적인 commit 이후에 발생시키며, 요청 성공과 transaction 완료를 구분한다.

실패한 두 검사의 [`GeometryReal.inspect`](../../../../apps/notes/e2e/notes-geometry-model.spec.ts)는 `page.mouse.up()` 뒤 저장소를 한 번 읽어 기대한 좌표 및 revision과 즉시 비교한다. 저장 Promise를 기다리는 사용자 인터페이스 관찰이나 저장값 재조회가 그 사이에 없다. 이 순서에서는 입력 처리와 transaction이 정상이어도 이전 record를 읽을 수 있다. 이는 확인된 **검사 시점의 경합 가능성**이며, 실제로 실패한 모든 실행의 원인 또는 사용자 화면의 결함이라고 확정할 근거는 아니다. [Playwright의 비동기 assertion 지침](https://playwright.dev/docs/test-assertions#non-retrying-assertions)은 비동기 상태를 단발 assertion으로 검사하면 실패가 불안정해질 수 있다고 설명하고 `expect.poll`을 제공한다.

포인터 이동 자체를 조사할 때에는 캔버스 배율과 캡처 상태도 확인해야 한다. [Pointer Events 표준](https://www.w3.org/TR/pointerevents/#the-pointercapture-interface)은 캡처한 요소로 후속 포인터 이벤트를 보내고 `pointerup` 또는 `pointercancel` 뒤 캡처를 해제하는 규칙을 정한다. [CSSOM View의 좌표 설명](https://developer.mozilla.org/en-US/docs/Web/API/CSSOM_view_API/Coordinate_systems#viewport)는 `clientX`와 `clientY`가 viewport 기준임을 밝힌다. 따라서 확대 상태에서 화면 픽셀 차이를 배율로 나눈 뒤 메모 좌표로 저장하는 현재 계산을 포인터 종료 시점까지 추적해야 한다. 캡처 손실과 취소를 정상 완료로 취급하거나 화면 픽셀을 그대로 저장하는 수정은 기존 동작을 바꾼다.

원인 판별에는 같은 포인터 입력에서 시작점, 마지막 이동점, 종료점, 배율, 화면 미리보기, 저장 요청 값, transaction 완료 뒤 record와 재방문 좌표를 차례로 대조해야 한다. 저장 완료 전 읽기만 다르고 완료 뒤 값이 맞으면 검사 시점의 문제다. 완료 뒤에도 값이 다르면 포인터 전달, 좌표 계산, 메모 변경 queue와 Repository 저장 가운데 처음 달라지는 곳이 실제 결함의 원인이다. 현재 자료만으로는 이 두 결과 중 하나를 선택할 수 없다.

## 독립적으로 바뀌는 Hook 책임

[React의 Custom Hook 지침](https://react.dev/learn/reusing-logic-with-custom-hooks#keep-your-custom-hooks-focused-on-concrete-high-level-use-cases)은 구체적인 목적을 드러내되 단일 `useState` 같은 사소한 반복까지 모두 Hook으로 뽑지 않도록 안내한다. Hook을 나눠 호출해도 각 호출의 상태는 독립적이라는 설명도 있어, 상태를 쪼개면서 동일한 값을 복제해서는 안 된다. [FSD의 slice와 segment 설명](https://fsd.how/docs/reference/slices-segments/)은 기능별 slice와 목적별 segment를 구분한다. 이 앱에서는 같은 페이지 model 안의 책임 분리에 적용할 수 있지만, 파일 수만 늘리는 계층 추가의 근거가 되지는 않는다.

서로 다른 변경 이유가 확인된 분리 대상은 다음과 같다.

- [`use-note-session-state.ts`](../../../../apps/notes/src/_pages/notes/model/use-note-session-state.ts)는 메모 및 일괄 복사 선택과 패널 대상, 삭제 실행 취소 이력, 만료되는 작업 알림을 한 Hook에서 관리한다. 세 상태는 바뀌는 이유와 수명이 다르다. 기존 `NoteSessionStateContext`, `NoteSessionCommandsContext`와 화면에서 쓰는 접근자는 유지한 채 각 상태 및 명령의 구현만 나눌 수 있다.
- [`use-notes-collection-interactions.ts`](../../../../apps/notes/src/_pages/notes/model/use-notes-collection-interactions.ts)는 URL hash로 특정 메모를 찾는 동작, Command 및 Escape 키의 선택 처리, 새 메모 생성과 포커스 이동을 묶는다. hash, 전역 키 입력과 생성 실패는 서로 다른 원인으로 수정될 수 있다. 현재 `focusNote`는 메모 생성과 삭제 복원에도 쓰므로 한 위치에서 계속 제공해야 한다.
- [`use-note-detail-editing.ts`](../../../../apps/notes/src/_pages/notes/model/use-note-detail-editing.ts)는 React Hook Form 입력 및 명시적 저장, IndexedDB 복구 초안의 지연 저장, 저장하지 않은 내용의 화면 이동 확인을 한 Hook에 둔다. 초안 저장과 탐색 보호의 오류 및 정리 시점은 구분할 수 있다. 다만 편집 중인 원문은 같은 form 값 하나에서 읽어야 한다. [React의 Effect 설명](https://react.dev/reference/react/useEffect#usage)은 외부 이벤트 구독의 setup과 cleanup을 한 과정으로 유지하도록 설명하므로 `pagehide`와 `visibilitychange` 연결은 복구 초안 저장 책임과 함께 이동해야 한다.
- [`use-batch-copy-workspace.ts`](../../../../apps/notes/src/_pages/notes/model/use-batch-copy-workspace.ts)는 작업 영역 폭에 따른 inline 패널과 dialog 연결, 전체 복사 성공 및 실패 알림과 재시도를 한 Hook에 둔다. 패널 표시 방식과 Clipboard 실패 처리는 독립적으로 바뀐다. 패널 전환 때 포커스를 돌려주는 규칙과 복사 실패 뒤 같은 알림 영역을 재사용하는 규칙은 각각 유지해야 한다.

파일 길이만으로 분리하지 않을 대상도 확인했다. [`use-note-geometry-gesture.ts`](../../../../apps/notes/src/_pages/notes/model/use-note-geometry-gesture.ts)의 이동과 크기 조절은 같은 포인터 캡처, 화면 미리보기와 저장 완료 과정을 쓴다. [`use-notes-board-view.ts`](../../../../apps/notes/src/_pages/notes/model/use-notes-board-view.ts)의 시점 이동, 확대와 포커스 이동은 같은 `BoardView`를 바꾸므로 새 상태 사본 없이 분리할 이점이 확인되지 않았다. [`use-notes-data-model.ts`](../../../../apps/notes/src/_pages/notes/model/use-notes-data-model.ts)의 메모 변경은 같은 저장 queue와 최신 메모 참조를 공유한다.

[`use-mobile-batch-copy-state.ts`](../../../../apps/notes/src/features/add-note-to-batch-copy/model/use-mobile-batch-copy-state.ts)의 수집과 확인은 하나의 저장 초안 단계 전이다. [`use-note-properties-panel.ts`](../../../../apps/notes/src/_pages/notes/model/use-note-properties-panel.ts)의 포커스, 입력 검사와 저장은 같은 속성 폼 작업에 속한다. 이들은 담당 동작을 실제로 분리할 근거가 생기기 전까지 기존 상태 수명과 queue를 유지한다.

분리 뒤의 호출 순서, Context가 보관하는 값, React Hook Form의 form 인스턴스와 IndexedDB 저장 형식은 현재 요구사항의 보존 대상이다. 다른 호출 위치에서 같은 Hook을 다시 호출하면 독립된 상태가 생길 수 있으므로, 분리 작업은 각 상태를 현재 관리하는 곳을 먼저 표시해야 한다. 이 조사는 코드와 과거 실행 기록을 읽었으며 새로운 브라우저 실행이나 수정 뒤 검증은 포함하지 않는다.
