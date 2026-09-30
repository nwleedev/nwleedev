# React + TypeScript 프론트엔드 아키텍처 보고서
## Props Drilling 최소화 · Hooks 기반 DI / IoC / OCP · 실행 환경별 대응

- 작성 기준일: 2026-09-30
- 조사 방식: 공식 문서·라이브러리 공식 문서·실제 소스 코드(PR/테스트 코드)를 우선 참조했고, 블로그·커뮤니티 글은 보조로만 사용했습니다.
- 이 문서는 이전 대화 없이 단독으로 읽을 수 있도록 작성했습니다. 용어 정의와 배경도 포함합니다.
- 표기 규칙
  - **[공식]**: React / Next.js / React Router / TanStack / Zustand / Radix 등 1차 문서에서 확인한 내용입니다.
  - **[코드]**: 실제 저장소의 소스·테스트 코드에서 확인한 내용입니다.
  - **[커뮤니티]**: 블로그·개인 저장소 등 비공식 자료입니다. 참고용이며 근거로 삼기에는 약합니다.
  - **[판단]**: 조사 자료를 바탕으로 한 작성자의 설계 판단입니다. 공식 권장이 아닙니다.

---

## 0. 한눈에 보는 결론

1. **Props Drilling은 "Context 도입"이 첫 번째 해법이 아닙니다.** React 공식 문서의 순서는 (1) props로 명시적으로 전달 → (2) 컴포넌트 추출 후 JSX를 `children`으로 전달 → (3) 그래도 깊으면 Context입니다. 데이터를 쓰지 않는 중간 컴포넌트를 거치는 drilling은 컴포넌트 추출을 놓쳤다는 신호인 경우가 많다고 설명합니다.
2. **훅으로 DI/IoC를 구현하는 표준 형태는 "인터페이스(타입) + Context + `useXxx` 훅"입니다.** 컴포넌트는 구현체를 import하지 않고 훅이 돌려주는 인터페이스만 사용합니다. 구현체 결정은 상위 Provider가 담당합니다(제어의 역전). TanStack Query의 `QueryClientProvider` / `useQueryClient`가 이 패턴의 대표적인 실제 사례입니다.
3. **OCP(개방-폐쇄)는 "합성"으로 구현합니다.** 상속이 아니라 `children`/슬롯 props, `asChild`(Radix), Provider 교체, 렌더러 레지스트리로 기존 코드를 수정하지 않고 동작을 확장합니다.
4. **실행 환경이 바뀌면 제약이 달라집니다.** 특히 Next.js App Router에서는 Server Component에서 Context를 만들거나 읽을 수 없으므로, Provider는 `'use client'` 파일에 두고 서버 쪽 의존성은 다른 방식(함수 인자, `React.cache`, 프레임워크 제공 컨텍스트)으로 다뤄야 합니다.
5. **DI 컨테이너 라이브러리(Inversify 기반 등)는 기본값이 아닙니다.** 조사한 라이브러리는 모두 커뮤니티 자료이며 일부는 archive 상태입니다. 기본 전략은 Context + 훅이고, 컨테이너는 교체·테스트 요구가 실제로 커진 뒤에 검토하는 것이 안전합니다([판단]).
6. **React Compiler를 쓰면 Context 값 안정화용 `useMemo`/`useCallback`을 직접 관리할 부담이 줄어듭니다.** 다만 도입 여부와 범위는 프로젝트별로 검증해야 합니다.

---

## 1. 용어 정의 (이 문서에서의 의미)

| 용어 | 이 문서에서의 의미 |
| --- | --- |
| Props Drilling | 데이터를 쓰지 않는 중간 컴포넌트를 여러 층 거쳐 props를 전달하는 상황 |
| DI (의존성 주입) | 컴포넌트/훅이 필요한 협력 객체(API 클라이언트, 저장소, 분석 도구 등)를 직접 생성·import하지 않고 외부에서 받는 것 |
| IoC (제어의 역전) | "어떤 구현을 쓸지"에 대한 결정권이 사용하는 쪽이 아니라 상위(Provider, 앱 루트)에 있는 구조 |
| OCP (개방-폐쇄 원칙) | 확장에는 열려 있고 수정에는 닫혀 있는 구조. 새 동작을 추가할 때 기존 컴포넌트 코드를 고치지 않는 것을 목표로 함 |
| RSC | React Server Components. 서버에서만 실행되는 컴포넌트. Hook·Context를 쓸 수 없음 |
| Provider | Context 값을 하위 트리에 공급하는 컴포넌트 |
| Composition Root | 앱 진입점 근처에서 구현체를 조립해 Provider로 주입하는 위치 (이 문서의 표현, [판단]) |

---

## 2. 단계적 접근 전략 (환경과 무관한 공통 원칙)

아래 순서로 올라가고, 위 단계로 충분하면 멈춥니다. 각 단계는 앞 단계보다 결합이 "보이지 않게" 되므로 비용이 큽니다.

### 2.1 1단계 — props로 명시 전달 [공식]
- 공식 문서는 props를 먼저 쓰라고 권합니다. 데이터 흐름이 명시적이라 어떤 컴포넌트가 어떤 데이터를 쓰는지 드러나고, 유지보수자에게 유리하기 때문입니다.
- 열댓 개 props를 열댓 층 내려 보내는 일이 번거로워도 드문 일이 아니라고 문서가 인정합니다.

### 2.2 2단계 — 컴포넌트 추출 + children/슬롯 [공식]
- 중간 컴포넌트가 데이터를 쓰지 않고 넘기기만 한다면, JSX 자체를 `children`이나 `left`, `right` 같은 props로 내려 보내 중간 층을 없앱니다.
- React 요소는 객체이므로 props로 자유롭게 넘길 수 있습니다(슬롯 개념). 이전 React 문서(Composition vs Inheritance)는 이를 Containment(포함)와 Specialization(특수화)으로 설명하며, 상속 대신 합성을 권합니다. 해당 문서는 더 이상 갱신되지 않는 구 문서입니다.
- Next.js 공식 문서도 같은 패턴을 사용합니다. Client Component(`<Modal>`)가 `children` 슬롯을 열고, 서버에서 렌더링된 Server Component(`<Cart>`)를 그 안에 넣습니다.

### 2.3 3단계 — Context + 커스텀 훅 [공식]
- Context는 부모가 아래 트리 전체에 데이터를 제공하게 해 줍니다. 읽는 쪽은 `useContext`(또는 `use`)를 씁니다.
- 복잡한 화면은 reducer와 결합합니다. 공식 예제는 상태용 Context와 dispatch용 Context를 **분리**하고, Provider와 훅(`useTasks`, `useTasksDispatch`)을 별도 파일로 묶습니다. 분리하면 dispatch만 쓰는 컴포넌트가 상태 변경에 덜 민감해집니다([판단]).
- React 19 문서는 `<Context.Provider value>` 대신 `<Context value>` 형태로 Context 자체를 Provider로 쓰는 문법을 사용합니다.
- 커스텀 훅은 **로직을 공유하지 상태를 공유하지 않습니다.** 같은 훅을 여러 컴포넌트에서 호출하면 각각 독립된 상태를 갖습니다. 전역 공유가 필요하면 Context나 외부 스토어가 필요합니다.

### 2.4 4단계 — DI 컨테이너/외부 스토어 (필요할 때만) [판단]
- 구현체가 여러 개이고 교체·테스트 요구가 크거나, 의존성 그래프가 복잡할 때만 고려합니다.
- 구현체가 하나뿐이고 교체 필요가 없다면 인터페이스와 Provider는 과잉 추상화가 될 수 있습니다.

---

## 3. DI / IoC를 Hooks로 구현하는 패턴 (환경 공통)

> 아래 코드는 본 보고서 작성자가 공식 API 사용법을 바탕으로 작성한 예시입니다. 그대로 복사해 쓰기 전에 프로젝트의 React/TypeScript 버전에서 타입 검사를 통과하는지 확인해 주세요. 예시는 React 19 문법(`<Ctx value={...}>`)을 사용합니다.

### 3.1 패턴 A — 안전한 Context 훅 (Provider 누락 시 즉시 실패)

```tsx
// lib/create-safe-context.tsx
import { createContext, useContext } from 'react';

export function createSafeContext<T>(name: string) {
  const Ctx = createContext<T | null>(null);

  function useSafeContext(): T {
    const value = useContext(Ctx);
    if (value === null) {
      throw new Error(`${name}Provider 안에서 사용해야 합니다`);
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
// domain/post-repository.ts  (인터페이스: 도메인이 소유)
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

- **IoC 지점**: 구현체(`createHttpPostRepository`)를 고르는 곳은 앱 루트 Provider뿐입니다. 컴포넌트와 훅은 `PostRepository` 인터페이스만 압니다.
- 이 절차(어댑터 인터페이스 정의 → Context 생성 → 루트 Provider에서 구현 주입 → 훅으로 사용)는 커뮤니티 DI 가이드에서도 같은 순서로 소개됩니다[커뮤니티]. 공식 문서가 "DI"라는 이름으로 규정한 패턴은 아니며, Context의 정상적인 사용법을 DI 목적에 적용한 것입니다([판단]).

### 3.3 패턴 C — Provider에서 의존성 생성 (앱 루트, Composition Root)

```tsx
// app/providers.tsx
'use client'; // Next.js App Router에서는 필수 (5장 참조). SPA에서는 없어도 됩니다.

import { useState, type ReactNode } from 'react';
import { DepsContext, type Deps } from './deps';
import { createHttpPostRepository } from '@/infra/http-post-repository';

export function AppProviders({ children }: { children: ReactNode }) {
  // 렌더마다 새 객체가 만들어지지 않도록 lazy 초기화
  const [deps] = useState<Deps>(() => ({
    postRepository: createHttpPostRepository('/api'),
  }));

  return <DepsContext value={deps}>{children}</DepsContext>;
}
```

- `useState(() => create...())`로 인스턴스를 한 번만 만드는 방식은 Zustand 공식 Next.js 가이드가 스토어 Provider에서 사용하는 형태와 같습니다[공식].
- 주의: SSR 환경에서는 Client Component도 서버에서 한 번 렌더링됩니다. 의존성 생성 코드가 `window` 같은 브라우저 전용 API를 직접 쓰면 서버에서 실패합니다. 브라우저 전용 코드는 `client-only` 표시나 `useEffect` 내부로 격리합니다([판단], Next.js 문서의 `client-only` 안내 참조).

### 3.4 패턴 D — 테스트에서 의존성 교체

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { DepsContext } from '@/app/deps';
import { usePosts } from './use-posts';

const fakeDeps = { postRepository: { list: async () => [{ id: '1', title: 'x' }] } };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <DepsContext value={fakeDeps}>{children}</DepsContext>
  </QueryClientProvider>
);

test('posts를 가져온다', async () => {
  const { result } = renderHook(() => usePosts(), { wrapper });
  await waitFor(() => expect(result.current.data).toHaveLength(1));
});
```

- `renderHook`이 `wrapper` 옵션으로 Context Provider를 감싸는 것은 React Testing Library의 실제 테스트 코드에서 확인했습니다[코드].
- 테스트마다 새 `QueryClient`를 만드는 이유는 캐시가 테스트 사이에 공유되지 않게 하기 위해서입니다([판단]).

### 3.5 라이브러리 옵션 (참고용, 모두 비공식) [커뮤니티]

| 라이브러리 | 특징 | 판단 |
| --- | --- | --- |
| react-context-di | Context 위에 타입 안전한 컨테이너를 얹고, 테스트에서 컨테이너를 통째로 교체 | 작고 단순함. 채택 전 유지보수 상태 확인 필요 |
| react-facade | 훅 구현을 Context로 주입하는 실험적 라이브러리. 스스로 "experimental"이라 밝힘 | 프로덕션 근거로 약함 |
| react-injection (Inversify 기반) | HOC + `useInjection` | 저장소가 archive 상태. 신규 도입 비추천 |
| react-ioc | 계층형 DI, 데코레이터 사용, React 16 Context 기반 | 데코레이터/클래스 중심이라 현대 훅 스타일과 거리가 있음 |

---

## 4. OCP(개방-폐쇄)를 React에서 구현하는 기법

### 4.1 슬롯 / children — "구조는 고정, 내용은 외부에서" [공식]
- 컨테이너 컴포넌트(`Dialog`, `Sidebar`, `Modal`)는 내용을 모릅니다. 새 내용은 컨테이너를 수정하지 않고 자식으로 넣습니다.
- 특수화(예: `WelcomeDialog`)는 상속이 아니라 일반 컴포넌트(`Dialog`)를 props로 설정해서 렌더링하는 방식입니다.

### 4.2 asChild — "동작은 고정, 렌더링은 교체" [공식]
- Radix는 모든 DOM 렌더링 파트가 `asChild` prop을 받습니다. `true`이면 기본 DOM 요소를 렌더링하지 않고, 자식 요소를 복제해 필요한 props와 동작을 전달합니다.
- 디자인 시스템의 자체 컴포넌트(`MyButton`)에 동작(접근성, 이벤트)만 입히는 데 씁니다.
- 제약: 커스텀 컴포넌트는 받은 props를 반드시 DOM으로 펼쳐서(spread) 전달하고 ref도 전달해야 합니다. 요소 타입을 바꾸면 접근성 책임은 사용자에게 있습니다(예: 툴팁 트리거는 포커스 가능해야 함).
- OCP 관점: 동작 라이브러리는 수정하지 않고, 렌더링만 교체합니다.

### 4.3 Provider 교체 — "구현 교체" [공식 + 판단]
- 3장의 패턴 B/C가 여기에 해당합니다. 새 구현체(예: `createGraphqlPostRepository`)를 추가해도 `usePosts`와 컴포넌트는 수정하지 않습니다. Provider의 조립 코드만 바뀝니다.
- Context는 트리 일부에서 다른 Provider로 덮어쓸 수 있습니다. React 문서는 하위 트리의 값을 다른 Provider로 감싸 재정의하는 방식을 설명합니다. 페이지·기능 단위로 구현을 바꾸는 데 활용할 수 있습니다.

### 4.4 렌더러 레지스트리 — "새 타입 추가 시 기존 분기문 수정 없음" [판단]

```tsx
// features/feed/feed.tsx
import type { ComponentType } from 'react';

export interface FeedItem { id: string; type: string }
export type Renderers = Record<string, ComponentType<{ item: any }>>;

export function Feed({ items, renderers }: { items: FeedItem[]; renderers: Renderers }) {
  return items.map((item) => {
    const Renderer = renderers[item.type];
    return Renderer ? <Renderer key={item.id} item={item} /> : null;
  });
}
```

- 새 타입(예: 광고 카드)은 `renderers` 맵에 항목만 추가하면 됩니다. `Feed` 안의 `switch`를 고칠 필요가 없습니다.
- 이 패턴은 조사한 공식 문서에 이름이 붙은 형태로는 없었고, 위의 합성 원칙을 적용한 설계안입니다. `any` 사용은 예시 단순화를 위한 것이며, 실제로는 판별 유니온이나 제네릭으로 타입을 좁히는 것이 좋습니다.

---

## 5. 실행 환경별 대응

React 공식 문서는 새 프로젝트를 시작할 때 **프레임워크를 권장**합니다. 권장 목록은 Next.js(App Router), React Router v7, Expo(네이티브)입니다. 프레임워크로 맞지 않는 제약이 있거나 직접 만들고 싶다면 Vite, Parcel, Rsbuild 같은 빌드 도구로 처음부터 구성하는 방법도 공식 문서에 있습니다[공식]. 문서는 권장 프레임워크가 모두 CSR, SPA, SSG를 지원하고, 라우트 단위로 서버 렌더링을 나중에 켤 수 있다고 설명합니다.

### 5.1 환경 비교표

| 환경 | Context / Hook | DI 주입 위치 | 핵심 주의점 |
| --- | --- | --- | --- |
| **A. 클라이언트 전용 SPA** (Vite 등 빌드 도구, 프레임워크의 SPA 모드) | 제약 없음 | 앱 루트의 Provider | 3장 패턴을 그대로 적용. 서버 관련 제약 없음 |
| **B. Next.js App Router** (RSC 기본) | Client Component에서만 가능 | `'use client'` Provider(UI), 서버 코드는 함수 인자·`React.cache` | Server Component는 Context 불가, props 직렬화 필요, Provider는 트리 깊게 |
| **C. React Router v7 프레임워크/데이터 모드** | 컴포넌트는 일반 Context, loader/action은 별도 컨텍스트 | 컴포넌트: Provider / loader: `RouterContextProvider`·middleware | 컴포넌트용 Context와 라우터 컨텍스트가 이름이 같지만 다른 것 |
| **D. Expo/React Native** | 클라이언트 React와 동일한 규칙 | 앱 루트 Provider | 이번 조사에서 공식 자료 미확인 (추가 과제) |

### 5.2 환경 A — 클라이언트 전용 SPA

- 3장의 패턴(A~D)을 제약 없이 그대로 사용합니다.
- 서버 상태(API 데이터)는 TanStack Query 같은 캐시 라이브러리로, 의존성(Repository, 클라이언트, 설정)은 Context로 나눕니다([판단]). 두 종류는 변경 빈도와 수명이 다르기 때문입니다.
- 참고: Next.js 공식 SPA 가이드는 Next.js로도 SPA 패턴(`use()`+Context, SWR, TanStack Query 시딩, 브라우저 전용 렌더링, 셸로 라우팅 등)을 구현하는 방법을 제공합니다. 해당 가이드의 예제는 vercel-labs/next-spa-patterns 저장소에 실행 가능한 데모로도 공개돼 있습니다[공식].

### 5.3 환경 B — Next.js App Router (RSC)

Next.js 16.3.7 문서(2026-08-25 갱신) 기준입니다.

**B-1. Context는 Client Component에서만 가능합니다 [공식]**
- 레이아웃과 페이지는 기본적으로 Server Component이며, React Context는 Server Component에서 지원되지 않습니다.
- 해결: `children`을 받는 Client Component에서 Context를 만들고 Provider를 렌더링합니다. 그 Provider를 Server Component(`layout.tsx`)에서 import해 사용합니다.
- Provider는 트리에서 **가능한 한 깊게** 두라고 권합니다. `<html>` 전체가 아니라 `{children}`만 감싸면 정적 부분을 Next.js가 더 잘 최적화할 수 있습니다.
- `'use client'` 파일이 import하는 모듈과 직접 렌더링하는 컴포넌트는 클라이언트 번들에 포함됩니다. 반대로 `children` 등으로 전달된 Server Component는 그 모듈 그래프에 들어가지 않고 서버에서 렌더링된 결과로 전달됩니다.

**B-2. Server → Client로 데이터 전달 [공식]**
- 가장 단순한 방법은 props입니다. 단, Client Component로 넘기는 props는 React가 **직렬화**할 수 있어야 합니다. 함수·클래스 인스턴스 같은 것은 넘길 수 없다는 뜻이므로, 서버에서 구현체 자체를 Client로 넘겨 DI하는 방식은 쓸 수 없습니다.
- 그래서 DI 구현체(`createHttpPostRepository`)는 **Client Component 쪽 Provider 안에서 생성**합니다(3.3 패턴). 서버에서는 직렬화 가능한 설정값(URL 등)만 props로 내려 보내는 식으로 조합합니다([판단]).
- 서버에서 가져온 데이터를 여러 Client Component가 읽어야 하면, Promise를 Context에 담아 전달하고 `use()`로 푸는 패턴을 공식 문서가 제시합니다. Server Component가 Promise를 만들어 Client로 전달하면 리렌더 사이에서 안정적이지만, Client Component 안에서 만든 Promise는 렌더마다 재생성됩니다[공식, `use` 참조 문서].

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

// 소비 컴포넌트 (Suspense로 감싸서 사용)
// 'use client'
// const user = use(useUserPromise());
```

- 서버 쪽에서는 `await` 없이 Promise를 시작하고 Provider에 넘기며, 소비 쪽은 `<Suspense>`로 감쌉니다. 같은 요청 안에서 여러 곳이 같은 데이터를 읽으면 `React.cache`로 감싸 호출을 공유합니다[공식].
- 주의(React `use` 문서의 pitfall): 이 패턴을 Server Component와 함께 쓰면, Promise를 다시 가져오려면 그 Promise를 Context에 넣은 Server Component를 다시 가져와야 합니다. 그러므로 Promise를 트리 높은 곳에 넣지 말라고 경고합니다. (이 문구는 번역 사이트 판본에서 확인했으므로 추가 과제 3번에서 원문 재확인을 권합니다.)

**B-3. 서버 전용 코드 보호 [공식]**
- 서버 전용 모듈에는 `server-only` 패키지를 import하면, 그 모듈을 Client Component에서 import했을 때 빌드 타임 에러가 납니다. 비밀 키(`process.env.API_KEY`)가 클라이언트로 새는 사고를 막습니다.
- 반대로 `window` 등 브라우저 전용 코드에는 `client-only`를 씁니다. 두 패키지 설치는 Next.js에서는 선택 사항입니다.

**B-4. 서버 코드에서의 "DI"는 Context가 아닙니다 [판단]**
- Server Component에서는 Hook과 Context를 쓸 수 없으므로, 서버 코드의 의존성은 (1) 함수 인자로 전달, (2) 모듈 단위 팩토리, (3) `React.cache`로 요청 단위 메모이제이션 중 하나로 다루게 됩니다.
- Next.js 문서는 `React.cache`가 **현재 요청에만** 유효하다고 명시합니다. `'use cache'` 경계 안에서는 `React.cache`가 별도로 격리된 범위를 가지므로, 바깥에서 저장한 값이 안쪽에서 보이지 않습니다. 값은 함수 인자로 넘겨야 하고, 그 인자가 캐시 키의 일부가 됩니다[공식].
- 이 영역에 대해 Next.js가 "DI 컨테이너"를 권장하는 공식 문서는 이번 조사에서 찾지 못했습니다(추가 과제 1번).

**B-5. 상태 라이브러리와 결합할 때 [공식]**
- **Zustand**: 스토어는 기본적으로 전역 변수(모듈 상태)이지만, Next.js 서버는 여러 요청을 동시에 처리하므로 **요청마다 스토어를 새로 만들고** 요청 간 공유하면 안 된다고 안내합니다. 그래서 스토어 팩토리(`createStore`) + Context Provider 조합을 권합니다. React Server Component는 스토어를 읽거나 쓰면 안 된다고도 명시합니다. 이 가이드는 곧 개정될 예정이라는 안내가 붙어 있습니다.
- **TanStack Query**: App Router 가이드에서 서버에서는 `QueryClient`를 요청마다 새로 만들고, 브라우저에서는 하나를 재사용하는 `getQueryClient()` 패턴을 사용합니다. 서버에서 prefetch한 결과를 `dehydrate` → `HydrationBoundary`로 클라이언트에 넘깁니다. 서버 컴포넌트마다 새 `queryClient`를 만드는 것이 권장 방식이며, `cache()`로 요청 단위 단일 인스턴스를 재사용하는 방식도 허용됩니다. 이 두 라이브러리 모두 "인스턴스를 Provider에서 만들어 주입"하는 DI 형태입니다.

### 5.4 환경 C — React Router v7 (프레임워크/데이터 모드)

- **컴포넌트 트리**: 일반 React Context(3장)를 그대로 씁니다.
- **loader/action/middleware**: React Router는 `createContext`(react-router에서 import)로 **타입 안전한 라우터 컨텍스트**를 제공합니다. middleware에서 `context.set(userContext, user)`로 값을 넣고 `loader`에서 `context.get(userContext)`로 읽습니다. 값이 설정되지 않은 컨텍스트를 기본값 없이 읽으면 에러가 납니다[공식]. 이는 **서버측/라우트 실행 계층의 DI 통로**로 쓸 수 있습니다([판단]).
- 커스텀 서버를 쓸 때는 `getLoadContext`가 `RouterContextProvider` 인스턴스를 반환해야 하고, 여기에 `db` 같은 의존성을 `set`하는 예시가 문서에 있습니다[공식].
- 주의: React의 `createContext`와 react-router의 `createContext`는 이름이 같지만 별개입니다. 전자는 컴포넌트 트리용, 후자는 요청/응답 생명주기용입니다. 두 개를 혼동하지 않도록 import 경로를 명확히 합니다.
- 주의: middleware 활성화 방식(future 플래그 필요 여부, `context` 파라미터 타입 변경)이 문서 판본마다 달라 보였습니다. 도입 시 사용 중인 버전의 문서로 확인해야 합니다(추가 과제 4번).

### 5.5 환경 D — Expo / React Native

- React 공식 문서는 Expo를 네이티브 앱용 프레임워크로 권장합니다[공식]. 네이티브에서도 컴포넌트는 React이므로 3장의 Context + 훅 패턴은 원칙적으로 동일하게 적용될 것으로 보이나([판단]), 이번 조사에서 Expo/RN 고유의 DI 관련 공식 자료는 확인하지 못했습니다(추가 과제 6번).

---

## 6. 성능과 리렌더 (Context 기반 DI의 비용)

1. **Context 값이 바뀌면 소비자는 리렌더됩니다.** React 문서는 `memo`로 렌더를 건너뛰어도 Context로 전달된 새 값은 자식에게 전달된다고 명시합니다[공식].
2. **값의 참조 안정성**: Provider의 `value`에 매 렌더 새 객체를 만들어 넣으면 모든 소비자가 리렌더됩니다. 공식 문서에는 객체·함수를 Context로 전달할 때 `useMemo`/`useCallback`으로 최적화하는 절이 있습니다. 3.3 패턴처럼 `useState(() => ...)`로 한 번만 만든 의존성 객체는 이 문제를 피합니다.
3. **React Compiler**: 빌드 타임에 자동으로 메모이제이션을 적용하는 도구로, 공식 문서는 사용 시 수동 `useMemo`/`useCallback`/`memo`를 제거할 수 있다고 설명합니다. 수동 메모이제이션을 남기면 컴파일러가 이를 분석하고, 자동 추론 결과와 맞지 않으면 그 컴포넌트의 최적화를 건너뜁니다[공식]. 도입 범위와 Context 패턴과의 상호작용은 프로젝트에서 직접 검증해야 합니다(추가 과제 2번).
4. **Provider 분리**: 의존성(거의 안 바뀜)과 상태(자주 바뀜)를 서로 다른 Context로 분리하면 리렌더 범위를 줄일 수 있습니다. 공식 reducer+Context 예제가 상태/dispatch를 분리하는 것과 같은 원리입니다.
5. **`use()`와 `useContext`**: `use`는 조건문·반복문 안에서도 호출할 수 있는 점이 Hook과 다릅니다. 단, 컴포넌트나 Hook 안에서만 호출해야 합니다[공식].

---

## 7. 안티패턴 체크리스트

1. **모든 것을 Context로 올리기**: 공식 문서가 먼저 props와 컴포넌트 추출을 시도하라고 권합니다. 데이터 흐름이 숨겨지고 리렌더 범위가 커집니다.
2. **Provider 누락 시 기본값으로 조용히 통과**: 3.1처럼 예외를 던져 즉시 발견되게 합니다([판단]).
3. **하나의 거대한 `AppContext`에 모든 서비스·상태 혼합**: 변경 빈도가 다른 값을 분리합니다.
4. **Next.js에서 서버로 구현체를 만들어 props로 전달**: 직렬화 불가로 실패합니다. Client Provider 안에서 생성하고, 서버에서는 직렬화 가능한 설정만 전달합니다.
5. **Next.js에서 스토어/QueryClient를 모듈 전역에 두고 서버에서 공유**: 요청 간 상태가 섞입니다(Zustand·TanStack Query 문서 공통 경고).
6. **`'use client'`를 최상단 레이아웃 전체에 남발**: 클라이언트 번들이 커집니다. 상호작용이 필요한 리프 컴포넌트에만 붙이라고 문서가 안내합니다.
7. **인터페이스 하나에 구현체 하나뿐인데 추상화 계층 추가**: 교체·테스트 요구가 없으면 과잉 설계입니다([판단]).
8. **`asChild` 사용 시 props/ref 미전달**: Radix 컴포넌트가 동작하지 않거나 접근성이 깨집니다.

---

## 8. 환경별 선택 흐름 (요약)

1. 새 프로젝트인가? → 공식 문서는 프레임워크(Next.js App Router / React Router v7 / Expo)를 권장합니다. 서버 기능이 전혀 필요 없고 학습·소규모라면 Vite 등 빌드 도구도 공식 문서에 있습니다.
2. 서버 컴포넌트(RSC)를 쓰는가?
   - 예 → 5.3(Next.js)을 따릅니다. Provider는 `'use client'` 파일에 두고 깊게 배치하며, 서버 의존성은 Context가 아닌 방식으로 다룹니다.
   - 아니오 → 5.2/5.4로 진행합니다.
3. props 전달이 깊어졌는가? → `children` 슬롯으로 중간 층을 없애는 것이 먼저이고, 그다음 Context입니다.
4. 구현체가 여러 개이거나 테스트에서 교체가 필요한가? → 3.2 패턴(인터페이스 + Context + 훅)을 적용합니다.
5. 동작은 재사용하고 렌더링은 교체하고 싶은가? → 4.2 `asChild` 또는 4.1 슬롯을 씁니다.
6. 새 종류가 계속 추가되는 목록/분기가 있는가? → 4.4 렌더러 레지스트리를 검토합니다.
7. 컨테이너 라이브러리가 정말 필요한가? → 위 1~6으로 해결되는지 먼저 확인합니다. 그래도 필요하다면 유지보수 상태를 확인한 뒤 도입합니다.

---

## 9. 도입 체크리스트

1. Provider 파일은 `providers.tsx` 하나로 모으고(Composition Root), Next.js에서는 `'use client'`를 붙입니다.
2. 인터페이스(포트)는 `domain/`, 구현체는 `infra/`처럼 분리해 훅이 구현체를 import하지 않게 합니다.
3. 모든 Context 훅은 Provider 누락 시 예외를 던집니다.
4. Provider의 `value`는 참조가 안정적이어야 합니다(`useState` lazy 초기화, `useMemo`, 또는 React Compiler).
5. 테스트는 `renderHook`/`render`의 `wrapper`로 fake 의존성을 주입하고, 테스트마다 캐시 인스턴스(QueryClient 등)를 새로 만듭니다.
6. 서버 전용 모듈에는 `server-only`를 import하고, 클라이언트 전용 모듈에는 `client-only`를 사용합니다.
7. 요청 간 공유되면 안 되는 인스턴스(스토어, QueryClient)는 서버에서 요청마다 새로 만듭니다.

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
- React (구 문서, 갱신 중단) — Composition vs Inheritance: https://legacy.reactjs.org/docs/composition-vs-inheritance.html
- Next.js — Server and Client Components (v16.3.7, 2026-08-25 갱신): https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js — Fetching Data (`React.cache`, `use` API): https://nextjs.org/docs/app/getting-started/fetching-data
- Next.js — 단일 페이지 애플리케이션 가이드 (`use` + Context Provider): https://nextjs.org/docs/app/guides/single-page-applications
- Next.js — `use cache` 지시어 (React.cache 격리): https://nextjs.org/docs/app/api-reference/directives/use-cache
- React Router — middleware 가이드: https://reactrouter.com/how-to/middleware
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

## 11. 추가 과제 (불확실 / 추가 확인 필요)

1. **Next.js 서버 코드의 DI 공식 가이드 부재**: RSC/Route Handler/Server Action에서 서비스 계층을 교체 가능하게 만드는 공식 권장 패턴을 찾지 못했습니다. 현재 5.3의 B-4는 함수 인자·팩토리·`React.cache`라는 일반 기법을 조합한 작성자 판단입니다. Next.js·React 팀 자료와 실제 대형 오픈소스(예: 공식 예제 저장소)로 검증이 필요합니다.
2. **React Compiler와 Context 패턴의 상호작용**: 컴파일러가 Provider `value` 안정화를 어디까지 대체하는지, 그리고 `use()`+Context 패턴에서의 동작은 이번 조사에서 직접 확인하지 못했습니다. 도입 전에 컴파일러 플레이그라운드와 프로젝트 빌드로 검증해야 합니다.
3. **`use` 문서의 Server Component + Context pitfall 원문 확인**: "Promise를 트리 높은 곳에서 Context에 넣지 말라"는 경고와 "Server Component에서는 `use`로 Context를 읽을 수 없다"는 문구는 react.dev 번역 사이트 판본에서 확인했습니다. 원문(react.dev/reference/react/use) 최신본에서 동일한지 재확인이 필요합니다.
4. **React Router middleware 활성화 방식**: 프레임워크 모드에서 future 플래그가 필요한지, 데이터 모드에서 `context` 타입 보강(`Future` 인터페이스)이 필요한지가 문서 판본마다 다르게 보였습니다. 사용 버전의 문서로 확인해야 합니다.
5. **Zustand Next.js 가이드 개정 예고**: 가이드 상단에 곧 개정한다는 안내가 있었습니다. 도입 시점에 최신 권장 패턴(디스커션 #2740 결과)을 다시 확인해야 합니다.
6. **Expo / React Native**: 네이티브 환경에서의 Context 기반 DI, 라우터(Expo Router) 통합에 대한 공식 자료는 조사하지 못했습니다.
7. **외부 스토어 기반 주입**: `useSyncExternalStore`나 Zustand·Redux Toolkit으로 의존성을 주입하는 패턴, 그리고 Context 대비 리렌더 특성 비교는 공식 자료로 확인하지 않았습니다.
8. **대규모 프론트엔드 폴더 구조 사례**: Feature-Sliced Design, bulletproof-react 등에서 DI·OCP를 어떻게 구조화하는지는 1차 자료로 확인하지 못했습니다. 3.2의 `domain/infra` 분리는 [판단]입니다.
9. **컴파운드 컴포넌트 패턴**: OCP 기법으로 자주 언급되는 컴파운드 컴포넌트 패턴(Context로 부모-자식 협력)은 이번에 공식 문서 근거를 확보하지 못해 본문에서 다루지 않았습니다.
10. **DI 컨테이너 라이브러리의 현재 유지보수 상태**: 3.5의 라이브러리들은 이번 조사에서 최신 릴리스와 React 19 호환 여부를 확인하지 못했습니다. 도입을 고려한다면 npm 릴리스, 이슈, React 19 호환 여부를 직접 확인해야 합니다.
11. **`asChild` 패턴의 React 19 `ref` 변화**: Radix 문서 예시는 `forwardRef`를 사용합니다. React 19에서 `ref`를 prop으로 받는 방식과 Radix 최신 문서의 권장 형태는 이번에 확인하지 못했습니다.
