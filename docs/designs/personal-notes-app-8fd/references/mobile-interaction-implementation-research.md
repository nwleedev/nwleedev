# 모바일 메모 재설계의 코드 변경과 의존성

기존 메모, 일괄 복사와 저장 명령을 유지하면서 입력과 화면 연결을 바꾸는 방안을 제안한다. 새 시트와 드래그 UI에 저장소 전체를 전달하지 않고 필요한 조작 함수만 전달한다. 모바일 메모 목록 순서는 별도 저장 자료로 관리해 데스크톱 배치와 탐색 순서에 영향을 주지 않는 안을 우선한다.

이 문서는 [재설계 요구사항](../requirements.md#메모-조작과-드래그-앤-드롭-재설계)의 구현 계획에 필요한 연결 지점, 패턴과 안티패턴을 다룬다. 코드와 공식 자료를 확인한 날짜는 2026년 10월 18일이다. 적용 대상은 Next.js 16.3.3, React 및 React DOM 19.2.8, React Hook Form 7.86.0, Zod 4.4.3, Tailwind CSS 4.3.3과 OpenNext Cloudflare 1.20.6이다. 현재 의존성에 TanStack Query나 외부 드래그 라이브러리는 없다.

## 현재 기능을 연결할 지점

- [앱 조립부](../../../../apps/notes/src/_app/providers/personal-notes-provider.tsx)는 메모와 현재 일괄 복사 작업을 라우트 위에서 유지한다. [메모 어댑터](../../../../apps/notes/src/_app/composition/use-note-adapters.ts)와 [모바일 일괄 복사 어댑터](../../../../apps/notes/src/_app/composition/use-mobile-batch-copy-adapters.ts)가 IndexedDB, Clipboard, ID와 시각의 실제 구현을 선택한다.
- [메모 상태 모듈](../../../../apps/notes/src/_pages/notes/model/use-notes-data-model.ts)은 변경 요청을 순서대로 처리하며 현재 메모와 복구 초안을 관리한다. 개별 복사는 이 변경 대기열 밖에서 Clipboard 쓰기를 시작한다. [개별 복사 명령](../../../../apps/notes/src/_pages/notes/model/copy-note.ts)은 Clipboard 실패와 복사는 됐으나 횟수 저장에 실패한 결과를 구분한다.
- [모바일 일괄 복사 상태](../../../../apps/notes/src/features/add-note-to-batch-copy/model/use-mobile-batch-copy-state.ts)는 현재 별도 수집 시작을 요구한다. 추가 요청은 순차 처리하고 빠른 연속 입력은 계속 받는다. 확인 이동은 먼저 접수한 추가를 기다리며, 전체 복사의 Clipboard 쓰기는 대기열 밖에서 시작한다. 이 입력 순서 유지와 사용자 활성화 조건은 별도 수집 UI를 없애도 필요하다.
- [메모 목록 분기](../../../../apps/notes/src/_pages/notes/ui/notes-collection.tsx)는 현재 모바일과 데스크톱에 같은 `tabIndex` 정렬 결과를 전달한다. [메모 스키마](../../../../apps/notes/src/entities/note/model/note.ts)는 엄격한 형식이며 모바일 순서 필드가 없다. 모바일 순서 변경에 `tabIndex`, `geometry.zIndex`, 좌표나 생성 시각을 재사용하면 다른 기능이 바뀐다.
- [삭제 연결부](../../../../apps/notes/src/_pages/notes/model/use-note-card-actions.ts)는 저장 명령뿐 아니라 데스크톱의 5초 알림, 선택 정리와 목록 포커스 이동도 실행한다. 새 모바일 시트에서 이 연결부 전체를 호출하면 시트 안 포커스와 닫기 전까지 복원이라는 조건을 지키기 어렵다. 저장 명령과 필요한 선택 정리는 재사용하고 알림 수명과 포커스 처리는 분리해야 한다.
- [모바일 확인 재정렬](../../../../apps/notes/src/_pages/batch-copy/model/use-mobile-batch-copy-pointer-reorder.ts)과 [저장 목록 및 패널 재정렬](../../../../apps/notes/src/features/edit-batch-copy/model/use-batch-copy-pointer-reorder.ts)은 위치 판정과 스크롤 처리가 나뉘어 있다. [기존 순서 계산](../../../../apps/notes/src/features/edit-batch-copy/model/reorder-pointer-session.ts)을 다른 feature 내부에서 직접 가져오지 않고, 실제로 같은 ID 순서 계산과 pointer 수명만 하위 공통 모듈로 옮길 후보로 삼는다.

## 필요한 함수만 전달하는 의존성 주입

첨부 자료인 「React 최소 권한 의존성 설계 지침」의 사용 모듈별 함수 전달, 조립부에서 구현 선택, props 우선과 필요한 경우의 한정된 Context를 이 재설계에 적용한다. 이를 저장소 전체의 새 규칙이나 런타임 보안 격리로 취급하지 않는다. 자료에 있는 TanStack Query 예시는 서버 자료가 있는 경우의 예시이며 현재 IndexedDB 상태를 Query와 Context에 이중 저장할 이유가 되지 않는다.

[Fowler의 Dependency Injection과 Service Locator 비교](https://martinfowler.com/articles/injection.html)는 구현 선택과 사용을 분리하고 locator를 사용하는 코드와 의존성을 직접 받는 코드를 구별한다. [React의 Context 사용 전 고려사항](https://react.dev/learn/passing-data-deeply-with-context#before-you-use-context)은 props와 `children` 합성을 먼저 고려하도록 설명한다. 두 자료를 함께 적용하면 이 앱의 새 말단 UI에는 값과 이벤트 콜백을, 저장 명령에는 실제 필요한 외부 동작을 전달하는 구성이 적합하다.

오픈소스 애플리케이션 Webiny의 [PR #5387](https://github.com/webiny/webiny-js/pull/5387)은 CMS 작업이 `BulkActionContext`에서 서비스를 찾는 구조를 제거한 변경이다. 고정 revision [573e347](https://github.com/webiny/webiny-js/commit/573e347c7ab5f027b9c367dd133b2469b9d97e1e)에서 `ProcessTasksByModel`은 `context.container.resolve(ListTasksUseCase)` 대신 생성자로 받은 `listTasks`를 사용한다. 이 사례는 필요한 의존성을 명시하는 근거이며 Webiny의 컨테이너나 클래스 구조를 가져올 근거는 아니다.

피할 예시와 권장 예시는 각각 `deleteNote(locator.resolve('notes'), note)`와 `deleteNote(removeNote, note)`다. 전자는 호출에 필요한 외부 동작을 숨기고 후자는 함수 매개변수에서 확인하게 한다. 실제 함수 타입에는 현재 도메인의 입력, 성공, 실패와 revision 조건을 유지한다. 명령이 함께 사용해야 하는 응집된 저장 동작까지 무조건 한 메서드짜리 객체 여러 개로 나누지는 않는다.

적용할 전달 범위는 다음과 같다.

- 개별 복사 명령에는 `writeText`와 개별 사용 기록 함수만 필요하다. UI는 이미 연결된 `copyNote`를 호출한다. 기존 `ClipboardWriter`가 쓰기 하나만 제공한다면 이름을 바꾸거나 같은 기능의 wrapper를 늘리지 않는다. 메서드 함수를 전달할 때에는 실제 구현의 `this` 의존 여부를 확인한다.
- 모바일 추가 명령에는 항목 ID 생성, 현재 시각과 일괄 복사 사용 기록 함수가 필요하다. 현재 작업 상태와 대기열은 기존 provider 한 곳에 둔다. 카드와 메뉴는 같은 추가 함수를 호출하며 저장소, 사용 기록 writer나 provider 전체 값을 props로 받지 않는다.
- 모바일 삭제 및 복원 조정 모듈에는 삭제와 복원 함수가 필요하다. 삭제는 성공한 실제 대상 스냅샷을, 복원은 성공한 메모를 반환하도록 기존 결과를 보존하거나 필요한 자료만 확장한다. 현재 선택 정리는 조정 모듈이 연결하며 시트 UI에 메모 세션 전체를 주지 않는다.
- 모바일 순서 저장 명령에는 순서 읽기와 변경 함수가 필요하다. 실제 IndexedDB 연결은 앱 조립부가 선택한다. 기존 생성, 삭제와 복원에서 메모와 순서를 함께 저장하는 책임은 같은 저장 처리에 두고 UI가 두 저장소를 차례로 호출하게 하지 않는다.
- 목록과 메모 UI에는 본문, 누름 및 처리 상태와 `onCopy`, `onAdd`, `onOpenActions`, `onMove` 등 직접 사용하는 콜백만 전달한다. 외부 구현을 고르는 DI와 UI 이벤트를 부모에게 알리는 콜백을 같은 개념으로 설명하지 않는다.

현재 `_app/composition/`에서 만든 안정적인 어댑터 인스턴스를 유지한다. 기존 상태 provider를 화면 안으로 옮기거나 대체 Context에 같은 메모를 복사하지 않는다. 여러 단계 아래의 컴포넌트가 같은 명령을 필요로 할 때에만 그 기능 안에 타입이 명확한 Context를 검토한다. `AppServices`, 문자열 token, 범용 `resolve`, 의존성 주입 컨테이너와 모든 기능을 묶는 새 provider는 추가하지 않는 안이다.

순수한 삽입 계산, 배지 개수, 문자열 결합, React Hook과 DOM 이벤트 객체는 주입 대상이 아니다. router 사용은 탐색 조정 모듈에, pointer capture와 시트 포커스는 브라우저 연결부에 둔다. 각각을 테스트하려고 별도의 가상 플랫폼 전체를 만들지 않는다. [기존 의존성 지침](../../../dev/personal-notes-app/anti-patterns.md#props-drilling을-범용-service-locator로-바꾸지-않는다)의 범용 조회 방지와 함께 적용하되 해당 문서의 제안을 새 전역 정책으로 바꾸지는 않는다.

이 설계는 타입 및 FSD import 검사로 일부 확인할 수 있지만 함수가 필요 이상으로 많은 일을 하는지, Context 변경이 얼마나 렌더링을 일으키는지는 lint가 판정하지 못한다. 구현 시 호출 모듈이 받는 함수와 반환값을 대조하고 실제 목록의 렌더링 및 입력 시간을 확인한다.

## 현재 작업 하나와 파생 표시

현재 작업의 항목 배열을 기준으로 배지 숫자와 확인 화면을 계산하고, 화면별 사본이나 Effect로 동기화하는 숫자 state를 만들지 않는 안이다. 중복 텍스트도 항목 ID가 다르면 각각 세며, 복제와 삭제 뒤 실제 배열 길이를 사용한다. 처리 중인 입력을 저장 성공한 항목으로 먼저 세지 않는다.

[React의 상태 구조 지침](https://react.dev/learn/choosing-the-state-structure)은 모순될 수 있는 상태와 중복 상태를 피하도록 설명한다. Sentry의 [PR #115146](https://github.com/getsentry/sentry/pull/115146)과 고정 revision [38a5ba3](https://github.com/getsentry/sentry/commit/38a5ba35c43bffdf3ebdecff65a224645ae3153a)는 `useState`와 `useEffect`로 유지하던 파생 진행률을 계산으로 바꿨다. 변경 이유는 파생 상태 lint 위반 해소이며, 이 앱의 성능 향상 수치를 입증한 사례는 아니다.

피할 예시는 `useEffect(() => setCount(entries.length), [entries])`, 권장 예시는 `const count = entries.length`다. 후자는 두 값이 일치해야 하는 별도 갱신을 없앤다. 계산이 비싸지 않은 배열 길이에 `useMemo`를 추가할 이유는 없다. 낙관적 재정렬 미리보기처럼 실패 시 버릴 임시 표현은 영구 사본과 구분한다. 오래된 실패 결과가 새 항목이나 후속 정렬을 덮어쓰지 않게 한다.

시트는 메뉴, 확인, 삭제 중, 완료, 복원 중과 실패를 구분하는 상태 전이를 갖고 각 단계에 필요한 대상만 유지한다. `deleted`, `confirming`, `restoring` 같은 독립 boolean의 조합으로 동시에 여러 단계를 표시하는 방식을 피한다. 단순한 시각 토큰과 JSX 배치까지 reducer로 옮기지는 않는다. 타입 검사는 불가능한 조합 일부를 막을 수 있지만 실제 삭제, 복원 실패와 대기 중 중복 입력은 동작 검사로 확인해야 한다.

## 순서 저장과 데스크톱 자료 보존

모바일 목록 순서는 새로고침 및 재실행 후에도 보존하고 데스크톱 위치와 탐색 순서는 유지하는 것으로 확정됐다. 이를 위한 기술 제안은 `entities/note`에 모바일 순서 모델과 IndexedDB 저장 구현을 두는 것이다. 기존 `NoteRecord`의 원문, geometry, `tabIndex`와 revision을 재정렬 때문에 다시 쓰는 안보다 별도 순서 record가 영향을 줄이기 쉽다.

React 기반 Actual Budget의 [PR #8385](https://github.com/actualbudget/actual/pull/8385)는 예정 거래의 드래그 순서를 제공하려고 일정에 별도 `sort_order`를 추가했다. 고정 revision [5be2449](https://github.com/actualbudget/actual/commit/5be2449354ba9043e43015eac638fa156f183cac)은 기존 날짜 정렬을 보존하면서 새 정렬값과 fallback을 적용한다. 새 순서가 기존 의미의 필드를 대신하지 않게 한 사례이며, 그 앱의 SQL 구조와 값 계산을 이 앱에 그대로 적용하지는 않는다.

피할 예시는 모바일 이동에서 `note.tabIndex = targetIndex` 또는 `note.geometry.zIndex = targetIndex`를 쓰는 것이다. 권장 예시는 `moveMobileNote(noteId, beforeNoteId)`로 모바일 순서만 저장하고 데스크톱은 기존 `tabIndex` 및 geometry를 읽는 것이다. 함수 이름과 인수는 설계 예시이며 영구 API가 아니다.

저장 방안은 순서가 있는 메모 ID 배열과 자체 revision을 가진 record를 별도 object store에 두는 것으로 구체화한다. 초기 이행은 실제 기존 목록의 `tabIndex` 순서를 보존한다. 순서가 없는 새 메모는 끝에 놓고, 읽을 때 존재하지 않는 ID가 메모를 만들어 내거나 유효한 메모를 숨기지 않게 한다. 중복 ID, 없는 대상, 같은 위치와 오래된 순서 revision은 명시적으로 처리한다. 이동은 최신 순서를 읽고 한 transaction에서 저장한다.

생성, 삭제와 복원은 메모와 순서를 함께 변경하는 저장 책임을 갖는다. 삭제 성공 결과에는 메모 원문 스냅샷과 복원에 필요한 이웃 ID를 보관하고, 복원은 남아 있는 이웃을 기준으로 원래 자리를 우선한다. 이웃이 모두 없어졌으면 끝에 복원하는 안을 제안한다. 이 fallback과 동시 변경 충돌 표시는 구현 전 정할 항목이다. 실패하면 두 저장 자료가 함께 유지돼야 하며 카드 제거 후 별도 저장이 실패하는 부분 완료를 만들지 않는다.

[IndexedDB transaction 규칙](https://w3c.github.io/IndexedDB/#transaction-concept)은 transaction의 저장소 범위와 원자적 변경을 정의하며 object store 추가는 upgrade transaction에서만 가능하다. 현재 DB 버전 3 이후의 이행에서는 새 DB와 이전 버전 모두를 다루고 기존 v1, v2, v3 이행을 건너뛰거나 메모를 일괄 정규화하지 않는다. 다른 탭의 `blocked`, `versionchange`, abort와 quota 실패는 기존 실패 표시로 연결한다. 앱의 대기열만으로 다른 탭의 오래된 순서 쓰기까지 방지했다고 판단하지 않는다.

스키마와 타입 검사 외에 실제 IndexedDB로 이행, 순서 재조회, 원자적 실패와 두 탭의 오래된 요청을 확인해야 한다. 모든 메모의 원문, geometry, `tabIndex`, content revision과 사용 횟수가 재정렬 전후에 같은지도 확인한다. 별도 record는 이행 및 동시 저장 처리를 추가하므로 실제 구현 전에 `NoteRecord` 필드 확장안과 영향 파일을 최종 비교한다.

## 입력, 미리보기와 완료를 분리하는 드래그

누르는 중과 드래그 중에는 임시 표현을 바꾸고 유효한 완료에서만 해당 명령을 한 번 호출한다. 목록 삽입, 데스크톱 공간 이동과 캔버스 시점 이동은 같은 저장 명령으로 합치지 않는다. 특히 이미 이동한 캔버스 시점은 중단 시 마지막 유효값을 유지한다는 기존 결정을 보존한다.

Excalidraw의 [이슈 #4949](https://github.com/excalidraw/excalidraw/issues/4949)는 지우기 중 Escape를 누르면 대상이 반투명 상태에 남는 실패를 기록한다. [PR #4956](https://github.com/excalidraw/excalidraw/pull/4956), 고정 revision [db28595](https://github.com/excalidraw/excalidraw/commit/db2859530241bf188a06cb55d28eb9980a5bcef5)은 지우기가 취소된 경우 대기 중 표현을 복원했다. 이 사례는 취소 시 임시 표현도 정리해야 한다는 근거이며 새 드래그 라이브러리 선택의 근거는 아니다.

피할 예시는 `onPointerMove = () => saveOrder(preview)`처럼 이동마다 영구 자료를 저장하고 `pointerup`에서만 정리하는 방식이다. 권장 예시는 이동 중 `preview`만 갱신하고 완료 때 `move(id, target)`를 한 번 실행하며 취소에서는 `preview`를 버리는 방식이다. 이미 완료한 뒤 뒤따르는 capture 상실은 다시 저장하거나 되돌리지 않는다. pending 중 대상 제거, route 이탈, 컨테이너 크기 변화와 문서 비활성화도 해당 세션을 종료해야 한다.

[Pointer Events 3의 touch-action 정의](https://www.w3.org/TR/pointerevents3/#the-touch-action-css-property)는 시작된 입력 중 `touch-action`을 바꿔도 이미 선택된 브라우저 처리가 바뀌지 않음을 설명한다. 본문은 세로 스크롤을 허용하고 핸들의 직접 조작 조건은 입력 전에 정한다. 페이지 전체의 `touch-action: none`이나 계속되는 `overflow: hidden`으로 충돌을 숨기지 않는다. 짧은 복사, 길게 누르기 추가와 핸들 드래그가 같은 입력에서 함께 완료되지 않게 한다.

공통화 후보는 ID 삽입 계산, 유효 대상 판정, capture 및 종료 정리, 실제 스크롤 요소의 자동 스크롤이다. UI가 같아 보인다는 이유로 본문 복사 판정, 삭제, 원문 저장이나 패널 바깥 제거까지 범용 훅의 옵션에 넣지 않는다. 공통 모듈은 `shared`에서 상위 도메인을 import하지 않고 실제로 두 호출부가 같은 동작과 검사를 공유할 때만 추출한다.

라이브러리 사례인 [dnd-kit #1379](https://github.com/clauderic/dnd-kit/issues/1379)는 구 API의 core 6.1.0, sortable 8.0.0 등에서 항목을 누르는 것만으로 Context를 사용하는 모든 컴포넌트가 다시 렌더링된다는 보고다. 이 보고는 2026년의 새 API에서 같은 문제가 있다는 증거가 아니다. 드래그 좌표를 전체 메모 Context에 매번 전달하지 않고, 대상 또는 삽입 위치가 바뀔 때만 필요한 표시를 갱신할 이유로 참고한다. 임의 debounce나 `memo` 추가만으로 성능 검증을 대신하지 않는다.

정적 분석은 pointer 이벤트 순서, 실제 스크롤, 자동 스크롤 중 놓을 위치와 Clipboard 사용자 활성화를 판정하지 못한다. 실제 터치와 mouse에서 복사 결과, 변경한 저장 대상, 중단 후 상태와 반복 조작 비용을 관찰한다. [기존 pointer 수명 지침](../../../dev/personal-notes-app/anti-patterns.md#pointer-제스처를-종료-event-하나에-맡기지-않는다)과 [일괄 복사 삽입 결정](../decisions/accumulator-ordering-and-recovery.md)을 함께 적용한다.

## 고정 높이 시트와 편집 및 확인 화면 이동

시트는 목록의 개별 카드 바깥에 하나만 두고 선택 대상 ID와 삭제 성공 스냅샷을 관리하는 안이다. 카드가 사라져도 시트는 남으며 완료 후 복원 기회는 명시적 닫기나 복원 성공 때 끝난다. 저장 요청 중 닫기 요청은 요청 자체를 취소한 것으로 취급하지 않고 결과를 시트에 유지하는 방안을 제안한다. 브라우저 기본 뒤로가기와 Escape도 같은 닫기 판단을 사용해야 한다.

피할 예시는 `notes.map(note => <NoteCard><DeleteSheet /></NoteCard>)`처럼 삭제할 카드 안에 시트를 두는 것이다. 권장 예시는 각 카드 바깥의 공통 부모에서 단일 시트를 유지하고 삭제된 대상 스냅샷을 완료 단계에서 사용하는 것이다. [React의 상태 보존 지침](https://react.dev/learn/preserving-and-resetting-state)은 트리에서 컴포넌트를 제거하면 그 상태도 사라짐을 설명한다. 이는 삭제 후 시트 유지라는 요구와 직접 연결된다.

[WAI-ARIA 모달 지침](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)은 포커스를 대화상자 안에서 이동시키고, 닫을 때 실행 요소가 사라졌으면 다음 작업에 맞는 다른 요소로 옮기도록 한다. 저장 중 포커스를 목록으로 보내는 데스크톱 후처리를 재사용하지 않고, 모바일은 시트가 열린 동안 내부 포커스를 유지한다. 기존 일괄 복사 항목 시트는 조작 후 닫히므로 공통 컴포넌트에서 모든 시트를 계속 유지하도록 바꾸지 않는다.

시트 외곽 높이와 본문 스크롤 영역은 구분한다. Vaul의 [이슈 #575](https://github.com/emilkowalski/vaul/issues/575)는 `max-height`와 전체 내용 스크롤을 함께 적용한 Drawer에서 내용이 가려진 사례다. 미해결 라이브러리 보고이므로 이 앱의 원인이나 특정 우회 CSS의 안전성을 입증하지 않는다. [시트 높이 제안](mobile-note-sheet-design.md#높이와-조작-영역의-초기-제안)에 따라 실제 짧은 화면과 글자 확대에서 닫기와 하단 버튼을 확인할 이유로 사용한다.

수정은 기존 상세 편집, React Hook Form과 명시적 저장을 유지한다. 메뉴 변경을 위해 새 편집 폼이나 원문 사본을 만들지 않는다. [Next.js 탐색 지침](https://nextjs.org/docs/app/getting-started/linking-and-navigating)은 링크 사전 로딩과 로딩 UI를 설명하지만 현재 작업의 저장 대기까지 없애 주지는 않는다. 먼저 접수한 추가와 원문 스냅샷을 보존하면서 화면 준비와 추가 저장 대기를 분리하는 방안을 비교한다. 모든 상세 링크를 한꺼번에 사전 로딩해 메모 수만큼 비용을 늘리는 방식은 피하고 실제 배포에서 측정한 대상을 우선한다.

현재 작업 확인과 저장 목록 관리는 같은 `/batch-copy`를 사용하므로 진입 목적을 분명히 해야 한다. 예를 들어 헤더는 현재 작업 의도를, Drawer는 저장 목록 의도를 전달하고 직접 접속 및 새로고침은 기존 저장 목록 관리로 처리하는 안을 비교한다. 현재 작업이 존재한다는 이유만으로 Drawer가 사라지거나 다른 목록이 열리는 결과를 허용하지 않는다. 항목 0개에서는 헤더 아이콘을 유지하고 배지를 숨기며 링크를 비활성화하는 것으로 정해졌다. 빈 현재 작업 화면을 여는 제안은 적용하지 않는다.

## 계획에 미치는 영향과 확인 범위

이 조사에서 제안한 새 저장 형식, 함수 이름과 공통 모듈은 구현 완료나 전역 개발 정책의 승인이 아니다. [구현 단위별 계획](../plan.md#u48-구현-계획과-완료-조건-확정)에 수정, 추가, 제거 및 통합 대상과 선행 조건을 연결한다. 호출하는 외부 API와 저장 자료를 바꾸는 단위는 실제 사용처를 대조한 뒤 제거할 코드를 정한다.

공식 문서, 고정 revision의 오픈소스 애플리케이션 변경과 현재 코드가 뒷받침하는 것은 설계 근거다. 실제 Cloudflare 배포의 첫 이동 및 반복 이동, 터치 판정, 시트 높이와 메모리 비용의 개선 수치는 아직 확인하지 않았다. 숫자만 표시하는 검사, 내부 훅 모양과 큰 스냅샷 대신 원문, Clipboard, 실제 순서, 포커스와 저장 결과를 완료 증거로 삼는다.
