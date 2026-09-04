# 데스크톱 입력 상태와 피드백 복원력 조사

## 결론

macOS의 `Shift+Command+5`는 웹 페이지 안에서 끝나는 키 조합이 아니라 운영체제의 화면 캡처 도구를 여는 단축키다. 이 과정에서 웹 페이지가 `Command`의 `keydown`과 대응하는 `keyup`, 창 포커스 변화, 문서 가시성 변화 또는 pointer 연속 입력의 정상 종료를 모두 받는다고 가정할 수 없다. 메모 헤더의 비노출 상태는 짧게 유지하는 화면 상태로만 취급하고, `keyup` 외에도 창이 다시 활성화될 때, 문서가 다시 보일 때와 다음 신뢰할 수 있는 키 또는 pointer 입력에서 event가 알려주는 modifier 상태로 다시 맞춰야 한다. 개별 복사와 일괄 복사의 실행 조건은 오래 유지한 전역 boolean이 아니라 해당 `click` 또는 pointer event의 `metaKey`와 `altKey`를 사용해야 한다. 합성 event는 실제 키 상태를 증명하지 않으므로 복원 근거에서 제외한다.

캔버스 시점 이동은 보이는 변환값과 확정값을 나누더라도 모든 정상 및 중단 종료에서 마지막으로 보인 유효 시점을 보존해야 한다. 운영체제 UI가 pointer 흐름을 중단할 수 있으므로 `pointerup`만 완료로 보고 `pointercancel` 또는 `lostpointercapture`에서 무조건 시작 시점으로 되돌리면 안 된다. 특히 `pointerup` 뒤 user agent가 capture를 자동 해제하면서 보내는 `lostpointercapture`는 정상 완료의 일부일 수 있다. 시작 거리 기준을 넘기지 않은 클릭 후보는 취소할 수 있지만, 이미 이동이 시작돼 화면에 반영된 시점은 마지막 유효 위치를 한 번만 확정한 뒤 제스처 상태만 정리해야 한다.

데스크톱 일괄 복사 패널은 항목의 지속적인 선택, 키보드 포커스, drag의 현재 놓기 후보와 패널 밖 제거 영역을 서로 다른 상태로 표시해야 한다. 항목 본문은 toggle button으로 구성해 클릭, `Enter`와 `Space`로 한 항목만 선택하고 같은 항목을 다시 실행하면 해제한다. 선택은 `aria-pressed`와 메모 선택과 같은 의미의 굵고 끊기지 않는 붉은 테두리로 전달한다. 선택된 항목 본문에 포커스가 있을 때만 `ArrowUp`과 `ArrowDown`으로 한 자리씩 옮기고, 같은 ID의 선택과 포커스를 유지하며 새 위치를 live region으로 알린다. 항목 위에 pointer가 있으면 그 항목 전체가 현재 놓기 후보임을 선택과 다른 테두리 또는 형태 변화로 보여주고, 패널 내부의 목록 여백이나 머리 및 바닥 영역에 놓은 경우에는 제거하지 않는다. 항목 제거는 전체 패널 바깥에 놓았을 때만 실행한다.

아이콘 전용 버튼은 이 애플리케이션에서 평상시 외곽 테두리를 사용하지 않되, hover, pressed와 `focus-visible` 상태까지 없애서는 안 된다. 삭제 아이콘은 위험 동작임을 붉은색과 상태 변화로 구분하고 접근 가능한 이름을 유지한다. 메모 선택 테두리는 네 변과 꼭짓점이 끊기지 않는 굵은 붉은 실선으로 만들고, pointer로 본문을 눌렀을 때 나타나는 브라우저 기본 파란 외곽선은 제거하되 키보드 포커스에는 별도의 고유 `focus-visible` 표시를 제공해야 한다. 모든 표면에 같은 둥근 모서리를 적용하지 않고, 메모, 패널, 목록 항목과 작은 제어의 역할에 따라 모서리 형태를 구분한다.

모든 토스트는 표시된 시점부터 5초 뒤 사라지도록 요구사항이 변경됐다. Radix Toast의 기본 지속 시간과 같은 값이지만, `취소`가 있는 메모 제거 토스트에서는 실행 기회가 여전히 5초로 제한된다. WCAG는 시간 제한 정보나 동작을 다른 곳에서도 이용할 수 없다면 단순히 5초를 제공하는 것으로 충분하다고 보지 않는다. 현재 요구값은 적용하되 토스트가 사라진 뒤에도 삭제 복원을 시작할 영구 위치가 없다는 점을 접근성 위험으로 남겨야 한다. 시각 전환은 짧은 opacity 변화와 작은 위치 이동으로 나타남과 사라짐을 구분하되, `prefers-reduced-motion: reduce`에서는 위치 이동을 없애고 opacity 변화만 사용하거나 전환을 생략하는 방안이 적합하다.

## 조사 질문과 적용 범위

이 조사는 2026년 9월 3일 제공된 데스크톱 화면과 직접 사용 결과를 반영하기 위해 시작했고, 2026년 9월 4일 운영체제가 Meta 입력을 가로채는 경우의 추가 실패 조건을 다시 확인했다.

- 운영체제 화면 캡처 뒤 메모 헤더가 계속 사라진 상태로 남는 원인과 복구 기준
- 운영체제 단축키 뒤 캔버스 시점 이동이 이전 위치로 돌아가지 않게 하는 제스처 종료 기준
- 데스크톱 일괄 복사 패널의 직접 제거, 패널 밖 놓기와 현재 놓기 후보 표현
- 아이콘 버튼, 메모 선택 및 키보드 포커스의 테두리 구분
- 메모 가장자리 크기 조절이 고정된 작은 상한에서 멈추지 않게 하는 geometry 기준
- 5초 토스트의 수명, 나타남 및 사라짐 전환과 reduced motion 대응
- 데스크톱 일괄 복사 항목의 선택, `Escape` 해제와 방향키 재정렬 범위

자료는 2026년 9월 3일과 4일에 확인했다. W3C와 WHATWG의 현재 표준 문서, Apple 지원 문서, Fluent 2와 Radix Primitives의 공식 지침을 우선 사용했다. Radix Toast 문서는 표시된 버전 `1.2.20`을 확인했다. 제공된 화면은 현상과 시각 차이를 파악하는 증거로만 사용했고, 화면 안의 브라우저 확장 기능이나 개발 도구 UI를 애플리케이션 요구로 해석하지 않았다.

## 운영체제 단축키와 `Command` 상태

[Apple의 Mac 화면 캡처 안내](https://support.apple.com/guide/mac-help/take-a-screenshot-mh26782/mac)는 `Shift+Command+5`가 Screenshot 도구를 열고, 이후 사용자가 캡처 종류와 범위를 선택한다고 설명한다. 이 입력은 페이지 안의 기능을 실행하는 단축키가 아니며 운영체제 UI로 조작 주체가 옮겨갈 수 있다.

[UI Events](https://www.w3.org/TR/uievents/)는 user agent가 modifier 상태를 유지하고 각 `MouseEvent`와 `KeyboardEvent`가 `metaKey` 및 `getModifierState()`로 그 event의 상태를 전달하도록 정의한다. 이 표준은 user agent가 페이지로 보낸 event의 순서를 설명할 뿐, 운영체제가 먼저 처리한 단축키의 모든 물리 키 전환을 페이지에 전달한다고 보장하지 않는다. [UI Events KeyboardEvent key Values](https://www.w3.org/TR/uievents-key/)는 Command 계열의 의미 값을 `Meta`로 정의한다. 따라서 왼쪽 또는 오른쪽 물리 키 코드에 의존하지 않고 의미 값과 각 event의 modifier 값을 사용해야 한다. [MDN의 `KeyboardEvent.metaKey` 설명](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/metaKey)은 macOS에서 Meta가 Command 키이며 운영체제가 키를 가로채면 웹 페이지가 이를 감지하지 못할 수 있다고 설명한다.

추가로 [Apple의 Sticky Keys 안내](https://support.apple.com/en-gb/guide/mac-help/mchlae61a6de/mac)는 사용자가 modifier와 다른 키를 동시에 누르지 않고 차례로 입력할 수 있음을, [Apple의 modifier 키 변경 안내](https://support.apple.com/guide/mac-help/change-the-behavior-of-the-modifier-keys-mchlp1011/mac)는 Command를 포함한 modifier의 동작을 다른 키로 바꾸거나 끌 수 있음을 보여준다. 기능은 특정 물리 키의 눌림과 해제 순서를 추측하지 말고 브라우저가 event에 부여한 의미 상태를 따라야 한다.

[Page Visibility Level 2](https://www.w3.org/TR/page-visibility-2/)는 보조 기술이나 다른 애플리케이션이 문서를 가려도 문서가 `visible`로 남을 수 있다고 명시한다. [Window `blur` event 설명](https://developer.mozilla.org/en-US/docs/Web/API/Window/blur_event)과 [Document `visibilitychange` 설명](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)은 각각 창 포커스 상실과 문서 가시성 전환을 다룬다. 이 신호들은 누락된 `keyup`을 보완하지만 Screenshot 도구가 반드시 `blur`나 `hidden`을 만든다는 보장은 없다. 어느 하나도 운영체제 단축키가 끝났다는 단독 증거로 쓰지 않는다.

[DOM Standard의 `isTrusted`](https://dom.spec.whatwg.org/#dom-event-istrusted)는 스크립트로 생성한 event를 신뢰할 수 없는 event로 구분한다. 합성 key 또는 pointer event의 modifier 값으로 헤더 표시 상태를 복원하면 테스트 코드나 확장 기능이 실제 키 상태처럼 동작할 수 있으므로, 화면 상태를 다시 맞추는 입력은 user agent가 전달한 신뢰할 수 있는 event로 제한한다. 복원 규칙은 다음 신호를 함께 사용한다.

- `Meta`의 `keyup`, 창 `blur`와 문서가 `hidden`이 될 때 헤더 비노출 상태를 즉시 끝낸다.
- 창 `focus`와 문서가 다시 `visible`이 될 때 비노출 상태를 초기화한다.
- 다음 신뢰할 수 있는 `keydown`, `keyup`, `pointerdown` 또는 `click`에서 event의 modifier 값을 다시 확인하고 전역 표시 상태가 모순되면 복원한다. `getModifierState()`도 호출한 event의 상태일 뿐 물리 키를 전역에서 조회하는 API로 취급하지 않는다.
- 복사와 일괄 복사 실행 여부는 실제 `click` 또는 pointer event의 `metaKey` 및 `altKey`로 결정한다.
- 운영체제 단축키의 기본 동작을 막기 위해 `preventDefault()`를 호출하지 않는다.

“운영체제가 Meta 입력을 가로채면 웹 페이지가 모든 키 event를 받는다고 가정할 수 없다”는 조건에서 파생되는 추가 이슈는 다음과 같다.

- 페이지가 `Meta`의 `keydown`만 받고 `keyup`을 받지 않는 경우뿐 아니라 두 event를 모두 받지 않는 경우도 있다. 전자는 화면 상태가 멈추는 문제를 만들고, 후자는 애플리케이션이 단축키 시작 자체를 관찰할 수 없으므로 별도 복구 동작을 예약할 근거도 없다.
- 운영체제 UI가 브라우저 위를 덮어도 문서는 계속 `visible`일 수 있고 창 `blur`도 반드시 발생하지 않는다. `visibilitychange`, `blur` 또는 `focus` 하나를 단축키 종료 신호로 간주하면 복구가 누락되거나 조기에 실행될 수 있다.
- `preventDefault()`는 페이지가 실제로 받은 event의 기본 동작에만 영향을 줄 수 있다. 운영체제가 먼저 처리한 화면 캡처 단축키를 취소하거나 누락된 `keyup`을 되살리는 수단이 아니다.
- Apple의 Sticky Keys에서는 modifier를 순서대로 입력할 수 있고 modifier 키 재지정에서는 Command 동작을 바꾸거나 끌 수 있다. 물리적 Command 키를 눌러 둔 전역 상태와 사용자가 의도한 조합을 동일하게 취급하면 접근성 설정에서 헤더 비노출과 복사 조작이 어긋날 수 있다.
- 다음 pointer 또는 click event의 `metaKey`는 그 event가 전달된 순간의 의미 상태만 알려준다. 이전에 빠진 key event의 전체 순서를 복원하지 않으므로, 해당 event로 현재 표시 상태만 다시 맞추고 과거 단축키 동작을 뒤늦게 실행해서는 안 된다.
- 합성 event는 실제 입력을 증명하지 않는다. 자동 검사에서 누락 순서를 재현하는 것은 상태 전이 검증에 유용하지만 실제 macOS 단축키와 브라우저 조합의 성공 근거는 아니다.
- [Keyboard Lock 초안](https://wicg.github.io/keyboard-lock/)은 운영체제가 예약한 키를 immersive fullscreen 웹 애플리케이션이 포착하기 위한 제한적인 API다. 일반 메모 화면에서 시스템 화면 캡처 단축키를 소유하기 위한 수단이 아니며, 지원 여부와 권한에 기대어 현재 복원 규칙을 바꾸지 않는다.

따라서 애플리케이션은 운영체제 단축키의 시작과 종료를 완전하게 관찰하려 하지 않는다. 헤더 비노출은 전달된 신뢰할 수 있는 현재 event에만 반응하는 일시 상태로 만들고, 복사 및 일괄 복사는 해당 실행 event가 실제로 전달됐을 때만 수행한다. 누락된 event가 있더라도 다음 신뢰할 수 있는 입력에서 화면 상태를 현재 modifier 값과 맞추되, 클립보드 쓰기나 선택 변경 같은 과거 동작을 추정해 실행하지 않는다.

현재 [`notes-collection.tsx`](../../../../apps/notes/src/_pages/notes/ui/notes-collection.tsx)는 `Meta` keydown에서 헤더 비노출 상태를 만들고 keyup, 창 `blur`와 문서 `hidden`에서만 초기화한다. 제공된 재현 결과는 이 조합만으로 실제 macOS 화면 캡처 흐름을 복구하지 못했음을 보여준다. 정확히 어느 event가 누락됐는지는 브라우저와 macOS 버전별 event trace 없이 확정할 수 없다. 자동 검사는 reducer 수준의 누락 순서와 다음 신뢰할 수 있는 입력에 따른 복원을 검증할 수 있지만, 운영체제가 단축키를 가로채는 실제 결과까지 증명하지 못한다. 후속 구현에서는 비공개 디버그 출력이나 상시 로그를 추가하지 않고 실제 브라우저 자동화와 수동 화면 캡처 절차를 나눠 최종 상태를 검증해야 한다.

## pointer 중단과 캔버스 시점 확정

[Pointer Events](https://www.w3.org/TR/pointerevents/)는 user agent가 이후 pointer event를 페이지에 계속 전달하지 않을 상황을 감지하면 `pointercancel`을 보내도록 정한다. 같은 표준은 `pointerup` 또는 `pointercancel` 바로 뒤 implicit pointer capture를 해제하고 `lostpointercapture`를 보내도록 요구한다. 따라서 `lostpointercapture` 자체는 취소의 동의어가 아니며, 이미 `pointerup`으로 확정한 결과를 뒤집으면 정상 drag도 되돌아갈 수 있다.

[Pointer Events 3의 버튼 상태](https://www.w3.org/TR/pointerevents3/#button-states)는 `buttons`를 현재 눌린 버튼의 bitmask로 정의하고, [`pressure`](https://www.w3.org/TR/pointerevents3/#dom-pointerevent-pressure)를 활성 버튼이 없는 상태에서는 `0`으로 정한다. 주 버튼으로 시작한 mouse 또는 pen pan에서 후속 `pointermove`의 주 버튼 bit가 사라지고 `pressure`도 `0`이면 화면은 종료 event가 빠진 상태를 그대로 유지해서는 안 된다. 한 속성만으로 정상 drag를 취소하지 않고 두 상태를 함께 확인한 뒤, 그 pointer 이동 좌표를 시점에 반영하지 않고 활성 제스처만 끝내는 보조 종료 조건으로 사용한다.

Excalidraw의 고정 revision `214cd6e`는 [`pointerup`이 빠지는 경우를 정리하는 함수](https://github.com/excalidraw/excalidraw/blob/214cd6e6e8ac3ad6b68486aa7aa7241abdf9445f/packages/excalidraw/components/App.tsx#L8965-L8973)를 두고 [창 `focus`](https://github.com/excalidraw/excalidraw/blob/214cd6e6e8ac3ad6b68486aa7aa7241abdf9445f/packages/excalidraw/components/App.tsx#L3925-L3933)와 다음 pointer 시작에서 이를 실행한다. 구현 규모와 자료 구조는 이 애플리케이션과 다르지만, 종료 event 하나를 전제로 두지 않고 재진입 및 다음 시작에서 남은 제스처를 정리하는 실제 공개 사례다.

현재 [`notes-board.tsx`](../../../../apps/notes/src/_pages/notes/ui/notes-board.tsx)는 이동 중 화면에 새 시점을 표시하지만 `pointercancel`과 `lostpointercapture`를 같은 취소 handler에 연결해 제스처 시작 시점으로 되돌린다. 따라서 이동이 시작된 뒤 capture가 중단되면 사용자가 이미 본 시점도 취소된다. 화면 캡처 뒤의 정확한 event 순서는 별도로 재현해야 하지만, 이 복원 규칙은 보고된 “이동 뒤 이전 시점으로 돌아감”을 만들 수 있는 직접적인 저장소 근거다.

후속 구현은 하나의 pan 제스처를 다음 상태로 구분해야 한다.

- 거리 기준 전: 빈 캔버스 클릭 후보이며 취소하면 시점을 바꾸지 않는다.
- 거리 기준을 넘긴 뒤: pan이 시작됐으며 각 유효한 이동의 마지막 시점을 화면과 확정값에 함께 반영한다.
- `pointerup`: 마지막 유효 시점을 한 번 확정하고 제스처 상태와 capture만 정리한다.
- `pointercancel`, 완료 전의 `lostpointercapture`, 창 `blur`와 문서 `hidden`: pan 시작 전이면 원래 시점을 유지하고, 시작 뒤이면 마지막으로 표시한 유효 시점을 유지한 채 제스처만 끝낸다.
- 창 `focus`, `pageshow`와 문서가 다시 `visible`이 되는 경우에도 이전 제스처를 이어가지 않는다. 같은 시점을 유지한 채 남은 제스처를 정리한다.
- mouse 또는 pen의 `pointermove`에서 주 버튼 bit가 사라지고 `pressure`도 `0`이면 그 좌표를 반영하지 않고 제스처를 끝낸다. 다음 hover가 이전 시작점을 기준으로 pan을 재개해서는 안 된다.
- 새 `pointerdown`은 남은 제스처를 먼저 정리한 뒤 별도 시작점으로 기록한다.
- 확정과 정리는 여러 종료 event가 이어져도 같은 결과를 한 번만 적용하는 전이로 만든다. `pointerup` 뒤의 `lostpointercapture`는 이미 완료한 결과를 되돌리거나 다시 저장하지 않는다.
- 명시적으로 capture를 해제할 때는 해당 pointer가 활성 상태이고 `hasPointerCapture(pointerId)`가 참인지 확인한다. 표준상 활성 pointer가 아닌 ID로 `releasePointerCapture()`를 호출하면 `NotFoundError`가 발생할 수 있다.

완료 검증은 `Shift+Command+5`를 눌러 Screenshot 도구를 열었다가 닫은 뒤 새 캔버스 drag를 수행하고, pointer를 놓은 뒤와 문서 포커스를 바꿨다가 돌아온 뒤에도 같은 시점이 유지되는지를 확인해야 한다.

## 일괄 복사 항목 drag와 제거 범위

[HTML Standard의 drag and drop 처리](https://html.spec.whatwg.org/multipage/dnd.html)는 `dragenter`가 놓기를 받아들일 후보를 알리고 `dragover`가 사용자에게 보일 피드백을 정하도록 한다. 현재 구현은 네이티브 HTML drag and drop 대신 Pointer Events로 같은 과업을 만들지만, pointer 아래의 현재 후보와 허용되지 않는 영역을 구분해 보여줘야 한다는 원리는 같다.

현재 [`batch-copy-list.tsx`](../../../../apps/notes/src/features/edit-batch-copy/ui/batch-copy-list.tsx)는 `<ol>`의 경계를 벗어나면 `outside`로 판정한다. 이 기준은 같은 패널 안의 목록 여백, 머리와 바닥도 제거 영역으로 만들 수 있다. 제거 기준은 목록이 아니라 일괄 복사 패널 전체의 화면 경계로 바꿔야 한다.

데스크톱 패널의 결과 규칙은 다음과 같다.

- drag 중 pointer가 다른 항목 위에 있으면 그 항목 전체에 현재 놓기 후보 테두리와 형태 변화를 표시한다.
- 현재 놓기 후보는 선택 상태와 같은 의미가 아니므로 접근성 상태 이름과 내부 자료를 메모 선택에 재사용하지 않는다.
- pointer가 항목 사이 또는 패널 내부 여백에 있으면 가장 가까운 유효 삽입 위치를 유지하고 제거 예정 상태를 표시하지 않는다.
- pointer가 패널 전체를 벗어났을 때만 제거 예정 상태를 표시하고, 그 상태에서 정상적으로 놓았을 때만 항목을 제거한다.
- `Escape`, `pointercancel`과 `lostpointercapture`에서는 항목을 제거하지 않고 원래 순서로 돌아간다.

[WCAG 2.2 Dragging Movements 설명](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)은 drag로 수행하는 기능에 drag가 아닌 단일 pointer 대안을 요구한다. 현재 요구사항은 데스크톱 패널의 동작 선택창과 `위치 변경`을 제거한다. 키보드 drag 조작은 남길 수 있지만 키보드만으로 이 성공 기준의 단일 pointer 대안을 충족하지는 않는다. 이 충돌은 숨기지 않고 후속 접근성 검토의 알려진 제한으로 남겨야 하며, 모바일 확인 페이지의 `위치 변경`, `복제`, `삭제` 동작 선택창에는 이번 변경을 적용하지 않는다.

## 일괄 복사 항목 선택과 방향키 재정렬

[WAI-ARIA Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)은 toggle button의 눌림 상태를 `aria-pressed`로 전달하고 상태가 바뀌어도 접근 가능한 이름을 유지하며 `Enter`와 `Space`로 실행하도록 안내한다. 항목의 텍스트 부분을 네이티브 `button type="button"`으로 만들고 `aria-pressed`를 선택 상태에 연결하면 pointer와 키보드가 같은 한 항목 선택 명령을 사용할 수 있다. 우측 상단 삭제 버튼은 항목 본문 버튼의 자식으로 중첩하지 않고 같은 목록 항목 안의 형제 제어로 둬야 한다.

[WAI-ARIA Listbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)은 listbox의 방향키가 선택 또는 포커스 이동에 쓰인다고 정한다. 이번 요구의 방향키는 항목 자체를 재정렬하므로 `listbox`와 `option` 역할을 붙이면 역할이 예고하는 키보드 동작과 실제 결과가 어긋난다. 일반 목록 안의 toggle button을 쓰고 선택된 항목 본문에 포커스가 있을 때만 `ArrowUp`과 `ArrowDown`을 재정렬로 해석하는 편이 정확하다. 해당 제어에는 키보드 설명과 `aria-keyshortcuts`를 제공하고, 이동 뒤 같은 항목에 포커스를 유지하며 `새 위치 n / 전체`를 정중한 live region으로 알린다.

[WAI-ARIA 키보드 인터페이스 지침](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)은 포커스와 선택이 서로 다른 상태이며 pointer 조작 뒤에도 포커스 모델이 일관돼야 한다고 설명한다. 이에 따라 다음 상태를 분리한다.

- 메모 선택과 일괄 복사 항목 선택은 서로 다른 ID로 보관하고 동시에 존재할 수 있다.
- 일괄 복사 항목은 한 번에 하나만 선택한다. 다른 항목을 실행하면 선택을 옮기고 같은 항목을 다시 실행하면 해제한다.
- 항목 drag를 시작하면 drag 대상 ID를 선택하되 drag 중 놓기 후보 ID는 선택 ID로 바꾸지 않는다. 재정렬 뒤에도 같은 ID의 선택과 포커스를 유지한다.
- 상위 임시 조작이 없을 때 `Escape`는 메모와 일괄 복사 항목 선택을 함께 해제한다. drag 취소나 열린 popover 닫기처럼 더 직접적인 `Escape` 대상이 있으면 이를 먼저 처리하고 다음 `Escape`가 선택을 해제한다.
- 모달 일괄 복사 패널에서는 선택이 있으면 첫 `Escape`가 선택만 해제하고 모달을 유지한다. 선택이 없는 다음 `Escape`가 WAI-ARIA dialog의 닫기 동작을 수행한다.
- `ArrowUp`과 `ArrowDown`은 선택된 항목 본문에 DOM 포커스가 있을 때만 기본 스크롤을 막고 한 자리 이동을 실행한다. 삭제 버튼, 입력이나 다른 하위 제어에서는 가로채지 않는다. 목록 처음과 끝에서는 자료를 바꾸지 않는다.

[WCAG 2.2 Keyboard](https://www.w3.org/TR/WCAG22/#keyboard)은 모든 기능을 특정 입력 시간에 의존하지 않는 키보드 인터페이스로 실행할 수 있어야 한다고 요구한다. 방향키 재정렬은 drag와 같은 순수 재정렬 명령을 사용해야 하며 key repeat 한 번마다 여러 위치를 건너뛰지 않도록 event당 한 자리 이동을 적용한다. 다만 방향키가 일반적인 목록 탐색이 아니라 재정렬을 실행하는 비표준 선택이므로 화면 읽기 프로그램과 브라우저 조합에서 설명, 포커스 유지와 live announcement를 직접 확인해야 한다.

## 아이콘, 모서리, 선택과 포커스

[Fluent 2 Button 지침](https://fluent2.microsoft.design/components/web/react/core/button/usage)은 보조 동작이 많은 화면에서 outline, subtle 또는 transparent 외형으로 시각적 혼잡을 줄일 수 있고, 버튼의 아이콘은 모든 상호작용 상태에서 배경과 3:1 대비가 필요하다고 설명한다. [Carbon Button 지침](https://carbondesignsystem.com/components/button/usage/)은 시각 비중이 가장 낮은 동작에 ghost 버튼을 사용하며 삭제에는 danger ghost 변형도 사용할 수 있다고 설명한다. 두 자료 모두 모든 아이콘 버튼에 테두리가 필요하다고 보지 않지만, 동작의 비중과 위험 정도에 따른 상태 표현은 유지한다.

따라서 이 애플리케이션의 아이콘 전용 버튼은 평상시 테두리를 없애고 hover 및 pressed 배경, 아이콘 색과 `focus-visible` 표시로 동작 가능 상태를 전달한다. 데스크톱 일괄 복사 항목의 우측 상단에는 action 또는 overflow 버튼을 두지 않고, 항목 제거만 실행하는 붉은 아이콘 버튼을 둔다. pointer 환경에서는 항목 hover 때 나타나고, 키보드로 버튼에 도달했을 때에는 포커스 표시와 함께 보여야 한다. 아이콘은 장식으로 숨기고 버튼에는 `일괄 복사 항목 제거`처럼 결과를 말하는 접근 가능한 이름을 준다.

[WCAG 2.2 Focus Appearance 설명](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)은 키보드 포커스가 충분한 면적과 인접 색 대비로 보이도록 요구한다. pointer로 편집 본문을 누를 때 브라우저 기본 파란 outline을 그대로 남기면 메모 선택용 붉은 테두리와 경쟁하지만, 전역 `outline: none`으로 없애면 키보드 사용자가 현재 위치를 잃는다. pointer focus에서는 기본 파란 outline을 표시하지 않고, `:focus-visible`에서는 자체 디자인 시스템의 외곽선을 표시해야 한다.

제공된 선택 화면에서는 붉은 테두리가 메모 본문 둘레에만 보이고 위쪽 헤더 및 꼭짓점에서 끊긴다. 선택 표시는 메모 전체 wrapper의 네 변과 네 꼭짓점을 감싸고 일반 경계보다 굵어야 한다. resize 지점과 header가 테두리를 덮거나 잘라내지 않아야 하며, 별도의 키보드 포커스 표시와 동시에 구분할 수 있어야 한다.

모서리 반경은 하나의 전역 관례로 모든 표면에 반복하지 않는다. 메모 및 패널의 큰 외곽, 목록 항목, 입력과 아이콘 버튼은 서로 다른 역할을 가지므로 필요한 곳만 작은 반경을 사용하고, 원형 또는 pill 형태는 상태 badge나 원형 조작처럼 그 형태가 뜻을 전달하는 경우로 제한한다. 이는 모든 요소를 직각으로 만들라는 뜻이 아니라, 역할과 무관한 동일 반경 반복을 금지한다는 뜻이다.

## 메모 크기 조절 범위

현재 [`note.ts`](../../../../apps/notes/src/entities/note/model/note.ts)는 메모 높이를 `180..960`, 너비를 `240..1280` CSS px로 제한한다. 이 고정 상한은 캔버스 안에 공간이 남아 있어도 위쪽 가장자리 drag가 일정 크기에서 멈추게 한다. 후속 요구사항은 지나치게 큰 값만 제한하되 위쪽 가장자리 drag가 현재 상한에서 조기에 멈추지 않도록 변경했다.

초기 논리 캔버스가 `4096 × 4096` CSS px로 고정돼 있으므로 별도의 작은 고정 최댓값보다 캔버스 경계를 상한으로 사용하는 편이 현재 요구와 맞는다. 위쪽 가장자리를 움직일 때는 아래쪽 변을 고정하고 `y`가 1보다 작아지지 않는 범위에서 높이를 계속 늘린다. 왼쪽, 오른쪽과 아래쪽도 반대편 변을 고정한 같은 geometry 규칙을 사용한다. 최소 너비 `240`과 최소 높이 `180`은 유지한다.

이 선택은 메모를 캔버스보다 크게 만들 수 있다는 뜻이 아니다. 상한은 메모의 반대쪽 변과 캔버스 경계에서 계산하며, 속성 패널의 수치 입력과 pointer resize가 같은 검증 명령을 사용해야 한다. 캔버스 크기 자체를 바꾸는 기능은 이번 범위에 포함하지 않는다.

## 5초 토스트와 motion

[Fluent 2 Toast 지침](https://fluent2.microsoft.design/components/web/react/core/toast/usage)은 토스트를 중요하지 않은 일시적 정보에 사용하고, 동작이 없는 시간제 토스트의 예시로 7초를 제시한다. 필요한 동작은 토스트에 두지 말라고 권하며 pointer hover에서는 시간을 멈추는 방식을 설명한다. [Radix Toast `1.2.20` 문서](https://www.radix-ui.com/primitives/docs/components/toast)는 Provider의 기본 지속 시간을 5000ms로 정하고, hover, focus와 창 `blur`에서 타이머를 멈추며 토스트 동작은 무시해도 안전해야 한다고 안내한다. 사용자 응답이 반드시 필요하면 alert dialog 같은 지속적인 수단을 사용하도록 구분한다.

[WCAG 2.2 Timing Adjustable 이해 문서](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html)는 5초 toast가 사라지더라도 같은 정보와 기능을 다른 위치에서 다시 사용할 수 있는 사례를 통과 예시로 든다. 5초라는 수치 자체가 시간 제한을 면제하는 것이 아니다. 메모 삭제의 `취소`를 토스트에서만 제공하는 현재 요구는 토스트가 사라진 뒤 같은 기능을 실행할 곳이 없으므로 이 예시의 조건을 충족하지 않는다.

5초 조건을 적용하면 다음 결과를 분명히 해야 한다.

- 모든 토스트는 표시 시점부터 5초 뒤 화면과 접근성 트리에서 제거한다.
- 새 토스트가 같은 위치의 이전 토스트를 바꾸면 새 내용이 나타난 시점부터 5초를 다시 센다.
- 메모 제거 토스트의 `취소`도 5초 동안만 화면에서 실행할 수 있다. 현재 실행에 남기는 제거 이력과 키보드 복원 동작이 토스트 종료 뒤에도 가능한지는 별도 요구가 없으므로 후속 계획에서 임의로 확장하지 않는다.
- 토스트는 현재 키보드 포커스를 가져가지 않고 성공 및 실패의 `aria-live` 우선순위를 구분한다.

Radix는 열림 및 닫힘 상태에 CSS animation을 적용하고 swipe 취소에는 200ms `ease-out`, swipe 종료에는 100ms `ease-out` 예시를 제공한다. 이번 애플리케이션은 swipe 닫기를 요구하지 않으므로 해당 제스처를 복제하지 않고, 같은 상태 구분 방식을 자체 토스트에 적용할 수 있다. 나타날 때는 짧은 opacity 증가와 화면 가장자리에서 안쪽으로 향하는 작은 이동, 사라질 때는 더 짧은 opacity 감소를 사용하면 고정 위치를 잃지 않으면서 변화를 알릴 수 있다.

[Media Queries Level 5의 `prefers-reduced-motion`](https://drafts.csswg.org/mediaqueries-5/#prefers-reduced-motion)과 [MDN 설명](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion)은 사용자가 불필요한 움직임을 줄이도록 설정한 상태를 CSS에서 확인할 수 있게 한다. 이 상태에서는 위치 이동을 제거하고 opacity만 짧게 바꾸거나 전환 없이 상태를 교체해야 한다. 정확한 거리와 시간은 기존 motion token과 실제 화면 검증을 거쳐 결정 기록에 남겨야 한다.

## 요구사항과 계획에 미치는 영향

요구사항에는 다음 결과를 직접 반영한다.

- `Shift+Command+5` 뒤 별도 Command 입력 없이 헤더가 복원되고 이후 modifier 복사가 정상 작동한다.
- 시스템 UI가 pointer 또는 focus 흐름을 중단해도 이미 이동한 캔버스 시점이 시작 위치로 돌아가지 않는다.
- 데스크톱 일괄 복사 패널은 action 또는 overflow 선택창 없이 hover 및 키보드 포커스에서 직접 제거 버튼을 제공한다.
- 패널 내부 drop은 재정렬 또는 취소로 끝나고 패널 바깥 drop만 제거한다.
- drag 중 다른 항목이 현재 놓기 후보임을 색 이외의 변화로 보여준다.
- 데스크톱 일괄 복사 항목은 클릭, `Enter`와 `Space`로 하나를 선택하고 같은 의미의 붉은 테두리를 표시한다. 선택된 항목 본문의 `ArrowUp`과 `ArrowDown`은 한 자리 재정렬을 실행한다.
- 상위 임시 조작이 없을 때 `Escape`는 메모와 일괄 복사 항목 선택을 함께 해제하되 저장 자료와 패널 상태를 바꾸지 않는다.
- pointer로 메모 본문을 누를 때 브라우저 기본 파란 outline은 보이지 않고 키보드 `focus-visible`은 자체 표시로 남는다.
- 선택 테두리는 메모 전체 네 변과 꼭짓점에서 끊기지 않는 굵은 붉은 실선이다.
- 위쪽을 포함한 네 가장자리와 네 꼭짓점 resize는 작은 고정 상한에서 조기에 멈추지 않고 캔버스 경계까지 계산한다.
- 모든 토스트는 5초 뒤 사라진다.

현재 `plan.md`에서 메모 상호작용, 일괄 복사 패널, 디자인 시스템과 브라우저 통합 검증 단위가 영향을 받는다. 요구사항 변경 커밋 뒤 해당 작업 단위는 새 기준으로 계획을 다시 검토하기 전까지 완료로 판단하면 안 된다. 이 조사 문서는 계획을 대신하지 않으며 구현 및 테스트 완료를 증명하지 않는다.

## 제한과 다시 검토할 조건

- 제공된 화면만으로 macOS와 브라우저가 실제로 보낸 event 순서를 확정할 수 없다. 지원할 macOS 및 브라우저 조합에서 `Shift+Command+5`, 캡처 취소와 완료를 각각 직접 검증해야 한다.
- 운영체제 단축키를 웹 자동화만으로 완전히 재현하기 어렵다면 수동 검증 절차를 보완하되, 저장소에 일회성 fixture나 디버그 스크립트를 남기지 않아야 한다.
- 데스크톱 `위치 변경` 단일 pointer 대안을 제거하면 WCAG 2.2 Dragging Movements와 충돌할 수 있다. 접근성 목표를 유지하려면 사용자 요구를 바꾸거나 drag 없이 같은 결과를 만드는 다른 단일 pointer 조작을 별도로 승인해야 한다.
- 5초 뒤 사라지는 제거 토스트에만 복원 동작을 두면 느린 입력, 확대 또는 보조 기술 사용자가 시간을 놓칠 수 있다. 현재 5초 조건을 유지하면서 복원을 보장해야 한다면 별도의 영구 실행 취소 위치나 더 긴 이력 접근 방법을 요구사항에 추가해야 한다.
- `ArrowUp`과 `ArrowDown`을 항목 재정렬에 쓰는 방식은 일반 listbox 탐색과 다르다. 접근 가능한 설명, 화면 읽기 프로그램의 실제 발화와 key repeat 결과를 검증하지 못하면 더 명시적인 키보드 재정렬 상태를 다시 검토해야 한다.
- motion의 정확한 거리와 시간은 현재 요구사항에서 정하지 않았다. 시각 검증 전에 임의의 여러 값을 화면마다 만들지 말고 공통 토큰 하나를 결정해야 한다.
