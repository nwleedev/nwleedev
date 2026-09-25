# 메모 서비스의 capability 주입 기준

현재 `apps/notes`는 브라우저 구현을 `_app`에서 선택하고 각 기능의 Provider에 전달한다. 이 방식은 [의존성 조립에 관한 기존 결정](../../personal-notes-app-8fd/decisions/application-package-and-fsd.md#승인된-결정과-이유)과 [리팩토링 요구사항](../requirements.md#모듈-책임과-의존-방향을-분명히-한다)을 충족하는 방향이다. 주입된 읽기 기능을 조회만 하는 Hook은 사용 기록 화면에 이미 있다. 모든 저장소 함수, 화면 callback과 DOM ref를 별도 Provider로 옮길 근거는 현재 코드에서 확인되지 않았다. 이 판단은 코드 연결 관계에 관한 검토이며, 렌더 성능이나 전체 사용자 과업을 다시 측정한 값에 근거하지 않는다.

## 판단 기준과 외부 근거

교체 가능한 저장소, 클립보드, 시계, 식별자 생성기와 Worker는 이를 사용하는 모듈이 구체 구현을 고르지 않도록 조립 지점에서 연결할 수 있다. `useRead`처럼 Context의 값을 반환하기만 하는 Hook은 이 연결을 읽는 접근자다. 조회, cache, 저장 순서와 오류 처리는 접근자와 별도의 책임이다. [React의 Context 설명](https://react.dev/reference/react/useContext)은 Hook이 가장 가까운 Provider의 값을 읽고 그 값이 달라지면 다시 렌더링된다고 명시한다. 그러므로 접근자를 추가하는 것만으로 구독 비용이 줄지는 않는다.

[React의 Context 사용 지침](https://react.dev/learn/passing-data-deeply-with-context)은 “Before you use context, try passing props or passing JSX as `children`.”라고 안내한다. 여러 단계에서 사용하지 않는 외부 의존성을 전달해야 할 때 Context가 도움이 되지만, 특정 메모, 폼 초안, 이벤트 처리 함수와 DOM 요소는 화면 또는 Hook 호출을 정의하는 입력이다. [React의 Custom Hook 지침](https://react.dev/learn/reusing-logic-with-custom-hooks)도 Hook에 반응형 값을 전달하는 방식을 설명하며, [ref 설명](https://react.dev/reference/react/useRef)은 ref가 렌더링에 필요하지 않은 값을 컴포넌트 수명에 보관한다고 설명한다.

[FSD 계층 규칙](https://feature-sliced.design/docs/reference/layers#import-rule-on-layers)은 slice가 더 낮은 계층의 다른 slice만 import하도록 제한한다. [public API 규칙](https://feature-sliced.design/docs/reference/public-api)은 외부 slice가 내부 구현 대신 공개 진입점을 사용하도록 한다. `_app`의 조립 객체를 하위 Hook이 직접 import하는 방식은 이 방향을 뒤집으므로, Context가 필요한 경우에도 하위 slice가 필요한 타입과 접근자를 정의하고 `_app`이 값을 제공해야 한다. [Next.js의 Server 및 Client Component 지침](https://nextjs.org/docs/app/getting-started/server-and-client-components#context-providers)은 Context Provider를 Client Component에 두고 필요한 하위 트리를 감싸도록 안내한다. 브라우저 저장소 객체를 서버 라우트에서 클라이언트로 전달하는 설계는 현재 조립 방식과 맞지 않는다.

TanStack Query의 [`queryOptions` 설명](https://tanstack.com/query/latest/docs/framework/react/reference/functions/queryOptions)은 query key와 query function을 함께 정의할 수 있음을 보여 준다. [mutation 뒤 무효화 지침](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations)은 저장 이후 변경된 자료를 읽는 query의 cache 일관성을 별도로 관리한다. [`apps/notes/package.json`](../../../../apps/notes/package.json)에는 TanStack Query가 없고, [W3C IndexedDB transaction 수명 규칙](https://www.w3.org/TR/IndexedDB-3/#transaction-lifecycle)은 React Context나 Query가 대신 제공하지 않는다. 따라서 조회 접근자를 만든다는 이유로 Query를 도입하거나 현재 저장 순서를 바꾸지 않는다. 저장 대상별 적용 판단은 [기존 계획 U2](../plan.md#u2-indexeddb-조회마다-query-적용-여부를-판단한다)에 있다.

## 전체 코드에서 확인한 연결 관계

### 애플리케이션 조립

[`create-local-application.ts`](../../../../apps/notes/src/_app/composition/create-local-application.ts)는 IndexedDB, 클립보드, 시계, ID 생성기와 분석 Worker를 만들고 [`personal-notes-provider.tsx`](../../../../apps/notes/src/_app/providers/personal-notes-provider.tsx)가 각 Provider에 전달한다. [`use-local-application.ts`](../../../../apps/notes/src/_app/providers/use-local-application.ts)는 그 인스턴스의 수명과 종료를 맡는다. 전체 `LocalApplication` 객체를 하위 화면에 제공하는 Context는 없다. `usage.writer` 속성은 조립 객체에 있으나 앱 코드에서 사용하지 않고, 실제 개별 복사 기록은 `notes.usageWriter`를 통해 전달된다. 이는 기능별 접근자를 늘리는 것과 별개로 제거 가능한 중복 조립 항목이다.

### 메모와 상세 편집

[`use-notes-data-model.ts`](../../../../apps/notes/src/_pages/notes/model/use-notes-data-model.ts)는 메모 및 복구 초안 조회, `blocked`와 `version-changed` 구독, 변경 queue, 최신 메모 ref와 저장 뒤 화면 목록 갱신을 함께 관리한다. `saveContent`와 `saveDraft`는 queue 안에서 현재 메모와 revision을 사용한다. 이 명령을 우회해 하위 Hook에 원시 `NoteRepository` 또는 `NoteDraftRepository`를 제공하면 현재의 순서 및 화면 갱신 처리를 건너뛴다.

[`note-detail-page.tsx`](../../../../apps/notes/src/_pages/notes/ui/note-detail-page.tsx)는 선택한 메모와 복구 본문을 상세 편집기에 전달하고 저장 명령 두 개도 한 단계 전달한다. [`use-note-detail-editing.ts`](../../../../apps/notes/src/_pages/notes/model/use-note-detail-editing.ts)는 React Hook Form의 현재 값과 메모 ref를 [`use-note-detail-draft.ts`](../../../../apps/notes/src/_pages/notes/model/use-note-detail-draft.ts), [`use-note-detail-navigation.ts`](../../../../apps/notes/src/_pages/notes/model/use-note-detail-navigation.ts)에 공유한다. `readContent`, `setFailure`, `noteReference`와 `editor`는 편집 인스턴스의 같은 수명과 실패 상태를 잇는다. 각 Hook이 같은 이름의 ref나 state를 새로 만들면 같은 편집 상태를 공유하지 못한다.

저장 명령의 한 단계 전달만 없애려고 별도 인프라 Provider를 추가하면 접근자와 Context가 늘고, 현재 `useNotesData()`의 상태 및 명령 결합 문제도 저절로 해결되지 않는다.

[`note-session-provider.tsx`](../../../../apps/notes/src/_pages/notes/model/note-session-provider.tsx)는 화면 상태와 명령 Context를 이미 나누며, [`note-properties-form-provider.tsx`](../../../../apps/notes/src/_pages/notes/model/note-properties-form-provider.tsx)는 속성 폼의 수명에 맞춘 Context다. 이들은 저장소 capability 조회기와 다른 역할이다. 메모 제스처, 선택, 포커스와 폼 값은 메모 또는 화면 인스턴스의 입력으로 남긴다.

### 저장 일괄 복사와 모바일 초안

[`use-batch-copy-state.ts`](../../../../apps/notes/src/_app/providers/use-batch-copy-state.ts)는 저장 목록의 변경 queue, 실행 취소 이력, 화면 게시와 개별 항목 제거 뒤 메모 선택 해제를 조정한다. `onItemRemoved`는 `_app`이 연결한 화면 간 후속 동작이며 교체 가능한 저장소 기능이 아니다. [`use-mobile-batch-copy-state.ts`](../../../../apps/notes/src/features/add-note-to-batch-copy/model/use-mobile-batch-copy-state.ts)는 별도의 초안, 수집 및 확인 단계, queue와 실패 복원을 관리한다. 두 저장 과정을 원시 repository 접근자로 우회하거나 한 Provider로 합치면 서로 다른 수명이 흐려진다.

[`use-batch-copy-editing.ts`](../../../../apps/notes/src/features/edit-batch-copy/model/use-batch-copy-editing.ts)의 `onMove`, `onRemove`, `onDuplicate`는 저장 목록의 낙관적 화면 처리에 연결되는 명령이다. [`use-mobile-batch-copy-confirmation.ts`](../../../../apps/notes/src/_pages/batch-copy/model/use-mobile-batch-copy-confirmation.ts)의 `onReturnToCollection`은 화면 이동과 실패 안내를 연결한다. [`use-batch-copy-action-sheet.ts`](../../../../apps/notes/src/features/edit-batch-copy/model/use-batch-copy-action-sheet.ts)가 받는 목록 ref는 포인터 재정렬과 포커스 복귀에 쓰는 동일한 DOM 요소다. 세 종류 모두 별도 인프라 capability가 아니므로 일괄적인 Provider 전환 대상이 아니다.

### 템플릿, 분석과 설정

[`use-template-data-state.ts`](../../../../apps/notes/src/_pages/templates/model/use-template-data-state.ts)는 템플릿 저장소, 클립보드, 시계와 ID 생성기를 Provider에서 직접 받아 조회 상태와 저장된 템플릿을 화면에 전달한다. [`use-template-editor.ts`](../../../../apps/notes/src/_pages/templates/model/use-template-editor.ts)의 `onDraftChange`와 `onSaved`는 그 편집 과정의 초안과 선택을 바꾸는 함수다. 인프라를 직접 사용하는 별도 Hook이 추가되지 않은 현 상태에서는 별도 조회 Context가 한 단계를 더할 뿐이다.

[`use-text-analysis-state.ts`](../../../../apps/notes/src/_pages/analysis/model/use-text-analysis-state.ts)는 주입된 `NoteReader`와 Worker로 실행 전후의 메모 revision을 비교하고, 늦은 응답을 sequence로 걸러낸다. Worker 또는 reader를 일반 UI가 직접 조회하도록 바꾸면 이 검증을 우회하기 쉽다. [`use-interaction-preferences-state.ts`](../../../../apps/notes/src/_pages/settings/model/use-interaction-preferences-state.ts)는 설정 저장 실패 시 이전 값을 복원한다. [`use-interaction-preferences-form.ts`](../../../../apps/notes/src/_pages/settings/model/use-interaction-preferences-form.ts)에 전달되는 저장 함수는 이 복원 동작을 거친 명령이므로 repository 접근자로 대체하지 않는다.

### 사용 기록, 탐색과 공통 UI

[`use-usage-reader.ts`](../../../../apps/notes/src/_pages/usage/model/use-usage-reader.ts)는 주입된 `TextUsageReader`를 반환하기만 하고, [`use-usage-read-state.ts`](../../../../apps/notes/src/_pages/usage/model/use-usage-read-state.ts)가 조회, 재시도와 늦은 응답 처리를 맡는다. 이는 사용 기록 읽기 기능의 접근자와 조회 Hook을 분리한 현재 사례다.

[`navigation-guard-provider.tsx`](../../../../apps/notes/src/features/navigation-guard/model/navigation-guard-provider.tsx)와 [`selected-source-lines-provider.tsx`](../../../../apps/notes/src/features/suggest-template/model/selected-source-lines-provider.tsx)는 각각 화면 이동 보호와 선택 자료를 공유한다. [`widgets/application-navigation`](../../../../apps/notes/src/widgets/application-navigation/index.ts) 및 [`shared/ui`](../../../../apps/notes/src/shared/ui)은 브라우저 저장소를 조회하지 않는다. 이 영역에 범용 의존성 Context를 추가할 근거가 없다.

## 적용 조건과 미확인 사항

현재의 직접 Provider 주입과 `useUsageReader` 접근자는 유지하는 편이 적합하다. 단지 Hook의 인자나 컴포넌트 Props가 함수라는 이유로 이를 없애지 않는다. 새로운 독립 모듈이 같은 외부 기능을 여러 단계의 무관한 컴포넌트를 거쳐 받아야 하는 경우에만 그 기능을 사용하는 slice에서 최소 타입과 조회 전용 접근자를 검토한다. 이때도 Provider 값의 수명, FSD 공개 진입점, 기존 명령의 queue와 오류 처리를 먼저 확인한다. `usage.writer`의 미사용 항목은 별도 코드 변경으로 제거할 수 있다.

검토는 설치된 React 19.2.8, Next.js 16.3.3, React Hook Form 7.86.0과 현재 소스 및 위 공식 자료를 2026-09-25에 대조했다. Provider를 나눈 뒤의 렌더 횟수, 메모 사용량과 전체 브라우저 동작은 측정하지 않았다. [기존 U20 결과](../plan.md#u20-후속-변경의-사용자-동작과-의존-방향을-확인한다)에는 Firefox 폰트 경고로 실패한 E2E 한 건이 남아 있으므로 이 검토만으로 전체 검증 완료를 주장하지 않는다.
