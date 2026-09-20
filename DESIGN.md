# 개발자 소개 사이트 디자인 체계

이 문서는 편집형 단일 페이지 구현에 실제로 사용하는 시각 규칙을 기록한다. 화면을 수정할 때에는 요구사항의 방향을 유지하면서 이 문서의 토큰과 구성 요소를 먼저 사용한다.

## 글꼴

Pretendard 1.3.9의 `PretendardVariable.woff2`를 `public/fonts`에서 자체 제공한다. `font-display: swap`을 적용하고 `Pretendard Variable`, `Pretendard`, `system-ui`, `sans-serif` 순서로 대체한다. 배포 파일에는 SIL Open Font License 1.1 전문을 함께 둔다.

굵기는 본문 400, 보조 정보 500, 항목 제목 600과 화면 및 영역 제목 700만 사용한다.

## 글자 단계

- Display: `--text-display`, 700, 줄 높이 1.15
- Section title: `--text-section`, 700, 줄 높이 1.3
- Item title: `--text-item`, 600, 줄 높이 1.4
- Lead: `--text-lead`, 400 또는 500, 줄 높이 1.65
- Body: 1rem, 400, 줄 높이 1.75
- Metadata: .875rem, 500 또는 600
- Metric: `--text-metric`, 700, 줄 높이 1.15

본문은 최대 42rem, 소개와 기술 설명은 최대 48rem에서 읽도록 제한한다.

## 색상 역할

- `surface-default`: 페이지 바탕
- `surface-subtle`: 설명을 구분해야 하는 제한된 영역
- `text-primary`: 제목과 본문
- `text-secondary`: 보충 설명
- `text-muted`: 날짜와 기술 정보
- `border-default`: 일반 구분선
- `border-strong`: 포커스와 높은 대비가 필요한 선
- `brand-base`: 넓은 면이 아닌 제한된 장식
- `brand-strong`: 일반 크기 링크와 강조 글자
- `brand-hover`: 링크 hover 및 active 상태
- `brand-subtle`, `brand-subtle-strong`: 설명용 보조 면

색만으로 링크, 상태나 전후 변화를 구분하지 않는다.

## 여백과 배치

공통 여백은 4, 8, 12, 16, 24, 32, 48, 64, 96과 128px 단계로 제한한다. 페이지 최대 폭은 1200px이며 좌우 여백은 `clamp(1rem, 3vw, 2rem)`이다.

기본 배치는 한 열이다. 48rem 이상에서는 영역 번호와 본문을 나누고, 70rem 이상에서는 12열 편집 그리드를 사용한다. 페이지 전체 구성만 viewport를 기준으로 바꾼다. Contribution은 42rem, Evidence Row는 36rem, System Figure는 34rem의 가용 폭을 비교하는 Container Query를 사용한다.

DOM 순서는 화면 폭과 관계없이 Header, Identity, Experience, Open Source, Independent Work, Background, Contact와 Footer 순서로 유지한다.

## 구성 요소

`SectionHeader`, `MetricStatement`, `MetadataLine`과 `ExternalTextLink`는 같은 의미와 접근성 규칙이 둘 이상의 영역에서 반복될 때만 Shared UI로 사용한다. 영역 고유의 정보 순서는 Home Page 내부 컴포넌트가 담당한다. 큰 범용 Card, pill 태그와 boolean 조합으로 구조가 바뀌는 컴포넌트는 만들지 않는다.

Header는 일반 문서 배치에 두고 고정하지 않는다. 페이지 안의 링크는 실제 영역 id를 가리키며 기본 HTML 앵커 이동을 사용한다.

## 상태와 움직임

링크는 기본, hover, active와 `focus-visible` 상태를 구분한다. 포커스 표시는 2px 이상의 외곽선과 여백을 사용한다. 앵커 대상에는 여유 있는 `scroll-margin`을 둔다.

내용을 자동으로 등장시키거나 숫자를 증가시키는 애니메이션은 사용하지 않는다. `prefers-reduced-motion: reduce`에서는 비필수 transition과 부드러운 스크롤을 제거한다.

## 반응형 예외와 도식

320px과 200% 확대에서도 가로 스크롤 없이 같은 내용을 읽을 수 있어야 한다. 고정 폭, CSS `order`, 캐러셀과 축소된 수치 표현으로 문제를 감추지 않는다.

기술 관계도가 본문보다 이해를 돕는 경우에만 `SystemFigure`를 사용한다. 도식에는 같은 뜻의 본문 또는 `figcaption`을 제공하고, 가용 폭이 부족하면 관계를 세로로 배치한다.
