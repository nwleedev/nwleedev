# apps/notes 아키텍처 리팩토링 실행 계획

이 계획은 `apps/notes` 구현자가 화면과 저장 모듈을 순서대로 정리하고, 검토자가 사용자 동작과 저장 자료의 보존 여부를 확인하는 기준이다. 대상은 [리팩토링 요구사항](requirements.md)의 **현재 사용 동작과 저장 자료**, **모듈 책임과 의존 방향**, **상태마다 기준이 되는 위치**, **반응성과 유지보수성**이다. 화면에서 지킬 행동은 [기존 메모 앱 요구사항](../personal-notes-app-8fd/requirements.md)이 정하며, 현재 코드의 연결 지점은 [구조 조사](references/architecture-baseline.md), [메모 조작 및 Hook 책임 조사](references/geometry-and-hook-responsibility.md)와 [capability 주입 검토](references/capability-injection.md)에 기록되어 있다. U1부터 U13까지는 기존 리팩토링이며, U14부터 U20까지는 메모 조작 실패의 원인을 판별하고 복합 책임 Hook을 분리한다. U21은 전체 주입 구조를 검토하고, U22부터 U28까지 전체 의존성 객체를 설정, 템플릿, 분석, 일괄 복사와 메모의 조립 모듈로 교체하며, U29에서 사용자 동작을 최종 확인한다.

## 실행 원칙과 선행 판단

- 작업은 아래 순서로 모듈별로 진행하고, 한 단위의 수정 내용과 다음 단위에 미치는 영향을 계획에 반영한다. 앞 단위에서 자료 형식, 상태 수명이나 사용자 동작이 달라지면 영향을 받는 다음 단위를 진행하기 전에 요구사항과 계획을 다시 확인한다. Props, Hook 또는 파일 수 감소를 완료 기준으로 삼지 않는다. U1부터 U13까지의 검증은 U13에서 수행했고, U14부터 U19까지의 변경 뒤 검토와 검증은 U20에서 한 번 수행한다. U22부터 U28까지의 변경 뒤 검토와 검증은 U29에서 한 번 수행한다. U14의 실패 재현과 자료 수집은 원인 판별에 필요한 조사다.
- [현재 React Hook Form 지침](../../dev/personal-notes-app/react-hook-form.md)은 폼 값과 저장 상태를 구분하는 기준이다. [테스트 전략](../../dev/personal-notes-app/testing-strategy.md)과 [테스트 안티패턴 지침](../../dev/personal-notes-app/test-anti-patterns.md)은 기존 검사가 사용자 동작을 확인하는지 판단할 때 적용한다. [기술 안티패턴 지침](../../dev/personal-notes-app/anti-patterns.md)은 FSD에 관한 현재 결정과 그 밖의 제안을 구분해 사용한다.
- 새 라이브러리나 전역 DI container를 먼저 도입하지 않는다. FSD의 [계층 import 규칙](https://fsd.how/docs/reference/layers/#import-rule-on-layers)과 [public API](https://fsd.how/docs/reference/public-api/)를 기존 ESLint 검사로 유지한다. 각 slice의 UI, 상태, 저장소 구현을 나누는 기준은 실제 변경 이유와 import 방향이다.
- U4부터 U12까지 수정하는 `.tsx`의 React 기본 Hook 구현은 같은 FSD 모듈의 기존 `.ts` Hook을 활용하거나 그 책임을 맡을 `.ts` 모듈로 옮긴다. `.tsx`에는 JSX와 Provider 조립을 남긴다. Hook 위치를 바꾸려고 상태 수명, Context 구독이나 slice의 public API를 바꾸지 않는다.
- IndexedDB는 저장 자료의 기준으로 유지한다. [TanStack Query의 cache 정책](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)과 [mutation 뒤 무효화](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations)를 각 저장 대상에 대조한다. 현재 자료만으로는 추가 cache가 기존 조회, 변경 queue와 저장소 구독보다 단순하다는 근거가 없으므로 미도입을 기본 선택으로 둔다. 특정 대상에서 도입 이점이 확인되면 의존성 조사와 바꿀 파일 및 동작을 먼저 확정하고, 승인 전에는 패키지와 저장 동작을 바꾸지 않는다.
- Server Component와 Client Component 사이에는 직렬화 가능한 값만 전달한다. 브라우저 저장소와 Worker는 client 조립 지점에 남기며, provider 위치를 바꿀 때는 [Next.js 실행 환경 설명](https://nextjs.org/docs/app/getting-started/server-and-client-components)을 기준으로 import graph를 확인한다.
- 이름은 상위 폴더가 이미 알려주는 대상만 생략하고, 같은 모듈에 있는 서로 다른 책임을 구분하는 단어는 남긴다. [FSD의 명명 규칙](https://fsd.how/docs/about/understanding/naming/)에 따른 `ui`, `model`, `api`와 Next.js의 `page.tsx`는 유지한다. `repository`, `writer`, `draftRepository`처럼 조립 지점에서 역할이 다른 속성도 일괄 축약하지 않는다. [FSD의 일반적인 파일명 주의 사항](https://fsd.how/docs/guides/issues/desegmented/)을 고려해 `types.ts`, `utils.ts` 같은 이름으로 바꾸지 않는다.

## 이름 검토에서 확인한 변경 대상

- `shared/ui`의 11개와 `shared/lib`의 6개 모듈은 폴더와 구현 파일의 이름이 같고 `index.ts`가 구현만 다시 내보낸다. U12에서 같은 책임의 파일을 합쳐 이름 반복과 재수출 한 단계를 없앤다. 기존 import 지정자와 내보내는 이름은 유지한다.
- `features/add-note-to-batch-copy/model/add-note-to-batch-copy.ts`, `features/edit-batch-copy/model/edit-batch-copy.ts`, `features/suggest-template/model/suggest-template.ts`는 slice 이름이 파일명에 다시 나온다. U7부터 U9까지 세 파일의 실제 동작을 나타내는 이름으로 바꾼다. 다른 slice에서 쓰는 함수와 타입의 이름은 유지한다.
- Hook 구현을 `.tsx`에서 분리할 때 slice 이름을 새 파일명에 되풀이하지 않는다. U7의 편집 Context는 `use-editor.ts`, U8의 메모 추가 Context는 `use-add-note.ts`, U12의 이동 보호와 체크박스 ID는 각각 `use-guard.ts`, `use-id.ts`에 둔다. 다른 slice에서 import하는 Hook 이름은 유지한다.
- 메모 조회 상태의 `draftContentByNote`는 값이 메모 ID를 키로 하는 본문 문자열인데, 이름에는 키의 종류가 드러나지 않는다. U5에서 내부 상태와 화면 Props 속성을 `draftContentById`로 함께 바꾼다. IndexedDB의 메모 초안 필드, 설정의 `batchCopyShortcutEnabled`와 `batchCopyReorderButtonsEnabled`, Worker의 `lineIndex`처럼 저장 형식이나 메시지에 포함된 키는 이름 정리를 위해 바꾸지 않는다.

## 실행 단위

### U1. 변경 전 동작과 비용을 고정한다

- **대상과 변경:** 운영 코드의 추가, 수정, 제거는 없다. `/`, `/notes/[noteId]`, `/batch-copy`, `/usage`, `/analysis`, `/templates`, `/settings`에서 현재 자료, 오류와 재시도, 화면 이동을 [기존 완료 증거](../personal-notes-app-8fd/requirements.md#완료를-확인할-증거)에 연결한다. `personal-notes`의 현재 schema와 이전 자료 업그레이드, 복구 초안, 메모 순서, 템플릿, 설정, 사용 기록의 시작 상태를 확인한다.
- **설계 기준:** 렌더 횟수는 정적 추측 대신 동일한 자료량과 입력에서 [React 개발자 도구의 Profiler](https://react.dev/learn/react-developer-tools)로 메모 보드, 일괄 복사 목록, 분석 항목, 템플릿 목록과 사용 기록을 비교한다. IndexedDB 조회, 첫 화면, heap, DOM 수와 모바일 스크롤은 기존 요구사항의 대표 자료량을 사용한다.
- **완료 증거:** 각 화면의 시작 입력, 사용자 조작, 저장 완료 시점과 화면 및 저장 자료의 확인 항목이 정해지고, 기존 검사 명령 및 브라우저 비교의 변경 전 값이 남는다. 이 단계는 성능 향상을 주장하지 않는다.

**변경 전 기준:** 기존 요구사항의 일곱 주소와 저장 자료를 시작 입력으로 삼는다. 메모 생성, 편집, 800ms 자동 저장, 이탈 저장, 삭제 취소, 보드 이동과 속성, 모바일 탐색, 저장 및 모바일 일괄 복사, 분석 Worker, 템플릿, 사용 기록과 설정은 각각 화면 조작 뒤 표시와 IndexedDB 저장값을 대조한다. 업그레이드는 기존 IndexedDB 검사에 포함된 이전 schema 자료로 대조한다. `pnpm notes:lint`, `pnpm notes:typecheck`, `pnpm notes:test`의 196개 검사와 `pnpm --filter notes-app test:browser`의 57개 검사는 변경 전 통과했다. `pnpm notes:test:e2e`는 215개 중 209개가 통과했고, 메모의 여덟 방향 크기 조절과 확대 후 이동을 저장하는 검사 두 개가 세 브라우저에서 각각 실패했다. 확대 후 이동 검사는 변경 전 빌드로 단독 재실행해 같은 좌표 불일치를 확인했다.

성능 비교에는 저장 메모 100개와 같은 revision의 복구 초안 10개를 사용했다. Chromium의 1280×900 및 320×720 화면에서 매번 새로운 브라우저 Context를 열고 세 번씩 관찰했다. 중앙값 기준 메모 100개 표시 시점은 데스크톱 79ms, 모바일 48.9ms이고, IndexedDB의 메모 100개 `getAll()`은 각각 0.5ms, 0.4ms였다.

DOM 요소 수는 데스크톱 4878개, 모바일 572개이며, JavaScript heap은 각각 19.3MB, 11.9MB였다. 최초 콘텐츠 표시 시점은 각각 28ms, 24ms이고 초기 화면의 표시만 뜻하므로 메모 목록 완료 시점과 구분한다. 스크롤 요소의 `scrollTop` 변경 뒤 다음 animation frame은 각각 1.3ms, 0.2ms였다. 이 수치는 로컬 브라우저와 위 자료에 한정된다. React Profiler의 컴포넌트별 렌더 횟수와 시간은 production 빌드에서 수집하지 못했으므로 렌더 개선을 주장하는 근거로 사용하지 않는다.

### U2. IndexedDB 조회마다 Query 적용 여부를 판단한다

- **대상과 변경:** [`notes-data-provider.tsx`](../../../apps/notes/src/_pages/notes/model/notes-data-provider.tsx), [`batch-copy-provider.tsx`](../../../apps/notes/src/_app/providers/batch-copy-provider.tsx), [`mobile-batch-copy-provider.tsx`](../../../apps/notes/src/features/add-note-to-batch-copy/model/mobile-batch-copy-provider.tsx), [`template-data-provider.tsx`](../../../apps/notes/src/_pages/templates/model/template-data-provider.tsx), [`interaction-preferences-provider.tsx`](../../../apps/notes/src/_pages/settings/model/interaction-preferences-provider.tsx), [`use-usage-read-state.ts`](../../../apps/notes/src/_pages/usage/model/use-usage-read-state.ts)의 읽기와 변경을 검토한다. 이 단위에서는 운영 코드와 의존성 파일을 수정하지 않는다.
- **설계 기준:** 대상마다 조회 시점, 조회값을 쓰는 위치, 저장 직후 화면 갱신, 실패와 재시도, 변경 순서, 다른 탭의 `blocked` 및 `versionchange`를 적는다. Query를 쓴다면 저장 원본과 cache의 갱신 주체, query key, 무효화 시점과 [기본 재조회 정책](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)을 정해야 한다. [IndexedDB transaction 수명](https://www.w3.org/TR/IndexedDB-3/#transaction-lifecycle)은 Query가 대신 관리하지 않는다.
- **완료 증거:** 메모 및 초안, 저장 일괄 복사 목록, 모바일 초안, 템플릿, 설정, 사용 기록 각각에 적용 또는 미적용 이유와 저장 실패 후 화면 상태가 적혀 있다. 분석 Worker의 실행 상태는 별도로 분류한다. 패키지 도입이 필요한 판단이면 U3 이후의 영향을 다시 계산하고 의존성 변경 전에 멈춘다.

**적용 판단:** 현재 여섯 조회에는 TanStack Query를 도입하지 않는다. 각 자료는 IndexedDB를 원본으로 삼고 자료마다 Provider 또는 페이지 Hook이 조회값과 변경 순서를 관리한다. Query를 추가하면 같은 저장 자료의 cache 갱신, 무효화 및 재조회 정책까지 별도로 관리해야 하며, 현재 사용처에서는 그 비용을 상쇄할 중복 조회가 확인되지 않았다.

- 메모와 복구 초안은 앱 진입 시 함께 읽고 메모 변경을 직렬 queue로 저장한다. 저장소의 `blocked`, `versionchange`도 구독한다. Query 재조회가 진행 중인 본문 입력, 초안 revision 판정 및 저장 순서와 충돌하지 않도록 추가 조정이 필요하다. 저장 실패 시 현재 입력과 복구 초안을 유지하고 오류를 알린다.
- 저장 일괄 복사 목록은 앱 진입 시 읽고 변경 queue와 실행 취소 기록을 함께 관리한다. 다시 읽은 목록으로 편집 및 실행 취소 기록을 교체할 수 없으므로 별도 cache의 이점이 없다. 실패 시 직전 목록을 유지하고 재시도한다.
- 모바일 일괄 복사 초안은 앱 진입 시 복원하고 수집, 확인, 표시 여부와 변경 queue를 관리한다. 초안 재조회가 `collectionVisible`과 작업 단계를 다시 설정할 수 있다. 실패 시 화면의 초안과 재시도 동작을 유지한다.
- 템플릿은 Provider 진입 시 조회하고 생성 뒤 조회 상태를 갱신한다. 현재 한 Provider가 저장값을 사용하므로 무효화 뒤 재조회보다 현행 갱신이 단순하다. 저장 실패 시 목록에 추가하지 않고 오류를 표시한다.
- 설정은 Provider 진입 시 조회하고 저장 실패 시 이전 값을 복원한다. 두 설정을 한 Provider가 관리하며 별도 cache가 필요하지 않다. 실패 시 이전 값을 다시 표시한다.
- 사용 기록은 화면 진입 시 조회하고 복사 작업은 별도 화면에서 기록한다. 재방문 시 다시 읽는다. 화면 밖에서 유지할 조회 cache가 없다. 조회 실패 시 오류와 재시도를 표시하고 기존 저장 기록을 변경하지 않는다.

분석 Worker가 반환한 값은 IndexedDB에 저장하지 않는 요청별 상태이므로 Query 검토 대상에서 제외한다. 어떤 저장 대상에서 여러 화면의 동시 구독이나 반복 조회 비용이 실제로 확인되면 그 대상의 query key, 저장 후 cache 갱신, 재조회 시점과 오류 정책을 다시 결정한다.

### U3. 사용하지 않는 FSD 코드를 먼저 정리한다

- **제거 대상:** 사용처가 없는 `src/_app/ui/application-frame.tsx`, 그 아래 `ui/navigation/`의 세 파일과 `src/_pages/batch-copy/ui/batch-copy-item-actions.tsx`를 제거한다. 활성 [`widgets/application-navigation`](../../../apps/notes/src/widgets/application-navigation/index.ts)과 [`createBatchCopyItemActions`](../../../apps/notes/src/features/edit-batch-copy/model/batch-copy-item-actions.ts)는 유지한다.
- **수정과 추가:** 제거가 확인되면 그 구현을 내보내는 재수출만 정리한다. 새 탐색 helper, 공통 manager, 빈 slice와 대체 UI는 추가하지 않는다. 활성 FSD slice가 다른 slice의 내부 파일에 기대는지 [`eslint.config.mjs`](../../../apps/notes/eslint.config.mjs)로 확인하고 위반이 확인된 import만 public API에 맞춘다.
- **설계 기준과 완료 증거:** FSD의 [public API 규칙](https://fsd.how/docs/reference/public-api/)을 적용한다. lint와 route 탐색에서 기존 주소, 현재 위치 표시, 모바일 탐색 및 일괄 복사 항목 동작이 같아야 한다. 사용처가 발견되면 삭제하지 않고 참조 관계를 먼저 해결한다.


### U4. 조립 지점과 메모 작업의 시계를 정리한다

- **수정:** [`create-local-application.ts`](../../../apps/notes/src/_app/composition/create-local-application.ts)와 [`personal-notes-provider.tsx`](../../../apps/notes/src/_app/providers/personal-notes-provider.tsx)의 기존 조립 방식으로 메모 삭제 및 알림 만료에 필요한 시계를 제공한다. [`note-session-provider.tsx`](../../../apps/notes/src/_pages/notes/model/note-session-provider.tsx)의 삭제 기록 및 알림 명령이 주입된 시각을 사용하게 하고 [`notes-collection.tsx`](../../../apps/notes/src/_pages/notes/ui/notes-collection.tsx)의 직접 시각 읽기를 없앤다. 외부 구현을 일반 UI 컴포넌트에 전달하는 Props는 추가하지 않는다.
- **유지와 제거:** `PersonalNotesProvider`의 앱 수명과 `dispose()`, 각 repository 및 Worker 연결을 유지한다. 시계를 바꾸는 두 지점의 직접 `new Date()` 및 `Date.now()` 호출만 제거한다. 범용 의존성 Context 또는 런타임 container는 추가하지 않는다.
- **설계 기준과 완료 증거:** 기존 [명시적 조립](references/architecture-baseline.md#저장소에서-확인한-구조)을 재사용한다. 삭제 취소의 원래 만료 시각, 알림의 5초 만료와 화면 이동 뒤 동작이 변경 전과 같고, `app/layout.tsx`에서 서버 및 클라이언트 모듈이 분리된 상태를 유지해야 한다.


### U5. 메모 저장과 편집 상태를 다듬는다

- **수정:** [`notes-data-provider.tsx`](../../../apps/notes/src/_pages/notes/model/notes-data-provider.tsx)의 조회, 초안과 변경 명령을 같은 model의 `.ts` Hook으로 옮기고 기존 Context의 수명과 저장 순서를 유지한다. [`note-properties-form-provider.tsx`](../../../apps/notes/src/_pages/notes/model/note-properties-form-provider.tsx)의 폼 Hook도 같은 메모 model의 `.ts` 모듈로 옮긴다. [`use-note-content-autosave.ts`](../../../apps/notes/src/_pages/notes/model/use-note-content-autosave.ts), [`use-note-detail-editing.ts`](../../../apps/notes/src/_pages/notes/model/use-note-detail-editing.ts), [`use-note-properties-sync.ts`](../../../apps/notes/src/_pages/notes/model/use-note-properties-sync.ts)의 ref와 Effect는 최신 입력 보존, 이탈 저장, dirty 값 보호에 필요한 역할별로 남긴다. 속성 동기화 Hook은 form과 session에 직접 접근하고 [`notes-collection.tsx`](../../../apps/notes/src/_pages/notes/ui/notes-collection.tsx)의 form 메서드 전달을 없앤다.
- **이름 정리:** `notes-data-provider.tsx`의 내부 조회 상태 속성 `draftContentByNote`를 `draftContentById`로 바꾼다. 이 값은 메모 ID로 조회한 복구 본문이며 IndexedDB record의 필드는 아니다. 같은 단위에서 `notes-start-page.tsx`, `notes-collection.tsx`, `notes-board.tsx`, `note-detail-page.tsx`의 Props와 참조 및 기존 검사 코드의 참조까지 함께 바꾼다.
- **유지와 제거:** 저장 queue, IndexedDB 구독, 초안 revision 판정과 `blocked` 및 `version-changed` 상태를 유지한다. 단순 파생값의 중복 state 또는 역할이 사라진 ref 동기화 Effect만 제거하며, `pagehide`와 `visibilitychange` listener를 호출 수를 줄이기 위해 지우지 않는다. React는 [외부 시스템 동기화와 렌더 중 파생 계산](https://react.dev/learn/you-might-not-need-an-effect)을 구분한다.
- **완료 증거:** 저장 중 추가 입력, 800ms 자동 저장, 이탈 저장, 실패 후 재시도, 초안 복구와 속성 패널의 수정 중 입력 보존을 같은 메모 자료로 확인한다. Context를 구독하는 컴포넌트를 바꾸지 않았으므로 렌더 개선을 추정하지 않고 U1의 브라우저 비용과 비교한다.


### U6. 메모 화면의 Props와 UI 책임을 줄인다

- **수정:** [`notes-start-page.tsx`](../../../apps/notes/src/_pages/notes/ui/notes-start-page.tsx)와 [`notes-collection.tsx`](../../../apps/notes/src/_pages/notes/ui/notes-collection.tsx) 사이의 단순 전달 명령은 Collection이 기존 feature 상태 접근자를 직접 사용할 수 있는지 검토해 줄인다. [`notes-board.tsx`](../../../apps/notes/src/_pages/notes/ui/notes-board.tsx), [`note-card.tsx`](../../../apps/notes/src/_pages/notes/ui/note-card.tsx), [`mobile-notes-workspace.tsx`](../../../apps/notes/src/_pages/notes/ui/mobile-notes-workspace.tsx), [`mobile-note-list.tsx`](../../../apps/notes/src/_pages/notes/ui/mobile-note-list.tsx), [`mobile-note-card.tsx`](../../../apps/notes/src/_pages/notes/ui/mobile-note-card.tsx)는 보드와 목록에서 쓰지 않고 통과시키는 값만 검토한다. [`note-properties-panel.tsx`](../../../apps/notes/src/_pages/notes/ui/note-properties-panel.tsx)과 [`batch-copy-workspace.tsx`](../../../apps/notes/src/_pages/notes/ui/batch-copy-workspace.tsx)의 브라우저 연결 Hook은 같은 페이지 model의 `.ts` 모듈에서 관리한다.
- **유지와 제거:** 메모, 복구 본문, 선택 상태, 배율, 행별 동작과 `children`처럼 인스턴스를 정의하는 입력은 Props로 유지한다. 중간 단계가 실제로 사라질 때 그 Props 선언과 전달만 제거한다. 한 단계 전달을 감추려는 Context 또는 JSX slot은 추가하지 않는다. [React의 Props와 Context 설명](https://react.dev/learn/passing-data-deeply-with-context)을 판단 기준으로 사용한다.
- **완료 증거:** 데스크톱 보드의 선택, 드래그, 속성, 복사와 모바일 목록의 탐색, 길게 누르기 및 일괄 복사 추가가 같은 화면 및 저장 동작을 낸다. U1의 카드와 목록 렌더 비용을 악화시키지 않는다.


### U7. 저장 일괄 복사 목록을 정리한다

- **수정:** [`batch-copy-provider.tsx`](../../../apps/notes/src/_app/providers/batch-copy-provider.tsx)의 저장 목록과 변경 queue, [`batch-copy-editing-view.tsx`](../../../apps/notes/src/features/edit-batch-copy/ui/batch-copy-editing-view.tsx)의 낙관적 편집과 실패 재시도, [`batch-copy-list.tsx`](../../../apps/notes/src/features/edit-batch-copy/ui/batch-copy-list.tsx)의 행 입력을 각각 실제 사용하는 값에 맞춘다. [`edit-batch-copy-provider.tsx`](../../../apps/notes/src/features/edit-batch-copy/model/edit-batch-copy-provider.tsx)의 기본 Hook 구현은 기존 편집 model의 `.ts` Hook과 책임을 대조해 옮긴다. 포인터 순서 계산이 다른 화면과 같을 때만 기존 [`reorder-pointer-session.ts`](../../../apps/notes/src/features/edit-batch-copy/model/reorder-pointer-session.ts)를 재사용한다.
- **이름 정리:** `features/edit-batch-copy/model/edit-batch-copy.ts`와 짝인 검사 파일을 `save-changes.ts`, `save-changes.test.ts`로 바꾼다. 복제, 삭제, 순서 변경과 실행 취소의 저장을 맡는 모듈임을 파일명으로 드러내고, public API의 함수와 타입 이름은 유지한다.
- **유지와 제거:** 이미 공유하는 `createBatchCopyItemActions`를 재사용한다. 실행 취소 기록, 저장 순서와 행별 pointer callback은 유지하고, 목록이나 행에서 쓰지 않는 전달만 제거한다. Props 개수만 줄이려는 큰 객체나 새 범용 목록을 추가하지 않는다.
- **U13에서 확인할 동작:** 복제, 삭제, 순서 변경, 실행 취소와 다시 실행, 실패 재시도 뒤 화면과 IndexedDB의 항목 순서가 기존 동작을 유지한다.


### U8. 모바일 일괄 복사 초안을 정리한다

- **수정:** [`mobile-batch-copy-provider.tsx`](../../../apps/notes/src/features/add-note-to-batch-copy/model/mobile-batch-copy-provider.tsx), [`mobile-batch-copy-confirmation-list.tsx`](../../../apps/notes/src/_pages/batch-copy/ui/mobile-batch-copy-confirmation-list.tsx), [`use-mobile-batch-copy-pointer-reorder.ts`](../../../apps/notes/src/_pages/batch-copy/model/use-mobile-batch-copy-pointer-reorder.ts)에서 초안 변경과 화면 제스처의 책임을 분리한다. [`add-note-to-batch-copy-provider.tsx`](../../../apps/notes/src/features/add-note-to-batch-copy/model/add-note-to-batch-copy-provider.tsx)의 기본 Hook 구현도 같은 feature의 `.ts` 모듈로 옮긴다. U7과 동일한 순수 순서 계산이 확인될 때만 기존 entity 명령으로 합친다.
- **이름 정리:** `features/add-note-to-batch-copy/model/add-note-to-batch-copy.ts`와 짝인 검사 파일을 `add-note.ts`, `add-note.test.ts`로 바꾼다. slice 이름이 이미 대상 목록을 알려주므로 파일명에는 수행하는 동작만 남긴다. public API의 함수와 타입 이름은 유지한다.
- **유지와 제거:** 모바일 초안의 `collecting` 및 `confirming`, `collectionVisible`, 저장 실패와 변경 queue를 저장 목록 상태에 합치지 않는다. 실제로 중복된 계산만 제거하고 포인터 이벤트와 오류 표현은 모바일 화면에 남긴다.
- **U13에서 확인할 동작:** 수집, 확인, 수집으로 복귀, 삭제, 복제, 순서 변경, 재진입과 [`use-batch-copy-page.ts`](../../../apps/notes/src/_pages/batch-copy/model/use-batch-copy-page.ts)의 주소 보정이 유지되고, 초안의 화면 순서와 IndexedDB 순서가 일치한다.


### U9. 분석 실행과 템플릿 제안을 정리한다

- **수정:** [`analysis-start-page.tsx`](../../../apps/notes/src/_pages/analysis/ui/analysis-start-page.tsx)와 [`analysis-results.tsx`](../../../apps/notes/src/_pages/analysis/ui/analysis-results.tsx) 사이의 템플릿 제안 callback은 사용자 작업을 전달하므로 유지한다. [`text-analysis-provider.tsx`](../../../apps/notes/src/_pages/analysis/model/text-analysis-provider.tsx)의 화면 진입 검증과 Worker 호출은 같은 model의 `.ts` Hook으로 옮기고 실행 순서를 유지한다.
- **이름 정리:** `features/suggest-template/model/suggest-template.ts`와 짝인 검사 파일을 `suggestion.ts`, `suggestion.test.ts`로 바꾼다. 제안 계산이 이 파일의 책임이며 slice 이름에 대상이 있다. `suggestTemplate` 함수와 `TemplateSuggestion` 타입은 다른 slice가 사용하는 이름 그대로 둔다.
- **유지와 제거:** Worker 응답의 revision 판정, 실행 중인 요청 순서와 오래된 분석 숨김을 유지한다. 분석 실행 상태를 IndexedDB cache나 템플릿 저장 상태와 합치지 않는다.
- **U13에서 확인할 동작:** 분석 중 메모 변경, 실패 후 재실행, 원본 메모 이동과 선택한 두 문장의 템플릿 제안이 같고, 운영 Worker가 실제로 메시지를 주고받는다.


### U10. 템플릿의 자료와 폼 수명을 정리한다

- **수정:** [`template-data-provider.tsx`](../../../apps/notes/src/_pages/templates/model/template-data-provider.tsx)의 조회 및 저장 상태와 [`selected-source-lines-provider.tsx`](../../../apps/notes/src/features/suggest-template/model/selected-source-lines-provider.tsx)의 Hook 구현을 각 model의 `.ts` 모듈로 옮긴다. [`use-template-workspace.ts`](../../../apps/notes/src/_pages/templates/model/use-template-workspace.ts)의 선택 상태와 폼 수명은 유지한다. [`template-editor.tsx`](../../../apps/notes/src/_pages/templates/ui/template-editor.tsx)의 필드 구독은 기존 [`use-template-editor.ts`](../../../apps/notes/src/_pages/templates/model/use-template-editor.ts)로 옮기며, [`template-input-form.tsx`](../../../apps/notes/src/_pages/templates/ui/template-input-form.tsx)의 값 전달은 유지한다. Provider 조립 위치는 바꾸지 않는다.
- **유지와 제거:** 한두 단계의 `register`, `control`, 오류 전달은 유지하고, 깊은 동일 폼 하위 트리가 실제로 생길 때만 [React Hook Form 지침](../../dev/personal-notes-app/react-hook-form.md#폼-수명)의 `FormProvider`를 검토한다. 중복 저장한 입력 상태가 확인될 때만 그 복제와 동기화를 제거한다.
- **U13에서 확인할 동작:** 분석에서 전달한 문장으로 작성, 수동 작성, 저장, 선택, 치환, 복사와 화면 재방문 뒤 저장 자료 및 선택 상태가 유지된다.


### U11. 사용 기록 조회를 정리한다

- **수정:** [`use-usage-read-state.ts`](../../../apps/notes/src/_pages/usage/model/use-usage-read-state.ts)와 [`usage-reader-provider.tsx`](../../../apps/notes/src/_pages/usage/model/usage-reader-provider.tsx)의 조회 시점과 reader 제공을 U2의 판단에 맞춘다. 다른 화면에 복제한 조회 상태가 확인되면 그 복제만 제거한다.
- **유지와 제거:** [`usage-start-page.tsx`](../../../apps/notes/src/_pages/usage/ui/usage-start-page.tsx)와 [`usage-table.tsx`](../../../apps/notes/src/_pages/usage/ui/usage-table.tsx)의 화면 및 행을 정의하는 Props는 유지한다. 사용 기록을 메모 목록 cache에 합치지 않는다.
- **U13에서 확인할 동작:** 개별 복사 및 일괄 복사 뒤 사용 횟수, 오류 안내와 재시도, 새로고침 뒤 기록이 유지된다.


### U12. 설정과 공통 UI를 정리한다

- **수정:** [`interaction-preferences-provider.tsx`](../../../apps/notes/src/_pages/settings/model/interaction-preferences-provider.tsx)의 저장 실패 복원과 [`settings-start-page.tsx`](../../../apps/notes/src/_pages/settings/ui/settings-start-page.tsx)의 폼 입력 Hook을 각각 같은 model의 `.ts` 모듈로 옮긴다. [`shared/ui`](../../../apps/notes/src/shared/ui/)와 활성 [`application-navigation`](../../../apps/notes/src/widgets/application-navigation/index.ts)은 서로 같은 동작이 중복된 곳만 수정한다. 앞 단위의 대상이 아닌 [`runtime-access-guard.tsx`](../../../apps/notes/src/_app/ui/runtime-access-guard.tsx), [`navigation-guard-provider.tsx`](../../../apps/notes/src/features/navigation-guard/model/navigation-guard-provider.tsx), [`checkbox`](../../../apps/notes/src/shared/ui/checkbox/index.tsx)의 기본 Hook 구현도 같은 책임의 `.ts` 모듈로 옮긴다.
- **이름 정리:** `shared/ui`의 `action-popover`, `action-sheet`, `action-toast`, `button`, `checkbox`, `icon-button`, `icons`, `page-heading`, `status-notice`, `text-field`, `textarea`에서 같은 이름의 `.tsx` 구현과 단순 재수출 `index.ts`를 하나의 `index.tsx`로 합친다. 별도 Hook `.ts`는 남긴다. `shared/lib`의 `algorithm-reference`, `entity-metadata`, `grapheme`, `indexed-db`, `note-model-exploration`, `note-model-settings`에서는 같은 방식으로 구현과 `index.ts`를 하나의 `index.ts`로 합친다. 기존 public API의 export 목록과 필요한 `"use client"` 선언을 보존한다.
- **유지와 제거:** 바로 하위 폼이 사용하는 설정 Props는 유지한다. 폼 값은 [현재 React Hook Form 지침](../../dev/personal-notes-app/react-hook-form.md#상태-책임)에 남기고 저장값의 불필요한 복제만 제거한다. 단순한 구문 반복을 이유로 공통 provider나 UI wrapper를 추가하지 않는다.
- **U13에서 확인할 동작:** 두 설정의 저장 및 실패 시 이전 값 복원, 모든 route의 탐색, 현재 위치 표시와 접근성 이름이 유지된다.


### U13. 기존 리팩토링 범위의 보존 조건을 검증한다

- **대상과 변경:** 새 사용자 동작이나 독립적인 추상화는 추가하지 않는다. 각 단위에서 변경한 코드의 FSD import와 순환 관계, client bundle로 유입되는 모듈, IndexedDB schema 및 저장 자료 형식을 함께 확인한다. 이름을 바꾼 파일의 import, public API, 내부 객체 속성 참조가 모두 갱신됐는지 확인하고, 저장 record와 Worker 메시지의 키는 변경 전과 비교한다.
- **완료 증거:** [리팩토링 요구사항의 완료 증거](requirements.md#완료를-확인할-증거)에 따라 기존 lint, typecheck, unit, browser, E2E 통과 여부와 실제 브라우저의 일곱 route, 넓은 화면 및 320 CSS px 화면을 확인한다. 이전 schema 자료를 읽은 뒤 메모 원문과 순서, 초안, 일괄 복사, 템플릿, 설정 및 사용 기록을 대조한다. U1과 같은 입력으로 브라우저 표시 시간, DOM 수, heap, IndexedDB 조회와 스크롤 시간을 비교한다. React Profiler의 렌더 횟수를 수집하지 못하면 개선을 주장하지 않고 한계로 남긴다. 값이 나빠졌다면 원인을 찾은 뒤 완료를 판정한다.

## 메모 조작과 Hook 책임을 위한 후속 단위

U1과 U13에서 관찰한 메모 조작 E2E 실패는 U14에서 입력 대상이 겹치는 배치 문제로 확인했다. 재시도 시간만 늘려 해결됐다고 판정하지 않는다. 다음 단위는 순서대로 진행한다. 각 단위에서 바꾼 코드와 확인한 불일치를 이 계획에 기록한 뒤 U20에서 변경 전체를 검토한다.

### U14. 메모 조작 실패의 첫 불일치 지점을 찾는다

- **대상과 변경:** 운영 코드, 저장 schema와 검사는 수정하지 않는다. 기존 [`notes-geometry-model.spec.ts`](../../../apps/notes/e2e/notes-geometry-model.spec.ts)의 두 실패를 같은 viewport와 배율 조건에서 재현하고, 입력 좌표와 실제 포인터 전달, 화면 미리보기, 저장 요청, transaction 완료 뒤 record 및 재방문 좌표를 순서대로 관찰한다.
- **설계 기준:** [Pointer Events의 캡처 규칙](https://www.w3.org/TR/pointerevents/#the-pointercapture-interface), [viewport 좌표 설명](https://developer.mozilla.org/en-US/docs/Web/API/CSSOM_view_API/Coordinate_systems#viewport), [IndexedDB commit 완료](https://www.w3.org/TR/IndexedDB/#transaction-committing)를 입력, 계산과 저장의 서로 다른 시점에 적용한다. 실패한 검사에는 포인터 종료 직후의 단발 읽기가 있으므로 저장 완료 전과 후를 나눠 판단한다.
- **완료 증거:** 두 실패 각각에 대해 첫 불일치의 위치, 기대값, 관찰값과 재현 조건을 기록한다. 완료 뒤 좌표가 맞으면 검사 시점 경합으로 분류한다. 완료 뒤에도 다르면 실제 사용자 동작 결함으로 분류하고 원인에 맞는 U15 수정 절차를 선택한다. 원인을 구분할 수 없으면 U15를 시작하지 않는다. 독립적인 U16부터 U19까지는 진행할 수 있지만 U20의 완료 판정은 보류한다.

**실행 기록:** 1280×900 화면에서 새 메모를 만들면 저장 좌표는 `(32, 32)`이고 왼쪽 위 크기 조절 지점과 이동 핸들 위에 `새 메모` 버튼이 그려진다. 기본 배율의 왼쪽 위 조절과 110% 확대한 뒤 이동 입력 모두 `pointerdown`, `pointermove`, `pointerup`이 메모가 아닌 버튼에 전달됐다. 미리보기, 입력 직후와 4초 뒤의 IndexedDB record, 재방문 좌표가 모두 원래 값이었다. 같은 메모의 X를 속성 패널에서 160으로 바꿔 가림을 없앤 뒤에는 두 동작 모두 미리보기와 저장 record 및 재방문 좌표가 일치했고 본문 revision도 유지됐다. 따라서 첫 불일치는 포인터 입력 대상이며 저장 완료 시점 경합은 이번 실패의 원인이 아니다. 운영 코드와 검사는 이 단위에서 바꾸지 않았다.

### U15. 확인된 원인에 맞춰 메모 조작을 바로잡는다

- **입력 대상이 제어와 겹치는 경우:** [`note-geometry.ts`](../../../apps/notes/src/entities/note/model/note-geometry.ts)의 새 메모 배치가 `새 메모` 버튼의 조작 영역과 겹치지 않도록 첫 열의 시작 좌표를 조정한다. 기존 메모의 저장 좌표를 바꾸거나 버튼, 카드와 조작 핸들의 표시 구조를 바꾸지 않는다. 기존 두 브라우저 검사의 이동과 여덟 방향 조절 기대 행동은 유지한다. 이미 버튼 아래에 저장된 메모는 속성 패널에서 X를 바꿔 옮길 수 있는지 확인한다.
- **검사 시점만 다른 경우:** 운영 코드는 추가, 수정 또는 제거하지 않는다. [`notes-geometry-model.spec.ts`](../../../apps/notes/e2e/notes-geometry-model.spec.ts)의 `GeometryReal.inspect`가 기대한 저장 record를 transaction 완료 후까지 재조회하도록 수정하고, 원문, 본문 revision 및 좌표 비교를 모두 유지한다. 새 임의 지연이나 성공 조건 완화는 넣지 않는다. 재방문해 같은 record를 읽는 관찰도 유지하거나 추가한다.
- **포인터 캡처 또는 계산이 다른 경우:** [`use-note-geometry-gesture.ts`](../../../apps/notes/src/_pages/notes/model/use-note-geometry-gesture.ts)의 첫 불일치 계산 또는 종료 처리를 수정하고, 이벤트 연결이 원인이면 [`note-card.tsx`](../../../apps/notes/src/_pages/notes/ui/note-card.tsx)에서 원인이 된 이벤트 처리기만 수정한다. 현재 한 포인터 제스처의 캡처, 화면 미리보기와 저장은 같은 Hook에 둔다. 이동과 여덟 방향 크기 조절, 중단과 확대 배율 처리를 함께 유지한다.
- **저장 순서가 다른 경우:** [`use-notes-data-model.ts`](../../../apps/notes/src/_pages/notes/model/use-notes-data-model.ts)의 기존 순차 변경 queue와 [`indexed-db-note-repository.ts`](../../../apps/notes/src/entities/note/api/indexed-db-note-repository.ts)의 transaction 완료 시점을 추적해 처음 어긋나는 구현만 수정한다. 원문, 본문 revision, 메모 revision, 저장 실패 안내와 복구 초안의 의미는 바꾸지 않는다.
- **완료 증거:** U14에서 고른 원인의 재현 입력으로 화면 좌표, 저장 완료 후 IndexedDB record 및 재방문 좌표가 일치한다. 기존 두 검사의 기대 행동을 삭제하거나 약화하지 않는다. 실패가 검사 시점에만 있었다면 실제 메모 조작 결함을 고쳤다고 주장하지 않는다.

**실행 기록:** 새 메모 첫 열의 X 시작값을 32에서 112로 옮겨 왼쪽 위의 `새 메모` 버튼과 이동 및 크기 조절 입력이 처음부터 겹치지 않게 했다. Y 좌표, 크기, 열 간격, 기존 저장 record, 버튼 및 카드 구성은 유지한다. 포인터 계산, 저장 queue와 IndexedDB 구현은 U14에서 정상으로 확인돼 바꾸지 않았다. 두 브라우저 검사의 기존 기대 동작과 저장 및 재방문 확인은 U20에서 함께 실행한다.

### U16. 메모 세션에서 서로 다른 수명의 상태를 분리한다

- **수정:** [`use-note-session-state.ts`](../../../apps/notes/src/_pages/notes/model/use-note-session-state.ts)의 선택 및 패널 대상 처리를 `use-note-workspace.ts`, 삭제 실행 취소 이력을 `use-note-removal-history.ts`, 만료되는 작업 알림을 `use-workspace-notice.ts`로 옮긴다. `use-note-session-state.ts`에는 Context 접근과 세 Hook의 반환값 조립만 남긴다. [`note-session-provider.tsx`](../../../apps/notes/src/_pages/notes/model/note-session-provider.tsx)의 Provider 위치, 두 Context와 `now` 주입은 유지하고 불필요한 중간 상태 또는 Provider는 추가하지 않는다.
- **설계 기준:** 상태와 명령을 분리한 기존 Context 구조를 재사용한다. 삭제 이력, 선택과 알림은 서로 다른 시점에 갱신되므로 각 상태를 관리하는 Hook이 자기 명령만 만든다. [React의 Custom Hook 지침](https://react.dev/learn/reusing-logic-with-custom-hooks#keep-your-custom-hooks-focused-on-concrete-high-level-use-cases)에 따라 기존 위치에서 각각 한 번만 호출하고 동일 상태를 새 Context에 복제하지 않는다.
- **완료 증거:** 선택과 속성 대상, 삭제 취소의 LIFO 및 5초 알림, 알림 교체와 취소 callback, 화면 이동 뒤 세션 수명이 기존과 일치한다. 다른 slice에서 쓰는 접근자 이름과 Context 구독 범위를 유지한다.

**실행 기록:** 선택과 패널 대상, 삭제 이력, 만료되는 알림을 각각 `use-note-workspace.ts`, `use-note-removal-history.ts`, `use-workspace-notice.ts`로 옮겼다. 기존 Hook에는 Context 접근과 반환값 조립만 남겼고 두 Context, Provider 위치, `now` 입력, 접근자 이름과 상태 객체의 수명은 유지했다. 별도 Provider나 복제 state는 만들지 않았다. 연결된 사용자 동작과 5초 알림은 U20에서 함께 확인한다.

### U17. 메모 목록의 URL, 키 입력과 생성 처리를 분리한다

- **수정:** 기존 `use-notes-collection-interactions.ts`의 hash 해석과 포커스를 `use-linked-note.ts`, Command 및 Escape 키 처리를 `use-note-selection-keys.ts`, 생성 진행과 실패 알림을 `use-create-note.ts`로 옮긴 뒤 원래 파일을 제거한다. [`notes-collection.tsx`](../../../apps/notes/src/_pages/notes/ui/notes-collection.tsx)는 세 Hook을 최상위에서 호출하고 메모 생성 및 삭제 복원에 쓰는 `focusNote`를 `use-linked-note.ts`에서 가져온다.
- **설계 기준:** 각 Hook은 자신이 등록하는 브라우저 listener와 해제를 함께 관리한다. hash 포커스, 키 선택과 새 메모 생성은 서로 다른 사용자 입력에서 시작하므로 상태를 공유하지 않는다. 메모 생성 중 표시 상태를 URL 또는 키 상태에 합치지 않는다.
- **완료 증거:** hash 진입과 hash 변경 때 대상 선택 및 포커스, Command 키와 Escape의 선택 처리, 새 메모의 생성 중 표시와 실패 안내, 생성 및 삭제 복원 후 포커스가 유지된다. 화면 이동과 재방문에서 중복 listener가 남지 않는다.

**실행 기록:** URL hash 해석과 포커스, 전역 Command 및 Escape 입력, 새 메모 생성과 실패 안내를 서로 다른 세 Hook으로 옮기고 이전 복합 Hook을 제거했다. `notes-collection.tsx`는 세 Hook을 정적으로 호출하며 삭제와 복원 때의 `focusNote`는 URL 포커스 Hook과 같은 모듈에서 가져온다. listener의 해제와 생성 뒤 화면별 포커스 동작은 원래 구현을 유지했다. URL, 키 입력과 새 메모 생성을 U20에서 확인한다.

### U18. 메모 상세 편집에서 복구 초안과 이탈 확인을 분리한다

- **수정:** [`use-note-detail-editing.ts`](../../../apps/notes/src/_pages/notes/model/use-note-detail-editing.ts)의 800ms 초안 저장 및 `pagehide`와 `visibilitychange` 연결을 `use-note-detail-draft.ts`로, 화면 이동 보호와 변경사항 확인 dialog 상태를 `use-note-detail-navigation.ts`로 옮긴다. 기존 파일은 하나의 `useForm`으로 관리하는 입력과 명시적 저장을 조립한다. [`note-detail-page.tsx`](../../../apps/notes/src/_pages/notes/ui/note-detail-page.tsx)의 JSX, 표시 문구와 Props는 유지한다.
- **설계 기준:** 하위 Hook은 같은 form의 `getValues`를 받아 읽고 원문 사본을 만들지 않는다. [React의 Effect 수명 규칙](https://react.dev/reference/react/useEffect#usage)에 맞춰 외부 listener의 등록과 해제를 한 책임 안에 둔다. Effect Event를 다른 Hook에 전달하지 않는다.
- **완료 증거:** 초안 자동 저장과 이탈 저장, 명시적 저장과 저장 실패 재시도, 변경사항을 버리거나 계속 편집하는 동작 및 초안 삭제 실패 안내가 동일하게 동작한다. 기존 편집값을 늦게 온 저장 응답으로 덮지 않는다.

**실행 기록:** 800ms 초안 저장과 숨김 및 이탈 시 저장을 `use-note-detail-draft.ts`로, 화면 이동 보호와 확인 dialog를 `use-note-detail-navigation.ts`로 옮겼다. 입력과 명시적 저장은 기존 Hook의 `useForm`에 남겼으며 두 하위 Hook은 현재 form 값을 읽는 함수와 동일한 최신 메모 참조를 사용한다. 초안 폐기 과정의 타이머 취소와 실패 복원은 초안 Hook이 맡고, 실패 유형은 공통 타입 모듈에 두어 Hook 사이의 순환 import를 피했다. JSX와 화면 Props는 바꾸지 않았으며 동작 검사는 U20에서 진행한다.

### U19. 일괄 복사 작업 영역의 패널과 복사 후속 처리를 분리한다

- **수정:** [`use-batch-copy-workspace.ts`](../../../apps/notes/src/_pages/notes/model/use-batch-copy-workspace.ts)의 폭 관찰, inline 및 dialog 전환과 포커스 복원을 `use-batch-copy-panel.ts`로 옮긴다. 전체 복사 뒤 알림과 재시도는 `use-batch-copy-feedback.ts`로 옮긴다. 기존 파일은 Context 접근과 두 Hook의 조립만 남기며 [`batch-copy-workspace.tsx`](../../../apps/notes/src/_pages/notes/ui/batch-copy-workspace.tsx)의 표시 구조와 기존 `BatchCopyWorkspaceContext`는 유지한다.
- **설계 기준:** ResizeObserver와 dialog의 열기 및 닫기 처리는 패널 수명에, Clipboard 성공 및 실패 알림은 복사 동작에 각각 연결한다. 범용 layout Hook이나 복사 service를 새로 만들지 않는다.
- **완료 증거:** 48rem 및 72rem 경계의 패널 표시, 전환 중 포커스, Escape와 취소, 전체 복사 성공 및 실패 알림과 재시도가 이전과 같다. 알림이 캔버스 이동에 따라 움직이지 않는다.

**실행 기록:** 폭 관찰과 inline 및 dialog 전환, 포커스 복원, Escape와 취소 처리를 `use-batch-copy-panel.ts`로 옮겼다. 전체 복사의 성공 알림과 실패 재시도는 `use-batch-copy-feedback.ts`로 옮겼다. 기존 Hook은 편집기 및 세션 Context를 읽어 두 Hook을 조립하고, 기존 화면 파일과 `BatchCopyWorkspaceContext`를 유지한다. 별도 범용 layout 또는 복사 service는 만들지 않았으며 표시와 복사 동작은 U20에서 확인한다.

### U20. 후속 변경의 사용자 동작과 의존 방향을 확인한다

- **대상과 변경:** 새 화면, 저장 schema, 공통 상태 저장소 또는 의존성은 추가하지 않는다. U15에서 실제로 수정한 파일과 U16부터 U19까지의 새 Hook 및 제거 파일에 대해 FSD import, 순환 관계, React Hook 호출 규칙과 Context 수명을 확인한다.
- **완료 증거:** [리팩토링 요구사항의 완료 증거](requirements.md#완료를-확인할-증거)에 따라 lint, typecheck, unit, browser 및 E2E의 통과 여부를 한 번에 확인한다. 특히 기본 배율과 확대 뒤의 메모 이동 및 여덟 방향 조절을 저장 완료와 재방문 뒤 대조한다. 메모 원문 및 revision, 복구 초안, 삭제 취소, 일괄 복사, 상세 편집과 포커스 이동을 확인하고 U1과 같은 자료량에서 화면 응답과 메모리 비용이 나빠지지 않았는지 비교한다. 실패가 남으면 완료로 기록하지 않는다.

**실행 기록:** `notes:typecheck`, `notes:lint`, 단위 검사 196개, 브라우저 구성요소 검사 57개와 운영 빌드는 통과했다. E2E는 215개 중 214개가 통과했다. U1에서 실패한 여덟 방향 크기 조절과 확대 뒤 이동 검사는 Chromium, Firefox, WebKit에서 모두 통과했고 메모 작성, 초안, 삭제 복원, 일괄 복사, 상세 편집과 포커스 과업도 통과했다.

Firefox의 초기 화면 검사 한 건은 기존 Pretendard 폰트에서 다운로드 오류 또는 name record 순서 경고가 발생해 실패했다. 이 검사는 모든 console 경고를 오류로 취급한다. 단독 재실행에서도 name record 순서 경고를 확인했다. 폰트 파일과 검사는 이번 변경에서 수정하지 않았으며 전체 E2E 완료로 기록하지 않는다.

224개 운영 TS 및 TSX 파일의 import graph에서 순환 참조는 없었고 lint의 FSD import 규칙과 React Hook 규칙도 통과했다. U1과 같은 메모 100개 및 복구 초안 10개를 세 번 측정한 중앙값은 표시 완료 시점이 데스크톱 83.7ms, 모바일 51ms, DOM 요소는 각각 4876개와 572개, heap은 18.2MB와 11.9MB였다. U1의 79ms, 48.9ms, 4878개, 572개, 19.3MB, 11.9MB와 비교하면 표시 시점은 각각 4.7ms, 2.1ms 느리고 나머지는 비슷하다. 세 번의 로컬 측정만으로 렌더 개선이나 표시 성능 퇴행을 단정하지 않는다. React Profiler의 렌더 횟수는 계속 수집하지 못했다.

## capability 주입 검토에 따른 후속 단위

이 단위는 [리팩토링 요구사항의 모듈 책임과 의존 방향](requirements.md#모듈-책임과-의존-방향을-분명히-한다), [상태마다 기준이 되는 위치](requirements.md#상태마다-기준이-되는-위치를-하나-둔다) 및 [반응성과 유지보수성](requirements.md#반응성과-유지보수성을-해치지-않는다)을 확인한다. [전체 연결 관계 검토](references/capability-injection.md)를 기준으로 한다. 기존에 승인된 [FSD 조립 결정](../personal-notes-app-8fd/decisions/application-package-and-fsd.md#승인된-결정과-이유)을 유지하며, [React Hook Form 지침](../../dev/personal-notes-app/react-hook-form.md), [테스트 전략](../../dev/personal-notes-app/testing-strategy.md)과 [테스트 안티패턴 지침](../../dev/personal-notes-app/test-anti-patterns.md)을 이후 코드 변경과 검증에 적용한다.

### U21. 서비스 전체의 의존성 연결과 사용 위치를 확인한다

- **대상과 변경:** `_app`의 조립, 메모 및 상세 편집, 저장 일괄 복사와 모바일 초안, 템플릿, 분석, 설정, 사용 기록, 탐색과 공통 UI가 의존성을 전달하고 사용하는 방식을 [capability 주입 검토](references/capability-injection.md)에 기록한다. 이 단위의 운영 코드 추가, 제거 및 수정은 없다.
- **설계 기준:** [React Context 구독 규칙](https://react.dev/reference/react/useContext)과 [FSD 계층 import 규칙](https://feature-sliced.design/docs/reference/layers#import-rule-on-layers)을 적용한다. 브라우저 구현을 바꿔 끼우는 기능, Provider가 관리하는 사용자 명령, 화면 인스턴스의 입력, DOM ref를 구분한다. 한 Hook에 함수 인자가 있다는 사실만으로 새 Context를 만들지 않는다.
- **완료 증거:** 각 영역의 구현 선택 지점, 사용 Hook과 Context, 명령의 순서 및 오류 책임, 그대로 둘 Props와 ref가 문서에서 실제 파일로 추적된다. TanStack Query의 별도 cache와 저장 동작을 추가하지 않았는지도 확인한다.

**검토 결과:** 기존 Provider의 직접 주입과 `useUsageReader` 접근자는 유지할 수 있다. 그러나 `LocalApplication`은 분석, 메모, 저장 일괄 복사, 설정, 템플릿과 사용 기록의 모든 의존성을 한 타입과 생성 함수에 나열한다. 미사용 `usage.writer` 하나만 삭제하면 이 결합이 남는다. 공통 IndexedDB 연결과 분석 Worker의 종료 시점은 보존하면서 각 Provider의 연결 위치로 옮긴다. `readContent`, `setFailure`, `noteReference`, DOM ref와 화면 이동 callback은 인프라 의존성이 아니므로 새 Provider로 옮기지 않는다. `useNotesDataModel`, `useBatchCopyState`와 `useMobileBatchCopyState`의 저장 명령, 순서, 화면 게시는 유지한다. 이 판단은 정적 코드 조사이며 렌더 감소를 입증하지 않는다.

U22부터 U28까지는 기존 Provider 계층과 Client Component 경계를 유지하며 `_app`의 조립 코드만 옮긴다. 설정, 템플릿, 분석, 일괄 복사와 메모의 구현체는 각각 독립된 조립 모듈에서 안정적으로 만들어 기존 Provider에 전달한다. React 기본 Hook은 새 `.ts` 모듈에 두고 `.tsx`는 JSX 연결만 맡긴다. 큰 객체를 큰 Hook, 상위 컴포넌트의 의존성 묶음 또는 범용 Context로 옮기지 않는다. 각 단위의 완료 증거는 U29에서 한 번에 검토하고 검증한다.

### U22. 공유 IndexedDB 연결의 수명을 분리한다

- **추가:** `_app/composition/use-database.ts`에서 `PersonalNotesDatabase`를 Provider 수명 동안 하나만 만들고 종료 시 닫는다.
- **수정:** [`create-local-application.ts`](../../../apps/notes/src/_app/composition/create-local-application.ts)는 연결을 내부에서 만들거나 닫지 않고 인자로 받는다. [`use-local-application.ts`](../../../apps/notes/src/_app/providers/use-local-application.ts)와 [`personal-notes-provider.tsx`](../../../apps/notes/src/_app/providers/personal-notes-provider.tsx)는 같은 연결을 기존 저장소와 `storageMonitor`에 전달한다. 이때 전체 객체는 다음 단위를 위한 임시 연결로만 남긴다.
- **설계 기준:** `use-database.ts`가 연결을 닫고 나머지 조립 모듈은 이를 사용하게 한다. [IndexedDB의 버전 변경 규칙](https://www.w3.org/TR/IndexedDB-3/#connection-requests)에 따라 별도 연결이 남아 업그레이드를 막지 않게 한다. 초기화 함수는 외부 연결을 열지 않고, 종료 처리는 [React Effect 수명 규칙](https://react.dev/reference/react/useEffect#connecting-to-an-external-system)에 맞춘다.
- **완료 증거:** 메모, 초안, 저장 목록, 템플릿과 사용 기록이 같은 연결을 사용한다. `blocked`와 `version-changed` 안내, 연결 종료 후 재시도, 재진입 시 자료 조회가 기존과 같다.

### U23. 설정 저장소를 독립적으로 연결한다

- **추가 및 수정:** `_app/composition/use-preference-adapters.ts`와 `preference.tsx`에서 설정 저장소와 시계를 안정적으로 만들고 기존 `InteractionPreferencesProvider`에 전달한다. [`personal-notes-provider.tsx`](../../../apps/notes/src/_app/providers/personal-notes-provider.tsx)의 설정 Provider 위치를 교체하고 `LocalApplication.preferences` 타입 및 생성 코드를 제거한다.
- **설계 기준:** 설정 저장소의 구현 선택만 별도 모듈로 옮긴다. 설정 값은 기존 Provider가 관리하며, 다른 Provider가 읽는 설정값과 현재 감싸는 순서를 유지한다. 새 Context나 설정 state 사본은 만들지 않는다.
- **완료 증거:** 설정을 바꾸고 실패 시 되돌리는 동작, 메모와 일괄 복사에 반영되는 설정값, 재방문 뒤 저장값이 같다.

### U24. 템플릿 의존성을 템플릿 연결 위치로 옮긴다

- **추가 및 수정:** `_app/composition/use-template-adapters.ts`와 `template.tsx`에서 템플릿 저장소, 클립보드, 시계와 식별자 생성기를 안정적으로 만들고 기존 `TemplateDataProvider`에 전달한다. 상위 구성의 템플릿 Provider 위치를 교체하고 `LocalApplication.templates` 타입 및 생성 코드를 제거한다.
- **설계 기준:** 템플릿 편집과 복사에 필요한 의존성만 모은다. 새 저장 명령이나 조회 Context를 만들지 않고, 기존 편집과 복사 명령이 같은 Provider를 거치게 한다. ID 생성기와 클립보드 구현은 현재 내부 누적 상태가 없으므로 템플릿 전용 인스턴스를 사용할 수 있다.
- **완료 증거:** 템플릿 작성, 편집, 삭제, 복사와 선택 자료 사용이 기존 저장값 및 화면 결과를 유지한다.

### U25. 분석 Worker의 수명과 조회 연결을 분석 Provider로 옮긴다

- **추가 및 수정:** `_app/composition/use-analysis-adapters.ts`와 `analysis.tsx`에서 같은 IndexedDB 연결을 읽는 메모 저장소와 `WorkerTextAnalyzer`를 만들고 기존 `TextAnalysisProvider`에 전달한다. 분석 연결이 끝날 때 Worker를 종료하고 대기 요청을 정리한다. 상위 구성의 분석 Provider 위치를 교체하고 `LocalApplication.analysis`와 `dispose`를 제거하며, `use-local-application.ts`에서 더는 필요 없는 종료 Effect를 제거한다.
- **설계 기준:** Worker 수명과 분석 전후의 메모 조회에 필요한 의존성을 함께 관리한다. 메모 revision 비교와 늦은 응답 배제는 기존 `useTextAnalysisState`에 남긴다. 새 연결은 첫 분석 전에는 Worker를 시작하지 않는다.
- **완료 증거:** 분석 실행, 재실행, 화면 이동과 늦은 응답 처리가 같고 Worker가 종료된다. 사용 기록이나 메모 저장소의 다른 Provider는 분석 상태를 구독하지 않는다.

### U26. 모바일 일괄 복사 초안의 구현을 분리한다

- **추가 및 수정:** `_app/composition/use-mobile-batch-copy-adapters.ts`와 `mobile-batch-copy.tsx`에서 모바일 초안 저장소, 추가 writer, 클립보드, 시계와 식별자 생성기를 만들고 기존 `MobileBatchCopyProvider`에 전달한다. 상위 구성의 모바일 초안 Provider 위치를 교체하고 `LocalApplication.batchCopy`에서 `draftRepository`와 `mobileWriter`를 제거한다.
- **설계 기준:** 모바일 확인 작업의 자료 수명과 저장 목록 수명을 합치지 않는다. 설정에서 읽은 재정렬 표시값을 기존과 같이 전달하고, 자체 저장 순서와 오류 복원은 `useMobileBatchCopyState`에 남긴다.
- **완료 증거:** 모바일 초안의 추가, 순서 변경, 복제, 삭제, 확인 및 저장 실패 복원이 기존과 같고 복사 결과와 화면 문구가 유지된다.

### U27. 저장 일괄 복사 목록의 구현을 분리한다

- **추가 및 수정:** `_app/composition/use-batch-copy-adapters.ts`를 추가하고 [`batch-copy-provider.tsx`](../../../apps/notes/src/_app/providers/batch-copy-provider.tsx)가 저장 목록의 저장소, writer, 클립보드, 시계와 식별자 생성기를 그 Hook에서 받도록 한다. 상위 Provider는 공유 연결, 설정 표시값과 `onItemRemoved`만 전달한다. `LocalApplication.batchCopy`의 남은 타입과 생성 코드를 제거한다.
- **설계 기준:** 기존 `useBatchCopyState`의 변경 queue, 실행 취소 이력과 저장 성공 뒤 메모 선택 해제 연결은 그대로 둔다. 저장 명령을 원시 저장소 접근으로 바꾸거나 모바일 초안의 상태와 합치지 않는다.
- **완료 증거:** 저장 목록 편집, 재정렬, 개별 제거, 실행 취소, 전체 복사와 메모 선택 해제가 실패 및 재시도까지 기존과 같다.

### U28. 메모와 사용 기록의 구현을 연결하고 전체 객체를 제거한다

- **추가:** `_app/composition/use-usage-adapters.ts`는 메모의 개별 복사 기록과 사용 기록 화면이 함께 쓰는 `IndexedDbUsageRepository`를 공유 연결에서 한 번 만든다. `_app/composition/use-note-adapters.ts`와 `note.tsx`는 메모 저장소, 초안 저장소, 클립보드, 시계와 식별자 생성기를 안정적으로 만들고 기존 `NotesDataProvider`에 사용 기록 writer 및 같은 `PersonalNotesDatabase`를 `storageMonitor`로 전달한다.
- **수정 및 제거:** [`personal-notes-provider.tsx`](../../../apps/notes/src/_app/providers/personal-notes-provider.tsx)는 사용 기록 reader를 기존 `UsageReaderProvider`에 직접 전달하고 메모 연결 위치를 교체한다. `ApplicationProviders`의 전체 객체 Props를 없애고 설정과 메모 세션의 화면 간 연결만 남긴다. [`create-local-application.ts`](../../../apps/notes/src/_app/composition/create-local-application.ts)와 [`use-local-application.ts`](../../../apps/notes/src/_app/providers/use-local-application.ts)의 남은 타입과 코드를 제거한다. 쓰지 않는 `usage.writer` 속성도 함께 사라진다.
- **설계 기준:** 공유 자원은 IndexedDB 연결과 실제 양쪽에서 쓰는 사용 기록 저장소로 한정한다. 메모의 저장 queue, revision, 초안 복구와 `blocked` 및 `version-changed` 구독은 기존 `useNotesDataModel`에 남긴다. 사용 기록 읽기 접근자와 기능별 Provider는 유지하고, 범용 의존성 Context 또는 또 다른 전체 의존성 객체는 만들지 않는다.
- **완료 증거:** 메모 저장, 복구와 개별 복사 기록이 기존 순서로 완료된다. `/usage`에서 같은 기록을 읽고 재방문 뒤에도 보이며, 연결 알림과 오류 안내가 유지된다. 전체 소스에서 `LocalApplication`과 `application.usage.writer` 참조가 사라진다.

### U29. 조립 위치와 사용자 동작을 최종 확인한다

- **대상과 변경:** U22부터 U28까지의 운영 코드와 연결 방향을 한 번 검토한다. 새 저장 형식, Query cache, 전역 DI container와 화면 상태 복제는 추가하지 않는다.
- **완료 증거:** [리팩토링 요구사항의 완료 증거](requirements.md#완료를-확인할-증거)에 따라 타입 검사, lint, 기존 unit, browser와 E2E 결과를 확인한다. 각 조립 모듈이 연결할 Provider에 필요한 구현체만 만들고, 공통 연결은 하나이며, 분석 Worker가 종료되고, 하위 slice가 `_app`을 import하지 않는지 확인한다. 메모 저장 및 복구, 저장 목록과 모바일 초안의 일괄 복사, 템플릿, 분석, 설정, 사용 기록과 탐색에서 화면, URL, 접근성 이름, 저장 자료와 실패 동작을 비교한다. 기존 U20의 Firefox 초기 화면 실패도 구분해 기록하고, 남아 있으면 전체 검증 완료라고 표시하지 않는다. 렌더 횟수 개선을 주장하려면 같은 자료량과 동작에서 React Profiler 측정값을 별도로 확보한다.

새 외부 의존성을 사용하는 모듈이 생겨 기존 직접 주입이 여러 무관한 중간 계층을 거칠 때만 그 모듈을 포함한 slice의 최소 capability 접근자를 다시 검토한다. 그전에는 저장 명령과 화면 입력의 인자 수 자체를 새 Provider 도입 근거로 사용하지 않는다.

## 멈추고 다시 판단할 조건

- 기존 요구사항과 실제 화면 또는 저장 자료가 충돌하면 영향받는 단위의 변경을 중단하고 기준을 결정한다. 다른 단위는 그 충돌의 영향을 받지 않을 때만 진행한다.
- 저장 형식이나 DB 버전 변경이 필요해지면 현재 자료를 그대로 읽을 수 있는지와 migration 규칙을 먼저 확정한다. W3C의 [`blocked` 및 `versionchange` 처리](https://www.w3.org/TR/IndexedDB-3/#connection-requests)를 무시하는 변경은 진행하지 않는다.
- TanStack Query나 다른 외부 의존성이 필요하다는 판단이 나오면 직접 및 전이 의존성, 공식 통합 방식, 현재 구현과의 차이를 조사하고 승인 전에는 추가하지 않는다. 미도입인 저장 대상의 작업은 계속할 수 있다.
- provider 이동으로 화면 이동 뒤 선택 또는 초안이 사라지거나, Effect 제거로 저장 및 정리 시점이 달라지면 영향을 받는 작업을 멈춘다. U13에서 변경 전과 다른 실패가 확인되면 완료를 보류하고 사용자 동작을 보존하는 수정안을 확인한다. 변경 전에도 재현되는 실패는 별도로 밝힌다.
- U14에서 저장 완료 전 관찰과 완료 뒤에도 남는 좌표 불일치를 구분하지 못하면 U15에서 바꿀 코드를 정하지 않는다. 실제 저장값이 잘못된 경우 검사 대기만 늘려 실패를 감추지 않는다. Hook 분리로 저장 queue나 사용자 화면의 상태 수명이 달라지면 영향을 받은 단위를 멈추고 이전 동작을 기준으로 다시 설계한다.
- capability 접근자를 추가하려면 사용 모듈이 현재 Provider의 직접 주입으로는 연결되지 않는지 먼저 확인한다. 저장 명령을 우회하거나 FSD 하위 계층에서 `_app` 구현을 import해야 한다면 그 변경을 진행하지 않는다. Provider 값 변경으로 무관한 화면의 렌더 비용이 증가하거나 Client Component로 실행할 파일이 늘어나는 경우에도 구조를 다시 판단한다.
- 분리 뒤에도 모든 구현체를 나열하는 새 객체, 단일 Hook 또는 Context가 생기면 다음 단위를 진행하기 전에 각 모듈의 변경 이유에 따라 다시 나눈다. 공유 IndexedDB 연결이 둘 이상 열리거나 분석 Worker 정리가 누락되면 수명 이동을 완료한 것으로 보지 않는다.
