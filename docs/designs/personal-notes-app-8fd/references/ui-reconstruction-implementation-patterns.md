# UI 재구축 구현 패턴 조사

## 결론

UI 재구축은 화면마다 상태와 제어를 새로 만드는 방식이 아니라, 현재 명령과 저장 책임을 유지하면서 표현 상태만 분리하는 방식으로 진행한다. 복잡한 pointer 조작은 명시적인 상태 전이로 관리하고, 일괄 복사 재정렬은 기존 삽입 명령을 모든 입력 방식이 함께 사용한다. 일시 알림은 기존 메모 작업 화면의 조립 지점 한 곳에서 교체하며, 계속 확인해야 하는 실패는 실패한 작업 가까이에 남긴다. 새 drag, toast, dialog 또는 상태 관리 의존성은 추가하지 않는다.

2026년 9월 22일에 React 19, Pointer Events, WAI-ARIA APG, WCAG 2.2와 Feature-Sliced Design의 공식 자료를 확인하고, 현재 `apps/notes/` 구현 및 오픈소스 drag 사례와 비교했다. 설치된 React는 19.2.8이며, React 문서의 19.3 예시에만 있는 작성 방식은 이번 계획의 전제로 삼지 않았다.

## 상태를 한 출처에서 계산한다

[React의 상태 구조 지침](https://react.dev/learn/choosing-the-state-structure)은 함께 바뀌는 상태를 묶고, 서로 모순될 수 있는 중복 상태와 props에서 계산할 수 있는 상태를 피하도록 설명한다. [reducer 지침](https://react.dev/learn/extracting-state-logic-into-a-reducer)은 여러 event handler에 상태 갱신이 흩어져 오류가 생길 때 순수 reducer로 전이를 모으되, 모든 상태에 reducer를 강제하지 말라고 안내한다. [Effect 지침](https://react.dev/learn/you-might-not-need-an-effect)은 외부 시스템과 동기화하지 않는 계산과 사용자 동작을 Effect로 연결하지 말라고 설명한다.

현재 `batch-copy-list.tsx`는 `dragSession`, `drag`, `placementItemId`를 따로 관리하고, `mobile-batch-copy-confirmation-list.tsx`도 gesture ref, drag state와 위치 선택 state를 별도로 관리한다. 각 값의 조합이 가능한 상태인지 event handler마다 다시 판단하므로 취소, 저장 중과 실패 복구를 추가할 때 서로 다른 상태가 함께 남을 수 있다.

적용 패턴은 다음과 같다.

- pointer 조작은 `idle`, 임계값 판정 중, dragging, 저장 중과 실패 복구처럼 동시에 하나만 성립하는 상태로 표현한다. reducer는 다음 상태만 계산하고 pointer capture, scroll, 저장과 포커스 이동은 event handler 또는 전용 hook이 실행한다.
- 표시 순서, 선택 ID와 포커스 복원 대상처럼 항상 함께 복구해야 하는 값은 하나의 작업 snapshot으로 묶는다. 항목 수, 위치 문구와 선택 여부처럼 기존 자료에서 계산할 수 있는 값은 별도 state로 저장하지 않는다.
- 단순한 열림 상태, 입력 중 상태와 한 개의 독립 값에는 `useState`를 유지한다. reducer를 모든 화면의 기본 형식으로 확대하지 않는다.
- 외부 DOM event, timer, `ResizeObserver`, pointer capture와 저장소 구독에만 Effect를 사용한다. 사용자 입력으로 바로 실행할 수 있는 로직과 렌더링용 파생값은 Effect에 넣지 않는다.

## 명령과 낙관적 화면 상태를 분리한다

[React의 `useOptimistic` 문서](https://react.dev/reference/react/useOptimistic)는 저장 중 임시 상태를 먼저 표시하고 실패하면 기준 상태로 되돌리는 절차와 여러 값을 함께 바꿀 때 순수 reducer를 쓰는 방법을 설명한다. 현재 애플리케이션은 `moveBatchCopyItem`, `moveMobileBatchCopyEntry`와 provider의 저장 결과가 이미 기준 자료를 관리한다. React Action 기반 저장 절차를 새로 만들면 같은 순서를 provider와 화면이 이중으로 관리하게 되므로 `useOptimistic` 자체는 도입하지 않는다.

재정렬에는 기존 명령을 유지한 Command 패턴과 작업 snapshot을 적용한다.

1. pointer, keyboard와 위치 변경 제어가 항목 ID와 삽입 index를 같은 명령에 전달한다.
2. 화면은 명령 직전의 순서, 선택 ID와 포커스를 복구 snapshot으로 보관하고 새 순서를 즉시 표시한다.
3. 저장 성공에서는 provider가 돌려준 자료를 기준으로 확정한다.
4. 저장 실패에서는 snapshot을 복원하고 같은 명령을 다시 실행할 수 있는 지속 오류를 표시한다.

이 순서는 별도의 범용 command bus, 전역 store 또는 두 번째 목록 자료를 만들지 않는다. 정확한 이전 상태를 복원할 수 없는 작업은 저장 전에 성공한 것처럼 표시하지 않는 요구사항을 그대로 따른다.

## pointer 조작은 명시적인 수명으로 관리한다

[Pointer Events 표준](https://www.w3.org/TR/pointerevents/)은 pointer capture 뒤 같은 pointer의 event를 한 요소가 계속 받고, `pointerup` 또는 `pointercancel` 뒤 capture가 해제되며 `lostpointercapture`가 발생할 수 있다고 정한다. [WCAG 2.2 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)은 drag로 완성하는 기능에 drag 없는 단일 pointer 대안을 요구한다. [Atlassian drag 접근성 지침](https://atlassian.design/components/pragmatic-drag-and-drop/accessibility-guidelines)은 이동 뒤 같은 항목의 포커스를 유지하고 결과를 live region으로 알리는 대안을 설명한다.

따라서 메모 이동, 캔버스 이동, 모바일 길게 누르기와 일괄 복사 재정렬은 다음 pointer 수명 절차를 공유하되 각 임계값과 결과 명령은 섞지 않는다. 각 구현은 State Machine 패턴으로 현재 단계 하나만 유지한다.

1. 허용된 핸들, 주 pointer와 button인지 확인한다.
2. 시작 자료와 pointer ID를 저장하고 capture를 얻는다.
3. 입력 방식별 임계값을 넘었을 때만 조작 상태로 전환한다.
4. 유효한 결과 미리보기만 갱신한다.
5. `pointerup`에서 한 번 확정하거나, `pointercancel`, 완료 전 `lostpointercapture`, scroll 취소와 유효하지 않은 위치에서 원래 상태로 끝낸다.

핸들마다 이 절차를 복사하지 않는다. 공통 순수 전이는 feature 또는 page model에 두고, DOM event와 자료 명령을 연결하는 hook은 사용하는 화면의 책임에 둔다. 본문, 링크, 버튼과 항목 전체를 drag 시작점으로 사용하지 않는다.

[Pragmatic Drag and Drop GitHub 이슈 158](https://github.com/atlassian/pragmatic-drag-and-drop/issues/158)은 drag 중 브라우저 바깥의 애플리케이션으로 이동했을 때 자동 scroll이 계속되는 사례를 기록한다. 해결 여부가 확정된 자료는 아니므로 특정 라이브러리 결함으로 일반화하지 않는다. 다만 현재 구현의 자동 scroll은 활성 pointer session과 같은 수명에서 시작하고, window blur, document visibility 변화, `pointercancel`과 완료 전 `lostpointercapture`에서 반드시 중단해야 한다는 실패 사례로 사용한다.

## FSD 계층은 책임과 재사용 증거로 정한다

[FSD Layers](https://feature-sliced.design/docs/reference/layers)는 낮은 계층만 import하는 방향과 Shared, Entities, Features, Pages 및 App의 책임을 정한다. Shared UI에는 메모 및 일괄 복사 규칙을 넣지 않고, 여러 화면에서 재사용하는 사용자 동작은 Feature에, 한 화면에서만 쓰는 조립과 상태는 Page에 두도록 설명한다. [FSD Public API](https://feature-sliced.design/docs/reference/public-api)는 필요한 항목만 공개하고, 같은 slice 내부에서는 public API를 우회한 상대 import를 사용해 순환 import를 피하도록 안내한다.

현재 구조에는 이 원칙을 다음과 같이 적용한다.

- `shared/ui`의 `ActionToast`, `ActionPopover`, `StatusNotice`, `Button`과 `IconButton`은 표현, 키보드 및 포커스 동작만 맡는다. 메모 삭제, Clipboard와 일괄 복사 오류 문구는 Page 또는 Feature가 정한다.
- `entities/batch-copy`의 삽입 계산과 ID 보존 규칙은 유지한다. pointer session과 저장 명령 조립은 `features/edit-batch-copy`가 맡고, 모바일 확인 페이지에서만 필요한 long-press 연결은 `_pages/batch-copy`에 둔다.
- 메모 화면의 공유 알림은 새 전역 Provider를 만들지 않고 이미 메모 작업 화면과 오른쪽 panel을 조립하는 `BatchCopyWorkspace`가 한 건을 렌더링한다.
- 수정한 TSX에서 React 기본 hook을 직접 사용하지 않는다. 외부 시스템 연결과 상태 전이는 같은 slice의 model 파일에 둔 전용 hook으로 옮기고, TSX는 hook 결과와 event callback을 구성요소에 연결한다.
- 새 slice나 `shared/ui` 구성요소는 현재 두 곳 이상의 같은 책임이 확인될 때만 만든다. 이름만 다른 wrapper, 범용 `Card`, 범용 drag manager와 모든 알림을 관리하는 전역 service는 만들지 않는다.

## 네이티브 overlay와 포커스 복귀를 유지한다

[WAI-ARIA APG modal dialog 지침](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)은 dialog가 열릴 때 내부에 포커스를 두고, 닫힌 뒤 실행 지점 또는 다음 작업의 논리적인 제어로 포커스를 돌려보내야 한다고 설명한다. 현재 `ActionPopover`와 저장하지 않은 변경 dialog는 네이티브 popover 및 dialog를 사용하므로 외부 overlay 의존성으로 바꾸지 않는다.

- `ActionPopover`는 일반 버튼 묶음으로 유지하고 ARIA menu 패턴을 흉내 내지 않는다. `Escape`, light dismiss와 실행 뒤 trigger로 포커스를 복구한다.
- modal dialog는 저장하지 않은 변경처럼 반드시 선택해야 하는 상황에만 사용한다. 정적 DOM ID를 직접 적지 않고 React `useId` 또는 실제 자료 ID에서 만든 기존 식별 관계를 사용한다.
- 알림은 포커스를 옮기지 않는다. 같은 Page 조립 지점에서 현재 한 건만 렌더링하고, message revision이 바뀌면 시간을 다시 센다. 지속 오류는 `StatusNotice`로 작업 가까이에 남긴다.

## 중복, 사용하지 않는 코드와 하드코딩 방지 기준

- `tokens.css`에 새 역할 토큰을 추가한 뒤 사용하는 화면을 순서대로 옮긴다. 기존 `note`, `note-header`, `note-line`, `rail`, `rail-ink`, `workspace`, `font-display`와 `shadow-note` 참조가 0건인 것을 확인한 뒤 정의와 Tailwind 연결을 함께 제거한다.
- 500ms, 800ms, 5초, 5 CSS px, 10 CSS px, `48rem`, `72rem`, 메모 크기 범위와 `#EE5165`처럼 요구사항 또는 승인된 결정이 정한 값만 이름 있는 상수나 토큰으로 둔다. 화면을 맞추기 위해 임의 숫자를 추가하지 않는다.
- 테스트 자료의 entity ID는 현재 ID generator나 실행 결과에서 얻는다. DOM 연결은 `useId`, 저장된 entity ID 또는 의미 있는 role과 접근 가능한 이름을 사용한다. 순서를 확인하기 위한 `data-*` 값이나 고정 문자열 ID를 새 완료 증거로 만들지 않는다.
- 새 파일은 기존 책임을 실제로 옮길 때만 만들고, 옮긴 뒤 원래 handler, state, import와 export를 같은 절차에서 제거한다. 전환용 중복 구현이나 사용하지 않는 호환 export를 남기지 않는다.
- 각 작업 단위가 끝날 때 수정한 symbol의 import와 사용처를 `rg`로 확인하고, public API export, token, icon, class와 test helper가 0건이면 같은 작업 단위에서 제거한다.

## 조사 한계와 계획 반영

공식 시각 지침의 화면 예시를 MCP 이미지 검색으로도 확인하려 했으나 직접 비교할 수 있는 검색 결과를 얻지 못했다. 따라서 정확한 알림 위치, 모바일 action sheet와 좁은 화면 전역 탐색은 문서만으로 확정하지 않고, 대표 화면을 실제 브라우저에서 비교하고 승인받는 중단 조건을 유지한다.

이 조사에서 확정한 것은 상태와 모듈 책임, pointer 수명, 명령 재사용, 실패 복구 및 코드 제거 순서다. 색 수치, 모바일 관리 표면과 좁은 화면 전역 탐색처럼 승인되지 않은 시각 선택은 임의 값이나 임의 식별자로 채우지 않는다. 구체적인 파일 변경과 검증 순서는 [계획의 UI 디자인 재구축](../plan.md#ui-디자인-재구축)에 반영한다.
