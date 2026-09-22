# 구현 필수 결정 교차검증

## 후속 변경 안내

2026년 9월 3일 후속 요구는 이 조사에서 채택했던 `1280 × 960` 메모 상한, 얇은 선택 테두리, 데스크톱 항목 동작 선택창과 자동으로 사라지지 않는 토스트를 대체했다. 현재 기준은 [개인 메모 애플리케이션 요구사항](../requirements.md), [메모 선택과 오른쪽 속성 패널 결정](../decisions/note-selection-and-properties.md), [일괄 복사 순서와 제거 복구 결정](../decisions/accumulator-ordering-and-recovery.md), [메모 제거와 취소 알림 결정](../decisions/note-removal-recovery.md)과 [데스크톱 입력과 피드백 복원력 조사](desktop-input-and-feedback-resilience-research.md)를 따른다. 아래 내용은 2026년 9월 2일 당시의 교차검증 기록이다.

## 결론

현재 로컬 애플리케이션 구현을 막던 자료 수명, 포커스 순서, 자동 저장, 삭제 복구, 수치 geometry와 일괄 복사 재정렬 규칙은 구현 전에 확정할 수 있다. 표준이 직접 답을 정하는 항목은 그 규칙을 따르고, 제품이 선택해야 하는 대기 시간과 수치는 현재 구현의 기본 크기 및 지원 화면을 기준으로 하나의 초기값을 채택한다. 후자는 보편적인 표준값으로 표현하지 않고 실제 브라우저 검증에서 다시 볼 조건을 함께 둔다.

채택한 값과 규칙은 다음과 같다.

- 데스크톱 메모 입력은 800ms 뒤 저장을 시작하고, `blur`, 애플리케이션 안의 화면 이동, 문서 숨김과 `pagehide`에서는 대기 중인 저장을 즉시 시도한다. 최신 입력을 먼저 임시 초안으로 기록하고 메모 저장이 완료되면 초안을 지운다.
- 모바일 상세 편집과 모바일 일괄 복사 작업은 명시적으로 버리기 전까지 IndexedDB 초안으로 복원한다. 일괄 복사 작업은 저장된 일괄 복사 목록과 합치지 않는다.
- 양의 `tabindex`를 사용한다는 요구를 유지하되 상단 탐색 및 주 작업 제어와 메모 선택 지점의 양수 범위를 분리하고, 메모 순서는 `zIndex`와 별도로 저장한다.
- 논리 캔버스는 초기 구현에서 `4096 × 4096` CSS px로 고정한다. 메모 너비는 `240..1280`, 높이는 `180..960`이고, X와 Y는 `1` 이상이면서 메모 전체가 캔버스 안에 남는 범위다.
- `48rem` 이상 `72rem` 미만의 메모 작업 영역에서는 오른쪽 보조 내용을 모달로, `72rem` 이상에서는 너비 `22rem`의 나란한 패널로 표시한다. 작은 화면 메모 미리보기는 내용에 따라 짧아지고 `12rem`을 넘지 않는다.
- 일괄 복사 항목 재정렬은 drag를 빠른 방법으로 유지하고, 항목 동작 선택창의 `위치 변경`을 실행한 뒤 삽입 위치를 누르는 단일 pointer 대안을 함께 제공한다.
- 메모 헤더 이동과 빈 캔버스 시점 이동은 시작점에서 mouse 및 pen `5 CSS px`, touch `10 CSS px`를 넘은 뒤에 drag로 판정한다. 모바일 개별 복사와 확인 항목 재정렬의 길게 누르기는 500ms와 `10 CSS px`를 사용한다.
- 삭제 취소 알림은 자동으로 사라지지 않는다. 연속 삭제는 실행 중 LIFO 이력으로 보관하고, 가장 최근 삭제부터 취소하거나 닫을 수 있다.
- 전체 복사의 성공 및 실패 알림도 자동으로 사라지지 않는다. 다음 복사 시도가 같은 영역을 갱신하고 사용자는 직접 닫을 수 있으며, 알림은 포커스를 가져가지 않는다.

## 조사 질문과 범위

이 문서는 [요구사항의 구현 필수 결정](../requirements.md#구현에-적용할-결정-원칙과-기본값)에 필요한 다음 질문을 검토한다.

- 입력을 언제 저장하고 화면 이탈 또는 저장 실패에서 무엇을 복원하는가
- 양의 `tabindex` 요구를 페이지 전체 포커스 순서와 어떻게 함께 적용하는가
- 메모의 유효한 위치 및 크기와 이전 자료의 보정 규칙은 무엇인가
- 메모 겹침 순서와 삭제 취소를 여러 record에서 일관되게 처리하는가
- 모바일 일괄 복사 작업과 저장 목록의 수명을 어떻게 분리하는가
- drag, hover와 길게 누르기에 의존하지 않는 조작을 어떻게 제공하는가
- 속성 패널의 대상, 선택, 입력 오류와 포커스를 어떻게 구분하는가
- 전체 복사 성공 및 실패 알림을 언제 바꾸거나 닫는가

공식 표준 및 플랫폼 문서, 현재 저장 자료형과 화면 코드, 이전에 내려받은 Material 3, Fluent 2, Primer Web 및 Atlassian 디자인 자료를 2026년 9월 2일에 비교했다. 디자인 자료는 팝오버 표면, 짧은 동작 행, 잡은 항목과 삽입 위치의 시각 표현에만 사용했다. 브라우저 이벤트나 자료 수명 규칙의 근거로 사용하지 않았다.

## 자동 저장과 화면 이탈

[React `textarea` 문서](https://react.dev/reference/react-dom/components/textarea)는 제어 입력의 `onChange`에서 입력값을 동기적으로 갱신해야 한다고 설명한다. 따라서 사용자가 보고 있는 초안은 비동기 저장 완료 여부와 분리한다. 저장 응답이 늦게 도착해 더 최신 입력을 덮어쓰지 않도록 메모마다 한 저장 흐름만 진행하고, 완료 뒤 가장 최신 revision을 다시 저장한다.

[Page Visibility API 문서](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)는 문서가 `hidden`이 되는 때를 세션 끝에서 안정적으로 관찰할 수 있는 마지막 시점으로 다룬다. [`pagehide` 문서](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event)는 이를 보완하는 화면 이탈 신호지만 모바일에서 항상 발생하지는 않는다고 설명한다. [`beforeunload` 문서](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event)는 신뢰할 수 있는 저장 시점이 아니고, 필요한 동안만 등록해야 하며 브라우저가 일반 문구만 보여줄 수 있음을 명시한다.

[IndexedDB 3.0](https://www.w3.org/TR/IndexedDB/)과 [`IDBTransaction` 완료 이벤트](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event)에 따라 transaction의 `complete` 전에는 저장 성공으로 표시하지 않는다. 종료 이벤트에서 새 transaction의 완료를 보장할 수 없으므로, 마지막 순간 저장에만 의존하지 않고 `noteDrafts`에 최신 복구 후보를 먼저 기록한다.

800ms는 브라우저 표준이 정한 시간이 아니다. 현재 구현이 입력마다 IndexedDB 쓰기를 시작하는 문제를 줄이면서 짧은 입력 중단 뒤 결과를 보관할 초기 제품값이다. 실제 한국어 입력, 연속 붙여넣기와 메모 20개 이상 환경에서 저장 지연 또는 쓰기 경쟁이 확인되면 측정 결과로 조정한다.

모바일 상세 화면은 명시적 저장을 유지한다. 저장하지 않은 입력을 둔 애플리케이션 내부 이동에는 `계속 편집`과 `변경사항 버리기`를 선택하는 확인 대화상자를 사용한다. 저장 중에는 같은 저장을 다시 시작하지 않고, 실패하면 입력과 복구 초안을 유지한다. 예상하지 못한 새로고침에서는 최신 `noteDrafts`를 다시 제시하며, 초안 자체도 기록되지 않은 짧은 구간에만 `beforeunload` 경고를 사용한다.

## 포커스 순서와 패널

[HTML Living Standard의 포커스 절](https://html.spec.whatwg.org/multipage/interaction.html#the-tabindex-attribute)은 양의 `tabindex`가 작은 값부터 순서대로 모든 `0` 또는 생략된 항목보다 먼저 탐색된다고 정의한다. [MDN `tabindex` 문서](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/tabindex)와 [WAI-ARIA 키보드 인터페이스 지침](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)은 양수 사용을 일반적으로 피하라고 권고한다. 이번 애플리케이션은 메모별 양의 값을 사용한다는 명시적 요구가 있으므로, 메모만 임의의 양수로 두지 않고 페이지 전체 순서를 한곳에서 관리한다.

- 상단 탐색과 새 메모 및 일괄 복사 같은 주 작업 제어는 `1..999`를 DOM 의미 순서대로 사용한다.
- 메모 선택 지점은 저장된 `1000..32767` 값을 사용한다. 새 메모는 현재 최대값 다음 값을 받고, migration은 기존 순서를 안정 정렬한 뒤 `1000`부터 빈틈없이 다시 배정한다.
- 누락, 중복, 정수가 아닌 값, 범위 밖 값은 migration 대상이다. 기존 유효 값, 생성 시각과 ID 순으로 동률을 해소한다.
- 본문, 헤더 아이콘, 패널 입력과 알림 동작은 `tabindex=0` 또는 네이티브 기본값을 사용하고 양수 구간 뒤 DOM 순서로 이동한다.

[WCAG Focus Order 설명](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)에 따라 이 예외 순서가 의미와 조작 가능성을 해치지 않는지 실제 키보드 흐름으로 확인한다. 상단 탐색이나 본문 접근이 불편해지면 양수 요구 자체를 다시 검토하며, `zIndex`를 포커스 순서 대안으로 사용하지 않는다.

선택된 메모에는 얇은 붉은 실선 테두리를, 속성 패널 대상에는 바깥쪽의 중립색 점선 표시를 사용한다. 색과 위치만으로 두 상태를 구분하지 않으며, 패널 머리에는 대상 원문의 첫 비어 있지 않은 줄을 잘라 표시한다. `Enter`로 패널을 연 경우 첫 속성 입력으로 포커스를 옮기고, pointer 더블클릭은 현재 pointer 포커스를 유지한다.

빈 캔버스를 클릭하면 선택을 해제하고 캔버스 viewport로 포커스를 옮긴다. `Escape`는 선택만 해제하고 현재 포커스, 패널 대상과 속성 초안을 유지한다. `Command`를 눌렀을 때 숨겨질 헤더 아이콘에 포커스가 있다면 먼저 같은 메모의 선택 지점으로 옮기고, 그 밖의 포커스는 유지한다.

[WCAG Keyboard 기준](https://www.w3.org/TR/WCAG22/#keyboard)과 [UI Events의 modifier 상태](https://www.w3.org/TR/uievents/#events-keyboard-types)에 따라 pointer 설정을 꺼도 사용할 수 있는 일괄 복사 입력을 별도로 둔다. 포커스가 메모 선택 지점에 있을 때 `Command+Option+Enter`를 누르면 그 메모를 일괄 복사 목록에 추가한다. `Command` keydown이 붉은 선택 테두리와 선택 ID를 먼저 지우므로 명령 대상은 선택 ID가 아니라 현재 포커스가 있는 선택 지점의 메모 ID다. 같은 key sequence에서 개별 복사나 속성 패널 열기를 함께 실행하지 않는다.

최근 활성 오른쪽 패널을 닫으면 이전 패널을 자동으로 다시 열지 않고 아무 패널도 보이지 않는 상태로 간다. 속성 패널 닫기 전에 유효한 변경은 한 번 적용한다. 유효하지 않은 초안은 적용하거나 잃지 않고 패널을 유지하며 첫 오류 입력으로 포커스를 옮긴다. 사용자는 별도의 `저장값으로 되돌리기`로 초안을 버린 뒤 패널을 닫을 수 있다.

항목 동작 선택창은 [HTML Popover API](https://html.spec.whatwg.org/multipage/popover.html)의 `popover="auto"`와 네이티브 `button`을 사용한다. `위치 변경`, `복제`와 `삭제`는 짧은 명령 세 개이므로 선택창을 이름 있는 `role="group"`으로 묶고 일반 `Tab` 및 `Shift+Tab` 순서를 유지한다. [WAI Menu Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)이 요구하는 방향키, `Home`과 `End`를 구현하지 않는 상태에서 `role="menu"`만 붙이지 않는다. 열면 첫 동작으로 포커스를 옮기고 실행, `Escape` 또는 light dismiss로 닫으면 해당 항목의 실행 버튼으로 포커스를 돌려준다. 현재 기능에는 외부 접근성 부품이 필요하지 않다.

## 직접 이동과 길게 누르기 판정값

[Pointer Events Level 4](https://www.w3.org/TR/pointerevents4/)는 pointer event와 capture를 정의하지만 애플리케이션이 click을 drag로 바꿀 이동 거리를 정하지 않는다. [Android `ViewConfiguration`](https://developer.android.com/reference/android/view/ViewConfiguration.html#getScaledTouchSlop())도 잘못된 gesture 판정을 줄이기 위해 실행 환경에 맞춘 touch slop을 사용한다. 따라서 하나의 수치를 모든 입력 장치의 표준값처럼 적용하지 않는다.

Atlassian의 공식 [Pragmatic drag and drop 설계 지침](https://atlassian.design/components/pragmatic-drag-and-drop/design-guidelines/)은 다른 동작이 있는 대상에서 drag 영역과 시작 상태를 구분하라고 안내한다. 같은 프로젝트의 [React Beautiful DnD migration 검사](https://github.com/atlassian/pragmatic-drag-and-drop/blob/d509cb069aabb4830c949877dd3b1da1af14294d/packages/react-beautiful-dnd-migration/__tests__/unit/ported-from-react-beautiful-dnd/unit/integration/_utils/controls.tsx#L12)는 click 흔들림 기준으로 5px를 사용한다. 이 코드는 보편 규격은 아니지만 정밀 pointer의 초기 웹 제품값을 선택할 실제 사례다.

메모 헤더 이동과 빈 캔버스 시점 이동은 시작점부터 유클리드 거리가 mouse 및 pen에서 `5 CSS px`, touch에서 `10 CSS px`를 넘은 첫 이동에서 drag로 판정한다. 기준 안에서 끝난 헤더 입력은 click 후보이고, 빈 캔버스 입력은 선택 해제 click 후보다. 기준을 넘은 뒤에는 같은 pointer 연속 입력의 click과 `dblclick` 결과를 실행하지 않는다. `pointercancel`과 `lostpointercapture`에서는 시작 위치와 시점을 복원한다.

모바일 목록의 개별 복사와 모바일 확인 항목 재정렬은 모두 500ms 동안 시작점에서 `10 CSS px` 안에 머문 경우에만 길게 누르기로 판정한다. 전자는 같은 카드 안의 `pointerup`에서 복사를 완료하고, 후자는 500ms 뒤 drag 가능한 상태로 전환한다. 이 값들은 현재 구현과 Apple 및 Flutter의 0.5초 기본값, touch 이동 허용 사례를 비교한 초기 제품값이며 실제 장치의 운영체제 설정을 읽는 값은 아니다.

## 캔버스, geometry와 겹침 순서

캔버스와 수치 상한은 웹 표준이 정하지 않는다. 현재 코드의 새 메모 `320 × 240`, 직접 크기 변경 최소값 `240 × 180`과 기존 보드 최소 크기를 출발점으로 삼아 논리 캔버스를 `4096 × 4096`으로 고정한다. 초기 허용 범위는 다음과 같다.

- 너비 `240..1280`, 높이 `180..960`
- X `1..(4096 - width)`, Y `1..(4096 - height)`
- `0` 이하, 유한하지 않은 값과 메모를 캔버스 밖으로 보내는 값은 새 입력으로 적용하지 않음
- 이전 자료의 X 또는 Y가 `0`이면 `1`로, 크기와 위치가 범위를 벗어나면 원래 크기와 위치를 가능한 많이 유지하는 쪽으로 보정

자료 migration으로 geometry가 실제로 바뀌면 전체 revision을 한 번 증가시키고 content revision은 유지한다. revision을 안전 정수 범위 안에서 증가시킬 수 없으면 migration을 중단하고 기존 자료를 유지한다. 캔버스가 너무 작거나 모든 메모 맞춤 결과가 지나치게 축소되면 실제 화면 검증을 근거로 상한을 다시 정한다.

[CSS Positioned Layout Level 4](https://www.w3.org/TR/css-position-4/)와 [MDN `z-index` 문서](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/z-index)는 같은 stack level에서 document tree 순서가 결과에 영향을 줄 수 있음을 보여준다. 활성 메모의 `zIndex`는 `1..N`의 고유하고 빈틈없는 순서로 저장한다. 맨 앞 또는 맨 뒤로 보내기는 모든 활성 메모의 상대 순서를 계산한 뒤 한 IndexedDB `readwrite` transaction에서 함께 저장하고, `complete` 뒤에만 화면 결과를 확정한다. 이전 동률은 `zIndex`, 생성 시각과 ID 순으로 해소한다.

## 화면 전환과 목록 미리보기 제품값

[CSS Containment Level 3](https://www.w3.org/TR/css-contain-3/)의 container query는 실제 메모 작업 영역에 맞춘 표현 전환을 가능하게 하고, [WCAG 2.2 Reflow 설명](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)은 확대된 화면에서 정보와 기능이 잘리지 않도록 재배치할 것을 요구한다. 두 자료는 전환 원칙을 제공하지만 특정 `rem` 값을 정하지 않는다.

현재 화면의 공간형 보드 전환값 `48rem`, 오른쪽 패널 너비 `22rem`과 두 영역 사이 여유 `2rem`을 합쳐 `72rem`을 나란한 패널의 초기 전환값으로 채택한다. `48rem` 이상 `72rem` 미만에서는 같은 route의 모달 패널을 사용한다. 이 값은 기존 화면 구성의 너비 예산이며 표준 breakpoint가 아니다.

작은 화면 메모 미리보기는 현재 목록 카드의 `10rem` 최소값을 고정 높이로 유지하지 않는다. 내용에 따라 짧아지되 `12rem`을 상한으로 두면 기본 줄 높이에서 여러 줄을 식별하면서 320 CSS px 화면에 다음 메모가 이어진다는 사실을 보여줄 수 있다. 카드 내부 스크롤 대신 상세 화면에서 전체 원문을 제공한다. `12rem` 역시 초기 제품값이므로 실제 한국어 장문과 글자 확대에서 다시 검증한다.

## 삭제 취소 알림

[WAI-ARIA Alert 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/alert/)은 알림이 사용자 포커스를 가져가지 않아야 하고 너무 빨리 사라지지 않아야 한다고 설명한다. [ARIA `status` role 문서](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/status_role)도 상태 갱신이 포커스를 이동하지 않고 전달되는 방식을 정의한다. 취소가 유일한 복구 수단이므로 삭제 알림에 자동 만료 시간을 두지 않는다.

메모 제거는 IndexedDB transaction 완료 때 활성 자료에서 확정하고, 복원 스냅샷은 현재 실행의 LIFO 이력에 둔다. 가장 최근 삭제 한 건만 중앙 하단 알림에 표시한다. `취소`는 그 메모를 복원하고 다음 이력이 있으면 이어서 보여준다. 명시적인 닫기는 해당 복원 기회를 버리고 다음 이력으로 이동한다. 라우트 이동에서는 유지하지만 새로고침 뒤에는 복원하지 않는다.

삭제된 메모 또는 그 자식이 포커스를 갖고 있었다면 다음 `tabIndex` 메모, 이전 메모, 새 메모 제어 순으로 포커스를 옮긴다. 취소로 메모를 복원하면 복원된 메모 선택 지점으로 포커스를 옮긴다. 알림 자체는 나타날 때 포커스를 가져가지 않는다.

## 전체 복사 알림

[Fluent 2 Toast 지침](https://fluent2.microsoft.design/components/web/react/core/toast/usage)은 동작이 없는 toast를 7초 뒤 닫고 pointer hover 동안 시간을 멈춘다. [WCAG 2.2 Timing Adjustable 설명](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html)은 시간 제한 때문에 정보가 사라질 때 사용자가 같은 정보를 다른 곳에서 확인할 수 있는지를 판정 조건으로 제시한다. [WCAG Status Messages 설명](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)은 성공, 오류와 진행 상태를 포커스를 옮기지 않고 보조 기술에 전달해야 한다고 설명한다.

Clipboard 쓰기 성공 여부는 이 애플리케이션 안의 다른 화면에서 다시 확인할 수 없다. 따라서 전체 복사 성공과 실패는 모두 자동 만료 없이 메모 작업 영역 우측 상단의 한 알림에서 보여준다. 새 복사 시도는 이전 알림 위에 쌓이지 않고 같은 영역의 내용을 바꾼다. 사용자는 알림을 직접 닫을 수 있고, 성공은 정중한 status로 전달하며 실패는 하위 계층이 보존한 API 부재, 권한 거절 또는 그 밖의 쓰기 실패와 가능한 다음 동작을 보여준다. 알림이 나타날 때 현재 포커스를 옮기지 않는다.

## 모바일 일괄 복사 작업

모바일 일괄 복사는 기존 저장 목록을 이어 쓰지 않고 빈 작업 초안으로 시작한다. 예기치 않은 화면 이탈이나 새로고침에서 작업을 잃지 않도록 `mobileBatchCopyDrafts`에 한 개의 활성 초안을 저장한다. 명시적인 헤더 뒤로가기, 확인 페이지의 `취소` 또는 `초기화`만 각각 작업 종료나 항목 초기화를 수행한다.

- 수집 중 짧은 누르기는 항목 추가와 일괄 복사 사용 횟수 증가를 같은 transaction에서 저장한다. 길게 누르기는 개별 복사나 항목 추가를 실행하지 않는다.
- `다음`은 `confirming` 단계와 현재 순서를 먼저 저장한 뒤 확인 페이지로 이동한다.
- 확인 페이지에서 브라우저 뒤로가기는 편집한 순서를 유지한 채 수집 단계로 돌아간다. 다른 애플리케이션 내부 화면을 거치거나 새로고침하면 저장된 단계와 순서를 복원한다.
- 복제는 대상 바로 뒤에 새 ID로 삽입한다. 재정렬, 복제와 삭제는 원본 메모, 저장된 일괄 복사 목록과 사용 횟수를 바꾸지 않는다.
- 전체 복사 성공 뒤에도 확인 페이지와 작업 초안을 유지해 다시 편집하거나 복사할 수 있게 한다.
- 헤더 뒤로가기와 확인 페이지 `취소`는 작업 초안을 지우고 메모 화면의 평상시 상태로 돌아간다.

작업 초안 저장은 사용자가 장기간 유지하려고 만든 저장 목록과 구분한다. 계정 동기화, 여러 활성 모바일 작업 또는 작업 기록 요구가 생기면 한 개의 기기 로컬 초안이라는 전제를 다시 검토한다.

## drag, 길게 누르기와 동작 선택창

[WCAG 2.2 Dragging Movements 설명](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)은 drag로 수행하는 기능에 drag 없이 실행할 수 있는 단일 pointer 방법을 요구한다. 키보드 단축키만 추가해서는 이 조건을 만족하지 않는다. 화면에 순서 번호와 위아래 버튼을 항상 표시하지 않는 요구를 유지하면서 다음 대안을 채택한다.

- 각 항목의 우측 상단 동작 선택창에 `위치 변경`을 둔다.
- `위치 변경`을 누르면 항목 사이에 색과 형태가 구분되는 삽입 위치 버튼을 표시하고, 하나를 누르면 같은 재정렬 명령을 실행한다.
- 넓은 패널에서는 `제거`, 모바일 확인 페이지에서는 `복제`와 `삭제`도 같은 동작 선택창에 둔다.
- 동작 버튼은 pointer hover와 `focus-within`에서 나타나며 hover가 없거나 coarse pointer인 환경에서는 항상 보인다.

[HTML Popover API](https://html.spec.whatwg.org/multipage/popover.html)의 `popover="auto"`로 동작 선택창을 열고 첫 동작으로 포커스를 옮기며, 닫은 뒤 실행 버튼으로 포커스를 돌린다. 선택창은 이름 있는 `role="group"` 안에 일반 네이티브 버튼을 두고 문서 순서의 `Tab` 및 `Shift+Tab`을 사용한다. 방향키 합성 위젯을 제공하지 않는 현재 세 동작에는 `menu`와 `menuitem` 역할을 붙이지 않는다. 내려받은 디자인 자료에서 공통으로 확인한 anchored surface, 짧은 행, 명확한 hover 및 focus 상태를 자체 디자인 토큰으로 구현하고 외부 기본 테마를 그대로 사용하지 않는다.

[Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)은 `pointercancel`과 pointer capture를, [Android의 길게 누른 뒤 drag API](https://developer.android.com/reference/kotlin/androidx/compose/ui/input/pointer/PointerInputScope#detectDragGesturesAfterLongPress(kotlin.Function1,kotlin.Function1,kotlin.Function0,kotlin.Function2))는 길게 누르기와 drag를 하나의 gesture로 합치는 방식을 보여준다. [Apple의 `minimumPressDuration`](https://developer.apple.com/documentation/uikit/uilongpressgesturerecognizer/minimumpressduration)과 [Flutter의 `kLongPressTimeout`](https://api.flutter.dev/flutter/gestures/kLongPressTimeout-constant.html)은 0.5초를 기본값으로 사용한다. 이를 교차검증해 500ms와 10 CSS px의 초기 기준을 채택한다.

500ms 전에 10 CSS px를 넘게 움직이거나 스크롤, `pointercancel`, `lostpointercapture`가 발생하면 drag를 시작하지 않는다. 활성화 뒤에는 잡은 항목과 삽입 위치를 색 이외의 형태 및 깊이 변화로 보여준다. 이 시간과 거리는 웹 표준의 고정값이 아니므로 iOS Safari와 Android Chrome에서 세로 스크롤, 브라우저 선택 메뉴 및 보조 기술과 함께 검증한다.

## 한계와 다시 검토할 조건

- 800ms 자동 저장, 캔버스와 geometry 수치, `72rem` 패널 전환, `12rem` 목록 미리보기 상한, `5 CSS px` 및 `10 CSS px` 이동 기준과 500ms 대기 시간은 현재 코드와 초기 사용자 흐름에 맞춘 제품값이다. 실제 입력 지연, 저장 경쟁, 메모 수, 확대, click 오판정과 화면 맞춤 결과가 예상과 다르면 측정 뒤 변경한다.
- 양의 `tabindex`는 일반 접근성 권장사항의 예외다. 전체 페이지 키보드 탐색이 비논리적이면 메모별 양수 요구를 다시 결정해야 한다.
- 동작 수가 늘어나 방향키로 빠르게 탐색해야 하거나 일반 버튼 묶음이 보조 기술에서 실행 대상과 관계를 전달하지 못하면 `menu` 합성 위젯 또는 검증된 접근성 부품을 다시 검토한다.
- mobile Safari와 Android Chrome의 길게 누르기, 스크롤 및 브라우저 기본 조작 차이는 문서 조사만으로 확정할 수 없다. 실제 기기의 두 브라우저에서 확인한다.
- 삭제 취소를 새로고침 뒤에도 제공하려면 실행 중 이력이 아니라 휴지통 또는 tombstone 자료 설계가 필요하다.
- 계정 동기화와 포트폴리오 연결 백로그는 현재 필수 구현 결정이 아니다. 해당 작업을 시작할 때 같은 절차로 필요한 선택만 교차검증하고 별도 결정 이력을 남긴다.
