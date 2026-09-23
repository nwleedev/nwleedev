# 모바일 일괄 복사 확인과 오른쪽 패널 우선순위 조사

## 후속 변경 안내

2026년 9월 3일 후속 요구는 이 조사에서 사용한 데스크톱 메모의 `1280 × 960` 크기 상한을 논리 캔버스 범위로 대체했다. 현재 geometry 기준은 [개인 메모 애플리케이션 요구사항](../requirements.md), [메모 선택과 오른쪽 속성 패널 결정](../decisions/note-selection-and-properties.md)과 [데스크톱 입력과 피드백 복원력 조사](desktop-input-and-feedback-resilience-research.md)를 따른다. 모바일 확인 페이지의 버튼 옆 작은 팝오버와 삽입 위치 선택 설명도 이후 요구로 대체되었다. 현재 동작 선택 방식은 [모바일 일괄 복사 액션 시트와 이동 아이콘 조사](mobile-batch-copy-action-sheet-and-direction-icons-research.md)를 따른다. 길게 누른 뒤 drag를 시작하는 조사 근거는 남지만 실제 시작 지점과 재정렬 결과는 현행 요구사항을 따른다.

## 결론

모바일 일괄 복사 상태의 `다음`은 현재 작업을 바로 저장하거나 Clipboard에 쓰는 동작이 아니라, 선택 당시 원문 스냅샷을 순서대로 보여주는 별도 확인 페이지로 이동하는 동작으로 구성한다. 확인 페이지의 재정렬은 길게 누른 뒤에만 drag를 시작해 일반 터치와 세로 스크롤을 구분하고, drag를 쓸 수 없는 순서 변경, 복제와 삭제는 항목 우측 상단의 아이콘 버튼이 여는 작은 동작 선택창에서 실행한다. 이 세 동작은 확인 중인 작업 사본만 바꾸며 원본 메모, 메모 revision과 사용 횟수를 바꾸지 않는다.

넓은 화면의 메모 속성 패널과 일괄 복사 패널은 동시에 표시하지 않고 마지막으로 활성화한 패널 하나를 보여준다. 이동이 아닌 메모 헤더 더블클릭 또는 선택된 메모의 선택 지점에서 실행한 `Enter`는 속성 패널을, 일괄 복사 동작은 일괄 복사 패널을 활성화한다. 한 번의 헤더 클릭, `Tab` 선택과 선택 해제는 최근 활성 패널을 바꾸지 않는다. 패널 전환은 선택한 메모, 속성 패널 대상이나 일괄 복사 자료를 지우는 동작이 아니다.

메모의 키보드 탐색은 저장된 겹침 우선순위와 분리하고 각 메모 선택 지점에 지정한 양의 `tabindex` 순서로 구성한다. 낮은 값부터 `Tab`에 도달하며 맨 앞으로 또는 맨 뒤로 보내기는 이 값을 바꾸지 않는다. 양의 값은 문서의 기본 focusable 요소보다 먼저 탐색되므로 메모 내부 제어와 페이지 전체 포커스 순서를 실제 브라우저에서 함께 검증해야 한다. 좌표와 크기 입력은 HTML 입력 제약만 믿지 않고 application command에서 유한한 수인지와 허용 범위를 다시 검증한다. 초기 범위는 너비 `240..1280`, 높이 `180..960`, X `1..(4096 - width)`, Y `1..(4096 - height)`다.

## 조사 질문과 적용 범위

이 조사는 [개인 메모 애플리케이션 요구사항](../requirements.md)의 다음 변경을 구현 가능한 규칙으로 구체화한다.

- 모바일 일괄 복사 확인 페이지의 진입, 재정렬, 복제와 삭제
- 일반 터치 및 스크롤과 길게 누른 뒤 drag의 구분
- 항목 동작 선택창의 키보드와 포커스 동작
- 메모 속성 패널과 일괄 복사 패널의 최근 활성 우선순위
- 메모의 겹침 순서와 독립된 `tabindex` 기반 `Tab` 순서
- 좌표와 크기의 `0` 이하 거부 및 상한 검증

공식 자료는 2026년 9월 2일에 확인했다. Figma의 객체 순서와 속성 영역은 이 애플리케이션이 그대로 복제할 규격이 아니라, 공간형 객체의 우선순위와 문맥 패널을 연결하는 정보 구조의 근거로만 사용했다.

## 길게 누른 뒤 시작하는 터치 재정렬

[Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)은 `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, pointer capture와 `touch-action`을 정의하지만 `longpress` 이벤트나 하나의 표준 대기 시간을 정의하지 않는다. 따라서 확인 페이지는 다음 상태를 애플리케이션에서 명시적으로 구분해야 한다.

1. 항목의 동작 버튼이 아닌 영역에서 `pointerdown`이 발생하면 대기 상태를 시작한다.
2. 기준 시간이 지나기 전에 허용 이동 거리를 넘거나 브라우저가 스크롤을 시작하면 drag를 시작하지 않고 대기 상태를 취소한다.
3. 기준 시간이 지나면 해당 항목을 drag 가능한 상태로 바꾸고, 이후 이동만 재정렬 미리보기에 반영한다.
4. `pointerup`에서 유효한 위치에 놓였을 때만 작업 사본의 순서를 바꾼다.
5. `pointercancel`이나 `lostpointercapture`가 발생하면 저장된 순서와 작업 사본을 바꾸지 않고 drag 표시를 끝낸다.

초기 조사에서는 기준 시간과 허용 이동 거리를 이름 있는 상호작용 token으로만 두었다. 후속 교차검증에서 `500ms`와 `10 CSS px`를 첫 제품값으로 채택했으며, 플랫폼 표준값으로 간주하지 않는다. iOS Safari, Android Chrome, 320 CSS px, 화면 확대와 세로 스크롤에서 다시 검증한다. 동작 선택창을 여는 아이콘 버튼에서는 길게 누르기 대기를 시작하지 않아야 한다.

[WCAG 2.2 Dragging Movements 설명](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)은 drag로 만드는 결과를 drag 없이 한 번의 pointer 입력으로도 만들 수 있어야 한다고 설명한다. [기법 G219](https://www.w3.org/WAI/WCAG22/Techniques/general/G219)은 tap이나 click으로 재정렬 동작을 드러내는 방식을 예로 든다. 이번 흐름은 길게 누른 뒤 drag를 주 입력으로 유지하고, 항목 동작 선택창의 `위치 변경`과 삽입 위치 버튼을 같은 재정렬 명령의 단일 pointer 및 키보드 대안으로 제공한다.

## 항목 동작 선택창과 작업 사본

[HTML Standard의 popover](https://html.spec.whatwg.org/multipage/popover.html)는 실행 버튼과 `popover="auto"`를 연결하고, 바깥 영역 실행과 `Escape` 같은 close request로 light dismiss를 제공한다. `위치 변경`, `복제`와 `삭제`처럼 수가 적은 일반 명령은 이름 있는 `role="group"`의 anchored popover 안에 네이티브 버튼으로 둔다. 일반 `Tab` 순서를 유지하고, 열 때 첫 동작으로 포커스를 옮기며 닫은 뒤 해당 항목의 실행 버튼으로 포커스를 돌려준다. [WAI Menu Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)이 요구하는 방향키와 `Home` 및 `End`를 제공할 필요가 없는 현재 범위에서는 `menu`와 `menuitem` 역할을 사용하지 않는다.

확인 페이지의 항목은 원본 메모를 직접 가리켜 수정하는 UI가 아니라 선택 당시 원문 스냅샷의 작업 사본이다.

- 재정렬은 작업 사본 배열의 순서만 바꾼다.
- 복제는 같은 원본 메모 참조와 원문 스냅샷을 가진 새 항목 ID를 만든다.
- 삭제는 대상 항목 ID 하나만 작업 사본에서 제거한다.
- 세 동작은 원본 메모, 원문 및 geometry revision과 사용 횟수를 바꾸지 않는다.
- 확인 페이지의 현재 배열 순서가 이후 결합 및 Clipboard 쓰기 순서다.

복제 항목은 대상 바로 다음에 새 ID로 넣는다. 확인 중인 작업은 기존 저장 목록에 반영하지 않는 별도 IndexedDB 초안으로 유지한다.

## 최근 활성 오른쪽 패널

오른쪽 패널의 종류는 특정 디자인 도구의 화면 구성이 아니라 승인된 개인 메모 사용자 동작으로 결정한다. 패널 안에 자료가 있다는 사실만으로 보이는 패널을 바꾸지 않는다.

- 이동이 아닌 메모 헤더 더블클릭 또는 선택된 메모의 선택 지점에서 실행한 `Enter`는 메모 속성 패널을 활성화한다.
- 한 번의 메모 헤더 클릭과 `Tab` 선택은 선택 표시만 바꾸고 최근 활성 패널을 유지한다.
- `Command+Option+클릭`, 첫 항목 추가 또는 일괄 복사 제어 실행은 일괄 복사 패널을 활성화한다.
- 패널이 바뀌어도 선택한 메모 ID, 속성 패널 대상 ID, 유효한 속성 초안과 일괄 복사 항목을 지우지 않는다.
- 속성 초안에 적용 계기가 생기면 패널 전환 전에 같은 검증 및 적용 절차를 사용한다. 유효하지 않은 초안은 저장 geometry를 바꾸지 않은 채 실행 중 상태에 남긴다.
- 공간이 부족해 일괄 복사 패널이 모달인 표현에서는 바깥 메모 화면을 조작할 수 없으므로, 모달을 닫은 뒤에만 메모 선택이 새 활성 동작이 될 수 있다.

최근 활성 패널을 닫으면 이전 패널을 다시 보여주지 않고 아무 패널도 표시하지 않는다. 속성 초안과 일괄 복사 자료는 지우지 않는다.

## 독립된 `tabindex`와 Tab 순서

[HTML Standard의 focus 순서](https://html.spec.whatwg.org/multipage/interaction.html#the-tabindex-attribute)는 양의 `tabindex`가 같은 focus navigation scope 안에서 상대 순서를 만들고, 낮은 값이 먼저 오며 `tabindex="0"` 또는 기본 focusable 요소보다 앞에 놓인다고 정의한다. 표준은 `0`과 `-1` 이외의 값을 올바르게 관리하기 어렵다고 경고한다. [WCAG Focus Order 설명](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)은 포커스 순서가 시각적 배치와 반드시 같을 필요는 없지만 의미와 조작을 보존해야 한다고 요구한다.

후속 요구사항은 일반 권고와 별개로 다음 규칙을 승인했다.

- 각 메모 선택 지점에는 메모 사이 탐색 순서를 나타내는 양의 `tabindex`를 지정한다.
- `Tab`은 낮은 값부터 높은 값 순으로, `Shift+Tab`은 반대로 이동한다.
- `Note.geometry.zIndex`는 시각적 겹침만 나타내고 `tabindex`를 계산하는 입력으로 사용하지 않는다.
- 맨 앞으로 또는 맨 뒤로 보내기는 `zIndex`만 바꾸며 이후 `Tab` 순서는 유지한다.
- 선택 표현을 위해 일시적으로 올린 화면 layer도 `zIndex`와 `tabindex`를 바꾸지 않는다.

첫 메모의 `tabIndex`는 `1000`, 새 메모는 현재 최댓값 다음 값으로 정한다. 누락, 중복과 범위 밖 이전 값은 기존 유효 값, 생성 시각과 ID 순서로 정리하고, 메모 내부 제어와 페이지 제어는 양수 구간 뒤의 네이티브 순서를 따른다. 세부 근거와 `.fig` 시각 비교는 [메모 Tab 순서, 항목 동작 팝오버와 모바일 지연 재정렬 조사](tab-order-popover-and-mobile-reorder-research.md)에 기록했다.

## 좌표와 크기 입력 범위

[HTML Standard의 number 입력](https://html.spec.whatwg.org/multipage/input.html#number-state-(type=number))은 `min`, `max`와 step mismatch를 제약 검증에 사용할 수 있게 한다. 그러나 DOM 값은 application command를 우회해 들어올 수 있고 HTML 제약만으로 IndexedDB 불변 조건을 보장할 수 없다. [Zod 4 문서](https://zod.dev/packages/zod)는 숫자의 `.positive()`와 `.max()` 검증을 제공한다.

오른쪽 속성 패널의 X, Y, 너비와 높이는 같은 검증 절차를 사용한다.

- 입력 문자열을 수치로 변환한 결과가 유한한 값인지 확인한다.
- `0` 이하이면 적용하지 않고 저장된 geometry와 revision을 유지한다.
- 애플리케이션이 한 곳에서 관리하는 해당 필드 상한을 넘으면 적용하지 않는다.
- 유효하고 저장값과 다를 때만 geometry를 한 번 저장한다.
- HTML `min`과 `max`는 즉시 피드백에 사용하되 application command와 저장 경계에서 같은 규칙을 다시 검증한다.

[CSS Values and Units Level 4](https://www.w3.org/TR/css-values-4/)는 CSS 수치가 구현에서 지원하는 범위로 제한될 수 있음을 전제로 한다. 브라우저 공통의 의미 있는 메모 좌표 및 크기 최댓값은 제공하지 않으므로 첫 제품값을 표준처럼 표현하지 않는다. 초기 논리 캔버스와 geometry 범위는 `4096 × 4096`, 너비 `240..1280`, 높이 `180..960`, X `1..(4096 - width)`, Y `1..(4096 - height)`로 정하고 실제 브라우저 결과에서 재검토한다.

기존 record의 X 또는 Y가 `0`이면 `1`로 옮기고, 크기나 위치가 범위를 벗어나면 원래 배치를 가능한 많이 유지하면서 캔버스 안으로 보정한다. geometry가 실제로 달라지면 전체 revision만 한 번 증가시키며 안전 정수 범위에서 증가시킬 수 없으면 migration을 중단한다.

## 문서와 계획에 미치는 영향

- 모바일 일괄 복사 실행 중 상태에 `collecting`과 `confirming` 단계를 구분하고, 확인 항목마다 안정된 ID를 둔다.
- `다음`은 확인 페이지로 이동하되 Clipboard 쓰기와 사용 횟수 저장을 실행하지 않는다.
- 확인 페이지의 복제, 삭제와 재정렬은 원본 메모 repository를 호출하지 않는 작업 사본 명령으로 분리한다.
- 오른쪽 패널 활성 상태는 선택한 메모와 일괄 복사 자료에서 파생하지 않고 실행 중 상태로 둔다.
- 메모 표시의 `zIndex`와 메모 탐색의 `tabindex`를 서로 독립된 자료로 유지하고, 맨 앞으로 및 맨 뒤로 보내기가 `tabindex`를 바꾸지 않게 한다.
- geometry 입력 검증은 HTML 속성, 폼 schema와 application command에 위에서 정한 같은 하한 및 상한을 사용한다.
- 작업 사본 명령, 패널 활성 전이, z-order 정렬, `tabindex` 불변 조건과 geometry 경계 검증은 사용자 결과와 불변 조건을 먼저 쓸 수 있어 TDD 대상이다. 길게 누르기 시간, drag 좌표, popover 위치와 실제 Tab 이동은 브라우저 검증 대상으로 둔다.

## 후속 교차검증에서 채택한 값

- 복제 항목은 대상 바로 뒤에 새 ID로 넣고 확인 작업은 기존 저장 목록과 분리한 한 개의 IndexedDB 초안으로 유지한다.
- 브라우저 뒤로가기는 편집한 순서를 유지한 채 수집 단계로 돌아가고, 새로고침과 예기치 않은 이탈에서는 작업 초안을 복원한다. 수집 화면 헤더 뒤로가기와 확인 페이지의 명시적 취소는 초안을 지운다.
- drag 없는 재정렬은 동작 선택창의 `위치 변경`과 삽입 위치 버튼으로 제공한다.
- 최근 활성 패널을 닫으면 아무 패널도 표시하지 않는다.
- 캔버스, geometry, `tabindex` 범위와 이전 자료 보정은 위 결론과 [구현 필수 결정 교차검증](required-implementation-decisions-research.md)의 값을 사용한다.
- 항목 동작 선택창은 HTML `popover="auto"`, 이름 있는 `role="group"`과 일반 네이티브 버튼을 사용한다. 현재 범위에는 ARIA menu 역할과 외부 접근성 부품을 사용하지 않는다.

## 출처와 검토 시점

다음 자료는 2026년 9월 2일에 검토했다.

- [W3C: Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)
- [W3C: Understanding Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)
- [W3C: Technique G219](https://www.w3.org/WAI/WCAG22/Techniques/general/G219)
- [WHATWG: Popover](https://html.spec.whatwg.org/multipage/popover.html)
- [WAI: Menu Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)
- [WAI: Menu and Menubar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)
- [Figma: Select layers and objects](https://help.figma.com/hc/en-us/articles/360040449873-Select-layers-and-objects)
- [Figma: Adjust alignment, rotation, position, and dimensions](https://help.figma.com/hc/en-us/articles/360039956914-Adjust-alignment-rotation-position-and-dimensions)
- [WHATWG: The `tabindex` attribute](https://html.spec.whatwg.org/multipage/interaction.html#the-tabindex-attribute)
- [W3C: Understanding Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)
- [WHATWG: Number state](https://html.spec.whatwg.org/multipage/input.html#number-state-(type=number))
- [Zod 4](https://zod.dev/packages/zod)
- [W3C: CSS Values and Units Level 4](https://www.w3.org/TR/css-values-4/)
