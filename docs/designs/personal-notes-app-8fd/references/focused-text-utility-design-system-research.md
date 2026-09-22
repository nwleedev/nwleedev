# 텍스트 재사용 작업 화면의 디자인 근거

이 조사는 [개인 메모 애플리케이션 요구사항](../requirements.md)의 UI 재구축과 일괄 복사 재정렬 변경을 구현할 때 필요한 시각 규칙, 접근성 조건과 현재 저장소의 변경 지점을 확인한다. 조사 결과는 기존 화면을 새 디자인의 기준으로 삼지 않고, 현재 화면에서 유지할 동작과 교체할 표현을 구분하는 데 사용한다.

## 결론

개인 메모 애플리케이션은 메모 본문과 복사 동작을 가장 먼저 드러내는 조밀한 텍스트 작업 화면으로 재구축한다. 자유 배치, 자동 저장, 모바일 상세 편집, 복사, 일괄 복사, 속성 조정, 분석, 템플릿과 사용 빈도는 유지한다. 밝은 목재 질감, 노란 메모, 짙은 탐색 영역, 상시 관리 버튼, 항목 교환과 평상시 드롭 표시는 새 디자인 기준에서 제외한다.

일괄 복사 순서는 두 항목의 자리를 맞바꾸는 방식이 아니라 드래그 지점의 앞이나 뒤로 항목을 옮기는 삽입식 재정렬을 사용한다. 이 변경은 현재 구현의 `moveBatchCopyItem`, `moveMobileBatchCopyEntry`와 화면의 삽입 위치 계산을 유지하는 방향이며, 2026년 9월 12일 문서 변경 `e41b23d`에서 정한 교환 요구를 되돌린다. 요구사항, 순수 명령, 브라우저 조작과 모델 기반 검사에서 같은 순서를 사용해야 한다.

## 현재 저장소에서 유지할 기능

- `apps/notes/src/_pages/notes/model/`의 자동 저장, 복구 초안, 모바일 명시적 저장과 이탈 확인은 화면 표현과 분리된 사용자 자료 보호 기능이므로 유지한다.
- `apps/notes/src/entities/note/`의 자유 좌표, 크기, 겹침 순서와 `tabIndex` 자료는 유지한다. 메모 식별 문구는 별도 제목 필드를 추가하지 않고 첫 번째 비어 있지 않은 본문 줄에서 만든다.
- `apps/notes/src/_pages/notes/ui/notes-collection.tsx`와 `notes-board.tsx`의 `48rem` 표현 전환, 캔버스 이동, 확대, 축소와 전체 맞춤은 유지한다.
- `apps/notes/src/_pages/notes/ui/mobile-note-card.tsx`의 짧은 누르기 상세 이동과 길게 누르기 복사는 유지하되, 복사 아이콘을 같은 미리보기에 항상 발견 가능한 동작으로 추가한다.
- `apps/notes/src/features/edit-batch-copy/`와 `apps/notes/src/entities/batch-copy/`의 원문 스냅샷, 중복 항목, 제거 이력, 복제와 전체 복사 결과는 유지한다.
- `/usage`, `/analysis`, `/templates`와 `/settings`의 과업과 저장 자료는 유지한다. 이 화면은 메모 화면에서 확정한 글자, 색, 간격과 상태 규칙을 사용하되 새로운 시각 문법을 만들지 않는다.
- `ActionToast`, `ActionPopover`, `Button`, `IconButton`, `TextField`, `Textarea`, `Checkbox`와 아이콘 모음은 책임과 접근 가능한 이름을 먼저 확인한 뒤 재사용한다. 현재 외형이나 API를 보존해야 할 이유가 없으면 같은 파일에서 정리한다.

## 교체할 현재 표현과 연결 지점

- `apps/notes/src/_app/styles/tokens.css`의 `note`, `note-header`, `note-line`, `rail`과 `workspace` 중심 색 이름은 개별 화면 물체가 아니라 canvas, surface, text, border, accent, focus, selection, danger와 feedback 역할로 옮긴다.
- `apps/notes/src/_app/styles/globals.css`의 목재 무늬와 노란 메모 계열을 제거하고 따뜻한 중립 배경, 낮은 대비의 캔버스와 흰색에 가까운 메모 표면으로 바꾼다.
- `apps/notes/src/_app/ui/application-frame.tsx`와 `navigation/application-navigation.tsx`의 route별 상단 및 측면 탐색 전환은 새 기준에서 유지하지 않는다. 좁은 화면에서 보조 화면으로 이동하는 최종 방식은 별도 결정 전까지 구현하지 않는다.
- `apps/notes/src/_pages/notes/ui/note-card.tsx`의 헤더 전체 이동 영역과 맨 앞으로, 맨 뒤로 및 삭제 버튼의 상시 나열을 명시적인 이동 핸들, 복사 버튼과 더보기 동작으로 바꾼다. 본문 편집과 텍스트 선택은 이동 입력과 겹치지 않아야 한다.
- `apps/notes/src/_pages/notes/ui/mobile-note-card.tsx`의 노란 카드, 그림자와 `내용 더 있음` 표시는 제거한다. 본문을 제한된 줄로 자르고 복사 버튼과 상세 이동을 서로 다른 실행 대상으로 제공한다.
- `apps/notes/src/features/edit-batch-copy/ui/batch-copy-list.tsx`와 `apps/notes/src/_pages/batch-copy/ui/mobile-batch-copy-confirmation-list.tsx`는 평상시 삽입 위치와 안내를 표시하지 않는다. 이동 핸들로 시작한 드래그 중에만 실제 앞뒤 삽입 결과를 표시한다.
- 저장 성공은 지속적인 토스트보다 실행 제어의 짧은 상태 변화로 알린다. 복사 성공은 포커스를 가져가지 않는 `복사됨` 알림을 사용하고, 실패는 다음 행동을 제공한다.

## 공식 자료에서 확인한 규칙

### 드래그는 대체 조작과 결과 예측을 함께 제공한다

[WCAG 2.2의 Dragging Movements 설명](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)은 드래그로 제공하는 기능을 드래그 없이 한 번의 포인터로도 실행할 수 있어야 한다고 설명한다. [G219 기법](https://www.w3.org/WAI/WCAG22/Techniques/general/G219)은 항목 선택 뒤 위아래 이동이나 원하는 위치 선택을 충분한 대안으로 제시한다. 따라서 일괄 복사 항목의 더보기 동작은 위치 이동, 복제와 삭제를 제공하고 키보드 방향키 조작도 같은 재정렬 명령을 사용한다.

[Atlassian Drag and Drop 디자인 지침](https://atlassian.design/components/pragmatic-drag-and-drop/design-guidelines)은 편집이나 다른 버튼이 있는 항목에서는 이동 핸들만 드래그 가능하게 만들고, 핸들 조작 영역을 최소 `24px × 24px`로 두도록 안내한다. 같은 지침은 상대 위치를 나타낼 때 드래그 중에만 삽입선을 표시하고, 놓은 뒤 화면 순서를 즉시 갱신하도록 권한다. 이 근거에 따라 본문 선택과 이동을 한 표면에 겹치지 않고, 평상시 드롭선과 설명 문구를 제거한다.

[Apple Drag and Drop 지침](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop)은 이동 대상과 놓을 곳을 계속 식별할 수 있는 피드백을 제공하고 플랫폼별 포인터, 키보드와 보조 기술 조작을 고려하도록 안내한다. 드래그 미리보기, 떠 있는 깊이와 삽입선은 이동이 시작된 동안에만 표시한다.

### 조밀한 화면도 최소 조작 크기와 포커스를 지킨다

[WCAG 2.2 Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)은 조작 영역을 기본적으로 `24 × 24 CSS px` 이상으로 두거나 정의된 간격 예외를 충족하도록 요구한다. pointer가 정밀한 화면의 조밀한 아이콘 제어도 이 하한을 지키고, touch 화면은 시각 아이콘과 약 `44px` 조작 영역을 분리해 검증한다.

[WCAG Focus Appearance 설명](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance)은 2 CSS px 둘레에 해당하는 면적과 충분한 대비를 포커스 표시의 이해하기 쉬운 기준으로 제시한다. 메모 선택, 속성 대상과 키보드 포커스를 같은 선으로 겹치지 않고, `focus-visible`을 별도 의미로 유지한다.

### 간격과 높낮이는 역할을 설명할 때만 사용한다

[Fluent 2 Layout 지침](https://fluent2.microsoft.design/layout)은 4px 기반 간격 단계를 사용하되 아이콘 정렬을 위한 2, 6, 10px 보정을 허용한다. 또한 간격이 내용의 묶음을 전달하므로 모든 구획에 선을 추가할 필요가 없다고 설명한다. 디자인 토큰은 4px 리듬을 기본으로 삼고, 광학 보정값은 반복되는 구성요소 책임이 확인될 때만 추가한다.

Atlassian 지침은 드래그 미리보기와 원래 항목의 구분, 실제 앞뒤 위치를 나타내는 삽입선을 서로 다른 피드백으로 사용한다. 기본 메모에는 강한 그림자를 두지 않고, 드래그 중인 항목과 popover, toast 및 dialog에만 raised 또는 overlay 깊이를 적용한다.

## 브랜드 색 대비 확인

브랜드 accent `#EE5165`는 넓은 면적을 채우는 배경이 아니라 선택, 포커스, 현재 탐색 위치와 주요 동작에 제한해 사용한다. WCAG 상대 휘도 공식으로 계산하면 `#EE5165`와 흰색의 대비는 약 `3.50:1`이므로 일반 크기 버튼 문구 조합으로 사용하지 않는다. `#18181B`와의 대비는 약 `5.06:1`이므로 일반 크기 문구 후보가 될 수 있다.

실제 토큰 확정 때에는 브라우저가 계산한 색으로 일반 문구 `4.5:1`, 큰 문구와 비문자 제어 `3:1` 이상을 확인한다. accent hover, pressed, subtle과 foreground는 대표 메모, 탐색, 버튼, 포커스와 선택 상태를 함께 렌더링한 뒤 정한다.

## 구현과 검증에 미치는 영향

디자인 재구축은 `tokens.css`, `globals.css`, `shared/ui`, 애플리케이션 프레임, 메모, 일괄 복사와 보조 화면 순서로 진행한다. 현재 저장 자료 형식과 기능 명령을 먼저 보존한 뒤 각 화면의 표현을 바꾸며, 일괄 복사 삽입식 재정렬만 요구사항에 맞춰 모델과 테스트 기대값을 함께 갱신한다.

시각 검토는 넓은 pointer 화면, 320 CSS px 화면, 200% 글자 확대, `forced-colors`와 `prefers-reduced-motion`에서 수행한다. 복사, 저장 실패, 선택, 포커스, 속성 대상, 드래그 중과 놓기 결과가 색 하나나 hover 하나에만 의존하면 완료로 판단하지 않는다.

## 남은 결정

메모, 상세 화면, 템플릿, 분석, 사용 빈도와 설정 사이를 이동하는 좁은 화면의 전역 탐색 방식은 아직 정해지지 않았다. 하나의 주 헤더를 유지하면서 bottom navigation과 navigation sheet 중 어떤 방식이 현재 화면 수와 작업 빈도에 맞는지 별도 비교한 뒤 요구사항과 결정 기록을 갱신해야 한다.

accent 파생 색, 중립색, 역할별 모서리, pointer 아이콘 제어의 정확한 크기와 동작 전환 시간은 대표 화면의 대비, 밀도와 상태 검증 뒤 확정한다. 이 값은 화면마다 임의로 정하지 않는다.
