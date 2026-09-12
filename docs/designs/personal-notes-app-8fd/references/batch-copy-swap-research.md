# 일괄 복사 드롭의 위치 교환 조사

현재 일괄 복사 편집은 항목을 빼서 다른 위치에 끼워 넣는다. 모든 일괄 복사 화면에서 두 항목의 위치를 교환하려면 순서 변경 명령뿐 아니라 모바일의 대상 판정과 삽입 표시도 바꿔야 한다.

2026년 9월 12일의 운영 소스와 공식 자료를 확인했다. 승인된 동작은 [요구사항](../requirements.md), 저장과 입력별 결정은 [순서 편집 결정](../decisions/accumulator-ordering-and-recovery.md)이 관리한다. 이 조사는 수정 완료 증거가 아니다.

## 확인한 원인

`features/edit-batch-copy/ui/batch-copy-list.tsx`는 커서 아래 항목의 index를 구하고 `finishPointer`에서 `onMove`로 넘긴다. `edit-batch-copy.ts`의 저장 명령과 `batch-copy-history.ts`를 거쳐 `entities/batch-copy/model/batch-copy-commands.ts`의 `moveBatchCopyItem`이 실행된다. 이 함수는 원래 항목을 `splice`로 제거한 뒤 대상 index에 삽입한다.

운영 함수를 네 항목으로 직접 실행한 결과 `[A, B, C, D]`의 A를 index 3으로 옮기면 `[B, C, D, A]`가 됐다. 필요한 결과는 `[D, B, C, A]`다. 두 항목만 사용하는 기존 명령 검사는 이동과 교환에서 같은 결과가 나오므로 차이를 발견하지 못한다. 이번 확인은 순서 명령 실행이며 모든 브라우저의 실제 드롭을 재현한 것은 아니다.

모바일 확인 화면은 `mobile-batch-copy-confirmation-list.tsx`의 항목 중간 높이로 삽입 index를 계산하고 앞이나 뒤의 선으로 위치를 표시한다. `entities/batch-copy/model/mobile-batch-copy-draft.ts`도 항목 제거 후 삽입한다. 교환 함수만 연결하면 항목 아래쪽에 놓았을 때 다음 항목과 바뀌는 등 표시와 동작이 어긋날 수 있다.

## 이동과 교환의 차이

공식 dnd-kit 소스의 고정 revision `e9215e820798459ae036896fce7fd9a6fe855772`에서 [arrayMove](https://github.com/clauderic/dnd-kit/blob/e9215e820798459ae036896fce7fd9a6fe855772/packages/sortable/src/utilities/arrayMove.ts)는 제거 후 삽입하고, [arraySwap](https://github.com/clauderic/dnd-kit/blob/e9215e820798459ae036896fce7fd9a6fe855772/packages/sortable/src/utilities/arraySwap.ts)은 두 자리만 바꾼다. 이는 명령의 차이를 확인하는 자료이며 라이브러리 추가를 권하는 근거가 아니다.

공통 교환 계산은 시작 항목 ID와 대상 항목 ID를 받아 현재 목록에서 두 위치를 찾는 방식이 적절하다. 두 ID가 같거나 하나가 없으면 변경하지 않는다. 중간 항목, 원문 스냅샷, 중복 텍스트의 개별 ID를 유지한다. 화면별로 저장 목록과 모바일 작업 초안의 저장 및 revision 규칙은 계속 분리한다.

## 잘못된 대상과 저장 실패

현재 두 화면 모두 마지막 이동 event에서 구한 대상을 놓는 순간 재사용한다. 놓기 직전 스크롤이나 목록 갱신이 있으면 실제 대상과 다를 가능성이 있다. 이는 추가 확인이 필요한 위험이며 이번 네 항목 문제의 실행으로 확정한 원인은 아니다.

[Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/#pointer-capture)의 pointer capture는 입력 전달을 유지하는 수단이다. capture 대상이 곧 놓을 대상은 아니므로 `pointerup`의 화면 좌표에서 실제 항목을 다시 찾는 것이 적절하다. [Atlassian 드래그 지침](https://atlassian.design/components/pragmatic-drag-and-drop/design-guidelines)은 놓을 대상과 완료 피드백을 명확히 표현하도록 안내한다. 항목 전체를 교환 후보로 표시하고 모바일 삽입선은 제거한다.

드래그 중 목록이 달라지면 시작 목록의 revision과 ID를 확인해 오래된 index로 저장하지 않는다. 스크롤 중에도 후보를 다시 계산하며 화면 밖 마지막 항목에 도달하는 조작을 실제 기기에서 확인한다. 자동 스크롤을 추가할 경우 속도와 작동 영역은 측정 후 정하며, 스크롤했다는 이유로 항목을 제거하지 않는다.

[IndexedDB transaction](https://www.w3.org/TR/IndexedDB-3/#transaction-concept)에 맞춰 두 위치는 한 번에 저장한다. 실패하면 교환 전 순서와 선택을 유지하고 재시도를 안내한다. 저장 목록의 교환 성공은 목록 revision을 한 번 올리고 제거 redo를 비운다. 제거 undo는 유지하며 교환을 제거 이력에 추가하지 않는다. 모바일 작업은 저장 목록과 메모 및 사용 횟수를 바꾸지 않는다.

## 터치와 드래그 없는 조작

모바일의 길게 누르기 시작, 스크롤 우선 처리와 취소 동작은 유지한다. `위치 변경`에서는 항목 사이의 삽입 위치 대신 교환할 항목을 고르게 한다. 키보드와 단일 누르기도 같은 두 ID 교환을 실행해야 한다. 인접 항목을 바꾸는 방향키는 한 자리 이동과 결과가 같으므로 기존 조작을 유지할 수 있다.

[WCAG 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)은 드래그와 같은 결과를 단일 포인터로도 만들 수 있어야 한다고 설명한다. 현재 넓은 패널에는 드래그 없는 단일 포인터 대안이 없다는 기존 미해결 사항이 있다. 교환으로 변경해도 이 문제가 해결되는 것은 아니며, 새 메뉴를 임의로 추가하지 않는다.

## 완료를 확인할 사례

네 개 이상에서 첫째와 마지막, 인접하지 않은 중간 두 항목을 양방향으로 바꾼다. 가운데 항목의 순서, 항목 수와 각 ID가 유지되는지 확인한다. 같은 텍스트를 가진 다른 ID도 별도로 교환할 수 있어야 한다.

저장 목록, 넓은 패널과 모바일 확인 화면에서 같은 교환 결과를 확인한다. 새로고침 후 순서와 전체 복사 문자열도 비교한다. 자기 자신, 항목 사이 여백, 패널 안 빈 곳은 변경하지 않고, 패널 밖 제거와 취소는 기존 규칙을 유지한다. 저장 실패, 대상 제거, 목록 갱신, 마지막 이동 직후 놓기, 길게 누르기 취소와 키보드 포커스도 확인한다.
