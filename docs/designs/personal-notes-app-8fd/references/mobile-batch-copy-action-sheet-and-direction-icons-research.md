# 모바일 일괄 복사 액션 시트와 이동 아이콘 조사

## 결론

좁은 화면의 일괄 복사 확인 및 저장 목록 관리에서 항목 더보기는 버튼 옆 팝오버가 아니라 화면 아래에서 열리는 액션 시트를 연다. 설정을 켰을 때 가능한 한 자리 이동은 위쪽과 아래쪽을 서로 구분하는 아이콘 버튼으로 표시하고, 복제와 삭제는 보이는 동작 이름을 유지한다. 배치와 닫기 동작은 [개인 메모 애플리케이션 요구사항](../requirements.md)과 [액션 시트 닫기 결정](../decisions/mobile-batch-copy-action-sheet-dismissal.md)에 따른다.

## 조사 질문과 현재 구현

2026년 9월 24일에 모바일 동작 선택의 배치, 아이콘 전용 명령의 이해 가능성, 모달 포커스와 화면 키보드 영향을 공식 자료로 확인했다. 대상은 `/batch-copy`의 확인 화면과 저장 목록 관리 화면이다. 두 화면의 표현 기준은 기기 이름이나 User-Agent가 아니라 작업 영역의 inline size다. 넓은 화면의 항목 팝오버는 이번 변경 대상이 아니다.

현재 확인 화면의 `apps/notes/src/_pages/batch-copy/ui/batch-copy-item-actions.tsx`는 `ActionPopover`에 이동, 복제와 삭제 명령을 전달한다. 이동 두 방향 모두 같은 `GripIcon`을 사용하고 동작 이름을 화면에 표시한다. 저장 목록 관리의 `apps/notes/src/features/edit-batch-copy/ui/batch-copy-list.tsx`도 화면 너비에 관계없이 `ActionPopover`를 렌더링한다. 이 자료는 현재 구현 상태이며 액션 시트가 이미 제공된다는 근거가 아니다. 기존 재정렬 명령, 기본 비활성 설정과 저장 실패 복구는 두 화면에서 보존해야 한다.

## 플랫폼 사례에서 확인한 점

[Apple의 Action sheets 지침](https://developer.apple.com/design/human-interface-guidelines/action-sheets?changes=_1)은 사용자가 시작한 동작에 대한 선택지를 모달로 보여주고, 위험한 동작은 구분하며, 한 번에 읽을 수 있도록 항목 수를 적게 유지하라고 한다. 다만 iOS와 iPadOS에서는 단순히 더보기 버튼으로 명령을 드러낼 때 메뉴를 예상한다는 설명도 있다. 이번 액션 시트 선택은 그 관례와 다르다. 따라서 화면을 가리는 비용과 대상 항목을 잊을 가능성을 실제 모바일 화면에서 확인해야 한다.

[Android의 ModalBottomSheet 설명](https://developer.android.com/develop/ui/compose/components/bottom-sheets)은 화면 아래에서 명령을 제공하고 닫기 요청과 표시 상태를 다루는 예시를 보여준다. 이는 하단 시트가 실행 버튼 옆에 붙는 메뉴와 다른 화면 구성이라는 비교 근거다. Android의 Compose API나 기본 애니메이션을 웹 구현의 필수 사양으로 옮기는 근거는 아니다.

## 웹 접근성과 조작 조건

[WAI의 모달 대화상자 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)은 모달이 열릴 때 포커스를 안으로 옮기고, 바깥 조작을 막으며, `Tab` 탐색을 안에 유지하고, 닫은 뒤 실행 버튼 또는 동작 결과상 적절한 대상에 포커스를 돌리도록 설명한다. 눈에 보이는 닫기 버튼도 강하게 권장한다. [HTML `dialog` 표준](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)의 `showModal()`은 top layer와 바깥 내용의 inert 처리를 제공하므로 새 접근성 패키지 없이 구현할 때 검토할 첫 수단이다. 다만 기존 화면의 닫기 방식, `Escape` 우선순위, 항목 삭제 후 사라진 실행 버튼의 대체 포커스는 실제 흐름에서 정해야 한다.

[WAI의 버튼 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/button/)은 아이콘만 보이는 버튼에도 접근 가능한 이름이 있어야 하고 `Enter`와 `Space`로 실행되어야 한다고 명시한다. 위아래 이동은 상태를 켜고 끄는 토글이 아니라 즉시 실행하는 명령이므로 `aria-pressed`를 이동 여부 표현으로 붙이지 않는다. 요구사항의 pressed 상태는 손가락이나 마우스로 누르는 동안의 시각 피드백으로 해석한다. [WCAG 2.2의 Target Size 기준](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)은 pointer 대상이 적어도 24 CSS px 정사각형이거나 간격 예외를 만족해야 한다고 설명한다. 아이콘 그림의 크기만이 아니라 실제 버튼의 누를 수 있는 영역을 확인해야 한다.

[Chrome의 모바일 viewport 설명](https://developer.chrome.com/blog/viewport-resize-behavior)은 화면 키보드가 보일 때 visual viewport와 layout viewport가 다르게 변할 수 있음을 설명한다. 시트의 버튼이 키보드, 브라우저 도구 모음과 safe area에 가려지는지는 고정 좌표나 `100vh` 가정만으로 판정하지 않고 실제 브라우저에서 확인해야 한다.

## 적용 범위와 남은 선택

- 확인 및 저장 목록 관리에서는 모바일 표현일 때만 항목 팝오버를 액션 시트로 바꾼다. 넓은 패널과 넓은 저장 목록 관리의 팝오버, 기존 drag, 방향키, 저장 및 실패 복구는 유지한다.
- `위로 이동`과 `아래로 이동`은 같은 이동 핸들 그림을 재사용하지 않는다. 각각 실제 방향을 나타내는 다른 아이콘을 쓰고, 화면에는 동작 이름을 중복해서 적지 않는다. 접근 가능한 이름은 두 동작을 구분한다. 첫 항목, 마지막 항목과 한 항목뿐인 목록의 표시 조건은 그대로 유지한다.
- 시트는 [액션 시트 닫기 결정](../decisions/mobile-batch-copy-action-sheet-dismissal.md)에 따라 화면 아래에서 열고 닫는다. 정확한 픽셀 높이와 너비는 승인된 요구사항이 아니므로 기기별 고정 수치로 만들지 않고 실제 가용 영역과 내용에 맞춘다. 대상 항목은 목록에서 사용하던 항목 이름으로 식별하며 원문 전체를 시트 제목에 반복하지 않는다.
- `복제`와 `삭제`의 보이는 이름, 위험 동작 구분, 이동 뒤 같은 항목의 재발견, 저장 실패 시 원래 순서 복원은 유지한다. 아이콘만 보고 위아래 방향을 구분하기 어려운 경우에는 명령의 위치와 그림을 다시 비교하되 승인된 아이콘 전용 표현을 임의로 텍스트 행으로 되돌리지 않는다.

이 변경은 [완성 계획](../plan.md)의 모바일 액션 시트 절차에 반영한다. 과거의 [모바일 확인과 패널 조사](mobile-batch-copy-confirmation-and-panel-priority-research.md) 및 [항목 팝오버 조사](tab-order-popover-and-mobile-reorder-research.md)에 남은 버튼 옆 모바일 팝오버 설명은 현행 화면 결정이 아니다.
