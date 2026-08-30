# 2026년 웹 애플리케이션 시각 디자인과 AI 생성 UI 조사

## 결론

2026년 웹 애플리케이션 디자인은 한 가지 외형으로 수렴하지 않는다. 운영체제와 주요 디자인 시스템에서는 강한 색, 대비되는 형태, 가변 타이포그래피와 반응성 있는 모션을 체계 안에서 사용하는 흐름이 확인된다. 동시에 반투명 재질과 깊이 표현은 콘텐츠 자체보다 탐색과 제어 영역을 구분하는 데 쓰는 방향이 뚜렷하다. 웹 제작 분야에서는 AI 도구의 기본값에서 벗어난 고유한 시각 언어, 세밀한 질감과 사람이 직접 다듬은 흔적을 차별점으로 제시한다.

개인 메모 애플리케이션에는 이 흐름을 그대로 복제하기보다 메모 원문과 공간 배치를 우선하는 편이 적합하다. 표현력은 범용 대시보드 카드, 장식용 그라데이션이나 전면적인 유리 효과보다 메모의 위치, 선택, 이동, 크기 변경과 누적 순서가 분명하게 느껴지는 데 사용해야 한다. [공간형 보드와 작은 화면 목록 결정](../decisions/responsive-note-presentation.md)에 따라 메모 작업 영역이 좁으면 같은 시각 원칙을 목록에 적용하되 공간형 보드를 축소해 억지로 넣지 않는다.

AI가 만든 화면은 특정 모양만으로 판별할 수 없다. 다만 디자인 시스템과 실제 콘텐츠를 주지 않은 생성 도구가 범용 웹 기본값으로 돌아간다는 공식 문서, 생성 결과의 다양성이 낮아질 수 있다는 연구, 화면 구현 과정에서 요소 누락과 배치 오류가 발생한다는 평가를 함께 보면 반복되는 위험은 파악할 수 있다. 이를 피하려면 미적 형용사를 prompt에 더 넣기보다 실제 작업 흐름, 콘텐츠, 고유한 design token, 재사용 구성요소, 모든 상호작용 상태와 검증 화면을 생성 입력과 사람의 검토 기준으로 제공해야 한다.

이 문서는 조사 결과와 적용 후보를 기록한 참고 자료다. 시각적 성격, 글꼴, 색, 모서리, 깊이, 투명도, 밀도와 모션 수치는 아직 승인된 설계가 아니다. 플랫폼 디자인 문서, 접근성 표준, 생성형 UI 도구의 공식 문서와 연구 논문은 2026년 8월 30일에 검토했다.

## 조사 기준과 근거의 무게

웹 애플리케이션의 작업 화면을 중심으로 조사했다. 홍보용 사이트나 작품 전시 성격의 화면에서 관찰한 흐름은 애플리케이션 UI의 규칙으로 곧바로 옮기지 않았다.

- **확인된 흐름**은 Apple, Google, Microsoft, Adobe, Atlassian과 GitHub의 공식 디자인 시스템 또는 W3C 표준처럼 구현 책임자가 직접 배포한 자료가 둘 이상 같은 방향을 가리킬 때 사용한다.
- **2026년 시장 신호**는 Webflow와 Adobe의 연간 전망처럼 2026년 제작 경향을 다룬 자료를 뜻한다. 어떤 앱에나 적용할 규칙이 아니라 연도별 흐름을 비교할 때만 참고한다.
- **연구 결과**는 생성형 AI가 결과의 다양성, 화면 재현 정확도와 접근성에 미치는 영향을 측정한 논문에 한정한다. 조사 조건 밖의 화면까지 일반화하지 않는다.
- **적용 후보**는 위 근거와 현재 요구사항을 함께 고려한 제안이다. 승인된 요구사항과 구분하며 실제 사용성 검증 전에는 확정하지 않는다.

## 2026년에 확인되는 큰 방향

### 표현력은 디자인 시스템을 버리는 일이 아니다

[Material 3](https://m3.material.io/)는 2026년 현재 Expressive 방향에서 강한 색, 유연한 타이포그래피, 대비되는 형태, 적응형 구성요소와 형태가 바뀌는 모션을 함께 다룬다. [Material 3 Expressive 발표](https://blog.google/products-and-platforms/platforms/android/material-3-expressive-android-wearos-launch/)도 강조된 글자, 동적인 색, 자연스러운 spring motion과 상황에 따라 반응하는 구성요소를 한 체계 안에 묶는다. 이는 모든 요소를 화려하게 만들라는 뜻이 아니라 정보의 우선순위와 사용자의 동작을 색, 글자, 형태와 움직임이 함께 설명하게 한다는 뜻에 가깝다.

[Fluent 2 디자인 원칙](https://fluent2.microsoft.design/design-principles)도 익숙한 사용법을 유지하면서 적응성, 포용성과 표현력을 확보하도록 안내한다. 따라서 2026년의 표현적 UI는 일관성을 포기한 자유 형식보다 token과 구성요소 규칙 안에서 화면의 성격을 드러내는 방향으로 읽어야 한다.

### 반투명 재질은 콘텐츠보다 제어 영역을 구분한다

[Apple의 Materials 지침](https://developer.apple.com/design/human-interface-guidelines/materials)은 Liquid Glass를 콘텐츠 위에 놓이는 탐색과 제어 계층에 사용하고, 콘텐츠 자체의 배경처럼 반복하지 않도록 안내한다. 내용이 읽혀야 하는 경우에는 가독성이 높은 변형을 사용하고, 투명도 감소나 대비 증가 같은 사용자 설정에도 적응해야 한다. [Apple의 Liquid Glass 개요](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass)와 [WWDC26 디자인 안내](https://developer.apple.com/wwdc26/guides/design/)도 재질 자체보다 기기 간 적응, 읽기 쉬움과 접근성을 강조한다.

웹에서는 이를 CSS 효과의 유행으로만 해석하면 안 된다. 흐린 배경, 반사광과 반투명 테두리가 작업 내용을 가리거나 모든 카드에 반복되면 어느 요소가 제어이고 어느 요소가 콘텐츠인지 구분하기 어려워진다. 반투명 효과를 쓰더라도 일시적 도구, 탐색이나 선택 제어처럼 콘텐츠와 분리해야 할 영역으로 제한해야 한다.

### 고유한 시각 언어와 사람이 다듬은 세부가 차별점이 된다

[Webflow의 2026 웹 디자인 전망](https://webflow.com/blog/web-design-trends-2026)은 독자적인 시각 체계, 과감한 색 체계, 동적인 글자, 안내형 스크롤과 무한 공간 같은 흐름을 제시하면서 알고리즘이 만든 화면의 유사성에서 벗어나는 사람의 제작 감각을 강조한다. [Adobe의 2026 Creative Trends](https://business.adobe.com/resources/creative-trends-report.html)는 진정성, 여러 감각을 연상시키는 세부, 놀이성과 지역적 제작 문화를 주요 방향으로 든다.

두 자료는 제작사 관점의 연간 전망이므로 애플리케이션 UI의 직접 근거로 쓰기에는 제한이 있다. 다만 생성 도구의 기본 조합을 그대로 쓰는 대신 애플리케이션의 작업 방식에서 나온 시각 규칙을 만들어야 한다는 신호로는 서로 일치한다.

### 테마와 적응성은 사후 보정이 아니라 토큰 구조에서 시작한다

[Atlassian design token 지침](https://atlassian.design/foundations/tokens/design-tokens/)은 색, 간격, 글자와 높낮이를 용도에 따라 이름 붙이고 밝은 테마, 어두운 테마와 고대비 환경을 같은 의미 역할로 연결한다. [Fluent 2 design token](https://fluent2.microsoft.design/design-tokens)과 [Adobe Spectrum 테마 지침](https://spectrum.adobe.com/page/theming/)도 개별 색상값을 화면에 직접 고정하기보다 의미가 있는 변수를 통해 여러 환경에 적응하게 한다.

따라서 2026년의 테마 설계는 어두운 배경에서 색을 반전하는 처리로 끝나지 않는다. 기본, hover, pressed, selected, focus, disabled, 오류와 성공 상태는 각 테마와 시스템의 대비 설정에서도 같은 역할을 유지해야 한다.

## 구성요소의 말단에서 확인할 특징

### 글자와 문구

글자는 장식이 아니라 정보의 우선순위와 사용자가 한 조작 뒤 무엇이 달라졌는지를 설명해야 한다. [Fluent 2 typography](https://fluent2.microsoft.design/typography)는 의미에 따른 type ramp, 운영체제에 맞는 글꼴, sentence case와 충분한 대비를 함께 다룬다. Material 3 Expressive는 크기, 굵기와 폭의 차이를 더 적극적으로 사용하지만, 본문까지 모두 과장하는 방식은 아니다.

세부 검토 항목은 다음과 같다.

- 페이지 제목, 구획 제목, 메모 원문, 보조 정보와 상태 문구의 단계가 크기만이 아니라 굵기, 행간과 배치에서도 구분되는가
- 메모 원문은 긴 문장, 한 글자짜리 줄, URL 형식 문자열, 한글과 영문 혼합, 숫자 및 기호에서도 행 높이가 흔들리지 않는가
- 글자 간격을 과하게 벌린 대문자 label처럼 읽기보다 분위기를 위한 표기를 반복하지 않는가
- 버튼은 `확인`, `계속` 같은 모호한 말보다 `메모 저장`, `누적 텍스트 복사`처럼 결과를 예측할 수 있는가
- 생략 부호를 사용한 텍스트가 hover나 focus 없이도 전체 내용을 확인할 수 있는가
- 숫자 횟수는 일반 복사, 누적과 합계의 label에 연결되고 자릿수가 달라져도 비교하기 쉬운가
- placeholder를 label 대신 쓰지 않고 입력 전, 입력 중, 오류, 자동 완성과 읽기 전용 상태를 구분하는가

개인 메모 화면에서는 메모 원문이 가장 오래 읽히므로 개성 있는 display typeface보다 본문 가독성을 먼저 검증해야 한다. 시각적 성격은 페이지 제목과 빈 화면 문구처럼 짧은 영역에 제한해 시험할 수 있다.

### 색과 테마

2026년의 강한 색 사용은 많은 색을 동시에 쓰는 것보다 의미 역할이 분명한 색 체계를 뜻한다. [Fluent 2 color](https://fluent2.microsoft.design/color)는 neutral, shared, brand 역할을 나누고 accent를 제한적으로 사용하며, 상태를 색만으로 전달하지 않도록 한다. [Adobe Spectrum color system](https://spectrum.adobe.com/page/color-system/)도 배경, 텍스트, 아이콘, 구분선과 상호작용 상태를 semantic color로 연결한다.

세부 검토 항목은 다음과 같다.

- 배경, 메모, 선택된 메모, 편집 중인 메모와 비활성 메모의 차이가 색 하나에만 의존하지 않는가
- brand color가 주요 동작, 링크, focus, 선택과 정보 상태에 무분별하게 재사용되어 의미가 충돌하지 않는가
- 성공, 경고와 오류 색에는 아이콘이나 문구가 함께 있는가
- hover와 pressed가 단순히 불투명도만 낮춰 대비를 잃지 않는가
- 밝은 테마의 색을 수학적으로 반전해 어두운 테마를 만들지 않고, 각 배경에서 필요한 대비와 눈부심을 다시 확인하는가
- 메모 색을 제공한다면 색이 분류 의미인지 개인 장식인지 명시하고, 색 이름 또는 다른 식별 수단을 함께 제공하는가
- 분석 결과의 유사도 연속값을 무지개색으로 표현하기 전에 실제 비교 질문과 임계값이 정해졌는가

### 배경층, 투명도와 높낮이

깊이는 무엇이 무엇 위에 있고 지금 어느 영역을 조작하는지 알려야 한다. [Fluent 2 elevation](https://fluent2.microsoft.design/elevation)은 shadow와 배경 차이를 함께 사용해 계층과 상호작용을 설명한다. Apple의 Materials 지침은 반투명 재질을 탐색과 제어에 제한하고, 재질이 겹겹이 쌓이는 상황을 피하도록 한다.

세부 검토 항목은 다음과 같다.

- 기본 메모, hover, 선택, drag 중, 편집 중과 다른 요소 위로 이동한 상태의 높낮이가 서로 구분되는가
- 모든 카드에 같은 shadow를 붙여 어느 요소가 실제로 떠 있는지 알 수 없게 만들지 않는가
- sticky header, popover, dialog, toast와 drag preview의 z-index 순서가 문서화되어 있는가
- 반투명 영역 아래의 메모 색과 글자 때문에 제어 label의 대비가 달라지지 않는가
- 브라우저가 `backdrop-filter`를 제공하지 않거나 투명도 감소 설정이 켜져도 불투명 배경에서 같은 내용을 읽고 조작할 수 있는가
- 배경 질감, noise, grid와 glow가 메모 원문, 선택선과 resize handle을 방해하지 않는가

### 형태, 모서리, 테두리와 구분선

대비되는 형태는 구성요소의 역할을 빠르게 구분할 때 효과가 있다. Material 3 Expressive는 여러 shape와 shape morphing을 제공하지만, 모든 요소에 다른 모양을 쓰라는 지침은 아니다. 모서리 수치는 구성요소의 크기, 밀도와 상호작용 역할에 따라 정해야 한다.

세부 검토 항목은 다음과 같다.

- note, panel, button, text field와 badge가 모두 같은 큰 radius를 가져 역할 차이가 사라지지 않는가
- 짧은 상태 label이 pill이어야 하는 이유가 있는지, 일반 문구나 badge로 충분한지 검토했는가
- outline button, input, 카드와 선택 테두리가 같은 굵기와 색으로 겹쳐 보이지 않는가
- 1 CSS 픽셀 구분선이 화면 배율과 어두운 테마에서도 보이는가
- focus ring이 선택 테두리나 오류 테두리에 가려지지 않는가
- resize handle의 보이는 크기와 실제 pointer target 크기를 따로 확보했는가
- 모서리가 잘린 메모, 접힌 종이 모양이나 테이프 같은 비유를 쓰면 장식이 기능으로 오해되지 않는가

### 간격, 밀도와 정렬

[Fluent 2 layout](https://fluent2.microsoft.design/layout)은 4픽셀 기반 spacing ramp를 쓰고, 간격 자체가 어느 요소끼리 한 묶음인지를 전달하도록 안내한다. 중요한 것은 모든 간격을 넓히는 일이 아니라 함께 작동하는 항목은 가깝게, 다른 구획은 더 멀리 두는 리듬이다.

세부 검토 항목은 다음과 같다.

- 메모 원문과 편집 버튼, 이동 손잡이, resize handle의 간격이 클릭 대상 충돌을 막는가
- 분석과 빈도 화면이 홍보 페이지처럼 넓은 여백을 반복해 비교 가능한 행 수를 줄이지 않는가
- label과 값, 오류 문구, 도움말의 수직 간격이 소속 관계를 드러내는가
- 아이콘과 글자 기준선이 시각적으로 맞고, 아이콘의 bounding box만 수학적으로 가운데에 두지 않았는가
- panel을 접거나 번역문이 길어져도 정렬 기준이 유지되는가
- 공간형 보드의 grid는 배치 보조인지 장식인지 구분되고 zoom 단계마다 지나치게 촘촘해지지 않는가

### 탐색, 상단 영역과 보조 panel

탐색은 현재 위치와 사용자가 수행할 수 있는 동작을 알려야 한다. 현재 로컬 애플리케이션에는 계정 관리와 동기화를 disabled 항목으로 남기지 않고 route와 함께 제공하지 않는다는 요구를 유지한다.

세부 검토 항목은 다음과 같다.

- 현재 페이지는 색뿐 아니라 글자 굵기, indicator 또는 `aria-current`로 식별되는가
- 탐색을 접었을 때 아이콘만 남는다면 이름을 tooltip과 접근 가능한 label로 확인할 수 있는가
- 상단 영역의 주요 동작이 페이지마다 같은 위치에 있고, 보조 동작이 더 강하게 보이지 않는가
- sticky 영역이 확대 화면이나 키보드 focus 대상을 가리지 않는가
- inspector를 열었을 때 보드 viewport가 단순히 가려지는지, 사용 가능한 폭에 맞춰 다시 계산되는지 정했는가
- popover와 context menu가 viewport 밖으로 잘리거나 선택한 메모를 완전히 덮지 않는가
- 작은 화면 목록에서 넓은 화면의 탐색을 축소한 아이콘 줄로 강제하지 않고 사용 빈도에 맞는 탐색 방식을 선택했는가

### 버튼과 icon button

[Fluent 2 button 지침](https://fluent2.microsoft.design/components/web/react/core/button/usage)은 한 영역에서 primary button을 하나만 두고, 보조 동작은 시각적 강도를 낮추며, 동작을 구체적으로 설명하는 label을 쓰도록 한다. disabled 상태에는 사용할 수 없는 이유를 사용자가 알 수 있는 수단도 필요하다.

세부 검토 항목은 다음과 같다.

- 일반, hover, pressed, focus-visible, disabled와 실행 중 상태가 모두 정의되어 있는가
- icon-only button은 보편적으로 이해되는 동작인지 검토하고 접근 가능한 이름과 tooltip을 제공하는가
- destructive action은 색만 다른 primary button처럼 보이지 않고 대상과 결과를 확인할 수 있는가
- 비동기 실행 중 버튼 폭이 spinner 때문에 바뀌지 않고 중복 실행을 막는가
- 버튼 전체와 내부 아이콘이 서로 다른 click handler를 가져 두 동작이 실행되지 않는가
- 화면에 항상 보이는 `누적` 대체 버튼과 일반 `복사` 버튼의 명칭, 위치와 상태가 혼동되지 않는가

### 입력, 편집과 선택

메모 본문 일반 클릭은 복사이고 편집 상태에서는 caret 이동과 텍스트 선택이므로, 상태 전환이 시각적으로 분명해야 한다. 입력 구성요소의 기본 모양만으로 두 상태를 구분할 수 없다.

세부 검토 항목은 다음과 같다.

- 메모가 선택만 된 상태와 편집 중인 상태가 테두리, handle, toolbar와 caret 유무로 구분되는가
- 현재 로컬 저장 상태를 사실대로 설명하고, 최우선 계정 및 동기화 백로그에서 추가할 동기화 대기와 충돌 상태를 한 단어 `저장됨`으로 합치지 않는가
- 붙여넣은 여러 줄, 탭, 선행 및 후행 공백과 매우 긴 단어가 원문 보존 규칙에 맞게 보이는가
- IME 조합 중 `Enter`를 편집 완료나 단축키로 잘못 처리하지 않는가
- validation은 제출 뒤 한꺼번에 나타나는 것과 입력 중 즉시 나타나는 것 중 어느 쪽이 수정에 도움이 되는지 필드별로 정했는가
- placeholder 편집기는 literal과 placeholder를 색만으로 구분하지 않고 이름, 구획 또는 표식으로도 구분하는가
- 읽기 전용 값이 disabled input처럼 낮은 대비로 보이지 않는가

### 아이콘, badge, avatar와 숫자 표시

아이콘은 글자를 대신하는 장식이 아니라 동작 또는 상태를 일관되게 나타내야 한다. 서로 다른 라이브러리의 stroke 두께와 viewBox를 섞으면 화면 전체의 조형 언어가 흔들린다.

세부 검토 항목은 다음과 같다.

- 같은 동작에 페이지마다 다른 아이콘을 쓰거나 같은 아이콘을 다른 동작에 재사용하지 않는가
- 아이콘의 filled 또는 outlined 변형이 selected 상태와 의미 있게 연결되는가
- badge가 새 항목, 개수, 상태, beta 표기를 모두 같은 모양으로 표현하지 않는가
- 두 자리 이상 개수, 999를 넘는 값과 0일 때 너비 및 읽는 순서가 정해졌는가
- 최우선 계정 및 동기화 백로그에서 avatar가 없을 때 initials, 기본 이미지와 계정 메뉴 trigger를 어떻게 구분할지 정했는가
- 장식 아이콘은 보조기술에서 제외하고, 상태 아이콘은 문구와 연결되는가

### hover, focus, pressed, selected, disabled 상태

상태는 색상 variation 몇 개로 끝나지 않는다. pointer, 키보드와 touch가 같은 구성요소에 접근해도 동작과 피드백이 이어져야 한다.

세부 검토 항목은 다음과 같다.

- 복사, 누적과 편집 버튼이 hover 없이도 보이고 키보드 focus와 touch에서도 같은 기능을 찾을 수 있는가
- focus-visible 표시가 shadow, selected outline이나 overflow clipping에 가려지지 않는가
- pressed는 pointer를 누르는 동안의 상태이고 selected는 지속 상태라는 차이가 보이는가
- disabled control을 focus 순서에서 뺄지, 읽기 전용 설명과 함께 둘지 상황별로 정했는가
- drag 중 원래 항목, preview, 놓을 수 있는 위치와 놓을 수 없는 위치가 각각 구분되는가
- modifier key를 누른 상태가 화면에 표시되고 설정에서 바꾼 조합과 실제 안내 문구가 일치하는가

### loading, progress, empty, error, success와 상태 알림

기본 화면만 완성된 UI는 실제 애플리케이션의 대부분을 설명하지 못한다. 현재 범위의 로컬 분석과 클립보드는 기다림과 실패가 정상 흐름에 포함된다. 동기화 상태는 최우선 계정 및 동기화 백로그에서 같은 기준으로 검토한다.

세부 검토 항목은 다음과 같다.

- 짧은 대기에는 기존 내용을 유지하고, 긴 작업에는 실제 단계를 알 수 있는 progress를 제공하는가
- skeleton이 최종 레이아웃과 다른 가짜 카드 수를 보여줘 화면 이동을 만들지 않는가
- 빈 화면은 데이터가 아직 없음, 검색 결과 없음, filter 때문에 없음과 권한 또는 오류로 읽지 못함을 구분하는가
- 오류에는 실패한 대상, 보존된 데이터, 다시 시도할 동작과 사용자가 바꿀 수 없는 조건을 구분해 설명하는가
- 성공 toast가 유일한 기록이라 너무 빨리 사라지는지, 중요한 결과는 화면 상태에도 남는지 검토했는가
- 연속 복사 성공을 toast 여러 개로 쌓지 않고 같은 상태 영역을 갱신하는가
- 분석이 중단되면 이전 결과를 유지할지 비울지, 결과의 algorithm version과 완료 시점을 어떻게 보여줄지 정했는가

[WAI-ARIA status 역할](https://www.w3.org/TR/wai-aria-1.2/#status)과 [WCAG 2.2 status message 해설](https://www.w3.org/WAI/WCAG22/Understanding/status-messages)은 focus를 옮기지 않고도 상태 변화를 보조기술에 알리는 방법을 설명한다. 시각적 toast만 추가해서는 이 조건을 충족하지 못한다.

### drag, drop과 크기 변경

drag 동작은 시작, 이동 가능 범위, drop 대상, 취소와 결과를 연속적으로 보여줘야 한다. 메모 이동과 누적 항목 순서 변경은 비슷해 보여도 좌표 저장과 목록 순서 변경이라는 다른 결과를 낸다.

세부 검토 항목은 다음과 같다.

- 이동 가능한 영역과 본문 복사 영역, 텍스트 선택 영역이 pointer cursor와 handle로 구분되는가
- drag threshold가 미세한 pointer 흔들림을 이동으로 오인하지 않는가
- 보드 가장자리 자동 pan의 시작 범위와 속도가 예측 가능한가
- 누적 항목을 목록 밖으로 이동할 때 삭제 예정 상태와 취소 가능 범위를 보여주는가
- 잘못 제거한 뒤 undo, redo 상태와 복원 위치가 분명한가
- touch에서 long press가 브라우저 텍스트 선택이나 context menu와 충돌하지 않는가
- resize 중 최소 및 최대 크기, aspect ratio 적용 여부와 실제 크기 값을 확인할 방법이 있는가

[WCAG 2.2 dragging movements 해설](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)은 drag가 필요한 기능에 drag 없는 단일 pointer 대안을 요구한다. 목록 이동 버튼, 제거 버튼과 위치 및 크기 입력 같은 대안은 장식적 보조 기능이 아니라 동일한 결과를 내야 한다.

### 모션과 전환

[Fluent 2 motion](https://fluent2.microsoft.design/motion)은 움직임이 조작을 설명하고 자연스러우며 일관되어야 한다고 안내한다. [Adobe Spectrum motion](https://spectrum.adobe.com/page/motion/)도 상태 변화의 원인과 결과, 공간 관계와 focus를 설명하는 데 모션을 사용한다. 2026년의 spring과 shape morphing 흐름도 이 목적을 벗어나면 장식에 그친다.

세부 검토 항목은 다음과 같다.

- 메모를 추가한 위치, 누적 순서 변경, undo 복원과 panel 열림이 어디서 왔고 어디로 갔는지 보여주는가
- 복사할 때 메모 전체가 튀거나 흔들려 읽기와 연속 클릭을 방해하지 않는가
- 같은 거리 이동에 구성요소마다 다른 easing과 duration을 무작위로 쓰지 않는가
- layout animation이 메모 좌표를 보간하면서 저장 좌표와 화면 좌표를 혼동하지 않는가
- loading spinner, skeleton shimmer, blur transition과 배경 애니메이션을 동시에 사용하지 않는가
- `prefers-reduced-motion`에서는 기능을 유지하며 큰 이동, zoom과 반복 모션을 줄이거나 즉시 전환하는가

### 반응형 화면, touch와 입력 장치

[GitHub Primer foundations](https://primer.style/product/getting-started/foundations/)는 화면 크기와 사용자 환경에 적응하는 인터페이스를 기반 원칙으로 둔다. 반응형 디자인은 데스크톱 열을 한 줄로 쌓는 CSS 처리에 그치지 않고, mouse가 없는 기기에서 hover 동작을 button으로 바꾸는 것처럼 입력 장치에 맞춰 조작법을 바꾸는 일까지 포함한다.

세부 검토 항목은 다음과 같다.

- 작은 화면 목록은 보드의 축소판이 아니라 메모 읽기, 작성, 복사와 누적을 수행할 독립된 흐름인가
- 화면 너비 전환 때 저장된 메모 위치와 크기를 변경하지 않고 표시 방식만 바꾸는가
- hover, right click, modifier key와 정밀 resize에 의존하는 기능을 touch에서 별도 control로 제공하는가
- 가로 및 세로 방향 전환, browser zoom, 화면 분할과 virtual keyboard에서 주요 동작이 가려지지 않는가
- safe area와 browser toolbar 높이를 고정 viewport 값으로 오인하지 않는가
- pointer가 정밀한 환경과 touch 환경에서 실제 target 크기와 간격을 각각 검증하는가

### 접근성, 사용자 설정과 국제화

접근성은 시각 디자인이 끝난 뒤 색 대비만 검사하는 단계가 아니다. [WCAG 2.2에서 추가된 기준](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)에는 focus가 다른 UI에 가려지지 않게 하는 조건, dragging 대안과 target size가 포함된다. [WCAG focus appearance 해설](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance)은 focus 표시의 면적과 인접 색 대비를 구체적으로 설명한다. [Adobe Spectrum 국제화 지침](https://spectrum.adobe.com/page/international-design/)은 번역 길이, 양방향 문자와 다양한 문자 체계를 처음부터 고려하도록 안내한다.

세부 검토 항목은 다음과 같다.

- keyboard만으로 메모 선택, 편집, 이동, 크기 변경, 누적, undo와 redo에 도달할 수 있는가
- focus 순서가 자유 배치 좌표, 생성 순서와 사용자가 기대하는 읽기 순서 가운데 무엇을 따르는지 정했는가
- 200% 및 400% 확대에서 sticky 영역이 focus 대상을 가리지 않고, 이차원 보드 밖의 기본 기능은 reflow되는가
- 색 대비, 투명도 감소, 모션 감소, forced colors와 고대비 환경에서 상태가 유지되는가
- 한글 IME, 조합 문자, 줄바꿈, CJK 줄바꿈 규칙과 오른쪽에서 왼쪽으로 쓰는 문자를 데이터와 화면에서 손상하지 않는가
- 글자 크기 확대와 긴 번역에서 button label, badge와 inspector가 잘리거나 icon-only로 바뀌지 않는가
- 사용 빈도와 유사도 수치에 화면 읽기 프로그램이 이해할 수 있는 이름, 단위와 비교 순서가 있는가

## AI가 양산하기 쉬운 UI의 근거

### 도구에 설계 맥락을 주지 않으면 범용 기본값으로 돌아간다

[v0의 Design Systems 2.0 문서](https://v0.app/docs/design-systems-2)는 새 대화가 shadcn/ui와 Tailwind CSS를 쓰는 Next.js 애플리케이션으로 시작하며, 팀의 구성요소와 token을 적용하려면 실제 source, 사용 규칙과 검증된 starter를 design system skill에 제공하도록 안내한다. [Figma Make kit 안내](https://help.figma.com/hc/en-us/articles/39241689698839-Get-started-with-Make-kits)는 패키지, style, token과 사용 지침을 kit에 포함하도록 하고, [Figma AI가 design system을 이해하게 하는 방법](https://help.figma.com/hc/en-us/articles/38978644498199-AI-workflows-collection-Best-practices-to-help-Figma-AI-understand-your-design-system)은 의미 있는 이름, auto layout, variant, variable, 설명과 상위 수준 block을 권장한다. [Figma의 prototype 변환 안내](https://help.figma.com/hc/en-us/articles/41159751397783-AI-workflows-collection-Bonus-Turn-designs-into-prototypes-and-prototypes-into-designs)는 Make kit가 없으면 범용 web default를 사용한다고 명시한다.

따라서 AI 화면의 반복성은 모델의 미적 취향만으로 생기지 않는다. 고유한 구성요소, token, 실제 콘텐츠와 사용 규칙이 입력에 없을 때 여러 사용자가 같은 기본 라이브러리와 관습적 레이아웃을 받는 구조에서도 생긴다.

### AI로 개별 안이 좋아져도 결과 집합의 다양성은 줄 수 있다

[ACM에 발표된 36명 대상 연구](https://scholarcommons.scu.edu/cseng/87/)에서는 ChatGPT를 사용한 참가자들이 사용자 사이에서 의미적으로 덜 다양한 아이디어를 냈다. [UC Berkeley의 2025년 설계 개념 비교 연구](https://codesign.berkeley.edu/papers/ma-llmdiverse-JCISE/)는 여러 설계 문제에서 LLM이 만든 해법과 사람이 만든 해법을 대규모로 비교했고 사람의 결과가 일관되게 더 다양하다고 보고했다. [Science Advances의 생성형 AI와 창작 연구](https://pmc.ncbi.nlm.nih.gov/articles/PMC11244532/)도 개인 결과의 평가가 높아질 수 있는 한편 결과 집합의 다양성이 낮아질 수 있음을 관찰했다.

이 연구들은 완성된 웹 UI만을 대상으로 하지 않으므로 특정 radius나 색이 AI의 증거라고 말해주지는 않는다. 첫 생성안을 그대로 채택할 때 서로 다른 서비스가 비슷한 해결책으로 모일 수 있다는 위험을 뒷받침하는 근거로 사용한다.

### 화면 생성은 세부 스타일과 상태를 빠뜨릴 수 있다

[Design2Code 평가](https://arxiv.org/abs/2403.03163)는 실제 웹 화면 484개를 사용해 이미지에서 코드를 만드는 모델을 비교했고, 시각 요소 재현과 레이아웃 정확도에서 한계를 확인했다. [Divide-and-Conquer 연구](https://arxiv.org/abs/2406.16386)는 요소 누락, 왜곡과 잘못된 배치를 주요 오류로 분류하고 화면을 작고 집중된 구획으로 나눠 생성하는 방법을 제안했다. [DesignCoder 연구](https://arxiv.org/abs/2506.13663)는 글자, 간격, 색과 시각적 단계 같은 세부를 반복적으로 render하고 비교해 보정하는 방법을 다룬다.

따라서 첫눈에 그럴듯한 기본 화면이 나와도 hover, focus, loading, error, 긴 텍스트, 좁은 화면과 키보드 흐름이 함께 완성됐다고 가정하면 안 된다.

## 양산형 UI를 의심할 점검 징후

다음 항목은 AI가 만들었다고 판정하는 기준이 아니다. 공식 도구의 기본값 의존과 다양성 연구에서 예상할 수 있는 위험을 화면 검토용 질문으로 바꾼 것이다. 사람이 만든 화면에도 나타날 수 있고, 명확한 이유가 있다면 일부를 사용해도 된다.

### 정보 구조보다 카드 모양이 먼저 보인다

- 페이지 안의 탐색, 통계, form, 설명과 빈 화면을 모두 흰색 또는 반투명 rounded card로 감쌌는가
- 같은 계층이 아닌 항목이 같은 padding, radius와 shadow를 가져 무엇이 함께 작동하는지 알기 어려운가
- 사용 빈도와 겹침 비교처럼 행 단위 밀도가 필요한 화면을 큰 dashboard card 격자로 만들었는가
- 내용을 구분할 다른 수단이 있는데도 card 안에 card를 반복했는가

### 기본 token 조합을 고유한 시각 언어로 오해한다

- neutral 배경, 한 가지 accent, 큰 radius, 얕은 shadow와 system sans-serif의 조합만 있고 이 애플리케이션의 작업 방식에서 나온 규칙은 없는가
- 모든 button과 badge를 pill로 만들어 동작, filter, 상태와 선택의 차이를 없앴는가
- 흔한 outline icon을 일괄 배치했지만 icon을 지워도 정보 구조가 바뀌지 않는가
- 밝은 테마에 어두운 테마를 자동 생성했으나 메모 색, focus와 분석 상태의 의미가 유지되는지 검증하지 않았는가

### 장식용 gradient, glow와 glass가 내용을 대신한다

- 보라색이나 청록색 glow, mesh gradient 또는 움직이는 배경을 애플리케이션의 성격을 정하는 유일한 장치로 사용했는가
- 모든 panel에 blur와 투명도를 넣어 배경에 따라 대비가 계속 달라지는가
- 유리 효과를 썼지만 실제로는 콘텐츠와 제어의 계층을 설명하지 못하는가
- 밝은 원형 blob, noise와 grid가 빈 공간을 채울 뿐 실제 배치, 선택이나 진행 상태와 관계없는가

### 리듬이 지나치게 균일하고 정보 우선순위가 얕다

- 모든 구획에 같은 상하 여백, 같은 제목 크기와 같은 3열 grid를 적용했는가
- 실제 작업 화면인데 홍보용 hero처럼 큰 중앙 제목과 설명, 두 개의 CTA로 시작하는가
- 작은 pill label, gradient가 들어간 큰 제목, 두 개의 CTA, logo cloud와 화면 mockup을 서비스 내용과 무관하게 한 묶음으로 반복했는가
- 관계가 다른 기능, 수치와 후기를 bento grid에 채워 넣고 box 크기 차이를 정보 우선순위처럼 사용했는가
- 긴 설명을 삭제하고 짧은 slogan만 남겨 사용자가 현재 상태와 결과를 이해할 수 없는가
- 화면의 각 구획이 독립된 demo처럼 보이고 하나의 작업 흐름으로 이어지지 않는가

### 의미 없는 데이터와 문구가 완성도를 가장한다

- 사용자가 묻지 않은 KPI, 원형 progress, 추세 chart와 최근 활동을 dashboard 관습 때문에 추가했는가
- 실제 집계 정의 없이 증가율, 점수, 등급과 색상 임계값을 보여주는가
- `Get started`, `Learn more`, `Boost productivity` 같은 범용 문구가 구체적인 동작과 결과를 대신하는가
- lorem ipsum 또는 짧고 균일한 예제만 사용해 긴 한국어 메모, 빈 줄과 특수문자에서 레이아웃이 깨지는지 숨기는가

### 기본 상태와 성공 흐름만 있다

- hover 화면은 있지만 keyboard focus, touch, pressed와 disabled 상태는 없는가
- loading은 spinner 하나, 오류는 붉은 toast 하나로 끝나며 데이터 보존과 복구 동작이 없는가
- 현재 범위의 빈 화면, 부분 데이터, offline과 클립보드 거부 상태가 누락되지 않았는가
- 최우선 계정 및 동기화 백로그에서는 동기화 충돌 상태도 확인하는가
- drag preview는 있지만 놓을 수 없는 영역, 취소, undo와 drag 없는 대안이 없는가
- 작은 화면은 넓은 화면의 card를 한 열로 쌓을 뿐 modifier key, hover와 공간형 resize를 대체하지 못하는가

### 구성요소가 재생성될 때 규칙이 흔들린다

- 같은 primary action이 페이지마다 색, 위치, 아이콘과 문구가 달라지는가
- prompt를 수정할 때 승인된 구성요소까지 다른 library 모양으로 바뀌는가
- 최우선 계정 및 동기화 백로그에서 공통 화면이 기능 차이와 무관하게 간격, 탐색과 상태 표현까지 달라지는가
- 디자인 파일, 코드와 문서에서 token 이름과 의미가 서로 맞지 않는가

## 양산형 UI를 막는 작업 방식

### 생성 전에 이 애플리케이션의 시각 전제를 정한다

먼저 `현대적`, `세련된`, `미니멀` 같은 형용사 대신 화면에서 확인할 수 있는 전제를 승인해야 한다. 예를 들면 메모 원문이 가장 강하게 보이고, 넓은 화면에서는 위치 관계를 유지하며, 분석 화면은 많은 행을 비교하기 쉽고, 작은 화면에서는 목록이 독립적으로 완전하게 작동한다는 식이다.

다음 자료를 생성 입력과 검토자가 함께 사용해야 한다.

- 실제 사용자 작업 흐름과 각 단계에서 가장 중요한 대상 및 동작
- 짧은 메모, 여러 줄, 매우 긴 문장, URL 형식 문자열, 빈 메모와 한글 IME를 포함한 대표 콘텐츠
- 제공하는 기능과 제공하지 않는 기능, 특히 링크 자동 변환을 하지 않는다는 승인 사항
- 현재 로컬 애플리케이션에서 제공하는 route와 상태, 최우선 계정 및 동기화 백로그에서 나중에 추가할 차이
- 사용해야 할 구성요소와 피해야 할 장식의 이유
- 참고 화면에서 가져올 원칙과 그대로 복제하지 않을 요소

### 고유한 token과 상위 수준 구성요소를 제공한다

색상 hex 값이나 `rounded-lg` 같은 구현값만 나열하지 않는다. `text.primary`, `note.selected.border`, `analysis.exact.background`, `focus.ring`처럼 역할을 드러내고 각 테마에서 값을 연결한다. 이름은 실제 업무 개념을 사용하되 특정 화면 한 곳에만 맞춘 token이 늘어나지 않게 검토한다.

AI 도구에는 button과 input만 주는 대신 다음처럼 이 애플리케이션의 작업 단위를 제공하는 편이 낫다.

- 읽기, 선택, 편집, drag와 resize 상태를 포함한 note
- 일반 복사와 누적 결과를 알리는 clipboard status
- drag 대체 버튼과 undo 상태를 포함한 accumulated item
- 두 원문 줄, 관계 유형과 원본 이동 동작을 포함한 analysis result
- 현재 범위의 local only와 error를 구분하고, 최우선 계정 및 동기화 백로그에서 sync pending과 conflict를 추가할 수 있는 persistence status

Figma에서는 이름, auto layout, variant, variable과 설명을 정리한 library 또는 Make kit를 제공하고, 코드 생성 도구에는 승인된 registry와 사용 예시를 제공해야 한다. 이 자료가 없으면 생성 결과를 디자인 시스템 준수 결과로 취급하지 않는다.

### 첫 결과를 다듬기 전에 서로 다른 방향을 비교한다

[Google Stitch 소개](https://developers.googleblog.com/en/stitch-a-new-way-to-design-uis/)는 prompt와 이미지 입력에서 여러 화면 variation을 만들고 theme를 바꾸는 흐름을 제공한다. 하지만 색과 font만 바꾼 variation은 구조적 다양성이 아니다.

방향별 차이를 다음처럼 명시해야 한다.

- 메모 자체를 종이에 가깝게 표현할지, 작업 공간의 중립적 객체로 표현할지
- 제어 UI를 항상 보일지, 선택과 focus에 따라 드러낼지
- 분석 화면을 비교 중심 행 목록으로 둘지, 관계 묶음 중심으로 둘지
- 넓은 화면에서 navigation, inspector와 board가 차지하는 비율
- 작은 화면 목록에서 복사, 누적과 편집 control을 읽기 흐름을 가리지 않게 배치할 방법

각 방향은 같은 실제 콘텐츠와 상태 목록으로 비교한다. 하나를 승인하기 전에는 여러 생성 결과의 장점을 임의로 섞지 않는다.

### 화면을 작업 단위로 나누되 전체 흐름에서 다시 검증한다

화면 전체를 한 번에 생성하면 요소가 누락되거나 잘못 배치될 수 있다는 연구 결과에 따라 다음 순서를 검토한다.

1. 탐색과 현재 페이지 상태를 확정한다.
2. 주 작업 영역의 정보 우선순위와 기본 상호작용을 확정한다.
3. note, accumulated item, analysis result처럼 반복되는 작업 단위를 상태별로 만든다.
4. popover, dialog, toast와 drag preview가 겹치는 규칙을 검증한다.
5. 실제 페이지에서 구성요소를 다시 조합하고 전체 keyboard 및 pointer 흐름을 확인한다.

구획별 생성은 서로 다른 디자인을 붙이는 일이 아니다. 같은 token, 글자 단계, 간격 규칙과 상태 이름을 공유해야 한다.

### 모든 구성요소에 상태 및 콘텐츠 행렬을 적용한다

최소한 다음 차원을 조합해 캡처한다.

- 기본, hover, focus-visible, pressed, selected, editing, disabled와 loading
- 현재 범위의 성공, 오류, offline과 permission denied, 최우선 계정 및 동기화 백로그의 sync pending과 conflict
- 비어 있음, 한 줄, 여러 줄, 매우 긴 내용, 혼합 문자와 최대 개수
- 밝은 테마, 어두운 테마, 고대비, 모션 감소와 투명도 감소
- 넓은 board, 좁은 desktop window, tablet과 mobile list
- mouse, keyboard, touch와 화면 읽기 프로그램의 주요 흐름

모든 조합을 별도 디자인으로 만들 필요는 없지만, 누락된 조합이 어떤 공통 규칙으로 처리되는지 설명할 수 있어야 한다.

### render 결과를 반복 비교한다

생성된 코드나 디자인의 구성요소 이름이 맞는지만 확인하지 않는다. 고정된 대표 콘텐츠와 viewport로 실제 render를 남기고 다음을 비교한다.

- 글자 줄바꿈, baseline, 잘림과 layout shift
- token별 실제 계산 색, 대비, shadow와 transparency fallback
- 100%, 200%와 400% 확대 및 browser font size 변경
- keyboard focus 순서와 focus가 가려지는지 여부
- pointer target, drag threshold와 drag 없는 대안의 결과
- 현재 로컬 애플리케이션에 계정 기능과 route가 실제로 존재하지 않는지 여부
- AI가 이전 검토에서 승인한 시각 규칙을 다시 바꾸지 않았는지 여부

차이는 screenshot 한 장의 유사도만으로 승인하지 않는다. 인터랙션 상태, 접근 가능한 이름과 저장되는 결과도 함께 확인한다.

### 사람의 검토에서 불필요한 기본값을 제거한다

검토자는 `더 예쁘게`가 아니라 다음 질문으로 수정 범위를 정한다.

- 이 card, radius, shadow, gradient, blur와 animation이 정보 관계 또는 동작 결과를 설명하는가
- 이 요소를 제거하면 기능 이해가 나빠지는가, 아니면 기본 template의 흔적만 줄어드는가
- 같은 역할이 다른 페이지에서 같은 모양과 문구를 사용하는가
- 시각적 차이가 실제 의미 차이를 나타내는가
- 실제 메모와 사용 빈도 데이터로도 밀도와 우선순위가 맞는가
- 이 애플리케이션에서만 나올 수 있는 작업 방식이 화면에 드러나는가

## 개인 메모 애플리케이션에 적용할 후보

다음은 조사 결과를 현재 요구사항에 연결한 제안이며 승인된 시각 설계가 아니다.

- 넓은 화면의 첫인상은 dashboard가 아니라 메모를 직접 다루는 작업 공간이어야 한다. 메모 원문과 위치 관계가 navigation이나 장식보다 먼저 보여야 한다.
- 반투명 재질을 시험한다면 상단 제어, 임시 toolbar 또는 popover처럼 콘텐츠 위에 잠시 놓이는 영역에 제한한다. 메모 본문과 분석 결과의 배경에는 읽기 안정성을 우선한다.
- 메모의 물성을 표현할 때 종이 질감, tape와 접힌 모서리를 모두 추가하기보다 선택, drag, resize와 겹침 순서를 깊이 및 모션으로 분명히 하는 데 집중한다.
- 일반 클릭 복사, 누적 클릭과 편집은 색 하나가 아니라 cursor, 테두리, handle, 상태 문구와 keyboard 안내를 함께 사용해 구분한다.
- 누적 텍스트 화면은 순서와 결합 결과를 한눈에 연결해야 하므로 큰 card 반복보다 항목 목록과 미리보기의 관계를 강조한다.
- 사용 빈도와 텍스트 분석 화면은 홍보용 통계 dashboard가 아니라 원문을 비교하고 근거로 돌아갈 수 있는 밀도 높은 작업 화면으로 만든다.
- 작은 화면 목록은 같은 token과 글자 체계를 사용하되 자유 배치의 축소판처럼 보이게 만들지 않는다. 복사, 누적과 편집에 필요한 control을 touch에서도 사용할 수 있게 배치한다.
- URL 형식 문자열은 별도 link 색, 밑줄, preview card나 favicon을 붙이지 않고 메모 원문의 일부로 표시한다.
- 고유한 시각 성격은 범용 gradient 배경보다 메모 배치, 누적 순서, 분석 관계와 템플릿 placeholder를 표현하는 조형 규칙에서 찾는다.

## 결정이 필요한 사항

- 애플리케이션의 시각적 성격을 설명할 실제 참고 화면과 피해야 할 참고 화면
- 본문, UI label, 숫자와 짧은 제목에 사용할 글꼴 family, weight와 fallback
- 밝은 테마, 어두운 테마, 고대비 지원 범위와 기본 선택 방식
- brand, neutral, note, selection, focus, success, warning과 error의 semantic color 역할
- 메모별 색을 사용자가 고를 수 있는지와 색이 분류 의미를 갖는지 여부
- note, panel, button, input과 badge의 shape 관계 및 radius scale
- shadow, border와 반투명 재질의 사용 범위 및 transparency fallback
- board, analysis, template와 settings 화면의 density scale
- icon set, icon-only button 허용 범위와 label 표시 규칙
- drag, resize, panel 전환, undo와 상태 알림의 motion 원칙 및 reduced-motion 동작
- 빈 화면과 오류 상태에 illustration을 사용할지, 문구와 실제 동작만 제공할지
- 작은 화면 목록에서 항상 보이는 control의 배치와 touch target 크기
- 시각 검증에 사용할 대표 콘텐츠, viewport, 테마와 접근성 설정 목록

## 조사 한계

- 이 저장소에는 아직 구현된 개인 메모 화면이나 승인된 시각 시안이 없으므로 실제 screenshot 비교와 사용자 시험은 수행하지 못했다.
- Apple과 Material의 최신 흐름은 native platform을 함께 다루므로 웹에 동일한 재질, 크기와 모션 수치를 복제할 근거가 되지 않는다.
- Webflow와 Adobe의 연간 전망은 제작 시장의 선택 편향이 있을 수 있어 플랫폼 지침보다 근거의 무게를 낮췄다.
- 생성형 AI 연구는 서로 다른 도구, 과제와 평가법을 사용한다. 특정 외형만으로 AI 사용 여부나 모델 종류를 판별할 수 없다.
- `AI답지 않게` 만드는 것 자체는 사용성 목표가 아니다. 실제 작업 흐름, 접근성, 일관성과 고유한 시각 원칙을 충족한 결과가 우선이다.
