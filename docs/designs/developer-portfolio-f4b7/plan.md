# 단일 칼럼 개발자 소개 웹사이트 변경 플랜

기존 Astro 페이지를 네비게이션 바 없는 단일 칼럼으로 바꾸고, 각 경력에서 무엇을 어떻게 기여했는지 본문으로 설명한다. 기여 본문과 언어 선택 구조는 구현했으며 페이지 배치는 아래 순서에 따라 변경한다.

## 기준과 유지할 구현

이 플랜을 마지막으로 변경한 커밋의 [요구사항](requirements.md), 아래 결정과 개발 지침을 구현 기준으로 삼는다.

- [편집형 시각 방향](decisions/editorial-direction.md): 단일 칼럼, 절제된 글자 위계와 네비게이션 바 제외.
- [기여 선정과 서술](decisions/featured-cases.md), [홈페이지 한국어 문구](references/homepage-copy.md): 담당한 문제, 변경 방법과 확인 결과.
- [개인 사이트 재조사](references/personal-site-recheck.md): 세 사이트의 실제 배치와 채택하지 않을 요소.
- [문구 저장](decisions/terms-storage.md), [독립 작업](decisions/project-availability.md), [개발자 소개 기준](decisions/developer-positioning.md).
- [디자인 체계](../../../DESIGN.md): 현재 구현과 구별한 다음 적용값.
- [Astro, FSD와 Tailwind CSS 지침](../../dev/frontend/astro-fsd-tailwind.md): 정적 렌더링, 참조 방향, 타입과 CSS 작성 규칙.

초기 설정을 다시 만들지 않는다. Astro 7.3.3, Tailwind CSS 및 `@tailwindcss/vite` 4.3.3, TypeScript 6.0.3과 기존 잠금 파일을 유지한다. `/`와 `/en/`는 같은 `HomePage`를 사용한다. 두 JSON의 필수 문구와 자료형이 맞지 않으면 빌드가 중단되는 동작도 유지한다.

Pretendard 1.3.9 자체 제공과 라이선스, 기존 색상 역할, 외부 링크 목적지, 환경 변수로 주입하는 Résumé 주소와 링크 이름을 유지한다. React, Client Island, ClientRouter, 상태 저장소, CMS, 새 의존성과 테스트 파일을 추가하지 않는다.

## 변경 영향

이전 플랜의 콘텐츠, 디자인 토큰, Header와 Experience, 나머지 영역, 반응형 구성 및 영어 문구 작업이 영향을 받는다. 해당 부분의 이전 완료 표시는 새 요구사항 충족을 뜻하지 않는다. 프로젝트 초기 설정과 정적 언어별 주소는 재작업 대상이 아니다.

현재 구현에는 `PageHeader`, 12열 배치, 두 열 독립 작업, 수치 전용 `MetricStatement`와 `SystemFigure`가 있다. 이를 남겨 둔 채 새 화면을 추가하지 않는다. 아래 단위에서 호출부, JSON, 타입, 검사 함수와 미사용 스타일을 함께 교체한다.

## 실행 순서와 상태 기록

아래 1~4를 순서대로 진행한다. 각 단위를 마칠 때 상태, 실제 변경 파일과 다음 시작 위치를 이 플랜에 갱신한다. 마지막 단위에서 한 번의 통합 검토로 빌드와 화면을 확인한다. 중간 단위에서는 변경한 파일과 내용을 기록하되 별도의 리뷰를 반복하지 않는다.

현재 상태: 구현 단위 1~2 완료, 단위 3~4 대기. 다음 시작 위치는 `OpenSourceSection.astro`다.

### 1. 기여 본문과 언어 선택 구조 교체

상태: 완료. `types.ts`, `get-terms.ts`, 두 언어 JSON과 이를 읽던 UI 호출부를 본문형 기여 및 Identity 아래 언어 링크로 교체했다. `PageHeader`, `MetricStatement`와 `SystemFigure`는 호출부 및 export와 함께 제거했다. `pnpm check`와 `pnpm build`가 통과했고 두 정적 주소가 생성됐다.

적용 요구사항: 「Experience」, 「글과 언어 관리」, 「개발자 소개와 편집 기준」. [한국어 문구](references/homepage-copy.md)를 현재 JSON에 덧붙이지 않고 본문 중심 구조로 옮긴다.

- 수정: `src/shared/terms/types.ts`의 `Contribution`을 `title`, `paragraphs: readonly string[]`, `metadata: Metadata`를 가진 타입으로 바꾼다. 표현 종류가 하나이므로 `kind`는 두지 않는다.
- 제거: `MetricContribution`, `StructureContribution`, `EvidenceContribution` 및 전후 숫자, 설명 그림과 강조 인용문 전용 필드. 수치와 조건은 같은 본문 문단에 둔다.
- 수정: `get-terms.ts`의 세 variant 검사 분기를 본문 배열 검사로 교체한다. 배열은 비어 있지 않아야 하고 각 문단은 공백만 있는 문자열이 아니어야 한다. 기존 필수 문구, 링크와 언어 검사 및 빌드 실패 동작을 유지한다.
- 수정: `ko.json`과 `en.json`의 모든 회사 기여를 같은 구조로 옮긴다. 인공지능팩토리는 네 항목을 유지한다. 이전 회사에서 한 항목으로 합쳐진 로딩과 WebSocket 설명을 분리해 상태 일관성, 로딩과 실시간 연결 세 항목으로 구성하되 새 사실은 보태지 않는다.
- 수정: `navigation`을 `language`의 `label`, `links`로 대체한다. `LanguageLink`는 `locale`, `label`, `href`를 직접 정의하고 `NavigationItem`은 삭제한다. JSON 검사와 `index.ts`의 외부 제공 타입도 같이 바꾼다.
- 제거: 영역별 `index` 문구와 타입 필드. 영역 `id`와 `footer.topLabel`, 본문 바로가기는 유지한다.
- 수정: `ContributionBlock.astro`는 제목, 문단 반복과 `MetadataLine`만 렌더링한다. `set:html`이나 숫자를 찾는 정규식으로 강조하지 않는다.
- 제거: `MetricStatement.astro`, `SystemFigure.astro` 및 두 컴포넌트의 import와 Shared UI export. 기존 그림의 API 호출, 변환과 화면 갱신 관계는 본문에 남긴다.
- 같은 단위의 호출부 수정: `HomePage.astro`에서 `PageHeader` 호출과 import를 제거하고 파일도 삭제한다. `IdentityBlock.astro`가 언어 선택 값과 현재 locale을 받아 소개 아래 텍스트 링크로 렌더링한다. 전역 상태나 값을 전달만 하는 중간 컴포넌트를 만들지 않는다.
- 같은 단위의 호출부 수정: `SectionHeader.astro`의 번호 prop과 마크업을 없애고 각 Section의 호출도 맞춘다.

추가할 파일은 없다. 영어 전용 컴포넌트, 이전 variant를 읽는 호환 어댑터와 미사용 JSON 키를 남기지 않는다.

종료 결과: 두 언어가 하나의 본문 구조를 사용하며 네비게이션, 큰 숫자와 도식 전용 JSON 필드와 호출이 함께 제거된다. 최종 확인에서 모든 기여, 수치 조건, 직접 이동용 id와 언어 선택을 생성 HTML과 실제 화면으로 확인한다.

### 2. 페이지 전체를 한 칼럼으로 재배치

상태: 완료. `global.css`의 본문 폭과 글자 토큰을 시작값으로 맞췄고 `HomePage`가 본문 폭과 좌우 여백을 한 번만 관리한다. `IdentityBlock`, `SectionHeader`, `CompanyExperience`와 `ExperienceSection`의 12열 배치, 별도 본문 폭과 칼럼 위치 지정을 제거했다. `pnpm check`와 `pnpm build`가 통과했다.

적용 요구사항: 「한 페이지의 정보 순서」, 「편집형 시각 규칙」, 「글꼴과 글자 체계」, 「여백과 반응형 배치」.

- 수정: `global.css`의 `--container-page`를 42rem으로 맞춘다. `HomePage.astro`가 전체 본문 폭과 유동 좌우 여백을 관리한다. 영역별로 최대 폭을 다시 지정하지 않는다.
- 수정: `--text-display`, `--text-section`, `--text-item`, `--text-lead`를 `DESIGN.md`의 시작값으로 바꾸고 이름과 소개의 과도한 자간 및 상하 여백을 줄인다.
- 제거: 미사용 `--text-metric` 및 줄 높이, `--container-copy`, `--container-lead`. 이 토큰을 쓰는 `max-w-copy`, `max-w-lead`도 호출부에서 제거한다.
- 수정: `IdentityBlock`, `SectionHeader`, `CompanyExperience`, `ExperienceSection`에서 제목, 메타정보, 설명과 기여 본문을 순서대로 세로 배치한다.
- 제거: `md:grid-cols-12`, `col-span`, `col-start`, 보조 정보용 좌우 열과 Contribution의 `@container` 및 가로 배치 전환. 제목과 본문은 같은 왼쪽 기준선을 사용한다.
- 유지: `main`의 포커스 대상, 하나의 `h1`, 회사 및 기여 제목의 논리적 단계, 모든 영역 id와 기본 링크 동작.

새 Layout이나 반응형 래퍼를 만들지 않는다. 제거한 열 대신 빈 여백용 요소, 고정 높이 Hero와 다른 좌우 분할을 넣지 않는다.

종료 결과: 소개와 모든 회사 기여가 넓은 화면에서도 한 줄기 본문으로 이어진다. 최종 확인에서는 320px, 390px, 768px와 1440px의 읽는 순서, 줄 길이와 수치의 본문 크기를 판단한다.

### 3. 나머지 영역도 세로 본문으로 통합

상태: 대기. 단위 2 완료 후 시작한다.

적용 요구사항: 「Open Source」, 「Independent Work」, 「Background와 Contact」, 「조작과 움직임」.

- 수정: `OpenSourceSection.astro`의 프로젝트명, 변경 설명, 회귀 확인, 릴리스 및 PR 링크를 세로로 배열한다. `@min-[36rem]` 두 열 배치와 미사용 `@container`를 제거한다.
- 수정: `IndependentWorkSection.astro`의 두 작업을 세로 목록으로 배치한다. `md:grid-cols-2`, 홀수 항목의 `translate-y`, 인덱스 기반 스타일 분기와 카드 배경을 제거한다. 회사와 구분하는 제목 및 작업 설명은 유지한다.
- 수정: `BackgroundSection.astro`의 학력, 자격 및 어학 정보를 한 묶음씩 위에서 아래로 읽게 한다. 세 열 정의와 오른쪽 날짜 정렬을 제거한다.
- 수정: `ContactSection.astro`의 링크를 한 목록으로 정리한다. 두 열, 세 열 전환과 `md:ms-[25%]`를 제거한다. `ExternalTextLink`의 링크 목적과 포커스 표시를 유지한다.
- 수정: `PageFooter.astro`는 기존의 끝 정보와 맨 위 이동만 유지한다. 섹션 메뉴, 언어 선택 중복과 별도 CTA 막대를 추가하지 않는다.
- 제거: 위 변경 후 호출되지 않는 import, export와 스타일. 의미가 다른 영역을 범용 Card나 Section의 boolean prop 조합으로 합치지 않는다.

추가할 파일은 없다. 동일한 `ExternalTextLink`, `MetadataLine`과 단순해진 `SectionHeader`를 재사용한다.

종료 결과: 후반부에서도 다중 칼럼이 다시 나타나지 않으며 원래 정보, PR 및 릴리스, 연락과 이력서 링크를 모두 사용할 수 있다. 최종 확인에서 링크 줄바꿈과 터치 및 키보드 사용을 확인한다.

### 4. 최종 통합 확인과 문서 일치

상태: 대기. 단위 1~3 완료 후 한 번의 통합 검토로 진행한다.

적용 요구사항: 「접근성」과 「완료 기준」 전체. 검사 때문에 테스트 프레임워크, fixture나 임시 화면을 저장소에 추가하지 않는다.

- 기존 `pnpm check`와 `pnpm build`를 실행한다. 문단 누락과 잘못된 언어 구조가 빌드 시 검사에서 실패하도록 구성되었는지 확인한다.
- 두 언어의 초기 HTML에 소개와 모든 기여가 포함되고 정적 콘텐츠용 JavaScript가 추가되지 않았는지 확인한다.
- 두 언어를 320px, 390px, 768px와 1440px에서 확인한다. 네비게이션 바, 보조 칼럼, 별도 숫자 강조, 가로 오버플로우와 접힌 경력 설명이 없어야 한다.
- 200% 글자 확대를 실제로 적용해 잘림과 정보 손실을 확인한다. viewport를 절반으로 줄인 결과만으로 글자 확대 검사를 완료했다고 기록하지 않는다.
- 키보드로 본문 바로가기, 언어 선택, PR 및 릴리스, 연락과 Résumé 링크를 사용한다. 직접 해시 진입, 새로고침, 뒤로 가기와 맨 위 이동을 확인한다. 이력서 주소는 화면 링크 이름에 표시되지 않아야 한다.
- 움직임 감소 설정에서 비필수 움직임이 없는지 확인하고 링크와 포커스의 명암비 및 포인터 대상 크기를 요구사항과 대조한다.
- 한국어와 영어의 수치, 조건, 직접 기여 범위가 일치하는지 확인한다. 3초 폴링 가정과 실제 전후 측정을 혼동하지 않으며 문서 생성 시간이 줄었다고 쓰지 않는다.
- 미사용 컴포넌트, JSON 키, 타입과 CSS 토큰, FSD 역참조, 임시 파일 및 민감정보가 없는지 확인한다. 의미와 접근성 동작이 같은 중복 마크업만 기존 Shared UI로 합친다.
- 발견한 결함은 그 동작을 구현한 파일에서 수정한다. 별도 추가 리뷰를 시작하지 않고 해당 결함 확인에 필요한 검사만 다시 실행한다.
- `DESIGN.md`의 예정값을 실제 적용값으로 갱신하고 이 플랜에 확인한 조건, 결과와 확인하지 못한 항목을 남긴다.

배포 설정과 외부 배포는 이 변경의 작업 단위에 포함하지 않는다. 브라우저 기능 제한으로 확인하지 못한 항목은 성공으로 기록하지 않는다.

## 중단 조건과 완료 판정

확인되지 않은 회사별 역할, 수정 방법이나 성과를 보태야 하는 경우 해당 문구 확장을 멈춘다. 기존 근거로 설명 가능한 기여는 계속 진행한다. 새 라이브러리, 내부 상세 페이지나 블로그 목록이 필요하다는 판단이 생기면 구현 범위를 바꾸기 전에 결정이 필요하다.

완료는 두 언어의 단일 칼럼 화면, 구체적인 기여 본문과 단위 4의 확인 결과로 판단한다. 현재는 변경 문서만 완료되었으며 새로운 UI는 미구현 상태다.
