# 개인 메모 UI 디자인 시스템과 사용자 템플릿 시각 비교

## 결론

현재 구현의 따뜻한 종이색, 깊은 갈색 탐색 영역과 serif 제목은 조사 뒤 승인된 방향이 아니다. [Pretendard와 Figma식 작업 화면 결정](../decisions/figma-inspired-visual-direction.md)에 따라 다음 디자인은 Pretendard를 모든 인터페이스 글꼴에 사용하고, Figma Design 편집기처럼 중립적인 애플리케이션 프레임, 조밀한 도구 배치와 선택 객체 중심 제어를 사용한다. 메모가 놓이는 캔버스만 밝은 목재 인상을 가지며 메모와 제어 요소는 중립색 표면으로 구분한다.

2026년 자료에서 반복되는 흐름도 이 방향을 뒷받침한다. [Webflow의 2026년 전망](https://webflow.com/blog/web-design-trends-2026)은 생성 도구의 비슷한 결과에서 벗어나는 고유한 시각 체계와 사람의 제작 감각을 강조하고, [Material 3의 2026년 업데이트](https://m3.material.io/)는 강한 색, 유연한 글자, 대비되는 형태, 적응형 구성요소와 motion을 하나의 체계로 묶는다. 개인 메모 화면에서는 Figma의 구조를 그대로 복제하거나 목재 장식을 늘리지 않고, 밝은 목재 캔버스와 메모의 선택, 이동, 정렬 및 크기 변경 상태를 하나의 token 체계로 정의해야 한다.

이번 조사는 도움말 텍스트만 읽지 않았다. 현재 애플리케이션을 데스크톱과 작은 화면에서 직접 실행해 캡처했고, FigJam, Miro, Milanote와 Google Keep의 실제 화면 자료를 확인했다. Material 3, Fluent 2, Primer Web과 Atlassian의 현재 Figma 파일 6건과 배포 패키지를 함께 조사했다. Figma Community에서는 사용자 제작 노트 앱 6건의 편집 가능한 `.fig`를 Figma에서 열어 page, layer, style과 component 구성을 직접 비교했다.

승인 방향을 기록하기 전에 로그인된 Figma 데스크톱 앱의 현재 편집 화면도 다시 확인했다. 어두운 왼쪽 및 오른쪽 패널, 차가운 밝은 캔버스, 화면 아래의 떠 있는 도구 모음, 얇은 구획선과 파란 선택 표시를 확인했다. [Figma의 인터페이스 안내](https://help.figma.com/hc/en-us/articles/15297425105303-Explore-design-files)는 화면을 navigation bar, left sidebar, canvas, right sidebar와 toolbar로 구분하고, [UI3 안내](https://help.figma.com/hc/en-us/articles/23954856027159-Navigating-UI3-Figma-s-new-UI)는 캔버스를 우선하기 위해 아래 도구 모음과 접거나 크기를 바꿀 수 있는 패널을 사용한다고 설명한다.

[Figma의 공식 절차](https://help.figma.com/hc/en-us/articles/360038510873-Find-and-Duplicate-Files-from-the-Community)에 따라 Community 파일을 Drafts에 복제하거나 Figma Community에서 제공하는 preview를 연 뒤 `Save local copy`를 실행했다. deprecated로 표시된 Primer Primitives 파일은 저장 단계에서 제외했고 로컬 사본을 만들지 않았다. 별도 커버 이미지는 내려받지 않았으며, 전체 디자인 문서 안의 Cover page는 `.fig`의 일부로만 보관했다. 조사 대상으로 남은 12건의 `.fig`는 모두 임시 폴더에 저장하고 ZIP 압축 무결성을 확인했으므로 별도 다운로드 링크 목록을 두지 않는다.

이 문서는 2026년 8월 31일에 확인한 사실, 그 사실에서 도출한 결론과 다음 시안에 적용할 제안을 구분해 기록한 조사 자료다. 시각 설계를 새로 승인하거나 기존 [디자인 시스템 결정](../decisions/application-design-system.md)을 변경하지 않는다.

## 조사 범위와 판정 방식

### 확인한 자료

- `feature/personal-notes-app`의 Git 이력, 현재 소스의 design token과 화면 구성
- 로컬 실행 화면의 데스크톱 메모, 설정, 텍스트 분석과 작은 화면 메모
- FigJam, Miro, Milanote와 Google Keep의 실제 서비스 화면 또는 공식 화면 자료
- Material 3, Fluent 2, Primer Web과 Atlassian의 공식 구성요소 문서, 배포 패키지와 편집 가능한 `.fig` 6건
- Figma Community의 사용자 제작 노트 앱 템플릿 및 UI kit 6건과 그 편집 가능한 `.fig` 로컬 사본
- 2026년 시각 디자인 흐름을 다룬 공식 서비스 발표와 제작 시장 전망

### 근거를 구분하는 방법

- **확인된 사실**은 Git 개체, 로컬에서 실행한 화면과 동작, 내려받은 패키지와 `.fig` 파일, Figma 편집기, 로그인 없이 볼 수 있는 Figma 화면이나 실제 서비스 화면에서 직접 확인한 내용이다.
- **제작자 설명**은 Community 파일의 화면 수, component 수와 제공 항목처럼 원 제작자가 파일 소개 페이지에서 밝힌 내용이다. 편집 원본을 열었더라도 전부 다시 세지 않은 값과 구분한다.
- **조사 결론**은 여러 화면에 반복되는 시각 및 상호작용 특징을 현재 요구사항에 연결한 해석이다.
- **적용 제안**은 다음 시안에서 비교할 후보이며 승인된 요구사항이나 결정이 아니다.

Git이 무시하는 `temps/`에는 조사 시점의 패키지 tarball, 압축을 푼 소스, 로그인 없이 볼 수 있는 화면과 비교용 이미지를 보관했다. 추적 문서는 임시 파일이 없어도 결론과 출처를 이해할 수 있게 작성했다.

## `feature/personal-notes-app` Git 이력

### 기준점과 규모

확인 시점의 branch 끝은 `2a362fb11ea3be95772a5fb52cf06b44f38092ad`이고 `main`과의 공통 조상은 `811f9f3cdd1b08fddce0a77548113f631942a2e2`다. `main`보다 30 commits 앞서고 뒤처진 commit은 없다. 변경 규모는 133 files, 15,267 insertions와 1 deletion이다.

이번 조사 branch `docs/personal-notes-ui-research`는 `feature/personal-notes-app`의 끝에서 분기했다. 따라서 조사 문서는 구현 이전의 `main`이 아니라 현재 노트 앱 화면과 결정 이력을 기준으로 한다.

### 이력이 보여주는 설계 과정

처음 여섯 commits는 포트폴리오의 채용 근거, 미니 애플리케이션 주제와 표현 검증을 정리한다. 개인 메모 작업은 `52f3131 docs(notes): define personal notes requirements`부터 시작한다. 이후 흐름은 세 구간으로 나뉜다.

1. `52f3131`부터 `3cfc189`까지 요구사항, 상호작용, 시각 조사, 실행 구조와 고유 디자인 시스템을 먼저 정했다. `15d3952`에서 애플리케이션 디자인 조사를 기록했고 `c3378ff`와 `3cfc189`에서 흔한 생성형 UI를 피하면서 자체 `shared/ui`와 의미 기반 token을 사용하기로 했다.
2. `1778ceb`부터 `104196a`까지 Next.js 앱 기반을 만들고 업무 자료를 나누는 기준과 IndexedDB 저장을 정했다. 화면 외형보다 로컬 실행과 자료 수명을 먼저 안정시키는 순서였다.
3. `aebfede feat(notes): establish the application design system`에서 현재 조형 언어를 구현했고, 실행 주소와 데이터베이스 복구를 고친 뒤 `a258e96`과 `2a362fb`에서 메모 작업 영역을 우선하고 전체 너비를 사용하도록 조정했다.

이 이력은 현재 디자인이 임시 template을 우연히 적용한 결과가 아니라 요구사항, UI 기반 결정과 화면 너비 검토를 거쳐 만들어졌음을 보여준다. 다만 결정 책임자가 조사 뒤 글꼴과 시각 방향을 바꿨으므로 기존 종이 및 갈색 표현은 보존할 전제가 아니다. 메모 동작과 화면 너비 결정은 유지하고, 시각 token과 애플리케이션 프레임은 승인된 방향에 맞게 바꾼다.

## 현재 애플리케이션의 시각적 성격

### 직접 확인한 특징

로컬 앱은 메모 화면에서 왼쪽 sidebar를 제거하고 상단 탐색 아래에 넓은 작업 영역을 둔다. 다른 route는 깊은 갈색 sidebar를 사용한다. 메모는 따뜻한 canvas 위의 밝은 종이로 보이고, 약간 오른쪽 아래로 어긋난 단단한 shadow가 카드가 아니라 놓인 종이의 느낌을 만든다. 설정과 분석 화면도 같은 색, 글자와 panel 규칙을 공유하므로 별도 mini app처럼 분리되지 않는다.

[token 소스](../../../../apps/notes/src/_app/styles/tokens.css)에서 확인한 정의는 다음과 같다.

- canvas, paper, surface, rail, action과 focus를 OKLCH 역할 token으로 분리한다.
- action은 terracotta 계열이고 focus ring은 파란색이라 주요 동작과 keyboard focus의 의미가 충돌하지 않는다.
- display 글꼴은 `Iowan Old Style`, `AppleMyungjo`, `Noto Serif KR` 순으로, UI 글꼴은 Pretendard와 system sans 순으로 대체한다.
- control, note와 panel의 radius는 각각 `0.4rem`, `0.25rem`, `0.75rem`이다. 모든 요소를 같은 큰 pill이나 둥근 card로 만들지 않는다.
- note shadow는 흐린 부유 shadow가 아니라 `0.38rem 0.42rem`만큼 어긋난 고정 shadow이고, popover 성격의 요소에는 별도 floating shadow를 둔다.

[메모 목록](../../../../apps/notes/src/_pages/notes/ui/NotesCollection.tsx)은 `48rem` 미만 영역에서 한 열 list, `48rem` 이상에서 자유 배치 board를 사용한다. [메모 화면](../../../../apps/notes/src/_pages/notes/ui/AccumulatorWorkspace.tsx)은 누적 panel과 작업 영역에 너비를 우선 배정한다. 이는 화면 크기에 따라 board를 단순 축소하지 않는 기존 결정을 실제 구성으로 옮긴 결과다.

### 기존 구현에서 유지할 강점

- 노트 앱 template에서 흔한 보라색 AI gradient, 검은 mobile shell과 큰 3D illustration 없이도 성격이 보인다.
- portfolio 안의 여러 mini application 가운데 개인 메모의 공간 작업 방식이 분명하다.
- 콘텐츠, 제어와 panel의 역할이 token으로 구분되어 있어 새 색과 글자 체계로 옮길 수 있다.
- 메모 원문과 빈 공간이 탐색이나 소개 문구보다 먼저 보인다.

### 아직 비교가 필요한 상태

- 메모의 기본, hover, selected, editing, dragging와 resizing 상태
- 선택 테두리, resize handle, drag preview, 놓을 수 있는 위치와 정렬 안내선
- 문맥 toolbar를 항상 보일지 선택 뒤 나타낼지에 대한 두 시안
- 중립적인 애플리케이션 프레임과 밝은 목재 캔버스를 유지한 dark 및 increased contrast mode
- 메모 색이 장식인지 분류인지, 사용자가 고를 수 있는지에 대한 규칙
- keyboard와 touch가 drag 없이 같은 이동 및 크기 변경 결과를 만드는 방법

## 2026년 웹 UI 흐름과 현재 앱에 주는 의미

### 고유한 체계가 생성 결과의 유사성을 이긴다

[Webflow의 2026년 전망](https://webflow.com/blog/web-design-trends-2026)은 proprietary effects and styles, 전통적인 제작 감각과 고급 UI의 결합, 짧은 문구, 폭넓은 색 체계, 동적인 글자와 infinite canvas를 제시한다. 이 자료는 Webflow로 제작한 사이트를 많이 다루므로 앱 UI의 규칙으로 직접 채택하지 않는다. 다만 생성 도구로 구현 장벽이 낮아질수록 의도와 제작 감각이 드러나는 체계가 차별점이 된다는 시장 신호는 현재 앱의 따뜻한 editorial identity를 유지할 근거가 된다.

infinite canvas도 점무늬 배경이나 node 장식만 복제해서는 의미가 없다. 개인 메모에서는 사용자가 위치를 기억하고 항목 사이 관계를 만드는 실제 interaction이 있어야 한다. 현재 board는 이 조건에 맞지만 선택, 이동, 정렬과 복구 표시가 함께 완성되어야 한다.

### 표현력은 component와 token의 정밀도를 낮추지 않는다

[Material 3](https://m3.material.io/)는 2026년 5월 업데이트에서 vibrant color, intuitive motion, adaptive component, flexible typography와 contrasting shape를 M3 Expressive로 묶었다. 동시에 Figma kit와 motion physics token을 함께 갱신했다. 표현적인 외형을 개별 화면의 예외로 만드는 대신 반복 가능한 component, token과 motion 규칙으로 배포한다는 점이 중요하다.

현재 앱에는 강한 shape morphing이 필요하지 않다. 밝은 목재 캔버스와 중립적인 애플리케이션 프레임의 차이가 이미 시각적 성격을 만들 수 있다. 다음 시안은 장식을 더하기 전에 selection, drag와 undo가 동일한 token 체계에서 어떻게 보이는지 증명해야 한다.

### 짧은 문구와 높은 밀도는 설명을 지우는 일이 아니다

Webflow가 말하는 최소 문구는 생성한 소개 문단을 줄이는 흐름이다. 개인 메모 앱도 현재 route, 동작 이름과 상태를 직접 표시하고 장황한 도움말을 피한다. 그러나 개별 복사 결과, 저장 실패, drag 대안과 선택 상태처럼 화면만으로 알 수 없는 결과까지 제거해서는 안 된다. 기존 [사용자에게 필요한 문구 기준](interface-layout-research.md#사용자에게-필요한-문구만-남기는-기준)을 그대로 유지한다.

## 유사 애플리케이션의 실제 UI 비교

### FigJam

[FigJam 안내](https://help.figma.com/hc/en-us/articles/1500004362321-Guide-to-FigJam)와 실제 UI map, sticky 및 section 화면을 내려받아 확인했다. 캔버스 주변의 chrome은 낮고, 하단 도구 모음은 생성 도구를 한곳에 모으며, 선택한 객체 가까이에서 속성을 바꾼다. sticky는 core object이고 이름 표시를 속성 menu에서 끌 수 있다. section은 자유 배치 내용을 이동 및 탐색 가능한 묶음으로 만든다.

현재 앱에 적용할 수 있는 부분은 낮은 chrome, 선택 뒤 나타나는 문맥 도구와 공간 묶음이다. 다자 협업 cursor, emoji와 놀이형 sticker는 개인 로컬 메모의 요구와 관계가 없으므로 가져오지 않는다.

### Miro

Miro의 실제 sticky 선택 화면에서는 객체 바로 위에 context toolbar가 나타나고, 색상, type 변경, 정렬과 작성자 표시를 같은 흐름에서 다룬다. [Miro의 새 design language 안내](https://help.miro.com/hc/en-us/articles/25286391619986-Miro-s-new-design-language-overview)는 sticky 색의 대비와 vibrancy를 높이고, margin을 맞추기 쉽도록 shadow를 조정했으며, body font를 Noto Sans로 바꿨다고 설명한다. 내려받은 화면에서 16개 sticky color가 고정 palette로 제공되는 것도 확인했다.

현재 앱은 Miro처럼 많은 색을 제공할 필요가 없다. 대신 선택 상태에서 위치, 크기, 색과 정렬 동작을 한 문맥으로 묶고, note shadow가 정렬 판단을 방해하지 않게 한다는 원칙을 참고할 수 있다.

### Milanote

[Milanote의 2026년 공식 안내](https://help.milanote.com/en/articles/112349-creating-your-first-project)는 왼쪽 toolbar에서 board를 끌어 놓고 note, image, to-do와 link를 같은 visual workspace에 추가하는 흐름을 보여준다. 내려받은 공식 화면에서도 왼쪽 도구와 자유 배치된 여러 콘텐츠가 주 작업 공간을 둘러싼다.

개인 메모 앱은 콘텐츠 유형을 확장할 요구가 없으므로 mixed-media card를 따라갈 이유가 없다. 다만 toolbar에서 객체를 만들고, board 안에서 관계를 눈으로 확인하며, board를 더 큰 구조 안에 중첩하는 공간 문법은 향후 메모 묶음을 검토할 때 참고할 수 있다.

### Google Keep

[Google Keep 공식 안내](https://support.google.com/keep/answer/2888240?co=GENIE.Platform%3DDesktop&hl=en)는 note와 list를 즉시 만들고 label, color, pin, archive와 reminder로 정리하는 흐름을 제공한다. 실제 서비스 화면은 여러 높이의 note, checklist, image와 audio card를 조밀한 grid에 놓고 상단 입력에서 바로 만들게 한다.

Keep의 강점은 생성과 탐색 비용이 낮다는 점이다. 반면 위치 좌표 자체를 기억하는 board가 아니므로 현재 앱의 자유 배치 요구를 대체하지 못한다. 작은 화면 list에서는 즉시 작성, 검색 우선순위와 콘텐츠 길이에 따른 card 높이만 참고할 수 있다.

### 비교 결론

- 현재 앱과 가장 가까운 상호작용 참고 대상은 FigJam과 Miro다. 자유 배치, 선택, 이동과 문맥 도구가 실제 서비스 화면에서 완성되어 있다.
- Milanote는 작업 공간의 성격과 낮은 chrome이 가깝지만 mixed content와 프로젝트 board 계층은 현재 범위보다 넓다.
- Google Keep은 작은 화면과 즉시 작성 흐름에는 유용하지만 공간 좌표를 사용하지 않는다.
- 어떤 서비스도 승인된 Pretendard, Figma식 애플리케이션 프레임과 밝은 목재 캔버스 조합을 그대로 제공하지 않는다. 외형 전체를 복제할 대상이 아니라 layout과 interaction completeness를 비교할 대상이다.

## 배포 중인 디자인 시스템을 말단까지 확인한 결과

공식 설명만 비교하지 않기 위해 2026년 8월 31일에 배포된 package를 임시 위치에 내려받고 source, type declaration, Figma용 JSON과 component token을 직접 세었다. 버튼은 네 체계에 모두 있고 강조 수준, 크기, 모양과 상태를 비교하기 쉬워 공통 표본으로 삼았다.

### Material 3

[Material 3 Figma kit](https://www.figma.com/community/file/1035203688168086460/material-3-design-kit)에서 계정 없이 볼 수 있는 화면과 `@material/web@2.5.0`을 확인했다.

- 편집 가능한 `material-3-design-kit.fig`에서 Getting started, table of contents, Styles, Utilities, Shape, Icons와 Examples를 확인했다. component page는 app bar, badge, button, card, carousel, checkbox, chip, date 및 time picker, dialog, list, loading, progress, menu, navigation, search, sheet, slider, snackbar, switch, tab, text field, toolbar와 tooltip을 포함한다.
- Figma style은 text, color, effect와 layout guide로 나뉘어 component 예시와 foundation 정의를 같은 파일에서 추적할 수 있다.
- package의 top-level component token Sass 파일은 49개다.
- filled button은 container, label, icon, disabled, hover, focus와 pressed를 포함한 supported token 42개를 제공한다.
- button은 filled, filled tonal, elevated, outlined와 text의 다섯 강조 방식을 제공한다.
- 2026년 공식 화면은 다섯 color treatment, 다섯 size와 round 및 square 두 shape를 함께 보여준다.

가져올 원칙은 표현적인 shape와 color를 component state 및 token과 함께 정의하는 방식이다. Material의 둥근 button이나 강한 color를 현재 앱에 그대로 복제하지 않는다.

### Fluent 2

[Fluent 2 Web UI kit](https://www.figma.com/community/file/836828295772957889/microsoft-fluent-2-web)에서 계정 없이 볼 수 있는 화면과 `@fluentui/react-components@9.74.7`, `@fluentui/react-theme@9.2.2`, `@fluentui/react-button@9.11.0`, `@fluentui/tokens@1.0.0-alpha.24`를 확인했다.

- 편집 가능한 `microsoft-fluent-2-web.fig`에서 Cover, Changelog, Docs와 DataGrid, Drawer, Message bar, Nav, Toast, Tree를 포함한 40개 이상의 component page를 확인했다.
- text style은 10/14부터 68/92까지 여러 크기와 weight를 제공하고, effect style은 02, 04, 08, 16, 28과 64 단계의 shadow로 나뉜다.
- theme에서 사용할 수 있는 alias token은 467개다.
- button은 `secondary`, `primary`, `outline`, `subtle`, `transparent`의 다섯 appearance, `rounded`, `circular`, `square`의 세 shape와 세 size를 type으로 제한한다.
- standard, split, menu와 compound button을 별도 component로 제공하고 toggle state도 따로 다룬다.
- disabled button을 keyboard focus 순서에 남겨야 하는 상황을 `disabledFocusable`로 구분한다.

가져올 원칙은 한 구획의 primary action을 하나로 제한하고, 같은 button이라도 행동 구조가 다르면 component 책임을 나누는 방식이다. Fluent의 중립적인 기업용 외형은 현재 앱의 조형 언어가 아니다.

### Primer

[Primer Web](https://www.figma.com/community/file/854767373644076713/primer-web)의 현재 Figma 파일과 `@primer/primitives@11.10.0`, `@primer/react@38.36.0`을 확인했다. Figma Community가 파일 제목에 `[DEPRECATED]`를 붙인 Primer Primitives는 다운로드와 시각 비교에서 제외했다. npm package의 현재 token 구조를 확인하는 일과 폐기된 Figma 파일을 참고하는 일은 구분했다.

- 편집 가능한 `primer-web.fig`에는 Getting started, Contribute, shared components, sticker sheet와 ActionMenu부터 UnderlinePanels까지 50개가 넘는 component page가 있다.
- text style은 Display 40/56, Subtitle 20/32, Caption 12/16과 CodeBlock 13/20을 비롯해 Title, Body, Link와 CodeInline 역할을 분리한다. `SubNav (deprecated soon)` page는 현재 파일에 포함되어 있으나 다음 디자인의 참고 대상으로 사용하지 않는다.
- primitives에는 component token JSON5가 27개 있고 그 안에 `$value`가 969개 있다. 전체 token-bearing JSON5 61개에는 `$value`가 3,453개 있다.
- button token 파일 하나에 `$value`가 360개 있다.
- button은 default, primary, invisible, danger와 link variant, 세 size, loading과 inactive 상태를 제공한다.
- Figma용 산출물에는 light, dark, dimmed, high contrast, color-blind와 tritanopia theme가 분리되어 있다.

가져올 원칙은 theme를 단순 light 및 dark 쌍으로 끝내지 않고 contrast와 색각 조건까지 같은 semantic role로 연결하는 방식이다. GitHub의 조밀한 정보 화면 외형을 메모 작업 공간에 복제할 필요는 없다.

### Atlassian

[Atlassian 공식 Figma library 안내](https://atlassian.design/get-started/design/figma/)와 `@atlaskit/tokens@16.10.0`, `@atlaskit/button@25.3.0`을 확인했다.

- 편집 가능한 `ads-foundations.fig`, `ads-components.fig`와 `ads-iconography.fig`를 하나의 현재 체계로 확인했다. Legacy 이름의 파일은 내려받지 않았다.
- Foundations에는 Readme, Changelog, Design tokens, Grid, Typography와 Internal Parts가 있고, Heading, Body, Metric와 Code text style 및 light와 dark effect를 제공한다. Components는 Avatar, Button, Checkbox, Form, Text field, Tooltip과 navigation 계열을 component page로 나눈다. Iconography는 migration, contribution, changelog, core, lab와 utility source를 함께 제공한다.
- package에 Figma용 light와 dark token이 각각 462개 포함되어 있다.
- 별도 Figma JSON에는 spacing 23개, shape 11개와 typography 9개가 있다. motion JSON은 현재 비어 있어 package가 제공하는 파일과 실제 정의가 같다고 추정하지 않았다.
- button은 일곱 appearance와 두 density를 제공하고 disabled, selected와 loading 상태를 구분한다.
- light, dark와 increased contrast 파일이 서로 분리되어 있어 같은 semantic name을 환경별 값에 연결할 수 있다.

가져올 원칙은 token 이름을 실제 사용 목적에 맞추고, Figma 산출물과 code package를 같은 자료 구조로 배포하는 방식이다. Atlassian 서비스의 파란 primary와 흰 enterprise surface는 현재 앱의 brand가 아니다.

### 네 체계에서 공통으로 확인되는 조건

- component 이름만 정의하지 않고 appearance, size, shape, density와 interaction state를 제한된 조합으로 만든다.
- 기본, hover, focus, pressed, disabled, selected와 loading을 token 또는 명시적인 variant로 구분한다.
- Figma library와 code package가 같은 의미 이름을 사용하도록 연결한다.
- light 및 dark 외에도 high contrast, reduced color distinction이나 density 같은 환경 차이를 별도 값으로 다룬다.
- component 수보다 어떤 조합이 허용되고 어떤 상태가 빠지지 않는지가 완성도를 결정한다.

## 실제 사용자 제작 노트 앱 template 비교

[Figma의 라이선스 안내](https://help.figma.com/hc/en-us/articles/360042296374-Figma-Community-copyright-and-licensing)에 따라 free Community 파일과 paid resource의 free preview는 CC BY 4.0으로 배포된다. 내려받은 화면은 조사와 비교 목적으로만 사용하고 원 제작자를 함께 기록했다.

### Makarya Notes

[Fariz Ikhsan의 Makarya Notes](https://www.figma.com/community/file/1090245813253623841/free-version-makarya-notes-advanced-note-taking-app-design-system-ui-kit)는 보라색 바탕, 노란 accent, illustration과 mobile card grid를 사용한다. 제작자 설명은 atomic design, 30개 이상 component, 300개 이상 variant, 20개 이상 screen, resizable screen과 interactive prototype을 제공한다고 밝힌다. 실제 미리보기에서는 note 길이와 category에 따라 card 높이와 색을 달리하고 중앙 add button을 강조한다.

편집 가능한 `makarya-notes-free.fig`에서는 Cover, Style & Component, Styles, Components, Icons, Illustrations, High Fidelity Design & Prototype와 Full Version Preview page를 확인했다. text style은 `text-3xl`부터 `text-xs`까지 나뉘고, color style은 Neutral, Error, Primary, Success, Warning과 Secondary로 묶인다. 1열부터 4열까지 layout guide style도 별도로 제공한다.

현재 앱에는 card variation과 content hierarchy가 유용하다. 보라색 brand wrapper, 장식 illustration과 mobile device mockup은 흔한 app kit 외형이므로 가져오지 않는다.

### AI Notes

[CLIMAXCODE의 AI Notes](https://www.figma.com/community/file/1600818721607210140/ai-notes-note-taking-transcription-smart-summary-app-ui-kit-free)는 흰 surface, 파랑 및 보라 gradient, 큰 제목과 3D robot을 사용한다. meeting transcription, summary와 AI assistant가 첫 화면의 중심이다.

편집 가능한 `ai-notes-free.fig`에서는 `cover image`, `assets`와 `ui design` page를 확인했다. color style은 `PRIMARY COLOR`와 `ai`, effect style은 `sq2`, `sw`, `121`처럼 이름의 의미가 충분히 드러나지 않았다. Figma는 missing fonts 상태도 표시했다. 화면 수보다 layer와 style 이름의 유지 보수성을 함께 평가해야 한다는 반례다.

여러 기능을 한눈에 설명하는 marketing preview지만 현재 로컬 개인 메모의 원문, 공간 배치와 복사 흐름을 가린다. 다음 시안에서 피해야 할 범용 AI 표현의 직접 사례다.

### Keep Notes App UI Design

[Chirag Panchal의 Keep Notes](https://www.figma.com/community/file/1322611374300012502/keep-notes-app-ui-design)는 검은 background, 보라 accent, 겹친 dark card와 초록 check를 사용한다. search가 목록보다 먼저 보이고 note는 한 열 stack으로 이어진다.

편집 가능한 `keep-notes.fig`에는 Thumbnails와 App Design page가 있다. App Design의 layer에는 Home Screen, Text Details screen, Notes Inner Screen과 Plus Tap screen이 반복되어 목록, 상세와 추가 동작의 흐름을 직접 비교할 수 있다.

dark theme에서 group과 active state를 강하게 나누는 방법은 참고할 수 있다. 그러나 검은 mobile shell과 neon accent는 승인된 중립 애플리케이션 프레임과 밝은 목재 캔버스의 관계를 제공하지 않으며, desktop spatial board의 근거도 제공하지 않는다.

### NoteFlow

[Edward의 NoteFlow](https://www.figma.com/community/file/1526237987075572557/noteflow-ai-task-notes-app-ui-kit)는 100개 이상 screen을 내세운 paid kit의 free preview다. 유료 전체판을 구매하지 않고 Figma Community에서 제공하는 preview만 조사했다.

편집 가능한 `noteflow-free-preview.fig`에는 Dark, Light, Dark UI Kit와 Preview page가 있다. Dark page의 layer에는 AI Chat, Focus, Notes, Calendar, Tasks, Home과 Log In이 있고, 이 `.fig` 안의 실제 화면 및 UI kit를 직접 비교할 수 있다. 전체 유료판의 화면 수와 구성은 이 로컬 파일로 확인한 사실에 포함하지 않는다.

장점은 기본 화면만이 아니라 theme, navigation과 component sheet까지 한 kit에서 비교할 수 있다는 점이다. 반면 note, task, focus와 AI를 하나의 mobile productivity suite로 묶어 현재 앱보다 범위가 넓다. 시각적 외형보다 state 및 theme coverage를 참고한다.

### Notes & Planning

[Nivaaz Sehmbhi의 Notes & Planning](https://www.figma.com/community/file/853126478491557502/notes-planning-app)은 흰 배경, 산호색 선, 가는 글자와 넓은 여백으로 note와 planning form을 구성한다. 조사한 template 가운데 기존 구현의 밝은 종이와 절제된 색에 가장 가까웠다.

편집 가능한 `notes-planning.fig`에는 Page 1과 thumbnail page가 있다. Page 1에는 Todo, Today, 날짜와 시간, Breakfast 및 열 개의 iPhone 8 화면 layer가 있어 일정과 메모가 한 mobile 흐름에서 배치되는 방식을 확인했다.

가져올 수 있는 부분은 낮은 채도와 양식의 가벼운 선이다. 실제 사용 화면에서는 낮은 대비와 지나치게 가는 글자가 긴 한국어 메모 및 focus state를 약하게 만들 수 있으므로 그대로 적용하지 않는다.

### Notes App UI

[Divya의 Notes App UI](https://www.figma.com/community/file/1014161465589596715/notes-app-ui)는 단순한 mobile note flow를 제공하며 [UI4Free의 원 제작자 및 CC BY 4.0 안내](https://ui4free.com/mobile-templates/notes-app-ui-figma-template.htm)와 교차 확인했다.

편집 가능한 `notes-app-ui.fig`에는 Design과 Thumbnail page가 있다. Design page의 layer에는 Home Screen, Searching Note Empty, Searching Note, Sample Note, 네 가지 Editor 상태와 Home Screen Empty가 포함되어 있어 검색 결과, 빈 화면과 편집 흐름을 확인할 수 있다.

이 자료는 mobile 기본 흐름과 상태 누락 여부를 확인하는 보조 사례로 사용했다. component 및 token coverage를 설명하는 자료는 부족하므로 디자인 시스템의 완성도 비교에는 포함하지 않았다.

### template에서 반복되는 시각 특징

- note 내용은 card 높이, color와 위치를 달리해 정보 우선순위를 만든다.
- search와 add action은 목록 가까이에 두고 mobile에서는 floating 또는 중앙 action을 자주 사용한다.
- light 및 dark theme를 함께 보여주거나 component sheet를 제공한 kit가 단일 화면보다 검토하기 쉽다.
- AI note kit는 파랑 및 보라 gradient, 큰 marketing title, robot 또는 device mockup이 반복된다.
- 대부분 mobile 중심이므로 자유 배치 desktop board, keyboard focus와 resize 상태의 근거로는 부족하다.

## 승인된 시각 방향과 다음 시안의 제안

글꼴, 애플리케이션 프레임과 메모 캔버스는 [별도 결정](../decisions/figma-inspired-visual-direction.md)으로 승인됐다. interaction state와 구성요소별 세부 값은 조사 결론을 화면으로 검증하기 위한 제안이며 아직 승인된 값이 아니다.

### 승인된 시각 전제

- 제목과 본문을 포함한 모든 인터페이스 글꼴에 Pretendard를 사용하는 글자 체계
- 중립적인 짙은 회색 및 차가운 회색 애플리케이션 프레임, 얇은 구획선과 파란 선택 및 포커스 표시
- 낮은 대비의 밝은 목재 결을 가진 메모 캔버스와 중립색 메모 표면
- 큰 장식 그림자 대신 얇은 테두리와 절제된 깊이
- 소개 문구보다 메모 원문과 작업 공간이 먼저 보이는 화면 밀도
- 넓은 화면의 spatial board와 작은 화면의 독립적인 list

### 새로 설계할 interaction layer

- selected note에는 neutral border, keyboard focus에는 blue ring을 사용해 두 상태를 겹쳐도 구분한다.
- editing 상태에서는 caret와 text selection이 우선이고, 이동 handle 및 복사 trigger가 편집을 방해하지 않게 한다.
- dragging 상태는 원래 위치, preview, drop 가능 영역과 정렬선을 함께 보여준다.
- resizing 상태는 보이는 handle과 실제 pointer target을 분리하고 현재 width 및 height를 확인할 수 있게 한다.
- context toolbar는 FigJam과 Miro처럼 선택한 note 가까이에 두되 메모 원문을 완전히 가리지 않는다.
- drag 없는 이동 및 크기 변경, undo와 redo를 동일한 결과를 만드는 보조 동작으로 제공한다.

### design system에서 추가할 비교 sheet

- Button: tone, size, icon placement, loading, disabled와 destructive
- Note: empty, one line, long Korean text, selected, editing, dragging, resizing와 error
- Field: default, focus, invalid, disabled, read-only와 IME composing
- Navigation: notes top navigation, other route sidebar, mobile menu와 current route
- Overlay: context toolbar, popover, modal accumulator panel, toast와 drag preview의 stacking
- Theme: current light, dark candidate, increased contrast, reduced motion과 forced colors

대표 화면 하나와 component sheet를 함께 검토해야 한다. sheet만 보면 실제 밀도를 알 수 없고, 대표 화면만 보면 빠진 state와 theme를 찾기 어렵다.

## 그대로 가져오지 않을 패턴

- 파랑 및 보라 gradient와 3D robot으로 AI 기능을 먼저 설명하는 화면
- 검은 mobile device shell을 desktop web app의 전체 theme로 확대하는 방식
- 모든 note, panel, button과 badge에 같은 큰 radius 및 흐린 shadow를 적용하는 방식
- 도움말과 marketing 문구로 interaction state의 부족을 가리는 방식
- community kit의 screen 수나 component 수를 품질 점수로 사용하는 방식
- Material, Fluent, Primer 또는 Atlassian의 기본 brand color와 component 외형을 자체 token 위에 덮는 방식
- serif 제목, 종이 질감과 어긋난 짙은 그림자를 메모의 정체성으로 다시 사용하는 방식
- 밝은 목재 결을 탐색, panel과 모든 card에 반복해 캔버스와 제어의 구분을 없애는 방식
- 자유 배치 board에 dot grid와 node를 장식으로 추가하지만 실제 선택, 이동과 관계 생성은 제공하지 않는 방식

## 조사 한계와 다음 확인 조건

- deprecated로 표시된 Primer Primitives를 제외한 공식 디자인 시스템 6건과 사용자 제작 템플릿 6건은 모두 편집 가능한 `.fig` 로컬 사본을 저장하고 Figma에서 page와 layer를 확인했다. 모든 node의 variant, variable, auto layout과 prototype 연결을 전수 집계한 것은 아니므로 문서에 적은 범위 밖의 세부는 확인된 사실로 간주하지 않는다.
- NoteFlow는 유료 전체판이 아니라 Figma Community에서 제공하는 preview `.fig`만 확인했다. 전체판 소개에 적힌 화면 수와 제공 항목은 제작자 설명으로 남는다.
- package 수치는 2026년 8월 31일에 내려받은 정확한 version의 결과다. 최신 version이 바뀌면 다시 세어야 한다.
- Community 사용 횟수와 like 수는 계속 변하므로 설계 근거로 기록하지 않았다.
- 공식 화면은 각 서비스의 현재 기능과 brand를 보여주지만 개인 메모 사용자를 대상으로 한 비교 사용성 시험은 아니다.
- 다음 시안을 만들 때 승인된 Figma식 애플리케이션 프레임 및 밝은 목재 캔버스, direct-manipulation state와 작은 화면 list를 같은 실제 한국어 메모 및 같은 viewport에서 비교해야 한다.
