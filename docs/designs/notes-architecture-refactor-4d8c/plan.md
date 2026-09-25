# apps/notes 아키텍처 리팩토링 실행 계획

이 계획은 `apps/notes` 구현자가 화면과 저장 모듈을 순서대로 정리하고, 검토자가 사용자 동작과 저장 자료의 보존 여부를 확인하는 기준이다. 대상은 [리팩토링 요구사항](requirements.md)의 **현재 사용 동작과 저장 자료**, **모듈 책임과 의존 방향**, **상태마다 기준이 되는 위치**, **반응성과 유지보수성**이다. 화면에서 지킬 행동은 [기존 메모 앱 요구사항](../personal-notes-app-8fd/requirements.md)이 정하며, 현재 코드의 연결 지점은 [구조 조사](references/architecture-baseline.md)에 기록되어 있다.

## 실행 원칙과 선행 판단

- 작업은 아래 순서로 모듈별로 진행하고, 한 단위의 수정 내용과 다음 단위에 미치는 영향을 계획에 반영한다. 앞 단위에서 자료 형식, 상태 수명이나 사용자 동작이 달라지면 영향을 받는 다음 단위를 진행하기 전에 요구사항과 계획을 다시 확인한다. Props, Hook 또는 파일 수 감소를 완료 기준으로 삼지 않는다. 단위별 확인 대상은 기록하되 변경 뒤 검토와 검증은 U13에서 한 번 수행한다.
- [현재 React Hook Form 지침](../../dev/personal-notes-app/react-hook-form.md)은 폼 값과 저장 상태를 구분하는 기준이다. [테스트 전략](../../dev/personal-notes-app/testing-strategy.md)과 [테스트 안티패턴 지침](../../dev/personal-notes-app/test-anti-patterns.md)은 기존 검사가 사용자 동작을 확인하는지 판단할 때 적용한다. [기술 안티패턴 지침](../../dev/personal-notes-app/anti-patterns.md)은 FSD에 관한 현재 결정과 그 밖의 제안을 구분해 사용한다.
- 새 라이브러리나 전역 DI container를 먼저 도입하지 않는다. FSD의 [계층 import 규칙](https://fsd.how/docs/reference/layers/#import-rule-on-layers)과 [public API](https://fsd.how/docs/reference/public-api/)를 기존 ESLint 검사로 유지한다. 각 slice의 UI, 상태, 저장소 구현을 나누는 기준은 실제 변경 이유와 import 방향이다.
- U4부터 U12까지 수정하는 `.tsx`의 React 기본 Hook 구현은 같은 FSD 모듈의 기존 `.ts` Hook을 활용하거나 그 책임을 맡을 `.ts` 모듈로 옮긴다. `.tsx`에는 JSX와 Provider 조립을 남긴다. Hook 위치를 바꾸려고 상태 수명, Context 구독이나 slice의 public API를 바꾸지 않는다.
- IndexedDB는 저장 자료의 기준으로 유지한다. [TanStack Query의 cache 정책](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)과 [mutation 뒤 무효화](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations)를 각 저장 대상에 대조한다. 현재 자료만으로는 추가 cache가 기존 조회, 변경 queue와 저장소 구독보다 단순하다는 근거가 없으므로 미도입을 기본 선택으로 둔다. 특정 대상에서 도입 이점이 확인되면 의존성 조사와 바꿀 파일 및 동작을 먼저 확정하고, 승인 전에는 패키지와 저장 동작을 바꾸지 않는다.
- Server Component와 Client Component 사이에는 직렬화 가능한 값만 전달한다. 브라우저 저장소와 Worker는 client 조립 지점에 남기며, provider 위치를 바꿀 때는 [Next.js 실행 환경 설명](https://nextjs.org/docs/app/getting-started/server-and-client-components)을 기준으로 import graph를 확인한다.

## 실행 단위

### U1. 변경 전 동작과 비용을 고정한다

- **대상과 변경:** 운영 코드의 추가, 수정, 제거는 없다. `/`, `/notes/[noteId]`, `/batch-copy`, `/usage`, `/analysis`, `/templates`, `/settings`에서 현재 자료, 오류와 재시도, 화면 이동을 [기존 완료 증거](../personal-notes-app-8fd/requirements.md#완료를-확인할-증거)에 연결한다. `personal-notes`의 현재 schema와 이전 자료 업그레이드, 복구 초안, 메모 순서, 템플릿, 설정, 사용 기록의 시작 상태를 확인한다.
- **설계 기준:** 렌더 횟수는 정적 추측 대신 동일한 자료량과 입력에서 [React 개발자 도구의 Profiler](https://react.dev/learn/react-developer-tools)로 메모 보드, 일괄 복사 목록, 분석 항목, 템플릿 목록과 사용 기록을 비교한다. IndexedDB 조회, 첫 화면, heap, DOM 수와 모바일 스크롤은 기존 요구사항의 대표 자료량을 사용한다.
- **완료 증거:** 각 화면의 시작 입력, 사용자 조작, 저장 완료 시점과 화면 및 저장 자료의 확인 항목이 정해지고, 기존 검사 명령 및 브라우저 비교의 변경 전 값이 남는다. 이 단계는 성능 향상을 주장하지 않는다.

### U2. IndexedDB 조회마다 Query 적용 여부를 판단한다

- **대상과 변경:** [`notes-data-provider.tsx`](../../../apps/notes/src/_pages/notes/model/notes-data-provider.tsx), [`batch-copy-provider.tsx`](../../../apps/notes/src/_app/providers/batch-copy-provider.tsx), [`mobile-batch-copy-provider.tsx`](../../../apps/notes/src/features/add-note-to-batch-copy/model/mobile-batch-copy-provider.tsx), [`template-data-provider.tsx`](../../../apps/notes/src/_pages/templates/model/template-data-provider.tsx), [`interaction-preferences-provider.tsx`](../../../apps/notes/src/_pages/settings/model/interaction-preferences-provider.tsx), [`use-usage-read-state.ts`](../../../apps/notes/src/_pages/usage/model/use-usage-read-state.ts)의 읽기와 변경을 검토한다. 이 단위에서는 운영 코드와 의존성 파일을 수정하지 않는다.
- **설계 기준:** 대상마다 조회 시점, 조회값을 쓰는 위치, 저장 직후 화면 갱신, 실패와 재시도, 변경 순서, 다른 탭의 `blocked` 및 `versionchange`를 적는다. Query를 쓴다면 저장 원본과 cache의 갱신 주체, query key, 무효화 시점과 [기본 재조회 정책](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)을 정해야 한다. [IndexedDB transaction 수명](https://www.w3.org/TR/IndexedDB-3/#transaction-lifecycle)은 Query가 대신 관리하지 않는다.
- **완료 증거:** 메모 및 초안, 저장 일괄 복사 목록, 모바일 초안, 템플릿, 설정, 사용 기록 각각에 적용 또는 미적용 이유와 저장 실패 후 화면 상태가 적혀 있다. 분석 Worker의 실행 상태는 별도로 분류한다. 패키지 도입이 필요한 판단이면 U3 이후의 영향을 다시 계산하고 의존성 변경 전에 멈춘다.

### U3. 사용하지 않는 FSD 코드를 먼저 정리한다

- **제거 후보:** [`src/_app/ui/application-frame.tsx`](../../../apps/notes/src/_app/ui/application-frame.tsx)와 그 아래 `ui/navigation/`의 세 파일, [`src/_pages/batch-copy/ui/batch-copy-item-actions.tsx`](../../../apps/notes/src/_pages/batch-copy/ui/batch-copy-item-actions.tsx). 전체 import와 public API, route, 검사 및 빌드 참조에서 사용처가 없을 때만 제거한다. 활성 [`widgets/application-navigation`](../../../apps/notes/src/widgets/application-navigation/index.ts)과 [`createBatchCopyItemActions`](../../../apps/notes/src/features/edit-batch-copy/model/batch-copy-item-actions.ts)는 유지한다.
- **수정과 추가:** 제거가 확인되면 그 구현을 내보내는 재수출만 정리한다. 새 탐색 helper, 공통 manager, 빈 slice와 대체 UI는 추가하지 않는다. 활성 FSD slice가 다른 slice의 내부 파일에 기대는지 [`eslint.config.mjs`](../../../apps/notes/eslint.config.mjs)로 확인하고 위반이 확인된 import만 public API에 맞춘다.
- **설계 기준과 완료 증거:** FSD의 [public API 규칙](https://fsd.how/docs/reference/public-api/)을 적용한다. lint와 route 탐색에서 기존 주소, 현재 위치 표시, 모바일 탐색 및 일괄 복사 항목 동작이 같아야 한다. 사용처가 발견되면 삭제하지 않고 참조 관계를 먼저 해결한다.

### U4. 조립 지점과 메모 작업의 시계를 정리한다

- **수정:** [`create-local-application.ts`](../../../apps/notes/src/_app/composition/create-local-application.ts)와 [`personal-notes-provider.tsx`](../../../apps/notes/src/_app/providers/personal-notes-provider.tsx)의 기존 조립 방식으로 메모 삭제 및 알림 만료에 필요한 시계를 제공한다. [`note-session-provider.tsx`](../../../apps/notes/src/_pages/notes/model/note-session-provider.tsx)의 삭제 기록 및 알림 명령이 주입된 시각을 사용하게 하고 [`notes-collection.tsx`](../../../apps/notes/src/_pages/notes/ui/notes-collection.tsx)의 직접 시각 읽기를 없앤다. 외부 구현을 일반 UI 컴포넌트에 전달하는 Props는 추가하지 않는다.
- **유지와 제거:** `PersonalNotesProvider`의 앱 수명과 `dispose()`, 각 repository 및 Worker 연결을 유지한다. 시계를 바꾸는 두 지점의 직접 `new Date()` 및 `Date.now()` 호출만 제거한다. 범용 의존성 Context 또는 런타임 container는 추가하지 않는다.
- **설계 기준과 완료 증거:** 기존 [명시적 조립](references/architecture-baseline.md#저장소에서-확인한-구조)을 재사용한다. 삭제 취소의 원래 만료 시각, 알림의 5초 만료와 화면 이동 뒤 동작이 변경 전과 같고, `app/layout.tsx`에서 서버 및 클라이언트 모듈이 분리된 상태를 유지해야 한다.

### U5. 메모 저장과 편집 상태를 다듬는다

- **수정:** [`notes-data-provider.tsx`](../../../apps/notes/src/_pages/notes/model/notes-data-provider.tsx)의 조회, 초안과 변경 명령을 구분해 사용처가 필요한 상태만 구독하게 한다. [`note-properties-form-provider.tsx`](../../../apps/notes/src/_pages/notes/model/note-properties-form-provider.tsx)의 폼 Hook 구현은 같은 메모 model의 `.ts` 모듈로 옮긴다. [`use-note-content-autosave.ts`](../../../apps/notes/src/_pages/notes/model/use-note-content-autosave.ts), [`use-note-detail-editing.ts`](../../../apps/notes/src/_pages/notes/model/use-note-detail-editing.ts), [`use-note-properties-sync.ts`](../../../apps/notes/src/_pages/notes/model/use-note-properties-sync.ts)의 ref와 Effect는 최신 입력 보존, 이탈 저장, dirty 값 보호에 필요한 역할별로 남긴다. 속성 동기화 Hook이 이미 같은 feature의 form 및 session에 접근할 수 있으면 [`notes-collection.tsx`](../../../apps/notes/src/_pages/notes/ui/notes-collection.tsx)에서 전달하는 form 메서드 입력을 없앤다.
- **유지와 제거:** 저장 queue, IndexedDB 구독, 초안 revision 판정과 `blocked` 및 `version-changed` 상태를 유지한다. 단순 파생값의 중복 state 또는 역할이 사라진 ref 동기화 Effect만 제거하며, `pagehide`와 `visibilitychange` listener를 호출 수를 줄이기 위해 지우지 않는다. React는 [외부 시스템 동기화와 렌더 중 파생 계산](https://react.dev/learn/you-might-not-need-an-effect)을 구분한다.
- **완료 증거:** 저장 중 추가 입력, 800ms 자동 저장, 이탈 저장, 실패 후 재시도, 초안 복구와 속성 패널의 수정 중 입력 보존을 같은 메모 자료로 확인한다. Context를 나누었다면 메모 변경을 사용하지 않는 카드와 화면의 렌더 비용을 U1과 비교한다.

### U6. 메모 화면의 Props와 UI 책임을 줄인다

- **수정:** [`notes-start-page.tsx`](../../../apps/notes/src/_pages/notes/ui/notes-start-page.tsx)와 [`notes-collection.tsx`](../../../apps/notes/src/_pages/notes/ui/notes-collection.tsx) 사이의 단순 전달 명령은 Collection이 기존 feature 상태 접근자를 직접 사용할 수 있는지 검토해 줄인다. [`notes-board.tsx`](../../../apps/notes/src/_pages/notes/ui/notes-board.tsx), [`note-card.tsx`](../../../apps/notes/src/_pages/notes/ui/note-card.tsx), [`mobile-notes-workspace.tsx`](../../../apps/notes/src/_pages/notes/ui/mobile-notes-workspace.tsx), [`mobile-note-list.tsx`](../../../apps/notes/src/_pages/notes/ui/mobile-note-list.tsx), [`mobile-note-card.tsx`](../../../apps/notes/src/_pages/notes/ui/mobile-note-card.tsx)는 보드와 목록에서 쓰지 않고 통과시키는 값만 검토한다. [`note-properties-panel.tsx`](../../../apps/notes/src/_pages/notes/ui/note-properties-panel.tsx)과 [`batch-copy-workspace.tsx`](../../../apps/notes/src/_pages/notes/ui/batch-copy-workspace.tsx)의 브라우저 연결 Hook은 같은 페이지 model의 `.ts` 모듈에서 관리한다.
- **유지와 제거:** 메모, 복구 본문, 선택 상태, 배율, 행별 동작과 `children`처럼 인스턴스를 정의하는 입력은 Props로 유지한다. 중간 단계가 실제로 사라질 때 그 Props 선언과 전달만 제거한다. 한 단계 전달을 감추려는 Context 또는 JSX slot은 추가하지 않는다. [React의 Props와 Context 설명](https://react.dev/learn/passing-data-deeply-with-context)을 판단 기준으로 사용한다.
- **완료 증거:** 데스크톱 보드의 선택, 드래그, 속성, 복사와 모바일 목록의 탐색, 길게 누르기 및 일괄 복사 추가가 같은 화면 및 저장 동작을 낸다. U1의 카드와 목록 렌더 비용을 악화시키지 않는다.

### U7. 저장 일괄 복사 목록을 정리한다

- **수정:** [`batch-copy-provider.tsx`](../../../apps/notes/src/_app/providers/batch-copy-provider.tsx)의 저장 목록과 변경 queue, [`batch-copy-editing-view.tsx`](../../../apps/notes/src/features/edit-batch-copy/ui/batch-copy-editing-view.tsx)의 낙관적 편집과 실패 재시도, [`batch-copy-list.tsx`](../../../apps/notes/src/features/edit-batch-copy/ui/batch-copy-list.tsx)의 행 입력을 각각 실제 사용하는 값에 맞춘다. [`edit-batch-copy-provider.tsx`](../../../apps/notes/src/features/edit-batch-copy/model/edit-batch-copy-provider.tsx)의 기본 Hook 구현은 기존 편집 model의 `.ts` Hook과 책임을 대조해 옮긴다. 포인터 순서 계산이 다른 화면과 같을 때만 기존 [`reorder-pointer-session.ts`](../../../apps/notes/src/features/edit-batch-copy/model/reorder-pointer-session.ts)를 재사용한다.
- **유지와 제거:** 이미 공유하는 `createBatchCopyItemActions`를 재사용한다. 실행 취소 기록, 저장 순서와 행별 pointer callback은 유지하고, 목록이나 행에서 쓰지 않는 전달만 제거한다. Props 개수만 줄이려는 큰 객체나 새 범용 목록을 추가하지 않는다.
- **U13에서 확인할 동작:** 복제, 삭제, 순서 변경, 실행 취소와 다시 실행, 실패 재시도 뒤 화면과 IndexedDB의 항목 순서가 기존 동작을 유지한다.

### U8. 모바일 일괄 복사 초안을 정리한다

- **수정:** [`mobile-batch-copy-provider.tsx`](../../../apps/notes/src/features/add-note-to-batch-copy/model/mobile-batch-copy-provider.tsx), [`mobile-batch-copy-confirmation-list.tsx`](../../../apps/notes/src/_pages/batch-copy/ui/mobile-batch-copy-confirmation-list.tsx), [`use-mobile-batch-copy-pointer-reorder.ts`](../../../apps/notes/src/_pages/batch-copy/model/use-mobile-batch-copy-pointer-reorder.ts)에서 초안 변경과 화면 제스처의 책임을 분리한다. [`add-note-to-batch-copy-provider.tsx`](../../../apps/notes/src/features/add-note-to-batch-copy/model/add-note-to-batch-copy-provider.tsx)의 기본 Hook 구현도 같은 feature의 `.ts` 모듈로 옮긴다. U7과 동일한 순수 순서 계산이 확인될 때만 기존 entity 명령으로 합친다.
- **유지와 제거:** 모바일 초안의 `collecting` 및 `confirming`, `collectionVisible`, 저장 실패와 변경 queue를 저장 목록 상태에 합치지 않는다. 실제로 중복된 계산만 제거하고 포인터 이벤트와 오류 표현은 모바일 화면에 남긴다.
- **U13에서 확인할 동작:** 수집, 확인, 수집으로 복귀, 삭제, 복제, 순서 변경, 재진입과 [`use-batch-copy-page.ts`](../../../apps/notes/src/_pages/batch-copy/model/use-batch-copy-page.ts)의 주소 보정이 유지되고, 초안의 화면 순서와 IndexedDB 순서가 일치한다.

### U9. 분석 실행과 템플릿 제안을 정리한다

- **수정:** [`analysis-start-page.tsx`](../../../apps/notes/src/_pages/analysis/ui/analysis-start-page.tsx)와 [`analysis-results.tsx`](../../../apps/notes/src/_pages/analysis/ui/analysis-results.tsx) 사이의 템플릿 제안 callback 전달은 상태별 안내를 유지하면서 조립 위치를 단순화할 수 있는지 검토한다. [`text-analysis-provider.tsx`](../../../apps/notes/src/_pages/analysis/model/text-analysis-provider.tsx)의 화면 진입 검증과 Worker 호출은 실행과 검증의 책임이 겹치는 부분만 정리한다.
- **유지와 제거:** Worker 응답의 revision 판정, 실행 중인 요청 순서와 오래된 분석 숨김을 유지한다. 분석 실행 상태를 IndexedDB cache나 템플릿 저장 상태와 합치지 않는다.
- **U13에서 확인할 동작:** 분석 중 메모 변경, 실패 후 재실행, 원본 메모 이동과 선택한 두 문장의 템플릿 제안이 같고, 운영 Worker가 실제로 메시지를 주고받는다.

### U10. 템플릿의 자료와 폼 수명을 정리한다

- **수정:** [`template-data-provider.tsx`](../../../apps/notes/src/_pages/templates/model/template-data-provider.tsx), [`use-template-workspace.ts`](../../../apps/notes/src/_pages/templates/model/use-template-workspace.ts), [`template-editor.tsx`](../../../apps/notes/src/_pages/templates/ui/template-editor.tsx), [`template-input-form.tsx`](../../../apps/notes/src/_pages/templates/ui/template-input-form.tsx)에서 저장 자료, 선택한 템플릿과 폼 값의 관리 위치를 구분한다. [`selected-source-lines-provider.tsx`](../../../apps/notes/src/features/suggest-template/model/selected-source-lines-provider.tsx)의 Hook 구현은 같은 feature의 `.ts` 모듈로 옮긴다. Provider는 현재 조립 위치를 유지한다. U1에서 앱 진입 시 조회 비용이 확인된다면 재방문 상태를 보존할 조립 방식을 먼저 계획에 추가한다.
- **유지와 제거:** 한두 단계의 `register`, `control`, 오류 전달은 유지하고, 깊은 동일 폼 하위 트리가 실제로 생길 때만 [React Hook Form 지침](../../dev/personal-notes-app/react-hook-form.md#폼-수명)의 `FormProvider`를 검토한다. 중복 저장한 입력 상태가 확인될 때만 그 복제와 동기화를 제거한다.
- **U13에서 확인할 동작:** 분석에서 전달한 문장으로 작성, 수동 작성, 저장, 선택, 치환, 복사와 화면 재방문 뒤 저장 자료 및 선택 상태가 유지된다.

### U11. 사용 기록 조회를 정리한다

- **수정:** [`use-usage-read-state.ts`](../../../apps/notes/src/_pages/usage/model/use-usage-read-state.ts)와 [`usage-reader-provider.tsx`](../../../apps/notes/src/_pages/usage/model/usage-reader-provider.tsx)의 조회 시점과 reader 제공을 U2의 판단에 맞춘다. 다른 화면에 복제한 조회 상태가 확인되면 그 복제만 제거한다.
- **유지와 제거:** [`usage-start-page.tsx`](../../../apps/notes/src/_pages/usage/ui/usage-start-page.tsx)와 [`usage-table.tsx`](../../../apps/notes/src/_pages/usage/ui/usage-table.tsx)의 화면 및 행을 정의하는 Props는 유지한다. 사용 기록을 메모 목록 cache에 합치지 않는다.
- **U13에서 확인할 동작:** 개별 복사 및 일괄 복사 뒤 사용 횟수, 오류 안내와 재시도, 새로고침 뒤 기록이 유지된다.

### U12. 설정과 공통 UI를 정리한다

- **수정:** [`interaction-preferences-provider.tsx`](../../../apps/notes/src/_pages/settings/model/interaction-preferences-provider.tsx)의 저장 실패 복원과 [`settings-start-page.tsx`](../../../apps/notes/src/_pages/settings/ui/settings-start-page.tsx)의 폼 입력 책임을 U2의 판단에 대조한다. [`shared/ui`](../../../apps/notes/src/shared/ui/)와 활성 [`application-navigation`](../../../apps/notes/src/widgets/application-navigation/index.ts)은 서로 같은 동작이 중복된 곳만 수정한다. 앞 단위의 대상이 아닌 [`runtime-access-guard.tsx`](../../../apps/notes/src/_app/ui/runtime-access-guard.tsx), [`navigation-guard-provider.tsx`](../../../apps/notes/src/features/navigation-guard/model/navigation-guard-provider.tsx), [`checkbox.tsx`](../../../apps/notes/src/shared/ui/checkbox/checkbox.tsx)의 기본 Hook 구현도 같은 책임의 `.ts` 모듈로 옮긴다.
- **유지와 제거:** 바로 하위 폼이 사용하는 설정 Props는 유지한다. 폼 값은 [현재 React Hook Form 지침](../../dev/personal-notes-app/react-hook-form.md#상태-책임)에 남기고 저장값의 불필요한 복제만 제거한다. 단순한 구문 반복을 이유로 공통 provider나 UI wrapper를 추가하지 않는다.
- **U13에서 확인할 동작:** 두 설정의 저장 및 실패 시 이전 값 복원, 모든 route의 탐색, 현재 위치 표시와 접근성 이름이 유지된다.

### U13. 전체 보존 조건을 마지막에 검증한다

- **대상과 변경:** 새 사용자 동작이나 독립적인 추상화는 추가하지 않는다. 각 단위에서 변경한 코드의 FSD import와 순환 관계, client bundle로 유입되는 모듈, IndexedDB schema 및 저장 자료 형식을 함께 확인한다.
- **완료 증거:** [리팩토링 요구사항의 완료 증거](requirements.md#완료를-확인할-증거)에 따라 기존 lint, typecheck, unit, browser, E2E 통과 여부와 실제 브라우저의 일곱 route, 넓은 화면 및 320 CSS px 화면을 확인한다. 이전 schema 자료를 읽은 뒤 메모 원문과 순서, 초안, 일괄 복사, 템플릿, 설정 및 사용 기록을 대조한다. U1과 같은 입력으로 렌더 횟수 및 시간을 비교하고, 값이 나빠졌다면 원인을 찾은 뒤 완료를 판정한다.

## 멈추고 다시 판단할 조건

- 기존 요구사항과 실제 화면 또는 저장 자료가 충돌하면 영향받는 단위의 변경을 중단하고 기준을 결정한다. 다른 단위는 그 충돌의 영향을 받지 않을 때만 진행한다.
- 저장 형식이나 DB 버전 변경이 필요해지면 현재 자료를 그대로 읽을 수 있는지와 migration 규칙을 먼저 확정한다. W3C의 [`blocked` 및 `versionchange` 처리](https://www.w3.org/TR/IndexedDB-3/#connection-requests)를 무시하는 변경은 진행하지 않는다.
- TanStack Query나 다른 외부 의존성이 필요하다는 판단이 나오면 직접 및 전이 의존성, 공식 통합 방식, 현재 구현과의 차이를 조사하고 승인 전에는 추가하지 않는다. 미도입인 저장 대상의 작업은 계속할 수 있다.
- provider 이동으로 화면 이동 뒤 선택 또는 초안이 사라지거나, Effect 제거로 저장 및 정리 시점이 달라지면 영향을 받는 작업을 멈춘다. U13에서 검사가 실패하면 전체 완료를 보류하고 사용자 동작을 보존하는 수정안을 확인한다.
