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

## 공식 자료가 확인한 설계 원칙

FSD의 [계층 안내](https://fsd.how/docs/reference/layers/)는 slice가 더 낮은 계층에 의존하도록 정하고, [`app`과 `shared` 외 계층의 필요 여부는 프로젝트에서 판단할 수 있다](https://fsd.how/docs/reference/layers/#layer-definitions)고 설명한다. [`public API` 안내](https://fsd.how/docs/reference/public-api/)는 외부 모듈이 내부 파일 구조에 기대지 않도록 slice가 진입점에서 다른 모듈에 제공할 항목을 제한하라고 권한다. 현재 저장소에는 그 방향을 검사하는 ESLint 설정이 이미 있다. 따라서 조사만으로 새 아키텍처 도구나 폴더 체계를 추가할 근거는 확인되지 않았다.

React의 [상태 구조 지침](https://react.dev/learn/choosing-the-state-structure)은 서로 모순되거나 파생할 수 있는 상태와 같은 자료를 여러 상태에 복제하는 방식을 피하라고 한다. [상태 공유 지침](https://react.dev/learn/sharing-state-between-components)은 각 상태를 한곳에서 관리하고, 여러 구성요소가 함께 바뀌어야 할 때 실제로 공유하는 가장 가까운 부모에서 관리해야 한다고 설명한다. 모든 상태를 한곳에 모으라는 뜻은 아니다. [Custom Hook 지침](https://react.dev/learn/reusing-logic-with-custom-hooks)은 Hook이 로직을 재사용하지만 각 호출의 상태까지 공유하지는 않는다고 명시한다. 이 자료들은 전역 store, custom Hook 또는 Context만으로 상태가 자동 공유된다고 가정하지 않도록 근거를 제공한다.

Next.js의 [Server 및 Client Component 안내](https://nextjs.org/docs/app/getting-started/server-and-client-components)는 현재 확인 시점에 2026년 8월 25일 갱신되어 있다. 문서는 `"use client"`가 Client Component의 module graph 경계이며 그 파일이 가져오는 코드도 client bundle에 포함된다고 설명한다. 또 provider는 필요한 하위 구성요소 가까이에 두고 서버에서 클라이언트로 보내는 값은 직렬화 가능해야 한다고 안내한다. 현재 앱은 IndexedDB, 클립보드와 Worker를 브라우저에서 사용하므로 리팩토링에서도 Next.js 라우트와 브라우저에서 실행하는 코드를 구분해야 한다.

React Hook Form 사용 기준은 설치된 7.86.0 버전에 맞춰 [저장소의 현재 지침](../../../dev/personal-notes-app/react-hook-form.md#근거)에 [공식 API 문서의 고정 revision](https://github.com/react-hook-form/documentation/tree/e739aea29ff1f13a272b3aae99e9af257e218e6a)을 기록한다. 지침은 폼 값과 dirty 및 validation 상태는 React Hook Form이 맡고, 저장 진행과 포인터 조작, 일괄 복사 상태는 애플리케이션 또는 도메인 모듈이 맡도록 구분한다.

W3C의 [IndexedDB 3.0 표준](https://www.w3.org/TR/IndexedDB/)은 다른 탭이 기존 연결을 해제하지 않으면 IndexedDB 버전 업그레이드가 `blocked`될 수 있고, 기존 연결의 `versionchange` 처리와 업그레이드 transaction 완료가 필요하다고 명시한다. 현재 앱은 이 수명 주기를 사용자에게 알리는 처리를 이미 갖는다. 저장소 접근을 다른 모듈로 옮기거나 migration을 고칠 때에도 오류 안내, 대기와 버전 변경에 대한 기존 화면 처리를 유지해야 한다.

## TanStack Query와 IndexedDB 검토 근거

TanStack Query v5의 [query function 지침](https://tanstack.com/query/latest/docs/framework/react/guides/query-functions)은 Promise를 반환하는 함수를 query function으로 사용할 수 있다고 설명한다. 그러므로 IndexedDB repository의 비동기 조회를 query function에서 호출하는 구조는 가능하지만, API를 연결할 수 있다는 사실만으로 적용 이점이 입증되지는 않는다.

[기본 cache 지침](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)은 기본 `staleTime`이 0이고 사용되지 않는 query 자료가 기본 5분 뒤 cache에서 제거된다고 설명한다. [Mutations 지침](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)은 mutation을 주로 자료 생성, 변경과 삭제에 사용한다고 설명하며, [mutation 뒤 query 무효화 지침](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations)은 자료 변경 뒤 연관 query를 무효화하거나 다시 읽도록 안내한다. IndexedDB의 저장 원본과 Query cache를 함께 사용하면 각 읽기와 변경 작업에서 신선도, 무효화, 오류 상태 및 재조회 시점을 정해야 한다.

[persistQueryClient plugin](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient)은 persister를 사용해 Query cache를 여러 저장소에 복원 및 보관하는 방법과 IndexedDB persister 예시를 제공한다. 이는 애플리케이션 메모리나 설정 record의 저장 및 migration과 별개의 cache 보관 수명이다. plugin 문서가 cache 복원은 비동기이며 앱 query와 동시에 실행하면 경합이 날 수 있다고 안내하므로, 영속화까지 검토한다면 초기 복원, cache 만료, 기존 IndexedDB transaction 및 저장 실패 처리를 함께 살펴야 한다.

[query cancellation 지침](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)은 query function에 `AbortSignal`을 전달한다. 이것이 IndexedDB transaction을 자동 취소하는 것은 아니므로, 특정 조회 작업에서 취소를 연결할지와 그 방식은 구현 대상 API를 기준으로 확인해야 한다.

## 조사에서 확인한 점과 미확인 사항

- 외부 자료와 현재 코드가 함께 뒷받침하는 결론은 리팩토링이 FSD 계층, 필요한 slice `public API`, 상태마다 한곳에서 관리하는 원칙, 폼 책임과 브라우저 실행 환경의 구분을 계속 지켜야 한다는 점이다.
- 저장소 조사만으로 특정 화면의 provider가 지나치게 크거나, 상태 라이브러리가 필요하거나, 파일 전체를 재배치해야 한다고 판단할 수는 없다. 실제 구현 계획에서는 변경 이유와 상태 수명에 따라 모듈을 나눌 기준을 확인해야 한다.
- Query function에서 IndexedDB 비동기 조회를 호출할 수 있지만, Query cache에는 IndexedDB 자료와 별도의 신선도 및 제거 정책이 있다. 현재 Query는 설치되지 않았고 기존 repository가 저장 자료를 관리한다. 따라서 메모, 초안, 설정 등의 저장 대상마다 cache 수명과 저장 뒤 일관성을 비교해 적용 여부를 정해야 한다. 이 평가는 채택 결정이나 새 의존성 승인이 아니다.
- 이 조사는 현재 코드와 문서, 매니페스트 및 정적 설정을 확인했다. 브라우저 성능이나 전체 사용자 과업을 실행한 것은 아니다. 완료 판정에는 요구사항에 지정한 lint, 타입 검사, 기존 자동화 검사와 브라우저 자료 보존 확인이 필요하다.
- 공식 자료 확인일은 2026-09-25다. 참고 자료는 React 공식 문서, Next.js 공식 문서, TanStack Query v5 공식 문서, FSD 공식 문서, React Hook Form 공식 문서 저장소와 W3C IndexedDB 표준이다.
