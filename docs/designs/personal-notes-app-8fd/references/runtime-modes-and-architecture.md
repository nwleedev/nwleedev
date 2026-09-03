# 로컬 실행 구조와 계정 및 라이브러리 백로그 조사

## 결론

현재 개발 범위는 로컬 애플리케이션뿐이므로 시작 지점에서 IndexedDB, 브라우저 클립보드와 브라우저 분석기만 조립하면 된다. 계정, 동기화, 백엔드와 데이터베이스는 모든 백로그 가운데 우선순위가 가장 높고, 실행 모드를 나누는 설정과 원격 어댑터도 그 백로그에서 도입한다. 라이브러리 패키지 빌드와 포트폴리오 웹 애플리케이션 연결은 그보다 뒤의 백로그이며, 이 문서에 남긴 두 백로그 조사는 각 작업을 시작할 때 다시 검증할 참고 자료다.

현재 로컬 애플리케이션은 실행 모드를 선택할 환경변수가 없어도 구성할 수 있다. 최우선 계정 및 동기화 백로그에서는 빌드 시점 환경변수 하나로 로컬 또는 계정 구성을 선택하고, 독립 실행 애플리케이션의 시작 지점에서 이를 capabilities와 어댑터 묶음으로 변환하는 방안을 다시 검토한다. 화면 컴포넌트가 환경변수를 직접 읽거나 제공 항목마다 별도 환경변수를 두는 방식은 피하는 편이 낫다. 라이브러리 제공 형태는 백로그를 시작한 뒤에도 환경변수가 아니라 빌드 대상과 패키지 설정으로 구분해야 한다.

로컬 모드의 줄 단위 텍스트 분석은 별도 백엔드, 데이터베이스와 LLM 없이 구현할 수 있다. [줄 단위 텍스트 분석 결정](../decisions/text-analysis.md)에 따라 원문을 줄바꿈으로 분리하고, 정규화 뒤 정확한 일치, 포함 관계와 사용자 인식 문자 조각 기반 점수를 계산한다. [로컬 실행과 텍스트 분석 Worker 결정](../decisions/local-runtime-and-analysis-worker.md)에 따라 사용자가 분석을 요청할 때만 Dedicated Worker에서 실행한다.

이 문서는 [개인 메모 애플리케이션 요구사항](../requirements.md)의 로컬 독립 실행, 의존성 주입과 별도 백엔드 없는 분석 가능성을 조사하고, 계정 및 동기화와 라이브러리 제공 형태의 후속 구조를 기록한 참고 자료다. 계정 및 동기화와 라이브러리 제공 형태에 관한 절은 현재 구현 입력이 아니라 우선순위가 서로 다른 백로그 조사 기록이다. 제목에 `제안`이나 `백로그`가 붙은 항목은 승인된 구현 결정이 아니며, 현재 범위에서 승인된 결과는 연결된 결정 기록이 관리한다. 공식 문서와 표준은 2026년 8월 31일에 다시 검토했다.

## 저장소에서 확인한 전제

현재 저장소에는 애플리케이션 소스, 패키지 매니페스트, 잠금 파일, workspace 설정, 프레임워크 설정과 데이터베이스 설정이 없다. 따라서 이 조사에서는 패키지 관리자, workspace 구조, 라이브러리 번들러, 데이터베이스 시스템, DI 컨테이너나 feature flag 라이브러리를 선택하지 않는다. Next.js 16.3.3과 React 19.2.8은 기존 개발 지침의 조사 기준이고, Vite 자료는 브라우저용 라이브러리 빌드 후보를 비교하는 근거다. 설치 버전과 도구 선택은 매니페스트를 만들기 전에 다시 승인해야 한다.

## 최우선 백로그: 계정 및 동기화 실행 구성을 나누는 방법

이 절은 현재 로컬 애플리케이션의 선행 조건이 아니다. 계정 및 동기화 백로그를 시작할 때 실행 형태와 배포 단위를 결정하기 위한 조사다.

[Vite의 환경변수와 모드 문서](https://vite.dev/guide/env-and-mode)는 클라이언트에 노출되는 `import.meta.env` 값이 빌드 시 정적으로 치환된다고 설명한다. [Next.js 환경변수 문서](https://nextjs.org/docs/pages/guides/environment-variables)도 `NEXT_PUBLIC_` 변수가 브라우저 번들에 포함되며 빌드 뒤 값이 고정된다고 설명한다. 두 도구의 공통점은 공개 환경변수가 실행 중 바뀌는 비밀 설정이 아니라 빌드 결과를 만드는 공개 입력이라는 점이다.

[Next.js SPA 가이드](https://nextjs.org/docs/app/guides/single-page-applications)는 정적 내보내기를 선택 사항으로 설명하고 [Next.js 정적 내보내기 문서](https://nextjs.org/docs/app/guides/static-exports)는 서버 기능 제한을 명시한다. [Next.js 배포 문서](https://nextjs.org/docs/app/getting-started/deploying)는 `next build`와 `next start`를 Node.js 배포의 표준 명령으로 안내하고, [Next.js 자체 호스팅 문서](https://nextjs.org/docs/app/guides/self-hosting)는 공개 배포에서 reverse proxy 사용을 권장한다. 따라서 로컬 모드는 정적 결과물과 같은 뜻이 아니며 현재 독립 실행 애플리케이션은 Node.js 서버를 사용한다. 이 선택은 요청 시점 서버 기능을 지금 추가한다는 뜻이 아니라, 정적 사이트 배포에 필요한 별도 서버와 검증 스크립트를 유지하지 않기 위한 것이다.

[Twelve-Factor App의 설정 원칙](https://12factor.net/config)은 배포마다 달라지는 설정을 코드에서 분리해 환경변수로 관리하라고 권한다. 그러나 이 원칙은 UI와 도메인 코드가 환경변수를 직접 읽어도 된다는 뜻이 아니다. 환경변수는 배포 설정을 전달하고, 애플리케이션 내부에서는 타입이 있는 구성 객체로 변환하는 책임을 별도로 두는 편이 역할을 분명히 한다.

### 제안: 하나의 실행 모드에서 기능 목록을 파생한다

계정 및 동기화 백로그에서 빌드 입력이 필요하면 실행 모드 환경변수 하나로 제한한다. 환경변수 이름과 허용 값은 추적하지 않는 임시 결정 기록에서 관리하며, 독립 실행 애플리케이션의 composition root가 값을 검증한 뒤 다음 두 구성 항목을 만든다.

- `capabilities`: 계정, 원격 동기화, 서버 분석처럼 현재 실행 모드가 제공하는 기능 목록
- `dependencies`: 저장소, 클립보드, 텍스트 분석기와 동기화 서비스의 실제 구현 묶음

기능마다 `ENABLE_SYNC`, `ENABLE_ACCOUNT`, `ENABLE_REMOTE_STORAGE` 같은 환경변수를 따로 두면 계정 UI는 보이지만 원격 저장소는 없는 잘못된 조합을 만들 수 있다. 하나의 실행 모드에서 기능 목록을 파생하면 허용된 조합을 한 지점에서 검사할 수 있다.

공개 환경변수는 번들 안에서 읽을 수 있으므로 권한 검사의 근거가 될 수 없다. 계정 모드의 서버는 클라이언트 기능 목록과 관계없이 인증과 데이터 접근 권한을 검증해야 한다.

최우선 계정 및 동기화 백로그에서 동일한 빌드 결과물을 배포 뒤 설정만 바꿔 두 실행 형태로 전환하려면 빌드 시점 환경변수만으로는 부족하다. 이 경우 서버가 제공하는 공개 런타임 설정이나 배포 시 생성하는 설정 파일이 필요하지만, 로컬 결과물에 계정 전용 코드까지 포함된다. 두 실행 형태를 별도 결과물로 배포하기로 결정하면 빌드 시점 분리가 더 단순하며 로컬 결과물에서 계정 전용 코드를 제외하기도 쉽다.

실행 모드 환경변수에 독립 실행 또는 라이브러리 제공 형태를 뜻하는 값을 추가하지 않는다. 실행 모드와 제공 형태를 한 enum에 합치면 조합마다 UI가 갈라지기 쉽다. capabilities는 사용자에게 실제로 제공되는 기능만 설명해야 한다. 라이브러리 백로그를 시작하면 제공 형태는 어떤 호스트가 재사용 패키지를 조립하는지로 나타내는 방안을 다시 검증한다.

## 백로그: 독립 실행과 라이브러리에서 공통 기능을 조립하는 방법

이 절부터 `DI와 IoC는 실행 모드의 차이를 시작 지점에 모은다` 전까지는 라이브러리 및 포트폴리오 연결 백로그를 시작할 때 검토할 내용이다. 현재 독립 실행 애플리케이션 구현의 선행 조건이나 완료 기준으로 사용하지 않는다.

### 확인된 제약: 포트폴리오 웹 애플리케이션이 라우트를 정한다

[Next.js의 프로젝트 구조 문서](https://nextjs.org/docs/app/getting-started/project-structure)는 `app` 아래의 폴더가 URL 구획을 정하고 `page.tsx` 또는 `route.ts`가 있어야 공개 라우트가 된다고 설명한다. 따라서 라이브러리가 설치만으로 임의의 URL을 등록한다고 가정하지 않는다. 포트폴리오 웹 애플리케이션이 원하는 위치에 얇은 `page.tsx`를 만들고 라이브러리의 공개 진입점을 가져와 렌더링하는 방식이 공식 라우팅 규칙과 맞는다.

이 연결 방식에서는 다음 책임을 분리할 수 있다.

```text
personal notes package
  -> standalone route and composition root
  -> portfolio route and composition root
       -> local or account capabilities
       -> approved storage, analysis and sync adapters
```

- 개인 메모 패키지는 메모 화면, use case, 공통 type과 조립에 필요한 명시적 진입점을 제공한다.
- 독립 실행 애플리케이션은 자신의 route, metadata와 최상위 layout에서 패키지를 불러온다.
- 포트폴리오 웹 애플리케이션은 개인 메모를 제공할 URL과 바깥쪽 탐색을 정하고 라우트 파일에서 패키지를 불러온다.
- 패키지 내부 탐색이 하위 라우트를 필요로 하면 호스트 라우트 접두어나 탐색 어댑터를 명시적으로 받아야 한다. `/notes` 같은 절대 URL을 패키지 안에 고정하지 않는다.

단일 라우트 안에서 모든 개인 메모 화면을 전환할지, 포트폴리오 애플리케이션이 누적, 사용 빈도와 템플릿의 하위 라우트까지 만들지는 아직 승인되지 않았다. 이 선택에 따라 라이브러리 공개 API와 라우트 어댑터의 크기가 달라진다.

### `output: 'standalone'`은 라이브러리 빌드가 아니다

[Next.js의 `output` 문서](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)는 `standalone`이 운영 서버를 배포하는 데 필요한 파일과 최소 서버를 `.next/standalone`에 모으는 설정이라고 설명한다. 이 결과는 다른 애플리케이션이 React 모듈로 가져오는 패키지가 아니다. 이름이 같다는 이유로 독립 실행 요구사항이나 라이브러리 요구사항의 완료 증거로 사용하면 안 된다.

독립적인 로컬 웹 애플리케이션은 현재 [Next.js Node.js 배포](https://nextjs.org/docs/app/getting-started/deploying)를 사용한다. 이 운영용 빌드는 다른 애플리케이션이 import할 라이브러리 산출물이 아니므로 라이브러리 빌드와 별도로 검증해야 한다.

### 비교할 빌드 방식

현재 저장소에는 package manager와 소스가 없으므로 다음 두 방식을 후보로 남긴다.

#### workspace 소스 패키지를 호스트가 빌드한다

[Next.js의 `transpilePackages` 문서](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages)는 monorepo의 로컬 패키지나 `node_modules` 의존성을 Next.js가 변환하고 묶을 수 있다고 설명한다. 개인 메모 패키지가 TypeScript와 React 소스를 제공하고 독립 실행 애플리케이션과 포트폴리오 애플리케이션이 각각 이를 빌드하면, 두 호스트가 같은 Next.js 서버 및 클라이언트 모듈 규칙을 적용할 수 있다.

이 방식은 같은 저장소 안에서 개발하기 단순하지만 호스트 빌드 설정과 패키지 소스 형식의 결합이 강하다. 또한 사용자가 요청한 `라이브러리 형태로도 빌드`의 완료 증거가 단순 소스 import인지, 설치 가능한 패키지 산출물인지 결정해야 한다.

#### ESM과 타입 선언을 포함한 패키지 산출물을 만든다

[Vite의 Library Mode](https://vite.dev/guide/build#library-mode)는 브라우저 라이브러리의 여러 진입점, 외부화할 React 같은 의존성, ESM 및 CommonJS 결과와 별도 CSS export 구성을 설명한다. 이는 후보 도구의 가능성을 보여줄 뿐 Vite 채택 결정은 아니다. 다른 번들러나 TypeScript 컴파일러를 선택하더라도 다음 결과는 같아야 한다.

- 호스트가 가져올 JavaScript 진입점과 TypeScript가 해석할 타입 선언이 일치한다.
- React와 React DOM을 라이브러리 bundle에 복제하지 않는다.
- 클라이언트 진입점의 `'use client'` 지시문과 서버 진입점의 환경 제한 표시가 빌드 뒤에도 남는다.
- CSS, 글꼴과 Worker 같은 별도 파일을 패키지가 어떻게 제공하는지 공개 진입점으로 확인할 수 있다.
- 패키지 archive만 설치한 깨끗한 호스트에서 private 소스 경로 없이 빌드할 수 있다.

미리 묶은 패키지는 독립된 배포 단위가 되지만 React Server Components용 지시문, Next.js bundling, CSS 순서와 Worker URL이 변환 과정에서 손상될 수 있다. 이 위험을 검증하기 전에는 workspace 소스 패키지보다 자동으로 낫다고 판단하지 않는다.

### 공개 진입점은 실행 환경을 드러내야 한다

[Node.js 패키지 진입점 문서](https://nodejs.org/api/packages.html#package-entry-points)는 `exports`로 허용된 진입점을 명시하면 패키지 공개 API를 제한하고 subpath별 진입점을 제공할 수 있다고 설명한다. [TypeScript module resolution 문서](https://www.typescriptlang.org/docs/handbook/modules/reference#packagejson-exports)는 `node16`, `nodenext`와 `bundler` resolution에서 `exports`와 `types` condition을 해석하는 규칙을 정의한다.

다음과 같이 역할이 다른 진입점을 분리하는 방안을 검토한다. 이름은 설명용 후보이며 승인된 패키지 API가 아니다.

- `./shared`: 직렬화 가능한 type, schema와 순수 함수
- `./client`: 개인 메모 Client Component와 브라우저 조립 진입점
- `./server`: 계정 모드의 서버 조립 진입점
- `./styles.css`: 호스트가 명시적으로 불러올 라이브러리 스타일

일반 root entry가 `./client`와 `./server`를 모두 다시 내보내면 호스트가 잘못된 실행 환경을 가져오기 쉽다. root entry를 두지 않거나 환경 중립적인 export만 제공하는 선택을 우선 검토한다. `index.server.ts`와 `index.client.ts`라는 파일명은 Next.js가 자동으로 선택하지 않으므로 `package/client`, `package/server`처럼 호스트 import에서 환경을 명시해야 한다.

[Next.js의 Server 및 Client Components 문서](https://nextjs.org/docs/app/getting-started/server-and-client-components)는 클라이언트 전용 기능을 쓰는 component library 진입점에 `'use client'`를 넣으라고 안내하며 일부 번들러가 지시문을 제거할 수 있다고 경고한다. 서버 진입점과 그 하위 database code는 `server-only` 표시와 import 검사를 함께 사용해야 한다.

[React의 Server Components 문서](https://react.dev/reference/rsc/server-components)는 Server Components 자체와 달리 이를 구현하는 번들러 및 프레임워크 API가 React 19 minor version 사이의 semver 안정성을 제공하지 않는다고 설명한다. 따라서 `./server` 진입점을 일반 React 호스트에서도 그대로 쓸 수 있다고 약속하지 않는다. Next.js 이외의 호스트까지 제공하려면 환경 중립 use case와 클라이언트 진입점, Next.js 전용 서버 연결을 별도 패키지 또는 subpath로 나누는 방안을 비교해야 한다.

### React 사본과 호스트 프레임워크의 책임을 중복하지 않는다

[React의 Invalid Hook Call 경고](https://react.dev/warnings/invalid-hook-call-warning#duplicate-react)는 애플리케이션 코드와 React DOM이 서로 다른 React 사본을 해석하면 Hook 호출이 깨질 수 있으며, library가 React를 일반 dependency로 잘못 선언하는 경우를 원인으로 든다. [npm의 `peerDependencies` 문서](https://docs.npmjs.com/files/package.json/#peerdependencies)는 host와 함께 작동해야 하는 package가 호환 범위를 선언하는 방법을 설명한다.

React와 React DOM은 호스트가 제공하는 peer dependency이자 라이브러리 bundle의 external 후보로 검토한다. Next.js API를 패키지 공개 진입점에서 직접 사용한다면 Next.js도 호환 범위와 호스트 책임을 명시해야 한다. 정확한 범위는 설치할 Next.js와 React 버전, 독립 실행 및 포트폴리오 호스트의 잠금 파일을 확인한 뒤 정해야 한다.

### 설정과 의존성은 호스트 조립 지점에서 전달한다

라이브러리 모듈이 import되는 순간 `process.env`나 `window`를 읽으면 호스트 빌드 설정에 숨은 의존성이 생기고 static export의 사전 render에서도 실패할 수 있다. 독립 실행 애플리케이션과 포트폴리오 웹 애플리케이션은 각자 환경변수를 검증해 실행 모드, 라우트 접두어와 어댑터를 명시적인 구성 객체로 바꾼 뒤 개인 메모 composition root에 전달해야 한다.

계정 모드의 Server Action과 Route Handler를 라이브러리가 직접 구현할지, 포트폴리오 호스트가 자신의 인증 및 database 연결로 구현할지는 결정이 필요하다. 서버 구현을 패키지가 제공하더라도 호스트가 인증, 권한, cache와 배포 설정의 최종 책임을 가져야 한다.

### 스타일과 Worker도 package API의 일부다

[Next.js의 CSS 문서](https://nextjs.org/docs/app/getting-started/css)는 외부 패키지의 stylesheet를 가져올 수 있지만 전역 style은 라우트를 이동한 뒤 제거되지 않아 충돌할 수 있다고 설명한다. 개인 메모 라이브러리는 호스트의 reset, `html`, `body`나 전역 element를 덮지 않고 component style과 semantic token 범위를 제한해야 한다. 외부 CSS 진입점을 제공할지 CSS Module을 JavaScript 진입점에 함께 넣을지는 빌드 도구와 호스트 theme 연결 방식이 정해진 뒤 결정한다.

Web Worker를 `new URL(..., import.meta.url)`로 만드는 코드는 소스 패키지와 미리 묶은 패키지에서 서로 다른 asset 경로가 될 수 있다. 현재 Next.js 문서에는 외부 패키지의 Worker asset을 처리하는 별도 안정 규칙이 확인되지 않았다. 로컬 및 계정 모드의 라이브러리 산출물을 실제 호스트 production build에 설치해 Worker 생성, code splitting과 정적 asset URL을 확인하기 전에는 패키지 내부 상대 경로를 확정하지 않는다. 필요한 경우 Worker factory를 브라우저 composition root가 제공하는 방안도 비교한다.

### 백로그 완료를 확인할 빌드 및 통합 증거

패키지 관리자와 빌드 명령이 승인되면 다음을 같은 revision에서 확인해야 한다.

- 승인된 실행 모드별 독립 실행 빌드와 라이브러리 빌드가 각각 성공한다.
- 패키지 archive의 공개 진입점, 타입 선언, stylesheet와 Worker asset 목록이 의도한 파일만 포함한다.
- 패키지 archive를 깨끗한 포트폴리오 호스트에 설치하고 호스트의 `page.tsx`에서 공개 진입점만 가져와 production build할 수 있다.
- 호스트가 선택한 라우트와 다른 라우트 접두어 두 곳에서 탐색, asset URL과 새로고침이 일관되게 동작한다.
- 클라이언트 진입점의 `'use client'`와 server-only 표지가 빌드 결과에 남고, 반대 환경 import는 빌드에서 실패한다.
- dependency graph에는 호스트와 라이브러리가 공유하는 React 사본이 하나만 있으며 호환되지 않는 peer version은 설치 단계에서 드러난다.
- 라이브러리 style이 호스트의 다른 포트폴리오 라우트를 바꾸지 않고, 호스트 theme와 개인 메모 token의 연결이 확인된다.
- 현재 로컬 클라이언트 bundle에는 계정 서버 진입점, PostgreSQL client, 사용하지 않는 Server Actions와 비밀 환경변수 접근 코드가 포함되지 않는다.
- 패키지에 포함된 Worker가 실제 브라우저에서 시작되고 분석 요청과 오류 처리를 수행한다.

현재는 매니페스트와 명령이 없으므로 구체적인 빌드 명령을 추정하지 않는다. 패키지 관리자를 고른 뒤 `pack --dry-run`에 해당하는 archive 검사, TypeScript 검사, 모드별 production build와 실제 브라우저 검사를 저장소 명령으로 정해야 한다.

## DI와 IoC는 실행 모드의 차이를 시작 지점에 모은다

[Martin Fowler의 Dependency Injection 글](https://martinfowler.com/articles/injection.html)은 객체가 필요한 구현을 직접 찾는 대신 외부 구성 코드가 구현을 전달하도록 설명하며, 특별한 이유가 없을 때 constructor injection을 우선하는 결론을 제시한다. [Inversion of Control 설명](https://martinfowler.com/bliki/InversionOfControl.html)은 프레임워크나 상위 흐름이 호출 순서를 맡고 애플리케이션 코드가 정해진 지점에 동작을 제공하는 구조를 설명한다. DI는 IoC를 구현하는 한 방법이며 두 용어를 같은 뜻으로 사용할 필요는 없다.

[Alistair Cockburn의 Ports and Adapters 설명](https://alistair.cockburn.us/hexagonal-architecture)은 애플리케이션의 내부 동작을 UI, 데이터베이스와 자동화된 테스트 같은 외부 기술에서 분리하고, 포트 뒤의 어댑터를 교체할 수 있게 구성한다. 로컬 저장소와 원격 저장소가 같은 과업을 제공해야 하는 이번 요구와 직접 맞닿는다.

### 제안: 수동 DI와 책임을 드러내는 interface를 먼저 사용한다

현재 의존성 그래프가 없으므로 DI 컨테이너 패키지를 추가할 근거도 없다. TypeScript interface와 일반 함수 또는 생성자만으로 다음 구조를 먼저 구성하는 방안을 검토한다.

```text
local application entry
  -> local composition root
    -> IndexedDB, clipboard and browser analyzer
      -> application use cases
        -> local UI

account backlog
  -> account composition root
    -> remote storage and sync service
      -> shared application use cases and UI
```

공통 application 동작이 의존할 interface 후보는 다음과 같다. `Port`나 `Adapter`를 이름에 반복하지 않고 수행하는 책임을 나타낸다.

- `NoteRepository`: 메모와 공간 배치를 저장하고 읽는다.
- `BatchCopyRepository`: 현재 일괄 복사 항목과 순서를 읽고 재정렬한다.
- `BatchCopyItemWriter`: 원문 스냅샷 추가와 사용 횟수 증가를 하나의 저장 동작으로 처리한다.
- `TemplateRepository`: 템플릿과 플레이스홀더를 저장하고 읽는다.
- `UsageRepository`: 개별 복사와 일괄 복사 항목 추가 횟수를 구분해 기록한다.
- `TextAnalyzer`: 줄 단위의 정확한 반복, 포함 관계와 문자열 근접 점수를 분석한다.
- `ClipboardWriter`: 클립보드 쓰기 결과를 성공 또는 실패로 돌려준다.
- `SyncService`: 최우선 계정 및 동기화 백로그에서만 제공하며 로컬 변경을 서버와 맞춘다.

현재 로컬 composition root는 IndexedDB 저장 구현과 브라우저 분석기를 주입하고 `SyncService`를 제공하지 않는다. [로컬 저장과 실행 중 상태 결정](../decisions/local-storage-and-ephemeral-state.md)에 따라 공통 Client Provider에서 한 번 조립하되 생성 중에는 브라우저 전역을 읽지 않고, `BatchCopyItemWriter`의 IndexedDB 구현이 일괄 복사 항목 및 횟수 변경을 같은 transaction으로 처리한다. 로컬 UI에는 계정 전용 탐색 항목과 화면을 만들지 않는다. 최우선 계정 및 동기화 백로그를 시작하면 원격 저장 구현과 동기화 서비스를 별도 composition root에서 조립하고, 공통 화면이 같은 application 동작을 호출할 수 있는지 다시 검증한다. 라이브러리 백로그를 시작하면 독립 실행과 포트폴리오 호스트가 서로 다른 라우트 연결과 바깥쪽 화면 구성을 사용하면서 같은 application 동작과 UI 진입점을 조립할 수 있는지 다시 검증한다.

Service Locator처럼 application 동작이 전역 레지스트리에서 의존성을 찾으면 어떤 실행 모드에서 무엇이 필요한지 호출 지점만 보고 알기 어렵다. 시작 지점에서 의존성을 만들고 필요한 동작에 명시적으로 전달하면 로컬 코드가 실수로 서버 구현을 부르는 문제도 타입과 구성 검사에서 발견하기 쉬워진다.

## 로컬 저장과 분석은 브라우저 API만으로 수행할 수 있다

[Indexed Database API 3.0 표준](https://www.w3.org/TR/IndexedDB/)은 브라우저 안에서 구조화된 레코드와 인덱스를 저장하고 트랜잭션으로 변경을 묶는 API를 정의한다. 메모, 좌표, 일괄 복사 상태, 사용 횟수와 템플릿처럼 서로 다른 객체를 로컬에 저장할 수 있다. 다만 [Storage API의 영구 저장소 설명](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)은 영구 저장 요청이 승인된다는 보장이 없음을 명시하므로, IndexedDB만으로 장기 보관과 백업을 보장할 수는 없다.

[HTML 표준의 Web Workers 절](https://html.spec.whatwg.org/multipage/workers.html)는 문서의 UI 흐름과 분리된 작업자를 정의한다. 분석을 Worker에 두면 많은 줄을 비교하는 동안 메모 이동과 화면 조작이 멈추는 위험을 줄일 수 있다. Worker는 성능 문제를 없애는 것이 아니라 UI 스레드와 계산을 분리하는 수단이므로, 입력 규모에 따른 시간과 메모리 측정은 별도로 필요하다.

### 결정: 명시적 분석 요청 뒤 다음 절차를 실행한다

1. 분석을 누른 시점의 메모 내용과 content revision을 스냅샷으로 만든다.
2. 각 메모의 원문에서 CRLF, LF와 CR을 줄바꿈으로 인식하고 원래 줄 위치를 유지한다.
3. 앞뒤 공백 제거, 내부 공백 정리, NFC 정규화와 locale 비의존 소문자 변환으로 비교용 문자열을 만든다. 원문과 문장부호는 그대로 유지하고 빈 결과는 제외한다.
4. 정규화된 문자열이 같은 줄을 정확한 반복으로 묶는다.
5. 한 줄이 다른 줄에 포함되는 관계를 찾는다.
6. 나머지 사용자 인식 문자 3개 이상인 줄은 extended grapheme 3-gram 집합의 Jaccard 점수를 계산한다.
7. 점수가 0보다 큰 후보를 내림차순으로 돌려준다. 점수는 의미가 같다는 판정이나 고정 합격 기준으로 사용하지 않는다.
8. 알고리즘 이름과 버전, 원본 줄 위치 및 content revision을 결과에 포함한다.

[Broder의 문서 resemblance와 containment 논문](https://www.cs.princeton.edu/courses/archive/spr05/cos598E/bib/broder97resemblance.pdf)은 문자열 조각 집합을 이용해 문서 간 유사성과 포함 관계를 계산하는 방법을 제시한다. [Winnowing 논문](https://www.cs.princeton.edu/courses/archive/spring05/cos598E/bib/p76-schleimer.pdf)은 부분 일치를 찾기 위한 지문 선택 방법과 보장 조건을 설명한다. 두 방법은 의미의 같음을 판별하지 않지만, 요구사항의 생김새 기반 반복과 포함 관계 후보를 줄이는 근거가 된다.

한국어와 영어가 섞인 메모에서 단어 분리 규칙에 기대지 않도록 사용자에게 보이는 문자 단위의 3-gram을 사용한다. 사용자 인식 문자 3개 미만인 줄은 정확한 반복과 포함 관계만 판정한다. 보편적인 Jaccard 합격 임계값을 임의로 정하지 않고 점수를 정렬과 설명에만 사용한다. 실제 예제의 후보 수와 계산 시간은 구현 중 측정한다.

줄이 `n`개일 때 모든 쌍을 직접 비교하면 `n(n-1)/2`개 비교가 필요하다. 정확 일치 해시, 길이 차이, 공통 지문이나 역색인으로 후보를 먼저 줄이고 분석 중 진행 상태를 제공한다. 입력 제한과 사용자 취소는 측정 전 임의로 추가하지 않는다.

## 클립보드 실패는 실제 쓰기 결과로 판단한다

[Clipboard API and Events 표준](https://www.w3.org/TR/clipboard-apis/)은 비동기 클립보드 접근에 secure context와 사용자 활성화 또는 권한 조건이 적용될 수 있음을 정의한다. [MDN의 Clipboard API 문서](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)는 브라우저마다 `clipboard-write` 권한 처리와 사용자 활성화 요구가 다름을 정리한다. 따라서 Permissions API의 사전 조회만으로 복사 가능 여부를 결정하지 말고, 실제 `writeText` 결과를 처리해야 한다.

[Secure Contexts 표준](https://www.w3.org/TR/secure-contexts/)은 HTTPS, loopback과 규칙을 지키는 localhost를 잠재적으로 신뢰할 수 있는 출처로 다룬다. `file:`도 기본 알고리즘에서는 신뢰 대상으로 볼 수 있지만 브라우저가 더 엄격하게 제외할 수 있다고 허용한다. [MDN의 secure context 설명](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts)도 일반적인 원격 출처에는 HTTPS가 필요하고 localhost 계열 출처는 잠재적으로 신뢰할 수 있다고 설명한다.

Secure Contexts 표준은 이 프로젝트에서 허용하지 않는 일부 주소도 잠재적으로 신뢰할 수 있다고 판정할 수 있다. 이 프로젝트의 로컬 모드는 HTTPS URL 또는 호스트 이름이 정확히 `localhost`인 HTTP URL로만 접속한다. `file://`, loopback IP를 포함한 다른 호스트 이름의 HTTP URL과 원격 HTTP URL은 지원하지 않는다. 현재 Next.js 운영 서버도 같은 URL 조건을 적용한다.

접속 프로토콜과 호스트 이름은 환경변수로 선택하지 않는다. 배포 구성이 URL을 정하고, 애플리케이션은 실행 시점의 `location.protocol`, `location.hostname`과 `isSecureContext`를 검사한다. 조건을 통과하지 못하면 내부 판정값 대신 `잘못된 접근입니다.`와 HTTPS 또는 `http://localhost`로 다시 여는 방법을 안내한다. 지원 주소에서도 브라우저 권한과 사용자 활성화 조건이 남으므로 클립보드 성공 여부는 실제 `writeText` 결과로 판정한다.

## 최우선 백로그: 계정 동기화에는 서버가 최종 변경을 판정할 기준이 필요하다

[HTTP Semantics의 ETag와 If-Match 규칙](https://httpwg.org/specs/rfc9110.html#field.if-match)은 클라이언트가 읽은 표현과 서버의 현재 표현이 같은 경우에만 변경을 적용해 갱신 손실을 막는 방법을 정의한다. 계정 모드는 각 엔티티의 revision이나 HTTP validator를 사용해 충돌을 감지하고, 충돌했을 때 덮어쓰기, 병합 또는 사용자 선택 가운데 어떤 동작을 할지 정해야 한다.

[Apache CouchDB의 충돌 설명](https://docs.couchdb.org/en/stable/replication/conflicts.html)은 분산 변경이 충돌할 수 있으며 선택된 승자 외의 revision도 충돌 정보로 남는 모델을 보여준다. [CouchDB 문서 API의 삭제 설명](https://docs.couchdb.org/en/stable/api/document/common.html#delete--db-docid)는 삭제를 즉시 흔적 없이 없애지 않고 삭제 revision으로 기록한다. 특정 데이터베이스를 추천하는 근거가 아니라, 오프라인 변경과 삭제를 여러 기기에 전파하려면 tombstone과 충돌 정책이 필요하다는 비교 사례다.

데이터베이스 시스템과 인증 방식은 아직 선택할 수 없다. 계정 모드의 저장 구조는 [데이터 구조 조사 초안](data-model-draft.md)의 논리 모델과 충돌 해결 쟁점을 먼저 승인한 뒤 결정해야 한다.

## 현재 범위의 결정과 계획 영향

- localhost HTTP는 `next start`로 제공하고 HTTPS는 reverse proxy 또는 배포 플랫폼에서 TLS를 종료한다. 운영용 브라우저 검증은 Playwright Test의 `webServer`로 Next.js 서버를 시작하며, HTTPS 검증은 배포 환경에서 같은 revision을 사용한다.
- 현재 배포 형식과 Dedicated Worker 구조는 [로컬 실행과 텍스트 분석 Worker 결정](../decisions/local-runtime-and-analysis-worker.md)을 따른다. 기능 구현 전에 운영용 빌드에서 Worker URL, MIME type과 메시지 왕복을 검증한다.
- 정규화, 정확한 반복, 포함 관계와 Jaccard 점수는 [줄 단위 텍스트 분석 결정](../decisions/text-analysis.md)을 따른다. 고정 합격 기준을 만들지 않는다.
- 현재는 외부 의존성이나 버전을 추가하지 않는다. 기술 스택과 매니페스트가 생긴 뒤 플랫폼 기능, 내부 구현과 후보 패키지의 직접 및 전이 의존성을 다시 비교해야 한다.

### 최우선 계정 및 동기화 백로그에서 결정할 사항

- 로컬과 계정 실행 형태를 별도 빌드 결과물로 배포할지, 한 결과물에 런타임 설정을 주입할지 결정해야 composition root와 배포 검증을 확정할 수 있다.
- 계정 동기화의 충돌과 삭제 규칙을 승인하기 전에는 서버 API와 데이터베이스 구조를 확정할 수 없다.

### 라이브러리 백로그에서 결정할 사항

- 라이브러리를 같은 저장소의 workspace 소스 패키지로 제공할지, ESM과 타입 선언을 포함한 설치 가능한 산출물로 제공할지 결정해야 빌드 도구와 패키지 검증을 확정할 수 있다.
- 지원 호스트를 Next.js App Router로 제한할지 다른 React 호스트까지 포함할지 결정해야 peer dependency와 공개 진입점을 확정할 수 있다.
- 포트폴리오 호스트가 단일 라우트에서 개인 메모 내부 화면을 전환할지 하위 라우트를 각각 만들지 결정해야 라우트 접두어와 탐색 interface를 확정할 수 있다.
- 개인 메모 모듈과 포트폴리오 호스트가 탐색, 페이지 제목, theme, error boundary와 상태 알림을 어떻게 나눌지 결정해야 삽입된 UI의 조립 범위를 확정할 수 있다.
- 포트폴리오 호스트에서 계정 모드를 제공할지, 인증과 서버 어댑터를 패키지 또는 호스트 중 어디에서 조립할지 결정해야 서버 진입점을 확정할 수 있다.
- CSS와 Worker asset을 패키지에서 제공하는 방식은 선택한 번들러와 두 호스트의 production build에서 검증한 뒤 확정해야 한다.
