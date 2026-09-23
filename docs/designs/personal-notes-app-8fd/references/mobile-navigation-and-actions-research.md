# 좁은 화면 탐색과 메모 동작 조사

이 조사는 [요구사항의 좁은 화면 탐색과 메모 동작](../requirements.md#반드시-지킬-조건)을 구현할 때 Drawer, 화면 우측 하단 제어, 메모 누르기와 토스트 닫기가 서로 충돌하지 않게 하는 근거다. 2026년 9월에 현재 소스와 공식 문서를 확인했다. 요구사항의 Drawer 제공 범위와 메모 누르기 동작은 승인된 결과이며, 아래 기술 자료는 그 결과를 구현하는 방법을 판단하는 데 사용한다. 저장된 일괄 복사 항목 수 링크의 Drawer 이동은 [별도 조사](mobile-saved-batch-copy-drawer-research.md)가 이 문서의 두 하단 제어 배치 검토보다 우선한다.

## 현재 저장소에서 확인한 차이

- `apps/notes/src/_app/ui/application-frame.tsx`가 모든 route를 감싸고 URL로 메모 작업 여부를 판정한다. `apps/notes/app/layout.tsx`는 이 구성요소를 주소 검사와 자료 Provider 안에 둔다. 화면별 프레임으로 나눌 때 주소 검사, 자료 Provider, 화면 이동 확인과 본문 바로가기 링크가 사라지면 안 된다.
- `apps/notes/src/_app/ui/navigation/application-navigation.tsx`는 넓은 화면의 주요 이동 링크와 좁은 화면의 펼침 목록을 한 헤더에서 그린다. 좁은 메모 화면에서는 헤더 전체가 숨겨진다. 따라서 메모 목록에는 주요 화면으로 이동할 탐색이 없고, 보조 화면의 탐색은 Drawer가 아니다. `use-application-navigation.ts`에는 이동 전 확인과 현재 화면 표시가 있으므로 이 동작은 새 탐색에도 필요하다.
- `apps/notes/src/_pages/notes/ui/mobile-notes-workspace.tsx`는 평상시 새 메모를 헤더 왼쪽에 배치한다. 일괄 복사 수집 중에는 같은 자리에 뒤로가기를 놓고 오른쪽에는 빈 자리를 둔다. `mobile-note-card.tsx`는 본문 전체를 상세 링크로, 오른쪽 버튼을 복사로 연결하며, 일괄 복사 수집 중에도 복사 버튼을 계속 렌더링한다. 새 메모를 우측 하단으로 옮길 때 평상시 헤더 왼쪽 자리를 Drawer 열기에 사용할 수 있지만 수집 중 뒤로가기는 유지해야 한다. 저장된 일괄 복사 항목 수 링크는 별도 결정에 따라 Drawer로 옮긴다.
- `apps/notes/src/shared/ui/action-toast/action-toast.tsx`는 자동 종료와 선택적 동작 버튼을 제공하지만 사용자가 즉시 닫는 버튼은 그리지 않는다. 자동 종료 수명은 `use-action-toast-timer.ts`가 관리한다.

## 외부 자료와 적용 범위

[WAI-ARIA 모달 대화상자 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)은 모달을 열면 포커스를 내부로 옮기고, `Tab` 이동을 내부에 유지하며, `Escape`와 닫기 동작을 제공하고, 닫은 뒤 대체로 실행 제어로 포커스를 돌리는 규칙을 제시한다. 좁은 화면 Drawer를 모달로 구현한다면 그대로 적용할 수 있다. Drawer가 반드시 모달이어야 한다는 근거는 아니므로 다른 형태를 선택하면 해당 형태의 포커스 규칙을 다시 확인해야 한다.

[WCAG 2.2 포인터 취소 설명](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation)은 일반 `click`이 손을 뗄 때 실행돼 취소 기회를 주고 touch 및 키보드 입력에도 연결된다고 설명한다. 메모 전체의 기본 복사는 누르기 시작 시점이 아니라 완료된 활성화에서 처리하고, 수정 아이콘 및 길게 누르기와 같은 입력 연속 동작에서는 결과가 한 번만 나와야 한다는 구현 판단을 뒷받침한다.

[WCAG 2.2 조작 대상 크기 설명](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)은 조작 대상에 최소 크기 또는 충분한 간격을 요구한다. 화면 우측 하단 새 메모, 수정 아이콘과 토스트 닫기 버튼은 아이콘 그림 크기와 실제 누를 수 있는 영역을 따로 확인해야 한다.

[CSS 환경 변수 설명](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)은 `safe-area-inset-bottom` 등 환경 값을 CSS 위치와 여백에 사용할 수 있음을 설명한다. 우측 하단 제어와 Drawer의 하단 여백은 실제 화면 영역에 따라 계산하고 기기별 높이 상수를 늘리지 않는 것이 적절하다. 화면 키보드와 브라우저 도구 모음의 실제 가림 여부는 브라우저에서 별도로 확인해야 한다.

[Next.js App Router의 프로젝트 구조 문서](https://nextjs.org/docs/app/getting-started/project-structure)는 route group이 URL을 바꾸지 않고 route 일부에 별도 layout을 적용할 수 있다고 설명한다. 하지만 이 저장소에서는 `app/layout.tsx`가 주소 검사와 자료 Provider를 함께 담고 있으므로 여러 root layout을 만들기보다 현재 root 책임을 유지하고 필요한 route에서 과업별 프레임을 조립하는 방식을 먼저 검토한다. 이 문서는 특정 파일 분할을 강제하지 않는다.

## 왼쪽에서 여는 Drawer의 근거와 적용 범위

평상시 메모 목록의 왼쪽 헤더 버튼에서 탐색을 열고, Drawer도 화면 왼쪽 바깥에서 안쪽으로 들어오는 방향을 선택한다. 이는 버튼 위치와 패널의 출발 방향을 일치시키려는 현재 화면의 판단이다. 왼쪽에서 열리는 동작의 존재와 구현 가능성은 공식 예시에서 확인되지만, 외부 서비스의 패널 너비나 전환 시간을 그대로 채택하는 결정은 아니다.

2026년 9월 23일 390 CSS px 너비에서 [Amazon](https://www.amazon.com/)의 왼쪽 메뉴 열기와 [IKEA](https://www.ikea.com/us/en/)의 오른쪽 메뉴 열기를 직접 비교했다. 두 화면 모두 버튼으로 패널을 열지만 출발 방향이 달랐다. 현재 메모 목록에서 비게 되는 헤더 자리는 왼쪽이므로 왼쪽 사례의 방향만 채택한다. 이 관찰은 두 사이트의 내부 CSS나 모든 지역 및 기기에서의 동작을 입증하지 않는다.

- [Material UI Drawer 문서](https://mui.com/material-ui/react-drawer/)는 메뉴 아이콘으로 여는 임시 탐색 패널의 기본 출발 방향이 왼쪽이고, 임시 패널에 Slide 전환을 적용한다고 설명한다. 배경 누르기와 `Escape`로 닫는 예시도 제공한다. 이 자료는 외부 컴포넌트를 추가해야 한다는 근거가 아니라 왼쪽 진입과 닫기 동작을 비교하는 자료다.
- [Bootstrap Offcanvas 문서와 실시간 예시](https://getbootstrap.com/docs/5.3/components/offcanvas/)에서 왼쪽 출발 예시를 2026년 9월 23일 화면으로 확인했다. 패널은 본문 위의 왼쪽 가장자리에 나타나고 나머지 화면에는 어두운 배경이 남는다. 문서는 왼쪽과 오른쪽 출발 위치, 닫기 버튼, 배경 누르기와 전환 중 상태를 각각 설명한다. 이 예시의 색, 너비와 전환 수치는 현재 메모 화면의 값으로 사용하지 않는다.
- [web.dev의 애니메이션 성능 설명](https://web.dev/articles/animations-and-performance)은 화면의 크기나 배치를 매 프레임 바꾸는 속성보다 `transform`과 `opacity`의 전환을 권한다. 메모 목록과 우측 하단 새 메모 버튼을 밀거나 너비를 바꾸지 않고 Drawer 패널 자체를 왼쪽 바깥에서 제자리로 옮기는 선택을 뒷받침한다.
- [W3C의 움직임 줄이기 기법](https://www.w3.org/WAI/WCAG22/Techniques/css/C39)은 `prefers-reduced-motion` 설정에서 필수적이지 않은 움직임을 억제하는 검사 방법을 제시한다. 왼쪽 진입을 선택해도 움직임을 줄이도록 설정한 사용자에게 동일한 이동 애니메이션을 강제하지 않는다.
- [MDN의 `dialog` 전환 설명](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#animating_dialogs)에 따르면 네이티브 모달을 닫을 때도 퇴장 전환을 보이게 하려면 `display`와 `overlay`의 이산 전환, `@starting-style`과 대상 브라우저 확인이 필요하다. 패널이 사라진 뒤에만 움직이는 것처럼 보이거나 닫는 중 포커스가 배경으로 먼저 이동하는 구현을 피해야 한다.

현재 코드에는 Drawer가 없으므로 실제 메모 화면의 진입 방향과 움직임은 아직 검증되지 않았다. 평상시 메모 목록에서는 새 메모가 떠난 왼쪽 헤더 자리를 열기 버튼에 배정하고, 일괄 복사 수집 중에는 왼쪽 뒤로가기와 오른쪽 열기 버튼을 함께 둔다. 보조 화면도 자신의 한 줄 헤더에 열기 버튼을 두되 Drawer의 출발 방향은 왼쪽으로 통일한다. 상세 편집과 일괄 복사 확인 및 관리 화면에는 열기 버튼을 추가하지 않는다.

패널의 열림과 닫힘에는 가로 `transform` 전환, 배경에는 투명도 전환을 우선 검토한다. `prefers-reduced-motion: reduce`에서는 이동 전환을 생략해도 열기, 닫기, 포커스 복귀와 화면 이동 확인이 같아야 한다. 현재 `--notes-motion-panel` 토큰이 있지만 정확한 시간과 가속 곡선은 실제 모바일 화면, 글자 확대와 대상 브라우저에서 확인한 뒤 확정한다. 가장자리 스와이프나 새 애니메이션 라이브러리는 이번 요구에서 도출되지 않는다.

## 계획에 적용할 판단과 남은 확인

프레임 분류는 화면이 실제로 요구하는 탐색, 스크롤과 하단 동작으로 정한다. 보드는 공간 이동과 패널, 좁은 목록은 Drawer와 우측 하단 제어, 상세 편집은 저장과 이탈 확인, 일괄 복사는 작업 단계별 하단 동작, 보조 화면은 문서형 스크롤과 Drawer를 기준으로 검토한다. 같은 링크 자료와 화면 이동 확인은 재사용하되 하나의 전체 route wrapper에서 조건문으로 모든 화면을 처리하지 않는다.

메모를 누르는 복사, 길게 누르기 복사, 수정 아이콘 상세 이동, 일괄 복사 수집 중 항목 추가는 같은 카드에 있지만 서로 다른 동작이다. 실제 touch, mouse, keyboard 및 스크롤 중단에서 한 입력이 여러 동작을 실행하지 않는지 확인해야 한다. 저장된 항목 수 링크는 Drawer로 옮기므로 이 링크와 새 메모 제어를 우측 하단에 함께 배치할 필요가 없다. Drawer의 왼쪽 출발 방향은 정했지만 패널 너비, 전환 시간과 곡선, 링크 가독성과 토스트 위치는 320 CSS px, 큰 글자, 화면 키보드 및 safe area가 있는 대표 화면에서 시각적으로 확인한 뒤 값을 정한다.
