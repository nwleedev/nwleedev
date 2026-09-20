# Astro, FSD와 Tailwind CSS 구현 규칙

결론은 Astro의 정적 렌더링을 기본으로 유지하고, FSD의 참조 방향과 Tailwind CSS 디자인 토큰을 함께 적용하는 것이다. UI 재사용은 모든 마크업을 공통 컴포넌트로 바꾸는 방식이 아니라, 같은 의미와 접근성 규칙이 반복될 때 Astro 컴포넌트로 추출한다.

상태는 `current`다. 이 문서는 개발자 소개 사이트를 구현하거나 검토하는 사람에게 적용한다. `AGENTS.md`는 FSD 준수, 순환 참조 금지, 말단 UI 재사용, 구체적인 타입, 정적으로 식별할 수 있는 Tailwind CSS 클래스와 디자인 토큰을 요구한다. `docs/designs/developer-portfolio-f4b7/decisions/terms-storage.md`는 문구 저장 방식을, `docs/designs/developer-portfolio-f4b7/requirements.md`는 단일 칼럼과 시각 규칙을 정한다.

현재 패키지와 잠금 파일에는 Astro 7.3.3, Tailwind CSS 및 `@tailwindcss/vite` 4.3.3, TypeScript 6.0.3이 있다. 외부 동작의 최초 조사일은 2026-09-20이다. 이 문서는 의존성 변경을 승인하지 않는다. 예시는 원칙을 설명하며 현재 코드가 이미 새 단일 칼럼 요구를 충족한다는 증거는 아니다.

## 모듈 구성

Astro는 `src/pages`를 라우팅에 사용하고 FSD도 Pages 레이어를 정의하므로 두 역할을 같은 폴더에 넣지 않는다. FSD의 Astro 안내처럼 Astro 라우트는 `src/pages`, 화면 구현은 `src/_pages`에 둔다. `src/pages/index.astro`에는 화면 조립, 문구 선택이나 표시 규칙을 넣지 않고 `_pages`의 진입 컴포넌트만 렌더링한다.

```text
src/
  pages/
    index.astro
  _pages/
    home/
      ui/
        HomePage.astro
      index.ts
  shared/
    styles/
      global.css
    terms/
      ko.json
    ui/
```

FSD 공식 Astro 문서는 같은 이름의 충돌을 피하려고 `_pages`를 사용하고 Astro 라우트를 얇게 유지한다. 근거는 FSD 문서 저장소의 [고정 리비전](https://github.com/feature-sliced/documentation/blob/0a2423e311b6c97f2dfcb11c98df179c41914448/src/content/docs/docs/guides/tech/with-astro.mdx)이다. Astro도 `src/pages`만 예약하고 다른 `src` 폴더는 재구성할 수 있다고 설명한다. 근거는 Astro 문서 저장소의 [프로젝트 구조 문서](https://github.com/withastro/docs/blob/16fe0736aa4dc53b5b7e40acf3a2527e09106141/src/content/docs/en/basics/project-structure.mdx)다.

### 라우트에 화면 구현을 넣지 않는다

다음 코드는 Astro 라우트와 FSD Page의 역할을 다시 합친다. 다른 언어 주소나 오류 페이지가 생기면 같은 조립 규칙을 복사하게 되고, 라우트 파일을 거치지 않고 재사용하기도 어렵다.

```astro
---
// src/pages/index.astro
import { terms } from "@/shared/terms/ko";
import SectionHeader from "@/shared/ui/SectionHeader.astro";
---

<main>
  <SectionHeader title={terms.experience.title} />
  <!-- 화면 전체 구현 -->
</main>
```

라우트는 FSD Page가 제공하는 컴포넌트만 렌더링한다.

```astro
---
// src/pages/index.astro
import { HomePage } from "@/_pages/home";
---

<HomePage locale="ko" />
```

구현 담당자는 라우트 파일에 FSD Page import와 렌더링 외의 코드가 생겼는지 확인한다. 정적 분석 도구는 아직 정해지지 않았다. 최종 검토 담당자는 라우트별 조립 코드 중복과 `_pages` 우회를 검토해야 하며, 담당자는 `needs human input` 상태다.

### 상위 레이어를 역참조하거나 같은 레이어의 다른 슬라이스를 직접 참조하지 않는다

FSD는 한 레이어의 모듈이 더 낮은 레이어만 참조하도록 규정한다. Shared가 Page를 가져오거나 서로 다른 Page 슬라이스가 직접 연결되면 순환 참조가 없어도 변경 영향이 양방향으로 번진다. 공식 근거는 FSD 문서 저장소의 [Layers 리비전](https://github.com/feature-sliced/documentation/blob/0a2423e311b6c97f2dfcb11c98df179c41914448/src/content/docs/docs/reference/layers.mdx)이다.

```ts
// src/shared/ui/SectionHeader.ts
import { homeSections } from "@/_pages/home/model/sections";

export const getExperienceTitle = () => homeSections.experience.title;
```

Shared UI는 Home Page가 사용하는 문구나 항목을 알지 않는다. 호출하는 Page가 필요한 값을 전달한다.

```astro
---
// src/shared/ui/SectionHeader.astro
interface Props {
  id: string;
  title: string;
}

const { id, title } = Astro.props;
---

<header>
  <h2 id={id}>{title}</h2>
</header>
```

다른 슬라이스의 내부 파일까지 들어가는 import도 사용하지 않는다. 각 슬라이스는 `index.ts`에서 외부에 제공할 모듈을 제한한다. 순환 참조와 레이어 참조 방향은 나중에 FSD 검사 도구를 채택하면 기계적으로 확인할 수 있지만, 현재는 검사 도구와 명령이 없다. 도구 도입 전에는 변경된 import를 검토하고 `src/shared`가 `_pages`, `widgets`, `features` 또는 `entities`를 가져오지 않는지 확인한다.

### 이름만 있는 FSD 레이어와 슬라이스를 미리 만들지 않는다

FSD 준수는 모든 레이어를 만드는 일이 아니다. FSD 2.1은 Pages-first를 따르며 한 화면에서만 쓰는 구현을 Page에 둘 수 있다. 현재 사이트의 Experience, Open Source와 Contact는 사용자 행동을 구현하는 Feature가 아니다.

```text
src/
  features/
    show-experience/
    show-open-source/
    show-contact/
  entities/
    developer/
    company/
```

위 구성은 파일을 찾기 위해 의미 없는 레이어를 오가게 한다. 첫 구현은 Home Page 안에 각 영역을 두고, 서로 다른 Page에서 같은 큰 UI와 동작을 사용하게 될 때 Widgets 또는 Features 승격을 검토한다.

```text
src/_pages/home/ui/
  HomePage.astro
  IdentityBlock.astro
  ExperienceSection.astro
  OpenSourceSection.astro
  ContactSection.astro
```

예외는 이미 두 곳 이상에서 같은 의미, 상태와 변경 이유를 공유하거나 승인된 후속 화면도 같은 모듈을 사용해야 하는 경우다. 파일 모양이 비슷하다는 이유만으로 승격하지 않는다. FSD 공식 문서도 모든 레이어를 사용할 필요가 없고 재사용되지 않는 UI를 Page에 둘 수 있다고 명시한다. 검토자는 새 슬라이스의 현재 호출 위치와 함께 바뀌어야 하는 이유를 확인한다. 정적 분석만으로 재사용의 의미를 결정할 수 없다.

## Astro 렌더링과 브라우저 스크립트

### 정적 콘텐츠를 Client Island로 만들지 않는다

Astro 컴포넌트는 기본적으로 브라우저 런타임 없이 HTML을 만든다. `client:*` 지시문은 실제 브라우저 상태와 상호작용이 필요한 UI에만 사용한다. Identity, Experience, Open Source, Independent Work, Background와 Contact는 정적 콘텐츠이므로 Client Island 대상이 아니다. Astro의 동작 근거는 [Islands 문서의 고정 리비전](https://github.com/withastro/docs/blob/16fe0736aa4dc53b5b7e40acf3a2527e09106141/src/content/docs/en/concepts/islands.mdx)이며, 공식 포트폴리오 예제의 정적 Astro 컴포넌트 구성은 [Astro 저장소 리비전 db2eaf1](https://github.com/withastro/astro/tree/db2eaf17ce84a5f75c5eab30f4ae15af32de1a13/examples/portfolio/src)에서 비교했다.

```astro
---
import ExperienceSection from "./ExperienceSection.tsx";
---

<ExperienceSection client:load entries={entries} />
```

```astro
---
import ExperienceSection from "./ExperienceSection.astro";
---

<ExperienceSection entries={entries} />
```

UI를 재사용한다는 이유만으로 React, Preact, Vue 또는 Svelte를 추가하지 않는다. 브라우저에서 변하는 상태가 생기면 먼저 HTML과 CSS, 그다음 일반 `<script>`, 독립된 Custom Element, 마지막으로 UI 프레임워크 Island 순서로 비교한다. 복잡한 클라이언트 상태를 여러 컴포넌트가 함께 관리해야 할 때는 예외를 제안할 수 있지만, 의존성 추가와 `client:*` 사용은 별도 승인이 필요하다.

빌드 뒤 생성된 HTML에 개발자 이름, 경력, 사례와 연락처가 있는지 확인하고, 브라우저 Network 패널에서 정적 섹션 때문에 JavaScript 청크가 내려오지 않는지 확인한다. `client:*`의 필요성은 린트가 판단할 수 없으므로 검토자가 사용자 상호작용과 브라우저 상태를 근거로 결정한다.

### `is:inline`과 전역 DOM 검색으로 반복 컴포넌트를 초기화하지 않는다

Astro가 처리하는 일반 `<script>`는 TypeScript 변환, 번들링과 페이지 내 중복 제거를 제공한다. `is:inline`은 이 처리를 건너뛰고 컴포넌트 인스턴스마다 같은 스크립트 태그를 HTML에 삽입할 수 있다. Astro 문서 저장소의 [클라이언트 스크립트 문서](https://github.com/withastro/docs/blob/16fe0736aa4dc53b5b7e40acf3a2527e09106141/src/content/docs/en/guides/client-side-scripts.mdx)가 이 동작을 명시한다.

```astro
<button class="external-link">원문 보기</button>

<script is:inline>
  document.querySelector(".external-link")?.addEventListener("click", track);
</script>
```

이 코드는 컴포넌트가 반복되면 스크립트도 반복되며 첫 번째 요소만 찾는다. 단순한 링크에는 스크립트를 쓰지 않는다. 독립된 상태가 꼭 필요하면 Custom Element 인스턴스 안에서만 요소를 찾는다.

```astro
<tracked-link>
  <a href={href}><slot /></a>
</tracked-link>

<script>
  import { trackExternalLink } from "@/shared/lib/analytics";

  class TrackedLink extends HTMLElement {
    connectedCallback() {
      if (this.dataset.initialized === "true") return;

      const link = this.querySelector("a");
      if (!link) return;

      this.dataset.initialized = "true";
      link.addEventListener("click", () => trackExternalLink(link.href), { once: true });
    }
  }

  if (!customElements.get("tracked-link")) {
    customElements.define("tracked-link", TrackedLink);
  }
</script>
```

위 권장 예는 링크 클릭 추적이 승인된 경우만 적용한다. 현재 요구사항의 일반 외부 링크에는 첫 번째 예와 두 번째 예 모두 필요하지 않다. 검토자는 `is:inline`, `document.querySelector`와 `document.querySelectorAll` 사용처를 찾아 반복 인스턴스, 정리 방법과 표준 HTML 대안을 확인한다. 외부 서비스가 원문 스크립트 삽입을 요구하는 경우에는 `is:inline`을 허용할 수 있다.

### 단일 페이지에 ClientRouter를 추가하지 않는다

현재 사이트는 같은 문서 안의 앵커로 이동한다. 페이지 간 클라이언트 탐색이 없으므로 `ClientRouter`와 View Transitions는 필요하지 않다. Astro 5에서는 ClientRouter가 빌드 중 인라인된 모듈 스크립트를 다시 실행해 이벤트 리스너가 누적되는 문제가 보고됐고, [PR #12985의 병합 커밋 84e94cc](https://github.com/withastro/astro/commit/84e94cc85cc0f4ea9b5dba2009dc89e83a798f59)에서 실행한 스크립트를 추적하도록 수정됐다. 현재 버전에서 해결된 결함이지만, 필요 없는 라우터가 스크립트 수명주기와 확인할 경우의 수를 늘린다는 실제 사례다.

```astro
---
import { ClientRouter } from "astro:transitions";
---

<head>
  <ClientRouter />
</head>
```

```astro
<a href="/en/" lang="en" hreflang="en">English</a>
```

언어별 주소나 별도 페이지가 생기더라도 브라우저 기본 탐색이 요구사항을 충족하면 라우터를 추가하지 않는다. 페이지 전환 중 보존해야 할 상태와 전환 효과가 승인됐을 때만 다시 판단한다. 검토자는 `astro:transitions`, `ClientRouter`와 `astro:page-load` import를 확인한다. 이 금지 항목은 현재 요구사항에서는 문자열 검사로 찾을 수 있지만, 예외의 타당성은 브라우저 검토가 필요하다.

## Tailwind CSS

### 폐기된 Astro 통합을 설치하지 않는다

Tailwind CSS 4는 `@tailwindcss/vite`로 연결한다. `@astrojs/tailwind`는 폐기됐으며 Astro 5.2 이상 공식 문서는 Vite 플러그인을 사용하도록 안내한다. 근거는 Astro 문서 저장소의 [Tailwind CSS 안내](https://github.com/withastro/docs/blob/16fe0736aa4dc53b5b7e40acf3a2527e09106141/src/content/docs/en/guides/styling.mdx)다.

```ts
// 사용하지 않는다.
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [tailwind()],
});
```

```ts
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
```

설치 후 패키지 명세와 잠금 파일에서 `@astrojs/tailwind`가 없고 `tailwindcss`와 `@tailwindcss/vite`의 실제 해석 버전이 일치하는지 확인한다. 직접 의존성과 전이 의존성 전체 검토는 설치 작업에서 별도로 수행한다.

### 런타임 값으로 Tailwind 클래스 이름을 조합하지 않는다

Tailwind CSS는 빌드할 때 소스의 완성된 클래스 이름을 찾는다. 템플릿 문자열로 일부를 조합하면 CSS를 만들 수 없다. Tailwind 4.1.14에서 `lg:grid-cols-[${myWidth}px_auto]`가 생성되지 않은 재현 사례는 [이슈 #19045](https://github.com/tailwindlabs/tailwindcss/issues/19045)에 있으며, 유지보수자는 런타임에만 완성되는 클래스이므로 동작하지 않는다고 확인했다. 현재 공식 규칙은 Tailwind 문서 저장소의 [고정 리비전](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/detecting-classes-in-source-files.mdx)에서 확인했다.

```astro
---
interface Props {
  tone: "brand" | "muted";
}

const { tone } = Astro.props;
---

<a class={`text-${tone} hover:text-${tone}-hover`}>
  <slot />
</a>
```

variant 값마다 완성된 클래스 집합을 정하고, 마크업에서는 map에서 고른 문자열만 사용한다. `clsx`를 사용하기 위해 직접 의존성을 추가할 필요는 없다.

```astro
---
interface Props {
  tone: "brand" | "muted";
}

const { tone } = Astro.props;
const toneClasses = {
  brand: "text-brand-strong hover:text-brand-hover",
  muted: "text-text-muted hover:text-text-primary",
} satisfies Record<Props["tone"], string>;
---

<a class:list={["underline-offset-4 focus-visible:outline-2", toneClasses[tone]]}>
  <slot />
</a>
```

조건이 단순한 표시 여부라면 두 개의 완성된 컴포넌트 분기가 더 읽기 쉬운지도 비교한다. 사용자 입력으로 색상이나 폭을 연속적으로 바꿔야 한다면 제한된 CSS 사용자 정의 속성을 사용하고 허용 값의 타입과 단위를 검사한다. Tailwind safelist로 무제한 런타임 값을 흉내 내지 않는다.

현재 정밀하게 검사할 린트가 없다. 단순 정규식은 정상적인 JavaScript 템플릿 문자열까지 오탐하므로 도입하지 않는다. 검토자는 `class`, `class:list`와 variant map에서 모든 Tailwind 클래스가 완성된 문자열인지 확인하고, 빌드된 CSS와 대상 화면을 함께 확인한다.

### 확정된 값을 임의 값으로 반복하지 않는다

색상, 글꼴, 글자 크기, 여백과 본문 폭은 요구사항의 디자인 토큰을 사용한다. 같은 색상을 `text-[#C62A44]`처럼 여러 컴포넌트에 쓰면 색상 역할을 바꿀 때 누락이 생긴다. Tailwind CSS 4의 `@theme` 변수는 변수 이름에 맞는 유틸리티와 CSS 변수를 함께 만든다. 공식 설명은 [Theme variables 고정 리비전](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/theme.mdx)에서 확인했다.

```astro
<a class="text-[#C62A44] hover:text-[#B4233C]">원문 보기</a>
<p class="text-[#71717A]">{period}</p>
```

```css
@import "tailwindcss";

@theme {
  --color-brand-base: #ee5166;
  --color-brand-strong: #c62a44;
  --color-brand-hover: #b4233c;
  --color-text-primary: #18181b;
  --color-text-muted: #71717a;
  --font-sans: "Pretendard Variable", Pretendard, system-ui, sans-serif;
}
```

```astro
<a class="text-brand-strong hover:text-brand-hover">원문 보기</a>
<p class="text-text-muted">{period}</p>
```

한 컴포넌트에서 한 번 쓰는 계산값까지 모두 토큰으로 만들지는 않는다. 같은 의미로 반복되는 값만 토큰으로 승격한다. 폐기된 다중 칼럼 전환값을 `--breakpoint-*`나 Container Query로 다시 추가하지 않는다.

검토자는 새 임의 색상, 글꼴, 반복 여백과 `clamp()`가 요구사항의 기존 값으로 표현 가능한지 확인한다. 색상 문자열 검색은 누락 후보를 찾을 수 있지만, 새 값의 의미와 승격 여부는 디자인 검토가 필요하다.

### 배치가 바뀌지 않는 구성에 반응형 분기를 추가하지 않는다

현재 요구사항은 모든 화면 폭에서 단일 칼럼이다. 이전처럼 본문 옆에 수치나 보조 정보를 배치하기 위한 전환은 필요하지 않다. 다음 예는 현재 요구에 어긋나는 다중 열 전환을 추가한다.

```astro
<article class="grid gap-6 lg:grid-cols-[1fr_auto]">
  <div><slot /></div>
  <aside>{metadata}</aside>
</article>
```

```astro
<article class="grid gap-6">
  <div><slot /></div>
  <p class="text-sm text-text-muted">{metadata}</p>
</article>
```

Tailwind CSS 4는 부모의 실제 너비에 반응하는 `@container`와 일회성 `@min-[…]` variant를 제공한다. 근거는 [Responsive design 고정 리비전](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/responsive-design.mdx)이다. 기능을 제공한다는 이유만으로 사용하지 않는다. 이후 실제 배치 변화가 승인된 경우에만 viewport와 부모 가용 폭 가운데 어느 조건에 반응해야 하는지 판단한다.

브라우저에서 320px, 390px, 768px와 1440px의 한국어 및 영어 줄바꿈, 읽는 순서와 오버플로우를 확인한다. 200% 글자 확대도 별도로 확인한다. 이를 정확하게 대신할 린트 규칙은 없다.

### `@apply`로 Astro 컴포넌트와 별도의 UI 체계를 만들지 않는다

마크업의 Tailwind 클래스 대부분을 `.section-title`, `.metadata-line` 같은 클래스로 다시 감싸면 스타일의 출처가 Astro 컴포넌트와 CSS 두 곳으로 나뉜다. Tailwind는 `@apply`를 서드파티 UI 덮어쓰기처럼 사용자 정의 CSS가 필요한 경우에 사용할 수 있다고 설명한다. 컴포넌트의 scoped style에서 사용자 정의 theme을 참조하려면 `@reference`도 필요하다. 근거는 [Functions and directives 고정 리비전](https://github.com/tailwindlabs/tailwindcss.com/blob/7f92c2213315c195dae583d68752da4042da3ade/src/docs/functions-and-directives.mdx)이다.

```css
.metadata-line {
  @apply text-text-muted text-sm font-medium;
}
```

같은 의미, 마크업과 접근성 규칙이 반복되면 Astro 컴포넌트로 만든다.

```astro
---
interface Props {
  period: string;
  technologies: readonly string[];
}

const { period, technologies } = Astro.props;
---

<p class="text-sm text-text-muted">
  <span>{period}</span>
  <span>{technologies.join(", ")}</span>
</p>
```

서드파티 마크업을 수정할 수 없거나 CSS 가상 요소, 복잡한 selector나 특정 브라우저 API 사용을 일반 CSS가 더 분명하게 설명하는 경우에는 일반 CSS를 사용할 수 있다. 검토자는 `@apply`마다 Astro 컴포넌트나 일반 CSS보다 분명한 이유가 있는지 확인한다.

## 컴포넌트와 타입

### 시각적으로 비슷하다는 이유만으로 하나의 범용 컴포넌트로 합치지 않는다

`SectionHeader`, `MetadataLine`과 `ExternalTextLink`는 여러 영역에서 같은 의미와 접근성 규칙을 반복하므로 Shared UI로 유지한다. 반면 `IdentityBlock`, `CompanyExperience`와 `ContributionBlock`은 Home Page의 정보 구조를 표현한다. 이들을 `Card` 하나로 합치면 서로 다른 읽는 순서를 boolean prop 조합으로 처리하게 된다. 수치 강조가 사라진 뒤에는 `MetricStatement`를 재사용 후보로 남기지 않는다.

```astro
<Card
  metric
  compact={false}
  showMetadata
  horizontal={wide}
  rounded={false}
  item={contribution}
/>
```

```astro
<ContributionBlock contribution={contribution} />
<IndependentWorkEntry work={work} />
```

말단 요소를 재사용하되, 같은 테두리와 여백을 쓴다는 이유로 내용 구조가 다른 영역을 합치지 않는다. 추출 전에는 최소 두 사용처의 의미, 필수 정보, 상태, 키보드 동작과 함께 변경될 이유를 비교한다. 이 판단은 린트나 중복 코드 수치만으로 결정할 수 없다.

### `any`, `object`와 열린 `Record`로 콘텐츠 모양을 숨기지 않는다

Astro는 `Props` 인터페이스를 인식하고 `astro check`로 `.astro`와 `.ts` 파일을 함께 검사한다. 공식 근거는 [Astro TypeScript 문서](https://docs.astro.build/en/guides/typescript/)다. `object`와 `Record<string, any>`는 기여 본문의 필수 필드를 확인하지 못하게 한다.

```astro
---
interface Props {
  contribution: object;
  metadata: Record<string, any>;
}

const { contribution, metadata } = Astro.props;
---
```

실제 콘텐츠의 필수 값을 구체적인 타입으로 작성한다. 표현이 하나라면 불필요한 variant를 만들지 않는다. 여러 표현이 실제로 필요한 경우에만 판별 가능한 union을 사용한다. 다음은 단일 칼럼 변경에 적용할 타입 예시다.

```ts
type Metadata = {
  technologies: readonly string[];
  period: string;
};

type Contribution = {
  title: string;
  paragraphs: readonly string[];
  metadata: Metadata;
};
```

외부 라이브러리의 타입이 `unknown`을 반환하면 사용 지점에서 검사해 구체적인 내부 타입으로 바꾼다. HTML 속성을 전달하는 컴포넌트는 임의 `Record` 대신 Astro가 제공하는 `HTMLAttributes<"a">` 같은 타입을 사용한다. `package.json`의 `pnpm check`로 Astro 타입을 검사하고 `pnpm build`로 정적 HTML을 생성한다. 타입만으로 빈 문단과 번역 누락을 판별할 수 없으므로 기존 JSON 검사도 함께 유지한다.

## 최종 확인

구현 담당자는 등록된 `pnpm check`와 `pnpm build`를 실행하고 성공 여부와 오류를 남긴다. 브라우저 검토에서는 개발자 이름, 경력과 연락처가 JavaScript 없이 보이는지, 320px와 200% 글자 확대에서 정보가 사라지지 않는지, 링크와 포커스 표시를 키보드로 사용할 수 있는지 확인한다.

최종 검토 담당자는 다음을 확인한다.

- `src/pages`가 라우팅 진입 역할만 하는가
- Shared가 상위 FSD 레이어를 참조하거나 슬라이스 내부 파일을 우회하지 않는가
- Client Island, `is:inline`, ClientRouter와 UI 프레임워크 의존성마다 승인된 상호작용이 있는가
- Tailwind 클래스가 소스에서 완성된 문자열로 확인되는가
- 반복되는 확정 값이 `@theme` 디자인 토큰을 사용하는가
- Page 전용 정보 구조와 Shared UI가 사용 의미에 따라 나뉘는가
- 컴포넌트 Props가 실제 콘텐츠 variant와 HTML 속성을 구체적으로 표현하는가

검토 책임자는 아직 정해지지 않아 `needs human input`이다. 책임자가 정해질 때까지 구현을 작성한 사람과 다른 사람이 위 항목을 검토해야 한다는 정책으로 간주하지 않는다. 변경을 병합하거나 배포하기 전에 누가 최종 검토할지는 별도로 정해야 한다.
