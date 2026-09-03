# 데스크톱 입력 상태와 피드백 복원력 조사

## 결론

macOS의 `Shift+Command+5`는 웹 페이지 안에서 끝나는 키 조합이 아니라 운영체제의 화면 캡처 도구를 여는 단축키다. 이 과정에서 웹 페이지가 `Command`의 `keydown`과 대응하는 `keyup`, 창 포커스 변화, 문서 가시성 변화 또는 pointer 연속 입력의 정상 종료를 모두 받는다고 가정할 수 없다. 메모 헤더의 비노출 상태는 짧게 유지하는 화면 상태로만 취급하고, `keyup` 외에도 창이 다시 활성화될 때, 문서가 다시 보일 때와 다음 신뢰할 수 있는 키 또는 pointer 입력에서 실제 modifier 상태를 다시 확인해 복원해야 한다. 개별 복사와 일괄 복사의 실행 조건은 오래 유지한 전역 boolean이 아니라 해당 `click` 또는 pointer event의 `metaKey`와 `altKey`를 사용해야 한다.

캔버스 시점 이동은 보이는 변환값과 확정값을 나누더라도 모든 정상 및 중단 종료에서 마지막으로 보인 유효 시점을 보존해야 한다. 운영체제 UI가 pointer 흐름을 중단할 수 있으므로 `pointerup`만 완료로 보고 `pointercancel` 또는 `lostpointercapture`에서 무조건 시작 시점으로 되돌리면 안 된다. 시작 거리 기준을 넘기지 않은 클릭 후보는 취소할 수 있지만, 이미 이동이 시작돼 화면에 반영된 시점은 마지막 유효 위치를 확정한 뒤 제스처 상태만 정리해야 한다.

데스크톱 일괄 복사 패널은 항목 drag의 현재 놓기 후보와 패널 밖 제거 영역을 서로 다른 상태로 표시해야 한다. 항목 위에 pointer가 있으면 그 항목 전체가 현재 놓기 후보임을 색 이외의 테두리 또는 형태 변화로 보여주고, 패널 내부의 목록 여백이나 머리 및 바닥 영역에 놓은 경우에는 제거하지 않는다. 항목 제거는 전체 패널 바깥에 놓았을 때만 실행한다.

아이콘 전용 버튼은 이 애플리케이션에서 평상시 외곽 테두리를 사용하지 않되, hover, pressed와 `focus-visible` 상태까지 없애서는 안 된다. 삭제 아이콘은 위험 동작임을 붉은색과 상태 변화로 구분하고 접근 가능한 이름을 유지한다. 메모 선택 테두리는 네 변과 꼭짓점이 끊기지 않는 굵은 붉은 실선으로 만들고, pointer로 본문을 눌렀을 때 나타나는 브라우저 기본 파란 외곽선은 제거하되 키보드 포커스에는 별도의 고유 `focus-visible` 표시를 제공해야 한다. 모든 표면에 같은 둥근 모서리를 적용하지 않고, 메모, 패널, 목록 항목과 작은 제어의 역할에 따라 모서리 형태를 구분한다.

요구사항 책임자는 모든 토스트가 표시된 시점부터 3초 뒤 사라지도록 변경했다. 이는 동작이 없는 확인 토스트에는 적용하기 쉽지만, `취소`가 있는 메모 제거 토스트에서는 실행 기회가 3초로 제한된다. Fluent와 Radix는 동작이 필요한 토스트에 더 긴 시간이나 다른 복구 수단을 권하므로 이 차이를 접근성 위험으로 남겨야 한다. 시각 전환은 짧은 opacity 변화와 작은 위치 이동으로 나타남과 사라짐을 구분하되, `prefers-reduced-motion: reduce`에서는 위치 이동을 없애고 opacity 변화만 사용하거나 전환을 생략하는 방안이 적합하다.

## 조사 질문과 적용 범위

이 조사는 2026년 9월 3일 요구사항 책임자가 제공한 데스크톱 화면과 직접 사용 결과를 다음 요구사항에 반영하기 위해 수행했다.

- 운영체제 화면 캡처 뒤 메모 헤더가 계속 사라진 상태로 남는 원인과 복구 기준
- 운영체제 단축키 뒤 캔버스 시점 이동이 이전 위치로 돌아가지 않게 하는 제스처 종료 기준
- 데스크톱 일괄 복사 패널의 직접 제거, 패널 밖 놓기와 현재 놓기 후보 표현
- 아이콘 버튼, 메모 선택 및 키보드 포커스의 테두리 구분
- 메모 가장자리 크기 조절이 고정된 작은 상한에서 멈추지 않게 하는 geometry 기준
- 3초 토스트의 수명, 나타남 및 사라짐 전환과 reduced motion 대응

자료는 2026년 9월 3일에 확인했다. W3C와 WHATWG의 현재 표준 문서, Apple 지원 문서, Fluent 2와 Radix Primitives의 공식 지침을 우선 사용했다. Radix Toast 문서는 표시된 버전 `1.2.20`을 확인했다. 요구사항 책임자가 제공한 화면은 현상과 시각 차이를 파악하는 증거로만 사용했고, 화면 안의 브라우저 확장 기능이나 개발 도구 UI를 애플리케이션 요구로 해석하지 않았다.

## 운영체제 단축키와 `Command` 상태

[Apple의 Mac 화면 캡처 안내](https://support.apple.com/guide/mac-help/take-a-screenshot-mh26782/mac)는 `Shift+Command+5`가 Screenshot 도구를 열고, 이후 사용자가 캡처 종류와 범위를 선택한다고 설명한다. 이 입력은 페이지 안의 기능을 실행하는 단축키가 아니며 운영체제 UI로 조작 주체가 옮겨갈 수 있다.

[UI Events](https://www.w3.org/TR/uievents/)는 각 `MouseEvent`와 `KeyboardEvent`의 `metaKey`가 그 event에서 Meta modifier를 활성 상태로 볼지를 나타낸다고 정의한다. [MDN의 `KeyboardEvent.metaKey` 설명](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/metaKey)은 macOS에서 Meta가 Command 키이며 운영체제가 키를 가로채면 웹 페이지가 이를 감지하지 못할 수 있다고 명시한다. 따라서 한 번 받은 `keydown`을 이후 모든 event의 modifier 상태로 대신할 수 없다.

[Window `blur` event 설명](https://developer.mozilla.org/en-US/docs/Web/API/Window/blur_event)은 창이 포커스를 잃는 상태를, [Document `visibilitychange` 설명](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)은 탭 전환, 최소화와 애플리케이션 전환 등으로 문서가 `hidden`이 되는 상태를 다룬다. 두 신호는 누락된 `keyup`을 보완하지만 모든 운영체제 UI가 같은 순서로 둘 다 발생시킨다는 보장은 없다. 복원 규칙은 한 event 쌍에 의존하지 않고 다음을 함께 사용해야 한다.

- `Meta`의 `keyup`, 창 `blur`와 문서가 `hidden`이 될 때 헤더 비노출 상태를 즉시 끝낸다.
- 창 `focus`와 문서가 다시 `visible`이 될 때 비노출 상태를 초기화한다.
- 다음 신뢰할 수 있는 `keydown`, `keyup`, `pointerdown` 또는 `click`에서 event의 modifier 값을 다시 확인하고 전역 표시 상태가 모순되면 복원한다.
- 복사와 일괄 복사 실행 여부는 실제 `click` 또는 pointer event의 `metaKey` 및 `altKey`로 결정한다.
- 운영체제 단축키의 기본 동작을 막기 위해 `preventDefault()`를 호출하지 않는다.

현재 [`notes-collection.tsx`](../../../../apps/notes/src/_pages/notes/ui/notes-collection.tsx)는 `Meta` keydown에서 헤더 비노출 상태를 만들고 keyup, 창 `blur`와 문서 `hidden`에서만 초기화한다. 제공된 재현 결과는 이 조합만으로 실제 macOS 화면 캡처 흐름을 복구하지 못했음을 보여준다. 정확히 어느 event가 누락됐는지는 브라우저와 macOS 버전별 event trace 없이 확정할 수 없으므로, 후속 구현에서는 비공개 디버그 출력이나 상시 로그를 추가하지 않고 실제 브라우저 자동화와 수동 화면 캡처 절차로 최종 상태를 검증해야 한다.

## pointer 중단과 캔버스 시점 확정

[Pointer Events](https://www.w3.org/TR/pointerevents/)는 user agent가 이후 pointer event를 페이지에 계속 전달하지 않을 상황을 감지하면 `pointercancel`을 보내도록 정하고, pointer capture가 해제되면 `lostpointercapture`가 발생한다고 정의한다. 운영체제 UI, 브라우저의 pan 및 zoom 처리와 입력 장치 변화가 정상적인 `pointerup` 이외의 종료를 만들 수 있다.

현재 [`notes-board.tsx`](../../../../apps/notes/src/_pages/notes/ui/notes-board.tsx)는 이동 중 화면에 새 시점을 표시하지만 `pointercancel`과 `lostpointercapture`를 같은 취소 handler에 연결해 제스처 시작 시점으로 되돌린다. 따라서 이동이 시작된 뒤 capture가 중단되면 사용자가 이미 본 시점도 취소된다. 화면 캡처 뒤의 정확한 event 순서는 별도로 재현해야 하지만, 이 복원 규칙은 보고된 “이동 뒤 이전 시점으로 돌아감”을 만들 수 있는 직접적인 저장소 근거다.

후속 구현은 하나의 pan 제스처를 다음 상태로 구분해야 한다.

- 거리 기준 전: 빈 캔버스 클릭 후보이며 취소하면 시점을 바꾸지 않는다.
- 거리 기준을 넘긴 뒤: pan이 시작됐으며 각 유효한 이동의 마지막 시점을 화면과 확정값에 함께 반영한다.
- `pointerup`: 마지막 유효 시점을 유지하고 제스처 상태와 capture만 정리한다.
- `pointercancel`, `lostpointercapture`, 창 `blur`와 문서 `hidden`: pan 시작 전이면 원래 시점을 유지하고, 시작 뒤이면 마지막으로 표시한 유효 시점을 유지한 채 제스처만 끝낸다.

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

[WCAG 2.2 Dragging Movements 설명](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)은 drag로 수행하는 기능에 drag가 아닌 단일 pointer 대안을 요구한다. 요구사항 책임자는 데스크톱 패널의 동작 선택창과 `위치 변경`을 제거하도록 명시했다. 키보드 drag 조작은 남길 수 있지만 키보드만으로 이 성공 기준의 단일 pointer 대안을 충족하지는 않는다. 이 충돌은 숨기지 않고 후속 접근성 검토의 알려진 제한으로 남겨야 하며, 모바일 확인 페이지의 `위치 변경`, `복제`, `삭제` 동작 선택창에는 이번 변경을 적용하지 않는다.

## 아이콘, 모서리, 선택과 포커스

[Fluent 2 Button 지침](https://fluent2.microsoft.design/components/web/react/core/button/usage)은 보조 동작이 많은 화면에서 outline, subtle 또는 transparent 외형으로 시각적 혼잡을 줄일 수 있고, 버튼의 아이콘은 모든 상호작용 상태에서 배경과 3:1 대비가 필요하다고 설명한다. [Carbon Button 지침](https://carbondesignsystem.com/components/button/usage/)은 시각 비중이 가장 낮은 동작에 ghost 버튼을 사용하며 삭제에는 danger ghost 변형도 사용할 수 있다고 설명한다. 두 자료 모두 모든 아이콘 버튼에 테두리가 필요하다고 보지 않지만, 동작의 비중과 위험 정도에 따른 상태 표현은 유지한다.

따라서 이 애플리케이션의 아이콘 전용 버튼은 평상시 테두리를 없애고 hover 및 pressed 배경, 아이콘 색과 `focus-visible` 표시로 동작 가능 상태를 전달한다. 데스크톱 일괄 복사 항목의 우측 상단에는 action 또는 overflow 버튼을 두지 않고, 항목 제거만 실행하는 붉은 아이콘 버튼을 둔다. pointer 환경에서는 항목 hover 때 나타나고, 키보드로 버튼에 도달했을 때에는 포커스 표시와 함께 보여야 한다. 아이콘은 장식으로 숨기고 버튼에는 `일괄 복사 항목 제거`처럼 결과를 말하는 접근 가능한 이름을 준다.

[WCAG 2.2 Focus Appearance 설명](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)은 키보드 포커스가 충분한 면적과 인접 색 대비로 보이도록 요구한다. pointer로 편집 본문을 누를 때 브라우저 기본 파란 outline을 그대로 남기면 메모 선택용 붉은 테두리와 경쟁하지만, 전역 `outline: none`으로 없애면 키보드 사용자가 현재 위치를 잃는다. pointer focus에서는 기본 파란 outline을 표시하지 않고, `:focus-visible`에서는 자체 디자인 시스템의 외곽선을 표시해야 한다.

제공된 선택 화면에서는 붉은 테두리가 메모 본문 둘레에만 보이고 위쪽 헤더 및 꼭짓점에서 끊긴다. 선택 표시는 메모 전체 wrapper의 네 변과 네 꼭짓점을 감싸고 일반 경계보다 굵어야 한다. resize 지점과 header가 테두리를 덮거나 잘라내지 않아야 하며, 별도의 키보드 포커스 표시와 동시에 구분할 수 있어야 한다.

모서리 반경은 하나의 전역 관례로 모든 표면에 반복하지 않는다. 메모 및 패널의 큰 외곽, 목록 항목, 입력과 아이콘 버튼은 서로 다른 역할을 가지므로 필요한 곳만 작은 반경을 사용하고, 원형 또는 pill 형태는 상태 badge나 원형 조작처럼 그 형태가 뜻을 전달하는 경우로 제한한다. 이는 모든 요소를 직각으로 만들라는 뜻이 아니라, 역할과 무관한 동일 반경 반복을 금지한다는 뜻이다.

## 메모 크기 조절 범위

현재 [`note.ts`](../../../../apps/notes/src/entities/note/model/note.ts)는 메모 높이를 `180..960`, 너비를 `240..1280` CSS px로 제한한다. 이 고정 상한은 캔버스 안에 공간이 남아 있어도 위쪽 가장자리 drag가 일정 크기에서 멈추게 한다. 요구사항 책임자는 지나치게 큰 값만 제한하되 위쪽 가장자리 drag가 현재 상한에서 조기에 멈추지 않도록 변경했다.

초기 논리 캔버스가 `4096 × 4096` CSS px로 고정돼 있으므로 별도의 작은 고정 최댓값보다 캔버스 경계를 상한으로 사용하는 편이 현재 요구와 맞는다. 위쪽 가장자리를 움직일 때는 아래쪽 변을 고정하고 `y`가 1보다 작아지지 않는 범위에서 높이를 계속 늘린다. 왼쪽, 오른쪽과 아래쪽도 반대편 변을 고정한 같은 geometry 규칙을 사용한다. 최소 너비 `240`과 최소 높이 `180`은 유지한다.

이 선택은 메모를 캔버스보다 크게 만들 수 있다는 뜻이 아니다. 상한은 메모의 반대쪽 변과 캔버스 경계에서 계산하며, 속성 패널의 수치 입력과 pointer resize가 같은 검증 명령을 사용해야 한다. 캔버스 크기 자체를 바꾸는 기능은 이번 범위에 포함하지 않는다.

## 3초 토스트와 motion

[Fluent 2 Toast 지침](https://fluent2.microsoft.design/components/web/react/core/toast/usage)은 토스트를 중요하지 않은 일시적 정보에 사용하고, 동작이 없는 시간제 토스트의 예시로 7초를 제시한다. 필요한 동작은 토스트에 두지 말라고 권하며 pointer hover에서는 시간을 멈추는 방식을 설명한다. [Radix Toast `1.2.20` 문서](https://www.radix-ui.com/primitives/docs/components/toast)는 자동 닫기, hover 및 focus와 창 `blur`에서 타이머 일시 정지, `duration={3000}` 설정, 열림 및 닫힘 상태와 swipe 전환 예시를 제공한다. 두 자료는 3초 자동 종료가 구현 가능한 값임을 보여주지만, `취소`가 있는 제거 알림에 충분하다고 보장하지 않는다.

요구사항 책임자의 3초 조건을 유지하면 다음 결과를 분명히 해야 한다.

- 모든 토스트는 표시 시점부터 3초 뒤 화면과 접근성 트리에서 제거한다.
- 새 토스트가 같은 위치의 이전 토스트를 바꾸면 새 내용이 나타난 시점부터 3초를 다시 센다.
- 메모 제거 토스트의 `취소`도 3초 동안만 화면에서 실행할 수 있다. 현재 실행에 남기는 제거 이력과 키보드 복원 동작이 토스트 종료 뒤에도 가능한지는 별도 요구가 없으므로 후속 계획에서 임의로 확장하지 않는다.
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
- pointer로 메모 본문을 누를 때 브라우저 기본 파란 outline은 보이지 않고 키보드 `focus-visible`은 자체 표시로 남는다.
- 선택 테두리는 메모 전체 네 변과 꼭짓점에서 끊기지 않는 굵은 붉은 실선이다.
- 위쪽을 포함한 네 가장자리와 네 꼭짓점 resize는 작은 고정 상한에서 조기에 멈추지 않고 캔버스 경계까지 계산한다.
- 모든 토스트는 3초 뒤 사라진다.

현재 `plan.md`에서 메모 상호작용, 일괄 복사 패널, 디자인 시스템과 브라우저 통합 검증 단위가 영향을 받는다. 요구사항 변경 커밋 뒤 해당 작업 단위는 새 기준으로 계획을 다시 검토하기 전까지 완료로 판단하면 안 된다. 이 조사 문서는 계획을 대신하지 않으며 구현 및 테스트 완료를 증명하지 않는다.

## 제한과 다시 검토할 조건

- 제공된 화면만으로 macOS와 브라우저가 실제로 보낸 event 순서를 확정할 수 없다. 지원할 macOS 및 브라우저 조합에서 `Shift+Command+5`, 캡처 취소와 완료를 각각 직접 검증해야 한다.
- 운영체제 단축키를 웹 자동화만으로 완전히 재현하기 어렵다면 수동 검증 절차를 보완하되, 저장소에 일회성 fixture나 디버그 스크립트를 남기지 않아야 한다.
- 데스크톱 `위치 변경` 단일 pointer 대안을 제거하면 WCAG 2.2 Dragging Movements와 충돌할 수 있다. 접근성 목표를 유지하려면 사용자 요구를 바꾸거나 drag 없이 같은 결과를 만드는 다른 단일 pointer 조작을 별도로 승인해야 한다.
- 3초 뒤 사라지는 제거 토스트에만 복원 동작을 두면 느린 입력, 확대 또는 보조 기술 사용자가 시간을 놓칠 수 있다. 3초 조건을 유지하면서 복원을 보장해야 한다면 별도의 영구 실행 취소 위치나 더 긴 이력 접근 방법을 요구사항 책임자가 승인해야 한다.
- motion의 정확한 거리와 시간은 현재 요구사항에서 정하지 않았다. 시각 검증 전에 임의의 여러 값을 화면마다 만들지 말고 공통 토큰 하나를 결정해야 한다.
