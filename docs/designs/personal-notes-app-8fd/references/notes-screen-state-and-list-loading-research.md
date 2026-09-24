# 메모 화면 상태와 전체 목록 렌더링 조사

결론: 전체 메모를 읽어 일괄 복사에서 어느 메모든 선택할 수 있게 유지한다. 새로고침에서 저장 초안이 존재한다는 이유만으로 모바일 수집 화면을 자동으로 띄우지 말고, 평상시 목록과 사용자가 선택한 이어가기를 구분한다. 화면 높이를 확보하려고 빈 행을 둘 필요 없이 메모와 일괄 복사 제어를 캔버스 가장자리에 놓는다. 목록 성능은 읽기 비용과 화면 밖 렌더 비용을 먼저 나눠 측정하고, CSS `content-visibility: auto`를 우선 검증한다. 전체 조회 자료를 제한하지 않고 렌더링만으로 해결되지 않는 병목이 확인될 때 가상화를 검토한다. 이는 조사에서 도출한 제안이며 동작 조건은 [요구사항](../requirements.md)이 관리한다.

조사일: 2026년 9월 25일. 저장소의 Next.js 16.3.3, React 19.2.8, IndexedDB 연결과 메모 화면을 확인하고, IndexedDB 표준 문서와 MDN, React, Next.js, Chrome 및 W3C WAI의 공식 문서를 대조했다.

## 저장소와 화면에서 확인한 사실

- `apps/notes/src/entities/note/api/indexed-db-note-repository.ts`의 `getAll()`은 `notes` object store를 전체 조회한다. `apps/notes/src/_pages/notes/model/notes-data-provider.tsx`의 `readNotes()`는 모든 메모를 받은 뒤 각 메모의 복구 초안도 조회한다. 따라서 카드만 제한해 그리면 IndexedDB 전체 조회와 메모별 초안 조회 비용은 그대로 남는다.
- `apps/notes/src/_pages/notes/ui/notes-collection.tsx`는 `layout` 값에 따라 `MobileNotesWorkspace` 또는 `NotesBoard` 하나를 조건부 렌더링한다. 현재 main에서 두 화면을 동시에 마운트한다는 주장은 맞지 않는다. `layout`을 측정하기 전에는 두 화면 모두 렌더하지 않는다.
- 데스크톱 새 메모 버튼은 `notes-collection.tsx`에서 높이를 차지하는 별도 행에 있다. 일괄 복사 trigger는 `apps/notes/src/_pages/notes/ui/batch-copy-workspace.tsx`에서 캔버스 우측 상단에 absolute 배치한다. 전체 캔버스 높이를 유지하려면 새 메모 버튼을 높이를 차지하는 행에서 옮기고, 두 제어의 실제 버튼 영역 외에는 포인터 입력을 가로채지 않는 overlay를 사용한다.
- `apps/notes/src/features/add-note-to-batch-copy/model/mobile-batch-copy-provider.tsx`는 앱 진입 시 IndexedDB 작업 초안을 불러온다. `apps/notes/src/_pages/notes/ui/mobile-notes-workspace.tsx`는 복구된 단계가 `collecting`이면 수집 UI를 곧바로 표시한다. 초안 복구와 현재 사용자가 어느 화면을 열었는지 구분하지 않아 새로고침 후 수집 화면이 나타난다.
- 확인 페이지의 화면 내 뒤로가기는 `resumeCollection()` 성공 뒤 `router.push("/")`를 호출한다. 브라우저 뒤로가기는 Next.js history를 따르지만 현재 화면 코드의 `resumeCollection()`은 실행하지 않는다. 직접 route 진입, 새로고침, 앱 안에서 `push`한 진입과 브라우저 뒤로가기를 각각 확인해야 한다.
- `apps/notes/src/_app/ui/runtime-access-guard.tsx`는 서버 snapshot에 `checking`을 반환하므로 첫 HTML과 hydration 첫 화면을 일치시키면서 `접속 주소 확인 중`을 보여준다. 정상 HTTPS 및 `http://localhost`에서는 이 문구를 보여줄 이유가 없지만 지원하지 않는 주소의 차단과 안내는 유지해야 한다.
- 사용 빈도 표와 템플릿 목록은 바깥 테두리와 행 구분선을 함께 둔다. 분석 화면의 결과 목록도 바깥 `border-y`와 `divide-y`를 함께 쓴다. 템플릿 입력, 작성과 설정에서 section 구분선이 폼 또는 별도 작업 그룹을 나누는지는 화면별로 확인해야 한다. 모든 선을 한꺼번에 삭제할 근거는 없다.

## 전체 조회와 목록 표현 비용

[IndexedDB `IDBObjectStore.getAll()`](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/getAll)은 조건에 맞는 모든 레코드를 배열로 반환하고 레코드 structured clone을 만든다. 따라서 전체 메모 조회는 메모 수와 본문 크기에 따라 CPU와 JavaScript heap을 사용한다. 페이지별 저장소 조회는 이를 줄일 수 있지만, 모바일 화면에서 현재 보이지 않는 메모도 일괄 복사에 추가할 수 있어야 하므로 요구를 충족하지 않는다.

[CSS `content-visibility`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility)는 화면 밖 요소의 layout과 paint 작업을 건너뛰면서 DOM을 유지하는 브라우저 기능이다. 포커스 가능 요소와 접근성 트리를 보존할 수 있어 현재 전체 목록과 상호작용을 바꾸지 않고 검증할 첫 선택이다. 그러나 React component와 effect, observer, DOM node 자체 및 전체 자료 메모리는 남는다. `contain-intrinsic-size` 값은 실제 목록 카드 높이를 확인해 정해야 스크롤 위치가 크게 움직이지 않는다.

[React Profiler](https://react.dev/reference/react/Profiler)는 React subtree의 render와 commit 시간을 측정한다. 측정 자체에 비용이 있고 기본 운영 빌드에서는 비활성화되므로 실제 측정 환경을 정해야 한다. [Chrome Performance Monitor](https://developer.chrome.com/docs/devtools/performance-monitor)는 CPU, JavaScript heap, DOM node 및 layout/style 재계산을 관찰할 수 있다. 이 값을 `getAll()`과 초안 복구 시간, 첫 화면과 실제 스크롤 반응에 함께 대조해 조회, React mount, DOM, layout 중 어느 비용이 느린지 구분한다.

CSS 최적화 뒤에도 React mount나 DOM 수가 주된 병목으로 남으면 목록 렌더링만 가상화할 수 있다. 가상화는 전체 메모 자료나 structured clone 비용을 줄이지 않고, 화면 밖 항목이 DOM에서 빠져 Tab 탐색, 화면 낭독기 탐색, 포커스 대상 유지, 동적 카드 높이와 삭제 뒤 포커스 이동을 복잡하게 한다. 그러므로 화면 안에서 관찰한 병목과 접근성 검증이 있어야 다음 단계로 진행한다. 현재 저장소에 가상화 의존성이 없으며, 측정 전에 새 의존성이나 자체 가상화 구현을 추가할 이유가 없다.

메모별 복구 초안 조회가 목록 첫 화면 표시를 지연하면 모바일 상세 화면에 진입한 뒤 필요한 메모의 초안만 읽는 방안을 검토한다. 그때도 전체 메모 원문은 목록과 일괄 복사에서 유지하고 데스크톱 복구 동작은 바꾸지 않는다.

## 새로고침과 모바일 뒤로가기 상태

[React 상태 보존 문서](https://react.dev/learn/preserving-and-resetting-state)는 트리 위치와 component 수명이 상태 지속에 영향을 준다고 설명한다. [Next.js `useRouter`](https://nextjs.org/docs/app/api-reference/functions/use-router)는 `push`가 브라우저 기록에 새 항목을 추가하고 `back`이 이전 기록으로 이동한다고 명시한다. [Next.js 화면 이동 문서](https://nextjs.org/docs/app/getting-started/linking-and-navigating)는 공유 layout이 route 이동 뒤 유지될 수 있음을 설명한다.

저장된 초안의 `collecting` 또는 `confirming` 단계 하나로 현재 표시할 화면까지 결정하면 저장 복구와 화면 표시 의도가 결합된다. 초안은 보존하되 새로고침의 초기 화면은 평상시 목록으로 정하고, 이어가기 입력을 받은 뒤 초안의 수집 상태를 활성화하는 방향을 제안한다. 확인 화면의 화면 내 뒤로가기와 브라우저 뒤로가기는 메모 목록으로 도착하고 동일한 수집 초안을 제공해야 한다. 확인 화면에서 시작된 history가 없거나 외부 페이지가 이전 기록인 경우에도 잘못된 화면을 열지 않는 fallback을 포함해 확인한다.

새 전역 상태 컨테이너나 화면 전체를 위한 Context를 추가하지 않는다. 기존 모바일 작업의 feature command가 IndexedDB 초안의 상태 전이를 맡고, notes 및 batch-copy 화면은 각자의 model hook에서 route 이동과 표시를 맡는다. 화면이 필요로 하지 않는 Props 전달로 연결하지 않으며, 두 route 진입 방식이 같은 자료 전이 규칙을 사용하는지 브라우저 과업으로 검증한다.

## 접속 주소 문구와 구분선

[React `useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore)는 hydration 중 서버 snapshot과 브라우저 첫 snapshot이 일치해야 한다고 설명한다. [MDN 보안 컨텍스트](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts)는 HTTPS와 `localhost` HTTP를 보안 context로 분류하고 [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)는 보안 context를 요구한다. 따라서 현재 주소 검사와 hydration 일치는 보존하되 정상 접속에서 검사가 진행 중이라는 UI는 보여주지 않는 방향을 검토한다. 미지원 주소의 안내는 유효한 사용자 동작이므로 제거 대상이 아니다.

[W3C WAI 여백 지침](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o3p10-whitespace/)은 여백으로 콘텐츠 묶음을 구분하는 방법을 설명하고, [W3C CSS 구획 기법](https://www.w3.org/WAI/WCAG22/Techniques/css/C25)은 선도 그룹을 전달할 수 있음을 설명한다. 두 방법은 함께 사용할 수 있다. 같은 행 구분을 바깥 테두리와 내부 선이 반복하면 한쪽을 줄일 수 있지만, 표 행, 입력 포커스, 오류 및 상태를 알려주는 선은 유지해야 한다. 화면마다 제목과 간격으로 묶을 정보가 다르므로 화면별로 판단한다.

## 조사 한계

현재 확인은 저장소 코드와 공식 문서 검토에 한정된다. 증상 동작을 현재 브랜치에서 재현한 브라우저 기록과 실제 사용 중인 메모 양 및 본문 길이에서 얻은 성능 기준은 아직 없다. 따라서 초안 상태 전이를 바꿀 코드, 첫 화면 최적화 방식, 가상화 필요성 및 화면별 구분선 제거 여부는 구현 전에 브라우저 과업과 측정으로 확인한다. 숫자 성능 임계값은 미리 만들지 않는다.
