# 메모 조작과 모바일 일괄 복사 조사

## 결론

넓은 메모 화면은 본문을 항상 편집 가능한 `textarea`로 두고, 짧은 헤더에 선택, 속성 패널 활성화와 이동을 구분하는 구성이 가장 일관된다. 본문은 일반 클릭으로 커서와 선택 범위를 바꾸고, `Command+클릭`은 메모 전체 복사, `Command+Option+클릭`은 일괄 복사 목록 추가로 구분한다. 이동이 아닌 헤더 한 번 클릭은 선택만, 더블클릭은 속성 패널 활성화만 실행한다. 헤더 drag는 이동만 맡고, 헤더의 아이콘 버튼은 맨 앞으로, 맨 뒤로와 삭제만 제공한다.

`48rem` 미만의 목록 표현은 같은 pointer 동작을 그대로 축소하면 안 된다. 일반 터치는 상세 화면 이동, 길게 누르기는 메모 전체 복사, 목록 헤더의 아이콘 버튼은 일괄 복사 상태 진입으로 나눈다. 이 상태에서는 짧게 누른 횟수와 순서대로 항목을 추가하고, 헤더 왼쪽의 뒤로가기 아이콘으로 나간다. 화면 아래에는 `초기화`와 클릭 횟수가 함께 표시되는 `다음`을 둔다. `다음`은 선택 당시 원문 스냅샷을 보여주는 별도 확인 페이지로 이동한다. 확인 페이지의 길게 누른 뒤 drag, 항목 복제 및 삭제 근거는 [모바일 일괄 복사 확인과 오른쪽 패널 우선순위 조사](mobile-batch-copy-confirmation-and-panel-priority-research.md)에서 다룬다.

사용자에게 보이는 기능명은 `일괄 복사`가 적합하다. 자료가 조작 순서대로 배열에 추가되는 내부 규칙을 설명할 때에는 “누적한다”는 동사를 사용할 수 있지만, 화면 제목, 버튼과 상태 문구에는 `누적 복사`를 쓰지 않는다.

## 조사 범위

- macOS Stickies의 편집, 이동과 크기 조절 방식
- 본문 편집과 보조 키 클릭을 같은 메모에서 구분하는 방법
- 짧은 헤더의 아이콘 버튼과 메모 겹침 순서
- 작은 화면의 짧은 누르기, 길게 누르기, 상세 편집과 일괄 복사 상태
- 목록 메모의 최대 높이와 넘치는 원문을 다루는 방법
- 일괄 복사 상태의 시작, 추가 순서, 횟수와 하단 동작

제공된 Stickies 화면은 짧은 헤더와 본문 비율을 이해하기 위한 시각 참고 자료로만 사용했다. 아이콘의 정확한 모양, 색, 픽셀 크기와 운영체제 고유 외형을 복제하는 근거로 사용하지 않았다.

## 넓은 화면의 메모

### 본문은 항상 편집한다

[Apple Stickies 사용 설명서](https://support.apple.com/en-ie/guide/stickies/welcome/mac)는 메모에 바로 입력하고 내용이 자동 저장된다고 안내한다. [HTML Standard의 `textarea`](https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element)는 여러 줄 일반 텍스트를 편집하는 네이티브 제어다. 현재 애플리케이션의 원문은 서식 없는 여러 줄 문자열이므로 `contenteditable`로 편집 모델을 새로 만들 이유가 없다.

- 본문은 읽기용 요소와 편집용 요소를 교체하지 않고 같은 `textarea`를 계속 사용한다.
- 브라우저가 제공하는 `textarea` 자체 resize 손잡이는 끈다. 메모 크기는 카드 가장자리와 꼭짓점이 관리한다.
- 자동 저장의 대기 시간, 포커스 이동 및 route 이탈 시점의 저장 완료와 실패 안내는 별도 결정이 필요하다.
- URL처럼 보이는 문자열도 일반 텍스트로 남기므로 `Command+클릭`의 브라우저 링크 열기와 충돌하지 않는다.

### 헤더는 이동과 메모 단위 동작을 맡는다

[Apple의 Mac 창 조작 안내](https://support.apple.com/guide/mac-help/work-with-app-windows-mchlp2469/mac)는 제목 막대를 드래그해 창을 옮기고 가장자리와 꼭짓점을 드래그해 크기를 바꾸는 방식을 설명한다. Stickies도 제목 막대와 본문을 분리한다. 이 구분을 메모에 적용하면 본문의 커서 이동 및 텍스트 선택을 카드 이동과 분리할 수 있다.

- 아이콘 버튼이 아닌 헤더 영역에서 시작한 drag만 메모 위치를 바꾼다.
- 이동으로 판정할 최소 이동 거리를 넘지 않은 한 번의 헤더 클릭은 메모를 선택하고 얇은 붉은 테두리만 새로 표시한다. 같은 영역의 이동 없는 더블클릭은 속성 패널을 연다.
- 이동 기준을 넘긴 뒤에는 같은 pointer 연속 입력의 click과 더블클릭을 실행하지 않고, drag가 끝나거나 취소될 때까지 오른쪽 패널 전환으로 캔버스 크기를 바꾸지 않는다.
- 헤더와 아이콘 버튼에서 발생한 클릭은 본문의 복사 및 일괄 복사 단축 조작으로 전파하지 않는다.
- 메모의 가장자리와 네 꼭짓점은 크기 조절을 맡으며 헤더 drag 및 빈 캔버스 이동보다 먼저 판정한다.

### 맨 앞과 맨 뒤는 저장된 겹침 순서를 바꾼다

[Figma의 FigJam 객체 순서 안내](https://help.figma.com/hc/en-us/articles/1500004292221-Select-move-and-order-objects-in-FigJam)는 `Bring to front`를 모든 객체 위, `Send to back`을 모든 객체 아래로 보내는 동작으로 정의한다. [CSS Positioned Layout Module Level 3](https://www.w3.org/TR/css-position-3/#painting-order)와 [`z-index` 설명](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/z-index)은 같은 stacking context 안의 그리기 순서를 설명한다.

현재 자료 초안의 `geometry.zIndex`로 이 결과를 표현할 수 있다. 다만 새 최댓값 또는 최솟값만 계속 더하는 방식은 값이 끝없이 벌어지고 동률 복구 규칙이 불분명해진다. 구현 전에 다음 불변 조건을 자료 결정에 추가해야 한다.

- 한 보드의 메모 순서는 전체 순서로 비교할 수 있어야 한다.
- 맨 앞으로 또는 맨 뒤로 보낼 때 나머지 메모의 상대 순서는 유지돼야 한다.
- 순서 변경과 저장은 한 IndexedDB transaction으로 완료돼야 한다.
- 동률이나 중단된 저장을 복원할 결정적 정렬 기준이 있어야 한다.
- 원문이 바뀌지 않았으므로 content revision은 증가시키지 않는다.

### 아이콘 버튼은 보이지 않는 이름과 충분한 실행 영역이 필요하다

[WAI-ARIA Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)은 버튼이 접근 가능한 이름을 갖고 `Enter`와 `Space`로 실행돼야 한다고 설명한다. [WAI 이름과 설명 지침](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)은 아이콘 이름이 모양이 아니라 실행 결과를 나타내야 한다고 설명한다. 따라서 아이콘은 장식으로 숨기고 네이티브 버튼에 `맨 앞으로`, `맨 뒤로`, `메모 삭제`처럼 결과를 나타내는 이름을 준다.

[WCAG 2.2 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)은 실행 영역이 원칙적으로 24×24 CSS px 이상이어야 한다고 설명한다. 짧은 헤더에서도 아이콘 그림 자체를 키울 필요는 없지만 버튼의 실행 영역과 인접 버튼 사이 간격은 이 조건을 만족해야 한다. 터치 화면에서는 [Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)의 44×44 CSS px 권고도 함께 검토한다.

삭제는 확인 대화상자 없이 즉시 반영하고 메인 패널 중앙 하단의 토스트로 되돌릴 기회를 제공한다. [Carbon의 remove pattern](https://carbondesignsystem.com/community/patterns/remove-pattern/)은 저위험이며 되돌릴 수 있는 제거에 즉시 실행을 허용하고, [Fluent 2 Toast 지침](https://fluent2.microsoft.design/components/web/react/core/toast/usage)은 실행 동작이 있는 알림을 단순 시간 제한 확인 메시지와 구분한다. 토스트의 `취소`는 같은 원문, 위치, 크기와 겹침 순서를 복원해야 한다. 표시 시간, 연속 삭제 처리와 새로고침 뒤 복구 범위는 별도 결정이 필요하다.

## 보조 키 클릭

[UI Events](https://www.w3.org/TR/uievents/)는 `MouseEvent.metaKey`와 `altKey`로 Command 및 Option 상태를 전달한다. 두 동작이 같은 본문에 배정되므로 더 구체적인 조합을 먼저 판정해야 한다.

1. `metaKey && altKey`이면 일괄 복사 목록에 추가한다.
2. `metaKey && !altKey`이면 메모 전체를 Clipboard에 쓴다.
3. 그 밖의 본문 클릭은 커서 이동과 텍스트 선택에 맡긴다.

`Command+Option+클릭`을 `Command+클릭`보다 뒤에서 판정하면 한 번의 입력으로 복사와 목록 추가가 함께 실행될 수 있다. 헤더, 아이콘 버튼, resize 영역과 다른 화면 제어는 이 판정 대상에서 제외한다. Safari는 링크에서 `Command+클릭`을 탭 열기에 사용하므로 URL 문자열을 자동 링크로 만들지 않는 현재 범위도 실제 Safari에서 확인해야 한다.

`Command`를 누르는 동안에는 헤더의 시각 요소와 pointer 조작을 숨기되 헤더 행의 높이, 본문 위치와 메모 외곽 크기를 유지한다. 보조 키 본문 입력은 상위 메모의 선택 event로 전파하지 않는다. 보조 키 상태와 헤더 가시성의 복구 근거는 [메모 선택, 속성 편집과 제거 복구 조사](note-selection-properties-and-removal-research.md)에 기록했다.

## 작은 화면의 목록과 상세 편집

### 짧은 누르기와 길게 누르기는 같은 sequence에서 판정한다

[Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)은 `pointerdown`, 이동, `pointerup`, `pointercancel`과 pointer capture를 정의한다. [WCAG Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html)은 짧은 누르기와 길게 누르기 모두 손을 뗄 때 완료하고, 대상 밖 이동이나 취소로 실행을 중단할 수 있어야 한다고 설명한다.

- `pointerdown`은 시작 시각과 위치만 기록하고 복사 또는 route 이동을 완료하지 않는다.
- 정한 시간 전에 같은 카드 안에서 손을 떼면 상세 화면으로 이동한다.
- 시간 기준을 넘긴 뒤 허용 이동 범위 안에서 손을 떼면 메모 전체를 복사하고, 뒤이어 발생하는 `click`의 상세 이동을 막는다.
- 세로 스크롤 의도가 확인되거나 대상 밖 이동, `pointercancel`, `lostpointercapture`가 발생하면 복사와 상세 이동을 모두 취소한다.
- 일괄 복사 상태에서는 짧은 누르기를 상세 이동이 아니라 항목 추가로 해석한다. 길게 누르기 복사를 이 상태에서도 유지할지는 실제 동작 검증 항목으로 둔다.

모바일 브라우저는 길게 누르기를 텍스트 선택이나 context menu에 사용할 수 있다. [`contextmenu` event 안내](https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event)는 브라우저 지원 차이가 있음을 명시한다. 목록 카드에서 필요한 기본 동작만 제한하고 상세 편집 화면의 텍스트 선택과 편집 메뉴까지 전역으로 막으면 안 된다. iOS Safari, Android Chrome과 지원할 다른 터치 브라우저에서 길게 누르기, 스크롤, 확대 및 보조 기술을 직접 확인해야 한다.

### 목록은 제한된 높이의 미리보기다

[CSS Overflow Module](https://www.w3.org/TR/css-overflow-3/)은 크기가 제한된 상자의 넘침 처리를 정의한다. [MDN의 overflow 안내](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Overflow)는 `clip`이 보이지 않는 내용을 접근할 수 없게 만들 수 있으므로 주의해야 한다고 설명한다. 모바일 목록은 일반 터치로 전체 원문을 보여주는 상세 화면에 이동하므로 카드 내부를 별도 스크롤 영역으로 만들기보다 높이를 제한한 미리보기로 사용하는 편이 낫다.

- 모든 목록 메모는 같은 의미 기반 최대 block-size token을 사용한다.
- 넘치는 원문은 카드 안에서 잘리지만, 내용이 더 있다는 시각 표시를 제공한다.
- 상세 화면에서는 전체 원문을 확인하고 수정할 수 있다.
- 정확한 높이와 보이는 줄 수는 실제 한국어 장문, 글자 확대와 320 CSS px 화면 검토로 정한다. 조사만으로 고정 수치를 승인하지 않는다.

### 상세 화면은 메모 하나의 편집과 저장을 맡는다

[Next.js App Router의 layouts and pages 안내](https://nextjs.org/docs/app/getting-started/layouts-and-pages)는 동적 segment로 자료 ID에 대응하는 별도 화면을 만들 수 있음을 설명한다. 경로 이름은 구현 구조 결정에서 정하되 목록에서 선택한 메모 ID를 직접 식별하고, 존재하지 않거나 삭제된 ID의 오류도 처리해야 한다.

상세 화면은 전체 원문을 편집하는 `textarea`와 명시적인 저장 동작을 제공한다. 목록에서 상시 편집하던 이전 결정을 작은 화면까지 유지하지 않는다. 뒤로 이동이나 route 이탈 때 저장하지 않은 입력을 버릴지 묻는 방식, 저장 중 중복 실행과 실패 뒤 입력 보존은 구현 전 결정해야 한다.

## 모바일 일괄 복사 상태

[Apple toolbar 지침](https://developer.apple.com/design/human-interface-guidelines/toolbars)은 modal state에 들어가면 현재 작업에 맞는 toolbar 동작을 제공하고 종료하면 원래 도구를 복원하라고 권고한다. 이번 흐름은 메모를 골라 선택 집합을 만드는 상태가 아니라 누른 순서대로 일괄 복사 작업을 만드는 상태다. 따라서 사용자 화면과 자료 이름에서 `선택 상태`를 사용하지 않는다.

1. 메모 목록 화면 헤더 오른쪽의 아이콘 버튼으로 일괄 복사 상태를 시작한다.
2. 상태 안에서는 헤더 왼쪽에 뒤로가기 아이콘 버튼을 표시한다. 이 버튼이 이전 하단 `취소`의 역할을 대신하며 Clipboard에 쓰지 않고 상태를 끝낸다.
3. 메모를 짧게 누를 때마다 현재 원문 스냅샷을 누른 순서대로 추가한다. 같은 메모를 다시 누르면 별도 항목을 추가하고 클릭 횟수도 증가시킨다. 상세 화면으로 이동하지 않는다.
4. 화면 아래의 고정 작업 영역에는 `초기화`와 `다음`을 둔다. `초기화`는 이번 작업의 항목과 횟수를 비우되 일괄 복사 상태는 유지한다.
5. `다음` 문구 옆에는 중복을 포함한 클릭 횟수를 표시한다. 키보드와 보조 기술에서도 버튼 이름과 횟수의 관계를 알 수 있어야 한다.
6. `다음`은 Clipboard에 쓰지 않고 별도 일괄 복사 확인 페이지로 이동한다. 확인 페이지에는 이번 작업 항목을 누른 순서대로 표시한다.

다음 결과는 아직 정하지 않았다.

- 상태를 시작할 때 기존 저장 목록을 이어 쓸지 빈 작업 초안으로 시작할지
- 확인 페이지의 이번 작업 초안과 저장 목록을 언제 어떤 방식으로 합칠지
- 헤더 뒤로가기 뒤 이번 작업 초안을 버릴지 다음 진입까지 유지할지
- 일괄 복사 상태에서 길게 누르기 개별 복사를 계속 허용할지

이 선택은 자료 수명, 사용 빈도와 모바일 관리 페이지의 역할을 바꾸므로 구현 담당자가 추정해서 정하면 안 된다.

## 용어 결정

사용자 화면에서는 다음 이름을 사용한다.

- 기능과 작업 상태: `일괄 복사`
- 작업 상태의 진행 버튼: `다음`
- 작업 상태의 비우기 버튼: `초기화`
- 선택한 항목을 보여주는 영역: `일괄 복사 목록`
- 단일 메모 Clipboard 쓰기: `개별 복사`

자료 구조와 알고리즘 설명에서는 항목을 선택 순서대로 “누적한다”거나 배열에 “추가한다”고 쓸 수 있다. 그러나 화면 제목, 버튼, 설정 이름과 사용자 상태 문구에는 `누적 복사`를 사용하지 않는다. 내부 TypeScript 이름과 IndexedDB store 이름을 변경할지는 자료 migration 범위를 확인한 뒤 별도로 결정한다.

## 계획에 반영할 검증

- 넓은 화면: 본문 편집, `Command+클릭`, `Command+Option+클릭`, 헤더 한 번 클릭, 더블클릭 및 drag, 세 아이콘 버튼과 edge resize가 서로 중복 실행되지 않는지 실제 브라우저에서 확인한다. `Command` keyup과 창 상태 변화 뒤 헤더가 복원되고 본문과 메모 외곽 크기가 유지되는지도 확인한다.
- 겹침 순서: 맨 앞 및 맨 뒤 변경 뒤 다른 메모의 상대 순서와 새로고침 복원을 확인한다.
- 모바일 목록: 짧은 누르기, 길게 누르기, 세로 스크롤과 pointer 취소를 실제 터치 브라우저에서 확인한다.
- 모바일 상세: 전체 원문 편집, 저장 성공, 저장 중 재실행, 실패 뒤 입력 유지와 없는 메모 ID를 확인한다.
- 일괄 복사 상태: 반복 입력을 포함한 추가 순서와 클릭 횟수, 상세 이동 억제, 헤더 뒤로가기, `초기화` 및 `다음`의 서로 다른 결과를 확인한다.
- 일괄 복사 확인 페이지: 일반 터치 및 스크롤과 길게 누른 뒤 drag를 구분하고, 재정렬, 복제와 삭제가 원본 메모를 바꾸지 않는지 확인한다.
- 접근성: 아이콘 버튼의 이름, 키보드 실행, 작업 상태 및 클릭 횟수 전달, focus 표시와 최소 실행 영역을 검사한다.

## 출처와 검토 시점

다음 자료는 2026년 9월 2일에 검토했다.

- [Apple: Stickies User Guide](https://support.apple.com/en-ie/guide/stickies/welcome/mac)
- [Apple: Work with app windows on Mac](https://support.apple.com/guide/mac-help/work-with-app-windows-mchlp2469/mac)
- [Apple: Focus and selection](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection/)
- [Apple: Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)
- [Figma: Select, move, and order objects in FigJam](https://help.figma.com/hc/en-us/articles/1500004292221-Select-move-and-order-objects-in-FigJam)
- [WHATWG: The `textarea` element](https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element)
- [W3C: UI Events](https://www.w3.org/TR/uievents/)
- [W3C: Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)
- [W3C: CSS Positioned Layout Module Level 3](https://www.w3.org/TR/css-position-3/)
- [W3C: CSS Overflow Module Level 3](https://www.w3.org/TR/css-overflow-3/)
- [WAI: Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)
- [WAI: Providing Accessible Names and Descriptions](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)
- [WAI: Understanding Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html)
- [WAI: Understanding Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [WAI: Understanding Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)
- [Carbon Design System: Remove pattern](https://carbondesignsystem.com/community/patterns/remove-pattern/)
- [Next.js: Layouts and Pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages)
- [MDN: `contextmenu` event](https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event)
- [MDN: Overflowing content](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Overflow)
