# 모바일 일괄 복사 전환과 의존성 전달 조사

## 결론

모바일 일괄 복사에는 별도의 내역 화면이나 URL을 추가하지 않는다. `/`는 메모 목록과 일괄 복사 수집을, `/batch-copy`는 현재 앱 실행에 확인 중인 작업이 있으면 확인 화면을, 그렇지 않으면 현재 저장 목록 관리 화면을 맡는다. 저장 목록 관리는 과거 작업 기록이 아니라 지금 복사할 항목을 편집하는 화면이며, 모바일 메모 목록의 Drawer에 이미 진입 UI가 있다.

확인 화면의 `취소`에서 관리 화면이 잠깐 나타나는 문제와 수집 화면의 `다음`에서 하단 동작이 먼저 사라지는 문제는 같은 원인에서 생긴다. 작업 상태를 화면 판정에 먼저 반영하고 Next.js 경로 이동은 그 뒤에 시작하므로 현재 URL에서 다른 화면 조건이 잠시 성립한다. 항목 누르기의 깜빡임은 각 저장 작업의 전역 `pending`을 모든 메모의 `disabled`와 투명도에 연결한 결과다. `mobileBatchCopyDrafts`에 선택 상태를 쓰는 현재 구현은 새로고침 복원 요구가 폐기되면서 제거 대상이 됐다.

`temps/dependencies/research-20290926.md`의 최소 권한 의존성 원칙은 노트 서비스에 적용할 수 있다. 다만 순수 함수, 지역 UI 상태와 폼 상태까지 모두 주입 대상으로 바꾸는 규칙은 아니다. 현재 조립 구조는 이미 기능별 Provider에 필요한 브라우저 구현을 전달하므로 전면 재작성보다 남은 위반을 찾고 제거하는 방식이 맞다.

## 화면과 URL의 역할

- `/`는 평상시 메모 목록과 현재 앱 실행에서 시작한 수집 상태를 표시한다.
- `/batch-copy`는 현재 앱 실행에 `confirming` 작업이 있으면 확인 화면을 표시한다.
- `/batch-copy`는 현재 실행의 모바일 작업이 없으면 저장된 현재 일괄 복사 목록의 관리 화면을 표시한다. 이 주소에서 새로고침해도 이전 확인 작업을 복원하지 않는다.
- `collecting` 작업을 둔 채 `/batch-copy`에 직접 들어오면 관리 화면을 표시하지 않고 `/`로 정리한다.
- 저장 목록 관리 화면은 320 CSS px 메모 목록의 Drawer에 있는 `일괄 복사 N개 관리` 링크로 접근할 수 있다. 현재 실행에 모바일 작업이 있으면 이 링크를 숨기는 규칙을 유지한다.
- 과거 작업별 기록을 열람하는 기능은 현재 요구사항과 저장 자료에 없다. 별도 내역 URL을 만들면 사용자 가치 없이 화면과 상태 판정만 하나 더 생기므로 이번 범위에서 제외한다.

## 확인 취소 중 관리 화면이 나타나는 원인

`useMobileBatchCopyConfirmation.cancel()`은 `batchCopy.cancel()`이 끝난 뒤 `router.push("/")`를 호출한다. `useMobileBatchCopyState.cancel()`은 저장소에서 초안을 지우고 `publish(null, false)`로 화면 상태를 먼저 갱신한다. 이 사이에도 URL은 `/batch-copy`이므로 `BatchCopyStartPage`는 확인 화면 조건을 잃고 저장 목록 관리 화면과 `일괄 복사` 헤더를 렌더링한다.

2026-09-25의 `dea7fd1`은 확인 화면에서 메모 선택으로 돌아갈 때 같은 중간 렌더 문제를 `returningConfirmation` 스냅샷으로 막았다. `7a316df`는 `/batch-copy`에서 `collecting` 초안을 발견하면 관리 화면을 거치지 않고 `/`로 정리했다. 명시적 취소만 이 화면 이탈 처리에 포함되지 않았다.

취소는 경로 이동이 끝날 때까지 확인 화면 스냅샷을 유지해야 한다. 현재 실행의 작업은 `/`가 표시된 뒤 정리하면 되므로 IndexedDB 제거 실패와 재시도 상태는 더 이상 필요하지 않다. 이 처리는 확인 페이지의 경로 이동을 이미 관리하는 `useBatchCopyPage`에 두고, 확인 UI에는 취소 시작 동작 하나만 제공하는 것이 현재 복귀 처리와 책임이 같다.

## 수집 항목 누르기의 깜빡임 원인

`useMobileBatchCopyState.enqueue()`는 모든 작업에서 하나의 `pending`을 켠다. `MobileNotesWorkspace`는 이 값을 `MobileNoteList`의 `disabled`로 전달하고, `MobileNoteCard`는 모든 메모 버튼을 비활성화하면서 목록 전체에 `opacity-60`을 적용한다. 메모 하나를 누를 때마다 IndexedDB 추가가 끝날 때까지 모든 메모의 외형과 네이티브 비활성 상태가 함께 바뀌므로 화면 전체가 깜빡이는 것처럼 보인다.

추가 명령은 이미 하나의 queue에서 순서대로 실행된다. 모바일 작업 자체는 메모리에 두되 항목별 사용 횟수 저장은 계속 순서대로 완료해야 한다. 항목 추가는 같은 queue를 유지하면서 목록 전체를 잠그는 상태에서는 제외할 수 있다. `시작`, `초기화`, `다음`, `취소`처럼 서로 충돌하는 화면 전이는 계속 중복 실행을 막고, 메모 누르기는 앞선 사용 횟수 저장이 진행 중이어도 queue에 추가해 같은 메모의 반복 입력과 입력 순서를 잃지 않아야 한다.

## 다음 실행 뒤 하단 동작이 먼저 사라지는 원인

`MobileNotesWorkspace.proceedToConfirmation()`은 `batchCopy.confirm()`을 기다린 뒤 `/batch-copy`로 이동한다. `confirm()`이 `confirming` 작업을 먼저 발행하면 현재 URL은 아직 `/`이지만 `collecting` 판정이 거짓이 되어 하단 `초기화`와 `다음` 및 수집 헤더가 사라진다. IndexedDB 저장을 제거하면 대기 시간은 줄지만 상태 발행과 경로 표시의 순서 문제는 남는다. 그 뒤 Next.js가 새 경로 화면을 준비해 사용자는 평상시 목록이 잠깐 나타나는 지연을 볼 수 있다.

[Next.js 경로 이동 지침](https://nextjs.org/docs/app/getting-started/linking-and-navigating)은 prefetch가 클라이언트 이동 지연을 줄일 수 있다고 설명하지만, prefetch만으로 현재 화면의 잘못된 중간 상태를 없애지는 못한다. `다음`을 실행한 시점부터 `/batch-copy`가 표시될 때까지 수집 화면과 하단 동작의 표현을 유지하는 이탈 상태가 필요하다. 이 상태는 저장 초안에 넣지 않고 현재 화면 수명에만 둔다. 저장 또는 이동이 실패하면 같은 수집 화면에서 다시 시도할 수 있어야 한다.

## 모바일 아이콘의 현재 차이

`MobileNotesWorkspace`의 새 메모 버튼은 이미 `rounded-full`, `bg-action`, `text-action-ink`와 고정된 동일 너비 및 높이를 사용한다. 요구한 색 배경의 원형 제어를 소스 수준에서 충족하므로 먼저 실제 계산 스타일을 확인하고, 확인 결과가 다를 때만 토큰 또는 배치 오류를 수정해야 한다.

`MobileNoteCard`의 수정 링크는 `bg-surface-raised/90`와 `shadow-sm`을 함께 사용한다. 카드 표면 위에 별도 그림자가 생겨 수정 동작이 메모와 분리된 작은 카드처럼 보이는 직접 원인이다. 그림자를 제거하고 카드와 같은 표면 계열을 유지하되 32 CSS px 조작 영역, 접근 가능한 이름, hover와 `focus-visible`은 유지한다. WCAG 2.2의 [Target Size 최소 기준](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)은 24 CSS px 또는 충분한 간격을 기준으로 삼으므로 현재 32 CSS px 영역을 줄일 이유가 없다.

## 최소 권한 의존성 적용 범위

임시 조사 문서가 제안한 핵심은 외부 동작을 호출하는 기능이 필요한 최소 함수 또는 interface로 표현하고, 구현 선택은 조립 지점에 두는 것이다. [React Context 지침](https://react.dev/learn/passing-data-deeply-with-context#before-you-use-context)은 Context 전에 명시적 Props와 `children` 합성을 검토하도록 한다. [React `useContext` 문서](https://react.dev/reference/react/useContext)는 Provider 값 변경이 그 값을 읽는 하위 컴포넌트의 다시 렌더링으로 이어짐을 설명한다. Context를 Props 개수 감축 수단으로 일괄 도입할 근거는 없다.

2026-09-25의 `2c6b325`와 `docs/designs/notes-architecture-refactor-4d8c/references/capability-injection.md`는 전체 `LocalApplication` 객체를 제거하고 설정, 템플릿, 분석, 모바일 초안, 저장 목록, 메모와 사용 기록의 조립을 분리했다. 현재 `PersonalNotesDatabase` 한 연결을 공유하면서 각 기능 Provider에 필요한 저장소, Clipboard, 시계, 식별자 생성기와 Worker만 전달한다. 이 구조는 유지한다.

적용 대상은 IndexedDB, Clipboard, Worker, 시계, 식별자 생성기와 외부 SDK 같은 부수 효과다. 순수 변환, React 지역 상태, React Hook Form 상태, DOM ref와 단순 UI event는 일반 import, 지역 Hook 또는 실제로 사용하는 컴포넌트의 Props로 둔다. [FSD 계층 규칙](https://feature-sliced.design/docs/reference/layers#import-rule-on-layers)과 [public API 규칙](https://feature-sliced.design/docs/reference/public-api)에 따라 하위 slice가 `_app` 구현을 직접 가져오거나 다른 slice의 내부 파일을 우회하지 않아야 한다. IndexedDB 작업의 완료와 transaction 수명은 [IndexedDB 3.0 표준](https://www.w3.org/TR/IndexedDB-3/#transaction-lifecycle)을 따르며 Context나 화면 전환 상태가 저장 순서를 대신하지 않는다.

## Props 전달의 현재 원인과 정리 범위

이전 구조 개선은 한두 단계의 UI Props 전달을 허용했다. 이번 요구는 더 엄격하게, 컴포넌트가 값을 직접 읽거나 렌더링하거나 변환하고 callback을 직접 호출하는 경우에만 Props를 허용한다. 따라서 기존 검토에서 유지한 일부 중간 컴포넌트를 다시 정리해야 한다.

확인된 전달 사슬은 다음과 같다.

- `MobileNotesWorkspace`에서 `MobileNoteList`를 거쳐 `MobileNoteCard`로 수집 상태, 비활성 상태와 두 callback이 그대로 전달된다. `MobileNoteList`는 한 곳에서만 사용하므로 별도 Context 없이 목록 순회를 실제 수집 화면 컴포넌트로 옮기고 중간 컴포넌트를 제거할 수 있다.
- `NotesCollection`에서 `NotesBoard`를 거쳐 `NoteCard`로 메모 저장, 이동, 복사, 삭제와 선택 callback이 전달된다. `NotesBoard`는 보드 시점과 pointer 상태를 실제로 사용하므로 삭제 대상이 아니다. 데스크톱 카드 명령을 페이지 model hook으로 옮기고 `NotesBoard`가 같은 기능별 accessor에서 명령을 얻도록 해 공개 Props의 전달 전용 callback을 없애야 한다.
- `TemplatesStartPage`에서 `TemplateAuthoring`과 `SavedTemplates`를 거쳐 저장 및 선택 callback이 전달된다. 현재 `useTemplateWorkspace()`는 지역 `useState`를 가지므로 여러 컴포넌트에서 각각 호출하면 선택 상태가 분리된다. 선택 ID와 명령을 페이지 전용 Provider 한 곳에서 관리하고 실제로 저장하거나 선택하는 컴포넌트가 템플릿 선택 accessor를 사용해야 한다. 이는 여러 형제 화면이 같은 UI 선택 상태를 공유하는 경우라서 Context를 검토할 수 있는 예외에 해당한다.
- `TemplateValueFieldList`, `TemplatePlaceholderFields`와 `SavedTemplateList`는 한 곳에서만 쓰이며 값을 주로 행 컴포넌트로 전달한다. 목록 순회를 실제 form 또는 화면 소유자에 합치고 행 컴포넌트만 유지하는 것이 가장 작은 변경이다.
- `BatchCopyPanelContent`는 헤더, 닫기와 전체 복사는 직접 사용하지만 편집 목록의 값과 callback 일부를 `BatchCopyEditingView`로 그대로 전달한다. 패널 frame은 `children`으로 완성된 편집 목록을 받게 하고, 현재 feature 조립 지점이 편집 목록을 직접 구성하면 새 서비스 Context를 만들 필요가 없다.

행 컴포넌트가 callback을 버튼, pointer handler 또는 ref callback에서 실제로 호출하는 것은 전달만 하는 경우가 아니다. 네이티브 요소의 속성 묶음, React Hook Form의 `register` 결과와 공통 UI가 DOM 속성을 전달하는 것도 컴포넌트 사이의 애플리케이션 Props Drilling과 구분한다. 전체 `apps/notes/src/**/*.tsx`를 같은 기준으로 검사하되, Props 수를 줄이기 위한 큰 객체, 범용 Context, service locator, render props와 JSX named slot은 추가하지 않는다.

## 검증 제약

현재 shell은 Node.js 22.18.0을 사용하고 pnpm 11.25.0 실행 파일을 찾지 못해 운영 서버를 실행하지 않았다. 기존 브라우저 탭도 없어 이번 조사에서 실제 깜빡임과 계산 스타일을 다시 촬영하지 못했다. 원인은 소스와 Git 이력에서 추적했으며, 구현 단계에서는 저장소가 요구하는 Node.js 24.15와 pnpm 11.25 환경에서 320 CSS px 브라우저 과업과 실제 계산 스타일을 확인해야 한다. 이 조사 뒤 승인된 요구사항은 모바일 작업을 새로고침에서 복원하지 않도록 바뀌었으므로, 기존 IndexedDB 초안 전제보다 현재 실행의 메모리 상태를 계획 기준으로 사용한다.
