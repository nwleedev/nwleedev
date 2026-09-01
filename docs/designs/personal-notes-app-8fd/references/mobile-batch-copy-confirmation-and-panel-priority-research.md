# 모바일 일괄 복사 확인과 오른쪽 패널 우선순위 조사

## 결론

모바일 일괄 복사 상태의 `다음`은 현재 작업을 바로 저장하거나 Clipboard에 쓰는 동작이 아니라, 선택 당시 원문 스냅샷을 순서대로 보여주는 별도 확인 페이지로 이동하는 동작으로 구성한다. 확인 페이지의 재정렬은 길게 누른 뒤에만 drag를 시작해 일반 터치와 세로 스크롤을 구분하고, 복제와 삭제는 항목 우측 상단의 아이콘 버튼이 여는 작은 동작 선택창에서 실행한다. 이 세 동작은 확인 중인 작업 사본만 바꾸며 원본 메모, 메모 revision과 사용 횟수를 바꾸지 않는다.

넓은 화면의 메모 속성 패널과 일괄 복사 패널은 동시에 표시하지 않고 마지막으로 활성화한 패널 하나를 보여준다. 메모 선택은 속성 패널을, 일괄 복사 동작은 일괄 복사 패널을 활성화한다. 패널 전환은 선택한 메모나 일괄 복사 자료를 지우는 동작이 아니다.

메모의 키보드 탐색은 저장된 겹침 우선순위에서 앞에 보이는 메모부터 뒤에 보이는 메모 순으로 구성한다. 양의 `tabindex`로 순서를 맞추지 않고 DOM의 메모 묶음 순서를 같은 기준으로 만든다. 좌표와 크기 입력은 HTML 입력 제약만 믿지 않고 application command에서 유한한 수인지, `0`보다 큰지와 애플리케이션 상한 이하인지 다시 검증해야 한다. 정확한 상한은 보드 조작 성능과 지원 브라우저에서 측정한 뒤 요구사항 책임자가 승인해야 한다.

## 조사 질문과 적용 범위

이 조사는 [개인 메모 애플리케이션 요구사항](../requirements.md)의 다음 변경을 구현 가능한 규칙으로 구체화한다.

- 모바일 일괄 복사 확인 페이지의 진입, 재정렬, 복제와 삭제
- 일반 터치 및 스크롤과 길게 누른 뒤 drag의 구분
- 항목 동작 선택창의 키보드와 포커스 동작
- 메모 속성 패널과 일괄 복사 패널의 최근 활성 우선순위
- 메모 겹침 우선순위를 반영하는 `Tab` 순서
- 좌표와 크기의 `0` 이하 거부 및 상한 검증

공식 자료는 2026년 9월 2일에 확인했다. Figma의 객체 순서와 속성 영역은 이 애플리케이션이 그대로 복제할 규격이 아니라, 공간형 객체의 우선순위와 문맥 패널을 연결하는 정보 구조의 근거로만 사용했다.

## 길게 누른 뒤 시작하는 터치 재정렬

[Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)은 `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, pointer capture와 `touch-action`을 정의하지만 `longpress` 이벤트나 하나의 표준 대기 시간을 정의하지 않는다. 따라서 확인 페이지는 다음 상태를 애플리케이션에서 명시적으로 구분해야 한다.

1. 항목의 동작 버튼이 아닌 영역에서 `pointerdown`이 발생하면 대기 상태를 시작한다.
2. 기준 시간이 지나기 전에 허용 이동 거리를 넘거나 브라우저가 스크롤을 시작하면 drag를 시작하지 않고 대기 상태를 취소한다.
3. 기준 시간이 지나면 해당 항목을 drag 가능한 상태로 바꾸고, 이후 이동만 재정렬 미리보기에 반영한다.
4. `pointerup`에서 유효한 위치에 놓였을 때만 작업 사본의 순서를 바꾼다.
5. `pointercancel`이나 `lostpointercapture`가 발생하면 저장된 순서와 작업 사본을 바꾸지 않고 drag 표시를 끝낸다.

기준 시간과 허용 이동 거리는 플랫폼 표준값인 것처럼 고정하지 않는다. 이름 있는 상호작용 token으로 관리하고 iOS Safari, Android Chrome, 320 CSS px, 화면 확대와 세로 스크롤에서 실제로 검증한다. 동작 선택창을 여는 아이콘 버튼에서는 길게 누르기 대기를 시작하지 않아야 한다.

[WCAG 2.2 Dragging Movements 설명](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)은 drag로 만드는 결과를 drag 없이 한 번의 pointer 입력으로도 만들 수 있어야 한다고 설명한다. [기법 G219](https://www.w3.org/WAI/WCAG22/Techniques/general/G219)은 tap이나 click으로 재정렬 동작을 드러내는 방식을 예로 든다. 이번 요구는 길게 누른 뒤 drag를 주 입력으로 정했지만 drag 없이 같은 순서를 만드는 단일 pointer 대안은 아직 승인하지 않았다. 이 대안이 정해지기 전에는 재정렬 흐름을 WCAG 2.2 AA 완료로 판정하지 않는다.

## 항목 동작 선택창과 작업 사본

[HTML Standard의 popover](https://html.spec.whatwg.org/multipage/popover.html)는 실행 버튼과 `popover="auto"`를 연결하고, 바깥 영역 실행과 `Escape` 같은 close request로 light dismiss를 제공한다. 복제와 삭제처럼 수가 적은 일반 명령은 네이티브 버튼을 담은 anchored popover로 먼저 검토한다. ARIA `menu`를 선택한다면 [WAI Menu Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)과 [Menu and Menubar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)의 열기, 방향키 이동, `Escape`, 닫힌 뒤 실행 버튼으로 포커스 복귀를 모두 구현해야 한다. 역할만 `menu`로 붙이고 키보드 동작을 생략하지 않는다.

확인 페이지의 항목은 원본 메모를 직접 가리켜 수정하는 UI가 아니라 선택 당시 원문 스냅샷의 작업 사본이다.

- 재정렬은 작업 사본 배열의 순서만 바꾼다.
- 복제는 같은 원본 메모 참조와 원문 스냅샷을 가진 새 항목 ID를 만든다.
- 삭제는 대상 항목 ID 하나만 작업 사본에서 제거한다.
- 세 동작은 원본 메모, 원문 및 geometry revision과 사용 횟수를 바꾸지 않는다.
- 확인 페이지의 현재 배열 순서가 이후 결합 및 Clipboard 쓰기 순서다.

복제 항목을 원본 바로 다음에 둘지 목록 끝에 둘지는 사용자가 보는 결과를 바꾸므로 구현 담당자가 추정하지 않는다. 확인 중인 작업을 기존 저장 목록에 언제 반영할지도 별도 자료 수명 결정이 필요하다.

## 최근 활성 오른쪽 패널

[Figma의 객체 선택 안내](https://help.figma.com/hc/en-us/articles/360040449873-Select-layers-and-objects)는 선택한 객체에 따라 오른쪽 속성 내용이 달라지는 구조를 설명한다. 이 애플리케이션은 오른쪽 패널의 종류를 자료 보유 여부가 아니라 마지막 사용자 동작으로 결정한다.

- 메모 헤더 클릭이나 메모의 키보드 선택은 메모 속성 패널을 활성화한다.
- `Command+Option+클릭`, 첫 항목 추가 또는 일괄 복사 제어 실행은 일괄 복사 패널을 활성화한다.
- 패널이 바뀌어도 선택한 메모 ID, 유효한 속성 초안과 일괄 복사 항목을 지우지 않는다.
- 속성 초안에 적용 계기가 생기면 패널 전환 전에 같은 검증 및 적용 절차를 사용한다. 유효하지 않은 초안은 저장 geometry를 바꾸지 않은 채 실행 중 상태에 남긴다.
- 공간이 부족해 일괄 복사 패널이 모달인 표현에서는 바깥 메모 화면을 조작할 수 없으므로, 모달을 닫은 뒤에만 메모 선택이 새 활성 동작이 될 수 있다.

최근 활성 패널을 닫았을 때 이전 패널을 다시 보여줄지 아무 패널도 표시하지 않을지는 아직 승인되지 않았다. 이 결과는 화면 예측 가능성과 입력 초안 수명을 바꾸므로 별도 결정으로 남긴다.

## 메모 우선순위와 Tab 순서

[Figma의 위치와 겹침 순서 안내](https://help.figma.com/hc/en-us/articles/360039956914-Adjust-alignment-rotation-position-and-dimensions)는 레이어 목록 위쪽의 객체가 앞에 보이고 아래쪽의 객체가 뒤에 보인다고 설명한다. 현재 자료의 `Note.geometry.zIndex`도 보드 전체 겹침 순서를 나타내므로, 키보드 탐색은 가장 앞의 메모부터 가장 뒤의 메모 순으로 제공하는 것이 사용자에게 보이는 우선순위를 직접 반영한다.

[HTML Standard의 focus 순서](https://html.spec.whatwg.org/multipage/interaction.html#the-tabindex-attribute)는 `tabindex`가 없거나 `0`인 요소의 순차 포커스가 문서 트리 순서를 따르며 양의 값을 사용할 때 복잡한 별도 순서가 생긴다고 설명한다. [WCAG Focus Order 설명](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)은 포커스 순서가 의미와 조작을 보존해야 한다고 요구한다. 따라서 다음 규칙을 적용한다.

- 메모 묶음을 높은 `zIndex`부터 낮은 `zIndex` 순으로 DOM에 배치한다.
- `Tab`은 앞에서 뒤로, `Shift+Tab`은 그 역순으로 이동한다.
- 메모 안에서는 헤더, 헤더 동작과 본문의 네이티브 포커스 순서를 유지한다.
- 맨 앞으로 또는 맨 뒤로 보내기가 저장되면 이후 Tab 순서도 바뀐 겹침 순서를 따른다.
- 선택 표현을 위해 일시적으로 올린 화면 layer는 저장된 겹침 우선순위와 Tab 순서를 바꾸지 않는다.
- 양의 `tabindex`를 메모 우선순위 값으로 사용하지 않는다.

동률인 오래된 `zIndex` record의 안정된 보조 순서는 기존 z-order 자료 정리 결정과 함께 확정해야 한다.

## 좌표와 크기 입력 범위

[HTML Standard의 number 입력](https://html.spec.whatwg.org/multipage/input.html#number-state-(type=number))은 `min`, `max`와 step mismatch를 제약 검증에 사용할 수 있게 한다. 그러나 DOM 값은 application command를 우회해 들어올 수 있고 HTML 제약만으로 IndexedDB 불변 조건을 보장할 수 없다. [Zod 4 문서](https://zod.dev/packages/zod)는 숫자의 `.positive()`와 `.max()` 검증을 제공한다.

오른쪽 속성 패널의 X, Y, 너비와 높이는 같은 검증 절차를 사용한다.

- 입력 문자열을 수치로 변환한 결과가 유한한 값인지 확인한다.
- `0` 이하이면 적용하지 않고 저장된 geometry와 revision을 유지한다.
- 애플리케이션이 한 곳에서 관리하는 해당 필드 상한을 넘으면 적용하지 않는다.
- 유효하고 저장값과 다를 때만 geometry를 한 번 저장한다.
- HTML `min`과 `max`는 즉시 피드백에 사용하되 application command와 저장 경계에서 같은 규칙을 다시 검증한다.

[CSS Values and Units Level 4](https://www.w3.org/TR/css-values-4/)는 CSS 수치가 구현에서 지원하는 범위로 제한될 수 있음을 전제로 한다. 브라우저 공통의 의미 있는 메모 좌표 및 크기 최댓값은 제공하지 않으므로, 임의의 큰 수를 규격처럼 선택하지 않는다. 최대 좌표와 크기는 지원 브라우저의 layout 범위, 보드 이동 및 resize 반응성, IndexedDB 읽기와 그리기 비용을 측정해 한 곳의 도메인 규칙으로 정하고 요구사항 책임자의 승인을 받아야 한다.

기존 record에 좌표 `0`이 있을 수 있으므로 새 입력의 `0` 이하 거부를 곧바로 저장 schema의 migration으로 확대하지 않는다. 기존 자료를 읽을 수 있게 유지하면서 새 적용 command가 승인된 범위만 저장하도록 하고, 기존 `0` 좌표를 이동할지는 별도 migration 결정으로 다룬다.

## 문서와 계획에 미치는 영향

- 모바일 일괄 복사 실행 중 상태에 `collecting`과 `confirming` 단계를 구분하고, 확인 항목마다 안정된 ID를 둔다.
- `다음`은 확인 페이지로 이동하되 Clipboard 쓰기와 사용 횟수 저장을 실행하지 않는다.
- 확인 페이지의 복제, 삭제와 재정렬은 원본 메모 repository를 호출하지 않는 작업 사본 명령으로 분리한다.
- 오른쪽 패널 활성 상태는 선택한 메모와 일괄 복사 자료에서 파생하지 않고 실행 중 상태로 둔다.
- 메모 표시와 Tab 탐색이 같은 z-order 정렬 결과를 사용하되, 화면의 임시 선택 layer를 저장 우선순위로 쓰지 않는다.
- geometry 입력 검증은 HTML 속성, 폼 schema와 application command에 같은 하한 및 상한을 사용하고, 정확한 상한을 정하기 전에는 구현을 완료하지 않는다.
- 작업 사본 명령, 패널 활성 전이, z-order 정렬과 geometry 경계 검증은 사용자 결과와 불변 조건을 먼저 쓸 수 있어 TDD 대상이다. 길게 누르기 시간, drag 좌표, popover 위치와 실제 Tab 이동은 브라우저 검증 대상으로 둔다.

## 아직 결정할 사항

- 복제한 확인 항목을 원본 바로 뒤와 목록 끝 가운데 어디에 넣을지
- 확인 작업을 기존 저장 일괄 복사 목록에 추가할지 교체할지와 그 시점
- 확인 페이지에서 뒤로 이동하거나 새로고침할 때 작업 사본을 유지할지
- drag 없이 같은 순서 변경을 만드는 단일 pointer 대안을 어떤 UI로 제공할지
- 최근 활성 오른쪽 패널을 닫았을 때 이전 패널을 다시 표시할지
- X, Y, 너비와 높이에 적용할 정확한 상한과 기존 `0` 좌표 record의 migration 여부
- 같은 `zIndex`를 가진 오래된 메모의 안정된 Tab 보조 순서

이 항목은 사용자 결과, 자료 수명 또는 접근성 완료 판정을 바꾸므로 구현 담당자가 추정해 확정하지 않는다.

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
