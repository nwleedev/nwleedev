# 로컬 애플리케이션 도구와 의존성 조사

현재 독립 실행 애플리케이션은 pnpm workspace의 `apps/notes/` 패키지로 만들고, Next.js Node.js 서버와 Webpack으로 운영용 애플리케이션 및 브라우저 자산을 생성한다. 로컬 모드는 이 배포 형식이 아니라 별도의 애플리케이션 백엔드와 데이터베이스 서버 없이 과업을 완료하는 실행 형태다. 모든 애플리케이션 및 개발 의존성은 `apps/notes/package.json`에 정확한 버전으로 기록하고 해석된 전체 의존성은 루트 `pnpm-lock.yaml`로 고정한다. ESLint와 TypeScript는 최신 번호보다 현재 Next.js 검사 도구의 peer 범위를 우선했다.

## 조사 질문과 적용 범위

[독립 실행 기반 계획](../plan.md#u1-독립-실행-기반과-worker-배포-확인)은 package manager, workspace 형식, Next.js 및 React 도구 버전, Tailwind CSS 연결, FSD의 ESLint 검사, HTTP 및 HTTPS 제공 방식과 지원 브라우저를 구현 시작 시점에 정하도록 요구한다. 이 조사는 별도 백엔드, 계정 동기화, 범용 DI 컨테이너, IndexedDB wrapper, 드래그 라이브러리와 외부 UI 라이브러리를 선택하지 않는다.

## 확인한 공식 자료

- [pnpm workspace 문서](https://pnpm.io/workspaces)는 저장소 루트의 `pnpm-workspace.yaml`을 필수로 두고 하나의 공유 잠금 파일을 기본으로 사용한다. 현재 작업 환경의 pnpm 11.22.0을 루트 `packageManager`와 engine에 고정했다.
- [Next.js 16 설치 문서](https://nextjs.org/docs/app/getting-started/installation)는 Node.js 20.9 이상, React와 React DOM의 명시적 설치, App Router, TypeScript와 현대 브라우저 지원 범위를 설명한다. 현재 Node.js 24 계열에 맞춰 Next.js 16.3.3, React 19.2.8과 일치하는 type package를 선택했다.
- [Next.js 배포 문서](https://nextjs.org/docs/app/getting-started/deploying)는 `next build` 뒤 `next start`로 Node.js 서버를 실행하는 표준 배포 절차를 설명한다. [Next.js CLI 문서](https://nextjs.org/docs/app/api-reference/cli/next)는 `next start`가 운영 모드 서버를 시작하며 먼저 `next build`가 필요하다고 명시한다.
- [Next.js 정적 내보내기 문서](https://nextjs.org/docs/app/guides/static-exports)는 `output: "export"`가 정적 사이트 산출물을 만들고 Server Actions를 포함한 서버 기능을 지원하지 않는다고 설명한다. [Next.js SPA 가이드](https://nextjs.org/docs/app/guides/single-page-applications)는 이 형식을 선택 사항으로 분류한다. 현재 과업은 정적 사이트 배포가 필요하지 않으므로 이 제한을 유지하지 않는다.
- [Next.js 자체 호스팅 문서](https://nextjs.org/docs/app/guides/self-hosting)는 공개 배포에서 Next.js 서버 앞에 reverse proxy를 두도록 권장한다. localhost HTTP는 Next.js 운영 서버에서 확인하고 HTTPS 인증서 및 TLS 종료는 배포 환경이 맡는다.
- [Next.js ESLint 문서](https://nextjs.org/docs/app/api-reference/config/eslint)는 `eslint-config-next/core-web-vitals`와 TypeScript flat config 조합을 권한다. Next.js 16.3.3의 전이 플러그인은 ESLint 10을 peer 범위로 허용하지 않으므로 peer 검사가 통과하는 ESLint 9.39.5를 사용한다. ESLint 9 지원 종료 경고는 남아 있어 Next.js 구성이 ESLint 10 전체를 허용할 때 다시 검토해야 한다.
- [Tailwind CSS의 Next.js 설치 문서](https://tailwindcss.com/docs/installation/framework-guides/nextjs)는 Tailwind CSS, `@tailwindcss/postcss`와 PostCSS를 함께 설치하고 전역 CSS에서 Tailwind를 가져오도록 안내한다. 세 package는 각각 4.3.3, 4.3.3과 8.5.26으로 고정했다.
- [Playwright 설치 문서](https://playwright.dev/docs/intro)는 `@playwright/test`와 실제 Chromium, Firefox 및 WebKit 실행을 제공한다. 정적 결과물의 HTTP, HTTPS, Worker 생성 시점, 응답과 CSS 적용은 Playwright 1.62.1의 세 browser engine으로 확인한다.
- [Firefox 125 개발자 문서](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/125)는 이 버전에서 `Intl.Segmenter` 지원이 추가됐다고 기록한다. 따라서 Next.js의 기본 Firefox 111보다 높은 Firefox 125를 애플리케이션 최소 범위로 정했다.

## 버전 호환성 결론

애플리케이션 실행 의존성은 Next.js 16.3.3, React 및 React DOM 19.2.8, React Hook Form 7.86.0과 Zod 4.4.3이다. React Hook Form과 Zod는 현재 구현 단위가 사용할 때까지 전역 provider나 만능 schema를 만들지 않는다.

개발 의존성은 Playwright 1.62.1, `@vitest/browser-playwright` 4.1.11, Tailwind CSS와 PostCSS 연결, React 및 Node type package, ESLint 9.39.5, `eslint-config-next` 16.3.3, `@boundaries/eslint-plugin` 7.2.0, `eslint-import-resolver-typescript` 4.4.5, `@vitest/eslint-plugin` 1.6.27, TypeScript 6.0.3과 Vitest 4.1.11이다. TypeScript 7.0.2는 현재 `typescript-eslint` 8.68.0의 `<6.1.0` peer 범위를 벗어나므로 사용하지 않았다. Vitest는 순수 규칙에 TDD를 적용할 작업 단위와 운영 모듈을 실제 브라우저에서 확인하는 IndexedDB 통합 검사에 사용한다. Vitest 플러그인은 조건부 검증, 비활성화된 테스트, 초점이 고정된 테스트와 큰 snapshot을 막으며 브라우저 실행 결과를 대신하지 않는다.

[Vitest Browser Mode 공식 문서](https://vitest.dev/guide/browser/)는 Vite 개발 서버에서 테스트 모듈을 브라우저에 제공하고 실제 브라우저 자동화에는 Playwright provider를 권한다. 이 방식은 IndexedDB repository 모듈을 실제 브라우저에서 실행하지만 Next.js 운영 서버의 라우트를 제공하지 않는다. [Playwright 설정 문서](https://playwright.dev/docs/test-configuration)는 `webServer`로 애플리케이션 서버를 시작하는 표준 구성을 제공한다. 따라서 Next.js 운영 서버의 Worker URL과 MIME type, CSS 및 사용자 흐름은 과업별 Playwright Test가 맡고 별도 기본 실행 스크립트는 만들지 않는다.

잠금 파일의 전이 의존성은 Next.js 및 React 실행, Tailwind CSS 변환, TypeScript 및 ESLint 분석, Vitest 실행과 Playwright 브라우저 제어에만 사용한다. 애플리케이션 소스는 전이 package를 직접 가져오지 않는다. `@boundaries/eslint-plugin` 7.2.0은 `@boundaries/elements`, `chalk`, `eslint-import-resolver-node`, `eslint-module-utils`, `handlebars`와 `micromatch`를 사용하며 MIT license와 Node.js 18.18 이상 및 ESLint 6 이상 peer 조건을 가진다. TypeScript alias 해석에 필요한 `eslint-import-resolver-typescript` 4.4.5는 ISC license이고 현재 ESLint를 peer로 허용한다. `@vitest/eslint-plugin` 1.6.27은 MIT license, Node.js 18 이상과 ESLint 8.57 이상을 요구하며 현재 설치 그래프에 있던 `@typescript-eslint/utils`와 `@typescript-eslint/scope-manager`를 사용한다. `@vitest/browser-playwright` 4.1.11은 MIT license이며 Vitest 4.1.11 및 기존 Playwright 1.62.1을 peer로 사용하고, 같은 버전의 `@vitest/browser`, `@vitest/mocker`와 `tinyrainbow`를 추가한다. `unrs-resolver`의 설치 후 script는 선택적인 platform binding 확인용이며 현재 platform binding이 잠금 파일로 설치되고 lint가 통과하므로 실행을 허용하지 않았다. 라이선스 목록에는 MIT, Apache-2.0, BSD, ISC, MPL-2.0, CC 계열과 build 단계의 선택적 libvips LGPL package가 있으며, 운영용 브라우저 묶음에는 Node.js build 도구와 선택적 image 처리 package가 포함되지 않는다. 잠금 파일 변경 시 peer 검사, 알려진 취약점 검사, license 목록과 build script 허용 목록을 다시 확인해야 한다.

## Worker와 FSD 검사 결론

Next.js 16.3.3의 기본 Turbopack 빌드는 module-relative Worker 진입점을 실행 가능한 JavaScript 자산으로 변환하지 못했다. 같은 소스를 공식 `--webpack` 선택지로 빌드하면 `.js` Worker chunk가 생성됐다. 개발과 운영 빌드를 Webpack으로 맞추고 Next.js 운영 서버를 대상으로 한 Playwright Test에서 Worker URL의 `.js` 확장자, JavaScript MIME type과 실제 메시지 왕복을 확인한다. Next.js나 Turbopack의 Worker 처리가 바뀌면 기본 bundler를 다시 검토한다.

[FSD 팀의 ESLint config](https://github.com/feature-sliced/eslint-config)는 legacy ESLint config와 오래된 Boundaries 설정을 전제로 하고, [Steiger 공식 저장소](https://github.com/feature-sliced/steiger)는 ESLint와 별도 실행하는 beta 구조 검사기다. `@yh-kim/eslint-plugin-fsd`는 FSD 전용 규칙을 제공하지만 현재 0.1 계열이며 이 저장소의 `_app`, `_pages`, Entities `@x`와 public API 규칙을 그대로 구성할 근거가 부족하다.

[JS Boundaries의 element 분류](https://www.jsboundaries.dev/docs/classification/elements/), [의존성 규칙](https://www.jsboundaries.dev/docs/rules/dependencies/), [selector](https://www.jsboundaries.dev/docs/selectors/)와 [설정 문서](https://www.jsboundaries.dev/docs/settings/)는 계층 및 slice 이름을 파일 위치에서 추출하고 정적 import와 동적 import를 같은 ESLint 실행에서 검사하며, import 양쪽의 추출값과 내부 파일 위치로 public API를 제한할 수 있음을 설명한다. 따라서 `@boundaries/eslint-plugin` 7.2.0을 선택하고 `boundaries/dependencies`를 기본 거부 방식으로 구성한다. `export *`는 ESLint core의 AST selector로 막는다. 설정을 한 번 검증하기 위한 source fixture나 별도 검사 script는 커밋하지 않고, 저장소의 무시된 임시 입력에서 정상 및 위반 import를 확인한 뒤 실제 소스의 lint를 반복 검증 명령으로 사용한다.

## 제한과 다시 확인할 조건

- ESLint 9는 현재 지원 종료 상태지만 Next.js가 제공하는 전체 구성의 peer 호환성을 위해 사용한다. ESLint 10으로 올릴 때에는 React, React Hooks, JSX 접근성 및 import 플러그인의 peer 범위와 같은 검출력을 함께 확인해야 한다.
- 지원 브라우저의 최저 버전은 현재 실행 환경에서 직접 설치할 수 없으므로 최신 Playwright browser engine의 결과와 공식 지원 범위를 함께 사용한다. 최저 버전의 실제 기기 또는 browser farm 증거가 필요하면 별도 검증 환경을 마련해야 한다.
- pnpm 잠금 파일은 실제 platform에 필요한 선택적 native package와 다른 platform 후보를 함께 기록할 수 있다. 애플리케이션 브라우저 묶음에 포함되는 package와 서버, build 및 검사에만 쓰이는 package를 구분해 검토한다.
