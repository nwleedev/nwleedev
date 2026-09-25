# 메모 서비스의 capability 주입 기준

`apps/notes`는 브라우저 구현을 `_app`에서 선택해 각 Provider에 전달하지만, 그 전에 분석, 메모, 일괄 복사, 설정, 템플릿과 사용 기록의 의존성을 `LocalApplication` 한 객체에 모은다. Provider에 직접 주입하는 방식은 [기존 FSD 조립 결정](../../personal-notes-app-8fd/decisions/application-package-and-fsd.md#승인된-결정과-이유)에 맞는다. 반면 단일 조립 객체를 계속 확장하는 방식은 [전체 의존성 객체를 피하는 요구사항](../requirements.md#모듈-책임과-의존-방향을-분명히-한다)에 맞게 바꿔야 한다. 이 결론은 코드 연결 관계의 검토이며 렌더 성능이나 전체 사용자 과업을 다시 측정한 값은 아니다.

## 판단 기준과 외부 근거

교체 가능한 저장소, 클립보드, 시계, 식별자 생성기와 Worker는 이를 사용하는 모듈이 구체 구현을 고르지 않도록 조립 지점에서 연결할 수 있다. `useRead`처럼 Context의 값을 반환하기만 하는 Hook은 이 연결을 읽는 접근자다. 조회, cache, 저장 순서와 오류 처리는 접근자와 별도의 책임이다. [React의 Context 설명](https://react.dev/reference/react/useContext)은 Hook이 가장 가까운 Provider의 값을 읽고 그 값이 달라지면 다시 렌더링된다고 명시한다. 그러므로 접근자를 추가하는 것만으로 구독 비용이 줄지는 않는다.

[React의 Context 사용 지침](https://react.dev/learn/passing-data-deeply-with-context)은 “Before you use context, try passing props or passing JSX as `children`.”라고 안내한다. 여러 단계에서 사용하지 않는 외부 의존성을 전달해야 할 때 Context가 도움이 되지만, 특정 메모, 폼 초안, 이벤트 처리 함수와 DOM 요소는 화면 또는 Hook 호출을 정의하는 입력이다. [React의 Custom Hook 지침](https://react.dev/learn/reusing-logic-with-custom-hooks)도 Hook에 반응형 값을 전달하는 방식을 설명하며, [ref 설명](https://react.dev/reference/react/useRef)은 ref가 렌더링에 필요하지 않은 값을 컴포넌트 수명에 보관한다고 설명한다.

[FSD 계층 규칙](https://feature-sliced.design/docs/reference/layers#import-rule-on-layers)은 slice가 더 낮은 계층의 다른 slice만 import하도록 제한한다. [public API 규칙](https://feature-sliced.design/docs/reference/public-api)은 외부 slice가 내부 구현 대신 공개 진입점을 사용하도록 한다. `_app`의 조립 객체를 하위 Hook이 직접 import하는 방식은 이 방향을 뒤집으므로, Context가 필요한 경우에도 하위 slice가 필요한 타입과 접근자를 정의하고 `_app`이 값을 제공해야 한다. [Next.js의 Server 및 Client Component 지침](https://nextjs.org/docs/app/getting-started/server-and-client-components#context-providers)은 Context Provider를 Client Component에 두고 필요한 하위 트리를 감싸도록 안내한다. 브라우저 저장소 객체를 서버 라우트에서 클라이언트로 전달하는 설계는 현재 조립 방식과 맞지 않는다.

[FSD의 App 계층 설명](https://feature-sliced.design/docs/reference/layers#app)은 앱 전체 연결을 그 계층에 둘 수 있음을 설명하지만, 모든 구현체를 하나의 타입에 합치도록 요구하지 않는다. [React의 `useState` 초기화 규칙](https://react.dev/reference/react/useState#avoiding-recreating-the-initial-state)은 초기화 함수를 첫 렌더의 상태 생성에 사용하며, 개발 환경의 Strict Mode에서는 그 함수를 두 번 호출할 수 있다고 설명한다. [Effect의 수명 규칙](https://react.dev/reference/react/useEffect#connecting-to-an-external-system)은 외부 자원을 연결하고 정리하는 시점을 설명한다. 따라서 조립 코드를 옮길 때에도 인스턴스의 안정성과 종료 책임을 함께 옮겨야 한다.

TanStack Query의 [`queryOptions` 설명](https://tanstack.com/query/latest/docs/framework/react/reference/functions/queryOptions)은 query key와 query function을 함께 정의할 수 있음을 보여 준다. [mutation 뒤 무효화 지침](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations)은 저장 이후 변경된 자료를 읽는 query의 cache 일관성을 별도로 관리한다. [`apps/notes/package.json`](../../../../apps/notes/package.json)에는 TanStack Query가 없고, [W3C IndexedDB transaction 수명 규칙](https://www.w3.org/TR/IndexedDB-3/#transaction-lifecycle)은 React Context나 Query가 대신 제공하지 않는다. 따라서 조회 접근자를 만든다는 이유로 Query를 도입하거나 현재 저장 순서를 바꾸지 않는다. 저장 대상별 적용 판단은 [기존 계획 U2](../plan.md#u2-indexeddb-조회마다-query-적용-여부를-판단한다)에 있다.

## 전체 코드에서 확인한 연결 관계

### 애플리케이션 조립

[`create-local-application.ts`](../../../../apps/notes/src/_app/composition/create-local-application.ts)의 `LocalApplication` 타입과 반환값은 분석, 저장 일괄 복사, 메모, 설정, 템플릿과 사용 기록의 의존성을 한데 나열한다. [`use-local-application.ts`](../../../../apps/notes/src/_app/providers/use-local-application.ts)는 그 객체의 정체성을 유지하고 종료 시 분석 Worker와 IndexedDB 연결을 정리한다. [`personal-notes-provider.tsx`](../../../../apps/notes/src/_app/providers/personal-notes-provider.tsx)는 객체의 각 부분을 기능별 Provider에 직접 전달하며, 전체 객체를 하위 화면에서 조회하는 Context는 없다. 따라서 현재 문제는 전역 조회나 확인된 런타임 오류가 아니라 기능이 추가될 때 한 타입, 생성 함수와 상위 Provider가 함께 커지는 변경 결합이다. `usage.writer`는 사용하지 않는 속성이지만 그것만 제거해서는 이 결합이 사라지지 않는다.

[`PersonalNotesDatabase`](../../../../apps/notes/src/_app/composition/indexed-db/personal-notes-database.ts)는 연결, 연결 중인 Promise, 세대 번호와 `blocked` 및 `version-changed` 구독을 인스턴스별로 관리한다. 메모 저장소와 `storageMonitor`가 같은 연결을 쓰는 현재 관계를 유지해야 한다. 인스턴스를 기능마다 만들면 연결과 알림을 따로 관리하게 되며, 열린 연결을 정리하지 못할 경우 버전 변경이 지연될 수 있다. [IndexedDB 표준의 연결 업그레이드 규칙](https://www.w3.org/TR/IndexedDB-3/#connection-requests)은 이전 버전의 연결이 남으면 업그레이드 요청이 `blocked` 상태로 대기한다고 설명한다.

[`WorkerTextAnalyzer`](../../../../apps/notes/src/_pages/analysis/api/worker-text-analyzer.ts)는 첫 분석 요청 때 Worker를 만들고 `dispose`에서 종료와 대기 중인 요청 거절을 처리한다. 분석 기능의 조립이 독립되어도 이 정리는 분석 Provider의 수명에 남아야 한다. 반면 `CryptoEntityIdGenerator`는 호출마다 `crypto.randomUUID()`를 사용하고 `BrowserClipboardWriter`는 쓰기 시점에 브라우저 API를 조회하며, `now`는 현재 시각을 계산한다. 세 구현은 현재 공유 인스턴스에 상태를 쌓지 않는다. 그러므로 기능별로 만들 수 있으나 각 Provider가 받는 함수와 객체의 정체성은 렌더링 사이에 안정적으로 유지해야 한다.

### 조립 방식 비교

`LocalApplication`을 유지하면 현재의 연결과 종료 시점은 그대로지만, 새 화면의 저장소를 추가할 때 전체 타입과 생성 함수를 다시 수정해야 한다. 생성 코드를 `PersonalNotesProvider`나 `useLocalApplication` 안으로 옮기고 같은 객체를 반환해도 그 결합은 남는다. 각 조립 모듈이 IndexedDB 연결을 열면 모듈 사이에서 서로 다른 연결을 사용하고 `storageMonitor`는 자신이 구독한 연결의 알림만 받으며, 각 연결을 별도로 정리해야 한다.

공통 IndexedDB 연결은 현재 수명으로 유지하고, 설정, 템플릿, 분석, 두 일괄 복사 작업과 메모의 구현체를 각각의 `_app` 조립 모듈에서 만든다. 이 방식은 조립 모듈을 추가하지만 전체 의존성을 나열하는 타입을 제거하며 기존 Provider의 입력과 저장 명령을 재사용할 수 있다. 사용 기록 저장소는 메모 복사 기록과 `/usage` 조회에 함께 전달한다. 분석 Worker는 분석 연결에서 종료한다.

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

`LocalApplication`의 전체 의존성 목록은 없애고 `_app`의 설정, 템플릿, 분석, 일괄 복사와 메모 연결 위치에서 필요한 구현체만 안정적으로 만든다. `PersonalNotesProvider`는 기존 Provider의 순서와 설정 및 메모 세션의 화면 간 연결을 조정하고, 공통 IndexedDB 연결과 메모 작성 및 사용 기록 읽기가 함께 쓰는 저장소만 연결한다. 분석 Worker의 종료는 분석 연결 위치에서 처리한다. 큰 객체를 큰 Hook, 상위 컴포넌트의 단일 의존성 묶음 또는 범용 Dependencies Context로 옮기지는 않는다.

기존 기능별 Provider와 `useUsageReader` 접근자는 재사용한다. Hook 인자나 컴포넌트 Props가 함수라는 이유만으로 새 Context를 만들지 않는다. 독립 모듈이 같은 외부 기능을 무관한 중간 컴포넌트 여러 개를 거쳐 받아야 할 때만 해당 slice의 최소 접근자를 검토한다. `usage.writer`는 조립 객체 제거와 함께 사라지지만 `notes.usageWriter`와 `usage.reader`의 실제 주입은 유지한다. 기능별 조립 위치, 코드 제거 순서와 완료 증거는 [실행 계획](../plan.md#capability-주입-검토에-따른-후속-단위)에 둔다.

검토는 설치된 React 19.2.8, Next.js 16.3.3, React Hook Form 7.86.0과 현재 소스 및 위 공식 자료를 2026-09-25에 대조했다. 기능별 조립 뒤의 렌더 횟수, 메모리 사용량과 전체 브라우저 동작은 측정하지 않았다. [기존 U20 결과](../plan.md#u20-후속-변경의-사용자-동작과-의존-방향을-확인한다)에는 Firefox 폰트 경고로 실패한 E2E 한 건이 남아 있으므로 이 검토만으로 전체 검증 완료를 주장하지 않는다.
