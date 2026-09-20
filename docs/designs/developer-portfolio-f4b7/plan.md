# 편집형 단일 페이지 개발자 소개 웹사이트 구현 플랜

한국어 소개와 확인 가능한 기여를 `/` 한 페이지에 편집형 기술 프로필로 구현한다. Astro가 정적 HTML을 만들고 Tailwind CSS가 디자인 토큰과 반응형 배치를 담당한다. React, Client Island와 브라우저 전역 상태는 첫 버전에 추가하지 않는다.

구현은 아래 작업 단위를 순서대로 완료한다. 각 작업 단위는 파일 목록과 코드 구성대로 변경하고 명시된 명령 및 화면 조건을 통과해야 끝난다. 확인을 위해 만든 임시 마크업, 임시 문구와 사용하지 않는 추상화는 같은 작업 단위에서 제거하며 다음 작업 단위로 넘기지 않는다.

## 기준 문서와 적용 지침

[요구사항](requirements.md) 전체를 기준으로 한다. 이 플랜을 마지막으로 변경한 커밋에 함께 있는 요구사항, 결정과 개발 지침이 구현 기준이다.

- [개발자 소개](decisions/developer-positioning.md): 서비스 문제의 원인, 데이터 흐름과 비동기 상태 개선, 배포 후 실제 동작 확인을 앞세운다.
- [Engineering Contribution](decisions/featured-cases.md): 인공지능팩토리의 네 기여와 이전 회사의 압축된 기여를 Experience에 구성한다.
- [독립 작업](decisions/project-availability.md): AI Agent Workflow와 Offline Translation Web App을 소개한다.
- [편집형 시각 방향](decisions/editorial-direction.md): 밝은 바탕, Pretendard, 제한된 분홍색 강조와 비대칭 편집 배치를 사용한다.
- [문구 저장](decisions/terms-storage.md): `src/shared/terms/ko.json`으로 시작하고 한국어 화면 확인 뒤 `en.json`을 추가한다.
- [편집형 디자인 조사](references/editorial-design-system.md): 글꼴, 색상 대비, 반응형 구성과 접근성 근거를 제공한다.
- [Astro, FSD와 Tailwind CSS 구현 규칙](../../dev/frontend/astro-fsd-tailwind.md): 모듈 참조 방향, 정적 렌더링, 타입, Tailwind CSS와 브라우저 확인 방법을 정한다.

## 요구사항 변경의 영향

기존의 개인 프로젝트 우선 화면 대신 회사별 Engineering Contribution을 먼저 읽는 편집형 기술 프로필을 만든다. 개인 메모 앱, 글 목록과 `Selected Work`는 첫 버전에 포함하지 않는다. 작업별 이력 구성 경험은 대표 기여에서 제외하고 Reliability & Delivery를 추가한다.

다음 내용은 유지한다.

- `/` 한 페이지에서 한국어 소개가 완결된다.
- 상세한 해결 과정은 블로그가 맡는다.
- React Router와 Outline 기여를 실제 PR 및 공식 릴리스로 연결한다.
- 한국어를 먼저 제작하고 화면 문구를 JSON으로 관리한다.
- 회사 화면을 추정하지 않고 기술 도식은 설명에 필요한 경우에만 사용한다.
- WCAG 2.2 AA, 키보드 사용, 320px 재배치와 200% 글자 확대를 확인한다.

이전 [단일 페이지 UI, UX 조사](references/single-page-ui-ux.md)의 사례 분석은 참고 자료로만 유지한다. 그 문서의 프로젝트 중심 정보 순서, 1120px 폭, 17~18px 본문과 미결정 색상 및 글꼴은 구현값으로 사용하지 않는다.

## 구현 중 지켜야 할 구성 원칙

- `src/pages/index.astro`는 `HomePage`를 불러와 렌더링하는 코드만 가진다.
- `src/_pages/home`은 한 페이지에서만 쓰는 정보 순서와 영역별 마크업을 담당한다.
- `src/shared/ui`에는 두 곳 이상에서 같은 의미, HTML 구조와 접근성 규칙으로 쓰이는 말단 UI만 둔다.
- `src/shared/terms/get-terms.ts`가 언어별 JSON을 선택하고 구체적인 콘텐츠 타입을 반환한다. `HomePage.astro`는 반환값에서 영역별 객체를 꺼내 각 Section에 한 번만 전달한다.
- 중간 컴포넌트가 쓰지 않는 값을 다시 전달하지 않는다. `shared/ui`는 전체 문구 객체나 `ko.json`을 직접 읽지 않고 표시할 문자열과 값만 Props로 받는다.
- 정적 콘텐츠 공유에 Context, Nano Stores, module singleton과 Client Island를 사용하지 않는다. 서로 떨어진 브라우저 상호작용이 같은 변경 가능한 상태를 공유해야 한다는 새 요구사항이 승인될 때만 상태 저장소를 다시 검토한다.
- 스타일 variant는 완성된 Tailwind CSS 클래스 문자열 map으로 구현한다. 런타임 문자열 조합, 반복되는 임의 색상과 `@apply` 기반 컴포넌트 대용 클래스를 만들지 않는다.
- 한 작업 단위에서만 필요한 임시 코드와 자산은 그 작업 단위를 커밋하기 전에 제거한다. 승인되지 않은 후속 요구를 위한 빈 FSD 레이어, 빈 상태 컴포넌트와 사용하지 않는 타입을 먼저 만들지 않는다.

## 시작 전 확정할 입력과 중단 조건

다음 입력을 확인하기 전에는 그 값을 사용하는 작업 단위를 시작하지 않는다.

- 한국어 문구와 수치 조건: Content 작업 단위의 입력이며, 근거가 확인되지 않은 `30초 이내 배포` 문구는 `ko.json`에 넣지 않는다.
- Email, GitHub, Blog, LinkedIn과 Résumé 주소: Contact와 Header를 구현하기 전에 확정한다.
- Pretendard 제공 방식과 라이선스 보관 방법: 디자인 토큰 작업 단위 전에 확정한다.
- Header를 일반 문서 배치에 둘지 화면 위에 고정할지: 페이지 조립 작업 단위 전에 확정한다.
- 기본 언어, 영어 주소와 언어 선택 방식: 영어 작업 단위 전에 확정한다.
- 배포 서비스와 확인할 브라우저 목록: 배포 설정 및 최종 브라우저 확인 전에 확정한다.
- 병합 또는 배포 전에 최종 검토할 책임자: 구현 완료 판정 전에 정한다.

다음 상황에서는 영향을 받는 작업 단위를 멈춘다.

- 문구의 수치와 자료의 조건이 다르거나 개발자의 역할을 확인할 수 없다.
- 회사 내부 정보, 기관명이나 화면을 추정해야만 내용을 만들 수 있다.
- 새 UI 프레임워크, Client Island, 상태 저장소, 서버 adapter 또는 연락 양식이 필요하다.
- 요구사항을 만족하려면 별도 상세 페이지, 블로그 글 목록 및 검색이나 미니 애플리케이션을 추가해야 한다.
- 요구사항, 결정과 개발 지침이 서로 다른 동작을 요구한다.

## 작업 단위와 실행 순서

### 1. 한국어 콘텐츠와 외부 링크 확정

상태: 완료.

완료 내용: 한국어 문구와 수치 조건을 이력서 및 포트폴리오와 대조했다. Email, GitHub, Blog, LinkedIn, React Router 및 Outline 주소를 확인했고, Résumé 주소는 추적 파일에 저장하지 않고 빌드 환경에서 주입하도록 정했다. 화면에는 URL 대신 링크의 목적을 나타내는 이름을 사용한다.

적용 요구사항: 「Identity」, 「Experience」, 「Open Source」, 「Independent Work」, 「Background와 Contact」, 「글과 언어 관리」.

코드 변경 전 [홈페이지 문구](references/homepage-copy.md)를 기준으로 화면에 실을 한국어와 링크를 확정한다. 인공지능팩토리의 네 기여는 수치의 대상과 측정 조건을 같은 항목에 둔다. 이전 회사 경험에는 확인된 변화만 남긴다. React Router와 Outline은 PR과 공식 릴리스가 같은 기여를 가리키는지 다시 확인한다.

- 추가할 코드: 없다.
- 수정할 코드: 없다.
- 제거할 코드: 없다. 아직 애플리케이션 소스가 없다.
- 문서 산출물: 확정된 한국어 문구와 링크를 `homepage-copy.md`에 반영한다. 문구가 확정되지 않은 항목은 다음 작업 단위의 JSON에 옮기지 않는다.
- 확인: 페이지 밖의 설명 없이도 개발자가 해결해 온 문제, 판단과 확인된 변화를 순서대로 설명할 수 있고 모든 수치와 링크에 확인 근거가 있다.

확인되지 않은 연락처나 수치를 임시 문자열로 채운 채 프로젝트 초기 설정을 시작하지 않는다.

### 2. Astro와 Tailwind CSS 프로젝트 초기 설정

상태: 완료.

완료 내용: Astro 7.3.3, Tailwind CSS 및 `@tailwindcss/vite` 4.3.3, `@astrojs/check` 0.9.10과 TypeScript 6.0.3을 설치했다. `pnpm-workspace.yaml`에는 Astro가 사용하는 esbuild 0.28.2의 설치 스크립트만 허용했다. 빈 `main`을 정적 HTML로 빌드했으며 `pnpm check`, `pnpm build`와 전체 의존성 보안 검사가 통과했다.

적용 요구사항: 「디자인 체계와 제작 순서」, 「구현 전에 정할 사항」.

Astro 7로 정적 HTML을 만들고 Tailwind CSS 4를 Vite 플러그인으로 연결한다. 설치 직전에 npm 배포본, Node.js 요구 버전, 직접 및 전이 의존성, 라이선스와 보안 상태를 다시 확인한다. 패키지 관리자는 `pnpm`으로 통일하고 잠금 파일을 커밋한다.

- 추가할 파일:
  - `package.json`: 실행 의존성은 `astro`, 개발 의존성은 `@astrojs/check`, `@tailwindcss/vite`, `tailwindcss`와 `typescript`로 제한한다. `dev`, `check`, `build`와 `preview` script를 정의하고 각 script는 Astro CLI 명령 하나만 실행한다.
  - `pnpm-lock.yaml`: 설치로 결정된 직접 및 전이 의존성 버전을 고정한다.
  - `pnpm-workspace.yaml`: 설치 스크립트 실행이 필요한 전이 의존성을 확인한 뒤 패키지 이름별로 허용한다.
  - `astro.config.mjs`: `@tailwindcss/vite`만 Vite plugin으로 연결하고 output은 정적 기본값을 유지한다.
  - `tsconfig.json`: `astro/tsconfigs/strictest`를 확장하고 `@/*`가 `src/*`를 가리키게 한다.
  - `src/pages/index.astro`: `@/_pages/home`에서 `HomePage`를 가져와 `<HomePage locale="ko" />`만 렌더링한다.
  - `src/_pages/home/index.ts`: `HomePage.astro`만 외부에 제공한다.
  - `src/_pages/home/ui/HomePage.astro`: 내용이 없는 `main`만 만들고 임시 소개 문구는 넣지 않는다.
- 수정할 파일:
  - `.gitignore`: Astro와 pnpm이 만드는 로컬 산출물 가운데 저장소에 남기지 않을 항목만 추가한다.
- 제거하거나 대체할 코드:
  - starter template을 사용하지 않는다. 생성 도구가 넣은 `Welcome.astro`, Astro 로고, 예제 CSS, 예제 favicon과 안내 문구가 생겼다면 이 작업 단위 안에서 모두 제거한다.
  - `@astrojs/tailwind`, React, Preact, Vue, Svelte, Nano Stores, ClientRouter와 server adapter는 설치하지 않는다.
- 작업 종료 시 구성: `src/pages/index.astro → src/_pages/home/index.ts → HomePage.astro` 한 방향으로만 연결된다.
- 확인: `pnpm check`와 `pnpm build`가 성공하고 `dist/index.html`이 생성된다. 패키지 명세와 잠금 파일에는 승인한 직접 의존성만 있으며 Tailwind CSS와 `@tailwindcss/vite`의 해석 버전이 호환된다.

`HomePage.astro`의 빈 `main`은 다음 작업 단위에서 실제 한국어 문서 구조로 대체한다. 빈 section이나 미래 영역용 컴포넌트는 만들지 않는다.

### 3. 디자인 토큰, 문서 Layout과 한국어 문구 구성

상태: 완료.

완료 내용: Pretendard 1.3.9 가변 글꼴과 SIL Open Font License 1.1을 자체 제공 자산으로 추가했다. 디자인 토큰과 기본 문서 스타일, Layout, 한국어 JSON, 판별 가능한 기여 타입과 빌드 시 JSON 구조 검사를 구성했다. Résumé 주소는 Git이 추적하지 않는 환경 변수에서 읽는다. `pnpm check`와 `pnpm build`가 통과했고 생성된 HTML의 `lang`, title과 description을 확인했다.

적용 요구사항: 「글과 언어 관리」, 「편집형 시각 규칙」, 「글꼴과 글자 체계」, 「색상」, 「여백과 반응형 배치」.

- 추가할 파일:
  - `DESIGN.md`: 실제 CSS 변수 이름, 글꼴 제공 방식, 글자 단계, 색상 역할, 여백, 1200px 최대 폭, 페이지 전환값, 컨테이너 비교값, 포커스와 움직임 규칙을 기록한다.
  - `public/fonts/PretendardVariable.woff2`, `public/fonts/LICENSE-Pretendard.txt`: Pretendard 1.3.9 가변 글꼴과 배포에 필요한 라이선스를 함께 보관한다.
  - `src/env.d.ts`: 빌드 환경에서 받아 브라우저 링크에 사용하는 주소의 타입을 선언한다.
  - `src/shared/styles/global.css`: `@import "tailwindcss"`, `@theme` 토큰, 기본 문서 스타일, `focus-visible`, `prefers-reduced-motion`과 앵커 이동 보정을 둔다.
  - `src/shared/ui/BaseLayout.astro`: `lang`, title, description과 기본 meta를 받고 `global.css`를 한 번 불러온다. `html`, `head`, `body`와 기본 slot만 담당한다.
  - `src/shared/ui/index.ts`: 이 작업 단위에서는 `BaseLayout`만 외부에 제공한다.
  - `src/shared/terms/ko.json`: 확정된 문구와 링크를 Identity, Experience, Open Source, Independent Work, Background, Contact와 navigation 단위로 저장한다.
  - `src/shared/terms/types.ts`: `Locale`, `HomeTerms`, `Contribution`과 각 영역 타입을 구체적으로 정의한다. 기여 종류는 `metric`, `structure`와 `evidence` 판별 union으로 작성한다.
  - `src/shared/terms/get-terms.ts`: `ko`를 명시적으로 선택하고 `HomeTerms`를 반환한다.
  - `src/shared/terms/index.ts`: `getTerms`와 외부에서 사용할 타입만 제공한다.
- 수정할 파일:
  - `src/_pages/home/ui/HomePage.astro`: `BaseLayout`으로 문서를 감싸고 `getTerms(locale)`를 한 번 호출한다. 문서 제목과 설명을 Layout에 전달한다.
- 제거하거나 대체할 코드:
  - 이전 작업 단위의 빈 `main`을 실제 `main` 요소와 문서 제목으로 대체한다.
  - 색상 hex, 글꼴 목록, 반복 여백과 최대 폭을 `HomePage.astro`에 직접 쓰지 않는다. 시험 중 추가한 값은 `global.css`의 역할별 토큰으로 옮기거나 제거한다.
  - `Record<string, any>`, `object`와 선택 속성만 늘어놓은 범용 콘텐츠 타입은 만들지 않는다.
- 작업 종료 시 구성: `HomePage.astro`가 한국어 문구와 Layout을 조립하고, Layout은 영역별 문구나 Home Page 모듈을 참조하지 않는다.
- 확인: JSON의 모든 필수 항목이 타입 검사에 포함되고 `pnpm check`와 `pnpm build`가 성공한다. 생성된 HTML의 `lang`, title과 description이 한국어 값과 일치한다.

JSON을 모든 하위 컴포넌트에서 직접 가져오지 않는다. 언어 선택 책임은 `getTerms`와 `HomePage`에 남긴다.

### 4. Identity, Header와 Experience 구현

상태: 완료.

완료 내용: 비고정 Header, 하나의 `h1`을 사용하는 Identity와 회사별 Experience를 정적 Astro 컴포넌트로 구현했다. 수치 기여, 구조 설명 및 확인 자료를 판별 union에 따라 나누고 실제 설명에 필요한 도식 하나만 추가했다. `pnpm check`와 `pnpm build`가 통과했으며 생성된 HTML에서 소개, 회사와 주요 기여, 영역 id 및 목적을 나타내는 Résumé 링크 이름을 확인했다.

적용 요구사항: 「한 페이지의 정보 순서」, 「Identity」, 「Experience」, 「조작과 움직임」.

- 추가할 파일:
  - `src/shared/ui/SectionHeader.astro`: Experience와 이후 영역이 함께 사용할 id, 번호, 제목 및 `h2` 구조를 구현한다.
  - `src/shared/ui/MetricStatement.astro`: 둘 이상의 수치 기여가 공유하는 전후 값, 단위와 접근 가능한 설명을 구현한다.
  - `src/shared/ui/MetadataLine.astro`: 회사, 기여와 독립 작업이 함께 사용할 기간 및 기술 정보 구조를 구현한다.
  - `src/_pages/home/ui/PageHeader.astro`: 이름과 같은 페이지 안의 링크를 렌더링한다. 고정 여부는 시작 전 결정에 따른다.
  - `src/_pages/home/ui/IdentityBlock.astro`: 하나의 `h1`, 소개 문장과 Experience로 이어지는 링크를 렌더링한다.
  - `src/_pages/home/ui/ExperienceSection.astro`: 회사별 경험을 순서대로 조립한다.
  - `src/_pages/home/ui/CompanyExperience.astro`: 기간, 회사, 역할과 회사 설명을 렌더링한다.
  - `src/_pages/home/ui/ContributionBlock.astro`: `Contribution.kind`에 따라 수치, 구조 설명 또는 확인 자료 구성을 명시적인 분기로 렌더링한다.
  - `src/_pages/home/ui/SystemFigure.astro`: 승인된 세 가지 관계도 가운데 실제 설명을 더 분명하게 만드는 경우에만 추가한다.
- 수정할 파일:
  - `src/shared/ui/index.ts`: `BaseLayout`, `SectionHeader`, `MetricStatement`와 `MetadataLine`만 외부에 제공한다.
  - `src/_pages/home/ui/HomePage.astro`: `terms.navigation`, `terms.identity`와 `terms.experience`를 각각 Header, Identity와 Experience에 한 번 전달하고 DOM 순서대로 조립한다.
  - `src/shared/terms/ko.json`: 화면 검토에서 확인된 줄바꿈과 링크 이름만 고친다. JSON 필드 구조를 바꾸면 `types.ts`도 같은 변경에서 고친다.
- 제거하거나 대체할 코드:
  - `HomePage.astro`에 있던 문서 제목 외의 임시 마크업을 PageHeader, IdentityBlock과 ExperienceSection 조립 코드로 대체한다.
  - Experience 콘텐츠 객체 전체를 `HomePage → ExperienceSection → CompanyExperience → ContributionBlock`으로 연달아 전달하지 않는다. 각 컴포넌트는 직접 반복하거나 표시하는 항목만 받는다.
  - 시각적으로 비슷한 모든 항목을 받는 `Card`, `Section` 또는 boolean prop 기반 범용 컴포넌트를 만들지 않는다. 시험 중 생기면 의미가 분명한 Page 컴포넌트나 위 세 가지 공용 UI로 대체한다.
  - `shared/ui`에서 `ko.json`, `HomeTerms` 전체와 `_pages` 모듈을 가져오는 코드는 제거한다.
  - 동일한 카드, pill 태그 목록, 비활성 버튼, 화면 전체 높이 Hero와 항목별 도식 반복을 만들지 않는다. 시험 중 생기면 같은 작업 단위에서 제거한다.
- 작업 종료 시 구성: `HomePage`는 영역별 콘텐츠만 전달하고 Experience 내부 반복은 `ExperienceSection`이 맡는다. `ContributionBlock`은 판별 union의 현재 항목만 받고 다른 영역 문구를 알지 않는다. 공용 UI는 실제로 반복되는 말단 마크업만 담당한다.
- 확인: JavaScript를 끈 상태에서도 이름, 소개, 회사와 네 가지 주요 기여가 보인다. `h1`은 하나이며 navigation 링크와 영역 id가 일치한다. 수치에는 대상과 조건이 인접해 있고 도식에는 같은 뜻의 본문 또는 `figcaption`이 있다.

### 5. Open Source, Independent Work, Background와 Contact 구현

상태: 완료.

완료 내용: Open Source는 PR과 공식 릴리스를 함께 확인하는 행, Independent Work는 회사 경력과 분리된 비대칭 목록, Background는 압축된 정의 목록, Contact는 목적을 설명하는 링크 목록으로 구현했다. GitHub 원문에서 두 PR의 병합 상태와 두 릴리스 주소를 다시 확인했다. `pnpm check`와 `pnpm build`가 통과했고 생성된 HTML에서 다섯 영역 id, 오픈소스 링크 이름 및 URL을 드러내지 않는 Résumé 링크 이름을 확인했다.

적용 요구사항: 「Open Source」, 「Independent Work」, 「Background와 Contact」.

- 추가할 파일:
  - `src/shared/ui/ExternalTextLink.astro`: Open Source와 Contact가 함께 사용할 URL, 링크 이름, 외부 자료 종류와 포커스 상태를 구현한다.
  - `src/_pages/home/ui/OpenSourceSection.astro`: 변경 내용, 병합 상태, PR과 공식 릴리스 링크를 행 단위로 렌더링한다.
  - `src/_pages/home/ui/IndependentWorkSection.astro`: 회사 Experience와 다른 정보 구조로 두 독립 작업을 렌더링한다.
  - `src/_pages/home/ui/BackgroundSection.astro`: 학력, 자격과 어학 정보를 압축된 목록으로 렌더링한다.
  - `src/_pages/home/ui/ContactSection.astro`: 확정된 Email, GitHub, Blog, LinkedIn과 Résumé 링크만 렌더링한다.
  - `src/_pages/home/ui/PageFooter.astro`: 저작권 또는 중복 navigation을 새로 만들지 않고 페이지 끝 정보만 담당한다.
- 수정할 파일:
  - `src/shared/ui/index.ts`: 실제 두 영역에서 사용하는 `ExternalTextLink`를 외부 제공 목록에 추가한다.
  - `src/_pages/home/ui/HomePage.astro`: 네 영역과 Footer를 Experience 뒤에 DOM 읽는 순서대로 추가하고 각 영역의 콘텐츠 객체만 한 번 전달한다.
  - `src/shared/terms/ko.json`: 확정된 링크 및 화면에서 확인한 링크 이름을 반영한다.
- 제거하거나 대체할 코드:
  - URL이 없는 항목의 빈 링크와 비활성 버튼을 제거한다.
  - GitHub 별 수, 기여 횟수, 로고 모음, 프로젝트 카드 격자, 추천사, 연락 양식과 블로그 글 목록을 추가하지 않는다.
  - 여러 영역에 같은 링크 마크업이 확인되면 반복 마크업을 `ExternalTextLink` 사용으로 대체한다. 의미나 접근성 규칙이 다른 행은 억지로 합치지 않는다.
- 작업 종료 시 구성: `HomePage.astro`에는 전체 영역 순서와 영역별 Props 전달만 남고, 각 Section이 자신의 반복과 HTML 의미를 맡는다.
- 확인: React Router와 Outline의 각 PR 및 릴리스 링크가 올바른 목적지로 이동한다. 독립 작업이 회사 경력과 다른 제목 및 구조로 읽힌다. Contact에는 확정된 주소만 있고 링크 이름만으로 목적을 알 수 있다.

### 6. 반응형 배치, 접근성과 움직임 조정

상태: 시작 전.

적용 요구사항: 「여백과 반응형 배치」, 「조작과 움직임」, 「접근성」, 「완료 기준」.

- 추가할 파일:
  - 자동화된 브라우저 검사가 기존 도구만으로 가능하고 사용자에게 보이는 동작을 검증할 때만 테스트 파일을 추가한다. 테스트 도구 도입이나 테스트 파일 추가는 별도 승인을 받는다.
- 수정할 파일:
  - `src/shared/styles/global.css`: 실제 한국어 화면에서 확인한 page grid, 앵커 보정, focus-visible, 움직임 감소와 글꼴 fallback을 조정한다.
  - `src/_pages/home/ui/ContributionBlock.astro`: 가용 폭 약 42rem을 시작값으로 Container Query를 적용한다.
  - `src/_pages/home/ui/OpenSourceSection.astro`: Evidence 행이 실제로 분리되어야 할 때 가용 폭 약 36rem을 시작값으로 적용한다.
  - `src/_pages/home/ui/SystemFigure.astro`: 도식이 있을 때 가용 폭 약 34rem에서 가로 및 세로 배치를 바꾼다.
  - `src/_pages/home/ui/PageHeader.astro`: 고정 Header를 선택했다면 실제 높이에 맞춰 포커스와 영역 제목 가림을 해결한다.
  - `DESIGN.md`: 실제 화면 검토에서 바꾼 토큰, 비교값과 이유를 구현과 같은 변경에서 기록한다.
- 제거하거나 대체할 코드:
  - 전역 viewport 기준만으로 내부 배치를 바꾸던 `md:` 또는 `lg:` 규칙은 그 컴포넌트의 Container Query로 대체한다.
  - 내용 표시를 지연하는 등장 애니메이션, 시차 효과, 숫자 증가 효과와 계속 움직이는 장식을 제거한다.
  - 320px 또는 200% 확대에서 가로 스크롤을 만드는 고정 폭, 읽는 순서를 바꾸는 CSS order와 축소된 수치 표현을 제거한다.
- 작업 종료 시 구성: DOM 순서는 모든 화면에서 동일하며 페이지 전체 변화는 viewport 기준, 재사용 UI 내부 변화는 그 요소가 실제로 차지하는 폭을 기준으로 나뉜다.
- 확인: 320px, 390px, 768px와 1440px, 200% 글자 확대, 키보드 전용 조작과 `prefers-reduced-motion: reduce`에서 확인한다. 일반 텍스트 4.5:1, 큰 텍스트 및 의미 있는 비텍스트 표시 3:1, 포인터 대상 24×24 CSS px 또는 허용 예외를 확인한다. 직접 해시 진입, 새로고침과 뒤로 가기에서도 대상 영역을 사용할 수 있어야 한다.

화면 확인에서 값만 조정하면 되는 경우에는 새 컴포넌트를 추가하지 않고 기존 토큰과 문제가 생긴 컴포넌트를 수정한다.

### 7. 영어 문구와 언어별 주소 추가

상태: 대기. 한국어 화면 확인과 언어 주소 결정이 선행 조건이다.

적용 요구사항: 「글과 언어 관리」, 「구현 전에 정할 사항」, 「완료 기준」.

- 추가할 파일:
  - `src/shared/terms/en.json`: 확정된 한국어의 뜻, 수치와 조건을 같은 JSON 필드 구조로 작성한다.
  - 언어별 주소 결정에서 별도 영어 route를 선택한 경우에만 승인된 주소를 처리할 `src/pages/**/index.astro`를 추가한다. 이 route도 `HomePage locale="en"`만 렌더링한다.
- 수정할 파일:
  - `src/shared/terms/types.ts`: `Locale`에 `en`을 추가한다. 두 JSON의 공통 필드 구조는 바꾸지 않는다.
  - `src/shared/terms/get-terms.ts`: 정적 import map에 영어 문구를 추가하고 허용 목록에 없는 locale 처리 방식을 승인된 결정대로 구현한다.
  - `src/_pages/home/ui/PageHeader.astro`: 승인된 언어 선택 방식이 있을 때만 언어 선택 링크를 추가한다.
  - `src/shared/ui/BaseLayout.astro`: locale에 맞춰 `lang`, title과 description을 HTML에 작성한다.
- 제거하거나 대체할 코드:
  - `get-terms.ts`의 한국어 전용 분기를 locale map으로 대체한다.
  - 영어 전용 Page 컴포넌트, 영역 컴포넌트 복사본과 영어 전용 스타일을 만들지 않는다.
  - 번역 누락을 빈 문자열이나 한국어 자동 fallback으로 숨기지 않는다. 누락 처리 결정이 없으면 구현을 멈춘다.
- 작업 종료 시 구성: 두 route가 필요하더라도 같은 `HomePage`와 Section을 사용하며 문구 선택만 locale에 따라 달라진다.
- 확인: 각 언어 JSON만 수정해 그 언어 화면 문구가 바뀌고 두 언어의 수치, 링크와 정보 순서가 일치한다. 영어 문구의 Header 폭, 제목 줄바꿈, MetadataLine과 320px 화면을 다시 확인한다.

### 8. 최종 정리와 배포 전 확인

상태: 시작 전.

적용 요구사항: 「완료 기준」 전체와 [개발 지침의 최종 확인](../../dev/frontend/astro-fsd-tailwind.md#최종-확인).

- 추가할 코드: 배포 서비스가 정적 `dist/` 업로드 외의 설정을 요구하고 그 설정이 승인된 경우에만 배포 설정 파일을 추가한다. 서버 adapter는 정적 호스팅으로 배포할 수 없다는 근거가 있을 때 별도로 승인받는다.
- 수정할 코드: 확인에서 발견한 결함이 있는 기존 파일만 고친다. 새 추상화로 기존 영역을 일괄 재작성하지 않는다.
- 제거하거나 대체할 코드:
  - 사용하지 않는 import, export, 컴포넌트, 타입, 자산과 CSS 토큰을 제거한다.
  - `client:*`, `is:inline`, `ClientRouter`, 동적 Tailwind CSS 클래스 조합, `@apply` 기반 UI 클래스와 상위 FSD 레이어를 향한 import가 남아 있으면 승인된 예외가 없는 한 제거한다.
  - 임시 URL, 예제 문구, 미사용 favicon, 화면 확인용 스타일과 빌드 산출물 `dist/`를 커밋 대상에서 제외한다.
- 작업 종료 시 구성: route는 FSD Page만 렌더링하고, Home Page는 영역을 조립하며, Shared는 문구 선택, Layout, 토큰과 실제로 반복되는 말단 UI만 제공한다.
- 확인: `pnpm check`와 `pnpm build`를 각각 한 번 실행한다. 생성된 HTML에 개발자 이름, 경력, 사례와 연락처가 있으며 정적 영역 때문에 별도 UI framework JavaScript 청크가 내려오지 않는지 확인한다. 변경 파일, 문서, 환경 파일과 Git diff에서 개인 PC 절대 위치, 자격 증명, 저장소에 기록하면 안 되는 URL과 미확정 문구가 없는지 확인한다.

## 완료 판정

다음 화면과 빌드 상태를 모두 직접 확인해야 구현이 완료된다.

- `/`의 초기 HTML만으로 개발자가 해결해 온 문제, 기술적 판단과 확인된 기여를 읽을 수 있다.
- Identity 다음에 Experience가 이어지고 네 가지 주요 기여의 수치와 조건을 함께 읽을 수 있다.
- React Router와 Outline 기여를 실제 PR 및 공식 릴리스에서 확인할 수 있다.
- AI Agent Workflow와 Offline Translation Web App이 회사 경력과 다른 정보 구조로 보인다.
- Header, 같은 페이지 안의 이동, 외부 링크와 Contact를 키보드와 터치로 사용할 수 있다.
- 320px, 390px와 1440px, 200% 글자 확대와 움직임 감소 설정에서 내용과 DOM 읽는 순서가 유지된다.
- 색상과 포커스 표시가 정한 명암비를 충족한다.
- 한국어 JSON의 문구를 바꾸면 Astro UI 파일을 수정하지 않고 화면에 반영된다.
- 한국어 화면 확인 뒤 영어 JSON을 추가해 같은 정보 구조로 읽을 수 있다.
- 구현에 쓰이지 않는 컴포넌트, 타입, 토큰, 의존성과 starter 파일이 남아 있지 않다.

문서 작성, 타입 검사 또는 빌드 성공만으로 위 사용자 화면의 확인을 대신하지 않는다.
