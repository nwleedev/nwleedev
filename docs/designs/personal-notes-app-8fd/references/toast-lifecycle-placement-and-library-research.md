# 토스트 알림 수명, 배치와 구현 방식 조사

## 조사 질문과 적용 범위

이 조사는 [개인 메모 애플리케이션 요구사항](../requirements.md)의 공유 알림 영역에 적용할 상태 수명, 화면 기준 배치와 구현 방식을 정한다. 활성 알림이 페이지 이동에서 사라졌다가 돌아왔을 때 다시 나타나는 문제, 화면마다 위치가 달라지는 문제와 외부 라이브러리 도입 필요성을 함께 검토했다.

현재 `apps/notes/package.json`은 Next.js 16.3.3, React 19.2.8과 Tailwind CSS 4.3.3을 사용하며 토스트 전용 의존성은 없다. `ActionToast`는 5초 타이머, hover 및 포커스 일시정지, 닫기, 다시 시도와 실행 취소 동작을 이미 제공한다. 부족한 부분은 개별 토스트 표현이 아니라 알림 상태와 배치 영역의 수명이다.

## 현재 구현에서 확인한 원인

넓은 메모 화면은 `BatchCopyWorkspace` 안에서 알림을 렌더링하고 오른쪽 패널 표시 여부에 따라 오른쪽 위치를 바꾼다. 모바일 확인 화면은 해당 페이지 안에서 헤더 아래 오른쪽에 알림을 렌더링한다. 같은 `ActionToast`를 사용해도 부모 컴포넌트의 좌표계와 너비가 달라 화면에서 보이는 위치가 달라진다.

일부 알림 상태는 공통 layout 아래의 `NoteSessionProvider`에 남지만 실제 알림 컴포넌트와 타이머는 페이지에 있다. 페이지 이동으로 알림 컴포넌트가 unmount되면 화면에서 사라지고, 상태가 남아 있는 페이지로 돌아오면 같은 알림을 다시 mount한다. 만료 시각을 가진 알림도 돌아온 첫 렌더에서 잠깐 나타날 수 있고, 페이지 지역 상태로 만든 알림은 페이지마다 다른 수명 규칙을 갖게 된다.

따라서 원인은 페이지별 알림 UI가 아니라 다음 두 책임이 나뉜 데 있다.

- 알림의 현재 값과 만료 시각은 애플리케이션 실행 수명에서 한 곳이 관리해야 한다.
- 실제 알림은 페이지 레이아웃과 무관한 하나의 화면 기준 영역에서 렌더링해야 한다.

## 플랫폼과 접근성 근거

[CSS Positioned Layout Module Level 3](https://www.w3.org/TR/css-position-3/)은 `position: fixed`가 보통 viewport를 기준으로 배치되고 문서 스크롤에 따라 움직이지 않는다고 정의한다. 화면 기준 알림 영역은 페이지의 `absolute` 위치보다 fixed 배치가 맞다. 다만 transform이나 contain이 있는 조상은 fixed containing block을 만들 수 있으므로 공통 layout의 최상위 형제로 두고 그런 조상 아래에 넣지 않아야 한다.

[CSS Environment Variables Module Level 1](https://drafts.csswg.org/css-env-1/#safe-area-insets)은 `safe-area-inset-*` 값을 화면에서 가려지지 않는 사각형의 안쪽 여백으로 제공한다. 알림 영역은 고정된 한쪽 좌표나 백분율 이동으로 가운데를 계산하지 않고, `inset-inline: 0`인 전체 너비 배치 영역 안에서 가운데 정렬해야 한다. 양쪽 padding에는 디자인 간격과 safe area 중 큰 값을 사용하고, 토스트 자체에는 최대 inline size와 사용 가능한 너비를 함께 적용해야 한다.

[WCAG 2.2 상태 메시지 이해 문서](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)는 상태 메시지가 포커스를 받지 않아도 보조 기술로 전달되어야 한다고 설명한다. 현재의 `status`와 `alert` 구분 및 포커스를 가져가지 않는 규칙은 유지할 근거가 있다. [React Aria Toast 문서](https://react-aria.adobe.com/Toast)는 닫기 버튼, 최소 5초의 자동 종료 시간, hover 및 포커스 중 타이머 일시정지와 마지막 토스트를 닫은 뒤의 포커스 복원을 권장한다. 현재 `ActionToast`가 제공하는 동작을 버릴 이유가 없다.

[React `createPortal` 문서](https://react.dev/reference/react-dom/createPortal)는 portal이 DOM의 물리적 위치만 바꾸고 React Context와 이벤트 관계는 원래 트리를 따른다고 설명한다. 현재 공통 provider는 `body`의 직접 자식 구조에 있고 transform 또는 overflow로 알림을 자르는 공통 프레임이 없다. 따라서 첫 구현에서는 portal을 추가하지 않고 provider가 페이지 콘텐츠와 같은 단계에 fixed 알림 영역을 렌더링하는 방식이 더 작다. 향후 포트폴리오 호스트가 transform이나 clipping 조상을 강제할 때 portal을 다시 검토한다.

## 직접 구현 유지

현재 `ActionToast`와 타이머를 유지하고 애플리케이션 범위 알림 상태와 fixed 알림 영역만 추가한다.

- 추가 의존성과 외부 기본 테마가 없다.
- 현재 한 건 교체 규칙, 절대 만료 시각, 닫기, 다시 시도, 실행 취소와 포커스 복원을 그대로 사용할 수 있다.
- 페이지 이동은 알림 컴포넌트를 unmount하지 않으므로 남은 시간이 이어지고, 만료되거나 닫힌 알림은 돌아왔을 때 다시 나타나지 않는다.
- 화면 위쪽 중앙의 한 알림 영역을 `inset-inline`, safe area padding과 최대 inline size로 배치할 수 있다.
- 접근성 타이머와 포커스 복원 코드를 계속 직접 관리해야 하지만, 이 책임은 이미 현재 코드와 브라우저 검사가 맡고 있다.

## Sonner 2.0.8

[Sonner 공식 문서](https://sonner.emilkowal.ski/)는 애플리케이션 루트의 `Toaster`, 여섯 위치, action, close button과 headless 표현을 제공한다. 2.0.8은 MIT 라이선스이며 React 18과 19를 peer dependency로 지원하고 직접 runtime dependency가 없다.

루트 렌더링과 화면 기준 배치는 요구에 맞지만, 여러 알림, swipe, promise와 자체 전역 발행 API까지 도입한다. 현재 한 건 교체 규칙과 기존 `ActionToast`를 Sonner API로 다시 연결해야 하므로 상태 수명과 배치만 바로잡는 변경보다 크다.

## Radix Toast 1.2.23

[Radix Toast 공식 문서](https://www.radix-ui.com/primitives/docs/components/toast)는 애플리케이션을 감싸는 Provider와 fixed viewport, 자동 종료, hover, focus 및 창 blur 일시정지, hotkey와 swipe를 제공한다. 1.2.23은 MIT 라이선스이고 React 19를 지원하지만 toast package는 Radix의 portal, context, presence, primitive와 collection 등을 포함한 여러 runtime package에 의존한다.

접근성 기반은 충분하지만 현재 요구하지 않은 hotkey, swipe와 여러 토스트 수명을 함께 가져온다. 한 건만 표시하는 기존 규칙과 고유 디자인 시스템을 위해 다시 감싸야 하므로 도입 이익이 작다.

## React Aria Components 1.21.1

[React Aria Toast 문서](https://react-aria.adobe.com/Toast)는 React 바깥의 `ToastQueue`, 탐색 가능한 `ToastRegion`, 타이머 일시정지, 닫기와 포커스 복원을 제공한다. 1.21.1은 Apache-2.0 라이선스이며 React 19와 호환되지만 문서가 Toast를 alpha로 표시하고, package는 `react-aria`, `react-stately`, 국제화 및 날짜 package를 포함한다.

여러 알림과 키보드 탐색을 포함한 알림 체계가 필요해질 때는 강한 후보지만, 현재 알림 한 건을 위해 alpha API와 넓은 의존성 범위를 추가하지 않는다.

## React-Toastify 11.1.0

[React-Toastify 설치 문서](https://fkhadra.github.io/react-toastify/installation/)는 애플리케이션 루트에 `ToastContainer`를 한 번 렌더링하도록 안내한다. [위치 문서](https://fkhadra.github.io/react-toastify/positioning-toast/)는 화면의 여섯 위치를 지원하며, [접근성 문서](https://fkhadra.github.io/react-toastify/accessibility/)는 기본 역할을 `alert`로 둔다. 11.1.0은 MIT 라이선스이고 React 18과 19를 지원하며 `clsx`에 의존한다.

현재 애플리케이션은 일반 결과에 정중한 `status`, 긴급 오류에 `alert`를 구분하고 한 알림만 표시한다. 기본 역할, 여러 알림 queue, drag 제거, 진행 표시와 외부 스타일을 다시 제한해야 하므로 현재 요구보다 넓다.

## 비교 결론과 계획 영향

새 라이브러리를 추가하지 않고 현재 구현을 애플리케이션 범위로 옮긴다. 이 선택은 외부 기능을 새로 만드는 결정이 아니라 이미 있는 알림 표현과 타이머를 한 수명과 한 배치 영역으로 합치는 변경이다.

- 공통 provider가 현재 알림 한 건, revision과 절대 만료 시각을 관리한다.
- 공통 layout에 페이지 콘텐츠와 형제인 알림 영역을 한 번 렌더링한다.
- 알림 영역은 화면 위쪽 중앙에 fixed로 두고, inline 전체 너비의 가운데 정렬, 양쪽 safe area padding과 토스트 최대 inline size로 작은 화면 및 글자 확대에서 잘리지 않게 한다.
- 페이지 컴포넌트의 `absolute`, `right`, `top` 배치 wrapper와 페이지별 알림 상태를 제거한다.
- 내부 페이지 이동은 알림과 남은 시간을 유지한다. 원래 만료 시각이 지나거나 닫힌 알림은 이전 페이지로 돌아와도 다시 만들지 않는다.
- 표시해야 하는 알림이 여러 건으로 늘어나거나 키보드로 알림 목록을 탐색해야 하는 요구가 생기면 React Aria Components와 Radix Toast를 다시 비교한다. 포트폴리오 호스트가 fixed containing block 또는 clipping을 만들면 `createPortal`을 다시 검토한다.

## 확인하지 못한 범위

후보 package는 2026년 9월 26일의 npm metadata와 공식 문서를 비교했으며 설치하거나 번들 결과를 측정하지 않았다. 이번 결론은 어떤 후보도 설치하지 않는 것이므로 lockfile, 실제 전이 의존성과 보안 감사 결과는 바뀌지 않는다. 구현 단계에서는 320 CSS px, 200% 글자 확대, safe area, 모바일 화면 키보드, 넓은 화면의 오른쪽 패널 표시 여부와 내부 페이지 왕복을 실제 브라우저에서 확인해야 한다.
