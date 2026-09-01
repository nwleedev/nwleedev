# 애플리케이션 패키지 위치와 FSD 구조 결정

개인 메모 애플리케이션은 `apps/notes/`에 독립 실행 가능한 애플리케이션 패키지로 두고, 애플리케이션 매니페스트는 `apps/notes/package.json`에 둔다. Next.js App Router 파일은 `apps/notes/app/`에 두며, FSD 코드는 `apps/notes/src/` 아래의 `_app`, `_pages`, `features`, `entities`와 `shared` 계층 가운데 실제 코드가 필요한 계층만 만든다.

## 결정 질문과 요구 결과

[요구사항의 패키지 위치와 소스 구조 조건](../requirements.md#반드시-지킬-조건)은 앞으로 같은 저장소에 여러 애플리케이션을 둘 수 있도록 개인 메모 애플리케이션 파일을 `apps/notes/`에 모으고, 프론트엔드 소스가 FSD의 의존 방향과 public API 규칙을 따르도록 요구한다. 현재 독립 실행 애플리케이션과 [라이브러리 및 포트폴리오 연결 백로그](../requirements.md#라이브러리-및-포트폴리오-연결)는 서로 다른 작업으로 유지해야 한다.

## 검토한 선택지

- 저장소 루트에 Next.js 애플리케이션을 두면 초기 파일 수는 줄지만, 다음 애플리케이션을 추가할 때 루트 설정과 애플리케이션 전용 파일을 다시 분리해야 한다.
- `apps/notes/`에 애플리케이션을 두고 업무 의미와 계층 의존 방향이 없는 임의 폴더를 사용하면 파일 위치는 분명하지만 FSD 준수 여부를 확인할 수 없다.
- `apps/notes/`에 애플리케이션을 두고 Next.js 라우트와 FSD 소스를 분리하면 개인 메모 파일, 프레임워크 진입 파일과 애플리케이션 코드의 역할을 함께 구분할 수 있다.
- 지금 라이브러리 패키지까지 분리하면 현재 범위에 없는 공개 진입점, peer dependency, CSS와 Worker 자산 제공 방식을 먼저 확정해야 하므로 백로그를 앞당기게 된다.

## 결정 이력

- 초기 계획은 저장소 루트와 `apps/personal-notes/` 가운데 프로젝트 위치를 U1에서 고르고, 소스 규모를 확인하기 전에는 FSD를 도입하지 않는 안이었다.
- 저장소에 여러 애플리케이션을 둘 수 있어야 한다는 방향에 따라 애플리케이션 이름을 짧고 명확한 `notes`로 정하고 `apps/notes/package.json`을 패키지 매니페스트로 선택했다.
- FSD를 처음부터 적용하되 실제 코드가 없는 계층과 slice는 미리 만들지 않기로 했다. 화면 하나에서만 쓰는 조합은 그 화면의 Pages slice에 두고, 여러 화면에서 반복해 사용하는 사용자 동작이 확인될 때 Features slice로 옮긴다.
- 현재 결정은 Next.js 라우트를 패키지 루트의 `app/`에 두고, FSD 계층을 `src/`에 분리하며, 라이브러리 빌드는 기존 백로그에 남기는 것이다.
- 구조 검사 재검토에서는 별도 검사 스크립트보다 ESLint 실행 안에서 import 방향과 public API를 검사하기로 했다. 화면과 모듈 이름은 일부 계산 방식이 아니라 전체 작업을 나타내는 `analysis`를 사용한다.
- 누적 기능의 위치 재검토에서는 독립 route와 Pages slice를 만들지 않고 메모 화면의 보조 패널로 구성하기로 했다.
- U3 브라우저 통합 검사에서는 Pages slice의 `index.ts`가 route UI와 IndexedDB 조립 항목을 함께 다시 내보내 저장 검사에서 필요하지 않은 `next/link`까지 평가되는 문제가 확인됐다. 실행 환경 이름을 붙인 대칭 진입점 대신 사용 목적이 분명한 route용 `index.ts`와 조립용 `composition.ts`로 나누기로 했다.
- 모바일 일괄 복사 요구사항은 `48rem` 미만에서 별도 `/accumulator` 페이지를 요구하므로 `_pages/accumulator`를 추가한다. 메모 패널과 모바일 페이지가 함께 사용하는 일괄 복사 목록 편집 동작은 Pages slice 사이에서 가져오지 않고 `features/edit-accumulated-text`로 분리한다.

## 승인된 결정과 이유

- 독립 실행 애플리케이션의 패키지 루트는 `apps/notes/`다. 애플리케이션 의존성과 실행 명령은 `apps/notes/package.json`이 관리한다. 저장소 전체 package manager, workspace 선언과 잠금 파일 형식은 U1의 의존성 조사에서 정한다.
- Next.js의 특별 디렉터리는 `apps/notes/app/`에 둔다. 라우트의 `page.tsx`는 `apps/notes/src/_pages/`의 공개 진입점을 연결하고, 공통 `layout.tsx`는 `apps/notes/src/_app/`의 provider와 전역 스타일을 연결하는 데 집중한다.
- FSD App과 Pages 계층은 Next.js의 `app` 및 `pages` 이름과 구분하기 위해 `_app`과 `_pages`로 쓴다. [FSD의 Next.js 가이드](https://github.com/feature-sliced/documentation/blob/a6b69ae21d571d64b0387ff261b95477165030b2/src/content/docs/docs/guides/tech/with-nextjs.mdx)는 두 계층 이름을 구분하고 Next.js 라우트 디렉터리를 프로젝트 루트에 두면 `src/`를 FSD 코드에만 사용할 수 있다고 설명한다.
- `_pages`는 `notes`, `usage`, `analysis`, `templates`, `settings`와 `accumulator` 화면 slice를 둔다. 넓은 화면의 패널 껍데기는 `notes`에, 모바일 관리 페이지 껍데기는 `accumulator`에 두고 두 Pages slice가 서로 가져오지 않게 한다. 두 화면이 함께 사용하는 누적 목록 편집 동작과 UI는 `features/edit-accumulated-text`가 맡고, 저장되는 누적 자료와 규칙은 `entities/accumulator`가 맡는다. 한 화면에서만 쓰는 UI와 동작은 그 화면 slice 안에 유지한다.
- `features`는 여러 화면에서 다시 사용하는 사용자 동작이 실제로 생길 때만 만든다. `entities`는 메모, 일괄 복사 항목, 사용 기록, 템플릿과 사용자 설정처럼 개인 메모 애플리케이션이 식별하는 자료와 규칙을 두고, `shared`는 개인 메모 업무 의미가 없는 공통 UI, 브라우저 연결과 제한된 내부 라이브러리를 둔다. [FSD Layers](https://github.com/feature-sliced/documentation/blob/a6b69ae21d571d64b0387ff261b95477165030b2/src/content/docs/docs/reference/layers.mdx)는 필요한 계층만 만들고 Pages에 화면 전용 코드를 유지하며 여러 화면에서 재사용하는 동작을 Features로 분리하라고 설명한다.
- `widgets`는 현재 화면에서 재사용할 독립 UI 블록이 확인되지 않았으므로 만들지 않는다. 폐기된 `processes` 계층도 만들지 않는다. 이후 필요가 확인되면 같은 결정 기준으로 다시 검토한다.
- slice와 slice가 없는 계층의 segment는 필요한 항목만 명시적으로 내보내는 public API를 둔다. 다른 slice는 public API로만 가져오고 같은 slice 안에서는 자신의 `index.ts`를 거치지 않는 상대 경로를 사용한다. `export *`는 사용하지 않는다. Entities slice 사이의 자료 관계를 type으로 직접 표현해야 할 때에만 FSD의 `@x` public API를 사용하고, 그 밖의 같은 계층 import는 허용하지 않는다. 이 규칙은 [FSD의 slice와 segment 규칙](https://github.com/feature-sliced/documentation/blob/a6b69ae21d571d64b0387ff261b95477165030b2/src/content/docs/docs/reference/slices-segments.mdx)과 [public API 지침](https://github.com/feature-sliced/documentation/blob/a6b69ae21d571d64b0387ff261b95477165030b2/src/content/docs/docs/reference/public-api.mdx)을 따른다.
- `shared/ui`와 `shared/lib`는 하나의 전체 barrel을 만들지 않는다. 각 UI 구성요소와 내부 라이브러리가 자체 public API를 두고, 내부 라이브러리는 허용할 책임과 제외할 책임을 짧은 README에 기록한다.
- `_app`은 아래 계층의 공개 진입점을 가져와 브라우저 구현과 provider를 조립한다. 아래 계층은 `_app`을 가져오지 않는다. 각 화면 또는 사용자 동작에 필요한 의존성은 그 책임을 가진 slice가 필요한 메서드만 포함한 interface와 Context를 정의하고, `_app`이 구현을 제공한다.
- `_pages` slice의 `index.ts`는 Next.js route가 사용할 화면 UI만 내보낸다. `_app`이 가져올 provider, 책임별 interface와 브라우저 구현은 필요한 slice에만 `composition.ts`를 두어 명시적으로 내보낸다. 두 진입점은 서로의 항목을 다시 내보내지 않으며 ESLint는 route가 `composition.ts`를 가져오거나 다른 slice가 내부 파일을 우회하는 import를 거절한다.
- 현재 로컬 애플리케이션에는 별도 public API가 필요한 server-only 자료 접근이나 실행 시점 서버 구현이 없으므로 환경별 진입점을 대칭으로 만들지 않는다. 실제 server-only export가 생겨 일반 `index.ts`가 브라우저 모듈 그래프를 오염시키는 경우에만 명시적인 `index.server.ts`를 추가한다.
- U1의 의존성 조사에서 `@feature-sliced/eslint-config`, Steiger, 범용 ESLint 구조 플러그인과 내부 검사 스크립트를 비교했다. 현재 flat config와 TypeScript alias를 사용하면서 정적 및 동적 import를 함께 검사할 수 있는 `@boundaries/eslint-plugin` 7.2.0과 `eslint-import-resolver-typescript` 4.4.5를 선택한다. ESLint의 `boundaries/dependencies`에서 계층 역방향 import, 허용된 Entities `@x` 외의 같은 계층 import와 public API 우회를 검사하고, core 규칙으로 `export *`를 막는다. Next.js 라우트의 연결 대상과 실행 환경이 다른 진입점의 혼입도 ESLint에서 판정할 수 있는 import에는 같은 실행에서 적용한다.
- ESLint 설정의 판별력을 확인하려고 영구 fixture나 별도 검사 스크립트를 만들지 않는다. 구현 중 저장소의 무시된 임시 파일로 정상 및 위반 import를 한 번 확인한 뒤 실제 소스의 lint를 반복 검증 명령으로 사용한다. 브라우저와 서버 모듈 그래프의 실제 번들 포함 여부처럼 ESLint가 판정할 수 없는 항목은 Next.js 운영용 빌드로 확인한다.

[Next.js 16.3.3 프로젝트 구조 문서](https://github.com/vercel/next.js/blob/a9a1cb7859f178f830ad3773b303130c21b19586/docs/01-app/01-getting-started/02-project-structure.mdx)는 `app`, `public`, 선택적인 `src`와 `package.json`의 역할을 구분하고, Next.js가 애플리케이션 내부 구조를 강제하지 않는다고 설명한다. [JS Boundaries의 element 분류](https://www.jsboundaries.dev/docs/classification/elements/), [의존성 규칙](https://www.jsboundaries.dev/docs/rules/dependencies/)과 [selector 문서](https://www.jsboundaries.dev/docs/selectors/)는 파일 위치에서 계층 및 slice 이름을 추출하고 import 양쪽의 추출값과 내부 파일 위치를 규칙에 사용할 수 있음을 설명한다. 따라서 위 배치는 Next.js의 파일 규칙을 유지하면서 이 저장소가 승인한 FSD 구조를 ESLint에서 검사한다.

## 예상 결과와 계획 영향

U1은 더 이상 애플리케이션 디렉터리를 비교하지 않고 `apps/notes/package.json`, 패키지 루트의 Next.js 설정, `apps/notes/app/`과 `apps/notes/src/`를 만든다. 이후 작업 단위의 파일 후보는 화면 전용 코드를 `_pages`, 메모와 템플릿 자료 및 규칙을 `entities`, 외부 기술 연결을 `shared`, 여러 화면에서 재사용하는 동작만 `features`에 배치한다. U4와 U7은 `/accumulator`, `_pages/accumulator`와 `features/edit-accumulated-text`를 이 기준으로 추가한다.

라우트 파일, FSD import 방향과 public API 준수 여부는 U1에서 확정한 ESLint 설정과 운영용 Next.js 빌드로 확인한다. 이 결정은 package manager, FSD 검사 외의 정확한 의존성 버전, 라이브러리 공개 진입점이나 포트폴리오 라우트 연결을 승인하지 않는다.

## 다시 검토할 조건

- Next.js App Router를 사용하지 않게 되는 경우
- 화면 하나의 코드가 커져 현재 Pages slice 안에서 찾기 어려워지거나 여러 화면에서 같은 사용자 동작을 실제로 재사용하게 되는 경우
- server-only 코드가 추가되어 일반 public API가 브라우저 모듈 그래프를 오염시키는 경우
- 독립 실행 애플리케이션과 별도로 라이브러리 패키지 또는 포트폴리오 호스트 연결을 시작하는 경우
- 같은 저장소에 두 번째 애플리케이션을 추가하면서 루트 workspace 규칙을 확정해야 하는 경우
