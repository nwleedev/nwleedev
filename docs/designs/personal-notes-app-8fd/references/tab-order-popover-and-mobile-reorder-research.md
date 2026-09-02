# 메모 Tab 순서, 항목 동작 팝오버와 모바일 지연 재정렬 조사

## 결론

메모의 `Tab` 순서는 시각적 겹침 순서인 `zIndex`와 분리하고, 각 메모 선택 지점에 지정한 HTML `tabindex` 값으로 결정한다. 낮은 양의 값부터 `Tab`에 도달하고 `Shift+Tab`은 반대 순서로 이동한다. 맨 앞으로 또는 맨 뒤로 보내기는 `zIndex`만 바꾸며 `tabindex`를 바꾸지 않는다. 양의 `tabindex`는 문서의 다른 기본 포커스 요소보다 먼저 탐색되는 부작용이 있으므로, 메모 안의 본문 및 아이콘 버튼과 페이지의 다른 제어를 포함한 전체 탐색 순서를 실제 브라우저에서 검증해야 한다.

모바일 일괄 복사 확인 항목의 아이콘 버튼은 브라우저 기본 외형이 아니라 개인 메모 디자인 시스템으로 만든 항목 동작 팝오버를 연다. 팝오버는 실행 버튼 가까이에 붙이고, 보이는 텍스트가 있는 `위치 변경`, `복제`와 `삭제`를 세로로 배치한다. 삭제는 구획선과 위험 동작용 의미 색으로 구분한다. HTML Popover API는 top layer, light dismiss와 포커스 복귀의 기반으로 사용할 수 있지만 시각 외형이나 menu 키보드 동작까지 제공하지 않는다.

터치 재정렬은 짧은 누르기 및 세로 스크롤과 구분하기 위해 길게 누르기가 인식된 뒤에만 시작한다. 대기 중, drag 활성화, 이동 중, 놓을 위치, 완료와 취소 상태를 시각적으로 구분해야 한다. 내려받은 디자인 시스템 `.fig` 파일은 팝오버 표면, 세로 동작 행, 목록과 상태 표현을 교차검증하는 자료로 사용하고, 길게 누르기의 시간 판정과 pointer 취소는 웹 표준 및 모바일 프레임워크의 실제 상호작용 문서로 보완한다.

## 조사 질문과 범위

이 조사는 [개인 메모 애플리케이션 요구사항](../requirements.md)의 다음 변경을 구현 가능한 문서로 구체화한다.

- 메모의 `Tab` 순서를 겹침 우선순위가 아닌 `tabindex`로 결정하는 방법
- 모바일 확인 항목의 `복제`와 `삭제` 팝오버를 브라우저 기본 외형에 맡기지 않는 방법
- 일반 터치와 스크롤을 보존하면서 길게 누른 뒤 재정렬하는 상태 및 피드백
- 내려받은 여러 `.fig` 디자인 파일과 공식 웹 자료가 각각 뒷받침할 수 있는 범위

공식 자료는 2026년 9월 2일에 확인했다. `.fig` 비교는 앞선 시각 조사에서 내려받아 Figma에서 확인한 Material 3, Fluent 2, Primer Web, Atlassian과 사용자 제작 메모 앱 파일을 다시 사용했다. 새 시안을 만들거나 Figma 애플리케이션 자체의 화면 구성을 조사 근거로 사용하지 않았다.

## `tabindex`와 시각적 겹침 순서의 분리

[HTML Standard의 `tabindex` 처리](https://html.spec.whatwg.org/multipage/interaction.html#the-tabindex-attribute)는 양의 값이 같은 focus navigation scope 안에서 상대 순서를 만들며 값이 클수록 뒤에 놓인다고 정의한다. 양의 값을 가진 요소는 `tabindex="0"` 또는 기본 focusable 요소보다 먼저 탐색된다. 표준은 `0`과 `-1` 이외의 값을 올바르게 관리하기 어렵다고 함께 경고한다.

[WCAG Focus Order 설명](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)은 포커스 순서가 시각적 배치와 반드시 같아야 하는 것은 아니지만 의미와 조작 가능성을 보존해야 한다고 설명한다. [WAI 키보드 인터페이스 지침](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)은 DOM 읽기 순서와 키보드 탐색 순서를 논리적이고 예측 가능하게 유지하는 방식을 기본으로 제시한다. 이 일반 권고와 달리 현재 요구사항 책임자는 메모의 시각적 겹침 순서와 독립된 `tabindex` 순서를 명시적으로 선택했다.

따라서 다음 책임을 분리한다.

- `Note.geometry.zIndex`는 메모가 다른 메모보다 앞이나 뒤에 그려지는 순서만 나타낸다.
- 메모 선택 지점의 `tabindex`는 메모 사이의 `Tab` 및 `Shift+Tab` 순서만 나타낸다.
- 맨 앞으로 및 맨 뒤로 보내기는 `zIndex`만 바꾸고 `tabindex`는 유지한다.
- 같은 `tabindex` 값이 문서 트리 순서를 보조 순서로 사용하는 문제를 확인했고, 저장 자료에서는 중복을 허용하지 않는 다음 정리 규칙으로 해결했다.
- 상단 탐색과 주 작업 제어는 `1..999`, 메모 선택 지점은 `1000..32767`을 사용한다. 첫 메모는 `1000`, 새 메모는 현재 최댓값 다음 값을 받고, 누락, 중복과 범위 밖 값은 기존 유효 값, 생성 시각과 ID 순서로 정리한 뒤 `1000`부터 다시 배정한다.

양의 `tabindex`가 페이지의 다른 제어보다 먼저 탐색되는 것은 표준 동작이다. 이 선택을 유지하려면 메모 선택 지점만 먼저 연속해서 방문한 뒤 헤더 아이콘, 본문, 오른쪽 패널과 전역 탐색으로 이동하는 실제 순서가 과업을 방해하지 않는지 확인해야 한다. 내부 제어를 건너뛰거나 같은 메모가 혼란스럽게 여러 번 나타나는 경우에는 값을 임의로 조정하지 않고 요구사항 책임자에게 다시 확인한다.

## 내려받은 `.fig` 디자인 파일 교차검증

### Material 3 Design Kit

`material-3-design-kit.fig`에는 menu와 list 구성요소 page가 별도로 있다. 동작 목록은 떠 있는 표면 안에서 한 열의 행으로 정렬되고, 기본, hover, focus 및 disabled 상태를 구성요소 변형으로 구분한다. 현재 앱에는 Material의 큰 radius와 강한 색을 복제하지 않고, 동작 행과 표면 상태를 분리하는 구조만 참고한다.

### Microsoft Fluent 2 Web

`microsoft-fluent-2-web.fig`의 파일 표지에도 split button에 붙은 세로 menu가 함께 나타난다. 밝은 표면, 절제된 깊이, 짧은 동사형 행과 선택한 실행 버튼 가까이의 배치가 확인된다. [Fluent 2 Menu 지침](https://fluent2.microsoft.design/components/web/react/core/menu/usage)은 자주 쓰는 동작을 먼저, 위험한 동작을 마지막에 두고 필요하면 구획선으로 구분하도록 안내한다. [Fluent 2 Popover 지침](https://fluent2.microsoft.design/components/web/react/core/popover/usage)은 실행 대상과 관계를 알 수 있게 배치하고 동시에 봐야 하는 내용을 가리지 않도록 요구한다.

### Primer Web

`primer-web.fig`에는 ActionMenu component page가 있고, 실행 버튼, overlay와 세로 ActionList의 관계를 확인할 수 있다. [Primer ActionMenu 지침](https://primer.style/product/components/action-menu/guidelines/)은 빠른 동작을 한 열로 제공하고, 일부 항목에만 아이콘을 섞지 않으며 별도 상호작용을 trailing 영역에 넣지 않도록 안내한다. 확인 항목의 팝오버는 두 동작 모두 텍스트를 표시하므로 행 안에 아이콘을 추가하지 않아도 의미가 분명하다.

### Atlassian과 사용자 제작 메모 앱 파일

`ads-components.fig`는 버튼, 입력과 tooltip 상태를 같은 디자인 언어로 관리하는 근거로 사용했다. 재정렬의 놓을 위치 표시는 내려받은 파일에서 충분히 확인하지 못했으므로 [Atlassian Pragmatic drag and drop 디자인 지침](https://atlassian.design/components/pragmatic-drag-and-drop/design-guidelines/)의 목록 삽입선을 웹 근거로 보완한다.

사용자 제작 메모 앱 `.fig` 여섯 건은 작은 화면 메모 카드, 상단 동작과 하단 주요 동작의 밀도를 비교하는 데에는 유용했다. 그러나 일반 터치, 대기, drag와 취소가 이어지는 prototype 상태가 일관되게 제공되지 않아 길게 누르기 판정의 근거로 사용하지 않는다.

### 비교 결론

- 팝오버는 항목 우측 상단 아이콘에 붙여 열고, 실행 대상 항목과의 관계를 잃지 않게 한다.
- 팝오버 표면에는 얇은 테두리, 작은 모서리와 절제된 깊이를 적용하고 브라우저 기본 외형을 그대로 노출하지 않는다.
- `위치 변경`, `복제`와 `삭제`는 한 열의 전체 너비 동작 행으로 제공한다. 삭제는 마지막에 두고 구획선 및 위험 동작용 의미 색으로 구분하되 과도한 경고 배경을 사용하지 않는다.
- 각 행은 default, hover, `focus-visible`, pressed와 disabled 상태를 같은 token 체계로 제공한다.
- 팝오버가 화면 가장자리를 넘거나 대상 항목과 겹치면 반대 방향으로 배치하되, 현재 항목의 원문과 우측 상단 실행 버튼을 모두 가리지 않게 한다.

## 항목 동작 팝오버의 동작과 접근성

[HTML Popover API](https://html.spec.whatwg.org/multipage/popover.html)는 `popover="auto"`에 top layer 표시, 다른 auto popover 닫기, 바깥 영역 실행과 close request에 따른 light dismiss를 제공한다. 또한 접근성 의미가 없는 요소에 적절한 semantics를 별도로 제공해야 하며, custom menu의 방향키 이동과 실행은 작성자가 구현해야 한다고 명시한다.

현재 세 동작에는 다음 방식을 채택한다.

- 아이콘 전용 네이티브 `button`을 실행 버튼으로 사용하고 항목 맥락을 포함한 접근 가능한 이름을 제공한다.
- `popover="auto"` 표면을 항목 동작이라는 이름이 있는 `role="group"`으로 만들고 `위치 변경`, `복제`와 `삭제` 네이티브 버튼을 문서 순서대로 둔다.
- 열리면 첫 동작으로 포커스를 옮기고, 실행, `Escape` 또는 light dismiss로 닫힌 뒤 실행 버튼으로 포커스를 돌려준다.
- 일반 버튼 묶음의 `Tab` 및 `Shift+Tab` 이동을 유지한다.
- 방향키, `Home`과 `End`를 포함한 합성 위젯 동작이 필요하지 않으므로 `role="menu"`와 `menuitem`은 사용하지 않는다. 동작 수나 탐색 요구가 바뀌면 [WAI Menu Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) 전체를 다시 검토한다.

## 길게 누른 뒤 재정렬하는 모바일 흐름

[Flutter `ReorderableListView`](https://api.flutter.dev/flutter/material/ReorderableListView/buildDefaultDragHandles.html)는 desktop에서 별도 handle을 사용하고 mobile에서는 항목 어디든 길게 눌러 drag를 시작하는 기본 동작을 제공한다. [`ReorderableDelayedDragStartListener`](https://api.flutter.dev/flutter/widgets/ReorderableDelayedDragStartListener-class.html)는 long press가 인식된 뒤에만 재정렬 drag를 시작한다. 두 문서는 짧은 누르기와 재정렬 시작을 시간으로 구분하는 실제 사례를 제공한다.

[Android Compose gesture 지침](https://developer.android.com/develop/ui/compose/touch-input/pointer-input/understand-gestures)은 `detectDragGesturesAfterLongPress`, touch slop, `awaitLongPressOrCancellation`과 drag 취소를 별도 단계로 다룬다. [Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)은 브라우저가 스크롤 같은 직접 조작을 가져가면 `pointercancel`을 보낼 수 있으며, `touch-action`은 처음 상호작용이 시작되기 전에 허용할 pan 방향을 선언해야 한다고 정의한다.

이 근거를 현재 확인 페이지에 다음 상태로 적용한다.

1. **대기 전:** 짧은 누르기와 세로 스크롤이 정상 동작하고, 항목은 놓인 위치에 그대로 보인다.
2. **길게 누르기 대기:** pointer가 허용 이동 거리를 넘거나 스크롤이 시작되면 재정렬을 취소한다. 동작 아이콘 버튼은 이 대기를 시작하지 않는다.
3. **drag 활성화:** 기준 시간이 지나면 항목의 얇은 강조선, 절제된 깊이 또는 크기 변화로 잡힌 상태를 즉시 알린다. 색 하나만 사용하지 않는다.
4. **이동 중:** 원래 위치에는 자리 표시를 유지하고, 놓으면 들어갈 항목 사이에 삽입선을 표시한다. 목록 전체 배경을 바꾸거나 주변 내용을 가리는 큰 preview를 사용하지 않는다.
5. **놓기:** 유효한 삽입 위치에서 손을 떼면 작업 사본 순서만 바꾸고, 이동한 항목이 새 위치에 보이게 한다.
6. **취소:** `pointercancel`, `lostpointercapture`, 유효하지 않은 위치 또는 `Escape`에서는 작업 사본을 바꾸지 않고 원래 위치와 표면 상태로 되돌린다.

초기 조사에서는 기준 시간과 허용 이동 거리를 이름 있는 상호작용 token으로만 두고 실제 장치 검증 뒤 수치를 정하려 했다. 후속 교차검증에서 Apple과 Flutter의 기본 대기 시간, Android의 touch slop 개념과 현재 모바일 흐름을 비교해 `500ms`와 `10 CSS px`를 첫 제품값으로 채택했다. 상승 깊이와 motion은 색 이외의 활성 상태를 보여주는 범위에서 디자인 token으로 관리한다. 이 값들은 플랫폼 표준이 아니므로 iOS Safari, Android Chrome, 320 CSS px, 화면 확대, reduced motion과 긴 목록 스크롤에서 다시 검증한다.

[WCAG 2.2 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)은 같은 결과를 drag 없이 단일 pointer로 만드는 방법도 요구한다. 항목 팝오버의 `위치 변경`을 누르면 항목 사이에 최소 `24 × 24 CSS px` 삽입 위치 버튼을 표시하고, 하나를 누르면 drag와 같은 재정렬 명령을 실행한다.

## 문서와 계획에 미치는 영향

- 메모 자료에서 `tabIndex`와 `geometry.zIndex`의 책임을 분리하고, 저장 및 이전 자료 규칙을 별도로 결정한다.
- U4는 내려받은 `.fig` 비교에서 확인한 표면, 행, 위험 동작과 상태 규칙을 항목 동작 팝오버의 디자인 token에 반영한다.
- U5는 메모 선택 지점의 실제 `tabindex` 값과 `Tab` 및 `Shift+Tab` 이동을 브라우저에서 함께 확인하고 맨 앞 및 맨 뒤 동작이 이 값을 바꾸지 않는지 검증한다.
- U7은 길게 누르기 대기, 활성화, 삽입선, 놓기와 취소 상태를 실제 터치 브라우저에서 검증한다. 순수 배열 재정렬, 복제와 삭제만 TDD 대상으로 유지한다.
- U11은 문서 전체의 포커스 순서, 고대비 및 reduced motion, 팝오버 위치와 모바일 스크롤 충돌을 통합 확인한다.

## 후속 교차검증에서 채택한 값

- 상단 탐색과 주 작업 제어는 양의 `tabindex` `1..999`, 메모 선택 지점은 `1000..32767`을 사용한다. 본문, 헤더 아이콘과 패널 제어는 양수 구간 뒤의 네이티브 순서를 따른다.
- 첫 메모는 `1000`, 새 메모는 현재 최댓값 다음 값을 받는다. 누락, 중복, `0` 이하 또는 지원 범위를 넘는 이전 값은 기존 유효 값, 생성 시각과 ID 순서로 정리한다.
- 모바일 확인 페이지는 항목 팝오버의 `위치 변경`과 삽입 위치 버튼으로 drag 없는 단일 pointer 재정렬을 제공한다.
- 길게 누르기는 `500ms`, 허용 이동 거리는 `10 CSS px`를 첫 제품값으로 사용하고 실제 iOS Safari와 Android Chrome 결과에서 재검토한다.
- 항목 동작 선택창은 `popover="auto"`와 `role="group"` 안의 일반 네이티브 버튼으로 구현한다. ARIA menu 역할과 외부 접근성 부품은 현재 범위에 사용하지 않는다.
