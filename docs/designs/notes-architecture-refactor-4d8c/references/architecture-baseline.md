# apps/notes 현재 구조와 공식 자료 조사

이 문서는 `apps/notes`의 모듈과 상태를 재정비할 때 참고할 저장소 사실과 공식 자료를 기록한다. 독자는 이후 구현에서 확인된 제약과 분석을 구분해 사용한다. 외부 자료는 아키텍처 사실을 뒷받침하며, 새로운 사용자 작업이나 의존성 도입을 승인하지 않는다.

조사 질문은 현재 앱의 모듈 책임, 상태를 관리하는 위치와 외부 의존성 조립 방식을 파악하고, 이를 바꿀 때 유지해야 할 제약을 확인하는 것이다. 이 조사는 [모듈 책임과 의존 방향](../requirements.md#모듈-책임과-의존-방향) 및 [상태마다 기준이 되는 위치](../requirements.md#상태마다-기준이-되는-위치를-하나-둔다) 요구사항의 근거다.

## 저장소에서 확인한 구조

- [`apps/notes/package.json`](../../../../apps/notes/package.json)은 Next.js 16.3.3, React 19.2.8, React Hook Form 7.86.0, Zod 4.4.3과 TypeScript 6.0.3을 고정한다. 별도 상태 관리 라이브러리는 의존성에 없다.
- [`apps/notes/eslint.config.mjs`](../../../../apps/notes/eslint.config.mjs)는 `@boundaries/eslint-plugin` 7.2.0으로 라우트, `_app`, `_pages`, widgets, features, entities와 shared의 요소 유형 및 허용된 slice `public API`를 검사한다. 루트 요구사항도 FSD 계층과 `public API` 사용을 요구한다.
- Next.js 라우트 파일은 [`apps/notes/app/`](../../../../apps/notes/app/)에 있다. 애플리케이션 구현은 `apps/notes/src/_app`, `_pages`, `widgets`, `features`, `entities`, `shared`로 나뉜다. 사용자 화면은 기존 요구사항의 완료 증거에 맞춰 메모 작성, 일괄 복사, 사용 횟수, 텍스트 분석, 템플릿과 설정을 제공한다.
- [`create-local-application.ts`](../../../../apps/notes/src/_app/composition/create-local-application.ts)는 IndexedDB repository, Clipboard writer, 식별자 생성기, 시계와 Worker 분석기를 만들고 작업별 객체로 묶는다. [`personal-notes-database.ts`](../../../../apps/notes/src/_app/composition/indexed-db/personal-notes-database.ts)는 연결을 관리하고 `blocked` 및 버전 변경을 알린다.
- 노트 페이지의 [`notes-data-provider.tsx`](../../../../apps/notes/src/_pages/notes/model/notes-data-provider.tsx)는 저장 자료 조회와 변경 명령을 제공한다. [`note-session-provider.tsx`](../../../../apps/notes/src/_pages/notes/model/note-session-provider.tsx)는 선택, 패널, 삭제 취소 기록과 알림처럼 페이지 이동 중 유지할 상태를 관리한다. 상태와 명령을 분리하는 Context도 이미 일부 사용한다.
- IndexedDB는 메모, 복구 초안, 일괄 복사 목록과 초안, 템플릿, 설정 및 사용 횟수를 보관한다. [`migrate-personal-notes-database.ts`](../../../../apps/notes/src/_app/composition/indexed-db/migrate-personal-notes-database.ts)는 이전 형식의 저장 자료를 검증하고 현재 형식으로 옮긴다.
- [`docs/dev/personal-notes-app/react-hook-form.md`](../../../dev/personal-notes-app/react-hook-form.md)는 폼 입력과 저장 및 브라우저 동작의 상태 책임을 나눈 `current` 지침이다. [`docs/dev/personal-notes-app/anti-patterns.md`](../../../dev/personal-notes-app/anti-patterns.md)는 구현 권고를 담은 `proposed` 지침이므로 승인된 현재 규칙과 구분한다.
- `apps/notes/package.json`과 `pnpm-lock.yaml`에는 TanStack Query가 없다. `docs/dev/personal-notes-app/anti-patterns.md`도 현재 미도입 상태와 IndexedDB 자료를 Query cache에 함께 두려면 별도 적용 근거가 필요하다고 기록한다. 이 문서의 TanStack Query 분석은 아직 승인되지 않은 적용 검토다.

### 사용자 동작과 코드의 연결

사용자가 수행하는 작업의 상세 기준은 [기존 메모 앱 요구사항](../../personal-notes-app-8fd/requirements.md)에 있다. 현재 라우트와 주요 구현을 대조하면 리팩토링 중 다음 동작을 함께 보존해야 한다.

- `/`와 `/notes/[noteId]`: [`notes-start-page.tsx`](../../../../apps/notes/src/_pages/notes/ui/notes-start-page.tsx), [`notes-collection.tsx`](../../../../apps/notes/src/_pages/notes/ui/notes-collection.tsx), [`note-detail-page.tsx`](../../../../apps/notes/src/_pages/notes/ui/note-detail-page.tsx)는 데스크톱 메모 보드, 모바일 목록과 상세 편집, 메모 생성, 복사, 배치, 속성 변경과 삭제 취소를 연결한다. [`use-note-content-autosave.ts`](../../../../apps/notes/src/_pages/notes/model/use-note-content-autosave.ts)와 [`notes-data-provider.tsx`](../../../../apps/notes/src/_pages/notes/model/notes-data-provider.tsx)는 초안 복구와 저장 실패를 포함한 자료 수명을 담당한다.
- `/batch-copy`: [`batch-copy-start-page.tsx`](../../../../apps/notes/src/_pages/batch-copy/ui/batch-copy-start-page.tsx)는 저장된 목록의 편집, 순서 변경, 실행 취소와 다시 실행, 복사를 표시한다. [`mobile-batch-copy-confirmation.tsx`](../../../../apps/notes/src/_pages/batch-copy/ui/mobile-batch-copy-confirmation.tsx)와 [`mobile-batch-copy-provider.tsx`](../../../../apps/notes/src/features/add-note-to-batch-copy/model/mobile-batch-copy-provider.tsx)는 별도의 모바일 수집 초안, 확인 단계와 복귀를 유지한다.
- `/analysis`와 `/templates`: [`analysis-start-page.tsx`](../../../../apps/notes/src/_pages/analysis/ui/analysis-start-page.tsx)는 사용자가 실행할 때 분석을 시작하고, [`text-analysis-provider.tsx`](../../../../apps/notes/src/_pages/analysis/model/text-analysis-provider.tsx)는 Worker 응답을 현재 메모 내용과 다시 대조한다. [`templates-start-page.tsx`](../../../../apps/notes/src/_pages/templates/ui/templates-start-page.tsx)는 선택된 분석 문장으로 템플릿을 만들고, 저장된 템플릿을 선택하여 값을 채우고 복사하는 작업을 연결한다.
- `/usage`와 `/settings`: [`usage-start-page.tsx`](../../../../apps/notes/src/_pages/usage/ui/usage-start-page.tsx)는 복사 기록의 조회와 재시도를 제공한다. [`settings-start-page.tsx`](../../../../apps/notes/src/_pages/settings/ui/settings-start-page.tsx)는 일괄 복사 단축키와 순서 변경 버튼 설정을 저장하고, 실패하면 화면 입력을 저장된 값으로 되돌린다.
- 모든 화면의 탐색과 실행 환경: [`app/layout.tsx`](../../../../apps/notes/app/layout.tsx), [`personal-notes-provider.tsx`](../../../../apps/notes/src/_app/providers/personal-notes-provider.tsx), [`application-navigation`](../../../../apps/notes/src/widgets/application-navigation/index.ts)은 라우트, 앱 수명과 탐색 UI를 연결한다. [`create-local-application.ts`](../../../../apps/notes/src/_app/composition/create-local-application.ts)는 IndexedDB, 클립보드, 시계, 식별자 생성과 분석 Worker 구현을 선택한다.

화면별 작업은 다른 상태를 요구한다. 메모 저장은 복구 초안과 순차 변경을, 모바일 일괄 복사는 수집 및 확인 단계를, 분석은 명시적인 실행과 이전 분석 무효화를, 설정은 실패 시 복원을 요구한다. 따라서 화면별 상태와 저장 동작을 대조하지 않은 일괄 provider 교체는 현재 동작을 보존하는 방법으로 입증되지 않았다.

## 공식 자료가 확인한 설계 원칙

FSD의 [계층 안내](https://fsd.how/docs/reference/layers/)는 slice가 더 낮은 계층에 의존하도록 정하고, [`app`과 `shared` 외 계층의 필요 여부는 프로젝트에서 판단할 수 있다](https://fsd.how/docs/reference/layers/#layer-definitions)고 설명한다. [`public API` 안내](https://fsd.how/docs/reference/public-api/)는 외부 모듈이 내부 파일 구조에 기대지 않도록 slice가 진입점에서 다른 모듈에 제공할 항목을 제한하라고 권한다. 현재 저장소에는 그 방향을 검사하는 ESLint 설정이 이미 있다. 따라서 조사만으로 새 아키텍처 도구나 폴더 체계를 추가할 근거는 확인되지 않았다.

React의 [상태 구조 지침](https://react.dev/learn/choosing-the-state-structure)은 서로 모순되거나 파생할 수 있는 상태와 같은 자료를 여러 상태에 복제하는 방식을 피하라고 한다. [상태 공유 지침](https://react.dev/learn/sharing-state-between-components)은 각 상태를 한곳에서 관리하고, 여러 구성요소가 함께 바뀌어야 할 때 실제로 공유하는 가장 가까운 부모에서 관리해야 한다고 설명한다. 모든 상태를 한곳에 모으라는 뜻은 아니다. [Custom Hook 지침](https://react.dev/learn/reusing-logic-with-custom-hooks)은 Hook이 로직을 재사용하지만 각 호출의 상태까지 공유하지는 않는다고 명시한다. 이 자료들은 전역 store, custom Hook 또는 Context만으로 상태가 자동 공유된다고 가정하지 않도록 근거를 제공한다.

Next.js의 [Server 및 Client Component 안내](https://nextjs.org/docs/app/getting-started/server-and-client-components)는 현재 확인 시점에 2026년 8월 25일 갱신되어 있다. 문서는 `"use client"`가 Client Component와 Server Component의 module graph를 나누는 기준이며 그 파일이 가져오는 코드도 client bundle에 포함된다고 설명한다. 또 provider는 필요한 하위 구성요소 가까이에 두고 서버에서 클라이언트로 보내는 값은 직렬화 가능해야 한다고 안내한다. 현재 앱은 IndexedDB, 클립보드와 Worker를 브라우저에서 사용하므로 리팩토링에서도 Next.js 라우트와 브라우저에서 실행하는 코드를 구분해야 한다.

React Hook Form 사용 기준은 설치된 7.86.0 버전에 맞춰 [저장소의 현재 지침](../../../dev/personal-notes-app/react-hook-form.md#근거)에 [공식 API 문서의 고정 revision](https://github.com/react-hook-form/documentation/tree/e739aea29ff1f13a272b3aae99e9af257e218e6a)을 기록한다. 지침은 폼 값과 dirty 및 validation 상태는 React Hook Form이 맡고, 저장 진행과 포인터 조작, 일괄 복사 상태는 애플리케이션 또는 도메인 모듈이 맡도록 구분한다.

W3C의 [IndexedDB 3.0 표준](https://www.w3.org/TR/IndexedDB/)은 다른 탭이 기존 연결을 해제하지 않으면 IndexedDB 버전 업그레이드가 `blocked`될 수 있고, 기존 연결의 `versionchange` 처리와 업그레이드 transaction 완료가 필요하다고 명시한다. 현재 앱은 이 수명 주기를 사용자에게 알리는 처리를 이미 갖는다. 저장소 접근을 다른 모듈로 옮기거나 migration을 고칠 때에도 오류 안내, 대기와 버전 변경에 대한 기존 화면 처리를 유지해야 한다.

## 컴포넌트 입력과 의존성 전달, 렌더링 측정

이 조사는 [모듈 책임과 의존 방향](../requirements.md#모듈-책임과-의존-방향), [상태마다 기준이 되는 위치](../requirements.md#상태마다-기준이-되는-위치를-하나-둔다), [반응성과 유지보수성](../requirements.md#반응성과-유지보수성을-해치지-않는다) 요구사항을 실제 컴포넌트 입력과 연결 관계에 대조한다. 조사 질문은 어떤 값이 컴포넌트 입력이어야 하는지, 어떤 의존성을 하위 UI까지 전달할 필요가 없는지, 그리고 렌더와 Effect 최적화를 어디서 검증해야 하는지다.

### Props와 의존성 연결

메모 시작 화면은 `useNotesData()`가 반환하는 상태와 명령 중 필요한 값 11개를 `NotesCollection`에 전달한다. `NotesCollection`은 메모 동작과 알림 표시를 조립한 뒤 데스크톱 보드에 18개의 값과 callback을 전달한다. `NotesBoard`는 보드 이동을 처리하고, `NoteCard` 인스턴스마다 메모, 선택 상태, 배율, 포커스와 동작 callback을 전달한다. 이 가운데 다수 callback은 보드에서 실행하지 않고 카드로 전달하기만 한다. [Props 사용 안내](https://react.dev/learn/passing-props-to-a-component)는 Props를 부모가 자식에 전달하는 입력으로 설명하고, [Context 사용 안내](https://react.dev/reference/react/useContext)는 깊은 하위 구성요소와 공유하는 값에 Context를 사용할 수 있다고 설명한다.

따라서 Props 개수를 기준으로 일괄 제거하면 카드별 메모와 상태, 이벤트처럼 카드 인스턴스의 모양과 동작을 정하는 입력까지 감출 수 있다. 반대로 보드를 통과하기만 하는 공통 명령은 여러 카드가 실제로 함께 쓰는지 확인한 뒤 명령 전용 Context나 조립 위치 변경과 비교할 수 있다. 이 경우에도 전역 container로 바꾸지 않고, 순수 UI 입력과 이벤트는 Props로 두며 인프라 의존성은 이를 사용하는 작업의 조립 지점에서 제공하는 현재 요구사항을 따른다.

메모 화면 밖에도 서로 다른 Props 전달 구간이 확인된다.

- [`mobile-notes-workspace.tsx`](../../../../apps/notes/src/_pages/notes/ui/mobile-notes-workspace.tsx)는 복사, 일괄 복사 추가와 사용 가능 여부를 [`mobile-note-list.tsx`](../../../../apps/notes/src/_pages/notes/ui/mobile-note-list.tsx)에 주고, 목록은 각 [`mobile-note-card.tsx`](../../../../apps/notes/src/_pages/notes/ui/mobile-note-card.tsx)에 전달한다. 목록은 메모를 순회하는 역할이므로 공통 명령의 전달 방식은 재검토할 수 있다. 카드별 메모와 사용 가능 여부는 각 카드의 실제 입력이다.
- [`batch-copy-editing-view.tsx`](../../../../apps/notes/src/features/edit-batch-copy/ui/batch-copy-editing-view.tsx)는 명령의 실패 표시와 재시도를 처리하면서 항목, 표시 방식과 일부 동작을 [`batch-copy-list.tsx`](../../../../apps/notes/src/features/edit-batch-copy/ui/batch-copy-list.tsx)에 전달한다. 목록은 포인터 순서 변경과 action sheet를 관리하며 행마다 많은 이벤트와 상태를 계산한다. [`mobile-batch-copy-confirmation-list.tsx`](../../../../apps/notes/src/_pages/batch-copy/ui/mobile-batch-copy-confirmation-list.tsx)에도 목록에서 행으로 전달하는 별도 코드가 있다. 두 목록의 공통 동작과 서로 다른 제스처를 구별해야 하므로 Props 수만으로 통합 여부를 정할 수 없다.
- [`analysis-start-page.tsx`](../../../../apps/notes/src/_pages/analysis/ui/analysis-start-page.tsx)의 `AnalysisContent`는 분석 상태별 안내를 고른 다음 템플릿 제안 callback을 [`analysis-results.tsx`](../../../../apps/notes/src/_pages/analysis/ui/analysis-results.tsx)에 전달한다. 중간 컴포넌트에서 callback을 쓰지 않지만, 상태에 맞는 안내나 분석 목록을 고르는 책임은 있다. 분석 목록을 조립하는 위치를 바꾸면 전달 단계를 줄일 수 있는지 검토할 수 있다.
- [`templates-start-page.tsx`](../../../../apps/notes/src/_pages/templates/ui/templates-start-page.tsx)에서 [`saved-templates.tsx`](../../../../apps/notes/src/_pages/templates/ui/saved-templates.tsx)로 내려가는 선택 callback은 저장된 템플릿을 고른다는 실제 사용자 동작이다. `SavedTemplateList`는 이를 각 행에 전달한다. [`template-input-form.tsx`](../../../../apps/notes/src/_pages/templates/ui/template-input-form.tsx)의 필드 목록은 React Hook Form의 `register`와 오류 정보를 각 필드에 전달한다. 폼 하위 구조가 더 깊어지지 않은 현재 구조에서 별도 FormProvider가 반드시 필요한 근거는 확인되지 않았다.
- [`settings-start-page.tsx`](../../../../apps/notes/src/_pages/settings/ui/settings-start-page.tsx)의 설정 값, 저장 명령과 진행 상태는 바로 하위 폼에서 사용한다. [`usage-start-page.tsx`](../../../../apps/notes/src/_pages/usage/ui/usage-start-page.tsx)의 조회 상태와 재시도 명령도 바로 하위 화면에서 사용한다. 이 Props는 중간 전달만 하는 값이 아니므로 제거 대상으로 세지 않는다.

[React의 Context 안내](https://react.dev/learn/passing-data-deeply-with-context)는 먼저 Props와 `children`을 통해 관계를 명시하고, 깊은 중간 계층이 사용하지 않는 값을 반복 전달하거나 여러 하위 컴포넌트가 같은 값을 공유할 때 Context를 고려하도록 설명한다. 이 앱에서도 중간 전달을 줄이는 이점과 Context 값 변경으로 다시 렌더되는 컴포넌트를 함께 비교해야 한다.

외부 구현 선택은 이미 [`createLocalApplication`](../../../../apps/notes/src/_app/composition/create-local-application.ts)이 IndexedDB, 클립보드, 식별자, 시계와 분석 Worker를 조립하고 provider에 필요한 타입으로 전달한다. 범용 service locator나 전체 의존성 Context는 발견되지 않았다.

메모 삭제 시각은 [`notes-collection.tsx`](../../../../apps/notes/src/_pages/notes/ui/notes-collection.tsx)에서 `new Date()`로 만들고, workspace notice 기본 만료 시각은 [`note-session-provider.tsx`](../../../../apps/notes/src/_pages/notes/model/note-session-provider.tsx)에서 `Date.now()`로 만든다. 저장할 때 조립된 `now`를 사용하는 코드와 달리 두 곳은 시스템 시계를 직접 읽는다. 시계 입력을 같은 방식으로 제공할지 검토할 수 있다. 라벨, URL과 autosave 지연 같은 고정 표현과 설정값까지 의존성으로 만들 근거는 없다.

### 각 자료 처리 방식과 반복 코드

[`personal-notes-provider.tsx`](../../../../apps/notes/src/_app/providers/personal-notes-provider.tsx)는 설정, 선택된 분석 문장, 템플릿, 노트 세션, 사용 횟수, 일괄 복사와 노트 provider를 앱 공통 트리에 조립한다. 템플릿 provider는 앱 진입 때 자료를 읽지만 `useTemplateData()` 사용처는 템플릿 페이지에 한정된다. 이 구조는 불필요한 초기 읽기와 생명주기 결합을 줄일 수 있는 후보지만, 화면 이동 뒤 유지해야 하는 상태가 무엇인지 확인한 다음 조정해야 한다.

노트, 템플릿, 설정과 일괄 복사 provider에는 읽기, 상태 표시와 재시도 코드가 반복된다. 그러나 노트 provider는 저장소 변경을 구독하고 순차 mutation queue를 사용한다. 설정 provider는 저장 중 상태를 표시하고 실패하면 이전 값을 복원한다. 템플릿 provider는 수정 시각이 최신인 항목부터 보여 주고 복사 동작을 제공한다. 반복 문법만을 근거로 범용 data provider를 만들면 각 provider의 오류, 재시도와 동시성 규칙을 흐릴 수 있다. 같은 저장 처리 방식과 오류 처리 절차를 공유하는 코드가 확인될 때만 그 부분을 모듈화할 근거가 있다.

현재 상태의 기준과 수명도 작업마다 다르다. [`notes-data-provider.tsx`](../../../../apps/notes/src/_pages/notes/model/notes-data-provider.tsx)는 저장된 메모와 복구 초안을 함께 읽고 저장소 상태 변경을 구독하며, 메모 변경을 순서대로 실행한다. [`note-session-provider.tsx`](../../../../apps/notes/src/_pages/notes/model/note-session-provider.tsx)는 선택, 패널과 삭제 취소처럼 저장 자료가 아닌 화면 작업 상태를 보관한다. [`batch-copy-provider.tsx`](../../../../apps/notes/src/_app/providers/batch-copy-provider.tsx)와 [`mobile-batch-copy-provider.tsx`](../../../../apps/notes/src/features/add-note-to-batch-copy/model/mobile-batch-copy-provider.tsx)는 각각 저장 목록과 모바일 작업 초안에 대해 별도 변경 순서를 관리한다.

[`use-usage-read-state.ts`](../../../../apps/notes/src/_pages/usage/model/use-usage-read-state.ts)는 사용 기록 화면이 열렸을 때만 자료를 읽는다. [`text-analysis-provider.tsx`](../../../../apps/notes/src/_pages/analysis/model/text-analysis-provider.tsx)는 사용자의 분석 실행 상태를 저장하며, 완료한 분석이 현재 메모와 일치하는지 검사한다. 이 상태들을 하나의 전역 cache나 store에 같은 형식으로 넣으면 상태의 의미와 재조회 시점이 달라질 수 있다.

[`template-data-provider.tsx`](../../../../apps/notes/src/_pages/templates/model/template-data-provider.tsx)는 현재 전체 앱 수명 동안 존재하지만, 이를 읽는 코드는 템플릿 화면의 편집, 텍스트 생성과 저장 목록에만 있다. 읽기 시점을 템플릿 화면으로 옮기면 앱 진입 시 조회를 줄일 수 있는지 검토할 수 있다. 화면을 떠났다가 돌아올 때 선택한 템플릿과 분석에서 전달한 문장이 유지되어야 하는지도 확인해야 한다. 반대로 설정 값은 앱 공통 조립 지점이 일괄 복사 단축키와 순서 변경 버튼에 제공하므로 설정 provider를 설정 화면에만 두면 현재 동작이 바뀐다.

탐색 항목 이름과 이동 주소는 활성 [`application-navigation`](../../../../apps/notes/src/widgets/application-navigation/index.ts)과 이전 [`application-frame.tsx`](../../../../apps/notes/src/_app/ui/application-frame.tsx) 아래에 각각 선언되어 있고, 마지막 `/`를 제거하는 함수도 두 곳에 있다. 저장소 전체의 import 검색에서 이전 `ApplicationFrame`을 사용하는 코드는 찾지 못했다. 따라서 탐색 상수를 새 공통 모듈로 옮기기 전에 사용하지 않는 구현을 정리할 수 있는지 확인해야 한다.

[`batch-copy-item-actions.tsx`](../../../../apps/notes/src/_pages/batch-copy/ui/batch-copy-item-actions.tsx)의 `BatchCopyItemActions`도 사용처를 찾지 못했다. 같은 이름의 [`createBatchCopyItemActions`](../../../../apps/notes/src/features/edit-batch-copy/model/batch-copy-item-actions.ts)는 활성 목록 두 곳에서 사용된다. 정적 import 검색만으로 외부 참조나 제거 안전성이 증명된 것은 아니다.

### Effect와 Hook 사용

[`use-batch-copy-page.ts`](../../../../apps/notes/src/_pages/batch-copy/model/use-batch-copy-page.ts)의 router Effect는 현재 pathname, IndexedDB에서 복원된 모바일 초안의 `collecting` 단계와 복귀 확인 상태를 본 뒤 `router.replace()`를 실행한다. IndexedDB에 저장된 자료가 준비된 뒤 주소를 보정하는 일은 파생 화면 값 계산이나 특정 클릭에 딸린 처리와 다르다. React는 Effect를 브라우저나 다른 외부 시스템과 동기화하는 데 사용하고, 렌더 중 계산 가능한 값과 사용자 입력으로 시작한 일은 각각 렌더와 event handler에서 처리하라고 안내한다([Effect가 필요하지 않을 수 있는 경우](https://react.dev/learn/you-might-not-need-an-effect), [Next.js `useRouter`](https://nextjs.org/docs/app/api-reference/functions/use-router)). 따라서 `router`가 Effect에 있다는 이유만으로 제거할 수는 없다. 자료를 읽기 전후의 화면과 주소 요구사항을 확인하고 route 보정 책임을 옮길 수 있는지 판단해야 한다.

[`use-note-content-autosave.ts`](../../../../apps/notes/src/_pages/notes/model/use-note-content-autosave.ts)는 저장 상태와 실패를 React state로 보여 주고, 최신 메모와 callback, 지연 작업, 진행 중 저장 Promise를 ref에 둔다. 여러 Effect는 ref를 최신 입력과 맞추며 마지막 Effect는 `pagehide` 및 `visibilitychange` listener와 timer를 정리하고 나가기 전 저장한다. 저장 중 최신 입력 보존, 중복 저장 방지와 unmount 처리에 관여하므로 Hook 수만으로 불필요하다고 판단할 수 없다. React 19.2부터 제공하는 [`useEffectEvent`](https://react.dev/reference/react/useEffectEvent)는 Effect 내부 callback에 최신 값을 전달할 때만 후보가 되며 일반 event handler나 자식에게 전달하는 callback을 대신하지 않는다.

[`note-session-provider.tsx`](../../../../apps/notes/src/_pages/notes/model/note-session-provider.tsx)는 workspace state와 알림, 삭제 기록을 React state로 보관하고, 상태 Context와 명령 Context를 분리한다. 현재 `useMemo` 사용 세 곳은 이 provider의 상태 및 명령 Context value와 [`navigation-guard-provider.tsx`](../../../../apps/notes/src/features/navigation-guard/model/navigation-guard-provider.tsx)의 Context value를 안정화한다. 이들은 비싼 계산을 캐시하기보다 provider가 새 객체를 매 render마다 전달하지 않게 하는 역할이다. Hook을 제거하거나 합치려면 상태와 명령의 구독 차이, 삭제 취소와 알림 만료 동작을 함께 확인해야 한다.

전체 `apps/notes/src`의 운영 코드에서 `useEffect` 호출 36곳을 찾았다. 저장소 조회와 구독에는 메모, 저장 목록, 모바일 초안, 템플릿, 설정, 사용 기록 provider 및 Hook이 포함된다.

외부 시스템 동기화에는 [`use-notes-board-view.ts`](../../../../apps/notes/src/_pages/notes/model/use-notes-board-view.ts)의 보드 관찰, [`use-batch-copy-pointer-reorder.ts`](../../../../apps/notes/src/features/edit-batch-copy/model/use-batch-copy-pointer-reorder.ts)의 포인터 세션 정리, [`use-batch-copy-history-shortcuts.ts`](../../../../apps/notes/src/features/edit-batch-copy/model/use-batch-copy-history-shortcuts.ts)의 키보드 listener가 있다.

[`note-properties-panel.tsx`](../../../../apps/notes/src/_pages/notes/ui/note-properties-panel.tsx)는 포커스와 패널 밖 입력을 처리하고, [`batch-copy-workspace.tsx`](../../../../apps/notes/src/_pages/notes/ui/batch-copy-workspace.tsx)는 화면 크기를 관찰한다. 이들은 저장소 읽기 Effect와 같은 이유로 존재하지 않으므로 각각 연결된 브라우저 API와 정리 동작을 확인해야 한다.

검토 우선 대상은 [`use-note-content-autosave.ts`](../../../../apps/notes/src/_pages/notes/model/use-note-content-autosave.ts)의 최신 메모, callback과 저장 함수를 ref에 복사하는 Effect 여섯 곳, [`use-note-properties-sync.ts`](../../../../apps/notes/src/_pages/notes/model/use-note-properties-sync.ts)의 저장된 도형과 폼 값 동기화, [`text-analysis-provider.tsx`](../../../../apps/notes/src/_pages/analysis/model/text-analysis-provider.tsx)의 분석 화면 진입 시 검증이다. 자동 저장의 마지막 Effect는 `pagehide` 및 `visibilitychange` 등록과 정리를 맡고, 속성 동기화는 사용자가 수정한 dirty 필드를 덮어쓰지 않으며, 분석 검증은 오래된 분석을 숨긴다. 이 동작들을 보존하는 대안을 확인하기 전에는 Effect 호출 수를 목표치로 삼을 수 없다.

계산 가능한 값을 state에 복제하거나 DOM, 타이머, 저장소 같은 외부 대상과 동기화하지 않는 Effect는 React 공식 지침에 따라 제거를 검토할 수 있다.

### 렌더 비용과 측정 한계

`NotesDataProvider`는 읽기 상태, 노트와 초안, 모든 명령 함수를 하나의 Context value에 넣어 제공한다. `NotesStartPage`, `NoteDetailPage`, `NotePropertiesPanel`은 모두 `useNotesData()`로 이 값을 구독한다. 한 메모를 바꿔 provider value가 달라지면 이 consumer들도 다시 렌더링될 수 있다. 노트 화면은 이후 `NotesBoard`에서 목록 전체를 순회해 `NoteCard`를 만들며, 현재 정적 검색에서는 `memo()` 또는 React `Profiler` 적용을 찾지 못했다. 불필요한 렌더가 확인된 것은 아니지만, 상태와 명령의 구독을 나누고 카드별 렌더 비용을 측정할 위치는 확인됐다.

메모 외에도 [`batch-copy-list.tsx`](../../../../apps/notes/src/features/edit-batch-copy/ui/batch-copy-list.tsx)는 항목마다 순서 변경 상태와 action을 만들어 행을 렌더하고, [`mobile-batch-copy-confirmation-list.tsx`](../../../../apps/notes/src/_pages/batch-copy/ui/mobile-batch-copy-confirmation-list.tsx)는 모바일 초안 항목을 순회한다. [`analysis-results.tsx`](../../../../apps/notes/src/_pages/analysis/ui/analysis-results.tsx), [`saved-templates.tsx`](../../../../apps/notes/src/_pages/templates/ui/saved-templates.tsx), [`usage-table.tsx`](../../../../apps/notes/src/_pages/usage/ui/usage-table.tsx)도 각각 분석 항목, 템플릿과 기록 행을 그린다.

성능 검토는 메모 카드뿐 아니라 위 화면의 대표 자료량과 실제 변경 동작을 기준으로 해야 한다. 정적 검색으로 특정 행이 불필요하게 렌더된다고 단정할 수 없다.

React 문서는 Context value가 바뀌면 그 Context consumer가 다시 렌더링되고 `memo`만으로 새 Context 값을 막을 수 없다고 설명한다([`useContext`](https://react.dev/reference/react/useContext)). [`useMemo`](https://react.dev/reference/react/useMemo)는 비싼 순수 계산이나 값 안정화에 대한 성능 최적화이지 기본 상태 관리 도구가 아니며, React [`Profiler`](https://react.dev/reference/react/Profiler)는 subtree의 `actualDuration`과 `baseDuration`을 비교해 업데이트 비용을 측정한다. 앱 설정에는 React Compiler가 활성화되어 있지 않다. 개발 모드의 Strict Mode는 추가 렌더와 Effect 실행을 일으킬 수 있으므로, 변경 전후 비교는 같은 자료량과 사용자 동작을 정하고 production profiling 환경에서 해야 한다. 현재 조사는 정적 코드만 확인했고 실제 컴포넌트 렌더 횟수, 시간과 사용자 기기 성능은 측정하지 않았다.

위 항목은 구현 대상과 승인된 설계가 아니라 요구사항을 검토할 코드 근거와 비교 지점이다. 구체적인 Props, Context, Hook 변경은 기존 화면 동작과 상태 수명을 보존하고 실제 측정값을 확인한 뒤 정해야 한다. 공식 자료 확인일은 2026-09-25이며 React 19.2.8과 Next.js 16.3.3이 설치된 앱 기준으로 대조했다.

## TanStack Query와 IndexedDB 검토 근거

TanStack Query v5의 [query function 지침](https://tanstack.com/query/latest/docs/framework/react/guides/query-functions)은 Promise를 반환하는 함수를 query function으로 사용할 수 있다고 설명한다. 그러므로 IndexedDB repository의 비동기 조회를 query function에서 호출하는 구조는 가능하지만, API를 연결할 수 있다는 사실만으로 적용 이점이 입증되지는 않는다.

[기본 cache 지침](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)은 기본 `staleTime`이 0이고 사용되지 않는 query 자료가 기본 5분 뒤 cache에서 제거된다고 설명한다. [Mutations 지침](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)은 mutation을 주로 자료 생성, 변경과 삭제에 사용한다고 설명하며, [mutation 뒤 query 무효화 지침](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations)은 자료 변경 뒤 연관 query를 무효화하거나 다시 읽도록 안내한다. IndexedDB의 저장 원본과 Query cache를 함께 사용하면 각 읽기와 변경 작업에서 신선도, 무효화, 오류 상태 및 재조회 시점을 정해야 한다.

[persistQueryClient plugin](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient)은 persister를 사용해 Query cache를 여러 저장소에 복원 및 보관하는 방법과 IndexedDB persister 예시를 제공한다. 이는 애플리케이션 메모리나 설정 record의 저장 및 migration과 별개의 cache 보관 수명이다. plugin 문서가 cache 복원은 비동기이며 앱 query와 동시에 실행하면 경합이 날 수 있다고 안내하므로, 영속화까지 검토한다면 초기 복원, cache 만료, 기존 IndexedDB transaction 및 저장 실패 처리를 함께 살펴야 한다.

[query cancellation 지침](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)은 query function에 `AbortSignal`을 전달한다. 이것이 IndexedDB transaction을 자동 취소하는 것은 아니므로, 특정 조회 작업에서 취소를 연결할지와 그 방식은 구현 대상 API를 기준으로 확인해야 한다.

적용 판단은 저장 대상별로 달라야 한다. 메모와 복구 초안은 [`readNotes`](../../../../apps/notes/src/_pages/notes/model/notes-data-provider.tsx)의 묶음 조회, 저장소 구독, 순차 변경과 업그레이드 오류를 함께 보존해야 한다. 저장 일괄 복사 목록과 모바일 초안은 서로 다른 repository와 변경 queue를 갖고, 모바일 초안의 `collecting` 및 `confirming` 단계는 [`use-batch-copy-page.ts`](../../../../apps/notes/src/_pages/batch-copy/model/use-batch-copy-page.ts)의 주소 보정에도 영향을 준다.

템플릿은 저장 직후 수정 시각 순서와 화면의 선택 상태를, 설정은 저장 실패 복원을, 사용 기록은 복사 후 다시 읽는 시점을 비교해야 한다. 분석 Worker의 실행 상태는 IndexedDB의 지속 자료 조회와 성격이 다르다. 이 차이를 검토하지 않고 `useEffect` 조회를 모두 Query로 교체하면 IndexedDB와 cache의 갱신 책임이 불명확해진다.

## 조사에서 확인한 점과 미확인 사항

- 외부 자료와 현재 코드가 함께 뒷받침하는 결론은 리팩토링이 FSD 계층, 필요한 slice `public API`, 상태마다 한곳에서 관리하는 원칙, 폼 책임과 브라우저 실행 환경의 구분을 계속 지켜야 한다는 점이다.
- 저장소 조사만으로 특정 화면의 provider가 지나치게 크거나, 상태 라이브러리가 필요하거나, 파일 전체를 재배치해야 한다고 판단할 수는 없다. 실제 구현 계획에서는 변경 이유와 상태 수명에 따라 모듈을 나눌 기준을 확인해야 한다.
- Query function에서 IndexedDB 비동기 조회를 호출할 수 있지만, Query cache에는 IndexedDB 자료와 별도의 신선도 및 제거 정책이 있다. 현재 Query는 설치되지 않았고 기존 repository가 저장 자료를 관리한다. 따라서 메모, 초안, 설정 등의 저장 대상마다 cache 수명과 저장 뒤 일관성을 비교해 적용 여부를 정해야 한다. 이 평가는 채택 결정이나 새 의존성 승인이 아니다.
- 이 조사는 현재 코드와 문서, 매니페스트 및 정적 설정을 확인했다. 브라우저 성능이나 전체 사용자 과업을 실행한 것은 아니다. 완료 판정에는 요구사항에 지정한 lint, 타입 검사, 기존 자동화 검사와 브라우저 자료 보존 확인이 필요하다.
- 공식 자료 확인일은 2026-09-25다. 참고 자료는 React 공식 문서, Next.js 공식 문서, TanStack Query v5 공식 문서, FSD 공식 문서, React Hook Form 공식 문서 저장소와 W3C IndexedDB 표준이다.
