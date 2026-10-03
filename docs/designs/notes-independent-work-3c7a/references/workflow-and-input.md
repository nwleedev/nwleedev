# 반복 텍스트 재사용의 목적과 입력 문제 해결

`apps/notes`의 소개 가치는 직접 겪은 반복 입력과 메모 관리의 불편에서 출발해 해결 방향을 정하고, 직접 사용하며 개선한 경험에 있다. 선택한 기능과 드래그 오류의 수정 기록은 그 경험을 뒷받침하는 근거다.

자료의 대상은 [선정 요구사항](../requirements.md)에 따른 사용 목적, 기여와 문제 해결이다. 제작 목적과 직접 정한 선택은 2026년 10월 3일의 사용 경험 및 회고를 근거로 한다. 구현 근거는 `a06bfc94c64232581742792a9834b82f5963f225`와 그 이전 변경이다. 회고로 확인한 기여는 문제 정의와 선택이며 개별 코드 작성 및 오류 분석의 담당은 미확인이다.

## 직접 사용하면서 정의한 문제와 선택

### 반복 지침과 스킬 호출 문구의 선택 및 조합

필요한 지침만 골라 한 번에 복사하려고 일괄 선택을 정했다. AI 에이전트로 작업할 때 단계별 제한과 스킬 호출 문구를 매번 입력하는 일이 번거로웠기 때문이다. 지침 파일에 적어도 AI 에이전트가 원하는 대로 작업하지 않는 경우를 경험해 문구를 반복 입력했다.

보조 키를 누른 채 메모를 골라 일괄 복사에 모으는 방식을 직접 선택했다. 사용하던 macOS 스티커 메모에서는 여러 문구를 골라 함께 복사하기가 불편했다. 메모를 자유롭게 놓고 크기를 바꾸는 익숙한 사용 방법을 이어가도록 정했다. [Apple의 스티커 메모 안내](https://support.apple.com/guide/stickies/welcome/mac)에서도 메모의 위치와 크기를 바꾸는 방법을 확인할 수 있다.

현재 [일괄 복사 화면](../../../../apps/notes/src/features/edit-batch-copy/ui/batch-copy-list.tsx)에서는 모은 원문의 순서를 바꾸고 함께 복사할 수 있다. `0c4d4ab`의 선택과 복사, `849b34e`의 작업 사본 편집이 [초기 통합 이력](https://github.com/nwleedev/nwleedev/commit/b9ae452)에 포함된다.

### 매개변수 때문에 늘어나던 명령어 메모

고정된 명령어와 바뀌는 부분을 나누고 필요한 값만 입력하는 템플릿을 직접 선택했다. 같은 Python 스크립트를 입력 파일과 출력 파일 등의 매개변수만 바꿔 실행할 때, 조합마다 명령어 메모가 늘어나 관리하기 어려웠기 때문이다.

현재 [템플릿 편집](../../../../apps/notes/src/entities/template/model/edit-segments.ts)에서 원문의 특정 부분을 입력 항목으로 바꾸고, [문장 생성](../../../../apps/notes/src/entities/template/model/render-template.ts)에서 새 값으로 명령어 문장을 만든다. 이 방식으로 명령어 문장을 만들 수 있게 한 `8cc7957`은 [초기 통합 이력](https://github.com/nwleedev/nwleedev/commit/b9ae452)에 포함된다.

### 직접 쓰면서 화면과 사용 방법을 개선한 기여

메모를 자유롭게 놓고 크기를 바꾸는 방법, 보고 있는 위치를 옮기는 방법과 모바일에서 쓸 화면을 직접 정했다. AI가 만든 화면에서 아이콘을 사용하고 불필요한 상시 텍스트 버튼을 줄이도록 정한 경험도 있다. 필요한 텍스트를 고르고 읽기 편하게 하려는 선택이다.

현재 일괄 복사 항목은 이동 핸들과 더보기를 사용한다. 직접 위아래 이동은 설정을 켰을 때 실행 가능한 방향만 제공하며, 모바일에서는 아래에서 열리는 시트에서 항목을 복제하거나 제거할 수 있다. 근거는 [작업 화면 결정](../../personal-notes-app-8fd/decisions/focused-text-utility-workspace.md)과 [모바일 시트 결정](../../personal-notes-app-8fd/decisions/mobile-batch-copy-action-sheet-dismissal.md)다.

상시 텍스트 버튼을 줄이면서도 드래그를 쓰지 않고 순서를 바꿀 수 있게 한 판단으로 설명한다. [W3C의 Dragging Movements 설명](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)은 드래그 없이 같은 일을 하는 단일 포인터 대안을 요구하며 키보드로 사용하는 방법과 구분한다. 모바일에서도 터치로 끌어 옮길 수 있으며, 메모를 고르고 확인하거나 항목을 편집할 화면을 나눴다.

실제 모바일 사용에서 UI 문제를 조정한 경험이 있다. [모바일 통합 이력](https://github.com/nwleedev/nwleedev/commit/bb14d8d)과 [스크롤 후속 이력](https://github.com/nwleedev/nwleedev/commit/41c3dd0)은 화면 높이 감소로 목록과 제어가 가려지는 현상, 바깥 스크롤과 팝오버 폭을 수정한 근거다. 실제 사용 기기에서 관찰한 현상과 개별 커밋의 연결은 추가 확인할 사실이다.

## 드래그 문제의 원인과 해결한 결과

### 이미 이동한 화면이 시작 위치로 돌아감

이동을 끝내거나 중단해도 마지막으로 본 캔버스 시점을 유지하도록 수정했다. 이전에는 입력 중단을 메모 이동의 취소와 같은 방식으로 처리해 화면까지 시작 시점으로 되돌렸다. 보는 위치를 옮긴 것과 메모 자체의 저장 위치를 바꾼 것의 의미를 구분한 사례다.

`ff4faa7`에서 시작 시점으로 되돌리는 처리를 제거했다. `366136b`는 창과 문서의 비활성화 및 다음 입력에서 남은 이동을 정리해 이전 시작점이 다시 쓰이지 않게 했다. 둘은 [초기 통합 이력](https://github.com/nwleedev/nwleedev/commit/b9ae452)에 포함된다. 현재 [캔버스 시점 처리](../../../../apps/notes/src/_pages/notes/model/use-notes-board-view.ts)는 중단된 입력을 끝내면서 표시된 시점은 유지한다.

### 종료를 추정하는 조건이 정상 드래그까지 중단

WebKit의 정상 드래그를 끊던 종료 추정을 폐기했다. 버튼 및 압력 값을 이용한 조건과 창 포커스만 이용한 조건이 정상적인 첫 마우스 입력까지 취소했기 때문이다.

`9f47ba8`과 `e226224`는 [당시 입력 결정](../../personal-notes-app-8fd/decisions/note-selection-and-properties.md)을 바로잡은 문서 변경이다. 현재 [캔버스 시점 처리](../../../../apps/notes/src/_pages/notes/model/use-notes-board-view.ts)에서도 이 추정을 종료 조건으로 쓰지 않는다. 브라우저에서 실제로 겪은 현상을 근거로 선택을 바꾼 사례다.

[W3C Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)의 2026년 6월 30일 Recommendation은 종료, 취소와 캡처 상실을 구분하고 정상 종료 뒤 캡처가 자동 해제되는 순서를 설명한다. 종료와 취소를 구분할 근거는 이 표준에서 확인할 수 있다. 정상 WebKit 입력이 중단된 현상은 저장소의 당시 관찰 기록이다.

### 마우스를 놓아도 캔버스가 계속 움직임

마우스를 놓은 뒤에도 화면이 계속 따라 움직이던 문제를 수정했다. 캡처 대상이 바뀐 뒤 종료 신호가 브라우저 문서에 도착하면 캔버스에 이동 상태가 남았다. 이 종료도 처리하도록 보완해 마우스를 놓은 뒤 화면이 계속 움직이지 않게 했다.

최초 수정 `20bc777`은 [후속 입력 수정 통합 이력](https://github.com/nwleedev/nwleedev/commit/41c3dd0)에 포함된다. 현재 [시점 처리](../../../../apps/notes/src/_pages/notes/model/use-notes-board-view.ts)와 [캔버스 검사](../../../../apps/notes/e2e/notes.spec.ts)는 브라우저 문서로 전달된 종료 신호에서도 화면 이동을 끝내도록 바꾼 근거다.

## 저장 구조 변경을 고려한 기술 선택

개발 중 저장 구조가 바뀔 것을 고려해 IndexedDB를 직접 선택했다. 기술 선택의 의미는 구조가 바뀐 뒤에도 기존 메모, 사용 기록과 설정을 이어서 읽는 조건과 연결해 설명한다.

[MDN의 IndexedDB 사용 안내](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)는 버전 변경에서 구조를 바꾸고 이전 자료를 보존할 필요를 설명한다. 현재 [저장소 버전 처리](../../../../apps/notes/src/_app/composition/indexed-db/open-personal-notes-database.ts)와 [자료 이전](../../../../apps/notes/src/_app/composition/indexed-db/migrate-personal-notes-database.ts)은 기존 메모, 사용 기록과 설정을 이어서 읽을 수 있게 한 근거다. 최초 변경 `c784077`은 [초기 통합 이력](https://github.com/nwleedev/nwleedev/commit/b9ae452)에 포함된다.

## 소개에 남길 판단

직접 겪은 불편을 정리하고, 계속 메모를 늘리기보다 필요한 내용을 재사용하기로 한 판단을 개인 기여로 소개할 수 있다. 직접 쓰면서 화면과 사용 방법을 개선한 경험도 그 소개를 뒷받침한다. 이용 빈도와 시간 절감의 측정값은 추가 확인 대상이다.

기존 AI Agent Workflow는 작업 규칙과 문구 검사를, 메모 앱은 개인의 반복 입력과 메모 관리 문제에서 출발해 해결 방향을 정한 경험을 설명한다. [종합 평가와 소개안](assessment.md)은 두 작업이 보태는 역량의 차이를 기준으로 추가를 권고한다.
