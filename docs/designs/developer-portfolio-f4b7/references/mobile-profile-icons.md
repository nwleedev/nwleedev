# 모바일 프로필 아이콘과 언어 전환 조사

모바일에서는 Drawer를 사용하지 않고 GitHub, Blog, LinkedIn과 Résumé를 한 행의 아이콘 링크로 항상 표시한다. 한국어 화면에는 EN, 영어 화면에는 KO 링크 하나만 이름 오른쪽에 둔다. 네 아이콘에는 `phosphor-astro` 2.1.0을 사용하고, 링크의 조작 영역은 44px로 유지하면서 보이는 SVG만 24px에서 최소 18px까지 점진적으로 줄인다.

이 문서는 2026-09-20에 Astro 7.3.3과 Tailwind CSS 4.3.3으로 구현할 모바일 프로필 링크의 라이브러리, 배치와 접근성을 결정하기 위해 작성했다. 확인한 자료는 구현 근거이며 새로운 콘텐츠 요구사항을 추가하지 않는다.

## 아이콘 라이브러리 선택

Phosphor의 공식 코어 저장소는 환경별 포트 가운데 `phosphor-astro`를 Astro용 구현으로 연결한다. [Phosphor Core README](https://github.com/phosphor-icons/core/blob/main/README.md)는 코어 패키지가 여러 굵기의 SVG를 제공하며 포트가 이 자료를 각 환경에 맞게 사용한다고 설명한다. [코어의 MIT 라이선스](https://github.com/phosphor-icons/core/blob/main/LICENSE)는 복사, 수정과 배포를 허용한다.

`phosphor-astro` 2.1.0은 SVG를 Astro 컴포넌트로 제공하고 실행 의존성이 없다. 패키지의 [고정된 2.1.0 manifest](https://github.com/SeanMcP/phosphor-astro/blob/174cb17a18f61c61caac62ab1aba1307acd9b317/package.json)는 `*.astro`와 MIT 라이선스만 배포하며 Astro는 빌드 도구로만 사용한다. 따라서 브라우저 JavaScript, 상태 관리와 UI 프레임워크를 추가하지 않고 현재 정적 페이지에 아이콘을 포함할 수 있다.

사용할 의미는 GitHub 로고, 글을 나타내는 Article, LinkedIn 로고와 PDF 문서다. [Phosphor Core의 regular SVG 목록](https://github.com/phosphor-icons/core/tree/main/assets/regular)은 `github-logo.svg`, `article.svg`, `linkedin-logo.svg`와 `file-pdf.svg`를 제공한다. 브랜드 로고가 없는 Blog와 Résumé는 서비스 로고를 추정하지 않고 자료 종류를 나타내는 일반 아이콘을 사용한다.

이 패키지는 Phosphor Core가 연결한 커뮤니티 포트이며 코어 2.1.1보다 한 패치 이전인 2.1.0이다. 변경 가능성이 낮은 네 SVG만 사용하고 버전을 잠금 파일에 고정한다. 설치 뒤 실제 export 이름과 정적 빌드 성공 여부를 확인하고 브라우저 script가 생성되지 않았는지 검사한다.

## 모바일 배치

아이콘 목록은 소개 문구 다음, 데스크톱 텍스트 링크와 같은 문서 위치에 둔다. `display: flex`, `flex-wrap: nowrap`, `align-items: center`, `justify-content: flex-start`와 16px `gap`을 사용한다. 첫 링크를 본문 왼쪽 기준선에 맞추고 인접한 44px 조작 영역 사이에 같은 간격을 둔다. CSS `order`, 고정 전체 너비와 가로 스크롤은 사용하지 않는다.

[CSS Box Alignment Module Level 3](https://www.w3.org/TR/css-align-3/#distribution-values)는 `space-between`이 첫 항목과 마지막 항목을 컨테이너 양 끝에 두고 남는 너비를 항목 사이에 분배한다고 정의한다. [MDN의 `justify-content` 설명](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/justify-content)은 Flex 행에서 이 속성이 주축의 남는 공간을 배분한다고 설명한다. 화면 폭에 따라 아이콘 사이가 벌어지지 않게 하려면 `space-between`을 사용하지 않아야 한다. [CSS Box Alignment의 gap 정의](https://www.w3.org/TR/css-align-3/#gap-shorthand)와 [MDN의 `gap` 설명](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/gap)에 따라 인접 항목 사이의 고정 간격은 컨테이너의 `gap`으로 지정한다. 16px은 이 사이트의 기본 여백 값에 포함되고, 네 개의 44px 조작 영역과 함께 224px을 차지하므로 기존 266px 확인 폭에서도 한 행을 유지한다.

각 링크의 조작 영역은 44×44 CSS px로 고정하고 SVG만 `clamp(1.125rem, 7vw, 1.5rem)`으로 표시한다. 390px에서는 24px, 320px에서는 약 22px이며 더 좁은 화면에서는 18px까지 줄어든다. [WCAG 2.2 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)은 독립된 조작 대상에 24×24 CSS px 또는 충분한 간격을 요구하고, [Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)는 44×44 CSS px을 향상 기준으로 제시한다. 보이는 그림을 줄이더라도 조작 영역은 줄이지 않는다.

이름과 언어 링크는 별도의 `display: flex`, `align-items: center`, `justify-content: space-between` 행으로 정렬한다. 40rem 이상에서는 KO와 EN을 모두 표시하고 현재 언어에 `aria-current="page"`를 둔다. 40rem 미만에서는 현재 언어를 반복하지 않고 반대 언어 링크 하나만 표시한다. 절대 위치와 padding을 이용한 세로 위치 보정은 사용하지 않는다.

## 링크 이름과 포커스

아이콘 SVG는 장식 요소로 처리하고 링크 자체에 `GitHub: 개발 및 오픈소스 활동`처럼 기존 이름과 설명을 결합한 `aria-label`을 제공한다. [W3C ARIA8 기법](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA8.html)은 링크 텍스트만으로 목적이 충분하지 않을 때 `aria-label`로 목적을 설명할 수 있다고 정리한다. 화면에는 아이콘만 보이지만 접근성 트리에서는 네 링크의 목적이 서로 구분돼야 한다.

기존 `focus-visible` 외곽선, 링크 목적지와 순서를 유지한다. 메뉴 버튼, dialog, 닫기 버튼, 포커스 제한, 배경 스크롤 제어와 이를 위한 client script는 모두 제거한다.
