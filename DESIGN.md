# 개발자 소개 사이트 디자인 체계

네비게이션 바 없이 소개부터 연락처까지 하나의 칼럼으로 읽게 한다. 수치와 기술적 기여는 문장으로 설명하고 큰 숫자나 대형 슬로건으로 강조하지 않는다.

이 문서의 단일 칼럼과 글자 크기는 `global.css`와 홈페이지 UI에 반영했다. Header, 다중 칼럼, 큰 수치 표현과 가로 배치용 Container Query는 제거했으며, 적용 상태는 [변경 플랜](docs/designs/developer-portfolio-f4b7/plan.md)에 기록한다.

## 유지하는 글꼴과 색상

Pretendard 1.3.9의 `PretendardVariable.woff2`를 `public/fonts`에서 자체 제공한다. `font-display: swap`과 `Pretendard Variable`, `Pretendard`, `system-ui`, `sans-serif` 순서의 대체 글꼴을 유지한다. SIL Open Font License 1.1 전문도 배포 파일에 유지한다.

흰 바탕 `#FFFFFF`, 본문 `#18181B`, 보충 설명 `#52525B`, 날짜 및 기술 정보 `#71717A`, 일반 구분선 `#E4E4E7`, 강한 구분선 `#8B8B95`를 유지한다. 일반 링크는 `#C62A44`, hover와 active는 `#B4233C`를 사용한다. `#EE5166`은 일반 크기 글자색으로 쓰지 않는다. 전체 색상 역할은 [요구사항의 색상](docs/designs/developer-portfolio-f4b7/requirements.md#색상)을 따른다.

수치, 기여 제목과 긴 소개 문장을 브랜드 색으로 칠하지 않는다. 색만으로 링크와 상태를 구분하지 않는다. 글꼴 굵기는 기존 400, 500, 600과 700만 사용한다.

## 적용한 글자 값

다음 값은 참조 사이트의 CSS를 복제한 값이 아니라 한국어와 영어 본문을 화면에서 확인해 적용한 값이다.

- 이름: `--text-display` 1.5rem, 600, 줄 높이 1.4.
- 영역 제목: `--text-section` 1.125rem, 600, 줄 높이 1.5.
- 회사와 기여 제목: `--text-item` 1rem, 600, 줄 높이 1.5.
- 소개: `--text-lead` 1rem, 400, 줄 높이 1.75.
- 본문과 수치: 1rem, 400, 줄 높이 1.75.
- 날짜, 역할과 기술 정보: .875rem, 400 또는 500, 줄 높이 1.6.

수치 전용 `--text-metric`은 삭제한다. 제목은 크기 차이뿐 아니라 여백, 굵기와 `h1`~`h4` 문서 구조로 구별한다. 숫자 크기를 줄이는 대신 조건 문장을 생략하는 방식은 사용하지 않는다.

## 하나의 본문 폭과 세로 배치

`--container-page`는 42rem을 시작값으로 사용하고 좌우 여백은 `clamp(1rem, 3vw, 2rem)`을 유지한다. 바깥 컨테이너는 중앙에 놓되 텍스트는 왼쪽 정렬한다. Identity, 회사와 기여, 오픈소스, 독립 작업, 배경과 연락처에 같은 폭을 적용한다. `--container-copy`와 `--container-lead`는 없앤다.

페이지 순서는 Identity, Experience, Open Source, Independent Work, Background, Contact와 Footer다. 회사명, 기간과 역할 다음에 담당한 일과 기여 본문을 이어 둔다. 오픈소스는 이름, 설명, 확인 자료 순서이며 독립 작업 두 항목도 세로로 이어진다.

공통 여백 단계 4, 8, 12, 16, 24, 32, 48, 64, 96과 128px은 유지한다. 페이지 시작과 영역 사이에는 64px을 적용하고 넓은 화면의 일부 영역 끝에는 96px을 적용했다. 회사와 기여, 문단 사이는 본문 길이와 줄바꿈에 맞춰 이 단계 안에서 구분한다. 빈 화면을 만드는 고정 높이는 두지 않는다.

12열 그리드, 옆 칼럼의 번호와 연도, 독립 작업의 두 열과 어긋난 배치, Contact의 25% 들여쓰기를 제거한다. 이전 48rem과 70rem의 다중 열 전환 및 42rem, 36rem과 34rem의 가로 배치용 Container Query는 사용하지 않는다. 한 문장 안의 짧은 메타정보와 링크는 자연스럽게 줄바꿈할 수 있다.

## 구성 요소와 탐색

Shared UI는 `BaseLayout`, `SectionHeader`, `MetadataLine`과 `ExternalTextLink`를 유지한다. `SectionHeader`는 영역 제목과 위쪽 구분선만 표시한다. Experience, Open Source, Independent Work와 Contact는 제목 다음에 영역 편집 방식이나 링크 목록을 예고하는 문구를 표시하지 않으며, 첫 항목 위 구분선 없이 32px 뒤에 내용을 시작한다. 항목 사이의 일반 구분선은 유지하지만 다음 영역의 강한 위쪽 구분선과 겹치는 목록 끝 선은 표시하지 않는다. `ContributionBlock`은 제목, 본문 문단과 기술 정보를 렌더링하고 수치 또는 인용문 종류에 따른 배치 분기를 없앤다. `MetricStatement`, `SystemFigure`와 `PageHeader`는 제거한다.

Identity의 첫 행은 이름과 언어 링크를 `align-items: center`, `justify-content: space-between`으로 배치한다. 40rem 이상에서는 KO와 EN을 가로로 표시하고, GitHub, Blog, LinkedIn과 Résumé는 소개 아래의 가로 텍스트 목록에 유지한다. 현재 언어는 글자와 `aria-current="page"`로 함께 표시한다. 40rem 미만에서는 한국어 화면에 EN, 영어 화면에 KO 링크 하나만 이름 오른쪽에 표시한다. 이름과 언어 링크의 위치에는 `position: absolute`나 padding 보정을 사용하지 않는다.

모바일 외부 링크는 소개 아래에서 GitHub, Article, LinkedIn과 File PDF 아이콘을 한 행으로 표시한다. `phosphor-astro` 2.1.0의 빌드 시점 SVG 컴포넌트를 사용하며 브라우저 script는 추가하지 않는다. 각 링크의 조작 영역은 44px이고 SVG는 `clamp(1.125rem, 7vw, 1.5rem)`으로 18~24px 사이에서 변한다. 아이콘은 보조 기술에서 제외하고 링크에는 기존 이름과 목적 설명을 합친 접근 가능한 이름을 제공한다. 메뉴 버튼, Drawer와 열기 및 닫기 상태는 사용하지 않는다.

Background는 제목에서 32px 뒤에 첫 항목을 시작한다. 첫 항목 위에는 구분선과 위쪽 padding을 두지 않고 두 번째 이후 항목의 일반 구분선은 유지한다.

본문 바로가기, 기존 영역 id를 통한 직접 이동과 Footer의 맨 위 이동은 유지한다. 섹션 이동 메뉴를 다른 위치에 다시 만들지 않는다.

## 상태와 접근성

링크의 기본, hover, active와 `focus-visible`을 구분한다. 포커스에는 2px 이상의 외곽선과 여백을 사용한다. `main`의 `tabindex="-1"`과 앵커 대상의 `scroll-margin`을 유지한다. 독립 링크는 24px 이상의 높이 또는 WCAG가 허용하는 간격 및 인라인 예외를 충족해야 한다. 모바일 프로필 아이콘 링크는 각각 44px 조작 영역과 목적이 구분되는 접근 가능한 이름을 제공한다.

320px와 200% 글자 확대에서도 정보와 링크가 사라지거나 페이지 전체에 가로 스크롤이 생기지 않아야 한다. `overflow: hidden`, 고정 폭, CSS `order`, 캐러셀과 접이식 상세로 문제를 감추지 않는다.

등장 지연, 숫자 증가와 반복 장식 애니메이션은 사용하지 않는다. `prefers-reduced-motion: reduce`에서는 비필수 transition과 부드러운 스크롤을 제거한다. 한국어와 영어에 같은 규칙을 적용한다.
