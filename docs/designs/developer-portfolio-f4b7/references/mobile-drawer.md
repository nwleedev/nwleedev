# 모바일 Drawer의 배치와 접근성 조사

모바일에서는 외부 프로필 링크와 언어 선택을 한 단계 Drawer에 모으고, 데스크톱에서는 링크를 본문에 유지하면서 언어 선택만 화면 오른쪽 상단에 둔다. Drawer는 섹션 탐색용 네비게이션 바가 아니라 40rem 미만 화면에서 보조 링크를 여는 메뉴다.

이 문서는 2026-09-20에 Astro 7.3.3과 Tailwind CSS 4.3.3으로 구현할 모바일 Drawer의 개발 방식과 시각 구성을 판단하기 위해 작성했다. 조사 결과는 구현 근거이며 새로운 콘텐츠 요구사항을 추가하지 않는다.

## 개발 방식

표준 HTML `dialog`를 `showModal()`로 여는 방식이 현재 사이트에 가장 알맞다. [MDN의 `dialog` 설명](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)은 modal dialog가 열릴 때 나머지 문서를 조작할 수 없게 만들고, Escape 닫기와 포커스 이동 같은 기본 동작을 제공한다고 설명한다. 별도 UI 라이브러리나 React 상태를 추가하지 않고 브라우저 기능으로 필요한 modal 동작을 얻을 수 있다.

[WAI-ARIA Authoring Practices의 modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)은 다음 동작을 요구한다.

- 열릴 때 포커스가 dialog 내부로 이동한다.
- Tab과 Shift+Tab은 dialog 내부의 조작 요소 사이를 순환한다.
- Escape로 닫을 수 있다.
- 닫을 때 포커스가 메뉴를 연 버튼으로 돌아간다.
- 키보드로 찾을 수 있는 닫기 버튼을 제공한다.

[W3C의 HTML dialog 기법 H102](https://www.w3.org/WAI/WCAG21/Techniques/html/H102)은 표준 `dialog`가 포커스 이동, 내부 포커스 제한과 호출 버튼으로의 복귀를 브라우저 동작으로 제공한다고 설명한다. 따라서 `div`에 dialog 역할과 포커스 제한 코드를 직접 붙이는 방식보다 표준 요소를 사용한다. 메뉴 버튼에는 `aria-controls`와 상태에 맞는 `aria-expanded`를 제공하고, 닫기 버튼에는 `autofocus`를 사용한다.

Astro에서는 Drawer를 여는 동작에만 일반 `<script>`를 사용한다. [Astro의 client-side scripts 문서](https://docs.astro.build/en/guides/client-side-scripts/)에 따르면 일반 script는 TypeScript 변환, 번들링과 페이지 안의 중복 제거를 적용받는다. `is:inline`과 UI 프레임워크 Client Island는 필요하지 않다. 스크립트는 Custom Element 내부에서 자신의 버튼과 dialog만 찾고, 화면이 데스크톱 너비로 바뀌면 열린 dialog를 닫는다.

자동화 테스트 파일은 현재 저장소에 없고 이번 변경은 브라우저의 표준 dialog 동작과 반응형 화면을 함께 확인해야 한다. `pnpm check`와 `pnpm build` 이후 실제 브라우저에서 열기, 닫기, Escape, 포커스 복귀, Tab 순환, 배경 스크롤 방지와 화면 폭 전환을 확인한다.

## 시각 구성

GitHub 홈페이지를 390×844 CSS px로 확인했다. 닫힌 상태에서는 왼쪽 상단의 메뉴 버튼만 보이고, 열린 상태에서는 화면 높이를 채우는 검은 패널에 링크가 세로로 배치되며 닫기 버튼이 같은 상단 위치에 나타났다. 이 방식에서 전체 높이 패널, 명확한 열기 및 닫기 조작과 한 방향 링크 목록을 채택한다. GitHub의 어두운 색, 계층형 하위 메뉴, 검색과 가입 버튼은 이 사이트의 콘텐츠와 맞지 않아 채택하지 않는다. 관찰 대상은 [GitHub 홈페이지](https://github.com/)이며 서비스 변경에 따라 화면은 달라질 수 있다.

Brittany Chiang의 홈페이지를 같은 폭으로 확인했을 때 외부 프로필은 본문과 분리된 소셜 링크 목록으로 제공됐고 경력 본문은 그대로 이어졌다. 이 사이트에서도 외부 링크를 경력 섹션 메뉴와 섞지 않는 원칙만 채택한다. 관찰 대상은 [Brittany Chiang의 홈페이지](https://brittanychiang.com/)이며 Drawer 사례로 사용하지 않는다.

현재 사이트의 Drawer는 오른쪽에서 열린 것으로 인지할 수 있도록 화면 오른쪽에 붙이고, 최대 너비를 22rem으로 제한한다. 화면 폭이 22rem보다 작으면 좌측에 2rem의 배경이 보이도록 나머지 폭을 사용한다. 배경은 본문색의 반투명 값으로 어둡게 하고 패널은 기존 흰 바탕, 본문색, 브랜드 링크색과 구분선을 유지한다. 큰 둥근 모서리, 그림자, 아이콘 모음과 별도 애니메이션은 추가하지 않는다.

## Flex 배치

[MDN의 Flex 정렬 설명](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Aligning_items)과 [`gap` 설명](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/gap)에 따라 시각 순서와 DOM 순서를 같게 유지하고 `flex-direction`과 `gap`으로 간격을 정한다.

- 데스크톱 외부 링크: `flex-direction: row`, 줄바꿈 허용, 가로 24px 및 세로 12px 간격.
- 데스크톱 언어 선택: 화면 오른쪽 상단의 `flex-direction: row`, 16px 간격.
- 모바일 Drawer 외부 링크: `flex-direction: column`, 8px 간격. 각 링크는 최소 44px 높이를 사용한다.
- 모바일 Drawer 언어 선택: 외부 링크 아래 구분선 다음의 `flex-direction: row`, 16px 간격.

CSS `order`로 순서를 바꾸지 않는다. DOM에서도 외부 링크 다음에 언어 선택을 두어 화면과 키보드 탐색 순서를 일치시킨다.

## 적용 조건과 한계

Drawer에는 GitHub, Blog, LinkedIn과 Résumé, KO와 EN만 둔다. Experience, Open Source 같은 영역 이동 링크, 검색, 중첩 메뉴와 연락 행동 유도 문구는 넣지 않는다. JavaScript를 사용할 수 없을 때에는 모바일 링크를 Identity 본문 아래에 표시하는 fallback을 제공해 외부 자료와 언어 선택이 사라지지 않게 한다.

지원 브라우저의 최종 목록은 아직 정해지지 않았다. MDN은 `showModal()`이 2022년 3월 이후 주요 브라우저에서 널리 제공된다고 설명하지만, 최종 지원 범위가 이를 포함하지 않으면 구현 방식을 다시 판단해야 한다.
