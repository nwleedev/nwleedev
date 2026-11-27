# 서버 환경

## 설계 규칙

- Next.js나 React Router Framework Mode에서 FSD를 사용할 때 Public API를 `index.browser.ts`와 `index.server.ts`로 분리한다. Next.js에서는 `server-only`를, 일반 React Router Framework Mode에서는 `.server` 모듈을 사용해 서버 전용 코드가 브라우저에 포함되지 않도록 한다.
- React Server Components를 사용하는 환경에서는 사용자 상호작용이나 클라이언트 Hook이 필요한 진입점에 `"use client"`를 선언한다. 상위 서버 컴포넌트를 모듈 전달만을 위해 Client Component로 전환하지 않는다.
- Next.js의 Server Component와 React Router의 `loader`가 같은 애플리케이션의 데이터에 접근할 때는 Route Handler나 Resource Route로 다시 HTTP 요청을 보내지 않는다. 서버 데이터 접근 함수를 직접 호출한다.
- 조회 결과에 따라 HTTP 상태 코드나 리다이렉트가 달라지면 응답 스트리밍을 시작하기 전에 결과를 확인한다.
- 서로 의존하지 않는 서버 조회는 함께 시작한다. 페이지나 라우트를 렌더링하기 전에는 그 렌더링에 필요한 조회만 기다린다. 늦게 표시할 수 있는 데이터는 그 데이터를 렌더링하는 영역에서 기다린다.
- Next.js Server Component는 렌더링에 필요한 Promise를 직접 `await`할 때 `async`로 선언한다. 페이지 전체가 기다릴 필요가 없는 조회는 `<Suspense>`로 감싼 하위 Server Component에서 기다린다. `loading.tsx`는 같은 세그먼트의 페이지와 하위 콘텐츠에 적용되며, 그 세그먼트의 `layout.tsx`에서 기다리는 조회는 별도의 `Suspense`로 감싸거나 페이지로 옮긴다.
- React Router Framework Mode에서는 라우트에 필수인 데이터를 `loader`에서 `await`한다. 나중에 표시할 데이터는 조회를 시작한 뒤 Promise를 반환 객체의 속성으로 전달한다. 화면에서는 해당 영역을 `<Suspense>`로 감싸고 `<Await>`에서 결과를 기다린다.
- 스트리밍하는 조회의 로딩 상태와 실패 상태를 정의한다. Next.js에서는 오류를 표시할 범위에 맞게 `error.tsx` 또는 Error Boundary를 사용한다. React Router에서는 `<Await>`의 `errorElement` 또는 라우트의 `ErrorBoundary`에서 실패를 처리한다.
- Server Component에서 Client Component로 전달하는 값은 직렬화할 수 있는 데이터로 제한한다. 서버 컴포넌트에서만 표시할 데이터는 서버에서 조회해 필요한 값만 렌더링한다. 이 조회 결과는 브라우저 쿼리 캐시의 전달 대상에서 제외한다.
- 첫 화면에 필요하고 클라이언트에서 계속 구독하거나 재검증하는 서버 데이터를 사전 조회했다면, `dehydrate`와 `HydrationBoundary`로 같은 쿼리의 캐시를 이어받는다. 조회를 완료한 상태를 전달하는 것을 기본으로 한다.
- 일반 React Router Framework Mode에서 서버 사전 조회가 필요한 쿼리는 `loader`에서 준비한다. 늦게 표시할 영역에는 사전 조회가 끝나면 하이드레이션 상태를 반환하는 Promise를 전달한다. `<Await>`에서 받은 상태를 그 영역의 `HydrationBoundary`에 전달한다. 같은 데이터의 재검증을 라우터와 TanStack Query가 중복 수행하지 않도록 갱신 주체를 정한다.
- 조회 완료 전에 주변 UI를 먼저 표시해야 하고 렌더링 환경이 Promise 전송을 지원하면 진행 중인 쿼리도 하이드레이션할 수 있다. 이때 `shouldDehydrateQuery`로 브라우저가 이어받을 쿼리를 명시하고 상태값만으로 모든 쿼리를 포함하지 않는다.
- 하이드레이션한 쿼리는 데이터를 사용하는 서비스 컴포넌트에서 구독한다. 순수 UI 컴포넌트에는 표시와 사용자 조작에 필요한 값이나 콜백만 Props로 전달한다. 클라이언트 쿼리가 재조회하는 데이터나 그 파생값을 Server Component에서 따로 렌더링하지 않는다. 같은 값을 별도의 Props나 `use()`로 읽을 Promise로 전달하지 않는다.
- 서버에서 사전 조회하지 않은 쿼리는 브라우저에서 조회할 수 있다. 사용자 상호작용 뒤에만 필요한 데이터는 초기 서버 렌더링에서 조회하지 않는다.
- 사용자별 데이터와 민감 데이터는 서버에서 인가를 확인한 뒤 화면과 기능에 필요한 필드만 선택한다. HTML, RSC Payload, Props, Loader 및 API 응답과 하이드레이션 상태에도 같은 기준을 적용한다. 하이드레이션할 쿼리는 조회 함수의 반환값에서 필요한 필드만 선택해 캐시에 넣는다. 구독 옵션인 `select`에 민감 필드 제거를 맡기지 않는다.
- 서버 요청 안에서의 데이터 재사용과 HTTP 응답 캐시를 각각 관리한다. 서버 QueryClient에서 사용자 데이터를 서로 다른 HTTP 요청 사이에 공유하지 않는다. 같은 요청 내 재사용이 필요하면 프레임워크의 요청 단위 캐시를 사용한다.
- 사용자마다 달라지는 HTML, RSC Payload, Loader 및 API 응답은 `Cache-Control: private, no-store`를 기본으로 한다. 개별 `fetch`의 캐시 설정과 별개로 실제 응답 헤더와 CDN 정책을 확인한다. 민감한 개인 데이터는 Next.js Data Cache, Full Route Cache, CDN과 외부 공유 캐시에 기본적으로 저장하지 않는다.
- React Router UI 라우트에서는 `loader`나 `action`에서 정한 캐시 헤더가 최종 응답에 반영되도록 `headers`에서 전달한다. 중첩 라우트의 헤더가 사용자별 응답을 공유 캐시에 저장하도록 바꾸지 않는지 확인한다.
- 브라우저 쿼리 캐시는 현재 세션의 계정과 조직에 부여된 접근 범위에서만 재사용한다. 계정이나 조직에 따라 응답이 달라지면 쿼리 키를 구분한다. 로그아웃하거나 계정 또는 조직을 바꿀 때 이전 범위에서 진행 중인 조회를 취소하고 캐시를 제거한다. 브라우저 저장소에 보관한 캐시가 있으면 함께 제거한다.
- Server Action, Route Handler, Pages API Route, `loader` 및 `action`은 각각 외부 요청을 받는 진입점으로 취급한다. 보호된 데이터를 조회하거나 변경할 때 입력을 검증하고, 서버 데이터 접근 함수에서 검증된 세션과 리소스별 권한을 확인한다. 브라우저가 전달한 사용자 ID, 조직 ID와 역할을 인가의 근거로 사용하지 않는다.
- Proxy나 Middleware는 요청의 사전 검사와 리다이렉트에 사용한다. Next.js에서는 Proxy의 `matcher`가 라우트를 제외해도 그 라우트의 Server Action과 API에 진입점의 인증 및 인가 검증을 적용한다.
- 쿠키 기반 인증에서 상태 변경을 `GET` 요청으로 처리하지 않는다. 세션 쿠키에는 서비스 흐름에 맞는 `SameSite`와 운영 환경의 `Secure`, `HttpOnly`를 설정한다. 쿠키 설정에 더해 상태 변경을 처리하는 서버에서 CSRF를 검증한다.
- Next.js Server Action의 출처 검사는 Route Handler와 Pages API Route에 적용되지 않는다. React Router Framework Mode의 `allowedActionOrigins`는 UI 라우트의 `action`에 적용되며 Resource Route에는 적용되지 않는다. 쿠키로 인증하는 상태 변경 요청이 프레임워크의 출처 검사 범위 밖에 있으면 서버에서 요청 출처와 세션 방식에 맞는 CSRF 토큰을 검증한다.
- 리버스 프록시 뒤에서 출처를 검증할 때는 신뢰하는 프록시가 설정한 호스트 정보와 서비스의 허용 목록을 사용한다. 프록시는 클라이언트가 보낸 전달 호스트 헤더를 신뢰할 값으로 덮어쓴다. `allowedOrigins`나 `allowedActionOrigins`로 허용 범위를 확장할 때는 실제로 상태 변경 요청을 보낼 출처만 추가한다.
- 서로 다른 두 계정이 같은 URL을 요청할 때 각 응답에 해당 계정이 볼 수 있는 데이터만 포함되는지 확인한다. 보호된 API는 화면을 거치지 않고 요청해도 권한 검사가 적용되는지 확인한다. 허용되지 않은 출처의 상태 변경 요청은 서버가 거부하는지 검증한다.

## 상세 & 사례

### 모듈 & FSD

서버에서 클라이언트 컴포넌트로 값을 전달하는 경우에는 프레임워크의 직렬화 조건을 적용한다.

아래 예시는 프로젝트 제목 편집에 필요한 모듈을 발췌한 코드이며 미실행 상태다. 예시에서 `@/`는 FSD 소스 루트의 import 별칭이다.

#### 서버와 브라우저가 사용하는 공개 진입점

서버와 브라우저에서 사용할 선언을 `index.server.ts`와 `index.browser.ts`로 분리한다. 아래 Next.js App Router 예시는 `_pages/project-edit` 슬라이스의 초기 편집 데이터 조회와 인터랙티브 화면을 별도 진입점으로 제공한다. `loadEditProject`는 편집 대상의 초기 제목을 반환하는 서버 조회 함수이며 세부 조회 구현은 생략했다. [FSD 실행 환경별 공개 API](https://feature-sliced.design/docs/reference/public-api#environment-specific-public-apis)

서버 진입점인 `_pages/project-edit/index.server.ts`와 서버 전용 데이터 접근을 수행하는 구현 파일에는 `server-only`를 적용한다. 브라우저 진입점인 `_pages/project-edit/index.browser.ts`에 `"use client"`를 선언하고 브라우저에서도 실행할 수 있는 화면만 내보낸다. 서버 라우트는 두 진입점을 조합하고 클라이언트 화면에 직렬화 가능한 값을 전달한다. Next.js의 실행 환경 검사는 파일명이 아니라 두 모듈의 import 관계와 프레임워크 표시에 근거한다. [Next.js 서버와 클라이언트 컴포넌트](https://nextjs.org/docs/app/getting-started/server-and-client-components)

`_pages/project-edit/index.server.ts`

```ts
import "server-only";

export { loadEditProject } from "./api/load-edit-project";
```

`_pages/project-edit/index.browser.ts`

```ts
"use client";

export { ProjectEditPage } from "./ui/project-edit-page";
```

`app/projects/[projectId]/edit/page.tsx`

```tsx
import { ProjectEditPage } from "@/_pages/project-edit/index.browser";
import { loadEditProject } from "@/_pages/project-edit/index.server";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { title } = await loadEditProject(projectId);

  return <ProjectEditPage projectId={projectId} initialTitle={title} />;
}
```

React Router Framework Mode에서는 `pages/project-edit/index.server.ts`가 `./api/load-edit-project.server`의 조회 함수를 내보낸다. `index.browser.ts`는 화면을 내보내며, 화면은 최초 서버 렌더링에서도 사용할 수 있게 작성한다. 다음 라우트 모듈은 서버 `loader`에서 조회하고 화면에는 조회한 값을 전달한다. [React Router 서버 모듈](https://reactrouter.com/api/framework-conventions/server-modules), [라우트 코드 분할](https://reactrouter.com/explanation/code-splitting)

```tsx
import { ProjectEditPage } from "@/pages/project-edit/index.browser";
import { loadEditProject } from "@/pages/project-edit/index.server";

import type { Route } from "./+types/project-edit";

export async function loader({ params }: Route.LoaderArgs) {
  const { title } = await loadEditProject(params.projectId);
  return { projectId: params.projectId, initialTitle: title };
}

export default function ProjectEditRoute({ loaderData }: Route.ComponentProps) {
  return (
    <ProjectEditPage
      projectId={loaderData.projectId}
      initialTitle={loaderData.initialTitle}
    />
  );
}
```

이 예시는 `projectId`가 필수인 라우트와 프레임워크가 생성한 라우트 타입을 전제로 한다. React Server Components를 사용하는 RSC Framework Mode에서는 `server-only` 등 해당 모드가 지원하는 서버 전용 모듈 표시를 적용한다. 서버 전용 모듈을 사용하는 import는 프레임워크 빌드에서도 검사한다. [React Router RSC](https://reactrouter.com/how-to/react-server-components)

### Hooks `useEffect`

Effect는 브라우저에서 실행되며 서버 렌더링에서는 실행되지 않는다. 서버에서 처리할 수 있는 조회와 리다이렉트를 브라우저의 Effect에서 수행하지 않는다.

#### 서버에서 판단하는 화면 이동

React Router에서 저장 성공 뒤 이동해야 한다면 action에서 `redirect()`를 반환하거나, 저장 완료를 확인한 이벤트 핸들러에서 `navigate()`를 호출한다. 페이지 진입 조건은 Data 또는 Framework Mode의 loader에서 먼저 판단한다.

Next.js App Router에서는 서버의 렌더링이나 저장 결과에 따른 이동에 Server Component와 Server Action의 `redirect()`를 사용한다. `redirect()`는 `NEXT_REDIRECT` 예외를 발생시키므로 일반 오류를 잡는 `try` 블록 밖에서 호출한다.

React Router의 `<Navigate>`는 내부에서 Effect를 사용하므로 loader의 리다이렉트와 실행 시점이 다르다.

#### 서버 렌더링에 사용하는 외부 저장소 스냅샷

서버 렌더링에도 사용하는 경우 서버와 브라우저의 최초 렌더링에서 같은 스냅샷을 사용하도록 `getServerSnapshot`을 제공한다.

이 예시에서 `readInitialOnline`은 서버 렌더링과 최초 하이드레이션에 사용할 `true`를 반환한다. 서버에서 스냅샷을 제공하는 경우에는 서버 렌더링과 최초 하이드레이션에서 같은 값을 읽도록 전달한다.

```tsx
import { useSyncExternalStore } from "react";

function subscribeOnline(notify: () => void) {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
}

function readOnline() {
  return navigator.onLine;
}

function readInitialOnline() {
  return true;
}

function useOnlineStatus() {
  return useSyncExternalStore(subscribeOnline, readOnline, readInitialOnline);
}
```

### 쿼리 데이터 관리

아래 예시는 TanStack Query 5.102.8을 기준으로 한다.

#### 서버와 브라우저가 공유하는 쿼리 설정

응답을 구분하는 식별자와 필터는 쿼리 키에 포함한다. 아래 예시에서 서버와 브라우저는 `types.ts`의 응답 타입, `exhibition-query-config.ts`의 쿼리 키와 `staleTime`을 공유한다. `exhibition-options.ts`에는 브라우저의 조회 함수를 연결한다. 조회 함수는 받은 취소 신호를 요청에 전달하고 조회에 실패하면 예외를 발생시킨다.

```ts
export type Exhibition = Readonly<{
  title: string;
  artworks: ReadonlyArray<Readonly<{ id: string; title: string }>>;
  guideEdition: string;
}>;
```

```ts
export function exhibitionQueryConfig(exhibitionId: string) {
  return {
    queryKey: ["exhibitions", "detail", exhibitionId] as const,
    staleTime: 30_000,
  };
}
```

```ts
import { queryOptions } from "@tanstack/react-query";

import { exhibitionQueryConfig } from "./exhibition-query-config";
import { getExhibition } from "./get-exhibition";

export function exhibitionOptions(exhibitionId: string) {
  return queryOptions({
    ...exhibitionQueryConfig(exhibitionId),
    queryFn: ({ signal }) => getExhibition(exhibitionId, signal),
  });
}
```

#### 서버에서 사전 조회하고 클라이언트에서 재검증하는 구성

클라이언트 쿼리가 재조회하는 데이터와 그 파생값은 그 쿼리를 구독하는 컴포넌트에서 표시한다. 같은 응답을 Server Component에서도 렌더링하면 클라이언트 재조회 뒤에 한 화면에서 서로 다른 값이 표시될 수 있다. Server Component는 사전 조회한 데이터를 `dehydrate`와 `HydrationBoundary`로 전달하고, 하위 컴포넌트에는 조회 대상을 식별하는 값만 Props로 전달한다.

아래 Next.js 예시에서는 Server Component를 렌더링할 때마다 서버용 QueryClient를 생성한다. 서버 조회 함수와 브라우저 조회 함수는 같은 쿼리 키에 같은 형식의 데이터를 반환한다.

브라우저에서 `QueryClientProvider`가 관리하는 QueryClient는 `HydrationBoundary`를 통해 캐시를 이어받는다. `dehydrate`는 기본적으로 성공한 쿼리를 포함한다. 사전 조회가 실패하면 `ExhibitionPanel`의 하위 컴포넌트가 조회와 상태 표시를 맡는다.

```tsx
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import { exhibitionQueryConfig } from "./exhibition-query-config";
import { ExhibitionPanel } from "./exhibition-panel";
import { getExhibitionOnServer } from "./get-exhibition.server";

export async function ExhibitionSection({
  exhibitionId,
}: {
  exhibitionId: string;
}) {
  const queryClient = new QueryClient();

  await queryClient
    .query({
      ...exhibitionQueryConfig(exhibitionId),
      queryFn: ({ signal }) => getExhibitionOnServer(exhibitionId, signal),
    })
    .catch(() => undefined);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ExhibitionPanel exhibitionId={exhibitionId} />
    </HydrationBoundary>
  );
}
```
