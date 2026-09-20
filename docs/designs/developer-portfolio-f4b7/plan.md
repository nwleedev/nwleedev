# 단일 칼럼 개발자 소개 웹사이트 변경 플랜

기존 Astro 페이지를 네비게이션 바 없는 단일 칼럼으로 유지하면서 모바일 Drawer를 항상 보이는 프로필 아이콘과 반대 언어 링크로 교체한다. Background 제목 바로 아래의 구분선과 연결된 위쪽 padding을 제거하고 데스크톱 링크 및 언어 선택은 유지한다.

## 기준과 유지할 구현

이 플랜을 마지막으로 변경한 커밋의 [요구사항](requirements.md), 아래 결정과 개발 지침을 구현 기준으로 삼는다.

- [편집형 시각 방향](decisions/editorial-direction.md): 단일 칼럼, 절제된 글자 위계와 네비게이션 바 제외.
- [기여 선정과 서술](decisions/featured-cases.md), [홈페이지 한국어 문구](references/homepage-copy.md): 담당한 문제, 변경 방법과 확인 결과.
- [개인 사이트 재조사](references/personal-site-recheck.md): 세 사이트의 실제 배치와 채택하지 않을 요소.
- [모바일 프로필 아이콘 조사](references/mobile-profile-icons.md): 아이콘 패키지, 한 행 배치, 조작 영역과 접근 가능한 이름.
- [모바일 Drawer 조사](references/mobile-drawer.md): 교체 전 판단을 보존한 기록.
- [문구 저장](decisions/terms-storage.md), [독립 작업](decisions/project-availability.md), [개발자 소개 기준](decisions/developer-positioning.md).
- [디자인 체계](../../../DESIGN.md): 현재 구현과 구별한 다음 적용값.
- [Astro, FSD와 Tailwind CSS 지침](../../dev/frontend/astro-fsd-tailwind.md): 정적 렌더링, 참조 방향, 타입과 CSS 작성 규칙.

초기 설정을 다시 만들지 않는다. Astro 7.3.3, Tailwind CSS 및 `@tailwindcss/vite` 4.3.3, TypeScript 6.0.3과 기존 잠금 파일을 유지한다. `/`와 `/en/`는 같은 `HomePage`를 사용한다. 두 JSON의 필수 문구와 자료형이 맞지 않으면 빌드가 중단되는 동작도 유지한다.

Pretendard 1.3.9 자체 제공과 라이선스, 기존 색상 역할, 외부 링크 목적지, 환경 변수로 주입하는 Résumé 주소와 링크 이름을 유지한다. React, Client Island, ClientRouter, 상태 저장소, CMS와 테스트 파일을 추가하지 않는다. 모바일 SVG에만 `phosphor-astro` 2.1.0을 사용하며 Drawer용 일반 script와 표준 HTML `dialog`는 제거한다.

## 변경 영향

이전 플랜의 콘텐츠, 디자인 토큰, Header와 Experience, 나머지 영역, 반응형 구성 및 영어 문구 작업이 영향을 받는다. 해당 부분의 이전 완료 표시는 새 요구사항 충족을 뜻하지 않는다. 프로젝트 초기 설정과 정적 언어별 주소는 재작업 대상이 아니다.

현재 구현에는 `PageHeader`, 12열 배치, 두 열 독립 작업, 수치 전용 `MetricStatement`와 `SystemFigure`가 있다. 이를 남겨 둔 채 새 화면을 추가하지 않는다. 아래 단위에서 호출부, JSON, 타입, 검사 함수와 미사용 스타일을 함께 교체한다.

## 실행 순서와 상태 기록

기존 단위 1~12 다음에 추가 단위 13~21을 순서대로 진행한다. 각 단위를 마칠 때 상태, 실제 변경 파일과 다음 시작 위치를 이 플랜에 갱신한다. 마지막 단위에서 한 번의 통합 검토로 빌드와 화면을 확인한다. 중간 단위에서는 변경한 파일과 내용을 기록하되 별도의 리뷰를 반복하지 않는다.

현재 상태: 구현 단위 1~21 완료. 방문자용 문구에서 성과를 부정하는 방어적 설명과 중복을 제거하고, 사용자와 운영자가 얻는 가치를 먼저 제시했다. 두 언어 JSON, 정적 페이지와 실제 화면에서 문구 변경을 확인했다.

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

상태: 완료. `OpenSourceSection`, `IndependentWorkSection`, `BackgroundSection`과 `ContactSection`에서 두 열 및 세 열 전환, container query, 카드 배경과 항목별 위치 이동을 제거했다. 모든 항목은 제목, 설명, 확인 정보와 링크 순서로 이어진다. `PageFooter`는 끝 정보와 맨 위 이동만 남겼다. `pnpm check`와 `pnpm build`가 통과했다.

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

상태: 완료. `pnpm check`와 `pnpm build`가 오류 없이 통과했고 `/`와 `/en/` 정적 HTML에 모든 기여가 포함되며 client script가 생성되지 않는 것을 확인했다. 두 언어는 회사별 4개 및 3개 기여와 같은 문단 수, 수치 및 비교 조건을 사용한다.

로컬 브라우저의 반응형 화면과 DOM 측정으로 320px, 390px, 768px와 1440px의 읽는 순서 및 문서 너비를 확인했다. `body`의 기존 최소 폭을 제거한 뒤 각 너비에서 문서 전체의 가로 오버플로우가 없었다. 사용한 브라우저의 확대 단축키는 배율을 변경하지 않아 실제 200% 확대는 완료로 기록하지 않는다. 대신 266 CSS px에서도 정보 손실과 가로 오버플로우가 없는 상태까지 확인했다.

키보드의 첫 Tab은 본문 바로가기에 도달하고 실행 후 `main`에 포커스가 이동하며, 다음 Tab은 GitHub 링크로 이동한다. Contact 직접 이동과 새로고침, 뒤로 가기 및 Footer의 맨 위 이동을 확인했다. 최종 검토에서 고정된 본문 바로가기 링크를 맨 위 이동 대상으로 사용해 스크롤이 움직이지 않는 결함을 발견했고 `body`를 문서 시작 대상으로 바꿨다. 사용하지 않는 여백 토큰도 제거했으며 추가로 남은 검토 항목은 없다. 브라우저 콘솔 오류와 경고가 없었고 Git이 추적하는 파일에서 이력서 주소 및 개인 절대 경로가 발견되지 않았다.

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

### 5. 영역 도입부와 첫 구분선 제거

상태: 완료. 두 언어 JSON과 타입 및 검사에서 Experience와 Open Source 도입 문구를 제거했다. 두 영역은 제목에서 32px 뒤에 첫 항목이 시작하며 첫 항목의 구분선과 위쪽 padding은 없고, 뒤 항목의 구분선은 유지한다.

적용 요구사항: 「Experience」와 「Open Source」.

- 제거: 두 언어 JSON의 `experience.introduction`과 `openSource.introduction`, `HomeTerms`의 해당 필드 및 `get-terms.ts`의 필수 값 검사.
- 수정: `ExperienceSection.astro`와 `OpenSourceSection.astro`에서 도입 문구 전달을 제거한다.
- 수정: `CompanyExperience.astro`와 `OpenSourceSection.astro`의 첫 항목에 적용되던 위쪽 구분선을 없앤다. 뒤 항목을 구분하는 선은 유지한다.
- 수정: 제목과 첫 항목 사이는 32px을 사용하고, 삭제한 문구와 선의 상하 여백이 남지 않게 첫 항목의 위쪽 padding을 제거한다.

새 파일과 호환용 JSON 필드는 추가하지 않는다. `SectionHeader`의 선택적 도입 문구는 Independent Work와 Contact가 계속 사용하므로 제거하지 않는다.

확인: 두 언어의 Experience와 Open Source 제목 다음에 도입 문구 및 첫 구분선이 없고, 첫 회사 및 첫 기여가 32px 뒤에 시작하는지 생성 HTML과 실제 화면에서 확인한다.

### 6. 데스크톱 링크 및 언어 선택과 모바일 Drawer 구성

상태: 완료. `ProfileNavigation.astro`가 같은 자료로 데스크톱 링크와 오른쪽 상단 언어 선택, 장식 없는 모바일 메뉴 아이콘 버튼과 Drawer를 렌더링한다. 표준 dialog와 Astro 일반 script가 열림 상태, 배경 스크롤과 화면 폭 전환을 처리하며, `noscript` fallback을 Identity 본문 아래에 제공한다.

적용 요구사항: 「한 페이지의 정보 순서」, 「Identity」, 「글과 언어 관리」, 「여백과 반응형 배치」, 「조작과 움직임」과 「접근성」.

- 추가: `ProfileNavigation.astro`를 Home Page 전용 컴포넌트로 만든다. 데스크톱 외부 링크, 데스크톱 언어 선택, 모바일 메뉴 버튼과 Drawer가 같은 링크 및 언어 자료를 사용하게 한다.
- 수정: `IdentityBlock.astro`는 소개 문구 아래에서 `ProfileNavigation`을 렌더링한다. 데스크톱 외부 링크는 기존 가로 Flex 및 줄바꿈 배치를 유지하고, 언어 선택은 Identity 오른쪽 상단의 가로 Flex로 옮긴다.
- 추가: 모바일 메뉴 버튼은 오른쪽 상단에 24px 선형 아이콘으로 표시하고 배경, 테두리와 패딩을 제거한다. 44px 조작 영역, `aria-label`, `aria-controls`, `aria-expanded`와 키보드 포커스 표시는 유지한다. Drawer는 `dialog.showModal()`로 열며 닫기 버튼, 세로 외부 링크, 구분선과 가로 언어 선택 순서로 구성한다.
- 추가: `menu.title`, `menu.openLabel`과 `menu.closeLabel`을 두 언어 JSON과 `HomeTerms`에 추가하고 `get-terms.ts`에서 검사한다.
- 추가: Astro가 처리하는 일반 script에서 하나의 Custom Element 인스턴스 안의 버튼과 dialog만 찾는다. `is:inline`, 전역 `querySelector`, Client Island와 새 의존성을 사용하지 않는다.
- 추가: dialog가 열리면 문서 배경 스크롤을 막고 닫히면 복구한다. 표준 Escape 닫기와 호출 버튼으로의 포커스 복귀를 유지하며, 40rem 이상으로 화면이 바뀌면 열린 dialog를 닫는다.
- 추가: JavaScript를 사용할 수 없는 모바일 환경에서는 같은 링크와 언어 선택을 Identity 본문 아래에 표시한다.

확인: 데스크톱에서는 링크 목록과 오른쪽 상단 KO 및 EN을 확인한다. 320px과 390px에서는 본문의 중복 링크가 보이지 않고 장식 없는 메뉴 아이콘 버튼으로 Drawer를 열 수 있어야 한다. 외부 링크 다음에 언어 선택이 나타나며, 닫기 버튼, Escape, Tab 순환, 포커스 복귀와 배경 스크롤 방지를 키보드 및 브라우저에서 확인한다.

### 7. 추가 요구사항 통합 확인과 문서 일치

상태: 완료. 정적 검사와 빌드가 통과했고 한국어와 영어 페이지가 생성됐다. 320px과 390px에서는 이름과 겹치지 않는 메뉴 아이콘 및 Drawer를, 768px과 1440px에서는 소개 아래 외부 링크와 오른쪽 상단 언어 선택을 확인했다. 가로 오버플로우, 브라우저 오류와 경고는 없었다.

적용 요구사항: 추가된 완료 기준과 기존 접근성 및 정적 제공 조건.

- 완료: `pnpm check`와 `pnpm build`를 실행하고 한국어 `/`와 영어 `/en/` 정적 페이지 생성을 확인했다.
- 완료: 생성 HTML에 두 언어의 Drawer 이름과 링크가 있으며 제거한 두 도입 문구와 JSON 키가 없음을 확인했다.
- 완료: Astro 일반 script만 생성되며 `client:*`, UI 프레임워크와 새 의존성을 추가하지 않았다.
- 완료: 320px, 390px, 768px와 1440px에서 메뉴 표시 조건, 링크 방향, 언어 선택 위치, 가로 오버플로우와 이름 겹침을 확인했다.
- 완료: 키보드로 메뉴 열기, Escape, Tab과 Shift+Tab 순환 및 종료 뒤 메뉴 아이콘으로 돌아오는 포커스를 확인했다. 닫기 버튼, 외부 링크와 언어 선택이 접근성 트리에 올바른 순서로 나타났다.
- 완료: Drawer에 transition과 animation을 추가하지 않았고 전역 `prefers-reduced-motion: reduce` 규칙에서도 내용과 조작 요소를 숨기지 않는다.
- 완료: `DESIGN.md`의 구성 요소, 반응형 배치와 접근성 설명을 실제 구현에 맞췄다.
- 완료: 임시 시각 조사 파일, 민감정보, 개인 절대 위치와 불필요한 JSON 키 및 스타일이 Git 변경에 없음을 확인했다.

배포 설정과 외부 배포는 포함하지 않는다. 실제 브라우저에서 확인하지 못한 동작은 완료로 기록하지 않는다.

### 8. 편집 설명과 겹치는 영역 구분선 제거

상태: 완료. 두 언어의 Independent Work 도입 문구와 연결된 타입 및 검사를 제거했다. 첫 작업은 제목에서 32px 뒤에 구분선 없이 시작하며, Open Source, Independent Work, Background와 Contact의 목록 끝 선을 제거해 다음 영역 또는 Footer의 위쪽 선만 남겼다.

적용 요구사항: 「Independent Work」와 「편집형 시각 규칙」.

- 제거: 두 언어 JSON의 `independentWork.introduction`, `HomeTerms`의 해당 필드와 `get-terms.ts`의 필수 값 검사.
- 수정: `IndependentWorkSection.astro`에서 도입 문구 전달을 제거하고 첫 작업의 위쪽 구분선 및 padding을 없앤다. 제목에서 32px 뒤에 첫 작업을 시작한다.
- 제거: `OpenSourceSection.astro`, `IndependentWorkSection.astro`, `BackgroundSection.astro`와 `ContactSection.astro`의 목록 끝 구분선. 다음 영역 또는 Footer의 위쪽 구분선과 사이에 내용이 없으므로 다음 구분선만 남긴다.
- 유지: 두 번째 이후 항목의 위쪽 구분선, Section 제목 위의 강한 구분선과 Contact의 실제 연락 안내.

새 소개 문구, 빈 여백용 요소와 이전 JSON 구조를 읽는 호환 코드는 추가하지 않는다.

### 9. Identity와 Drawer 머리글 Flex 정렬

상태: 완료. 이름과 반응형 조작 요소를 `items-center`, `justify-between` 행에 배치하고 `absolute` 위치 지정을 제거했다. 데스크톱 링크와 모바일 `noscript` 대체 링크는 본문 흐름으로 옮겼다. Drawer 머리글의 아래쪽 padding을 없애고 닫기 글자를 접근 가능한 이름을 가진 24px X 아이콘으로 교체했다.

적용 요구사항: 「Identity」, 「여백과 반응형 배치」, 「조작과 움직임」과 「접근성」.

- 수정: `IdentityBlock.astro`에서 이름과 `ProfileNavigation`을 하나의 `flex`, `items-center`, `justify-between` 행에 둔다. 소개 아래의 데스크톱 외부 링크와 모바일 `noscript` 대체 링크는 Identity 본문 흐름에 유지한다.
- 수정: `ProfileNavigation.astro`에서 메뉴 버튼과 데스크톱 언어 선택의 `absolute`, `top` 및 `end` 위치 지정을 제거한다. 같은 컴포넌트 자리에서 화면 폭에 따라 둘 중 하나만 표시한다.
- 이동: 데스크톱 외부 링크와 `noscript` 대체 링크는 `IdentityBlock.astro`로 옮겨 이름 행의 크기와 정렬에 영향을 주지 않게 한다. 링크 자료는 새 중간 상태 없이 같은 `identity.links`를 사용한다.
- 수정: Drawer 머리글의 아래쪽 padding을 제거하고 제목과 닫기 버튼을 `items-center`, `justify-between` 행에 맞춘다.
- 교체: 닫기 글자 버튼을 24px X 아이콘 버튼으로 바꾸고 `aria-label={menu.closeLabel}`과 44px 조작 영역을 유지한다. 배경, 테두리와 padding은 두지 않는다.
- 금지: 위치를 맞추기 위한 `position: absolute`, 아이콘 전용 margin, padding 또는 transform 보정.

새 아이콘 패키지, React 컴포넌트, 상태 저장소와 전역 DOM 탐색을 추가하지 않는다.

### 10. 추가 요구사항 통합 확인과 문서 일치

상태: 완료. `pnpm check`는 오류, 경고 및 안내 없이 통과했고 `pnpm build`는 `/`와 `/en/`을 생성했다. 두 언어에서 Independent Work의 편집 설명이 제거됐고 첫 작업의 위쪽 구분선 및 padding과 각 영역 목록 끝 구분선이 0px인 것을 확인했다.

실제 브라우저에서 320px, 390px, 768px와 1440px 화면을 확인했다. 모든 너비에서 이름과 오른쪽 조작 요소의 세로 중심 차이는 0px이었고 가로 오버플로우가 없었다. 320px과 390px에서는 메뉴 버튼만, 768px과 1440px에서는 KO와 EN만 표시됐다. Drawer의 Links 제목과 닫기 아이콘의 세로 중심 차이도 0px이었다. 닫기 버튼은 44×44px 조작 영역, 0px padding과 현재 언어의 `닫기` 또는 `Close` 이름을 제공했다.

메뉴 버튼으로 Drawer를 연 뒤 Escape와 닫기 아이콘으로 종료했으며 두 경우 모두 `aria-expanded`가 `false`로 돌아가고 포커스가 메뉴 버튼으로 복귀했다. 열려 있는 동안 문서 스크롤은 막혔다. 외부 링크 다음에 KO와 EN이 나타났고 한국어와 영어 화면의 브라우저 오류 및 경고는 없었다. `DESIGN.md`는 확인한 구현과 일치하도록 갱신했다.

- `pnpm check`와 `pnpm build`를 실행하고 `/`와 `/en/` 생성 결과를 확인한다.
- 생성 HTML과 소스에서 Independent Work의 편집 설명, 제거한 JSON 필드, 영역 목록 끝 구분선과 `ProfileNavigation`의 absolute 위치 지정이 남지 않았는지 확인한다.
- 320px, 390px, 768px와 1440px에서 이름과 오른쪽 조작 요소, Drawer 제목과 닫기 아이콘이 각 Flex 행의 세로축 중앙에 맞는지 확인한다.
- 모바일에서 메뉴 열기, 닫기 아이콘, Escape, 포커스 복귀, 외부 링크와 언어 선택 순서를 확인한다. 데스크톱에서는 외부 링크와 KO 및 EN이 그대로 표시되어야 한다.
- 44px 조작 영역, 화면 낭독기용 이름, 포커스 표시와 가로 오버플로우를 확인한다.
- `DESIGN.md`와 이 플랜을 실제 구현 및 확인 결과에 맞춘다. 임시 화면, 민감정보, 개인 절대 위치와 미사용 코드가 Git 변경에 없는지 마지막 검토 한 번에서 확인한다.

### 11. Contact 안내 문구와 연결된 여백 제거

상태: 완료. 두 언어의 Contact 안내 문구와 연결된 JSON 필드, 타입 및 검사를 제거했다. `SectionHeader`는 제목과 위쪽 구분선만 렌더링하며, Contact의 첫 링크는 제목에서 32px 뒤에 위쪽 구분선과 padding 없이 시작한다.

적용 요구사항: 「Background와 Contact」와 「편집형 시각 규칙」.

- 제거: 두 언어 JSON과 `HomeTerms`의 `contact.introduction`, `get-terms.ts`의 필수 값 검사.
- 수정: `ContactSection.astro`에서 도입 문구 전달을 제거한다. 제목에서 32px 뒤에 첫 링크를 시작하고 첫 링크의 위쪽 구분선 및 padding을 없앤다.
- 제거: 다른 영역에서도 도입 문구를 사용하지 않으므로 `SectionHeader.astro`의 `introduction` prop과 조건부 문단을 삭제한다.
- 유지: Email, GitHub, Blog, LinkedIn과 Résumé의 순서, 각 링크의 설명, 두 번째 이후 링크 사이의 구분선과 Contact 제목 위의 강한 구분선.

삭제한 문구를 대신하는 텍스트, 빈 여백용 요소와 이전 JSON 구조를 읽는 호환 코드는 추가하지 않는다.

### 12. Contact 변경 확인과 문서 일치

상태: 완료. `pnpm check`와 `pnpm build`가 통과했고 `/`와 `/en/`가 생성됐다. 생성 파일과 소스에는 제거한 두 언어 문구, `contact.introduction`, `SectionHeader`의 미사용 prop과 검사 함수가 남지 않았다.

320px과 1440px 화면에서 Contact 제목과 첫 링크 사이 간격은 32px, 첫 링크의 위쪽 구분선과 padding은 0px이었다. 두 번째 링크부터 1px 구분선이 표시되고 Footer의 1px 위쪽 구분선도 유지됐다. Email, GitHub, Blog, LinkedIn과 Résumé 순서 및 링크별 설명을 한글과 영문 화면에서 확인했다. 가로 오버플로우와 브라우저 오류 및 경고는 없었다.

- `pnpm check`와 `pnpm build`를 실행하고 `/`와 `/en/` 정적 페이지가 생성되는지 확인한다.
- 생성 HTML과 소스에서 두 언어의 Contact 안내 문구, 제거한 JSON 필드와 `SectionHeader`의 미사용 prop이 남지 않았는지 확인한다.
- 320px과 1440px에서 Contact 제목 다음 첫 링크가 32px 뒤에 구분선과 위쪽 padding 없이 시작하는지 확인한다.
- 두 번째 이후 링크의 구분선, 링크 순서, 링크별 설명과 Footer 구분선이 유지되는지 확인한다.
- `DESIGN.md`와 이 플랜을 실제 구현 및 확인 내용에 맞춘다. 민감정보, 개인 절대 위치와 미사용 코드가 Git 변경에 없는지 마지막 검토 한 번에서 확인한다.

### 13. 모바일 프로필 UI 변경 기준 확정

상태: 완료. Drawer를 제거하고 모바일 프로필 링크를 한 행의 아이콘으로 표시하며 현재 화면과 다른 언어 링크 하나만 이름 오른쪽에 두는 요구사항을 확정했다. `phosphor-astro` 2.1.0의 제공 방식, 의존성, 라이선스와 접근성 기준을 조사했다. Background 첫 항목 위의 구분선 및 연결된 padding 제거도 요구사항에 추가했다.

적용 요구사항: 「한 페이지의 정보 순서」, 「Identity」, 「Background와 Contact」, 「글과 언어 관리」, 「여백과 반응형 배치」, 「조작과 움직임」과 「접근성」.

- 추가: [모바일 프로필 아이콘 조사](references/mobile-profile-icons.md)에 라이브러리 선택, 아이콘 의미, 한 행 Flex 배치, SVG 크기 변화, 44px 조작 영역과 접근 가능한 이름을 기록한다.
- 수정: [요구사항](requirements.md)에서 Drawer, 메뉴 버튼, 열기 및 닫기 동작을 제거하고 모바일 아이콘 링크와 반대 언어 링크를 기준으로 삼는다.
- 수정: [모바일 Drawer 조사](references/mobile-drawer.md)는 현재 구현 기준이 아닌 이전 판단임을 첫 문단에서 밝힌다. 조사 기록은 삭제하거나 현재 요구사항처럼 다시 쓰지 않는다.
- 유지: 데스크톱의 텍스트 링크, KO 및 EN, 링크 순서와 목적지, 같은 문서 흐름과 현재 언어 표시.

### 14. Drawer를 정적 프로필 링크로 교체

상태: 완료. `ProfileNavigation.astro`와 Drawer의 마크업, style 및 script를 제거했다. `LanguageSwitch.astro`와 `MobileProfileLinks.astro`는 모바일에 반대 언어 하나와 네 아이콘 링크를 정적으로 렌더링한다. 두 JSON의 메뉴 문구와 연결된 타입 및 검사를 제거하고 프로필 아이콘 이름 검사를 추가했다. Background 첫 항목은 제목에서 32px 뒤에 구분선과 위쪽 padding 없이 시작한다.

- 제거: `ProfileNavigation.astro`의 메뉴 버튼, `dialog`, 닫기 버튼, scoped style와 Custom Element script. 파일을 역할이 분명한 `LanguageSwitch.astro`로 교체하며 Drawer 호환 마크업은 남기지 않는다.
- 제거: `IdentityBlock.astro`의 모바일 `noscript` 대체 목록. 모바일 기본 마크업이 항상 제공되므로 JavaScript 대체 경로가 필요하지 않다.
- 제거: 두 언어 JSON의 `menu` 객체, `HomeTerms.menu`, `get-terms.ts`의 세 메뉴 문자열 검사와 `HomePage.astro`에서 전달하던 `menu` prop.
- 추가: `phosphor-astro` 2.1.0을 직접 의존성으로 고정하고 잠금 파일을 갱신한다. GitHub, Article, LinkedIn과 File PDF 컴포넌트만 직접 import한다.
- 추가: `MobileProfileLinks.astro`가 `identity.links`를 한 번 순회해 아이콘 링크를 렌더링한다. 링크별 아이콘 이름은 JSON에서 검사하고, SVG는 보조 기술에서 제외하며 기존 링크 이름과 설명을 합친 `aria-label`을 사용한다.
- 수정: `IdentityBlock.astro`는 소개 다음에 모바일 아이콘 목록과 데스크톱 텍스트 목록 중 화면 폭에 맞는 하나만 표시한다. 이름 행에는 데스크톱 KO 및 EN 또는 모바일 반대 언어 하나를 표시하는 `LanguageSwitch`를 둔다.
- 수정: `BackgroundSection.astro`의 목록을 제목에서 32px 뒤에 시작하고 첫 항목의 구분선 및 위쪽 padding을 제거한다. 두 번째 이후 항목 구분선과 아래쪽 간격은 유지한다.
- 금지: 아이콘 위치를 맞추기 위한 absolute, transform, 개별 margin 및 padding 보정, 아이콘 목록 줄바꿈, 가로 스크롤과 client script.

### 15. 정적 결과와 반응형 화면 확인

상태: 완료. `pnpm check`는 오류, 경고 및 안내 없이 통과했고 `pnpm build`는 한국어 `/`와 영어 `/en/` 정적 페이지를 생성했다. 정적 빌드에는 JavaScript 파일이 없으며 소스와 생성 HTML에도 Drawer, dialog와 Custom Element가 남지 않았다. `pnpm audit --prod`에서 알려진 취약점이 발견되지 않았다.

실제 브라우저에서 266px, 320px, 390px, 768px과 1440px 화면을 확인했다. 모바일에서는 네 프로필 링크가 44px 조작 영역의 같은 행에 있으며 아이콘은 약 18~24px로 변했다. 한국어 화면에는 EN만, 영어 화면에는 KO만 나타났다. 데스크톱에서는 기존 텍스트 링크와 KO 및 EN이 보였다. 확인한 모든 폭에서 문서 너비가 화면 너비를 넘지 않았고 브라우저 오류 및 경고가 없었다.

Background는 제목과 첫 항목 사이가 32px이며 첫 항목의 위쪽 구분선과 padding은 0px, 두 번째 항목의 구분선은 1px로 표시됐다.

마지막 통합 검토에서는 요구사항, 타입 및 JSON 검사, 컴포넌트 참조 방향, 정적 HTML과 잠금 파일을 함께 확인했다. 추가로 수정할 결함은 발견하지 않았다. 개인 절대 위치, 비공개 자료, 인증정보와 미사용 Drawer 코드도 Git 변경에 없다.

- `pnpm check`와 `pnpm build`를 실행하고 `/`와 `/en/` 정적 페이지 생성을 확인한다.
- 소스와 생성 HTML에서 `profile-drawer`, `dialog`, 메뉴 문구, Custom Element와 Drawer script가 남지 않았는지 확인한다. 프로필 UI를 위한 브라우저 JavaScript가 생성되지 않아야 한다.
- 266px, 320px과 390px에서 네 아이콘 링크가 한 행에 있고 44×44px 조작 영역을 유지하는지 확인한다. 보이는 SVG가 18~24px 범위에서 줄어들며 페이지의 가로 오버플로우가 없어야 한다.
- 한국어 모바일 화면에는 EN만, 영어 모바일 화면에는 KO만 표시되는지 확인한다. 768px과 1440px에서는 텍스트 프로필 링크와 KO 및 EN이 기존 위치에 있어야 한다.
- 모바일 아이콘 네 개의 접근 가능한 이름, 키보드 포커스 순서와 실제 목적지를 확인한다.
- Background 제목에서 첫 항목까지 32px이며 첫 항목의 위쪽 구분선 및 padding은 0px, 두 번째 항목부터 구분선은 1px인지 확인한다.
- `DESIGN.md`와 이 플랜을 실제 구현 및 확인 결과에 맞춘다. 마지막 통합 검토 한 번에서 민감정보, 개인 절대 위치, 미사용 코드와 의존성 범위를 확인한다.

### 16. 모바일 아이콘 배치 기준 확정

상태: 완료. 모바일 프로필 아이콘은 본문 왼쪽 기준선에서 시작하고, 인접한 44px 조작 영역 사이에 16px 간격을 사용하기로 확정했다. `space-between`처럼 화면의 남는 너비를 아이콘 사이에 분배하지 않는다.

적용 요구사항: 「Identity」, 「여백과 반응형 배치」와 「접근성」.

- 수정: [요구사항](requirements.md)에 모바일 아이콘 목록의 왼쪽 시작점, 일정한 간격과 남는 너비를 분산하지 않는 조건을 추가한다.
- 수정: [모바일 프로필 아이콘 조사](references/mobile-profile-icons.md)에 `justify-content: flex-start`와 16px `gap`을 사용하는 이유 및 266px에서 필요한 전체 너비를 기록한다.
- 유지: 네 링크의 순서와 목적지, 44px 조작 영역, SVG `clamp()`, 한 줄 표시, 반대 언어 링크와 데스크톱 텍스트 링크.

### 17. 모바일 아이콘 고정 간격 구현과 확인

상태: 완료. `MobileProfileLinks.astro`의 `justify-between`을 `justify-start gap-4`로 교체했다. 266px, 320px과 390px 화면에서 첫 링크는 본문과 같은 x=16px에서 시작했고 네 링크의 x 좌표는 16px, 76px, 136px과 196px이었다. 각 조작 영역은 44px, 인접 영역 사이는 16px이었으며 문서 너비가 표시 너비를 넘지 않았다.

768px과 1440px에서는 모바일 아이콘 목록이 숨겨지고 GitHub, Blog, LinkedIn과 Résumé 텍스트 링크가 표시됐다. 한국어 모바일 화면에는 EN, 영어 모바일 화면에는 KO만 보였으며 두 언어의 아이콘 링크는 목적을 구분하는 접근 가능한 이름을 유지했다. 브라우저 오류와 경고는 없었다. `pnpm check`는 오류, 경고 및 안내 없이 통과했고 `pnpm build`는 `/`와 `/en/` 정적 페이지를 생성했다.

- 제거: `MobileProfileLinks.astro` 목록의 `justify-between`을 제거해 남는 너비가 링크 사이에 배분되지 않게 한다.
- 추가: 같은 목록에 `justify-start`와 `gap-4`를 적용해 첫 44px 조작 영역을 본문 왼쪽에 맞추고 인접 조작 영역 사이를 16px로 유지한다.
- 유지: 링크와 SVG 마크업, `aria-label`, `size-11`, `flex-nowrap`, `shrink-0`, `clamp()`와 `sm:hidden`.
- 확인: 266px, 320px과 390px에서 링크의 x 좌표 차이가 모두 60px이고, 첫 링크가 본문 왼쪽 기준선에서 시작하며 한 줄과 가로 오버플로우 없음이 유지되는지 측정한다.
- 확인: 768px과 1440px에서 모바일 아이콘 목록이 숨겨지고 기존 텍스트 링크가 유지되는지 확인한다.
- 확인: `pnpm check`, `pnpm build`, 한국어 및 영어 정적 페이지, 브라우저 오류와 접근 가능한 링크 이름을 확인한다.
- 완료: `DESIGN.md`와 이 단위의 상태 및 화면별 측정값을 실제 구현에 맞췄다.

### 18. 한국어 문구의 대상과 행동 구체화

상태: 완료. 이력서와 포트폴리오에서 각 문장이 가리키는 대상과 행동을 다시 확인했다. 소개의 `데이터 흐름`은 서버 응답 처리와 비동기 작업 상태로 풀어 쓰고, 대시보드의 `자원`은 PC 상태로 구체화했다. `실제 사용 흐름`, `장시간 작업`, `데이터 갱신`처럼 여러 행동을 한 명사로 묶은 표현도 사용자가 거치는 절차, 5~10분 걸리는 문서 생성과 서버 값 및 화면 갱신으로 바꿨다.

적용 요구사항: 「개발자 소개와 편집 기준」, 「Identity」, 「Experience」와 「글과 언어 관리」.

- 수정: [요구사항](requirements.md)의 소개 기준과 Experience 설명을 실제로 확인된 서버 응답 처리, 비동기 작업 상태, 실시간 차트 값과 주요 사용 절차에 맞춘다.
- 수정: [홈페이지 한국어 문구](references/homepage-copy.md)에 최종 후보 문장과 제목을 기록한다.
- 수정: [대표 경험의 편집 근거](references/featured-case-copy.md)에서 방문자용 문구의 근거가 되는 대시보드 설명을 같은 대상과 행동으로 맞춘다.
- 유지: 회사, 역할, 수치와 비교 조건, 기술 이름, 기여 순서 및 영어 화면의 의미.

### 19. 한국어 화면 문구 교체와 확인

상태: 완료. 한국어 소개와 경력 문구를 서버 응답 처리, 비동기 작업 상태, PC 상태, 5~10분 걸리는 문서 생성, 주요 사용 절차와 서버 값처럼 대상이 드러나는 표현으로 교체했다. `use-better-terms` 검사에서 `ko.json`의 표현 및 문단 경고가 없었고, `pnpm check`와 `pnpm build`가 통과했다. 실제 브라우저의 `/`에서 바뀐 문구와 기존 표현 제거를 확인했으며 `/en/`의 정보 순서와 문구는 유지됐다. 320px과 1280px에서 가로 오버플로우가 없었고 두 화면의 브라우저 오류 및 경고도 없었다.

- 수정: `src/shared/terms/ko.json`의 소개, 현재 회사 요약과 네 기여, 이전 회사 요약과 두 기여 문구를 단위 18의 한국어 문구로 교체한다.
- 제거: 사용자에게 보이는 문구에서 맥락 없이 쓰인 `자원`, `데이터 흐름`, `실제 사용 흐름`, `장시간 작업`과 `데이터 갱신` 표현을 제거한다.
- 유지: JSON 필드, 배열 순서, URL, 수치와 기술 이름. UI 컴포넌트와 영어 JSON은 수정하지 않는다.
- 확인: 한국어 JSON schema 검사, `pnpm check`, `pnpm build`와 `/` 정적 생성을 실행한다.
- 확인: 한국어 화면에서 바뀐 소개와 경력 문구가 표시되고, 영어 `/en/`의 내용과 정보 순서가 유지되는지 브라우저에서 확인한다.
- 확인: 최종 한국어 문구 전체를 `use-better-terms` 검사기로 다시 확인하고 남은 경고는 기술 용어인지 문맥별로 판정한다.

### 20. 가치 중심 문구와 중복 제거 기준 확정

상태: 완료. 회사 요약은 제공한 가치, 기여 제목은 달라진 결과, 본문은 그 결과를 뒷받침하는 문제와 근거를 맡도록 편집 기준을 바꿨다. 문서 생성 속도가 줄지 않았다는 방어적 설명은 제거하되, 상태 API 요청 수가 3초 간격 조회의 예상치와 비교한 값이라는 조건은 유지했다. 이력서와 포트폴리오에서 확인되지 않은 성과는 추가하지 않았다.

적용 요구사항: 「사이트의 역할과 자료 활용」, 「개발자 소개와 편집 기준」, 「Identity」, 「Experience」와 「Independent Work」.

- 수정: [요구사항](requirements.md)에서 사용자와 운영자가 얻은 변화를 먼저 설명하고 구현 방식은 근거에 필요한 정도만 남기도록 한다.
- 수정: [홈페이지 한국어 문구](references/homepage-copy.md)에서 회사 요약, 기여 제목과 본문의 역할을 나누고 같은 문제, 확인 행위와 기술 설명이 반복되지 않게 한다.
- 수정: [대표 경험의 편집 근거](references/featured-case-copy.md)에서 상태 API 요청 수의 출처와 비교 조건을 분명히 하고, 방어적 설명 없이도 생성 시간 개선으로 오해되지 않게 한다.
- 유지: 회사, 역할, 기여 순서, 확인된 수치와 조건, 기술 이름, 외부 링크 및 영어 화면의 정보 순서.

### 21. 두 언어 화면 문구 교체와 확인

상태: 완료. 두 언어에서 방어적인 문장과 같은 내용을 반복하던 문장을 제거하고, 소개와 경력 문구를 사용자가 얻는 변화와 운영자가 확인할 수 있는 사실부터 읽히도록 바꿨다. 문서 생성 사례는 진행 상태를 보고 다음 행동을 결정할 수 있다는 가치와 서버 상태 일치 여부를 중심으로 두 문단에 정리했다. 3초 간격 조회의 예상 요청 수와 실제 상태 확인 횟수처럼 근거가 있는 비교 조건은 유지했다.

`use-better-terms` 검사에서 방문자에게 보이는 한국어 JSON에는 표현 및 문단 경고가 없었다. `pnpm check`는 오류, 경고 및 안내 없이 통과했고 `pnpm build`는 `/`와 `/en/` 정적 페이지를 생성했다. 실제 브라우저에서 두 언어의 새 문구와 제거 대상 문장의 부재를 확인했다. 모바일 화면에서는 프로필 아이콘 네 개가 한 줄을 유지하고 한국어에는 EN, 영어에는 KO만 표시됐으며, 모바일과 데스크톱 화면에서 가로 오버플로우가 없었다.

- 수정: `src/shared/terms/ko.json`과 `src/shared/terms/en.json`의 Identity, 회사 요약, 기여 제목과 본문 및 Independent Work 문구를 단위 20의 기준에 맞춘다.
- 제거: 문서 생성 속도를 부정하는 문장, 같은 확인 결과를 반복하는 문장과 구현 순서만 설명하는 문장을 제거한다.
- 유지: JSON 구조, 배열과 링크 순서, 수치의 단위 및 비교 조건, 기술 이름과 두 언어의 의미 대응. UI 컴포넌트와 스타일은 수정하지 않는다.
- 확인: 두 JSON의 schema 검사, `pnpm check`, `pnpm build`와 `/` 및 `/en/` 정적 생성을 실행한다.
- 확인: 한국어와 영어 화면에서 가치 중심 문구, 제거한 문장의 부재, 정보 순서와 320px 및 1280px 가로 오버플로우를 확인한다.
- 확인: 최종 한국어 공유 단위를 `use-better-terms` 검사기로 확인하고 모든 경고를 현재 문맥에서 판정한다.

## 중단 조건과 완료 판정

확인되지 않은 회사별 역할, 수정 방법이나 성과를 보태야 하는 경우 해당 문구 확장을 멈춘다. 기존 근거로 설명 가능한 기여는 계속 진행한다. `phosphor-astro` 이외의 새 라이브러리, 내부 상세 페이지나 블로그 목록이 필요하다는 판단이 생기면 구현 범위를 바꾸기 전에 결정이 필요하다.

두 언어의 단일 칼럼 화면, 구체적인 기여 본문과 단위 5~17의 추가 요구사항은 구현 및 확인을 완료했다. 단위 1~4에서 남긴 실제 200% 브라우저 확대 확인은 사용한 브라우저의 제어 제한으로 수행하지 못했으며, 이 미확인 항목을 완료로 바꾸지 않는다.
