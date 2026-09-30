# React + TypeScript 프론트엔드 아키텍처 보고서

**결론:** React에서는 먼저 props와 `children`으로 값을 전달하고, 여러 단계 아래의 컴포넌트가 같은 값을 읽어야 할 때 Context를 검토한다. 의존성 주입은 props, Context 또는 함수 인자로 구성할 수 있다. 서버 렌더링 환경에서는 요청 사이에 사용자별 상태를 공유하지 않아야 한다.

작성 기준일: 2026-09-30

근거 표기: [공식]은 공식 문서, [코드]는 공개된 소스나 테스트, [커뮤니티]는 비공식 자료, [판단]은 자료를 토대로 제안한 설계를 뜻한다.

---

## 0. 요약

1. **Props Drilling에는 props 전달과 컴포넌트 추출부터 검토합니다.** React는 Context를 쓰기 전에 props나 JSX를 `children`으로 전달하는 방법을 안내합니다. 중간 컴포넌트가 값을 사용하지 않고 전달하기만 한다면 추출할 수 있는지 살펴봅니다. [공식]
2. **Context와 훅은 의존성을 전달하는 방법 중 하나입니다.** 상위 Provider가 구현체를 제공하고 하위 컴포넌트가 훅으로 읽게 할 수 있습니다. TanStack Query의 `QueryClientProvider`와 `useQueryClient`가 Context를 사용하는 사례입니다. [공식]
3. **합성으로 컴포넌트를 확장할 수 있습니다.** `children`, 슬롯 props, Radix의 `asChild`는 기존 컴포넌트의 코드를 바꾸지 않고 내용이나 렌더링 요소를 교체하는 데 쓰입니다. Provider나 렌더러 맵을 바꿔야 하는 경우에는 수정 지점을 따로 확인해야 합니다. [공식, 판단]
4. **실행 환경에 따라 사용할 수 있는 수단이 달라집니다.** Next.js App Router의 Server Component는 Context를 생성하거나 읽을 수 없습니다. React 19.3에서는 클라이언트 모듈이 내보낸 Context를 Server Component가 직접 렌더링할 수 있습니다. 사용하는 Next.js 버전에서 가능한지는 확인해야 합니다. [공식]
5. **DI 컨테이너는 필요가 확인될 때 검토합니다.** props, Context, 함수 인자로 해결할 수 있는지 먼저 확인합니다. 3.5절의 라이브러리는 모두 커뮤니티 구현이며 일부 저장소는 보관 처리되었습니다. [판단]
6. **React Compiler는 자동 메모이제이션을 제공합니다.** 새 코드에서 `useMemo`와 `useCallback`이 필요한 경우는 줄어들 수 있지만, 세밀한 제어가 필요하면 계속 사용할 수 있습니다. [공식]

---

## 1. 용어 정의 (이 문서에서의 의미)

| 용어 | 이 문서에서의 의미 |
| --- | --- |
| Props Drilling | 값을 쓰지 않는 중간 컴포넌트를 여러 층 거쳐 props를 전달하는 상황 |
| DI (의존성 주입) | 컴포넌트나 훅이 필요한 API 클라이언트나 저장소 구현체를 직접 생성하지 않고 외부에서 받는 방식 |
| IoC (제어의 역전) | "어떤 구현을 쓸지"에 대한 결정권이 사용하는 쪽이 아니라 상위(Provider, 앱 루트)에 있는 구조 |
| OCP (개방-폐쇄 원칙) | 새 동작을 추가할 때 기존 구현에서 수정해야 하는 부분을 줄이는 설계 원칙 |
| RSC | React Server Components. 서버에서 실행되며 상태와 effect를 사용하는 클라이언트 Hook을 호출할 수 없음. Context 생성과 읽기도 할 수 없지만, React 19.3에서는 클라이언트 모듈의 Context를 렌더링할 수 있음 |
| Provider | Context 값을 하위 트리에 공급하는 컴포넌트 |
| Composition Root | 앱 진입점 근처에서 구현체를 조립해 Provider로 주입하는 위치 (이 문서의 표현, [판단]) |

---

## 2. 단계적 접근 전략 (환경과 무관한 공통 원칙)

React 문서가 props, 컴포넌트 추출, Context를 검토하는 순서를 설명합니다. 외부 스토어와 DI 컨테이너를 그 뒤에 놓은 것은 이 보고서의 설계 제안입니다. 다른 수단이 필요한 문제가 확인되었을 때 추가 도구를 검토합니다.

### 2.1 1단계 — props로 명시 전달 [공식]
- React는 props를 먼저 쓰라고 권합니다. 어떤 컴포넌트가 어떤 값을 받는지 드러나기 때문입니다.
- 열댓 개 props를 열댓 층 내려 보내는 일이 번거로워도 드문 일이 아니라고 문서가 인정합니다.

### 2.2 2단계 — 컴포넌트 추출 + children/슬롯 [공식]
- 중간 컴포넌트가 값을 쓰지 않고 전달하기만 한다면, JSX 자체를 `children`이나 `left`, `right` 같은 props로 넘겨 불필요한 전달 단계를 없앱니다.
- React 요소는 props로 전달할 수 있습니다. 이전 React 문서(Composition vs Inheritance)는 이를 포함과 특수화의 예로 설명하며 상속 대신 합성을 권합니다. 이 문서는 더 이상 갱신되지 않습니다.
- Next.js 공식 문서도 같은 패턴을 사용합니다. Client Component(`<Modal>`)가 `children` 슬롯을 열고, 서버에서 렌더링된 Server Component(`<Cart>`)를 그 안에 넣습니다.

### 2.3 3단계 — Context + 커스텀 훅 [공식]
- Context를 제공하는 컴포넌트는 하위 트리에 값을 전달할 수 있습니다. 필요한 컴포넌트가 `useContext` 또는 `use`로 그 값을 읽습니다.
- 복잡한 화면은 reducer와 결합합니다. 공식 예제는 상태용 Context와 dispatch용 Context를 **분리**하고, Provider와 훅(`useTasks`, `useTasksDispatch`)을 별도 파일로 묶습니다. 분리하면 dispatch만 쓰는 컴포넌트가 상태 변경에 덜 민감해집니다([판단]).
- React 19 문서는 `<Context.Provider value>` 대신 `<Context value>` 형태로 Context 자체를 Provider로 쓰는 문법을 사용합니다.
- 커스텀 훅은 **로직을 공유하지 상태를 공유하지 않습니다.** 같은 훅을 여러 컴포넌트에서 호출하면 각각 독립된 상태를 갖습니다. 전역 공유가 필요하면 Context나 외부 스토어가 필요합니다.

### 2.4 4단계 — DI 컨테이너나 외부 스토어 (필요할 때만) [판단]
- 여러 구현체를 교체해야 하거나 의존성 관리가 실제로 복잡해졌다면 DI 컨테이너를 검토합니다. 빈번히 바뀌는 공유 상태 때문에 Context를 읽는 컴포넌트가 자주 다시 렌더링된다면 외부 스토어를 검토합니다.
- 구현체가 하나뿐이고 교체 필요가 없다면 인터페이스와 Provider는 과잉 추상화가 될 수 있습니다.

---

## 3. DI / IoC를 Hooks로 구현하는 패턴 (환경 공통)

아래 코드는 React 19의 `<Ctx value={...}>` 문법을 사용한 구성 예시입니다. 여러 파일로 나눈 예시이므로 import와 실행 환경에 따른 설정을 함께 확인해야 합니다.

### 3.1 패턴 A — 안전한 Context 훅 (Provider 누락 시 즉시 실패)

```tsx
// lib/create-safe-context.tsx
import { createContext, useContext } from 'react';

export function createSafeContext<T>(name: string) {
  const Ctx = createContext<T | null>(null);

  function useSafeContext(): T {
    const value = useContext(Ctx);
    if (value === null) {
      throw new Error(`${name} Provider 안에서 사용해야 합니다`);
    }
    return value;
  }

  return [Ctx, useSafeContext] as const;
}
```

- 근거: TanStack Query의 `useQueryClient`도 Provider가 없으면 예외를 던집니다[공식]. Next.js 공식 SPA 가이드의 `useUser` 예시도 같은 방식으로 Provider 누락을 에러로 처리합니다[공식].
- 이유: 기본값(`createContext(defaultValue)`)으로 조용히 넘어가면, 테스트나 배포에서 Provider를 빠뜨렸을 때 실제 구현 대신 엉뚱한 기본값이 쓰이는 사고가 납니다([판단]).

### 3.2 패턴 B — 포트(인터페이스) + 어댑터(구현체) + 훅

```tsx
// domain/post-repository.ts  (도메인 코드가 사용하는 인터페이스)
export interface Post { id: string; title: string }
export interface PostRepository {
  list(): Promise<Post[]>;
}

// infra/http-post-repository.ts  (구현체: 교체 가능)
export const createHttpPostRepository = (baseUrl: string): PostRepository => ({
  async list() {
    const res = await fetch(`${baseUrl}/posts`);
    if (!res.ok) throw new Error('목록 조회 실패');
    return res.json();
  },
});

// app/deps.tsx  (의존성 묶음 + 훅)
import { createSafeContext } from '@/lib/create-safe-context';
import type { PostRepository } from '@/domain/post-repository';

export interface Deps { postRepository: PostRepository }
export const [DepsContext, useDeps] = createSafeContext<Deps>('Deps');

// features/posts/use-posts.ts  (컴포넌트는 인터페이스만 안다)
import { useQuery } from '@tanstack/react-query';
import { useDeps } from '@/app/deps';

export function usePosts() {
  const { postRepository } = useDeps();
  return useQuery({ queryKey: ['posts'], queryFn: () => postRepository.list() });
}
```

- **IoC 지점:** 앱 루트 Provider가 `createHttpPostRepository`로 구현체를 만듭니다. `usePosts`는 `PostRepository` 타입으로 정의된 메서드를 호출합니다.
- 필요한 메서드의 타입을 정하고, Provider가 구현체를 전달하며, 훅에서 읽는 구성입니다. React가 이를 표준 DI 패턴으로 규정한 것은 아닙니다. [판단]

### 3.3 패턴 C — Provider에서 의존성 생성 (앱 루트, Composition Root)

```tsx
// app/providers.tsx
'use client'; // Next.js App Router에서는 필수 (5장 참조). SPA에서는 없어도 됩니다.

import { useState, type ReactNode } from 'react';
import { DepsContext, type Deps } from './deps';
import { createHttpPostRepository } from '@/infra/http-post-repository';

export function AppProviders({ children }: { children: ReactNode }) {
  // Provider 인스턴스가 유지되는 동안 같은 의존성 객체를 사용
  const [deps] = useState<Deps>(() => ({
    postRepository: createHttpPostRepository('/api'),
  }));

  return <DepsContext value={deps}>{children}</DepsContext>;
}
```

- `useState`의 초기화 함수로 Provider 인스턴스마다 의존성 객체를 만드는 구성은 Zustand의 Next.js 스토어 Provider 예시와 유사합니다. [공식]
- 초기 요청에서 Client Component도 서버에서 렌더링될 수 있습니다. 생성 함수가 `window` 같은 브라우저 API에 접근한다면 서버 렌더링 중 오류가 납니다. 브라우저에서만 실행할 모듈은 `client-only`로 표시하고, 실행 시점도 별도로 조정해야 합니다. [공식, 판단]

### 3.4 패턴 D — 테스트에서 의존성 교체

React Testing Library의 `wrapper` 옵션을 사용하면 테스트에서 별도의 Provider를 전달할 수 있습니다. `usePosts`를 검사한다면 `PostRepository`의 대체 구현을 전달하고 반환된 게시물 목록을 확인할 수 있습니다. TanStack Query 캐시가 다른 테스트에 영향을 주지 않도록 `QueryClient`는 테스트마다 따로 만듭니다. [코드, 판단]

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { DepsContext } from '@/app/deps';
import { usePosts } from './use-posts';

test('게시물 목록을 읽는다', async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const deps = {
    postRepository: { list: async () => [{ id: '1', title: '예시' }] },
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <DepsContext value={deps}>{children}</DepsContext>
    </QueryClientProvider>
  );

  const { result } = renderHook(() => usePosts(), { wrapper });
  await waitFor(() => expect(result.current.data).toEqual([{ id: '1', title: '예시' }]));
});
```

### 3.5 라이브러리 옵션 (참고용, 모두 비공식) [커뮤니티]

| 라이브러리 | 특징 | 판단 |
| --- | --- | --- |
| react-context-di | Context 위에 타입을 가진 컨테이너를 제공하고 테스트에서 교체할 수 있음 | 현재 유지보수 상태와 React 19 호환성 미확인 |
| react-facade | 훅 구현을 Context로 전달하는 실험적 라이브러리 | 실제 앱에 적용하기 전 안정성과 호환성 확인 필요 |
| react-injection (Inversify 기반) | HOC와 `useInjection` 제공 | 저장소가 보관 처리된 상태 |
| react-ioc | 계층형 DI와 데코레이터 사용 | React 19 호환성 미확인 |

---

## 4. OCP(개방-폐쇄)를 React에서 구현하는 기법

### 4.1 슬롯과 children: 컨테이너를 유지하고 내용을 교체 [공식]
- 컨테이너 컴포넌트(`Dialog`, `Sidebar`, `Modal`)는 내용을 모릅니다. 새 내용은 컨테이너를 수정하지 않고 자식으로 넣습니다.
- 특수화(예: `WelcomeDialog`)는 상속이 아니라 일반 컴포넌트(`Dialog`)를 props로 설정해서 렌더링하는 방식입니다.

### 4.2 asChild: 동작을 유지하고 렌더링 요소를 교체 [공식]
- Radix의 `asChild`를 제공하는 컴포넌트에서는 이를 `true`로 지정하면 기본 DOM 요소 대신 자식 요소에 필요한 props와 동작을 전달합니다.
- 디자인 시스템의 자체 컴포넌트(`MyButton`)에 동작(접근성, 이벤트)만 입히는 데 씁니다.
- 제약: 커스텀 컴포넌트는 받은 props와 ref를 실제 DOM 요소에 전달해야 합니다. 요소 타입을 바꾼다면 툴팁 트리거의 포커스 가능 여부처럼 접근성 조건도 확인해야 합니다.
- OCP 관점: 동작 라이브러리는 수정하지 않고, 렌더링만 교체합니다.

### 4.3 Provider 교체 — "구현 교체" [공식 + 판단]
- 3장의 패턴 B와 C에서는 다른 구현체를 Provider에 전달해도 `usePosts`를 수정할 필요가 없습니다. 대신 Provider의 조립 코드는 수정해야 합니다.
- 하위 트리를 다른 Provider로 감싸면 그 트리에서 읽는 Context 값을 바꿀 수 있습니다. React 문서가 설명하는 이 동작을 페이지나 화면 일부에 적용할 수 있습니다.

### 4.4 렌더러 등록표: 유형별 렌더링을 외부에서 지정 [판단]

목록 항목의 유형을 렌더러에 연결하는 등록표를 컴포넌트에 전달할 수 있습니다. 새 유형을 추가할 때 `Feed` 내부의 분기문을 바꾸지 않아도 되지만, 등록표를 만드는 코드는 수정해야 합니다. 등록되지 않은 유형을 어떻게 표시할지와 유형별 렌더러의 props를 어떻게 검사할지는 별도 설계가 필요합니다. 이 방법을 React의 공식 OCP 패턴으로 제시할 근거는 확인되지 않았습니다.

```tsx
import type { ReactNode } from 'react';

interface FeedItem {
  id: string;
  type: string;
}

type Renderers = ReadonlyMap<string, (item: FeedItem) => ReactNode>;

export function Feed({ items, renderers }: {
  items: FeedItem[];
  renderers: Renderers;
}) {
  return items.map((item) => (
    <section key={item.id}>{renderers.get(item.type)?.(item) ?? null}</section>
  ));
}
```

---

## 5. 실행 환경에 따른 구성

React는 새 프로젝트를 시작할 때 프레임워크를 권장하며 Next.js App Router, React Router v7과 Expo를 예로 듭니다. 직접 구성하려면 Vite, Parcel 또는 Rsbuild 같은 빌드 도구로 시작할 수도 있습니다. 사용할 렌더링 방식은 선택한 프레임워크의 설정과 배포 환경을 확인해 정해야 합니다. [공식]

### 5.1 환경 비교표

| 환경 | Context 사용 | 의존성을 제공하는 지점 | 주의할 점 |
| --- | --- | --- | --- |
| **A. 클라이언트 전용 SPA** | 컴포넌트에서 사용 가능 | 앱 루트의 Provider | 서버 요청 사이의 상태 공유 문제는 없음 |
| **B. Next.js App Router** | Client Component에서 읽음. React 19.3의 Server Component는 클라이언트 모듈의 Context를 렌더링 가능 | 클라이언트 Provider 또는 서버 함수의 인자 | 클라이언트에 전달할 props는 직렬화 조건을 충족해야 함 |
| **C. React Router v7 프레임워크 또는 데이터 모드** | 컴포넌트에는 React Context, loader와 action에는 라우터 context 사용 | 컴포넌트 Provider 또는 라우터 context | 두 `createContext`는 서로 다른 API |
| **D. Expo/React Native** | React Context 사용 가능 | 앱의 Provider | Expo 고유의 DI 구성은 확인되지 않음 |

### 5.2 환경 A — 클라이언트 전용 SPA

- 3장의 props와 Context 구성은 클라이언트 전용 앱에도 적용할 수 있습니다.
- 서버에서 조회한 값의 캐시와 재검증은 TanStack Query 같은 도구에 맡기고, 거의 바뀌지 않는 서비스 구현체는 Context로 전달하는 구성을 검토할 수 있습니다. 두 값은 변경 주기와 관리 방법이 다릅니다. [판단]
- Next.js의 SPA 가이드는 `use`와 Context, SWR, TanStack Query를 이용하는 예시를 제공합니다. [공식]

### 5.3 환경 B — Next.js App Router (RSC)

**B-1. Server Component와 Context [공식]**
- 레이아웃과 페이지는 기본적으로 Server Component입니다. Server Component는 Context를 생성하거나 읽을 수 없습니다. React 19.3에서는 `'use client'` 모듈에서 가져온 Context를 렌더링할 수 있습니다. 이 방법이 실제 앱에서 동작하는지는 사용하는 Next.js 버전에서 확인해야 합니다.
- 클라이언트 모듈에 `children`을 받는 Provider를 만들고 이를 서버 레이아웃에서 렌더링하는 방식도 사용할 수 있습니다.
- Provider는 트리에서 **가능한 한 깊게** 두라고 권합니다. `<html>` 전체가 아니라 `{children}`만 감싸면 정적 부분을 Next.js가 더 잘 최적화할 수 있습니다.
- `'use client'` 파일이 import하는 모듈은 클라이언트 번들에 포함됩니다. Server Component를 `children`으로 전달하면 그 컴포넌트를 Client Component가 직접 import하지 않아도 됩니다.

**B-2. 서버에서 클라이언트로 값 전달 [공식]**
- Server Component에서 Client Component로 전달하는 props는 React가 직렬화할 수 있어야 합니다. 일반적인 함수나 클래스 인스턴스를 구현체로 만들어 그대로 전달하는 방식은 이 조건에 맞지 않습니다.
- 3.3절의 HTTP 저장소 구현체는 Client Provider 안에서 만들 수 있습니다. 서버에서 클라이언트로 전달할 설정값은 직렬화 가능한 형태로 준비합니다. [판단]
- 여러 Client Component가 서버에서 시작한 같은 비동기 작업을 읽어야 한다면, Promise를 Context로 전달하고 각 컴포넌트에서 `use`로 읽는 공식 예시가 있습니다. 서버에서 만든 Promise를 전달하고 값을 읽는 컴포넌트는 Suspense 안에 둡니다.

```tsx
// app/user-provider.tsx  (예시: 공식 패턴을 축약)
'use client';
import { createContext, useContext } from 'react';

type UserPromise = Promise<{ name: string }>;
const UserContext = createContext<UserPromise | null>(null);

export function UserProvider({ userPromise, children }: {
  userPromise: UserPromise; children: React.ReactNode;
}) {
  return <UserContext value={userPromise}>{children}</UserContext>;
}

export function useUserPromise() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('UserProvider가 필요합니다');
  return ctx;
}

// 값을 읽는 Client Component는 Suspense 안에서 사용
// 'use client'
// const user = use(useUserPromise());
```

- 이 구성에서는 서버가 Promise를 시작하고 Client Component가 `<Suspense>` 안에서 값을 읽습니다. 같은 요청에서 호출을 재사용해야 한다면 `React.cache`를 사용할 수 있습니다. [공식]
- React는 이 방식에서 Promise를 다시 가져올 때 Context에 값을 넣은 Server Component도 다시 가져와야 한다고 설명합니다. 불필요하게 많은 화면을 다시 가져오지 않도록 Promise를 제공하는 위치를 정해야 합니다. [공식]

**B-3. 서버 전용 코드 보호 [공식]**
- 서버 전용 모듈에는 `server-only` 패키지를 import하면, 그 모듈을 Client Component에서 import했을 때 빌드 타임 에러가 납니다. 비밀 키(`process.env.API_KEY`)가 클라이언트로 새는 사고를 막습니다.
- 반대로 `window` 등 브라우저 전용 코드에는 `client-only`를 씁니다. 두 패키지 설치는 Next.js에서는 선택 사항입니다.

**B-4. 서버 코드의 의존성 전달 [판단]**
- Server Component에서 Context를 읽는 대신, 서버 함수에 의존성을 인자로 전달하거나 요청마다 팩토리 함수로 구현체를 만들 수 있습니다. `React.cache`는 요청 중 호출 결과를 재사용하는 수단이며 DI 컨테이너 자체는 아닙니다.
- Next.js 문서는 `React.cache`가 현재 요청에만 유효하다고 설명합니다. 이 보고서의 서버 측 의존성 구성은 Next.js가 공식 DI 패턴으로 제시한 것은 아닙니다.

**B-5. 상태 라이브러리와 결합할 때 [공식]**
- **Zustand**: 스토어는 기본적으로 전역 변수(모듈 상태)이지만, Next.js 서버는 여러 요청을 동시에 처리하므로 **요청마다 스토어를 새로 만들고** 요청 간 공유하면 안 된다고 안내합니다. 그래서 스토어 팩토리(`createStore`) + Context Provider 조합을 권합니다. React Server Component는 스토어를 읽거나 쓰면 안 된다고도 명시합니다. 이 가이드는 곧 개정될 예정이라는 안내가 붙어 있습니다.
- **TanStack Query**: App Router 가이드는 서버에서 QueryClient를 새로 만들고 브라우저에서는 이미 만든 QueryClient를 다시 쓰는 예시를 제공합니다. 서버에서 미리 조회한 값을 `dehydrate`와 `HydrationBoundary`로 클라이언트에 전달할 수 있습니다. 서버 컴포넌트마다 QueryClient를 만드는 방식 외에 `cache()`로 요청 안에서 재사용하는 방식도 설명합니다. [공식]

### 5.4 환경 C — React Router v7 (프레임워크/데이터 모드)

- **컴포넌트 트리**: 일반 React Context(3장)를 그대로 씁니다.
- **loader, action, middleware**: React Router의 `createContext`로 라우터 작업에서 읽고 쓸 값을 정의합니다. middleware의 `context.set(userContext, user)`와 loader의 `context.get(userContext)`가 공식 예시입니다. 기본값 없이 생성한 항목을 설정하기 전에 읽으면 오류가 납니다. 의존성을 전달하는 데에도 사용할 수 있습니다. [공식, 판단]
- 커스텀 서버를 쓴다면 `getLoadContext`에서 `RouterContextProvider` 인스턴스를 반환하고 필요한 값을 설정할 수 있습니다. [공식]
- React의 `createContext`는 컴포넌트가 읽는 값을 정의합니다. React Router의 동명 함수는 loader와 middleware 등이 읽는 값을 정의합니다.
- React Router v7에서 middleware를 사용하는 경우 `future.v8_middleware` 설정이 필요합니다. 프레임워크 모드와 데이터 모드의 설정 위치는 각각 다릅니다. [공식]

### 5.5 환경 D — Expo / React Native

- React는 새 네이티브 앱을 시작할 때 Expo를 권장합니다. Context와 훅을 사용한다는 기본 개념은 같지만, Expo Router에서 의존성을 제공할 위치는 여기서 확인되지 않았습니다. [공식, 판단]

---

## 6. 성능과 리렌더 (Context 기반 DI의 비용)

1. **Context 값의 변경**: Provider의 `value`가 달라지면 그 Context를 읽는 컴포넌트가 다시 렌더링됩니다. `memo`는 Context 변경으로 인한 렌더링을 막지 못합니다. [공식]
2. **객체 참조**: Provider가 렌더링될 때마다 새 객체를 `value`로 전달하면, 내용이 같더라도 다른 값으로 취급될 수 있습니다. React 문서는 객체와 함수를 전달할 때 `useMemo`와 `useCallback`을 사용하는 최적화 예시를 제공합니다. 3.3절처럼 Provider가 유지되는 동안 의존성 객체를 한 번 생성할 수도 있습니다. [공식]
3. **React Compiler**: 컴포넌트와 훅을 자동으로 메모이제이션합니다. 기존의 수동 메모이제이션을 제거하려면 동작을 확인해야 하며, 필요한 곳에는 `useMemo`와 `useCallback`을 계속 사용할 수 있습니다. Compiler가 Context를 사용하는 이 예시에 주는 효과는 별도 측정이 필요합니다. [공식]
4. **Context 분리**: 자주 바뀌는 상태와 거의 바뀌지 않는 의존성을 분리하면 변경의 영향을 받는 컴포넌트를 줄일 수 있습니다. React의 상태용 Context와 dispatch용 Context 분리 예시가 참고가 됩니다. [공식, 판단]
5. **`use`와 `useContext`**: `use`는 조건문과 반복문에서도 호출할 수 있습니다. 다만 컴포넌트나 다른 Hook 안에서 호출해야 합니다. [공식]

---

## 7. 안티패턴 체크리스트

1. **Context부터 도입**: React는 먼저 props와 컴포넌트 추출로 전달 단계를 줄일 수 있는지 살피라고 안내합니다.
2. **누락된 Provider를 기본값으로 감춤**: Provider가 반드시 필요한 서비스라면 3.1절처럼 누락을 오류로 드러냅니다. 기본값 자체가 유효한 경우에는 이 규칙을 적용하지 않습니다. [판단]
3. **변경 주기가 다른 값을 한 Context에 혼합**: 상태가 바뀔 때 그 상태가 필요하지 않은 컴포넌트까지 다시 렌더링될 수 있습니다. 값의 성격에 따라 분리합니다. [판단]
4. **직렬화할 수 없는 서버 구현체를 Client Component의 props로 전달**: 일반적인 함수와 클래스 인스턴스는 이 방식으로 전달하지 않습니다. 클라이언트에서 구현체를 만들거나 서버 함수가 필요한 작업을 수행하게 합니다. [공식, 판단]
5. **서버 요청 사이에 스토어 또는 QueryClient 공유**: 사용자별 상태와 캐시가 섞일 수 있으므로 요청마다 필요한 인스턴스를 만듭니다. [공식]
6. **필요 이상으로 높은 위치에 `'use client'` 선언**: 선언한 모듈이 가져오는 코드도 클라이언트 번들에 포함됩니다. 상호작용이 필요한 부분과 Provider가 필요한 위치를 기준으로 배치합니다. [공식]
7. **사용 목적 없이 추상화 추가**: 구현체 교체나 테스트에서 대체할 필요가 없다면 인터페이스와 Provider가 필요한지 다시 봅니다. [판단]
8. **`asChild`의 자식 컴포넌트가 props나 ref를 전달하지 않음**: 동작과 포커스 관리가 깨질 수 있습니다. [공식]

---

## 8. 환경과 전달 방식 선택

1. 실행 환경을 정합니다. React는 새 앱에 프레임워크를 권장하고, 직접 구성할 때는 Vite 등의 빌드 도구도 안내합니다. RSC를 사용한다면 선택한 프레임워크의 서버와 클라이언트 규칙을 확인합니다.
2. 값을 쓰지 않는 중간 컴포넌트가 props를 전달하기만 한다면 컴포넌트를 추출하거나 `children`으로 JSX를 전달할 수 있는지 살핍니다. 여러 곳에서 값을 읽어야 한다면 Context를 검토합니다.
3. 구현체를 교체할 필요가 있다면 props나 함수 인자로 충분한지 확인합니다. 여러 컴포넌트가 같은 구현체를 읽을 때는 3.2절의 Context와 훅 구성을 검토합니다.
4. 기존 컴포넌트의 내용을 바꾸려면 슬롯을, 렌더링 요소를 바꾸려면 바꿀 컴포넌트가 `asChild`를 받는지 확인합니다. 항목 유형이 계속 늘어난다면 4.4절의 등록표도 후보입니다.
5. DI 컨테이너를 도입하기 전에 필요한 교체 방식과 사용하려는 라이브러리의 유지보수 상태를 확인합니다.

---

## 9. 적용할 때 확인할 조건

1. Provider가 필요한 컴포넌트만 감싸고, Client Component가 import하는 모듈이 무엇인지 확인합니다.
2. 구현체 교체가 목적이라면 훅이 구체 구현을 import하지 않는지 확인합니다. `domain/`과 `infra/`는 가능한 파일 배치 예시이며 필수 구조는 아닙니다.
3. 기본값이 유효하지 않은 Context라면 Provider가 없을 때 오류를 드러냅니다.
4. Provider의 `value`가 매 렌더 새 객체가 되는지 확인합니다. 실제로 불필요한 렌더링이 발생한다면 생성 위치나 메모이제이션을 조정합니다.
5. 테스트에서 QueryClient 같은 캐시 인스턴스를 쓴다면 테스트 사이에 공유되지 않게 합니다.
6. Next.js에서 서버 전용 코드가 클라이언트에 포함되면 안 되는 경우 `server-only`를 사용합니다. 브라우저 API를 쓰는 모듈은 서버에서 실행되지 않도록 구성합니다.
7. 서버에서 사용자별 상태를 담는 스토어나 QueryClient를 사용한다면 요청 사이에 공유하지 않습니다.

---

## 10. 출처

### 10.1 1차 공식 문서
- React — Passing Data Deeply with Context: https://react.dev/learn/passing-data-deeply-with-context
- React — Scaling Up with Reducer and Context: https://react.dev/learn/scaling-up-with-reducer-and-context
- React — useContext: https://react.dev/reference/react/useContext
- React — use: https://react.dev/reference/react/use
- React — Reusing Logic with Custom Hooks: https://react.dev/learn/reusing-logic-with-custom-hooks
- React — Creating a React App (프레임워크 권장): https://react.dev/learn/creating-a-react-app
- React — React Compiler 소개: https://react.dev/learn/react-compiler/introduction
- React — React Compiler 1.0: https://react.dev/blog/2025/10/07/react-compiler-1
- React — React 19.3: https://react.dev/blog/2026/09/09/react-19-3
- React (구 문서, 갱신 중단) — Composition vs Inheritance: https://legacy.reactjs.org/docs/composition-vs-inheritance.html
- Next.js — Server and Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js — Fetching Data (`React.cache`, `use` API): https://nextjs.org/docs/app/getting-started/fetching-data
- Next.js — 단일 페이지 애플리케이션 가이드 (`use` + Context Provider): https://nextjs.org/docs/app/guides/single-page-applications
- Next.js — `use cache` 지시어 (React.cache 격리): https://nextjs.org/docs/app/api-reference/directives/use-cache
- React Router — middleware 가이드: https://reactrouter.com/how-to/middleware
- React Router — Updating from v7: https://reactrouter.com/upgrading/v7
- React Router — createContext API: https://reactrouter.com/api/utils/createContext.md
- React Router — RouterContextProvider API: https://reactrouter.com/api/utils/RouterContextProvider.md
- TanStack Query — Advanced Server Rendering: https://tanstack.com/query/v5/docs/framework/react/guides/advanced-ssr
- TanStack Query — useQueryClient: https://tanstack.com/query/v5/docs/framework/react/reference/functions/useQueryClient
- Zustand — Setup with Next.js: https://zustand.docs.pmnd.rs/guides/nextjs
- Radix Primitives — Composition (`asChild`): https://www.radix-ui.com/primitives/docs/guides/composition

### 10.2 실제 소스 코드 / 공식 조직 저장소
- React Testing Library `renderHook` `wrapper` 옵션 (PR #991 및 테스트 코드): https://github.com/testing-library/react-testing-library/pull/991/files
- Vercel Labs — Next.js SPA 패턴 데모: https://github.com/vercel-labs/next-spa-patterns

### 10.3 커뮤니티 자료 (보조, 근거로는 약함)
- Dependency Injection in React 가이드: https://codedrivendevelopment.com/posts/dependency-injection-in-react
- react-context-di: https://github.com/zavvdev/react-context-di
- react-facade: https://github.com/garbles/react-facade
- react-injection (archive): https://github.com/luvies/react-injection
- react-ioc: https://github.com/gnaeus/react-ioc

---

## 11. 적용 환경에 따라 달라지는 항목

- **Next.js와 React 19.3 조합:** Server Component가 클라이언트 모듈의 Context를 직접 렌더링하는 React 19.3의 방식을 어느 Next.js 버전에서 사용할 수 있는지는 확인되지 않았습니다. 사용할 수 없는 버전에서는 Client Provider 컴포넌트를 사용합니다.
- **React Compiler:** 3.3절 Provider의 `value`가 실제 빌드에서 어떻게 처리되는지는 Compiler 설정과 컴파일 대상에 따라 다릅니다. 성능 판단에는 렌더링 횟수 측정이 필요합니다.
- **Expo:** Expo Router를 비롯한 실행 환경에서 의존성을 어디서 생성하고 전달할지는 이 보고서의 사례만으로 결정할 수 없습니다.
- **DI 라이브러리:** 3.5절 라이브러리의 최신 릴리스와 React 19 호환 여부는 확인되지 않았습니다.
- **Radix와 React 19:** `asChild`를 적용하는 자식 컴포넌트의 ref 전달 방식은 사용하는 Radix 버전의 문서에 맞춰야 합니다.
