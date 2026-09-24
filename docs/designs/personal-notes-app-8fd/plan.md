---
origin: docs/designs/personal-notes-app-8fd/requirements.md
---

# 로컬 개인 메모 애플리케이션 완성 계획

## 결론

현재 작업은 별도의 백엔드, 데이터베이스와 계정 없이 동작하는 개인 메모 애플리케이션을 모듈별로 완성하는 것이다. 사용자 동작과 저장 규칙을 구현 전에 안정적으로 설명할 수 있는 모듈에만 TDD를 적용하고, Clipboard, IndexedDB, Worker 산출물, 공간형 화면과 드래그처럼 실제 브라우저가 결과를 결정하는 모듈은 브라우저 통합 검사와 기록된 시각 및 접근성 검토로 확인한다. 모든 모듈에 같은 테스트 방식을 강제하지 않는다.

다음 미완료 작업을 시작하기 전에 현재 사용자 동작, 외부에서 사용하는 API, IndexedDB 자료 형식과 오류 처리를 보존 기준으로 확인하고, 적용할 개발 지침을 검토하는 선행 작업을 먼저 완료한다. 기존 코드의 작성 방식을 그대로 복사하지 않고, 요구사항과 승인된 결정이 바꾸도록 정한 부분을 제외한 현재 사용자 동작과 자료 처리를 유지하면서 알려진 안티패턴을 제거한다.

이번 재검토에서는 현재 구현에 필수이지만 값이 없던 선택을 최신 공식 자료, 현재 저장 자료와 실제 화면 근거로 교차검증해 채택했다. 검토한 선택지, 이유, 영향과 다시 검토할 조건은 이 계획에 연결된 결정 기록에 남기고 작업 입력과 검증 항목을 같은 값으로 갱신했다. 사용자 화면과 새 TypeScript 이름에는 `일괄 복사` 및 `BatchCopy`를 사용하고, IndexedDB object store 이름도 `batchCopyLists`로 맞춘다. 이전 schema의 저장소는 `versionchange`에서 한 번 이름을 바꿔 자료를 보존하며, 변경이 끝난 뒤 이전 저장소나 우회 읽기 경로를 유지하지 않는다. 이후 필수 선택이 새로 발견되면 영향을 받는 구현을 멈추고 같은 절차를 적용하며, 현재 범위에서 제외한 백로그의 선택은 그 작업을 시작하기 전에 검토한다.

실행 순서는 현재 독립 실행 배포 선택인 Next.js Node.js 서버와 Dedicated Worker가 운영용 빌드에서 동작하는지 먼저 확인한 뒤, 자료 형태와 브라우저 저장, 디자인 시스템과 과업별 화면 구성, 메모, 개별 복사 및 일괄 복사, 사용 빈도, 텍스트 분석과 템플릿 순으로 진행한다. 정적 사이트 산출물은 만들지 않으며, 이후 작업에 Next.js Server Actions나 Route Handlers가 필요하다고 확인되면 현재 자료 책임과 배포에 미치는 영향을 먼저 검토한다. 각 단위는 선행 결과와 중단 조건을 만족해야 다음 단위의 완료 근거가 될 수 있다.

독립 실행 애플리케이션은 `apps/notes/package.json`이 관리한다. Next.js 라우트는 `apps/notes/app/`에 두고 FSD 코드는 `apps/notes/src/`에 둔다. 모든 FSD 계층을 먼저 만드는 대신 현재 화면, 메모와 템플릿 자료 및 사용자 동작에 필요한 계층만 추가하고, 계층 의존 방향과 slice public API를 각 작업 단위에서 확인한다.

UI는 Tailwind CSS, 네이티브 폼 요소와 자체 `shared/ui`를 바탕으로 집중형 텍스트 유틸리티 작업 화면을 만든다. 모든 인터페이스 글꼴은 Pretendard를 사용한다. 따뜻한 중립색 배경과 흰색에 가까운 표면 위에서 메모 본문과 복사를 먼저 드러내고, `#EE5165` accent는 주요 동작, 현재 위치, 선택, 포커스와 짧은 상태 확인에만 사용한다. 목재 무늬, 노란 sticky note, 짙은 탐색 영역, 상시 관리 버튼과 물체 이름 중심의 색 토큰은 새 디자인의 기준으로 사용하지 않는다. 폼과 무관한 복합 상호작용만 실제 필요가 확인된 범위에서 외부 접근성 부품을 사용할 수 있다.

사용자가 네이티브 폼 요소에서 직접 바꾸는 현재 값과 입력 상태는 React Hook Form이 맡는다. 메모, 화면 또는 과업마다 독립된 폼 수명을 사용하고 같은 편집값을 React state, Context 또는 domain draft에 함께 저장하지 않는다. 자동 저장 실행, IndexedDB 자료, Clipboard, pointer gesture, 일괄 복사 작업과 분석 상태는 각 application 및 domain 책임을 유지한다.

메모 화면은 왼쪽 사이드바 없이 공간형 보드와 오른쪽 보조 패널에 가로 폭을 우선 배정한다. 넓은 화면에서는 한 줄 application bar가 전역 탐색과 메모 화면 진입점을 제공한다. 좁은 화면의 메모 목록과 보조 화면에는 왼쪽에서 열리는 Drawer를 두고, 메모 상세 및 일괄 복사 화면에는 두지 않는다. 평상시 메모 목록에서는 기존 새 메모 버튼의 왼쪽 헤더 자리를 Drawer 열기 아이콘에 쓰고 새 메모는 우측 하단으로 옮긴다. 모든 route에 같은 application frame을 적용하지 않고 보드, 목록, 상세, 일괄 복사 및 보조 화면에 필요한 헤더와 스크롤 및 하단 동작을 각각 배치한다. 넓은 화면의 메모는 왼쪽 이동 핸들, 항상 편집 가능한 본문, 바로 보이는 복사 버튼과 더보기로 구성한다.

상단 탐색과 주 작업 제어는 `1..999`, 각 메모 선택 지점은 저장된 `1000..32767`의 양의 `tabindex`를 사용한다. 이동이 아닌 이동 핸들 한 번 click이나 `Tab` 탐색은 메모를 선택하고, 선택된 이동 핸들의 보조 동작 또는 선택 지점에 포커스가 있는 상태의 `Enter`가 오른쪽 속성 패널을 연다. 선택 표시는 `focus-visible`과 구분되는 accent 기반 상태를 사용하며 과도하게 굵은 외곽선을 기본값으로 두지 않는다. 선택 지점의 `Command+Option+Enter`는 pointer 설정과 관계없이 일괄 복사 항목을 추가한다. 탐색 순서는 시각적 겹침 순서와 독립적으로 유지한다.

빈 캔버스 click과 `Command`는 메모 선택을 해제한다. 상위 임시 조작이 없는 `Escape`는 메모와 일괄 복사 항목 선택을 함께 해제하되 패널 대상과 자료는 유지한다. 이동 핸들 drag 중에는 패널 전환으로 캔버스 계산 크기를 바꾸지 않는다. `Command`를 누르는 동안에는 메모 크기와 본문 시작 위치를 유지한 채 보조 제어를 감춰 본문 복사가 선택으로 이어지지 않게 한다. 운영체제 단축키가 keyup, blur 또는 가시성 event를 누락해도 다음 신뢰할 수 있는 입력에서 제어 상태를 다시 맞춘다.

`48rem` 미만의 메모 목록은 제한된 높이 미리보기를 사용한다. 보이는 화면의 높이가 줄어도 카드를 눌러 담지 않고 목록을 스크롤한다. 메모를 짧게 누르거나 길게 누르면 원문을 한 번 복사하고, 수정 아이콘 버튼으로만 상세 화면에 이동해 원문을 편집하고 저장한다. 새 메모 제어는 메모 수와 관계없이 목록 위에 떠 있는 화면 우측 하단 버튼으로 두고 전용 하단 행을 만들지 않는다. 새 메모를 만든 뒤에도 목록에 남고, 생성된 메모의 수정 아이콘으로만 상세 편집을 시작한다. 저장된 일괄 복사 항목의 관리 링크는 평상시 메모 목록의 Drawer에 두고, 우측 하단에는 항목 수 제어를 남기지 않는다.

목록 화면 헤더의 아이콘으로 일괄 복사 상태를 시작하고, 상태 안에서는 짧게 누른 횟수와 순서대로 항목을 추가하며 길게 누르기는 아무 동작도 실행하지 않는다. 헤더 왼쪽의 뒤로가기 아이콘으로 상태를 끝내며, 화면 아래에는 `초기화`와 클릭 횟수가 함께 표시되는 `다음`을 둔다.

`다음`은 별도 일괄 복사 확인 페이지로 이동한다. 이 페이지에서는 항목 왼쪽의 이동 핸들을 touch drag해 삽입 위치로 옮기거나 항목의 액션 시트에서 `복제` 및 `삭제`를 실행할 수 있다. 설정을 켜면 현재 실행할 수 있는 `위로 이동`과 `아래로 이동`도 같은 시트에 방향 아이콘 버튼으로 나타난다. 저장 목록 관리의 좁은 화면 표현에도 같은 동작 시트를 사용한다. 확인 작업은 원본 메모와 저장된 일괄 복사 목록을 바꾸지 않는 IndexedDB 작업 초안이다.

넓은 화면의 일괄 복사 패널은 현재 항목 목록과 전체 복사만 제공한다. 패널 머리는 약 `38px`로 줄이고, 결합 미리보기, 숫자 순서, 상시 관리 버튼, 실행 취소 및 다시 실행 버튼을 표시하지 않는다. 각 항목은 왼쪽 이동 핸들, 본문과 오른쪽 더보기를 사용한다. 이동 핸들의 pointer drag 또는 키보드 대체 조작은 같은 삽입식 재정렬 명령을 호출한다.

더보기는 `복제`와 `삭제`를 제공하고 설정을 켠 경우에만 현재 실행할 수 있는 `위로 이동`과 `아래로 이동`을 추가한다. 삽입선은 drag 중 실제 결과가 생기는 앞뒤 위치에만 표시한다. 항목 추가 성공 알림은 만들지 않으며, 전체 복사 결과는 캔버스 변환과 패널의 영향을 받지 않는 공유 알림 영역에 한 건만 보여준다.

메모 삭제는 확인 대화상자 없이 즉시 반영하고 공유 알림 영역에 `메모를 삭제했습니다.`와 `실행 취소`를 표시한다. 모든 토스트는 우측의 닫기 아이콘 버튼으로 즉시 닫을 수 있다. 알림은 나타날 때 포커스를 가져가지 않고 5초 뒤 사라지며, hover와 `focus-within`에서는 남은 시간을 멈춘다. 보이는 동안 현재 실행의 LIFO 이력에서 최근 삭제부터 복원한다.

오른쪽 속성 패널과 일괄 복사 패널을 동시에 열지 않으며, 마지막으로 활성화한 패널 하나를 표시한다. 메모 더보기의 `속성` 또는 선택된 메모의 선택 지점에서 실행한 `Enter`는 속성 패널을, 일괄 복사 동작은 일괄 복사 패널을 활성화하고 전환으로 숨겨진 자료를 지우지 않는다. 활성 패널을 닫으면 이전 패널을 자동 복원하지 않는다.

사용자에게 보이는 문구는 현재 내용과 동작, 필요한 조건, 바로 알아차리기 어려운 상태 및 결과와 오류 뒤 다음 행동만 전달한다. 화면 구조와 컨트롤이 이미 알려주는 역할, 구현 기술, 빌드 상태와 현재 과업에 필요하지 않은 소개는 표시하지 않는다. 문구를 줄이더라도 입력 조건, 접근 가능한 이름과 사용자가 직접 확인할 수 없는 동작 결과는 유지한다.

허용된 주소에서는 확인 문구 없이 과업 화면을 열고, 접속 조건을 통과하지 못하면 `잘못된 접근입니다.`와 HTTPS 또는 `http://localhost`로 다시 열라는 행동을 표시한다. 다른 화면도 메모 및 선택 가능한 일괄 복사 항목처럼 독립된 대상의 조작을 전달할 때만 카드 형태를 유지하며, 빈 상태, 단일 오류, 페이지 전체 폼, 표와 목록의 바깥 구조는 제목, 간격, 시각적 위계와 필요한 구분선으로 나눈다.

계정, 로그인, 동기화, 백엔드와 데이터베이스는 이번 계획에서 제외하며 모든 백로그 가운데 우선순위가 가장 높다. 라이브러리 패키지와 포트폴리오 라우트 연결은 그 뒤의 백로그다. 현재 결과물에는 두 백로그를 위한 화면, 현재 과업에 필요하지 않은 서버 코드나 미리 만든 추상화를 포함하지 않는다.

## UI 디자인 재구축

[텍스트 재사용 작업 화면 결정](decisions/focused-text-utility-workspace.md), [조작 피드백과 실패 복구 결정](decisions/interaction-feedback-and-recovery.md), [디자인 시스템 조사](references/focused-text-utility-design-system-research.md), [상용 수준의 조작 경험 조사](references/commercial-service-ux-research.md), [UI 재구축 구현 패턴 조사](references/ui-reconstruction-implementation-patterns.md), [UI 재구축 테스트 선정 조사](references/ui-reconstruction-testing-research.md), [좁은 화면 탐색과 메모 동작 조사](references/mobile-navigation-and-actions-research.md), [모바일 Drawer의 저장 목록 링크 조사](references/mobile-saved-batch-copy-drawer-research.md), [메모 선택 표시, 보기 제어와 캔버스 확대 조사](references/canvas-focus-controls-and-zoom-research.md), [모바일 일괄 복사 액션 시트와 이동 아이콘 조사](references/mobile-batch-copy-action-sheet-and-direction-icons-research.md), [모바일 일괄 복사 액션 시트 닫기 결정](decisions/mobile-batch-copy-action-sheet-dismissal.md) 및 [`apps/notes/DESIGN.md`](../../../apps/notes/DESIGN.md)를 새 UI의 기준으로 사용한다.

이 절은 U4부터 U7과 U11의 시각 표현, 메모 제어 배치, 일괄 복사 재정렬과 피드백 표면 계획을 대체한다. U22부터 U25는 공통 application frame, 좁은 화면 탐색, 메모 기본 동작과 토스트 닫기에 관한 U14, U16, U18 및 U21의 이전 지시보다 우선한다. U26부터 U28은 메모 표면과 캔버스 시점에 관한 U19, U5 및 U12의 이전 구현 설명보다 우선한다. U32는 모바일 일괄 복사 확인 및 저장 목록 관리의 팝오버와 이동 문구에 관한 U17부터 U20 및 이전 절의 지시보다 우선한다. U33과 U34는 화면 목적별 프레임을 유지하면서 문서 전체의 불필요한 스크롤을 제거한다. 이 두 절차는 U21의 Grid 행 수정과 다른 원인을 수정한다. 저장 자료, 자유 배치, 자동 저장, 모바일 명시적 저장, 복사 횟수, 삭제 복구, 분석, 템플릿과 설정 기능은 유지한다. 이 문서의 뒤쪽에 남은 이전 시각 설명은 이미 구현한 기능의 이력으로만 읽고 새 화면의 완료 조건으로 사용하지 않는다.

[React Hook Form 사용 지침](../../dev/personal-notes-app/react-hook-form.md), [테스트 전략](../../dev/personal-notes-app/testing-strategy.md)과 [테스트 안티패턴](../../dev/personal-notes-app/test-anti-patterns.md)은 현재 개발 지침으로 적용한다. [애플리케이션 기술 안티패턴](../../dev/personal-notes-app/anti-patterns.md)은 아직 `proposed`이므로 구현 규칙으로 강제하지 않고, 각 작업 단위에서 공식 자료와 실제 실패 근거를 다시 확인할 조사 항목으로만 사용한다.

작업 단위마다 기존 동작을 먼저 실행한 뒤 한 모듈의 상태 책임과 화면을 함께 바꾸고, 같은 관찰 방법으로 기능 보존과 승인된 변경을 확인한다. 새 파일은 기존 TSX에서 실제 상태 또는 외부 시스템 연결을 옮길 때만 만들고, 옮긴 handler, state, import와 export는 같은 절차에서 제거한다. 전환용 구현, 사용하지 않는 export와 화면마다 다른 알림 또는 drag 상태를 남긴 채 다음 단위로 진행하지 않는다.

식별자는 저장 자료, 브라우저 연결과 접근성 관계에서 확인할 수 있는 출처를 사용한다. entity ID는 현재 generator 또는 실행 결과에서 얻고, DOM 연결은 React `useId`, 저장된 entity ID나 의미 기반 role 및 접근 가능한 이름으로 찾는다. 임의 문자열 ID, 무작위 test ID, 순번을 고정한 fixture ID와 알림용 UUID는 추가하지 않는다. 반복 알림은 실제 결과가 바뀔 때 증가하는 revision으로 구분한다.

### UI 재구축 테스트 선정 원칙

각 테스트 사례는 승인된 요구사항 또는 결정, 시작 자료, 실제 사용자 입력, 완료 뒤 관찰할 결과와 잡아낼 오동작을 코드 작성 전에 설명할 수 있어야 한다. 이 내용을 위한 별도 fixture 명세나 테스트 전용 화면은 만들지 않고 각 작업 단위의 계획과 기존 테스트 이름에 드러낸다. 승인되지 않은 기능과 외부 사례의 화면, 문구 또는 자료 구조는 예상값으로 사용하지 않는다.

대표 사용자 과업 하나를 실제 제어로 끝까지 실행한 뒤, 서로 다른 결함을 찾는 빈 원문, 긴 원문, 같은 원문의 서로 다른 메모, 저장 실패, 권한 거절, 취소와 route 재진입만 추가한다. 기존 테스트가 같은 결과를 더 직접적으로 확인하면 새 테스트를 만들지 않는다. 이전 DOM 구조나 문구만 고정한 검사는 사용자 결과를 확인하는 사례로 교체하고, 대체 증거를 확인한 같은 작업 단위에서 중복 검사를 제거한다.

TDD는 구현 전에 순수 입력, 결과와 불변 조건을 안정적으로 적을 수 있는 새 규칙에만 적용한다. 실제 pointer event, focus, Clipboard, IndexedDB, Worker, CSS와 route 연결은 TDD로 흉내 내지 않는다. 예상값은 요구사항의 수치 및 문구, 승인된 순서 규칙과 테스트가 입력한 원문에서 얻고, 운영 상수나 운영 함수의 반환값으로 만들지 않는다. entity ID는 실행 중 생성된 값을 받아 같은 대상을 추적하되 특정 문자열을 예상하지 않는다.

UI 검사는 role, 접근 가능한 이름, 입력값, 화면 상태, Clipboard 원문, 새 저장소 연결과 다시 연 route를 관찰한다. hook 이름, reducer action 문자열, callback 호출 횟수, Context 값, CSS class, DOM 중첩, 임의 test ID와 큰 snapshot은 완료 증거로 사용하지 않는다. 요구사항이 정한 5초, 500ms, 800ms, 5 CSS px 및 10 CSS px는 독립된 예상값으로 사용할 수 있지만, 그 밖의 대기 시간, 좌표와 항목 수는 테스트 편의를 위해 고정하지 않는다.

테스트 이름은 시작 조건, 사용자가 실행한 동작과 관찰 결과를 함께 적는다. Arrange 단계는 기존 repository 또는 화면 제어로 자료를 준비하되 입증할 동작 자체를 직접 호출하지 않고, Act 단계는 사용자 동작 한 번을 실행하며, Assert 단계는 화면과 실제 외부 결과를 확인한다. 실패를 주입할 때는 기존 application interface를 사용하고 spy 호출 횟수 대신 보존된 원문, 저장 순서, 다시 시도 결과와 Clipboard 값을 검사한다.

비동기 테스트는 동작을 한 번 실행한 뒤 Playwright의 role locator와 web-first assertion 또는 Vitest Browser Mode의 기존 브라우저 도우미로 관찰 결과를 기다린다. `waitFor` 안에서 동작을 반복하거나 `page.waitForTimeout()`, 조건부 검증문, `force: true`와 누락된 `await`로 통과시키지 않는다. 공통 helper는 두 사례 이상에서 같은 사용자 조작이 확인된 뒤에만 추출하고, 내부 state를 읽거나 검증문을 숨기지 않는다. 각 테스트는 독립된 브라우저 및 저장 상태에서 단독으로 실행할 수 있어야 한다.

### U13 디자인 기반과 공통 제어

#### 목적과 선행 조건

역할 기반 token과 공통 제어의 상태 책임을 먼저 확정해 뒤 작업이 화면별 색, 타이머, overlay와 오류 외형을 다시 만들지 않게 한다. `apps/notes/DESIGN.md`의 대비 및 크기 후보를 대표 메모 화면에서 확인하기 전에는 수치를 확정하지 않는다. 이 단위는 저장 자료, application 명령과 route를 바꾸지 않는다.

#### 파일 변화

- 생성: `apps/notes/src/shared/ui/action-toast/use-action-toast-timer.ts`에는 표시 시간, 남은 시간, pause, resume와 revision 변경만 둔다. `apps/notes/src/shared/ui/action-popover/use-action-popover.ts`에는 네이티브 popover 열림, 위치, light dismiss와 trigger 포커스 복귀만 둔다.
- 수정: `apps/notes/src/_app/styles/tokens.css`, `apps/notes/src/_app/styles/globals.css`, `apps/notes/src/shared/ui/button/button.tsx`, `apps/notes/src/shared/ui/icon-button/icon-button.tsx`, `apps/notes/src/shared/ui/action-toast/action-toast.tsx`, `apps/notes/src/shared/ui/action-popover/action-popover.tsx`, `apps/notes/src/shared/ui/status-notice/status-notice.tsx`, `apps/notes/src/shared/ui/icons/icons.tsx`와 `apps/notes/src/shared/ui/icons/index.ts`를 바꾼다. 다른 `shared/ui` public API 파일은 export가 달라지지 않으므로 수정하지 않는다.
- 테스트 수정: `apps/notes/e2e/notes.spec.ts`, `apps/notes/e2e/batch-copy.spec.ts`와 `apps/notes/e2e/clipboard-permissions.spec.ts`의 기존 사용자 과업에 공통 알림과 popover 결과를 반영한다. 새 구성요소 단위 테스트는 만들지 않는다.
- 삭제: 파일은 삭제하지 않는다. `ActionToast`의 항상 보이는 닫기 버튼과 `resetKey?: unknown`, `ActionPopover` 안의 React 기본 hook 및 DOM event 구독, 공통 제어 안의 물체 이름 class를 제거한다. `note`, `note-header`, `note-line`, `rail`, `rail-ink`, `workspace`, `font-display`와 `shadow-note` token은 아직 사용하는 화면이 있으므로 이 단위에서 바로 삭제하지 않고 U18에서 참조 0건을 확인한 뒤 제거한다.

#### 구현 절차와 패턴

1. 역할 기반 Token 패턴을 적용한다. `canvas`, `surface`, `text`, `icon`, `border`, `accent`, `focus`, `selection`, `danger`, `success`, `warning`과 `feedback`만 전역 색 역할로 추가하고, 현재 화면이 옮겨가기 전까지 이전 token을 임시 alias로 유지한다. 화면별 색 수치와 Tailwind arbitrary value를 새 기준으로 만들지 않는다.
2. Headless Component 패턴으로 `ActionToast`를 표현과 수명으로 나눈다. timer hook은 실제 결과 revision이 바뀔 때 5초를 다시 세고, `pointerenter`, `pointerleave`, `focus` 및 `blur`에서 남은 시간을 멈추고 잇는다. TSX는 현재 message와 선택적인 action만 렌더링한다. 단순 성공에서는 닫기 버튼을 렌더링하지 않고, action 실행 및 자동 종료는 알림을 전달한 Page의 dismiss callback을 호출한다.
3. `ActionToast`의 알림 종류는 단순 상태, 실행 취소와 다시 시도로 제한한다. 오류가 계속 보여야 하는지는 공통 구성요소가 추정하지 않고 Page가 `StatusNotice`를 선택한다. 범용 알림 Provider, 알림 queue와 화면별 toast 변형은 만들지 않는다.
4. `ActionPopover`는 네이티브 popover를 감싼 Adapter 패턴을 유지한다. 일반 `button` 묶음을 사용하고 ARIA menu 역할을 추가하지 않으며, `Escape`, light dismiss와 action 실행 뒤 trigger로 포커스를 돌린다. 위치 계산, static DOM ID와 기본 hook은 새 hook으로 옮기고 `useId`가 만든 연결값만 TSX에 전달한다.
5. `Button`, `IconButton`과 아이콘은 Variant 패턴을 제한적으로 사용한다. 현재 쓰는 size 및 tone만 유지하고, 상태별 class는 `joinClassNames`의 정적 후보로 선택한다. 동적 Tailwind class, JSX template literal, 의미가 같은 새 wrapper와 범용 `Card`는 만들지 않는다.
6. 대표 메모, 알림, popover와 dialog에서 `#EE5165` 조합, pointer 및 touch 실행 영역, 모서리, 깊이와 motion을 비교한다. 승인된 값만 token에 남기고 비교용 class 및 사용하지 않는 icon export를 제거한다.

#### 테스트 선정과 TDD

이 단위에는 새 TDD를 적용하지 않는다. token, timer와 네이티브 overlay 연결은 브라우저가 결정하며, 테스트를 위해 순수 timer 모듈이나 구성요소 상태 조회 API를 추가하지 않는다. `apps/notes/e2e/notes.spec.ts`, `apps/notes/e2e/batch-copy.spec.ts`와 `apps/notes/e2e/clipboard-permissions.spec.ts`의 기존 복사, 삭제와 실패 사례를 수정해 공통 알림 영역을 확인한다.

- 같은 문구의 결과가 연속으로 발생하면 두 번째 결과부터 5초를 다시 세고 이전 timer가 새 알림을 없애지 않는지 확인한다.
- action이 있는 알림은 hover 또는 내부 focus 동안 남은 시간이 줄지 않고, 다시 벗어난 뒤 남은 시간만 지나면 사라지는지 Playwright Clock으로 확인한다.
- 단순 성공에는 닫기 제어가 없고, 실행 취소 또는 다시 시도는 실제 자료 및 Clipboard 결과를 한 번만 바꾸는지 확인한다.
- popover는 role과 접근 가능한 이름으로 열고 `Escape`, 바깥 pointer와 action 실행 뒤 trigger 포커스를 확인한다. 생성된 DOM ID 값, hook state, callback 횟수와 class는 검사하지 않는다.

#### 검증과 중단 조건

- 기존 lint, typecheck와 build를 통과하고 shared 구성요소를 호출하는 코드의 타입이 유지된다.
- 실제 브라우저에서 같은 message가 다시 발생해도 revision 변경으로 시간이 다시 시작한다. action이 있는 알림은 hover와 `focus-within` 동안 사라지지 않고, 단순 성공에는 닫기 버튼이 없다.
- popover는 trigger, `Escape`, 바깥 pointer와 action 실행에서 한 번 닫히고 trigger로 포커스가 돌아간다. dialog는 이 단위에서 새로 만들지 않는다.
- 계산된 색 대비, 200% 확대, `forced-colors`와 `prefers-reduced-motion`을 확인한다. 승인되지 않은 token 수치가 필요하거나 공통 제어가 메모 삭제 또는 Clipboard 실패처럼 기능별 오류 종류를 알아야 하면 U13을 멈추고 디자인 결정 또는 책임 배치를 다시 검토한다.

#### 진행 기록

U13의 코드 변경을 완료했다. 역할 기반 색 token을 추가하고 이전 화면의 token은 U18까지 호환 별칭으로 남겼다. `ActionToast`의 시간 관리는 별도 hook으로 옮겨 실제 알림 revision마다 5초를 다시 시작하며, 동작이 있는 알림은 pointer와 내부 포커스가 머무는 동안 남은 시간을 보존한다. 단순 완료 알림의 닫기 제어와 `resetKey` 입력은 제거했다. 각 Page는 실행 결과가 생길 때 증가하는 revision을 전달하므로 알림용 임의 ID를 만들지 않는다.

`ActionPopover`는 React 기본 hook과 document `pointerdown` 구독을 별도 hook 및 네이티브 Popover API 연결로 바꿨다. trigger와 popover의 연결값은 `useId`에서 얻으며 일반 버튼 묶음, `Escape`, light dismiss와 닫힌 뒤 trigger 포커스 복귀를 유지한다. `Button`, `IconButton`, `StatusNotice`와 공통 overlay는 새 역할 token을 사용하고, 아직 다른 화면이 참조하는 `CloseIcon`과 이전 token은 삭제하지 않았다.

`pnpm notes:typecheck`, `pnpm notes:lint`, 단위 테스트 187개와 운영용 build가 통과했다. Chromium에서 모바일 일괄 복사 popover의 action, `Escape` 및 바깥 실행 뒤 포커스 복귀를 확인했고, Clipboard 과업에서 같은 실패 결과의 시간 재시작, 동작 제어 포커스 중 시간 정지, 포커스 이탈 뒤 자동 종료와 단순 완료 알림의 닫기 제어 부재를 확인했다. 계산된 색 대비, 200% 확대, 강제 색상과 움직임 감소 설정의 화면 판정은 U18의 한 차례 최종 검토에서 함께 수행한다.

### U14 application frame과 탐색

#### 목적과 선행 조건

넓은 화면의 route별 top 및 side 전환을 한 줄 application bar로 통일하고, 메모 화면에는 bar와 주 헤더를 겹쳐 표시하지 않는다. 좁은 화면 전역 탐색은 아직 승인되지 않았으므로 메모 목록과 상세의 한 줄 헤더만 진행하고, 보조 route에서 현재 탐색을 없애는 변경은 승인까지 중단한다.

#### 파일 변화

- 생성: `apps/notes/src/_app/ui/navigation/use-application-navigation.ts`에 disclosure 상태와 Navigation Guard를 거친 route 이동만 둔다.
- 수정: `apps/notes/src/_app/ui/application-frame.tsx`, `apps/notes/src/_app/ui/navigation/application-navigation.tsx`와 `apps/notes/src/_app/ui/navigation/index.ts`를 바꾼다. 실제 헤더 중복을 없애기 위해 U16의 `mobile-notes-workspace.tsx`, `note-detail-page.tsx`는 좁은 메모 화면 절차에서 함께 수정한다.
- 테스트 수정: `apps/notes/e2e/notes.spec.ts`, `apps/notes/e2e/analysis.spec.ts`, `apps/notes/e2e/templates.spec.ts`와 `apps/notes/e2e/batch-copy.spec.ts`의 기존 route 진입 및 저장 전 이탈 사례를 새 application bar에 맞춘다.
- 삭제: 승인된 넓은 화면에서는 `NavigationPlacement`, `navigationBaseClassNames`, `navigationVisibleClassNames`, `linkBaseClassNames`, `activeLinkClassNames`, `inactiveLinkClassNames`의 `side` 분기와 `usesTopNavigation` route 판정을 제거한다. 좁은 보조 route에서 현재 탐색을 대체할 코드는 승인 전까지 삭제하지 않는다.

#### 구현 절차와 패턴

1. Application Shell 패턴으로 `ApplicationFrame`이 한 줄 bar와 main 영역만 조립하게 한다. `/`, `/usage/`, `/analysis/`, `/templates/`, `/settings/` 및 `/batch-copy/`의 route 책임과 page 내용은 옮기지 않는다.
2. 넓은 화면은 `application-navigation.tsx`의 동일 destination 자료로 현재 위치와 링크를 렌더링한다. route마다 placement를 계산하지 않고, active 상태는 현재 pathname에서 계산한다. 탐색 배열의 `href`, label과 승인된 양의 `tabIndex`를 다른 파일에 복제하지 않는다.
3. disclosure 상태와 Guard를 거친 이동은 새 model hook으로 옮긴다. TSX에는 React 기본 hook을 남기지 않고 link, 현재 위치와 callback만 연결한다. 고정 문자열 `application-navigation-links`는 제거하고 `useId`에서 받은 값을 trigger와 nav에 함께 전달한다.
4. 메모 route의 좁은 화면에서는 application bar, 목록 header와 상세 header 가운데 현재 과업의 한 줄 주 헤더 하나만 보이게 한다. 전역 탐색의 위치, 여는 동작과 복귀 규칙은 임시 hamburger, bottom bar 또는 숨은 제스처로 채우지 않는다.
5. 넓은 메모 route에서 bar 아래를 바로 `BatchCopyWorkspace`가 차지하게 하고 별도 페이지 제목, 메모 수와 상단 작업 행이 생기지 않게 한다.

#### 테스트 선정과 TDD

이 단위에는 새 TDD를 적용하지 않는다. route와 Navigation Guard는 실제 Next.js 운영 서버에서 연결해야 하므로 Playwright 사례로 확인한다. `apps/notes/e2e/notes.spec.ts`, `apps/notes/e2e/analysis.spec.ts`, `apps/notes/e2e/templates.spec.ts`와 `apps/notes/e2e/batch-copy.spec.ts`에서 기존 route 진입을 재사용하고, 모든 링크를 한 테스트에 나열하는 새 검사는 만들지 않는다.

- 각 기존 사용자 과업이 application bar의 접근 가능한 링크에서 시작되거나 끝나고 목적 route의 고유 heading 또는 제어에 도달하는지 확인한다.
- 현재 route가 `aria-current="page"`로 구분되고 Tab 이동이 승인된 순서를 따르는지 확인한다. 링크 배열, DOM 자식 순서와 class는 검사하지 않는다.
- 좁은 메모 상세에서 편집한 뒤 다른 route로 이동하면 저장 전 이탈 dialog를 거치고, 계속 편집과 버리기가 각각 입력 보존 및 목적 route 이동으로 이어지는지 확인한다.
- 320 CSS px와 200% 확대에서는 메모 목록 또는 상세의 주 헤더가 하나인지 실제 heading 및 제어로 확인한다. 승인되지 않은 좁은 화면 전역 탐색의 예상 결과는 작성하지 않는다.

#### 검증과 중단 조건

- 넓은 화면에서 모든 route로 키보드 이동할 수 있고 현재 route는 `aria-current="page"`와 색 이외의 상태로 확인된다. 메모 캔버스는 bar를 제외한 영역을 채운다.
- 좁은 메모 목록과 상세에는 주 헤더가 한 줄만 있고, 저장 전 이탈 Guard를 거친 이동이 유지된다.
- 320 CSS px, 200% 확대와 넓은 화면에서 수평 overflow, 잘린 링크와 예기치 않은 document scroll이 없다.
- 좁은 화면 전역 탐색 승인 전에는 관련 삭제와 보조 route 재구축을 시작하지 않으며 U14 완료로 표시하지 않는다.

#### 진행 기록

U14에서 승인된 넓은 화면과 메모 과업 화면의 frame 변경을 완료했다. `ApplicationFrame`의 route별 top 및 side 배치를 없애고 모든 넓은 화면에 한 줄 application bar를 사용한다. 메모 목록, 상세와 일괄 복사 route에서는 48rem 미만일 때 application bar를 표시하지 않아 각 화면의 주 헤더와 겹치지 않는다. 보조 route의 48rem 미만 탐색은 기존 disclosure를 유지했다.

탐색의 열림 상태, `useId` 연결값, 저장 전 이탈 확인과 route 이동은 `use-application-navigation.ts`로 옮겼다. 탐색은 `nav`와 일반 링크를 사용하고 현재 route만 `aria-current="page"`로 표시한다. 이전 `NavigationPlacement`, route별 class map, 고정 DOM ID와 장식용 순번은 제거했다. Next.js `Link`를 유지해 내부 route 이동을 처리하며 Navigation Guard가 이동을 보류하면 기존 입력과 포커스를 보존한다.

`pnpm notes:typecheck`, `pnpm notes:lint`와 운영용 build가 통과했다. Chromium에서 320 CSS px 메모 과업 5개를 실행해 목록과 상세의 단일 주 헤더, 저장과 저장 전 이탈 확인을 검증했고, 상세 화면을 넓힌 뒤 application bar로 이동할 때도 계속 편집과 변경사항 버리기가 정한 목적지로 이어지는 것을 확인했다. 보조 route의 48rem 미만 전역 탐색 형태는 승인되지 않았으므로 U14 전체 완료 표시는 보류한다.

### U15 넓은 메모 작업 화면

#### 목적과 선행 조건

U13의 공통 제어와 U14의 넓은 frame이 확인된 뒤 메모 본문, 복사와 이동 핸들이 먼저 보이는 구조로 바꾼다. 자유 좌표, 크기, 겹침 순서, `tabIndex`, 자동 저장, 삭제 복구와 canvas view는 기존 application 명령과 IndexedDB 자료를 그대로 사용한다.

#### 파일 변화

- 생성: `apps/notes/src/_pages/notes/model/use-notes-collection-interactions.ts`에는 Command 상태, hash focus와 Page 알림 전달을 둔다. `apps/notes/src/_pages/notes/model/use-note-geometry-gesture.ts`에는 메모 이동 및 크기 변경 pointer session을, `apps/notes/src/_pages/notes/model/use-notes-board-view.ts`에는 pan, zoom과 fit view를 둔다.
- 수정: `apps/notes/src/_pages/notes/ui/notes-collection.tsx`, `apps/notes/src/_pages/notes/ui/note-card.tsx`, `apps/notes/src/_pages/notes/ui/notes-board.tsx`, `apps/notes/src/_pages/notes/ui/note-properties-panel.tsx`, `apps/notes/src/_pages/notes/ui/batch-copy-workspace.tsx`, `apps/notes/src/_pages/notes/model/use-note-content-autosave.ts`, `apps/notes/src/_pages/notes/model/note-session-provider.tsx`, `apps/notes/src/shared/ui/icons/icons.tsx`와 `apps/notes/src/shared/ui/icons/index.ts`를 바꾼다. U13에서 정리한 `ActionPopover` API는 그대로 호출한다.
- 테스트 수정: `apps/notes/e2e/notes.spec.ts`, `apps/notes/e2e/clipboard-permissions.spec.ts`, `apps/notes/e2e/notes-geometry-model.spec.ts`, `apps/notes/e2e/notes-order-model.spec.ts`, `apps/notes/e2e/notes-removal-model.spec.ts`와 `apps/notes/e2e/notes-selection-model.spec.ts`를 사용자 결과 기준으로 갱신한다. 기존 순수 규칙 테스트는 수정하지 않고 먼저 실행한다.
- 삭제: `note-card.tsx`의 본문과 함께 움직이는 기존 header 배치, 맨 앞, 맨 뒤와 삭제의 상시 아이콘 버튼, geometry gesture state와 React 기본 hook을 제거한다. `notes-board.tsx`의 pan refs, state, Effect와 event handler를 제거한다. `notes-collection.tsx`의 `WorkspaceNoticeToast`, 오른쪽 위 notice wrapper와 삭제 전용 아래쪽 toast wrapper를 제거한다. 이동한 로직의 원래 import와 사용하지 않는 아이콘 export도 같은 절차에서 제거한다.

#### 구현 절차와 패턴

1. Container와 Presentational Component 분리를 적용한다. 세 model hook이 현재 provider 및 application 명령을 호출하고, `NotesCollection`, `NotesBoard`와 `NoteCard`는 계산된 상태, ref와 callback을 DOM에 연결한다. hook이 JSX를 반환하거나 JSX를 일반 함수로 호출하지 않는다.
2. `NoteCard`는 왼쪽의 명시적 이동 핸들, 항상 편집 가능한 본문, 오른쪽의 바로 보이는 복사 `IconButton`과 `ActionPopover`로 재구성한다. 더보기 action은 속성, 맨 앞으로, 맨 뒤로와 삭제를 현재 callback에 연결한다. 별도 title, emoji와 note icon 자료는 만들지 않는다.
3. 메모 이동 및 크기 변경은 U13 조사에서 정한 pointer 수명 절차와 State Machine 패턴을 적용한다. 시작 geometry와 pointer ID를 한 session에 두고, mouse 및 pen 5 CSS px와 touch 10 CSS px 뒤에만 preview를 갱신한다. `pointercancel`과 완료 전 `lostpointercapture`에서는 저장하지 않고 preview를 버린다.
4. 본문 자동 저장은 기존 `useNoteContentAutosave`를 유일한 저장 조정자로 유지한다. 성공 알림은 만들지 않는다. 실패는 해당 메모 편집기 아래의 `StatusNotice`에서 원문과 draft를 유지한 채 같은 저장 흐름을 다시 실행한다. Page 공유 알림으로 자동 저장 실패를 보내는 `onSaveFailure` 연결은 제거한다.
5. `BatchCopyWorkspaceContext`를 메모 작업 화면의 단일 알림 조립 지점으로 확장한다. 복사 성공, 사용 횟수 기록 실패, retry 가능한 Clipboard 실패와 삭제 취소를 자료와 callback 형태로 전달하고, `BatchCopyWorkspace`가 현재 한 건만 `ActionToast`로 렌더링한다. 새 전역 Provider와 두 번째 notification state는 만들지 않는다.
6. 삭제 Command가 성공한 뒤 기존 LIFO removal 자료를 알림 action에 연결한다. 새 결과가 오면 기존 알림을 교체하고 revision을 늘린다. undo 만료, focus 순서와 복원한 메모 선택은 `note-session-provider.tsx`의 기존 책임을 유지한다.
7. `NotesBoard`는 빈 캔버스에서만 pan을 시작하고 메모, 본문, 핸들과 제어의 pointer event를 가로채지 않는다. view state는 화면에서만 유지하고 저장 geometry에 scale이나 viewport 좌표를 섞지 않는다.

#### 테스트 선정과 TDD

이 단위의 UI 재구축에는 새 TDD를 적용하지 않는다. 기존 복사 명령, 자동 저장 전이, 메모 선택과 삭제 복구의 순수 테스트를 구현 전후에 그대로 실행하고, 규칙이 바뀌지 않았는데 hook 분리를 이유로 테스트를 복제하지 않는다. `apps/notes/e2e/notes.spec.ts`, `apps/notes/e2e/clipboard-permissions.spec.ts`, `apps/notes/e2e/notes-geometry-model.spec.ts`, `apps/notes/e2e/notes-order-model.spec.ts`, `apps/notes/e2e/notes-removal-model.spec.ts`와 `apps/notes/e2e/notes-selection-model.spec.ts`에서 사용자 과업을 확인한다.

- 사용자가 입력한 공백과 줄바꿈을 포함한 원문을 편집한 뒤 자동 저장하고, 같은 메모를 복사해 Clipboard 원문과 새로고침 뒤 원문이 일치하는지 확인한다.
- 같은 원문을 가진 두 메모는 화면에서 생성된 ID와 선택한 위치로 구분하고, 한 메모의 이동, 복사, 삭제와 복원이 다른 메모의 revision, 사용 횟수 및 geometry를 바꾸지 않는지 확인한다.
- 자동 저장 실패에서는 최신 입력과 복구 초안이 남고 재시도 뒤 저장되는지 확인한다. repository 호출 횟수나 `useNoteContentAutosave` 상태는 검사하지 않는다.
- 이동 핸들, 크기 조절, 빈 캔버스 pan, 본문 선택과 복사 제어가 각각 한 사용자 결과만 만드는지 실제 pointer 및 keyboard로 확인한다. 중간 좌표, pointer session state와 DOM 구조는 고정하지 않는다.

#### 검증과 중단 조건

- `apps/notes/e2e/notes.spec.ts`, `notes-geometry-model.spec.ts`, `notes-order-model.spec.ts`, `notes-removal-model.spec.ts`, `notes-selection-model.spec.ts`와 기존 note content 단위 및 브라우저 검사를 승인된 표현 변경에 맞춰 수정한다. CSS class, DOM 중첩과 hook 이름은 검증하지 않는다.
- pointer와 keyboard에서 이동, 크기 변경, pan, zoom, fit view, 선택, 속성 대상, `Command` 상태, 개별 및 일괄 복사와 삭제 복구 결과가 각각 한 번만 발생한다.
- 자동 저장 실패를 만들면 최신 입력과 draft가 남고 편집기 가까이에서 재시도할 수 있다. 복사와 삭제 알림은 같은 영역에서 한 건만 보이며 포커스를 옮기지 않는다.
- 저장 geometry, `tabIndex`, `zIndex`, content revision 또는 IndexedDB schema를 바꿔야 하거나 한 model hook이 메모 자료와 일괄 복사 자료를 함께 소유해야 하면 U15를 멈추고 책임을 다시 나눈다.

#### 진행 기록

U15를 완료했다. 메모 표면은 이동 핸들, 상시 편집 본문, 바로 보이는 복사와 더보기로 바꾸고 속성, 맨 앞, 맨 뒤와 삭제는 네이티브 popover의 동작 목록으로 옮겼다. 이동 및 여덟 방향 크기 조절은 pointer ID와 시작 geometry를 가진 한 session으로 처리하며 mouse 및 pen은 5 CSS px, touch는 10 CSS px를 넘은 뒤에만 미리보기를 시작한다. 취소와 완료 전 pointer capture 상실은 저장하지 않는다. 캔버스 pan, zoom과 모두 보기는 별도 화면 상태로 분리해 저장 geometry와 섞지 않았다.

메모 편집과 geometry gesture, 캔버스 보기, 목록 입력 및 속성 초안 동기화의 React 기본 hook을 TSX에서 model hook으로 옮기고 원래 state, ref, Effect와 handler를 제거했다. 자동 저장 실패는 메모 편집기 아래에서 원문과 복구 초안을 유지한 채 같은 저장 명령을 다시 실행한다. Clipboard 실패 문구는 공유 함수 하나로 합쳤고 복사, 생성 실패와 삭제 복구는 작업 화면의 알림 조립 지점 한 곳에서 가장 최근 실행 상태 한 건만 표시한다. 알림을 바꿀 때는 복사나 생성 실패 알림이 이전 동작을 끝내는 경우와 연속 삭제의 LIFO 이력을 보존하는 경우를 구분하며, 삭제 실행 취소는 원래 만료 시각과 화면 전환 뒤 남은 시간을 유지한다.

기존 순수 규칙 검사 187개, 브라우저 구성요소 검사 51개, typecheck, lint와 운영용 build가 통과했다. Chromium에서 메모 생성 및 자동 저장, Clipboard 권한 실패, 이동 및 크기 변경, 겹침 순서, 선택과 속성 대상, 연속 삭제와 복원을 포함한 24개 과업을 확인했다. 모델 기반 검사는 화면에서 생성된 메모 ID와 접근 가능한 이름을 사용하며, 이동 핸들과 더보기에서 시작한 실제 입력이 IndexedDB에 남긴 값을 비교한다. U15의 최종 시각 및 접근성 검토는 전체 화면을 함께 비교하는 U18의 마지막 검토로 남긴다.

### U16 좁은 메모 목록과 상세

#### 목적과 선행 조건

좁은 메모 화면을 본문 미리보기와 상세 편집의 한 줄 헤더 구조로 바꾼다. U13의 `IconButton`, 지속 오류와 dialog 규칙, U14의 메모 전용 좁은 frame이 선행한다. 전역 탐색 방식이 필요한 변경은 U14 중단 조건을 따른다.

#### 파일 변화

- 생성: `apps/notes/src/_pages/notes/model/use-mobile-note-long-press.ts`에는 touch pointer 수명과 뒤따르는 click 억제를 둔다. `apps/notes/src/_pages/notes/model/use-note-detail-editing.ts`에는 React Hook Form 연결, draft timer, Navigation Guard, 명시적 저장과 dialog 상태를 둔다.
- 수정: `apps/notes/src/_pages/notes/ui/mobile-note-card.tsx`, `apps/notes/src/_pages/notes/ui/mobile-note-list.tsx`, `apps/notes/src/_pages/notes/ui/mobile-notes-workspace.tsx`, `apps/notes/src/_pages/notes/ui/note-detail-page.tsx`, `apps/notes/src/_pages/notes/ui/note-content-failure-message.ts`, `apps/notes/src/_pages/notes/model/note-content-save-state.ts`, `apps/notes/src/shared/ui/icons/icons.tsx`와 `apps/notes/src/shared/ui/icons/index.ts`를 바꾼다.
- 테스트 수정: `apps/notes/e2e/touch-interactions.spec.ts`, `apps/notes/e2e/notes.spec.ts`와 `apps/notes/e2e/notes-model.spec.ts`의 좁은 화면 사례를 갱신한다. `apps/notes/src/_pages/notes/model/note-content-save-state.test.ts`는 저장 전이가 바뀌지 않는 회귀 기준으로 실행하고 수정하지 않는다.
- 삭제: `mobile-note-card.tsx`의 `contentOverflow`, `preview` 측정 ref, 두 번째 Effect, `ResizeObserver`, `overflowDescriptionId`, `내용 더 있음` badge와 TSX 내부 long-press refs 및 handlers를 제거한다. `note-detail-page.tsx`의 `ActionToast`, 저장 성공 notice state, 기본 React hook, static `unsaved-note-title` ID와 TSX 내부 timer 및 Navigation Guard 조정을 제거한다.

#### 구현 절차와 패턴

1. `MobileNoteCard`는 본문을 `max-height: 12rem` 안에서 자연스럽게 자르는 상세 링크와 별도의 복사 `IconButton`으로 나눈다. 복사 아이콘은 공유 `CopyIcon`을 사용하고 접근 가능한 이름에 해당 메모의 첫 비어 있지 않은 줄 또는 `빈 메모`를 포함한다. 별도 title 자료는 만들지 않는다.
2. 짧은 누르기는 상세 route만 열고, 복사 버튼은 현재 `onCopy`만 실행한다. 일괄 복사 수집 중 짧은 누르기는 `onAddToBatchCopy`만 실행한다. pointer 입력 하나에 두 결과가 생기지 않게 event 전파와 click 억제를 hook의 한 상태 전이에서 처리한다.
3. Long Press 패턴은 touch 주 pointer가 500ms 동안 시작점 10 CSS px 안에 있고 같은 메모에서 끝날 때만 `onCopy`를 호출한다. 세로 scroll, 이동 초과, `pointercancel`, 완료 전 `lostpointercapture`와 component unmount는 timer와 session을 취소한다. 일괄 복사 수집 중에는 길게 누르기 명령을 만들지 않는다.
4. 상세 편집은 Page Controller 패턴으로 새 hook에 React Hook Form과 저장 수명을 모은다. TSX는 `register` 결과, 저장 상태, 지속 오류와 dialog callback만 연결한다. 800ms draft 보관과 `pagehide` 및 hidden 보관은 유지하되 같은 값을 React state에 복제하지 않는다.
5. 저장 버튼은 `저장`, `저장하는 중`과 짧은 `저장됨` 상태를 같은 위치에서 보여준다. 성공 toast는 제거한다. 실패는 editor 또는 저장 footer의 `StatusNotice`에 원문을 유지하고 다시 시도 동작을 제공한다.
6. `UnsavedChangesDialog`는 네이티브 dialog를 유지한다. 제목 연결 ID는 hook의 `useId`에서 받고, 열릴 때 `계속 편집`에 포커스를 두며 닫기 또는 discard 완료 뒤 기존 Navigation Guard의 논리적 위치로 돌아간다.

#### 테스트 선정과 TDD

이 단위에는 새 TDD를 적용하지 않는다. `note-content-save-state.test.ts`가 보호하는 800ms 저장, 최신 원문과 초안 정리 규칙은 그대로 실행하고, long press, scroll 취소, dialog focus와 React Hook Form 연결은 브라우저에서 확인한다. `apps/notes/e2e/touch-interactions.spec.ts`, `apps/notes/e2e/notes.spec.ts`와 `apps/notes/e2e/notes-model.spec.ts`의 좁은 화면 사례를 수정한다.

- 빈 메모, 긴 한국어 원문과 같은 원문의 서로 다른 메모를 UI에서 만들고, 짧은 누르기, 복사 버튼 및 500ms 길게 누르기가 각각 상세 이동, 지정 메모 복사와 원문 전체 복사 하나만 실행하는지 확인한다.
- 일괄 복사 수집 중에는 짧은 누르기만 항목을 추가하고 길게 누르기, scroll, 이동 초과, `pointercancel`과 완료 전 `lostpointercapture`가 복사나 route 이동을 만들지 않는지 확인한다.
- 800ms 자동 보관은 Playwright Clock을 애플리케이션 timer 생성 전에 설치해 확인하고, 저장을 추가로 일으킬 blur나 route 이동 전에 화면 및 저장 자료를 관찰한다.
- 미리보기 높이는 실제 bounding box와 상세의 전체 원문으로 확인한다. 제거한 `ResizeObserver`, badge, 정적 DOM ID와 hook 반환값의 부재는 검사하지 않는다.

#### 검증과 중단 조건

- `apps/notes/e2e/touch-interactions.spec.ts`, `notes.spec.ts`와 `note-content-save-state.test.ts`를 사용자 결과 기준으로 수정한다. 실제 entity ID는 UI 생성 결과에서 얻고 임의 ID를 fixture에 넣지 않는다.
- 320 CSS px, 200% 확대와 긴 한국어 원문에서 목록 안쪽 scroll 및 overflow badge 없이 미리보기가 끝나고 상세에서 전체 원문을 확인할 수 있다.
- 짧은 누르기, 복사 버튼, 500ms 길게 누르기와 일괄 복사 수집이 각각 한 결과만 만들며, 취소된 pointer와 scroll은 복사 또는 상세 이동을 실행하지 않는다.
- 저장 진행, 성공, 실패, 재시도와 저장 전 이탈에서 입력과 포커스가 유지된다. dialog 또는 메모 header가 두 줄이 되거나 좁은 전역 탐색을 임시로 정해야 하면 U16의 해당 변경을 중단한다.

#### 진행 기록

U16을 완료했다. 모바일 메모는 12rem 안에서 원문을 자연스럽게 자르는 상세 링크와 첫 번째 비어 있지 않은 줄을 이름에 포함한 복사 버튼으로 나눴다. `ResizeObserver`, overflow 판정 state, 설명 ID와 `내용 더 있음` badge는 제거했다. 기존 `CopyIcon`과 `ArrowBackIcon`을 다시 사용해 같은 의미의 아이콘을 추가하지 않았다.

`useMobileNoteLongPress`는 touch 주 pointer의 ID, 시작점, capture와 500ms timer를 한 session으로 관리한다. 10 CSS px를 넘는 이동, `pointercancel`, 완료 전 `lostpointercapture`와 unmount는 복사 및 뒤따르는 click을 취소한다. 일괄 복사 수집 중에도 같은 session이 길게 누르기와 scroll을 짧은 누르기와 구분하므로 항목 추가, Clipboard 복사 또는 상세 이동을 실행하지 않는다. 키보드 click은 pointer session에 의존하지 않고 상세 이동 또는 일괄 복사 추가를 그대로 실행한다.

상세 화면의 React Hook Form, 초안 timer, Navigation Guard, 저장 및 대화상자 상태는 `useNoteDetailEditing` Page Controller로 옮기고 TSX에 있던 기본 React hook, 성공 toast와 정적 제목 ID를 삭제했다. 저장 버튼 한 자리에서 `저장`, `저장하는 중`, `저장됨`을 보여주고 실패는 편집기 아래에서 원문과 함께 남겨 다시 시도할 수 있다. native dialog는 `useId`로 제목을 연결하고 `계속 편집`에 처음 포커스를 둔 뒤 편집기로 돌려보낸다. 기존 순수 저장 전이의 뜻은 바뀌지 않아 `note-content-save-state.ts`를 수정하지 않았고, 짧은 `저장됨` 표시는 Page Controller에서만 관리했다.

순수 규칙 검사 187개, typecheck, lint와 운영용 build가 통과했다. Chromium 320 CSS px 화면에서 명시적 저장, 복구 초안 정리, 저장 전 이탈, 대화상자 포커스와 넓은 화면 탐색을 포함한 25개 과업을 확인했다. touch 전용 Chromium에서 별도 복사 버튼, 500ms 길게 누르기, 일괄 복사 중 길게 누르기 무동작, 이동 초과, `pointercancel`과 capture 상실을 포함한 2개 과업을 확인했다. 테스트는 화면에서 생성한 메모 ID, 접근 가능한 이름, Clipboard 원문과 IndexedDB 저장 원문만 관찰하며 hook state, DOM 중첩이나 정적 test ID를 검사하지 않는다. U16의 최종 시각 및 접근성 검토는 U18의 마지막 검토로 남긴다.

### U17 일괄 복사

#### 목적과 선행 조건

저장 목록, 넓은 panel과 모바일 확인 화면을 같은 삽입식 명령과 명시적 이동 핸들로 연결한다. U13의 popover 및 알림, U15의 작업 화면 알림 조립이 선행한다. 모바일 action sheet의 세부 동작은 승인 전까지 구현하지 않지만 pointer 재정렬, 저장 복구와 기존 관리 명령은 진행할 수 있다.

#### 파일 변화

- 생성: `apps/notes/src/features/edit-batch-copy/model/reorder-pointer-session.ts`에는 입력 방식과 무관한 pointer session 전이와 복구 snapshot 형태를, `apps/notes/src/features/edit-batch-copy/model/reorder-pointer-session.test.ts`에는 사용자 결과를 나타내는 순수 전이 사례를 둔다. `apps/notes/src/features/edit-batch-copy/model/use-batch-copy-pointer-reorder.ts`에는 저장 목록 및 넓은 panel의 pointer capture, edge scroll, 명령 실행과 focus 복귀를 둔다. `apps/notes/src/features/edit-batch-copy/model/use-batch-copy-editing.ts`와 `use-copy-batch-text.ts`에는 낙관적 편집과 Clipboard 실행 상태를 둔다. `apps/notes/src/_pages/batch-copy/model/use-mobile-batch-copy-pointer-reorder.ts`에는 이동 핸들의 500ms touch 시작과 모바일 scroll 취소를, `use-mobile-batch-copy-confirmation.ts`와 `use-batch-copy-page.ts`에는 각 Page의 명령, 복사 결과와 지속 오류를 둔다.
- 수정: `apps/notes/src/features/edit-batch-copy/model/edit-batch-copy-provider.tsx`, `apps/notes/src/features/edit-batch-copy/ui/batch-copy-list.tsx`, `apps/notes/src/features/edit-batch-copy/ui/batch-copy-editing-view.tsx`, `apps/notes/src/features/edit-batch-copy/ui/copy-batch-text-action.tsx`, `apps/notes/src/features/edit-batch-copy/index.ts`, `apps/notes/src/_pages/batch-copy/ui/batch-copy-item-actions.tsx`, `apps/notes/src/_pages/batch-copy/ui/mobile-batch-copy-confirmation-list.tsx`, `apps/notes/src/_pages/batch-copy/ui/mobile-batch-copy-confirmation.tsx`, `apps/notes/src/_pages/batch-copy/ui/batch-copy-start-page.tsx`와 `apps/notes/src/_pages/notes/ui/batch-copy-workspace.tsx`를 바꾼다.
- 테스트 수정: `apps/notes/src/entities/batch-copy/model/batch-copy-commands.test.ts`, `apps/notes/src/entities/batch-copy/model/mobile-batch-copy-draft.test.ts`, `apps/notes/src/entities/batch-copy/model/batch-copy-history.test.ts`, `apps/notes/e2e/batch-copy.spec.ts`와 `apps/notes/e2e/touch-interactions.spec.ts`를 승인된 표현 및 입력 방식 변경에 맞춘다. 기존 순서 사례와 새 session 사례를 중복 작성하지 않는다.
- 보존 및 확인: `apps/notes/src/entities/batch-copy/model/batch-copy-commands.ts`의 `moveBatchCopyItem`과 `apps/notes/src/entities/batch-copy/model/mobile-batch-copy-draft.ts`의 `moveMobileBatchCopyEntry`는 동작을 바꾸지 않는다. 모든 입력 방식이 두 명령에 항목 ID와 삽입 index를 전달하는지만 확인하고, 중복 재정렬 함수를 추가하지 않는다.
- 삭제: `batch-copy-list.tsx`의 `BatchCopyInsertionTarget`, `placementItemId`, `placementIndex`, `placementActive`, `ManagementBatchCopyItems`의 영구 삽입 위치 UI와 항목 본문 button의 drag handlers를 제거한다. `mobile-batch-copy-confirmation-list.tsx`의 `InsertionTarget`, `placementEntryId`, 항목 전체 long-press handlers와 관련 문구를 제거한다. `copy-batch-text-action.tsx`, `batch-copy-editing-view.tsx`, `mobile-batch-copy-confirmation.tsx`의 React 기본 hook과 중복 알림 state는 model hook 또는 기존 provider로 옮긴 뒤 삭제한다.

#### 구현 절차와 패턴

1. 먼저 `moveBatchCopyItem`과 `moveMobileBatchCopyEntry`의 Command 결과를 네 항목의 처음, 중간 및 마지막 삽입과 자기 위치 no-op로 다시 확인한다. 두 함수를 합치거나 저장 record를 바꾸지 않고, 모든 UI가 항목 ID와 삽입 index만 전달하게 한다.
2. State Machine 패턴으로 `reorder-pointer-session.ts`가 `idle`, 임계값 판정 중, dragging, 저장 중과 복구를 구분하게 한다. reducer는 DOM, timer, scroll과 Promise를 호출하지 않는다. 항목 배열, 선택 ID, focus 대상과 원래 index는 한 복구 snapshot에 둔다.
3. 저장 목록과 넓은 panel의 항목은 왼쪽 `GripIcon` 버튼, 본문과 오른쪽 `BatchCopyItemActions`로 구성한다. drag는 핸들에서만 시작하고 본문은 선택 및 읽기 동작을 유지한다. mobile도 article 전체가 아니라 왼쪽 핸들에서만 500ms long-press 뒤 drag를 시작한다.
4. drag preview는 raised 깊이, 원래 자리의 변화와 현재 pointer 절반을 기준으로 계산한 앞뒤 삽입선만 표시한다. 평상시 drop zone과 `이 위치로 이동` 행은 렌더링하지 않는다. 목록 끝 계산은 기존 `itemIndexForInsertionSlot`과 같은 삽입 규칙을 사용한다.
5. Edge Auto-scroll 패턴은 활성 drag session의 현재 scroll container에만 적용한다. animation frame은 session 시작과 함께 만들고 pointer가 가장자리에서 벗어나거나 window blur, document hidden, `pointercancel`, 완료 전 `lostpointercapture`, scroll 취소 및 unmount가 발생하면 같은 정리 함수로 끝낸다.
6. Optimistic Snapshot 패턴으로 놓은 즉시 화면 순서를 바꾸고 기존 provider 명령을 실행한다. 성공에서는 provider 자료로 확정한다. 실패에서는 원래 순서, 같은 항목의 선택과 포커스를 복원하고 항목 가까이의 `StatusNotice`에 다시 시도를 제공한다. 복구할 snapshot이 없으면 저장 전 순서를 바꾸지 않는다.
7. keyboard 방향키와 더보기의 위치 변경은 pointer와 같은 명령을 호출한다. 위치 선택 표면은 항목 이름과 가능한 앞뒤 위치를 제시하고, 완료 뒤 같은 더보기 또는 이동 핸들에 포커스를 돌린다. live region은 항목 이름, 이전 위치와 새 위치를 한 번만 알리고 drag 중 매 move를 읽지 않는다.
8. 넓은 화면은 `ActionPopover`에서 위치 변경, 복제와 삭제를 제공한다. 모바일 action sheet는 대표 항목 수, 320 CSS px, 화면 키보드, safe area, 닫기와 뒤로가기 결과가 승인된 뒤 현재 `BatchCopyItemActions`의 mobile 표현만 교체한다. 승인 전에는 임시 bottom sheet, 임의 높이와 새 overlay 구성요소를 만들지 않는다.
9. 전체 복사 성공과 retry 가능한 일시 실패는 U15의 공유 알림 영역 한 건을 사용한다. 항목 저장 실패는 목록 가까이의 지속 상태로 남기고, route별 `CopyBatchTextNotice` wrapper와 같은 Clipboard 문구의 중복 구현을 제거한다.

#### 테스트 선정과 TDD

이 단위에서는 `reorder-pointer-session.ts`의 순수 전이에만 TDD를 적용한다. `apps/notes/src/features/edit-batch-copy/model/reorder-pointer-session.test.ts`를 먼저 만들고 임계값 전 취소, 유효한 삽입 명령, 자기 위치 no-op, 저장 실패 복구와 새 session 시작을 한 동작씩 실패시키며 구현한다. 테스트는 내부 상태 이름과 reducer action 문자열을 읽지 않고 순서, 명령 발생 여부와 복구 자료만 확인한다.

기존 `batch-copy-commands.test.ts`, `mobile-batch-copy-draft.test.ts`, `batch-copy-history.test.ts`는 삽입 계산과 ID 보존의 회귀 기준으로 실행하되 같은 사례를 새 테스트에 복사하지 않는다. 실제 pointer 및 touch, 자동 scroll, focus, live region, provider 저장과 새로고침 보존은 `apps/notes/e2e/batch-copy.spec.ts`와 `apps/notes/e2e/touch-interactions.spec.ts`에서 확인한다.

- 서로 다른 원문을 가진 항목은 UI에서 생성된 ID로 추적한다. 처음, 중간과 마지막의 상대 위치를 옮긴 뒤 화면 순서와 새로고침 뒤 순서를 모두 확인한다.
- pointer, keyboard와 위치 변경 제어가 같은 최종 순서를 만들고 이동한 항목의 선택 및 focus를 유지하는지 확인한다. drag 중간 좌표와 event 횟수는 검사하지 않는다.
- 저장 실패에서는 원래 순서가 복원되고 같은 항목에서 다시 시도할 수 있으며, 재시도 성공 뒤 한 번만 저장된 결과가 남는지 확인한다. provider method 호출 횟수만으로 성공을 판정하지 않는다.
- window 이탈, document hidden, scroll 취소, `pointercancel`, 완료 전 `lostpointercapture`와 유효하지 않은 위치에서는 순서 및 저장 자료가 바뀌지 않고 자동 scroll이 끝나는지 실제 브라우저에서 확인한다.

#### 검증과 중단 조건

- `apps/notes/src/entities/batch-copy/model/batch-copy-commands.test.ts`, `mobile-batch-copy-draft.test.ts`, `batch-copy-history.test.ts`, `apps/notes/e2e/batch-copy.spec.ts`와 `touch-interactions.spec.ts`를 수정한다. 기존 ID를 보존하는지는 실행에서 얻은 ID의 동일성으로 확인하고 테스트용 고정 ID를 새로 만들지 않는다.
- 네 항목에서 처음을 마지막 뒤, 마지막을 처음 앞과 중간 앞뒤로 옮겨 사이 항목이 한 자리씩 이동하는지 확인한다. 새로고침 뒤 저장 순서, 항목 수, text snapshot, 원본 메모와 사용 횟수는 유지된다.
- pointer, keyboard와 위치 변경이 같은 결과를 만들고 같은 항목의 선택 및 포커스를 유지한다. 저장 실패에서는 snapshot이 복원되고 retry 뒤 한 번만 확정된다.
- scroll, window 이탈, hidden, `pointercancel`, 완료 전 `lostpointercapture`와 유효하지 않은 위치에서 순서와 자동 scroll이 그대로 끝난다.
- 모바일 관리 표면이 승인되지 않았거나 정확한 복구 snapshot을 만들 수 없으면 해당 절차를 중단한다. 이를 우회하려고 새 drag package, 임시 고정 ID나 두 번째 목록 state를 추가하지 않는다.

#### 진행 기록

U17에서 승인된 일괄 복사 조작을 구현했다. 저장 목록, 넓은 panel과 모바일 확인 목록은 왼쪽 이동 핸들, 본문, 오른쪽 더보기 순서를 사용한다. 방향키, pointer 놓기와 더보기의 위치 선택은 모두 기존 항목 ID와 삽입 index 명령을 호출한다. 평상시 삽입 위치 행과 항목 본문 drag 처리를 제거했고, 이동 중에만 삽입선을 표시한다. 넓은 화면은 현재 scroll container의 가장자리에서 자동으로 움직이며, 모바일은 500ms 동안 이동 기준을 넘지 않은 touch에서만 재정렬을 시작한다. blur, 문서 숨김, `pointercancel`, capture 상실과 허용되지 않은 위치는 같은 정리 절차로 끝난다.

순서 이동과 삭제는 `useOptimistic`으로 먼저 화면에 반영하고 저장 실패 시 provider가 보유한 이전 목록으로 돌아간다. 실패 안내는 목록 가까이에 남아 같은 명령을 다시 실행할 수 있다. 복제는 저장소가 발급할 새 항목 ID를 화면에서 미리 만들지 않고, 저장 성공 결과가 도착한 뒤 반영한다. 확인 Page와 복사 버튼의 React 상태 및 명령 조립은 model hook으로 옮겼으며 TSX에는 표현과 접근 가능한 이름만 남겼다.

TDD는 pointer session의 이동 기준 전 취소, 유효한 ID의 이동 명령, 자기 위치 no-op와 실패 snapshot 복구에만 적용했다. 복제 명령은 실행 중 생성한 ID가 대상 바로 뒤에 추가되는 사용자 결과를 기존 명령 검사에 보탰다. 순수 규칙 검사 192개, typecheck, lint와 운영용 build가 통과했다. Chromium에서 저장 목록 및 모바일 확인 화면의 선택, 이동 핸들 drag, 방향키, 위치 선택, 복제, 삭제, 실행 취소와 새로고침을 확인했고, touch 전용 Chromium에서 500ms 시작, 재정렬, 허용되지 않은 위치, `pointercancel`, capture 상실과 이동 기준 초과 취소를 확인했다. 검사는 화면에서 만든 항목과 접근 가능한 이름을 사용하며 hook 상태, DOM 중첩과 정적 식별자를 읽지 않는다.

U17을 마칠 때 모바일 action sheet의 배치와 닫기 결과가 승인되지 않아 기존 `BatchCopyItemActions`의 popover를 유지했다. 이후 액션 시트와 이동 아이콘 표현이 확정되었으므로, 두 모바일 화면에서 남은 팝오버 교체는 U32가 맡는다. 시트의 정확한 배치와 닫기 방식은 여전히 확정되지 않았다.

### U18 보조 화면과 최종 확인

#### 목적과 선행 조건

사용 기록, 분석, 템플릿과 설정의 기능을 유지하면서 U13의 token, 글자 위계, 간격과 지속 오류 규칙을 적용한다. U13부터 U17까지 완료했거나 명시된 승인 대기 부분만 남아 있어야 한다. 이 단위는 새 기능, 새 자료 필드와 새 route를 만들지 않는다.

#### 파일 변화

- 생성: `apps/notes/src/_pages/usage/model/use-usage-read-state.ts`, `apps/notes/src/_pages/templates/model/use-template-workspace.ts`, `apps/notes/src/_pages/templates/model/use-template-editor.ts`와 `apps/notes/src/_pages/templates/model/use-template-output.ts`에 현재 TSX의 기본 hook 및 비동기 상태를 각각 옮긴다. 파일은 해당 책임의 기존 코드를 실제로 옮길 때만 만들며 빈 wrapper는 만들지 않는다.
- 수정: `apps/notes/src/_pages/usage/ui/usage-start-page.tsx`, `apps/notes/src/_pages/usage/ui/usage-table.tsx`, `apps/notes/src/_pages/analysis/model/text-analysis-provider.tsx`, `apps/notes/src/_pages/analysis/ui/analysis-start-page.tsx`, `apps/notes/src/_pages/analysis/ui/analysis-results.tsx`, `apps/notes/src/_pages/templates/ui/templates-start-page.tsx`, `apps/notes/src/_pages/templates/ui/template-authoring.tsx`, `apps/notes/src/_pages/templates/ui/template-editor.tsx`, `apps/notes/src/_pages/templates/ui/template-input-form.tsx`, `apps/notes/src/_pages/templates/ui/template-placeholder-fields.tsx`, `apps/notes/src/_pages/templates/ui/template-segment-preview.tsx`, `apps/notes/src/_pages/templates/ui/selected-source-lines-preview.tsx`, `apps/notes/src/_pages/templates/ui/saved-templates.tsx`, `apps/notes/src/_pages/settings/ui/settings-start-page.tsx`, `apps/notes/src/shared/ui/page-heading/page-heading.tsx`, `apps/notes/src/_app/styles/tokens.css`와 `apps/notes/src/_app/styles/globals.css`를 바꾼다.
- 테스트 수정: `apps/notes/e2e/analysis.spec.ts`, `apps/notes/e2e/templates.spec.ts`, `apps/notes/e2e/clipboard-permissions.spec.ts`와 `apps/notes/e2e/batch-copy.spec.ts`의 기존 사용자 과업을 갱신한다. 사용 횟수, 분석과 템플릿의 기존 순수 규칙 테스트는 수정하지 않고 먼저 실행한다.
- 삭제: 수정하는 TSX의 React 기본 hook, 같은 값을 보관하는 중복 state, 페이지 전체를 감싸는 장식 카드, 화면 구조를 되풀이하는 문구와 사용하지 않는 class를 제거한다. 모든 소비자를 옮긴 뒤 `tokens.css`와 `@theme`에서 `note`, `note-header`, `note-line`, `rail`, `rail-ink`, `workspace`, `font-display`, `shadow-note` 정의를 삭제한다. 사용처가 남은 `PageHeading`, `StatusNotice`, icon 또는 public API 파일은 이름만 보고 삭제하지 않는다.

#### 구현 절차와 패턴

1. 각 route에서 현재 loading, empty, ready와 failure 결과, 폼 값, Clipboard 결과 및 route 이동을 먼저 기록한다. 사용자 동작을 바꾸지 않는 Styling Adapter로 역할 token과 조밀한 text layout을 적용하고 page 전체를 새 카드로 감싸지 않는다.
2. `usage-start-page.tsx`의 읽기 sequence와 상태는 `use-usage-read-state.ts`로 옮긴다. usage projection 및 table 자료는 바꾸지 않고 loading과 읽기 실패를 내용 가까이의 `StatusNotice`로 표시한다.
3. 분석 검증 Effect는 기존 `text-analysis-provider.tsx`의 분석 수명에 합친다. `AnalysisStartPage`는 `useTextAnalysis` 결과와 실행 제어만 렌더링한다. Worker 요청, stale response 판정과 사용자가 명시적으로 실행하는 조건은 유지한다.
4. 템플릿 Page의 선택, authoring draft, editor 상태와 출력 복사는 각각 새 model hook에 옮긴다. React Hook Form이 관리하는 입력값을 hook의 React state로 복제하지 않고, 현재 Zod 및 segment 명령을 그대로 사용한다. validation은 해당 입력 가까이, 저장 및 Clipboard 실패는 해당 작업 가까이의 지속 상태에 둔다.
5. 설정 form은 기존 React Hook Form 수명을 유지하고 불러오기 및 저장 상태만 역할 token으로 바꾼다. `Command+Option+클릭` 설정 자료, checkbox와 저장 명령을 바꾸지 않는다.
6. Strangler 방식으로 이전 token 소비자를 route 하나씩 옮긴다. route 검증이 끝날 때마다 이전 class와 import를 제거하고, 마지막에 `rg`로 이전 token, 제거한 icon, 알림 wrapper 및 hook 이전 전 symbol이 0건인지 확인한 뒤 token 정의와 export를 삭제한다. 전환 alias를 최종 결과에 남기지 않는다.
7. `apps/notes/DESIGN.md`와 실제 계산 style을 대조해 공통 수치가 token으로 관리되는지 확인한다. 단일 화면에서만 쓰는 구조 값은 그 화면에 두되 요구사항이나 layout 계산에서 나오지 않은 임의 수치, 임의 DOM ID와 test ID는 추가하지 않는다.

#### 테스트 선정과 TDD

이 단위의 Page와 style 재구축에는 새 TDD를 적용하지 않는다. 사용 횟수 계산, 분석 알고리즘 및 오래된 응답 판정, 템플릿 segment와 결과 생성처럼 이미 TDD가 적용된 순수 규칙의 결과를 바꾸지 않으며 기존 테스트를 먼저 실행한다. 새 hook 파일의 state, Effect와 반환 객체를 직접 검사하는 테스트는 만들지 않는다.

- 사용 기록은 메모 복사와 일괄 복사를 실제로 실행한 뒤 같은 원문의 다른 revision을 섞지 않은 횟수가 화면에 보이는지 확인한다.
- 분석은 사용자가 실행한 요청의 결과만 표시하고, 원문 변경 뒤 늦게 도착한 응답을 현재 결과로 표시하지 않는지 `apps/notes/e2e/analysis.spec.ts`와 기존 Browser Mode 검사로 확인한다.
- 템플릿은 사용자가 입력한 고정 부분과 바꿀 부분으로 결과를 생성하고 Clipboard에 같은 원문을 쓰며, 실패 뒤 현재 생성문으로 다시 시도하는지 `apps/notes/e2e/templates.spec.ts`와 `apps/notes/e2e/clipboard-permissions.spec.ts`에서 확인한다.
- 설정은 현재 제어로 값을 바꾸고 새로고침 뒤 같은 동작이 적용되는지 확인한다. form hook, Context, class와 저장 함수 호출 횟수는 검사하지 않는다.
- loading, empty, failure와 retry는 route별 대표 사례 하나만 유지하고 문구 전체, 표의 DOM 행 구조와 페이지 wrapper를 snapshot으로 고정하지 않는다.

#### 검증과 중단 조건

- route별 기존 단위 및 브라우저 검사를 먼저 실행한 뒤 `pnpm notes:typecheck`, `pnpm notes:lint`, `pnpm notes:test`, `pnpm --filter notes-app test:browser`, `pnpm notes:test:e2e`와 `pnpm notes:build`를 수행한다. 수집된 테스트가 0개이거나 skip된 필수 흐름은 통과로 보지 않는다.
- 실제 브라우저에서 320 CSS px부터 넓은 화면, 200% 확대, `forced-colors`, `prefers-reduced-motion`, 키보드 및 touch를 확인한다. validation, loading, persistent failure와 retry가 현재 작업과 가까운지 확인한다.
- 공유 알림 한 건, 타이머 pause 및 resume, dialog 포커스, drag 실패 복구, 자동 scroll 종료, route 이동 뒤 draft 및 선택 보존을 한 흐름에서 확인한다.
- `rg`로 이전 token과 옮긴 symbol의 사용처 0건을 확인하고, `pnpm notes:lint`의 FSD import 규칙으로 새 순환 import와 Page 간 import가 없음을 확인한다. 사용처가 남은 코드는 삭제하지 않고 원인을 해당 작업 단위로 되돌린다.
- 좁은 화면 전역 탐색 또는 모바일 action sheet가 승인되지 않았으면 U18 전체를 완료로 표시하지 않는다. 기능 회귀, 설명할 수 없는 기준선 실패, 중복 state 또는 전환 alias가 남아 있어도 완료로 표시하지 않는다.

#### 2026-09-22 진행 기록

U18에서 승인된 보조 화면 재구축과 통합 검토를 마쳤다. 좁은 화면 전역 탐색과 모바일 action sheet는 세부 동작이 승인되지 않아 기존 표현을 유지했으며 U18 전체 완료 표시는 보류한다.

1. 사용 기록, 분석, 템플릿과 설정의 loading, empty, ready, failure, 저장 및 Clipboard 결과를 기존 검사로 먼저 확인했다. 페이지를 장식 카드로 감싸지 않고 U13의 역할 token과 조밀한 글자 위계를 적용했다.
2. 사용 기록 읽기 순서, 최신 요청 판정과 retry를 `use-usage-read-state.ts`로 옮겼다. 표의 projection과 저장 자료는 바꾸지 않았고 Page TSX의 기본 React hook과 중복 비동기 처리를 제거했다.
3. 분석 결과 검증 Effect를 model hook에 두고 분석 화면이 열릴 때마다 실행하도록 연결했다. 앱 전체 Provider가 처음 만들어질 때만 검증하는 방식은 다른 화면에서 원문을 바꾼 뒤 돌아오는 경우를 놓치므로 사용하지 않았다. Worker 실행, 오래된 응답 판정과 명시적 분석 실행 조건은 유지했다.
4. 템플릿 선택, 작성 초안, 편집과 일회성 출력 책임을 네 model hook으로 나눴다. React Hook Form이 원문, 이름과 치환값을 계속 관리하고 domain draft에는 범위와 순서만 남겼다. 비동기 Clipboard 완료는 임의 실행 ID 대신 시작 당시 출력 객체와 현재 객체의 동일성으로 오래된 결과를 무시한다.
5. 설정의 form 수명과 저장 명령은 바꾸지 않았다. 화면 색과 글자 역할만 공통 token에 맞췄다.
6. 남아 있던 `note`, `note-header`, `note-line`, `rail`, `rail-ink`, `workspace`, `font-display`와 `shadow-note` token 사용처를 역할 token으로 옮긴 뒤 정의와 Tailwind 연결을 삭제했다. `@font-face`의 `font-display: swap`은 글꼴 로딩 규칙이므로 유지했다.
7. 최종 검토에서 일괄 복사 저장 직후 실행 취소가 이전 event listener 상태를 읽는 경쟁을 발견했다. 전역 keydown 구독은 한 번만 유지하고 React Effect Event가 최신 pending 및 undo 상태를 읽게 바꿨다. 템플릿 원문 요소는 render state가 아니라 ref로 보관해 React Hook Form 등록을 다시 해제하지 않게 했다. 선택 모델은 키보드로 연 popover를 같은 키보드 동작으로 닫고 trigger 포커스 및 선택 상태를 확인하도록 실제 키보드 사용 순서에 맞췄다.

`pnpm notes:typecheck`, `pnpm notes:lint`, 단위 테스트 192개, Browser Mode 테스트 51개와 운영용 build가 통과했다. 세 브라우저와 Clipboard 및 touch 실행을 포함한 E2E 126개 가운데 123개가 한 번에 통과했고, 병렬 실행 중 운영 서버 응답이 30초를 넘긴 2개와 뒤이어 대기한 1개는 같은 build에서 한 worker로 각각 다시 실행해 모두 통과했다. 320 CSS px의 사용 기록과 템플릿 화면, 넓은 메모 및 사용 기록 화면을 실제 운영 build에서 확인해 주 헤더, 탐색, 자료 읽기 순서와 가로 넘침이 의도한 결과와 맞음을 확인했다. 자동 확대 입력으로 브라우저 배율이 바뀌지 않아 200% 확대의 직접 판정은 남겼고, 강제 색상과 움직임 감소 설정도 별도 직접 판정이 필요하다.

### U19 메모 표면과 헤더 통합

#### 목적과 결정

넓은 화면의 각 메모는 바깥 외곽선, 헤더와 본문이 하나의 표면으로 보여야 한다. 메모라는 독립된 이동 및 크기 조절 대상을 캔버스와 구분하는 바깥 외곽선 한 개는 유지하고, 헤더만 따로 나누는 배경색과 아래쪽 구분선은 제거한다. 선택, 키보드 초점과 속성 편집 대상 표시는 현재 작업 대상을 알리는 정보이므로 장식용 외곽선과 구분해 유지한다.

메모 모서리는 역할별로 정한 `rounded-note`를 유지한다. 현재 둥글기는 헤더 배경이 둥근 바깥 요소 위에 사각형으로 칠해지는 현상과 분리해 판단해야 하므로, 이 단위에서는 token 값을 임의로 바꾸지 않는다. 헤더를 투명하게 만든 뒤에도 모서리가 지나치게 둥글거나 각져 보이면 `rounded-note` 사용처를 먼저 조사하고 승인된 비교 판정에 따라 별도 단위에서 값을 바꾼다. `note-detail-page.tsx`의 입력 영역과 `mobile-batch-copy-confirmation-list.tsx`의 목록 항목은 메모 카드가 아니므로 같은 token 변경에 묶지 않는다.

[CSS Backgrounds and Borders](https://www.w3.org/TR/css-backgrounds-3/)의 둥근 모서리와 배경 칠하기 규칙에 따라 헤더에 별도 모서리나 잘라내기용 wrapper를 덧붙이지 않고, 메모 최상위 요소가 배경과 바깥 외곽선을 맡는다. [CSS Transforms](https://www.w3.org/TR/css-transforms-1/)를 기준으로 실제 회전 및 기울임과 균일 배율에서 발생하는 픽셀 보간을 구분한다. [WCAG 2.2 비텍스트 명암 해설](https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html)은 모든 요소에 선을 요구하지 않으므로, 조작 상태를 전달하는 초점 및 선택 표시만 뚜렷하게 남긴다.

#### 코드 수정과 제거 범위

- 수정: `apps/notes/src/_pages/notes/ui/note-card.tsx`에서 헤더의 `border-b`, `border-border`와 `bg-surface`를 제거한다. 헤더 높이, 좌우 배치, 이동 핸들, 복사 및 더보기 제어는 유지하며 부모 메모의 배경이 그대로 보이게 한다.
- 수정: 같은 파일의 메모 최상위 요소에서 기본 `border border-border`는 유지하고 `hover:border-border-strong`은 제거한다. `border-color`와 `box-shadow`를 바꾸는 다른 상태가 없으면 함께 무효가 되는 `transition-[border-color,box-shadow]`와 `duration-[var(--notes-motion-fast)]`도 제거한다. `hover`만으로 선택된 것처럼 외곽선이 진해지지 않게 하며, 선택 pseudo-element와 `focus-visible` outline 및 속성 편집 대상 표시는 그대로 둔다.
- 확인 후 수정: `apps/notes/src/_pages/notes/ui/mobile-note-card.tsx`는 바깥 외곽선 한 개와 하나의 배경만 사용하는지 넓은 화면 메모와 함께 확인한다. 이미 이 구조를 충족하면 코드를 바꾸지 않는다.
- 유지: `apps/notes/src/_app/styles/tokens.css`의 `--notes-radius-note`와 역할별 색 token은 이 단위에서 바꾸지 않는다. 직접 쓴 색상값과 둥글기, 새 test ID와 새 DOM 감싸기 요소를 추가하지 않는다.
- 삭제하지 않음: `overflow-visible`은 크기 조절 제어와 선택 표시가 메모 밖에 나타나는 데 필요하므로 `overflow-hidden`으로 바꾸지 않는다. 본문, 메모 크기 및 좌표, 자동 저장, 복사, 이동과 크기 조절 코드는 수정하지 않는다.
- 문서 중복 방지: `apps/notes/DESIGN.md`와 `requirements.md`에는 이미 하나의 메모 표면, 필요한 선만 사용하기와 역할별 모서리 규칙이 있으므로 같은 내용을 다시 추가하지 않는다.

#### 구현 절차와 적용 방식

1. 변경 전 상태를 넓은 화면의 기본, `hover`, 선택, 키보드 초점, 속성 편집, 이동 중과 Command 입력 상태로 나누어 확인한다. 좁은 화면의 메모 목록도 함께 확인하되 상세 편집 입력과 일괄 복사 항목은 별도 역할로 기록한다. 이 단계는 상태별 비교 방식이며 새 fixture나 진단 script를 만들지 않는다.
2. 배경 책임을 메모 최상위 요소 한 곳에 둔다. 헤더의 배경과 아래쪽 구분선을 삭제하고 본문의 투명 배경은 유지해 두 영역이 같은 `bg-surface-raised` 위에 놓이게 한다. 헤더에 `rounded-t-*`, 음수 margin 또는 겹치는 가림 요소를 추가하지 않는다.
3. 필요한 외곽선만 남기는 방식으로 기본 외곽선 한 개를 유지하고 `hover` 외곽선 변화는 제거한다. 선택 pseudo-element, 키보드 초점 outline과 속성 편집 표시처럼 서로 다른 상태를 알리는 표시 요소는 합치지 않는다. 아이콘 버튼에 외곽선을 추가하거나 메모 전체에 상시 `box-shadow`를 추가하지 않는다.
4. Command 입력 중 제어를 숨기는 기존 방식은 헤더 높이를 유지해야 한다. 배경과 구분선이 사라진 상태에서도 본문 위치가 움직이지 않고, 키를 놓거나 창의 초점이 돌아오면 제어가 복원되는지 확인한다. 숨김을 이유로 헤더 자체를 조건부 렌더링하지 않는다.
5. 테두리가 기울어 보이면 네 변을 기본 배율, 앱이 제공하는 확대 및 축소와 전체 맞춤에서 비교한다. 계산된 transform에 회전 또는 skew가 없고 균일한 `scale`만 있으면 배율과 화면 픽셀 사이의 보간으로 분류하며 저장 좌표나 크기를 반올림하지 않는다. 실제 회전 또는 한쪽 변의 위치 계산 차이가 확인된 경우에만 `notes-board.tsx`에서 전달하는 화면 변환과 `note-card.tsx`의 transform 조합을 추적해 표시 계산을 고친다.
6. 좁은 화면 메모는 같은 배경 및 바깥 외곽선 원칙을 적용하되 데스크톱 헤더 구조를 복제하지 않는다. 상세 편집 입력과 일괄 복사 항목의 둥글기 및 외곽선은 각 요소의 조작 목적에 따라 유지하고, `rounded-note` 값을 바꿔 한꺼번에 맞추지 않는다.
7. 수정 뒤 `rg`로 넓은 화면 메모 헤더의 배경 및 구분선 class, 메모 최상위 요소의 강한 `hover` 외곽선과 사용되지 않는 전환 class가 남지 않았는지 확인한다. 사용처가 남은 공통 token이나 class는 이번 단위와 이름이 비슷하다는 이유만으로 삭제하지 않는다.

#### 테스트 선정과 TDD

이 단위는 순수 규칙이나 저장 상태 전이를 새로 만들지 않고 브라우저가 그리는 배경, 외곽선과 배율 표현을 바꾸므로 TDD를 적용하지 않는다. CSS class, DOM 계층, 계산된 CSS 값과 구성요소 snapshot을 검사하는 테스트도 작성하지 않는다. 기존 Playwright 검사가 이미 보호하는 다음 사용자 동작을 회귀 검사로 사용한다.

- 기본 상태에서 이동 핸들, 메모 복사와 더보기 제어를 접근 가능한 이름으로 찾고 실제로 사용할 수 있다.
- Command 입력 중 헤더 제어가 보이지 않아 잘못 누를 수 없고, 메모와 본문 입력 영역의 화면 사각형은 유지된다. 키를 놓거나 창의 초점이 복원되면 같은 제어를 다시 사용할 수 있다.
- 메모 이동, 크기 조절, 본문 편집, 자동 저장, 복사와 더보기 동작을 이전과 같이 완료할 수 있다.
- 선택, 키보드 초점과 속성 편집 상태를 실제 화면에서 서로 구분할 수 있다. 색상 class나 outline 두께 같은 내부 style 값은 완료 증거로 사용하지 않는다.

위 동작을 현재 `apps/notes/e2e/notes.spec.ts`가 이미 확인하면 테스트를 추가하지 않는다. 확인하지 못한 동작이 있는 경우에만 같은 과업에 검증문을 보완하고, 임의 문자열, 특정 난수 ID, DOM 순서, CSS class 또는 고정된 화면 좌표를 예상값으로 두지 않는다. 시각 차이는 큰 DOM snapshot이나 픽셀 수치 고정 대신 마지막 실제 브라우저 검토에서 판정한다.

#### 검증과 중단 조건

- `pnpm notes:typecheck`, `pnpm notes:lint`, `pnpm notes:test`, `pnpm --filter notes-app test:browser`, `pnpm notes:test:e2e`와 `pnpm notes:build`를 실행한다. 필수 사용자 과업을 실행한 검사가 수집되지 않거나 `skip`되면 통과로 보지 않는다.
- 마지막 검토 한 번에서 넓은 화면의 모든 메모가 같은 하나의 표면으로 보이고 헤더와 본문 사이에 색 차이 또는 구분선이 없는지 확인한다. 바깥 외곽선에서 서로 마주 보는 두 변은 평행하고 인접한 변은 직각으로 보이며 네 변의 겉보기 굵기가 비슷해야 한다. 모서리에는 사각형 배경이 삐져나오지 않아야 한다.
- 기본, `hover`, 선택, 키보드 초점, 속성 편집, 이동 중과 Command 입력 상태를 비교한다. `hover`가 선택 상태처럼 보이거나 선택 및 키보드 초점 상태를 구분할 수 없으면 완료하지 않는다.
- 앱이 제공하는 확대 및 축소와 전체 맞춤, 320 CSS px의 좁은 화면과 브라우저 200% 확대에서 확인한다. 배율에 따른 계단 현상 및 굵기 보간은 실제 회전과 분리해 기록한다. 한쪽 변이 계속 맞은편 변과 평행하지 않거나 실제 회전과 픽셀 보간을 구분하지 못하면 원인을 확인하기 전까지 좌표 반올림이나 새 보정 상수를 넣지 않는다.
- 수정에 `overflow-hidden`, 겹치는 가림 요소, 직접 쓴 색상값 또는 둥글기, 새 감싸기 요소, 중복 헤더 구조가 필요해지면 진행을 멈추고 원인을 다시 조사한다. 메모 둥글기 token 변경이 상세 입력이나 일괄 복사 항목까지 바꾸는 경우에도 역할별 사용처를 분리하기 전에는 값을 바꾸지 않는다.

#### 2026-09-22 진행 기록

1. 구현 전 대조에서 `note-card.tsx`의 헤더에 `border-b border-border bg-surface`가 남아 있고, 메모 최상위 요소에도 `hover:border-border-strong`과 그 효과만을 위한 transition이 남아 있음을 확인했다. 새 구조, 색상값, 둥글기 또는 감싸기 요소는 추가하지 않고 이 class만 제거 대상으로 정했다. 모바일 메모 항목은 최상위 요소의 배경 하나와 외곽선 하나만 사용하므로 수정 대상에서 제외했다.
2. 헤더 배경과 아래쪽 구분선을 제거해 최상위 요소의 `bg-surface-raised`가 헤더와 본문의 공통 배경을 맡게 했다. hover 외곽선 변화와 함께 무효가 된 transition도 제거했다. 이동 핸들, 복사, 더보기, 선택, 키보드 초점, 속성 편집 대상, 이동 및 크기 조절 코드는 유지했다. 다음 절차는 U20의 미커밋 브라우저 검사와 뒤쪽에 남은 이전 위치 선택 설명을 현재 요구사항에 맞추는 작업이다.
3. 1280×900 운영 화면에서 기본 메모의 헤더 배경이 투명하고 아래쪽 선이 `0px`이며 바깥 네 변만 같은 굵기로 표시되는 것을 확인했다. 같은 화면에서 확대 버튼을 실행하면 메모의 Y 좌표가 89px에서 -289px로 이동하는 별도 결함을 발견했다. 확대 변환은 균일한 `scale(1.1)`이었고 메모 좌표와 카메라 원점은 바뀌지 않았으므로 좌표 보정 문제로 분류하지 않았다.
4. 캔버스의 `overflow-hidden`이 확대 버튼에 포커스가 갈 때 내부 scroll 위치를 바꿔 캔버스 전체를 위로 옮기는 원인이었다. `overflow-clip`으로 바꾸는 첫 수정은 패널이나 새 메모 버튼 아래의 메모를 브라우저가 보이는 영역으로 옮기지 못하게 해 채택하지 않았다. 캔버스 보기 제어가 포커스를 받을 때 viewport의 scroll 위치만 원점으로 복원하고, 확대 전후에 메모와 보기 제어가 화면 안에 남으면서 메모가 커지는 사용자 과업 검사를 추가했다. 확대 비율, 카메라 원점, 저장 좌표와 크기에는 새 보정값을 추가하지 않았다. 다음 절차는 영향받은 브라우저 검사와 전체 통합 검사를 다시 확인하는 작업이다.
5. 통합 검사에서 기존 설정 검사가 checkbox 값만 바뀐 뒤 IndexedDB 저장이 끝나기 전에 새로고침할 수 있는 경쟁을 재현했다. 저장 중 비활성화 상태는 너무 짧아 브라우저에서 항상 관찰할 수 없으므로 완료 기준으로 사용하지 않았다. 같은 브라우저 저장 영역을 공유하는 두 번째 설정 페이지에서 저장된 checkbox 값을 확인한 뒤 원래 페이지를 새로고침하도록 두 설정 검사를 바꿨다. 저장소 내부 값, provider 호출 횟수나 고정 대기 시간은 검사하지 않는다. 다음 절차는 전체 브라우저 조합을 단일 worker로 다시 확인하는 작업이다.
6. 최종 검사에서 typecheck, lint, 단위 검사 192개, 브라우저 구성요소 검사 51개와 운영 빌드가 통과했다. Playwright 전체 실행은 132개 중 130개가 통과했고, 장시간 단일 worker 실행 끝에 기존 일괄 복사 상호작용 한 건과 템플릿 Clipboard 한 건이 30초 안에 입력 요소를 찾지 못했다. 같은 운영 빌드에서 두 사례를 Chromium, Firefox, WebKit과 Clipboard 권한 환경으로 즉시 다시 실행해 4개가 모두 통과했으며, U19 및 U20 직접 영향 검사는 세 브라우저에서 12개, 설정 저장 검사는 6개가 통과했다. 1280×900 운영 화면에서는 헤더의 투명 배경, `0px` 아래쪽 선, 한 겹의 바깥 외곽선과 `6px` 모서리 둥글기를 확인했다. 최종 검토에서는 장시간 전체 실행의 두 시간 초과를 실제 동작 실패와 구분하고, 확대 뒤 화면 위치와 설정 저장 확인이 내부 구현에 의존하지 않는지 판정한다.
7. 마지막 한 차례의 코드 검토에서 이동 동작 두 개가 추가된 팝오버의 실제 높이가 이전 고정 추정값을 넘을 수 있고, 직접 이동 설정을 처음 켠 검사가 저장 완료 전에 새로고침할 수 있음을 확인했다. 팝오버를 연 뒤 렌더링된 너비와 높이로 화면 위아래 및 좌우 위치를 정하도록 고정 너비와 높이 추정값 및 열기 전 위치 계산을 제거했다. 설정 검사는 별도 설정 화면에서 같은 checkbox 값이 관찰된 뒤 새로고침하도록 기존 확인 절차를 재사용하고, 네 동작 팝오버가 화면 안에 있는지도 확인한다. 추가 state, 저장소 내부 조회, 고정 대기 시간과 테스트 전용 API는 만들지 않았다. typecheck, lint, 운영 빌드와 세 브라우저의 설정 검사 6개가 통과했다.

### U20 일괄 복사 재정렬 제어 단순화

#### 목적과 결정

이 단위는 U17과 이 문서의 이전 절에 남아 있는 `위치 변경` 및 목적지 선택 UI 설명을 대체한다. 요구사항의 drag 없는 단일 pointer 재정렬 결과는 유지하되, 별도 목적지 선택 단계 대신 항목 더보기에서 인접한 삽입 결과를 직접 고르게 한다.

항목 수만큼 `N번째로 이동` 버튼을 펼치는 위치 선택 영역과 이를 여는 `위치 변경` 동작은 제거한다. 첨부 화면에서는 위치 선택 영역이 목록보다 먼저 넓은 공간을 차지하고, 항목의 더보기에서 다시 시작해야 하므로 재정렬보다 제어 구조가 먼저 보인다. 항목 수가 늘면 버튼 수도 함께 늘어나 현재 내용 우선 원칙과 조밀한 작업 화면 규칙에도 맞지 않는다.

이동 핸들 drag를 유일한 재정렬 방법으로 만들지는 않는다. [WCAG 2.2 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)는 키보드 조작만으로는 drag의 단일 pointer 대체 방법을 충족하지 못하며, 선택한 목록 항목을 클릭하거나 눌러 위아래로 옮기는 제어를 예시로 든다. [G219 기법](https://www.w3.org/WAI/WCAG22/Techniques/general/G219)은 한 번의 pointer 실행으로 드러난 위아래 제어나 놓을 위치 선택을 허용한다. [재정렬 가능한 Listbox 예제](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/)도 이동 버튼과 변경 안내를 함께 사용하지만, 현재 항목에는 여러 버튼이 있으므로 `listbox` 및 `option` 역할은 도입하지 않는다.

각 항목의 더보기에는 `복제`와 `삭제`를 제공한다. 설정 화면의 `일괄 복사 항목에 위로 이동과 아래로 이동 표시`를 켠 경우에만 `위로 이동`과 `아래로 이동`을 같은 단계의 직접 동작으로 추가한다. 설정은 기본적으로 꺼져 있고 IndexedDB에 저장하며, 이전 저장 자료에 값이 없어도 꺼진 상태로 읽는다. 현재 위치에서 실행할 수 없는 방향은 disabled 상태로 남기지 않고 목록에서 제외하며, 항목이 하나면 두 이동 동작을 모두 표시하지 않는다. 따라서 `위치 변경`이라는 중간 동작, 별도 위치 선택 영역, `N번째로 이동`과 `취소` 버튼은 필요하지 않다. 방향키 재정렬과 drag는 설정과 관계없이 유지하고, 세 입력 방식은 기존 삽입식 재정렬 명령을 사용한다.

#### 코드 수정과 제거 범위

- 수정: `apps/notes/src/features/edit-batch-copy/ui/batch-copy-list.tsx`의 더보기 동작을 현재 위치에 따라 `위로 이동`, `아래로 이동`, `복제`, `삭제`로 조립한다. 이동은 선택 항목을 바로 앞 또는 바로 뒤 삽입 위치로 한 자리 옮기며 기존 `onMove(itemId, index)`를 호출한다.
- 수정: `apps/notes/src/features/edit-batch-copy/model/use-batch-copy-pointer-reorder.ts`에서 항목 ID와 현재 index를 받는 인접 이동 명령을 제공한다. 기존 저장 중복 방지, 낙관적 변경 복구, 포커스 복귀와 live announcement를 그대로 사용하고 두 번째 순서 계산 함수를 만들지 않는다.
- 수정: `apps/notes/src/_pages/batch-copy/ui/batch-copy-item-actions.tsx`, `mobile-batch-copy-confirmation-list.tsx`와 `use-mobile-batch-copy-pointer-reorder.ts`도 같은 직접 이동 동작을 사용한다. 모바일 확인 작업은 원본 메모와 저장 목록을 바꾸지 않는 기존 초안 명령을 유지한다.
- 수정: `apps/notes/src/entities/preference/model/interaction-preferences-record.ts`와 설정 provider에 기본값이 `false`인 이동 동작 표시 설정을 추가한다. 이전 저장 자료는 schema 기본값으로 보완하고, 두 설정의 저장 중 상태와 실패 복원 절차를 공통 저장 함수로 처리한다.
- 수정: `apps/notes/src/_pages/settings/ui/settings-start-page.tsx`의 기존 단축키 checkbox 아래에 `일괄 복사 항목에 위로 이동과 아래로 이동 표시` checkbox를 별도 설정 행으로 추가한다. 같은 설정 영역의 간격과 정렬을 사용하고 이 항목만을 위한 카드, 배경색, 구분선 또는 중첩된 form을 만들지 않는다. 저장 중에는 두 설정의 중복 변경을 막고 저장 실패 시 이동 동작 표시 checkbox를 마지막 저장값으로 되돌린다.
- 수정: `personal-notes-provider.tsx`에서 읽은 설정값을 넓은 일괄 복사 editor와 모바일 일괄 복사 provider에 명시적으로 전달한다. 일반 UI 구성요소가 설정 화면의 Context를 직접 읽거나 범용 service locator를 만들지 않는다.
- 테스트 수정: `apps/notes/e2e/batch-copy.spec.ts`와 `touch-interactions.spec.ts`에서 `위치 변경` 및 `N번째로 이동`을 여는 사례를 직접 위아래 이동, drag와 키보드 사례로 바꾼다. 기존 순수 명령 테스트는 삽입 규칙과 ID 보존의 회귀 기준으로 실행하고 수정하지 않는다.
- 삭제: 두 pointer reorder hook의 `positionItemId` 또는 `positionEntryId`, `choosePosition`, `cancelPositionChoice`, `moveToPosition`과 위치 선택을 위해서만 존재하는 state를 제거한다. 두 목록 UI의 위치 선택 `role="group"`, 항목 수만큼 만드는 버튼, `취소`, 사용하지 않게 된 `Button` import와 전달 prop도 제거한다.
- 이 단위에서 추가하지 않음: 새 dialog, action sheet, submenu, 순서 입력 field, test ID와 별도 재정렬 자료 구조를 만들지 않는다. 모바일 action sheet는 후속 U32에서 다루고, 이 단위의 저장 및 재정렬 명령을 재사용한다.

#### 구현 절차와 적용 방식

1. 기존 재정렬 명령과 저장 복구를 기준선으로 삼는다. `moveBatchCopyItem`과 `moveMobileBatchCopyEntry`가 바로 앞 및 바로 뒤 삽입 위치를 이미 처리하므로 새 순서 알고리즘이나 교환 함수를 만들지 않는다.
2. Persisted UI Preference 방식으로 설정 schema와 provider가 이동 동작 표시 여부를 읽고 저장한다. 저장 자료가 없거나 이전 record에 필드가 없으면 `false`를 사용하며, 별도 schema version과 migration store를 만들지 않는다.
3. React Hook Form의 기존 form에 boolean field와 네이티브 checkbox를 추가한다. 초기값은 provider가 읽은 값으로 설정하고, 사용자가 바꾸면 즉시 저장한다. 저장 실패에서는 새 React state를 만들지 않고 form 값을 마지막 저장값으로 reset한다.
4. Explicit Dependency Injection 방식으로 composition root가 설정값을 두 일괄 복사 provider에 전달한다. 일반 목록과 행 구성요소에는 boolean capability만 전달하고 설정 repository, provider Context 또는 문자열 key를 전달하지 않는다.
5. Progressive Disclosure 방식으로 평상시에는 이동 핸들과 더보기만 표시한다. 설정이 꺼진 더보기에는 `복제`와 `삭제`만 보여주고, 설정을 켜면 현재 항목에서 가능한 직접 이동을 함께 보여준다. 별도 위치 선택 단계로 전환하지 않는다.
6. Capability-based Actions 방식으로 첫 항목에서는 `위로 이동`, 마지막 항목에서는 `아래로 이동`을 만들지 않는다. 중간 항목은 두 방향을 모두 제공하고 항목이 하나면 이동 동작을 만들지 않는다. 현재 위치와 전달받은 capability를 읽어 동작 배열을 만들며 별도 행 state를 저장하지 않는다.
7. `위로 이동`은 현재 index에서 1을 뺀 값, `아래로 이동`은 1을 더한 값을 기존 명령의 최종 index로 전달한다. 화면마다 계산을 복사하지 않고 각 hook이 현재 항목 배열과 공통 명령 연결만 담당한다.
8. 이동이 끝나면 popover를 닫고 새 위치의 같은 항목 더보기 또는 이동 핸들로 포커스를 돌린다. 항목 ID, 선택, 본문 스냅샷과 항목 수는 유지하며 live region은 항목 이름과 새 위치를 한 번만 알린다.
9. 저장 실패에서는 U17의 Optimistic Snapshot 복구를 그대로 사용해 원래 순서, 선택과 포커스를 되돌린다. 설정 저장 실패도 이전 checkbox 값으로 복원한다. 실패를 피하려고 화면에 별도 순서 state를 추가하거나 저장 완료 전에 성공 안내를 만들지 않는다.
10. 제거한 `위치 변경`, `N번째로 이동`, 위치 선택 state와 callback 이름을 `rg`로 확인한다. `위로 이동` 및 `아래로 이동`이라는 사용자 동작과 기존 삽입 명령은 남겨야 하므로 이름이 비슷하다는 이유로 제거하지 않는다.

#### 테스트 선정과 TDD

인접 이동 명령에는 새 TDD를 적용하지 않는다. 이미 TDD가 적용된 삽입식 재정렬 명령에 현재 index와 한 자리 차이의 최종 위치를 전달하기 때문이다. 이전 preference record에 새 필드가 없을 때 `false`로 보완하는 schema 규칙은 저장 자료 호환성을 결정하므로 기존 schema 테스트를 먼저 바꾸고 실패를 확인한 뒤 구현한다. hook state, action 배열, callback 이름과 popover DOM을 직접 검사하는 테스트는 작성하지 않는다.

- 서로 구분되는 항목을 네 개 이상 UI에서 준비하고 중간 항목의 `위로 이동` 및 `아래로 이동`을 각각 실행한다. 화면 순서와 새로고침 뒤 저장 순서가 같은지 확인하며 예상 순서는 fixture의 원문과 실행한 이동에서 구한다.
- 첫 항목에는 `위로 이동`, 마지막 항목에는 `아래로 이동`이 보이지 않고 항목이 하나면 두 이동 동작이 모두 보이지 않는지 접근 가능한 이름으로 확인한다. disabled class, 동작 배열 길이와 DOM 자식 순서는 검사하지 않는다.
- 저장 자료가 없는 설정 화면에서 이동 동작 표시 checkbox가 선택되지 않았는지 확인한다. 설정을 켠 뒤 새로고침과 일괄 복사 화면 이동을 거쳐 checkbox 및 직접 이동 동작이 함께 유지되고, 다시 끄면 직접 이동 동작이 사라지는지 확인한다.
- 같은 항목을 pointer drag, 선택된 항목의 방향키와 더보기 직접 동작으로 옮겨 같은 삽입 결과, ID, 선택과 포커스가 유지되는지 확인한다. 정확한 drag 좌표와 event 횟수는 고정하지 않는다.
- 이동 뒤 변경 안내가 한 번 전달되고 새 위치의 같은 항목에서 다음 동작을 계속할 수 있는지 확인한다. 접근 가능한 이름의 승인된 동작 문구는 사용할 수 있지만 임의 ID, CSS class, hook 반환값과 전체 markup snapshot은 예상값으로 사용하지 않는다.
- 저장 실패와 재시도는 기존 실패 제어를 사용해 원래 순서 복원과 이후 저장 성공을 확인한다. provider 호출 횟수나 테스트 대역의 성공값만으로 완료를 판정하지 않는다.

#### 검증과 중단 조건

- `pnpm notes:typecheck`, `pnpm notes:lint`, `pnpm notes:test`, `pnpm --filter notes-app test:browser`, `pnpm notes:test:e2e`와 `pnpm notes:build`를 실행한다. 수집된 필수 과업이 없거나 `skip`되면 통과로 보지 않는다.
- 넓은 나란한 패널, 중간 너비 dialog, 320 CSS px의 저장 목록 관리와 모바일 확인 화면에서 더보기를 확인한다. 목록 위에 위치 선택 영역이 생기지 않아야 한다. 설정이 꺼지면 복제와 삭제만, 설정을 켜면 현재 가능한 직접 이동과 복제 및 삭제만 보여야 한다.
- touch, mouse, keyboard와 200% 확대에서 직접 이동을 실행하고, 이동 후 항목을 다시 찾거나 drag하지 않아도 같은 항목의 다음 동작을 이어갈 수 있어야 한다.
- drag를 제거하거나 키보드 방향키만 남겨 단일 pointer 대체 조작이 사라지면 완료하지 않는다. 직접 이동을 위해 새 순서 계산, 두 번째 목록 state 또는 임시 ID가 필요해지면 기존 삽입 명령을 다시 조사한다. U32의 모바일 action sheet는 이 단위의 완료 조건과 별도로 다룬다.

#### 실행 기록

- 요구사항 문서의 이전 위치 선택 동작을 설정 기반 직접 이동 동작으로 바꿨다. 다음 절차는 이전 저장 자료를 보완하는 설정 schema와 설정 화면 연결이다.
- 설정 schema는 이전 record의 누락 필드를 `false`로 읽고, 설정 provider는 두 checkbox를 같은 저장 및 실패 복원 절차로 처리한다. 설정 화면에는 새 checkbox를 기존 설정 행과 같은 구조로 추가했다. 다음 절차는 설정값을 넓은 화면과 모바일 일괄 복사 조립부에 전달하는 작업이다.
- 넓은 화면 조립부는 설정값을 명시적으로 전달한다. 항목 더보기는 설정을 켠 경우에만 현재 실행할 수 있는 직접 이동 동작을 만들고, 방향키와 직접 이동은 같은 한 자리 이동 함수와 저장 및 포커스 복귀 절차를 사용한다. 넓은 화면의 위치 선택 state와 목적지 선택 UI는 제거했다. 다음 절차는 모바일 확인 화면에 같은 동작을 적용하는 작업이다.
- 모바일 provider도 설정값을 명시적으로 전달한다. 모바일 확인 화면은 현재 실행할 수 있는 직접 이동만 항목 동작에 추가하고, 기존 작업 초안 재정렬과 포커스 복귀 및 안내 절차를 재사용한다. 모바일의 위치 선택 state와 목적지 선택 UI는 제거했다. 다음 절차는 사용자 과업 테스트를 새 동작에 맞추는 작업이다.
- 사용자 과업 테스트는 기본 비활성화, 설정 저장 유지, 첫 항목과 중간 항목에서 가능한 방향, 직접 이동 뒤 포커스와 저장 순서, 다시 비활성화한 뒤 이동 동작이 사라지는 상태를 확인한다. 이전 목적지 선택 사례는 직접 이동 또는 기존 방향키 사례로 바꿨다. 다음 절차는 한 차례의 통합 검사와 최종 검토다.
- 새로고침 뒤 저장 순서를 확인하는 검사는 화면 너비에 따라 dialog 또는 나란한 패널이 선택되는 메모 화면에 의존하지 않고 `/batch-copy`의 `일괄 복사 항목 관리` 영역에서 같은 원문 순서를 확인하게 했다. fixture 원문은 실행마다 생성하고 예상 순서는 준비한 원문과 실행한 한 자리 이동으로 계산한다. 다음 절차는 U19와 U20을 함께 확인하는 통합 검사와 최종 검토다.

### U21 모바일 frame 높이와 뒤로가기 제어

#### 목적과 확인한 원인

좁은 화면의 메모 상세 저장 영역과 일괄 복사 수집 하단 동작을 현재 보이는 애플리케이션 영역 아래쪽에 유지하고, 뒤로가기를 일반적인 테두리 없는 화면 이동 동작으로 정리한다. 메모 편집 및 저장, 저장 전 이탈 확인, 일괄 복사 수집과 초기화 및 다음 이동, 보드 방향 제어와 safe area 여백은 바꾸지 않는다.

[모바일 표시 영역과 뒤로가기 제어 조사](references/mobile-viewport-controls-research.md)에서 배포 화면과 현재 소스를 비교했다. `ApplicationFrame`의 `h-dvh`는 실제 표시 영역 높이를 올바르게 계산한다. 좁은 메모 화면에서 첫 번째 자식인 탐색이 `display: none`이 되면 행을 지정하지 않은 콘텐츠 wrapper가 CSS Grid의 첫 번째 자동 높이 행에 배치되고, 남은 높이 행이 비는 것이 직접 원인이다. 상세 footer와 일괄 복사 하단 동작은 축소된 wrapper 아래쪽에 올바르게 붙어 있으므로 화면별 `fixed` 위치를 추가하지 않는다.

메모 상세의 뒤로가기 링크는 다른 아이콘 전용 동작과 달리 외곽 테두리, 채운 배경과 테두리 hover를 별도로 사용한다. 공유 `ArrowBackIcon`은 보드 시점 이동에도 회전해서 사용하므로 모양을 직접 바꾸지 않고 화면 이동 의미를 별도 아이콘으로 분리한다.

#### 코드 수정과 제거 범위

- 수정: `apps/notes/src/_app/ui/application-frame.tsx`에서 콘텐츠 wrapper를 Grid의 두 번째 행에 명시적으로 배치한다. `h-dvh`, 첫 행의 application navigation, 두 번째 행의 남은 높이와 기존 `overflow-hidden`을 유지한다. route별 높이 계산, `window.innerHeight` state와 JavaScript resize listener는 추가하지 않는다.
- 추가: `apps/notes/src/shared/ui/icons/icons.tsx`와 `index.ts`에 화면 이동용 `NavigateBackIcon` 하나를 추가한다. 기존 `ArrowBackIcon`은 `notes-board.tsx`의 네 방향 시점 이동이 계속 사용하므로 삭제하거나 변경하지 않는다.
- 수정: `apps/notes/src/_pages/notes/ui/note-detail-page.tsx`, `mobile-notes-workspace.tsx`와 `apps/notes/src/_pages/batch-copy/ui/mobile-batch-copy-confirmation.tsx`의 화면 이동 제어를 `NavigateBackIcon`으로 바꾼다. 기존 접근 가능한 이름, 이동 route, 일괄 복사 상태 종료와 저장 전 이탈 확인 callback은 유지한다.
- 수정: `note-detail-page.tsx`의 `backLinkClassName`에서 평상시 외곽 테두리, 채운 배경과 테두리 hover를 제거한다. 크기, 정렬, 아이콘 색, hover 및 pressed 배경과 `focus-visible` 표시는 U13의 조용한 아이콘 동작과 같은 토큰을 사용한다. `Link`를 버튼으로 바꾸거나 새 다형성 UI 구성요소를 만들지 않는다.
- 테스트 수정: `apps/notes/e2e/notes.spec.ts`, `touch-interactions.spec.ts`와 `batch-copy.spec.ts`의 기존 좁은 화면 과업에 하단 동작의 화면 내 접근성과 뒤로가기 결과를 추가한다. CSS Grid 행, class 문자열, SVG path와 DOM 중첩을 검사하지 않는다.
- 제거: 화면별 footer 위치를 보정하기 위해 생긴 코드가 없으므로 삭제할 모듈은 없다. 구현 중 임시 `fixed`, 높이 상수, resize state 또는 두 번째 뒤로가기 class가 필요해지면 추가하지 않고 공통 frame 배치를 다시 확인한다.

#### 구현 절차와 적용 방식

1. Explicit Grid Placement 방식으로 application navigation은 첫 번째 행, 콘텐츠 wrapper는 두 번째 행을 사용하게 한다. 탐색이 보이면 첫 행 높이만큼 제외하고, `display: none`이면 첫 행은 0이 되며 콘텐츠가 남은 높이를 모두 받는다.
2. Fixed Shell and Internal Scroll 방식으로 공통 frame 높이와 `overflow-hidden`을 유지한다. 메모 목록, 상세 편집기와 일괄 복사 목록의 기존 내부 스크롤만 허용하며 document와 footer를 별도로 스크롤하게 만들지 않는다.
3. 하단 동작의 containing block을 바꾸지 않는다. `mobile-notes-workspace.tsx`의 기존 아래쪽 배치와 `note-detail-page.tsx` 및 모바일 확인 화면의 마지막 Grid 행은 높이가 정상화된 부모 안에서 그대로 사용한다. `position: fixed`, portal과 중복 safe area padding은 추가하지 않는다.
4. Semantic Icon Separation 방식으로 화면 이동용 `NavigateBackIcon`과 보드 방향용 `ArrowBackIcon`을 분리한다. 메모 상세, 일괄 복사 상태와 모바일 확인 화면은 같은 화면 이동 아이콘을 사용하고, 네 방향으로 회전하는 보드 제어는 기존 아이콘을 유지한다.
5. Quiet Icon Action 방식으로 메모 상세 링크의 평상시 테두리와 채운 배경을 제거한다. hover, pressed와 `focus-visible`은 배경 또는 별도 포커스 표시로 구분하고, 화면에 보이는 글자 없이도 기존 접근 가능한 이름으로 목적을 알린다.
6. 메모 상세에서 입력 후 저장, 저장 전 뒤로가기, 일괄 복사 상태 종료, `초기화`, `다음` 및 모바일 확인 화면 복귀를 차례로 실행한다. frame 수정 전후에 route와 저장 자료가 같아야 하며, 화면 위치를 고치기 위해 상태나 저장 명령을 수정하지 않는다.
7. 320 CSS px와 실제 Android 브라우저에서 짧은 내용, 표시 영역보다 긴 내용, 도구 모음이 보이는 상태와 접힌 상태를 비교한다. 기존 브라우저 검사 조합에서는 safe area 여백과 화면 키보드가 저장 제어를 가리지 않는지 확인한다.

#### 테스트 선정과 TDD

이 단위에는 TDD를 적용하지 않는다. 변경 대상은 CSS Grid 배치, 실제 표시 영역, 아이콘 표현과 브라우저 스크롤 조합이며 순수 입력과 출력 규칙을 새로 만들지 않는다. 기존 저장 및 일괄 복사 명령의 단위 테스트를 수정하거나 복제하지 않고, 실제 운영 빌드의 브라우저 과업으로 사용자에게 보이는 결과를 확인한다.

- 화면에서 생성한 서로 다른 원문의 메모를 사용한다. 메모 상세를 열어 짧은 원문과 여러 화면 높이의 원문에서 저장 제어가 표시 영역 안에 있고, 편집 영역을 스크롤한 뒤에도 저장을 실행할 수 있는지 확인한다.
- 일괄 복사 상태에서 화면보다 많은 메모를 준비하고 목록을 끝까지 스크롤한다. `초기화`와 `다음`이 화면 안에 남으며 각각 클릭 횟수 초기화와 확인 화면 이동을 실행하는지 확인한다. 고정 좌표, footer의 CSS `position` 값과 class는 예상값으로 사용하지 않는다.
- 뒤로가기는 접근 가능한 이름으로 찾아 상세에서 메모 목록으로 이동하고, 저장하지 않은 입력이 있으면 기존 확인 절차를 거치며, 일괄 복사 상태에서는 Clipboard와 항목을 바꾸지 않고 평상시 목록으로 돌아가는지 확인한다. 아이콘 SVG path나 픽셀 색을 자동화된 예상값으로 만들지 않는다.
- 표시 영역 높이를 현재 값에서 더 작고 큰 값으로 바꾼 뒤 하단 동작이 다시 화면 안에 있는지 확인한다. 특정 기기 높이를 결과로 고정하지 않고 각 실행 시점의 viewport와 동작의 bounding box 관계를 사용한다.
- 공통 frame 회귀를 막기 위해 메모 목록, 상세, 일괄 복사 수집 및 확인, 넓은 메모 화면과 보조 route의 기존 고유 heading 또는 제어에 도달하는지 확인한다. 숨은 navigation의 class, Grid track 문자열과 wrapper 높이는 검사하지 않는다.

#### 검증과 중단 조건

- `pnpm notes:typecheck`, `pnpm notes:lint`, `pnpm --filter notes-app test:browser`, 관련 Playwright 과업과 `pnpm notes:build`를 실행한다. 저장, 저장 전 이탈, 일괄 복사와 route 이동의 기존 검사가 하나라도 실패하면 시각 수정 완료로 처리하지 않는다.
- 320 CSS px, 200% 및 400% 확대에서 주 헤더는 한 줄을 유지하고, 상세 저장 영역과 일괄 복사 하단 동작은 내용과 함께 스크롤되지 않으며 화면 아래쪽 safe area를 침범하지 않는다.
- 실제 Android 브라우저에서 주소 및 도구 모음이 보이거나 접힌 상태로 메모 상세와 일괄 복사 상태를 확인한다. 뒤로가기는 평상시 외곽 테두리 없이 표시되고 다른 헤더 아이콘과 시각 크기가 맞으며, 키보드 포커스 표시는 유지돼야 한다.
- application bar 또는 좁은 보조 route 탐색이 가려지거나 document scroll이 새로 생기면 완료하지 않는다. 화면별 `fixed` footer, JavaScript 높이 측정, route별 높이 상수 또는 저장 및 일괄 복사 state 변경이 필요해지면 구현을 멈추고 공통 frame 조립을 다시 조사한다.

U13부터 U21까지의 실행 기록과 당시 순서는 유지한다. 공통 프레임을 유지하려던 U14 및 U21의 구현 방향, 좁은 화면 탐색을 미승인으로 둔 U14 및 U18의 중단 조건, 메모 누르기와 토스트 닫기에 관한 이전 계획은 아래 U22부터 U25가 대체한다. U21에서 수정한 뒤로가기 아이콘과 화면 하단 도달성은 버리지 않고 새 화면별 구성에서도 보존한다. 아래 절차는 코드 변경을 아직 실행한 기록이 아니다.

## 좁은 화면 탐색과 과업별 화면 구성

[요구사항의 반드시 지킬 조건](requirements.md#반드시-지킬-조건), [좁은 화면 탐색과 메모 동작 조사](references/mobile-navigation-and-actions-research.md), [모바일 Drawer의 저장 목록 링크 조사](references/mobile-saved-batch-copy-drawer-research.md), [텍스트 재사용 작업 화면 결정](decisions/focused-text-utility-workspace.md), [조작 피드백과 실패 복구 결정](decisions/interaction-feedback-and-recovery.md) 및 [`apps/notes/DESIGN.md`](../../../apps/notes/DESIGN.md)를 입력으로 사용한다. 구현 전에 [개인 메모 테스트 전략](../../dev/personal-notes-app/testing-strategy.md)과 [테스트 안티패턴](../../dev/personal-notes-app/test-anti-patterns.md)을 다시 읽는다.

현재 코드에서 유지할 자료 저장, 화면 이동 전 확인, 본문 바로가기, 일괄 복사 초안 및 복사 사용 횟수를 확인한 뒤 U22, U23, U24, U25 순으로 진행한다. 각 절차는 추가할 코드와 함께 더 이상 쓰지 않을 코드 및 export를 같은 변경에서 제거한다.

### 실행 상태

- U7 보존 점검: 전체 브라우저 검사에서 패널 밖으로 항목을 놓은 다음 실행한 `ControlOrMeta+z`가 간헐적으로 무시됐다. `pending` 차단을 제거해도 같은 과업이 5회 중 1회 실패하므로 이를 단독 원인으로 확정하지 않았다. 단축키의 기존 입력 중 제외 및 저장 대기 규칙은 유지했다. `batch-copy.spec.ts`에서 남은 항목의 제어에 포커스를 둔 뒤 복원 단축키를 실행하도록 바꾸었고 동일 과업은 Chromium에서 10회 연속 통과했다. 텍스트 편집의 기본 실행 취소를 가로채는 코드, 별도 이력 상태와 타이머는 추가하지 않았다.
- U22: 화면 목적별 프레임 연결을 적용했다. `ApplicationFrame`과 route 판별을 제거하고 메모 작업, 상세 및 일괄 복사 작업, 보조 화면의 조립부와 본문 바로가기 링크를 분리했다. Provider는 루트 layout에 유지한다. 전체 브라우저 검사에서 상세 입력 직후 이전 원문으로 돌아가는 사례가 재현돼 `use-note-detail-editing.ts`의 입력 등록 ref를 렌더링 사이에 유지하고 `note-detail-page.tsx`의 초기값은 메모를 열 때의 원문으로 한정했다. 렌더링별 `contentValue` 전달은 제거하고 별도 입력 상태를 만들지 않았다. 저장 전 이동 검사는 수정 뒤 Chromium에서 통과했다. 실제 Android의 화면 키보드 및 도구 모음 확인은 남아 있다.
- U23: 주요 화면 링크를 `widgets/application-navigation`으로 옮겼고, 메모 목록과 보조 화면에 왼쪽 Drawer를 연결했다. 기존 좁은 화면 펼침 탐색 및 목록 우측 하단의 저장 목록 링크를 제거했다. 새 메모는 평상시 목록의 우측 하단 아이콘으로 옮기고, 저장된 항목 수와 읽기 실패 재시도는 목록 Drawer에서만 표시한다. 수집 중 오른쪽 실행 제어도 같은 Drawer를 연다. Drawer 너비와 배경 색상, 새 메모 제어의 크기와 화면 가장자리 간격은 디자인 토큰으로 정의했다. `Escape`, 바깥 영역과 닫기 버튼, 포커스 복귀, 움직임 줄이기 및 저장 목록 이동은 브라우저 과업에서 통과했다. 현재 CSS 진입 및 종료 전환은 저장소에 명시된 Safari 16.4 하한 전체에서 보장되지 않는다. [WebKit 17.5의 `@starting-style` 도입](https://webkit.org/blog/15383/webkit-features-in-safari-17-5/)과 [Safari 18의 `display` 전환 도입](https://webkit.org/blog/15443/news-from-wwdc24-webkit-in-safari-18-beta/)을 고려해 이전 버전에는 같은 움직임을 강제하지 않는다. 네이티브 `dialog` 열기와 닫기, 탐색, 포커스 복귀가 동작하는지만 확인하고 전환용 대체 코드나 검사 자료를 추가하지 않는다. 실제 Android의 열림 및 닫힘 확인은 남아 있다.
- U24: 모바일 카드의 본문 링크를 원문 복사 버튼으로 바꾸고 별도의 수정 아이콘 링크를 연결했다. 카드별 복사 아이콘과 앵커 전용 길게 누르기 분기를 제거하고, 수집 중에는 같은 본문 버튼이 항목 추가만 실행하도록 했다. 기존 길게 누르기의 이동 및 취소 조건은 유지한다. 메모 복사, 수정 이동, 수집 중 중복 항목 추가, 긴 목록의 새 메모 제어는 브라우저 검사에서 통과했다. WebKit에서는 클립보드 읽기 권한이 없어 복사 성공 알림과 화면 이동으로 확인했고, 정확한 클립보드 원문은 Chromium에서 확인했다.
- U25: 공유 토스트의 오른쪽에 닫기 아이콘을 연결했다. 닫기와 자동 종료 때 포커스가 버튼에 있으면 알림 표시 전의 실행 지점으로 돌려보내며, 새 알림으로 대체될 때 복귀 지점을 다시 읽는다. 삭제 취소 및 재시도 동작은 그대로 둔다. 토스트 Chromium 과업에서 수동 닫기, 자동 종료, 재시도와 실행 취소를 통과했다.
- 통합 검사: `pnpm notes:typecheck`, `pnpm notes:lint`, `pnpm notes:test`의 192개 검사, Browser Mode의 51개 검사와 `pnpm notes:build`가 통과했다. 단일 worker의 전체 Playwright 재실행에서는 147개 중 145개가 통과했다. 상세 편집 입력 복원과 패널 항목 제거 및 복원은 수정 뒤 통과했고, 템플릿 생성문의 Clipboard 사례도 통과했다. 최신 코드의 모바일 탐색 및 Clipboard 과업 22개는 별도 재실행에서 모두 통과했다. WebKit의 모바일 저장 모델 탐색은 전체 실행에서 실패했지만 단독 실행에서는 통과했다. 선택 및 속성 대상 모델 탐색의 정상 행동은 단독 실행에서 통과했으나 통제 결함 replay가 180초 제한에 걸렸고 `TargetClosedError`로 끝났다. 두 모델 탐색 실패를 해결하고 전체 검사를 통과시키는 작업, U12의 모델 탐색 재작성, 실제 Android 화면 키보드 및 브라우저 표시 영역 확인은 아직 완료되지 않았다. 따라서 전체 애플리케이션 완료로 표시하지 않는다.

### U22 화면 목적에 따른 프레임 분리

#### 화면 분류와 보존할 동작

- 공간형 보드는 넓은 화면의 한 줄 전역 탐색 아래에서 남은 보이는 높이를 캔버스와 선택적 오른쪽 패널에 배정한다. 페이지 제목과 별도 하단 작업 행은 만들지 않는다.
- 좁은 메모 목록은 한 줄 헤더, 내부 목록 스크롤, 우측 하단 새 메모 제어와 평상시 Drawer의 저장 항목 수 링크를 갖는다. 일괄 복사 수집 중에는 같은 목록에서 헤더 뒤로가기와 화면 하단의 `초기화` 및 `다음`을 우선한다.
- 메모 상세 편집은 한 줄 작업 헤더, 본문 편집기의 스크롤과 현재 보이는 화면 아래쪽의 저장 동작을 갖는다. Drawer와 목록의 우측 하단 제어를 갖지 않는다.
- 일괄 복사 확인 및 저장 목록 관리는 한 줄 작업 헤더, 항목 목록 스크롤과 화면 하단 작업 동작을 갖는다. Drawer와 새 메모 제어를 갖지 않는다. 상세와 같은 화면 높이 처리 방식을 재사용할 수 있지만 저장 및 취소 의미는 섞지 않는다.
- 사용 빈도, 텍스트 분석, 템플릿과 설정은 내용 길이에 따라 문서처럼 스크롤하는 보조 화면이다. 좁은 화면에 Drawer를 제공하고 메모 보드용 높이 및 스크롤 제한을 적용하지 않는다.

#### 코드 변화와 적용 방식

- 수정: `apps/notes/app/layout.tsx`에서 모든 route를 감싸는 `ApplicationFrame`을 빼되 `RuntimeAccessGuard`, `PersonalNotesProvider`와 화면 이동 확인 Provider를 유지한다. 본문 바로가기 링크는 실제 각 화면의 주 영역에 도달하도록 남긴다.
- 수정: `apps/notes/app/page.tsx`, `app/notes/[noteId]/page.tsx`, `app/batch-copy/page.tsx`, `app/usage/page.tsx`, `app/analysis/page.tsx`, `app/templates/page.tsx`, `app/settings/page.tsx`는 앞에서 분류한 화면 목적에 맞는 구성만 사용하도록 조립한다. `/batch-copy`를 전역 탐색 목적지로 추가하거나 주소를 바꾸지 않는다.
- 수정: `apps/notes/src/_pages/notes/ui/notes-start-page.tsx`, `mobile-notes-workspace.tsx`, `note-detail-page.tsx`와 `apps/notes/src/_pages/batch-copy/ui/mobile-batch-copy-confirmation.tsx`의 화면 높이와 스크롤 책임을 실제 과업에 맞춘다. 보드와 목록 전환은 기존 `48rem` 메모 영역 기준을 유지하고 저장 좌표 및 크기는 바꾸지 않는다.
- 추가: 공통 route wrapper 대신 화면 목적에 맞는 최소 구성만 `apps/notes/src/_app/ui/` 아래에 둔다. 보드 및 목록을 담는 메모 화면 구성, 상세와 일괄 복사에 필요한 작업 화면 구성, 보조 화면 구성을 분리한다. 같은 높이 계산 또는 본문 바로가기 연결이 실제로 반복될 때만 좁은 공통 부분을 추출하고, 화면별 분기는 각 route에서 명시한다. Next.js route 조립부에서 FSD 하위 계층을 import할 수 있지만 FSD Pages에서 `_app`을 역방향 import하지 않는다.
- 제거: route 판별, `noteTask` 조건부 class와 전 화면 wrapper를 가진 `apps/notes/src/_app/ui/application-frame.tsx` 및 `apps/notes/src/_app/index.ts`의 해당 export를 모든 route 전환 뒤 삭제한다. 옛 wrapper를 새 프레임 안에 다시 감싸거나 route 문자열 판정을 복제하지 않는다. U21에서 사용한 CSS Grid 행 지정은 전역 규칙이 아닌 과업별 배치 필요성으로 다시 판정한다.

Provider와 화면은 서로 다른 책임으로 둔다. 보이는 높이에 고정되는 과업 화면에는 CSS의 남은 공간 배치와 내부 스크롤을 사용하고, 보조 화면에는 문서 스크롤을 허용한다. 특정 Grid 또는 Flex 구문을 완료 조건으로 삼지 않으며, 한 축의 헤더, 본문, 하단 동작에는 Flex를 우선 검토하고 공간형 보드와 패널의 두 방향 배치에는 Grid를 비교한다. JavaScript의 화면 높이 측정과 화면마다 중복된 `fixed` 하단 제어를 도입하지 않는다.

#### TDD, 관찰 및 중단 조건

새 순수 자료 규칙이 없으므로 TDD를 적용하지 않는다. 기존 실제 메모와 일괄 복사 작업을 준비하고 route별로 첫 화면, 긴 내용 스크롤, 뒤로가기, 저장 전 이탈 확인과 새로고침 뒤 자료 보존을 브라우저에서 확인한다. 예상값은 준비한 원문과 수행한 사용자 동작에서 얻으며 wrapper 이름, DOM 중첩, class, Grid 또는 Flex 속성을 테스트하지 않는다. 320 CSS px, 큰 글자, 화면 키보드와 Android 브라우저 도구 모음 높이 변화에서 하단 동작이 화면에 남고 보조 페이지는 전체 내용을 스크롤할 수 있어야 한다. Provider 수명 변경으로 초안, 토스트 또는 화면 이동 확인이 사라지면 다음 절차로 진행하지 않는다.

### U23 좁은 화면 Drawer 탐색

#### 코드 변화와 적용 방식

- 수정: `apps/notes/src/_app/ui/navigation/application-navigation.tsx`와 `use-application-navigation.ts`의 현재 다섯 화면 링크, 활성 화면 표시 및 이동 전 확인을 아래 탐색 위젯으로 옮긴다. 넓은 화면의 한 줄 탐색은 유지하고 좁은 보조 화면의 펼침 목록은 Drawer로 대체한다. `mobile-notes-workspace.tsx`의 평상시 헤더 왼쪽에는 기존 새 메모 버튼 대신 접근 가능한 이름을 가진 Drawer 열기 아이콘을 둔다. 수집 중 왼쪽 뒤로가기는 유지하고 현재 오른쪽의 빈 자리에는 Drawer 열기 아이콘을 둔다. 보조 페이지 헤더도 한 줄로 조립하고 상세 및 `/batch-copy`에는 실행 제어를 렌더링하지 않는다.
- 추가: `apps/notes/src/widgets/application-navigation/`에 공개 진입점, 공통 주요 화면 목록, 넓은 탐색 UI와 좁은 Drawer UI 및 별도 상태 hook을 둔다. `_app`의 화면 구성과 `_pages`의 메모 목록은 이 공개 진입점으로 같은 주요 화면을 사용한다. `apps/notes/eslint.config.mjs`에 Widgets 계층과 App 및 Pages의 Widgets 공개 진입점 의존 규칙을 추가해 현재 FSD 검사를 유지한다. Drawer의 이동 전 확인은 기존 `features/navigation-guard` 공개 API를 재사용한다. 새 외부 접근성 및 애니메이션 의존성은 추가하지 않으며 모달 구현을 택하면 네이티브 `dialog`와 [모달 대화상자 포커스 규칙](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)을 적용한다.
- 수정: `mobile-notes-workspace.tsx`의 당시 `createAndOpenNote`와 생성 중 상태는 유지한 채 평상시 헤더 왼쪽의 새 메모 텍스트 버튼을 제거하고 우측 하단에 새 메모 아이콘 버튼을 놓는다. 생성 후 이동은 U31에서 바꾼다. `mobile-note-list.tsx`에 둔 넓은 하단 여백은 U30에서 제거한다. 헤더 자리를 비우는 작업과 Drawer 열기 버튼 연결을 같은 변경에서 마쳐 생성 제어가 사라지거나 두 버튼이 헤더 왼쪽에 함께 남는 중간 상태를 만들지 않는다. 수집 중에는 새 메모 버튼을 표시하지 않는다.
- 수정: `apps/notes/src/_pages/notes/ui/mobile-notes-workspace.tsx`는 기존 일괄 복사 Provider에서 저장 목록의 준비된 항목 수와 모바일 작업 초안 유무를 읽어, 평상시 메모 목록에 한해 Drawer에 선택적 저장 목록 링크를 전달한다. `widgets/application-navigation`의 Drawer는 다섯 주요 화면 링크 다음에 한 번만 구분선을 두고, `일괄 복사`와 오른쪽 정렬 `N개`를 같은 `/batch-copy/` 링크 안에 표시한다. 별도 count 버튼, 붉은 알림 badge, 두 번째 자료 조회와 로컬 count state는 만들지 않는다. 자료를 읽는 중에는 링크를 숨기고, 읽기 실패에는 `0개`를 꾸며내지 않으며 Provider의 기존 `retry` 명령을 쓰는 오류와 재시도 제어를 Drawer 안에 표시한다. 오류 제어에는 같은 Provider의 기존 상태를 사용하고 새 저장 상태를 만들지 않는다. 링크 실행에는 주요 화면과 같은 이동 전 확인을 적용하며, 숫자는 링크의 접근 가능한 이름에서 읽히게 한다.
- 제거: Drawer의 저장 목록 링크가 실제로 동작한 뒤 `apps/notes/src/_pages/notes/ui/batch-copy-workspace.tsx`의 모바일 우측 하단 `Link`, 이 링크 전용 `useMobileBatchCopy` import 및 활성 초안 판정값을 삭제한다. 넓은 화면 우측 상단의 `일괄 복사` 버튼과 그 항목 수 계산은 유지한다. 사용자가 탐색할 수 있는 화면을 모두 새 위젯에 연결한 뒤 `apps/notes/src/_app/ui/navigation/`의 이전 구현, 좁은 보조 화면의 인라인 펼침 목록과 이를 위한 `expanded` 스타일 및 불필요한 placeholder를 없앤다. 링크 목적지, 넓은 화면의 탐색과 화면 이동 확인은 삭제하지 않는다. 한 화면이 새 위젯과 이전 탐색을 동시에 렌더링하는 전환 상태를 남기지 않는다.

Drawer는 좁은 메모 목록의 평상시와 일괄 복사 수집 상태 및 보조 화면에서만 연다. 저장 목록 링크는 평상시 메모 목록에만 제공하므로 보조 화면과 수집 중 Drawer의 다섯 주요 화면 목록은 그대로 유지한다. 수집 상태에서는 헤더 왼쪽의 취소와 오른쪽의 Drawer 실행 제어를 구분하고, Drawer를 닫아도 현재 수집을 끝내지 않는다. 화면 이동을 실제로 실행할 때에는 기존 화면 이동 확인과 작업 초안 보존 규칙을 거친다. Drawer 안에는 패널을 닫는 아이콘 제어를 두고, `Escape`와 바깥 영역 누르기로도 닫을 수 있어야 하며 포커스는 실행 제어로 돌려준다. Drawer만 닫았을 때 route가 바뀌거나 자료가 수정되면 안 된다.

Drawer는 어느 화면에서 열어도 왼쪽에서 나타난다. 임시 오버레이 방식으로 패널을 현재 화면 위에 놓고 메모 목록, 보조 화면과 우측 하단 새 메모 제어를 옆으로 밀지 않는다. 열 때는 패널의 가로 `transform`을 왼쪽 바깥에서 제자리로, 닫을 때는 역방향으로 전환하고 배경은 `opacity`로만 바꾼다. `left`, `width`와 전체 화면의 위치를 프레임마다 바꾸지 않는다. 기존 `--notes-motion-panel`을 후보로 사용하되 패널 너비와 전환 시간 및 곡선은 대표 화면에서 확인한 뒤 확정한다.

`prefers-reduced-motion: reduce`에서는 이동 전환 없이도 같은 화면을 열고 닫는다. 모달 `dialog`를 사용하면 진입과 퇴장 모두 보이는지 `@starting-style`, `display` 및 `overlay`의 이산 전환과 대상 브라우저의 실제 동작을 확인한다. 전환이 끝나기 전에 내용을 해제하거나 새 타이머로 포커스와 닫힘 수명을 중복 관리하지 않는다. 가장자리 스와이프는 추가하지 않는다.

#### TDD, 관찰 및 중단 조건

탐색 UI와 실제 브라우저 포커스가 대상이므로 TDD를 적용하지 않는다. `apps/notes/e2e/notes.spec.ts` 및 보조 화면의 기존 과업 검사에 모바일 너비의 Drawer 열기, 현재 화면 표시, 목적지 이동, `Escape` 및 바깥 닫기, 키보드 포커스 복귀를 더한다. 평상시 목록에서는 이전 새 메모 버튼 자리의 왼쪽 헤더 아이콘으로 열고 새 메모를 우측 하단에서 만들 수 있어야 한다. 수집 중에는 오른쪽 아이콘으로 열어도 패널이 왼쪽에서 나타나며, 닫은 뒤 왼쪽 뒤로가기와 클릭 횟수가 유지돼야 한다. 보조 화면도 왼쪽 출발이며 상세와 `/batch-copy`에서는 열기 제어가 없어야 한다.

실행 중 저장 목록에 항목을 추가해 준비한 수를 Drawer 링크의 보이는 `N개`와 접근 가능한 이름에서 확인하고, 링크로 이동한 관리 화면의 항목 수와 비교한다. 저장 목록이 비었거나 작업 초안이 진행 중이면 링크가 없으며, 우측 하단에는 중복 진입 링크가 없어야 한다. 실제 목록을 읽지 못한 상태에서 거짓 `0개` 링크를 보이지 않고 재시도 뒤 저장된 수가 나타나는지 확인한다.

움직임 줄이기 설정을 켜고 끈 상태에서 열기, 닫기, 뒤쪽 화면의 비활성 상태 및 포커스 복귀를 실제 브라우저로 확인한다. 움직임이 없어도 목적지 이동과 이탈 확인이 같아야 한다. 패널 출발 방향과 가림 상태는 화면을 직접 확인하고, 자동화에서는 CSS class, 내부 노드 수, 전환 시간의 숫자와 route 조건 함수 호출을 검사하지 않는다. Drawer를 열거나 닫을 때 헤더가 두 줄이 되거나 이동 전 확인을 우회하면 완료하지 않는다.

브라우저가 진입 또는 종료 전환을 완전히 지원하지 않으면 움직임의 일치 여부는 완료 조건에서 제외한다. Drawer를 즉시 열고 닫더라도 링크 실행, 배경 조작 차단과 포커스 복귀가 정상이라면 별도의 호환성 코드, fixture 또는 실행 스크립트를 만들지 않는다.

### U24 모바일 목록 메모의 복사와 상세 이동

#### 코드 변화와 적용 방식

- 수정: `apps/notes/src/_pages/notes/ui/mobile-note-card.tsx`에서 메모 본문의 `Link`를 복사 명령을 실행하는 의미 있는 제어로 바꾼다. 평상시와 일괄 복사 수집 상태 모두에서 메모별 복사 아이콘 버튼을 제거하고 수정 아이콘으로 상세에 이동하는 별도 링크 또는 버튼을 둔다. 카드 안에 대화형 제어를 중첩하지 않고 수정 제어의 활성화는 복사 및 수집 동작으로 전파되지 않게 한다.
- 수정: `apps/notes/src/_pages/notes/model/use-mobile-note-long-press.ts`의 앵커 전용 이벤트 타입과 짧은 누르기 처리 분기를 새 제어에 맞춘다. 평상시 click은 기존 `onCopy` 한 번, 유효한 길게 누르기도 `onCopy` 한 번 실행하고 뒤따르는 click은 억제한다. 스크롤, 카드 밖에서 놓기, `pointercancel`은 복사하지 않는다. 수집 중 click은 기존 `onAddToBatchCopy`만 실행하고 길게 누르기는 아무 결과도 만들지 않는다.
- 유지: 우측 하단 새 메모 아이콘과 모바일 하단 저장 목록 링크 제거는 U23에서 마친 상태를 사용한다. U23의 넓은 목록 하단 여백은 U30에서 제거하며, 이 절차에서는 헤더 제어와 생성 명령을 다시 작성하지 않는다.
- 추가 및 제거: 수정 아이콘이 공유 아이콘 집합에 없으면 `apps/notes/src/shared/ui/icons/`의 기존 모양 규칙에 맞춰 하나만 추가한다. 복사 아이콘은 넓은 메모와 다른 화면에서도 사용하므로 공용 정의는 삭제하지 않는다. 모바일 카드의 복사 버튼용 class와 상세 이동용 본문 링크만 제거한다. 헤더 새 메모 버튼용 코드는 U23에서 제거한다.

메모 카드 전체를 복사 버튼으로 감싸지 않고 원문 미리보기와 수정 제어를 형제 제어로 배치한다. 이는 기본 활성화, 길게 누르기, 수정 이동과 일괄 복사 수집을 상태별로 분리하는 구성이다. 저장 자료, Clipboard 실패 처리, 개별 복사 사용 횟수 및 일괄 복사 작업의 클릭 횟수를 새로 구현하지 않고 현재 명령을 재사용한다. 하단 제어의 간격은 특정 기기 수치로 고정하지 않고 safe area 및 실제 제어 크기로 계산한다.

#### TDD, 관찰 및 중단 조건

새 순수 도메인 규칙은 없고 Clipboard와 pointer event의 실제 조합이 중요하므로 TDD를 적용하지 않는다. `apps/notes/e2e/touch-interactions.spec.ts`, `notes.spec.ts`와 기존 Clipboard 과업 검사에서 실행 중 생성한 서로 다른 원문을 사용한다.

메모의 click과 키보드 활성화는 원문을 각각 한 번 복사하고 route를 유지한다. 수정 제어는 복사 횟수 증가 없이 그 원문의 상세로 이동한다. 유효한 길게 누르기는 한 번만 복사하고, 스크롤 및 취소는 복사하지 않는다. 수집 중에는 메모별 복사 아이콘 버튼이 접근성 트리와 화면에 없고, 같은 메모를 두 번 누르면 클립보드 내용과 개별 복사 횟수는 그대로인 채 초안에 두 항목이 생긴다. `/batch-copy` 확인 화면의 `일괄 복사하기` 버튼은 유지하며 현재 항목들을 순서대로 결합해 복사한다.

평상시 목록에서 우측 하단의 새 메모 제어와 마지막 메모, 수집 상태에서 하단 `초기화` 및 `다음`의 실제 viewport 관계와 화면 이미지를 확인한다. Drawer를 닫으면 저장 목록 링크와 항목 수가 메모 내용 위에 남지 않아야 한다. ID, 고정 원문, class, 타이머 호출 횟수와 특정 화면 좌표를 예상값으로 쓰지 않는다. 같은 입력이 복사와 상세 이동을 함께 실행하거나 생성 제어가 마지막 메모의 원문 또는 수정 동작을 사용할 수 없게 가리면 완료하지 않는다.

### U25 토스트 닫기 아이콘

#### 코드 변화와 적용 방식

- 수정: `apps/notes/src/shared/ui/action-toast/action-toast.tsx`에 오른쪽 끝의 `IconButton`과 기존 `CloseIcon`을 연결한다. 복사 완료, 삭제 취소 및 오류 토스트가 같은 닫기 동작을 사용하고 접근 가능한 이름으로 알림을 닫는다고 설명한다. 기존 `onDismiss`를 호출하되 실행 취소, 재시도 또는 Clipboard 명령을 대신 실행하지 않는다.
- 수정: `apps/notes/src/shared/ui/action-toast/use-action-toast-timer.ts`에서 수동 닫기 뒤 남은 타이머가 다음 알림을 잘못 닫지 않는지 확인하고 필요한 정리만 반영한다. `apps/notes/src/_pages/notes/ui/batch-copy-workspace.tsx`, `apps/notes/src/_pages/batch-copy/ui/mobile-batch-copy-confirmation.tsx`, `apps/notes/src/features/edit-batch-copy/ui/copy-batch-text-action.tsx`의 호출부는 실제로 필요한 전달값만 바꾸고 각 화면에 별도 닫기 버튼을 만들지 않는다.
- 제거: 닫기 버튼이 없다는 이전 검증문과 토스트마다 서로 다른 닫기 분기를 제거한다. `StatusNotice`와 입력 근처의 지속 오류 상태는 토스트가 아니므로 이 절차에서 닫기 동작으로 바꾸지 않는다.

토스트 표시와 닫기를 분리한다. 새 결과가 기존 한 건을 대체하고 표시 시간이 다시 시작되는 동작, 실행 취소 알림의 5초 기한과 hover 및 `focus-within` 일시 정지, 포커스를 강제로 옮기지 않는 동작은 유지한다. 닫기에 포커스가 있는 동안 토스트가 사라지면 현재 과업의 실행 제어로 포커스가 돌아갈 수 있게 한다.

#### TDD, 관찰 및 중단 조건

새 순수 규칙을 만들지 않으므로 TDD를 적용하지 않는다. 기존 토스트 browser 검사에 실제 복사 성공, Clipboard 실패와 삭제 후 `실행 취소` 사례를 추가한다.

각 토스트의 오른쪽 닫기 아이콘을 접근 가능한 이름으로 실행하면 알림만 사라지고 Clipboard에 복사된 원문, 삭제된 메모 및 실행 취소 이력은 수행한 동작대로 남아야 한다. 새 토스트는 정해진 시간 동안 보이고 표시만으로 현재 포커스를 가져가지 않아야 한다. 동작 버튼에 포커스가 있으면 기존 시간 정지가 유지되는지 확인한다.

자동 종료 뒤 다음 토스트가 이전 타이머 때문에 일찍 사라지거나 닫기와 `실행 취소`가 함께 실행되면 완료하지 않는다. SVG path, 내부 타이머 수와 hook 호출 횟수는 검사하지 않는다.

U22부터 U25까지 마친 뒤 `pnpm notes:typecheck`, `pnpm notes:lint`, `pnpm notes:test`, `pnpm --filter notes-app test:browser`, 관련 Playwright 과업 및 `pnpm notes:build`를 실행한다. 이 검사는 문서 작성 시점에는 실행 완료로 표시하지 않는다. 마지막 한 차례에 실제 Android 브라우저, 좁은 보조 화면, 320 CSS px와 글자 확대 화면의 탐색, 우측 하단 제어, 토스트 및 브라우저 표시 영역 변화를 함께 검토한다. U14와 U18의 좁은 화면 탐색은 U23의 Drawer가 실제로 동작하고 해당 보조 화면에서 확인된 뒤에만 완료로 판정한다. 화면 구성 분리와 함께 보호하던 자료 및 화면 이동 확인이 한 가지라도 약해지면 전체 UI 재구축을 완료로 판정하지 않는다.

## 메모 선택 표시와 캔버스 시점 보완

[메모 선택 표시, 보기 제어와 캔버스 확대 조사](references/canvas-focus-controls-and-zoom-research.md)는 첨부 화면과 현재 코드, 독립된 Chromium 실행 및 상용 캔버스의 공식 안내를 대조한다. U26부터 U28까지의 코드 변경과 자동 브라우저 검사를 마쳤다. 강제 색상 표시와 실제 터치패드 입력은 직접 확인 전이다. 메모의 저장 좌표, 내용, 생성 순서, 자동 저장과 모바일 목록은 바꾸지 않는다. 새 메모의 붉은 가로선과 사라진 보기 제어는 각각 본문 포커스 표시와 숨은 캔버스 스크롤에서 발생했다. 선택 표시나 포커스 자체를 없애는 방식으로 해결하지 않는다.

세 절차에서는 메모 자료와 화면 시점을 서로 다른 구성요소가 관리한다. `NotesCollection`은 메모 자료, 생성, 삭제와 복원 및 포커스를 요청하는 사용자 과업을 맡고 시점 상태를 갖지 않는다. `NotesBoard`는 넓은 화면의 배치와 `NoteCard` 목록, 메모 표시 영역과 보기 제어를 조합한다. 기존 `NoteCard`는 한 메모의 선택, 본문 편집, 이동과 크기 조절을 그대로 맡는다.

U27에서 분리할 `NotesBoardControls`는 보드 왼쪽 아래의 버튼과 배율만 표시하고 메모 자료나 자체 시점 상태를 갖지 않는다. `useNotesBoardView`는 브라우저 입력, 요소 측정과 단일 시점 상태를 맡고, 새 `board-view.ts`는 화면 시점에 관한 순수 계산만 맡는다. 두 새 파일은 메모 화면 안에서만 쓰므로 `_pages/notes` 안에 두며 `entities/note`, `features` 또는 `shared/ui`로 올리지 않는다. 이는 [React의 중복 상태 방지 지침](https://react.dev/learn/choosing-the-state-structure)과 [FSD의 계층 구분](https://feature-sliced.design/docs/reference/layers)에 맞춘 책임 배치다. `NotesBoardControls`는 기존 `shared/ui/IconButton`을 조합하되 그 구현을 복제하지 않는다.

메모에 포커스가 생기면 `NoteCard`가 기존 포커스 처리 자리에서 메모 ID를 `NotesBoard`에 알리고, 보드 hook이 현재 메모 geometry와 실제 표시 영역을 읽어 필요한 경우에만 시점을 바꾼다. 새 메모 생성, hash 이동, 삭제 뒤 다음 메모, 실행 취소 뒤 복원한 메모와 자연스러운 `Tab` 이동에도 이 처리를 사용한다. 프로그램이 직접 포커스를 줄 때에는 브라우저의 숨은 스크롤을 막는다. 표시 영역 밖 메모를 드러내는 계산을 생성 명령이나 각 카드 안에 반복하지 않는다. 화면 시점과 저장 geometry는 서로 다른 값이며, 보기 제어 분리는 캔버스의 세로 길이 또는 메모 위치를 제한한다는 뜻이 아니다.

### U26 새 메모의 선택과 본문 포커스 표시

#### 변경 전 확인과 구성요소 책임

`apps/notes/src/_pages/notes/ui/note-card.tsx`의 선택 `::after`는 메모 바깥의 붉은 외곽선을, `textarea:focus-visible`은 본문 안쪽의 붉은 윤곽선을 그린다. 새 메모 생성 후 본문 자동 포커스 때문에 두 선이 동시에 나타난다. U19에서 헤더의 별도 배경과 구분선은 이미 제거했으며, 이 작업에서 다시 추가하지 않는다. 요구사항에는 새 메모만의 붉은 선 두 개를 표시하라는 규칙이 없다. 선택과 키보드 포커스를 구분하라는 규칙은 유지한다.

`NoteCard` 하나가 메모의 흰 표면, 헤더, 본문, 선택선과 포커스 표시를 구성한다. 선택은 이미 받은 `selected`에서, 포커스는 실제 메모 선택 지점 또는 본문 입력에서 얻는다. 이 절차에서 `NoteHeader`, `NoteBody`, 새 카드 wrapper나 새 선택 상태를 만들지 않는다. 포커스 표시의 위치가 달라져도 본문 입력 값과 자동 저장은 `useNoteCardEditor`가 계속 담당한다.

#### 작업 순서와 코드 변화

1. 수정: `note-card.tsx`에서 선택된 카드의 붉은 네 변을 기존 최상위 `::after` 한 곳에서만 그린다. `textarea`의 안쪽 `focus-visible` 윤곽선은 제거하고, 키보드로 본문에 도달했을 때는 헤더와 본문 사이를 가르지 않는 메모 바깥쪽 포커스 표시를 준다. 메모 선택 지점의 기존 `focus-visible`과 본문 포커스가 동시에 표시될 때의 우선순위를 같은 카드 표현에서 정한다. 선택선과 키보드 포커스는 색뿐 아니라 선 위치 또는 형태로 구별하고 `forced-colors`에서도 확인한다.
2. 조건부 수정 및 제거: `use-note-card-editor.ts`의 `pointerFocused`, `pointerFocusPending`, `markPointerFocus`, `settleFocus`는 pointer 포커스에서 키보드 전용 표시를 숨기는 데 계속 필요하면 유지한다. CSS의 실제 포커스 판정만으로 pointer 입력에서 표시가 숨겨지고 키보드 입력에서는 보인다는 점을 확인하면 이 state, ref, handler와 `note-card.tsx`의 연결을 함께 제거한다. React Hook Form 등록, 본문 자동 포커스, 저장과 실패 복구는 수정하지 않는다.
3. 제거하지 않을 코드: 카드 기본 테두리, 선택 `::after`, 본문 textarea, 헤더 동작과 `apps/notes/src/_app/styles/tokens.css`의 공용 focus 및 selection 토큰은 유지한다. 헤더 배경, 구분선, 두 번째 선택 사각형, 전용 색상값과 장식용 선은 추가하지 않는다. 기존 표현을 고치는 절차이므로 새 구성요소 파일도 만들지 않는다.

#### 테스트와 완료 조건

새 자료 규칙은 없으므로 TDD를 적용하지 않는다. `apps/notes/e2e/notes.spec.ts`의 기존 생성, 선택 해제, `Tab` 탐색 및 본문 편집 사례를 먼저 활용한다. 빈 메모 생성 뒤 본문에 바로 입력할 수 있고, 선택된 메모와 포커스가 있는 본문을 구별하며, `Escape` 또는 빈 캔버스 클릭으로 선택만 사라지는지 실제 화면에서 확인한다. `Tab`으로 본문에 도달한 경우와 강제 색상 화면에서도 포커스가 보여야 한다. CSS class, `::after`의 내부 스타일, hook state와 고정 screenshot 차이를 자동 검증의 예상값으로 삼지 않는다. 마지막 시각 확인에서 헤더와 본문 사이에 붉은 가로선이 남거나 포커스를 잃으면 완료하지 않는다.

### U27 화면 밖 새 메모와 왼쪽 아래 보기 제어

#### 변경 전 확인과 구성요소 책임

`notes-board.tsx`는 보기 제어를 `overflow-hidden` viewport 안에 둔다. `use-notes-collection-interactions.ts`가 새 메모 본문에 기본 `focus()`를 주면 화면 밖 메모를 보이게 하려고 브라우저가 viewport를 스크롤한다. 1280×900 CSS px의 독립된 Chromium 실행에서 다섯 번째 메모 생성 직후 viewport `scrollLeft`가 818px이 되고, 보기 제어의 왼쪽 좌표가 -806px이 되는 상황을 재현했다. 기존 `use-notes-board-view.ts`의 `resetViewportScroll`은 보기 제어가 포커스를 받을 때만 실행돼 새 메모 포커스에는 적용되지 않는다.

`NotesBoard`는 높이를 새로 정하지 않고 지금의 `h-full min-h-0` 영역 안에 메모 표시 영역과 제어를 겹쳐 배치한다. `NotesBoardControls`는 이 영역의 왼쪽 아래에 놓는 화면 요소이지 문서 맨 아래에 놓는 footer가 아니다. 메모 표시 영역은 이동, 크기 조절과 키보드 포커스 대상만 포함한다. 제어의 버튼은 `NotesBoard`에서 받은 이동, 확대와 축소, 모두 보기 동작만 실행한다. 제어의 배율 문구는 hook의 현재 배율에서 계산해 전달한다. 별도 제어 state, context, provider나 범용 프레임을 만들지 않는다.

#### 작업 순서와 코드 변화

1. 생성 및 이동: `apps/notes/src/_pages/notes/ui/notes-board-controls.tsx`를 메모 화면 전용 표시 구성요소로 만든다. `notes-board.tsx`에서 기존 `role="group"` 제어 블록과 방향, 확대, 축소, 모두 보기 버튼 및 접근 가능한 이름을 이 파일로 옮긴다. 고정 이동량과 버튼 배율 간격은 제어 동작의 한 곳에 둔다. `NotesBoard`는 현재 배율 문구, `moveView`, `adjustScale`, `fitAllNotes` 명령과 제어 요소를 측정할 ref만 한 단계 아래로 전달한다. 제어는 받은 명령을 실행할 뿐 시점 계산을 하지 않고, 보드에는 버튼 JSX를 중복으로 남기지 않는다. 제어의 기준점은 화면 전체가 아니라 `NotesBoard` 바깥 요소의 왼쪽 아래다.
2. 수정: `notes-board.tsx`의 기존 한 요소를 비스크롤 배치 요소와 그 안의 메모 표시 영역으로 나눈다. `viewportRef`, `boardRef`, 메모 카드와 pan의 pointer handler 및 U28의 wheel 입력은 메모 표시 영역에 연결한다. `NotesBoardControls`는 그 형제 요소로 렌더링하며 pan 시작 영역으로 취급하지 않는다. 메모 표시 영역과 `notes-collection.tsx`의 기존 `overflow-hidden`, 상위 `batch-copy-workspace.tsx`의 `main` 및 메모 작업 `section`에서 포커스로 숨은 스크롤이 생기는 부분은 명시적인 메모 드러내기 동작과 함께 비스크롤 clipping으로 바꾼다. 오른쪽 패널 자체와 모바일 `MobileNoteList`의 독립된 스크롤은 바꾸지 않는다. [CSS overflow 설명](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow)에 따르면 `hidden`은 포커스로 스크롤할 수 있지만 `clip`은 그럴 수 없으므로, clipping 변경만 먼저 적용하지 않는다.
3. 생성 및 이동: `apps/notes/src/_pages/notes/model/board-view.ts`에 시점의 타입, 초기 시점, 메모 외곽, 전체 맞춤과 화면 밖 메모를 드러내는 계산을 둔다. 같은 순수 계산을 `use-notes-board-view.ts` 안에 복제하지 않고 현재 `initialBoardView`, `noteBounds` 및 `fitAllNotes`의 숫자 계산을 이 파일로 옮긴다. 메모가 이미 보이고 제어에도 가리지 않으면 시점을 유지하며, 보이는 영역 밖이거나 제어에 가리면 실제 viewport와 제어의 크기를 기준으로 필요한 만큼만 이동한다. 메모가 표시 영역보다 크면 메모 전체를 억지로 축소하거나 저장 크기를 바꾸지 않고 포커스 대상이 있는 윗부분을 보이게 한다. `NOTE_CANVAS_SIZE`로 만드는 기존 초기 보드 크기는 이 절차에서 화면 세로 제한으로 재해석하거나 키우지 않는다. 순수 계산은 저장 좌표, 크기와 zIndex를 반환하거나 수정하지 않는다.
4. 수정: `use-notes-board-view.ts`는 한 `view` state와 기존 pan 상태를 유지한다. 같은 hook에서 반환한 `viewportRef`와 제어 요소 ref를 `NotesBoard`가 각 형제 요소에 연결하면, hook은 두 요소의 실제 위치와 크기를 읽어 순수 계산을 호출한다. `note-card.tsx`의 기존 최상위 `onFocus`가 메모 ID를 `NotesBoard`에 알리도록 연결하되, 현재의 `Tab` 선택은 메모 최상위 요소에 포커스가 왔을 때만 실행한다. 본문과 헤더 버튼에 포커스가 왔다는 이유로 선택이나 속성 패널을 다시 열지 않는다. 부모의 생성, hash와 삭제 복원 명령은 카메라를 직접 수정하지 않고, 보드가 받은 포커스 메모만 필요 시 드러낸다. `focusedNoteId`가 바뀌었을 때도 같은 계산을 써서 화면 이동 후 hash 탐색이 동작하게 한다.
5. 수정 및 제거: `use-notes-collection-interactions.ts`의 생성 본문과 hash 메모 포커스, `notes-collection.tsx`의 삭제 후 다음 메모 및 실행 취소 뒤 복원 메모 포커스에는 `preventScroll`을 사용한다. `notes-collection.tsx`에서 hash 변경마다 `NotesBoard`를 재생성하는 `key`를 제거하고 보드가 `focusedNoteId` 변경을 처리하게 한다. 마지막 메모 삭제 뒤 `새 메모` 버튼으로 가는 동작은 유지한다. 제어가 포커스될 때 숨은 스크롤을 되돌리는 `onFocusCapture`와 `resetViewportScroll`, 위치 보정을 위한 추가 state 또는 ref는 동작 대체가 확인된 뒤 제거한다. 전체 맞춤, 방향 이동, 생성 직후 편집, hash 링크, 삭제 뒤 포커스와 모바일 목록은 그대로 남아야 한다.

#### 테스트와 완료 조건

순수 시점 계산은 `apps/notes/src/_pages/notes/model/board-view.test.ts`에 입력과 예상 화면 위치를 먼저 적어 TDD로 작성한다. 메모가 이미 보이면 화면 위치가 불필요하게 바뀌지 않는 경우, 보이는 영역 밖에 있거나 제어에 가린 경우, 메모가 표시 영역보다 큰 경우와 저장 좌표 불변을 서로 다른 입력으로 검사한다. 포커스 event, 자동 내부 스크롤, 화면 크기 변화와 제어의 위치는 TDD 대상이 아니며 실제 브라우저에서 확인한다.

`apps/notes/e2e/notes.spec.ts`에는 화면 너비와 실제 메모 배치를 사용해 새 메모가 보이는 영역 밖에 생길 때까지 사용자 버튼으로 추가한 뒤, 새 본문에 입력할 수 있고 `캔버스 보기`와 각 제어가 여전히 화면 안에 있으며 동작하는 사례를 둔다. 정확히 다섯 번째 메모, 고정된 note ID, CSS class, 특정 `scrollLeft` 값은 예상값으로 쓰지 않는다. 시점 이동, 확대, 모두 보기, 화면 밖 메모로의 `Tab` 및 `Shift+Tab` 탐색, hash 이동, 삭제와 복원 뒤 포커스도 확인한다. 오른쪽 패널이 열렸을 때와 모바일 목록에서 독립된 스크롤도 유지돼야 한다. 포커스를 받은 메모가 가려지거나 보기 제어가 사라지면 완료하지 않는다.

### U28 터치패드 핀치와 키보드 및 마우스 확대

#### 입력 선택과 구성요소 책임

[Figma 확대 안내](https://help.figma.com/hc/en-us/articles/360041065034-Adjust-your-zoom-and-view-options)는 핀치와 `Command`/`Ctrl`+휠을 함께 설명하고, [Miro 입력 안내](https://help.miro.com/hc/en-us/articles/360017731053-Using-Miro-with-a-mouse-trackpad-or-touchscreen)는 휠 확대를 입력 모드에 따라 다르게 사용한다. 이 애플리케이션은 메모 본문의 일반 스크롤과 브라우저 확대를 유지해야 하므로, 넓은 캔버스 안에서만 터치패드 핀치와 Mac `Command` 또는 Windows `Ctrl`+휠을 같은 확대 입력으로 처리하는 안을 채택한다. 기본 휠을 확대 입력으로 바꾸거나 브라우저 전체의 확대 단축키를 가로채지 않는다. 현재 확대, 축소 및 모두 보기 버튼은 키보드 사용자가 그대로 이용할 수 있는 대안이다.

`NotesBoardControls`는 확대와 축소 클릭을 전달하고 배율만 보여준다. `NotesBoard`는 메모 표시 영역의 ref를 연결할 뿐 휠 event를 해석하지 않는다. `useNotesBoardView`는 버튼과 wheel 입력을 기존 단일 `view` state에 연결하고 구독 수명을 관리한다. `board-view.ts`는 입력 장치에 관해 알지 못하며 기준 화면 좌표 아래에 같은 캔버스 지점이 남도록 시점만 계산한다. `NoteCard`의 크기 조절과 저장은 이 절차의 책임이 아니다. 이는 [React Effect의 외부 event 구독 지침](https://react.dev/reference/react/useEffect)과 [wheel event의 취소 가능성 설명](https://developer.mozilla.org/en-US/docs/Web/API/Element/wheel_event)에 따른 분리다.

#### 작업 순서와 코드 변화

1. 수정: U27에서 만든 `board-view.ts`에 현재 시점, 다음 배율과 기준 화면 좌표를 받아 확대 전후 같은 메모 지점이 같은 화면 위치에 남는 순수 계산을 추가한다. 기존 버튼과 휠은 이 계산 하나와 공통 최소 및 최대 배율을 사용한다. 모두 보기를 실행해 수동 축소 하한보다 작은 배율이 된 경우 축소 입력이 배율을 오히려 키우지 않는 기존 동작도 유지한다. 시점의 `originX`, `originY`, `x`, `y`, `scale` 가운데 필요한 값만 갱신하고 메모 geometry와 저장 자료는 반환하거나 수정하지 않는다.
2. 수정: `use-notes-board-view.ts`의 버튼용 `adjustScale`은 기존 값 더하기 계산을 버리고 화면 표시 영역의 중심을 기준으로 위 전이를 호출한다. 같은 hook이 메모 표시 영역의 native `wheel`을 `{ passive: false }`로 구독하고 정리한다. `ctrlKey` 또는 `metaKey`가 참인 event만 확대 후보로 해석하고, `deltaMode`가 픽셀, 줄 또는 페이지인지 반영해 배율 변화를 계산한다. event가 취소 가능하지 않으면 캔버스 확대와 기본 확대가 겹치지 않게 이 입력을 처리하지 않는다. 입력별 별도 state, 전역 listener와 기기 종류 판별은 두지 않는다.
3. 수정: `notes-board.tsx`는 U27의 메모 표시 영역 ref를 같은 hook의 wheel 구독 대상으로 사용한다. `notes-board-controls.tsx`의 확대와 축소 버튼은 U27에서 옮긴 그대로 hook 명령을 호출하고, 수치 표시는 `view.scale`에서 파생한다. `fitAllNotes`, 방향 이동과 드래그는 같은 시점 state를 사용한다. `note-card.tsx`, `entities/note`의 geometry, IndexedDB schema, 모바일 목록, 오른쪽 패널의 스크롤과 브라우저 전체 확대 단축키는 바꾸지 않는다.
4. 제거: 공통 계산으로 대체된 기존 `adjustScale`의 배율 덧셈 및 clamp 분기만 제거한다. 버튼용 확대와 휠용 확대가 서로 다른 좌표 변환을 갖지 않게 한다. 일반 휠 및 본문 textarea 스크롤 동작, 기존 확대와 축소 버튼 및 모두 보기 동작은 제거하지 않는다. 새 UI 구성요소, gesture 라이브러리, 브라우저별 fixture와 테스트 전용 event 발생기는 만들지 않는다.

#### 테스트와 완료 조건

새 순수 시점 전이는 U27의 `board-view.test.ts`에 실패하는 동작부터 추가해 TDD를 적용한다. 유효한 화면 크기, 메모 좌표와 확대 입력을 생성해 기준 화면 좌표 아래 메모 지점이 확대 전후 같은 화면 좌표에 나타나는지, 최소 및 최대 배율을 넘지 않는지, 저장 geometry가 바뀌지 않는지 검사한다. 기준점으로 표시 영역 중심과 포인터 위치를 모두 사용하되 예상값을 운영 함수로 다시 계산하거나 한 가지 고정 좌표만 검사하지 않는다.

실제 입력 연결은 `apps/notes/e2e/notes.spec.ts`에서 캔버스 안의 보조키+휠, 기존 확대와 축소 버튼, 일반 휠과 본문 스크롤을 비교한다. 메모의 화면 크기와 숫자 배율은 변하고 본문과 저장된 위치는 그대로여야 한다. 실제 노트북 터치패드 핀치는 Chromium, Firefox와 WebKit에서 마지막에 직접 확인한다. 어느 브라우저가 gesture event를 전달하지 않거나 취소할 수 없다면 그 브라우저에서 확인한 동작을 기록하고 기존 확대와 축소 버튼을 유지한다. 전달 또는 취소 여부를 확인하지 않은 브라우저를 위해 별도 우회 코드나 테스트 전용 제스처 발생기를 추가하지 않는다.

U26, U27, U28은 순서대로 진행한다. U26은 기존 카드 표현을 고친 뒤 추가 파일 없이 완료 여부를 판정한다. U27은 제어 분리와 명시적인 포커스 시점 이동을 한 절차로 묶어 `clip`만 적용한 채 키보드 접근을 잃는 중간 상태를 완료로 표시하지 않는다. U28은 U27의 시점 계산을 확장하며 별도의 확대 state를 만들지 않는다.

각 절차를 시작하기 전 위 코드의 추가, 수정, 제거 대상과 현재 사용자 동작을 다시 확인하고 완료 뒤 진행 상태를 이 절에 기록한다. 코드 변경 뒤 마지막 한 번의 검토에서 메모 선택과 포커스 표시, 화면 밖 메모 생성, 왼쪽 아래 보기 제어와 실제 터치패드 확대를 함께 판정한다. 현재 이 세 절차의 구현과 검증은 완료되지 않았다.

진행 상태:

- U26: 본문 안쪽 포커스 선을 없애고 메모 바깥 표시 한 곳으로 옮겼다. 포인터 입력만 구분하던 편집기 상태와 이벤트 연결도 제거했다. Chromium에서 새 메모의 본문 자동 포커스는 점선 외곽 한 겹, 다른 메모의 선택은 실선 외곽 한 겹으로 보였다. 헤더와 본문 사이에는 붉은 선이 없었고 본문 자체의 CSS 윤곽선도 표시되지 않았다.
- U27: 보기 제어를 메모 표시 영역 밖으로 옮겼다. 화면 밖 메모가 포커스를 받으면 순수 시점 계산이 메모를 드러낸다. 자동 내부 스크롤, 보드 재생성 키와 숨은 스크롤 복구 처리는 제거하고 모바일 목록과 오른쪽 패널의 독립 스크롤은 유지했다. Chromium, Firefox 및 WebKit에서 화면 밖 새 메모의 편집기와 보기 제어를 함께 표시하고 가장 최근에 연 오른쪽 패널만 남기는 검사가 통과했다.
- U28: 버튼과 보조키 휠을 같은 기준점 확대 계산에 연결하고 일반 휠을 가로채지 않는 캔버스 영역의 listener를 추가했다. Chromium, Firefox 및 WebKit에서 보조키 휠은 메모를 확대하고 일반 휠은 배율을 바꾸지 않았다. 강제 색상 표시와 실제 터치패드 핀치는 직접 확인하지 못했으며, 터치패드 입력을 전달하지 않는 브라우저를 가정한 우회 코드는 추가하지 않았다.

최종 자동 검사에서 타입 검사, lint, 단위 테스트 199개, Browser Mode 51개, 메모 화면 Playwright 72개와 운영용 빌드가 통과했다. 전체 Playwright 완료 판정은 보류한다. U12에서 교체하기로 한 `notes-selection-model.spec.ts`가 포커스 점선도 선택 테두리로 읽는 기존 검사 때문에 정상 탐색에서 실패한다. 포커스 표시를 숨기거나 선택 동작을 바꿔 이 검사를 통과시키지 않는다.

## 좁은 목록의 카드 높이와 새 메모 제어

[모바일 메모 목록 높이와 새 메모 제어 조사](references/mobile-note-list-sizing-and-action-overlay.md)는 짧은 화면에서 자동 Grid 행이 카드를 눌러 담는 현상과 목록의 고정 `7rem` 하단 여백을 분리해 확인했다. [좁은 화면 메모 표현 결정](decisions/responsive-note-presentation.md#48rem-미만의-목록과-상세-화면)의 내용별 카드 높이와 우측 하단 버튼을 유지하며, U23과 U24에서 남은 하단 배치는 U30이, U23의 생성 후 상세 이동은 U31이 대체한다. 변경 전에는 `MobileNoteList`의 실제 스크롤 책임, `MobileNoteCard`의 미리보기 상한과 수정 동작, `MobileNotesWorkspace`의 버튼 배치 및 수집 상태 분기를 다시 확인한다.

### U29 압축되지 않는 모바일 메모 목록

#### 코드 변화와 적용 방식

- 수정: `apps/notes/src/_pages/notes/ui/mobile-note-list.tsx`에서 고정 높이 안에 자동 Grid 행을 분배하는 배치를 한 방향의 세로 Flex 목록으로 바꾼다. 목록의 화면 높이, 상단 헤더 아래 시작점, 카드 간격과 자체 세로 스크롤은 유지한다. 이 단계에서는 하단 여백을 바꾸지 않아 카드 압축 제거만 독립적으로 확인한다.
- 수정: `apps/notes/src/_pages/notes/ui/mobile-note-card.tsx`의 바깥 카드가 Flex 항목으로서 줄어들지 않게 한다. 본문 버튼의 내용별 높이, `12rem` 상한, 수정 링크의 우측 상단 배치와 넘치는 원문을 가리는 미리보기는 유지한다. 모든 카드에 같은 고정 높이를 주거나 본문을 줄 수로 강제 절단하지 않는다.
- 추가 및 제거: 새 컴포넌트, 크기 측정 hook과 자료 상태는 추가하지 않는다. 목록에서 자동 Grid 행 크기를 만드는 class만 제거하고 카드 내용 및 본문 복사와 상세 이동 명령은 다시 작성하지 않는다.

한 축으로 쌓인 항목의 크기를 내용이 결정하게 하는 Flex 구성과 항목의 축소 금지를 함께 적용한다. 높이 상한으로 원문이 잘리는 경우와 화면 높이에 맞춰 카드 자체가 잘리는 경우를 구분하며, 뒤의 현상만 없앤다. 좁은 화면의 목록 외에 공간형 보드, 상세 화면과 저장 geometry는 바꾸지 않는다.

#### TDD, 관찰 및 중단 조건

CSS 배치와 실제 화면 높이가 결정하는 동작이므로 TDD를 적용하지 않는다. `apps/notes/e2e/mobile-navigation.spec.ts`의 기존 메모 생성 과업을 사용해 서로 다른 길이의 원문을 실행 중 생성하고, 화면 너비는 유지한 채 높이를 바꾼다. 미리보기 높이 상한에 닿지 않는 원문은 마지막 줄과 수정 동작이 카드 안에 남고, 화면에 모두 들어가지 않는 카드들은 카드 높이 축소 대신 목록 스크롤로 접근할 수 있어야 한다. 원문이 상한을 넘는 메모는 미리보기에서만 잘리고 상세에서 전체를 확인한다. 기대 결과는 생성한 원문과 보이는 카드 위치에서 얻으며 Grid, Flex class 또는 내부 행 수를 테스트하지 않는다. 카드가 내용보다 낮아지거나 스크롤할 수 없는 원문이 생기면 U30을 시작하지 않는다.

진행 상태: U29에서 목록을 세로 Flex로 바꾸고 메모 카드를 축소되지 않는 항목으로 설정했다. Chromium에서 여러 메모를 만든 뒤 화면 높이를 절반으로 줄여도 첫 카드의 높이가 유지되고 마지막 카드와 수정 링크까지 스크롤할 수 있음을 확인했다. 하단 여백과 새 메모 생성 뒤 이동은 아직 이전 동작이다.

### U30 목록 상태별 하단 배치

#### 코드 변화와 적용 방식

- 수정 및 제거: `apps/notes/src/_pages/notes/ui/mobile-note-list.tsx`에서 모든 상태에 적용된 `pb-28`과 부모 높이를 다시 강제하는 `h-full`을 제거한다. U29의 축소되지 않는 세로 목록을 유지하면서 목록 자신만 스크롤하도록 `min-h-0`, 남은 높이를 쓰는 flex 항목과 상단 헤더 아래 시작 간격을 연결한다. 평상시에는 수집 상태의 작업 영역 높이를 목록 padding으로 예약하지 않는다. 수집 상태에도 이전 하단 영역 높이를 추정한 padding을 되살리지 않는다.
- 수정: `apps/notes/src/_pages/notes/ui/mobile-notes-workspace.tsx`의 화면 내부만 세로 Flex 배치로 바꾼다. 기존 헤더는 상단에 유지하고 목록을 남은 높이에서 스크롤하게 한다. `collecting`일 때만 현재 `초기화`와 `다음` 마크업을 목록 다음의 축소되지 않는 하단 영역으로 옮기고, 그 영역 자체에 safe area를 반영한다. 평상시에는 하단 영역을 렌더링하지 않는다. 목록 끝이 항상 실제 영역 위에서 멈추므로 높이를 재는 state, 절대 배치 하단 영역과 크기 맞춤 spacer를 제거한다.
- 유지: 평상시 새 메모 버튼은 목록과 형제인 절대 배치 요소로 두고 우측 하단 위치, 생성 중 disabled 상태와 수집 중 비표시를 유지한다. 기존 `--notes-mobile-action-size`와 `--notes-mobile-action-inset`을 재사용하고 버튼을 목록 마지막 항목이나 별도 하단 행으로 넣지 않는다. 생성 뒤 이동은 U31에서 변경하므로 이 절차에서 생성 명령을 수정하지 않는다.
- 유지 및 조정: `mobile-note-card.tsx`의 내용별 높이, 본문 우측 간격과 우측 상단 수정 링크를 먼저 그대로 둔다. 평상시 목록 끝에서 떠 있는 버튼이 마지막 원문이나 수정 링크를 실제로 가리면 평상시의 마지막 항목 접근에 필요한 간격만 조정한다. 수집 상태의 하단 영역과 같은 padding 또는 margin을 공유하지 않는다. 항목 수, 화면 높이 또는 버튼 위치를 React state로 복제하지 않는다.

버튼이 카드 표면 위에 겹치는 것은 허용한다. 다만 목록 끝에서 마지막 카드의 원문, 수정 링크와 키보드 포커스가 버튼 뒤에 숨거나 누를 수 없는 상태는 허용하지 않는다. 수집 상태의 하단 영역은 목록과 나란한 실제 화면 요소이므로 그 높이를 빈 스크롤 여백으로 복제하지 않는다. 카드 높이를 늘려 빈 화면을 채우거나 버튼을 목록의 마지막 항목으로 넣지 않는다.

#### TDD, 관찰 및 중단 조건

위치와 겹침의 브라우저 결과가 대상이므로 TDD를 적용하지 않는다. `apps/notes/e2e/mobile-navigation.spec.ts`의 목록 끝 검사에 메모가 없는 평상시, 한 개만 있는 평상시, 목록을 넘는 평상시와 같은 긴 목록의 수집 상태를 나눠 포함한다. 평상시에는 새 메모 버튼이 화면 우측 하단에 남고 마지막 메모의 본문 복사와 수정 이동이 가능해야 한다. 수집 상태에는 버튼이 없고 `초기화`와 `다음`이 화면 아래에 남으며 마지막 메모가 하단 영역 위까지 스크롤돼야 한다. 상태를 끝낸 뒤에는 수집 상태의 큰 하단 여백이 보이지 않아야 한다. 생성한 원문과 화면에 보이는 조작을 확인하고 CSS class, 목록의 자식 수 또는 정확한 화면 좌표를 예상값으로 고정하지 않는다.

자동 검사와 별도로 실제 모바일 브라우저에서 도구 모음의 표시 및 접힘, safe area와 글자 확대를 확인한다. 카드와 버튼 사이의 빈 곳이 단순히 카드 수보다 화면이 긴 결과인지, 별도 높이 예약인지 구분해 화면 이미지를 확인한다. 평상시 마지막 수정 링크가 버튼에 가리거나, 수집 중 마지막 카드가 하단 작업 영역에 가리거나, 버튼을 누르기 위해 메모 목록의 높이를 다시 줄여야 한다면 완료하지 않는다. 두 상태에 같은 하단 padding 또는 margin이 남아 있어도 완료하지 않는다. U29와 U30을 마친 뒤 기존 메모 복사, 상세 저장, Drawer와 일괄 복사 수집 동작을 함께 확인한다.

진행 상태: U30에서 목록의 공통 하단 여백과 중복 높이 지정을 제거했다. 헤더, 스크롤 목록, 수집 중에만 보이는 하단 동작 영역을 세로 Flex 안에 배치하고 평상시 새 메모 버튼은 목록 위에 떠 있게 두었다. Chromium, Firefox 및 WebKit에서 빈 목록과 한 개 목록의 버튼 위치, 마지막 메모의 복사 및 수정 동작, 수집 중 마지막 메모 추가와 하단 `초기화` 및 `다음` 접근을 확인했다. 실제 모바일 브라우저의 도구 모음과 safe area 확인은 남아 있다.

### U31 모바일 새 메모 생성 뒤 목록 유지

#### 코드 변화와 적용 방식

- 수정: `apps/notes/src/_pages/notes/model/use-notes-collection-interactions.ts`의 `createNewNote`에서 저장, 진행 상태와 실패 알림은 한 흐름으로 유지하고, 성공 뒤 대상 화면에만 필요한 동작을 분리한다. 넓은 화면 생성은 현재처럼 새 메모를 선택하고 본문 편집기로 포커스를 옮긴다. 모바일 생성은 같은 저장 명령을 사용하지만 숨겨진 보드 편집기로 포커스를 옮기거나 상세 이동을 요청하지 않는다. 두 생성 함수에 같은 저장 및 오류 처리를 복사하지 않는다.
- 수정: `apps/notes/src/_pages/notes/ui/notes-collection.tsx`는 넓은 화면 생성 버튼에 기존 편집 시작 동작을, `MobileNotesWorkspace`에는 목록에 남는 생성 동작을 각각 전달한다. 저장된 메모의 생성 순서, geometry, 생성 중 disabled 상태와 실패 알림은 바꾸지 않는다. 새 route, 별도 생성 state와 모바일 전용 저장소 명령은 추가하지 않는다.
- 수정 및 제거: `apps/notes/src/_pages/notes/ui/mobile-notes-workspace.tsx`에서 `createAndOpenNote`의 생성 성공 후 `router.push` 분기와 새 메모 ID를 주소로 바꾸는 코드를 제거한다. 이 파일의 `router`는 일괄 복사 확인 화면 이동에 계속 필요하므로 import 자체는 유지한다. 버튼은 성공 뒤에도 평상시 목록에 남고, 실패하면 기존 알림을 표시한다. `mobile-note-card.tsx`의 수정 링크는 유일한 새 메모 상세 진입 동작으로 유지한다.
- 수정: `apps/notes/e2e/support/create-note-through-ui.ts`의 모바일 도우미는 새 메모 클릭 뒤 목록과 주소가 그대로인지 먼저 확인하고, 새로 추가된 목록 항목의 수정 링크로 상세에 들어가 원문을 입력 및 저장한 뒤 목록으로 돌아오게 바꾼다. 기존 `notes.spec.ts`, `notes-model.spec.ts`, `touch-interactions.spec.ts`, `batch-copy.spec.ts`에서 이 도우미를 사용하는 과업은 생성 결과를 계속 확인하되 자동 상세 이동을 전제로 하지 않게 한다. `mobile-navigation.spec.ts`의 새 메모 직후 편집 과업도 수정 링크를 명시적으로 실행한다. 새 fixture, 고정 메모 ID와 내부 hook 조회는 추가하지 않는다.

저장 명령은 한 번만 실행하고 성공 후 화면 동작만 나누는 방식이다. 모바일에서 새 빈 메모를 만들었다고 편집기로 이동하거나 원문을 자동으로 복사하지 않는다. 생성된 메모는 기존 생성 순서 목록에서 찾을 수 있고, 상세 편집은 그 항목의 수정 링크로 계속 제공한다. 넓은 화면에서 새 메모를 만들었을 때 본문에 곧바로 입력할 수 있는 현재 동작은 유지한다.

#### TDD, 관찰 및 중단 조건

저장 규칙을 새로 만들지 않고 화면 이동 및 포커스를 바꾸므로 TDD를 적용하지 않는다. `mobile-navigation.spec.ts`에서 빈 목록과 여러 메모가 있는 목록을 각각 준비해 새 메모 버튼을 실행한다. 두 경우 모두 주소가 목록에 머물고 항목 수가 한 개 증가하며 새 항목이 스크롤로 접근 가능해야 한다. 새 항목의 수정 링크를 실행한 뒤에만 해당 상세 화면과 편집기가 나타나고, 원문 저장 뒤 목록에 같은 메모가 남아야 한다. 예상 항목은 실행 전후 목록의 차이와 새로 만든 원문으로 식별하고 생성된 ID 문자열은 고정하지 않는다.

생성이 실패하면 목록 수와 주소가 유지되고 기존 실패 알림을 볼 수 있어야 한다. 생성이 진행되는 동안 중복 실행을 막는 제어 상태를 확인한다. 넓은 화면에서는 생성 직후 새 메모 본문에 포커스가 남는지, 모바일에서는 숨겨진 보드 입력에 포커스가 가지 않는지 실제 브라우저에서 확인한다. 모바일 생성이 상세로 자동 이동하거나 복사 횟수를 올리고, 데스크톱의 바로 입력 또는 상세에서의 명시적 저장이 약해지면 완료하지 않는다.

진행 상태: U31에서 저장과 실패 처리는 한 함수로 유지하고 성공 뒤의 화면 동작을 분리했다. 모바일의 새 메모 버튼은 목록에 머무르며, 새 항목의 수정 링크로만 상세를 연다. 모바일 테스트 도우미도 명시적 수정 이동을 실행한다. Chromium, Firefox 및 WebKit에서 모바일 탐색 검사 30개가 통과했다. 타입 검사, lint, 단위 테스트 199개, Browser Mode 51개와 운영 빌드가 통과했다. 병렬 실행 중 타입 검사가 빌드의 `.next/types` 파일 갱신과 겹쳐 한 차례 실패했으므로 이후에는 두 검사를 순서대로 실행했다. 전체 Playwright 검사에서는 U12의 기존 선택 모델 3개를 제외한 168개가 통과했으며, U12 완료로 계산하지 않는다.

### U32 모바일 일괄 복사 동작 시트와 이동 아이콘

#### 목적, 선행 조건과 남은 결정

[요구사항의 일괄 복사 확인 항목과 저장 목록 관리](requirements.md)에 따라 좁은 화면의 두 목록에서 버튼 옆 팝오버를 액션 시트로 바꾼다. 모바일의 직접 이동은 서로 다른 방향 아이콘 버튼으로, 복제와 삭제는 이름이 보이는 버튼으로 제공한다. U17의 재정렬, 복제, 삭제와 저장 실패 복구, U20의 기본 비활성 설정 및 한 자리 이동, 넓은 화면 팝오버는 유지한다. [모바일 일괄 복사 액션 시트와 이동 아이콘 조사](references/mobile-batch-copy-action-sheet-and-direction-icons-research.md)의 플랫폼 비교를 구현 입력으로 사용한다.

액션 시트의 아래쪽 배치, 상단 닫기 버튼, 바깥 누르기, 기기 뒤로가기 및 `Escape` 닫기와 동작 실행 뒤 자동 닫기는 [결정](decisions/mobile-batch-copy-action-sheet-dismissal.md)에 따라 확정됐다. 시트는 내용에 맞게 높이를 정하고 보이는 영역을 넘지 않으며, 가용 너비를 사용한다. 기존 목록의 항목 이름으로 대상을 식별하고 원문 전체를 제목에 반복하지 않는다. 기기별 픽셀 크기를 임의로 고정하지 않는다. 기존 `위치 변경`, 순서 번호 선택, 별도 위치 선택 단계는 되살리지 않는다.

#### 절차 1: 표면과 명령의 책임 분리

- 추가: `apps/notes/src/shared/ui/action-sheet/action-sheet.tsx`, `use-action-sheet.ts`와 `index.ts`에 아래쪽 모달 시트의 공통 껍질, native `dialog` 수명, 포커스와 닫기 연결을 둔다. TSX는 표시와 이벤트 연결만, `.ts` hook은 열림 및 포커스 복귀만 맡는다. 본문은 `children`으로 받으며 일괄 복사 ID, 설정 또는 저장 명령을 알지 못하게 한다. 상단 닫기 버튼과 바깥 누르기, 기기 뒤로가기 및 `Escape`는 시트만 닫는다.
- 추가: `apps/notes/src/features/edit-batch-copy/model/batch-copy-item-actions.ts`에 가능한 방향, 복제와 삭제의 동작 식별자 및 이름을 한 번 조립하는 순수 함수를 둔다. 입력은 가능한 방향과 각 명령 함수이며, 저장된 목록과 모바일 작업 초안의 자료형 또는 화면 너비를 읽지 않는다. 출력 순서는 이동, 복제, 삭제이며 수행할 수 없는 방향은 만들지 않는다.
- 수정: `apps/notes/src/shared/ui/icons/icons.tsx`와 `index.ts`에 `ArrowUpIcon`, `ArrowDownIcon`을 추가한다. 두 그림은 서로 방향이 분명하고 기존 drag `GripIcon`, 뒤로가기 및 캔버스 시점 이동 아이콘과 혼동되지 않아야 한다. `apps/notes/src/_app/styles/tokens.css`와 `apps/notes/src/shared/ui/icon-button/icon-button.tsx`에는 시트의 touch 버튼 크기가 기존 제어보다 커야 한다고 화면 비교에서 확인된 경우에만 역할이 드러나는 크기 토큰과 크기 변형을 추가한다. 화면마다 수치를 반복해 적지 않는다.
- 보존 및 제거: `apps/notes/src/entities/batch-copy/model/`의 삽입식 명령, ID 생성 및 IndexedDB record는 수정하지 않는다. 새 순서 계산, UI별 중복 명령 배열, 외부 시트 package, 임시 ID와 두 번째 목록 state를 추가하지 않는다.

#### 절차 2: 한 목록에 하나의 액션 시트 연결

- 추가: `apps/notes/src/features/edit-batch-copy/model/use-batch-copy-action-sheet.ts`는 현재 연 항목 ID와 실행 버튼의 복귀 지점을 관리한다. 화면의 항목 배열에서 ID로 현재 위치를 다시 찾고, 이동과 복제 뒤에는 같은 항목의 버튼으로, 삭제 뒤에는 남은 이웃 항목의 버튼 또는 목록 시작 지점으로 포커스를 돌린다. 포커스 대상 DOM과 작업 순서는 별도 state로 복제하지 않는다.
- 추가: `apps/notes/src/features/edit-batch-copy/ui/batch-copy-action-sheet.tsx`는 `ActionSheet` 안에 이동 아이콘 버튼, 복제 및 삭제 텍스트 버튼을 구성한다. 이동 버튼은 보이는 `위로 이동` 및 `아래로 이동` 텍스트를 넣지 않고 각각 같은 접근 가능한 이름을 준다. 토글이 아니므로 `aria-pressed`를 상태로 붙이지 않고, 누르는 동안의 시각 상태와 `focus-visible`을 구분한다. 위험 동작 표현은 삭제에만 적용한다. `features/edit-batch-copy/index.ts`에서 두 목록에 필요한 UI와 hook만 내보낸다.
- 수정 및 제거: `apps/notes/src/_pages/batch-copy/ui/mobile-batch-copy-confirmation-list.tsx`의 각 행은 더보기 실행 버튼과 현재 항목 ID만 제공하고 목록 끝에서 시트 하나를 렌더링한다. 명령은 기존 `moveBy`, `onDuplicate`, `onRemove`에 연결한다. 시트로 옮겨간 `apps/notes/src/_pages/batch-copy/ui/batch-copy-item-actions.tsx`와 그 `ActionPopover` import, 행마다 만들던 동작 배열을 삭제한다. 한 항목마다 모달을 만들지 않는다.
- 보존: 확인 작업 초안의 저장 및 복구, drag 시작 지점, `pointercancel`, 원본 메모와 사용 횟수 불변 조건은 유지한다. 시트 닫기만으로 작업 초안을 지우거나 확인 페이지 하단의 `취소`를 실행하지 않는다.

#### 절차 3: 저장 목록 관리의 좁은 화면 전환

- 추가: `apps/notes/src/_pages/batch-copy/model/use-batch-copy-action-presentation.ts`에서 관리 목록을 담는 영역의 inline size를 관찰해 한 번에 `sheet` 또는 `popover` 중 하나만 선택한다. 기존 `48rem` 조건을 한 곳에서 사용하고 User-Agent, touch 지원 여부 또는 브라우저 이름으로 분기하지 않는다. 첫 측정 전에는 잘못된 표면의 버튼이 잠시 조작 가능해지지 않게 한다.
- 수정: `apps/notes/src/_pages/batch-copy/ui/batch-copy-start-page.tsx`에서 선택한 표현을 `BatchCopyEditingView`로 전달하고, `apps/notes/src/features/edit-batch-copy/ui/batch-copy-editing-view.tsx`와 `batch-copy-list.tsx`는 `management`의 좁은 표현에서 행별 `ActionPopover` 대신 목록당 한 개의 `BatchCopyActionSheet`를 사용한다. `panel` 및 넓은 `management`에서는 기존 팝오버를 유지한다. 같은 행에 두 개의 더보기 버튼을 겹쳐 숨겨 놓지 않는다.
- 수정 및 제거: `batch-copy-list.tsx`의 이동 가능 여부와 복제 및 삭제 callback은 절차 1의 명령 조립을 재사용한다. 모바일 표현에서 보이는 이동 텍스트 행과 같은 그림의 `move` 아이콘을 제거하고, 넓은 화면의 텍스트 행과 `ActionPopover`는 남긴다. 전환 중 시트가 열려 있다면 항목 ID와 포커스의 안전한 정리 뒤 올바른 표현으로 돌아간다.
- 보존: 저장 목록의 이동, 제거 undo 및 redo, 낙관적 갱신 실패 복원과 하단 `취소` 및 `일괄 복사하기`는 화면 표현에 의존하지 않는다.

#### 절차 4: 사용자 결과 검사와 마감

새 순서 알고리즘이나 저장 schema를 만들지 않으므로 이 절차에는 TDD를 적용하지 않는다. `apps/notes/e2e/batch-copy.spec.ts`와 `touch-interactions.spec.ts`의 기존 과업을 사용자가 보는 동작 기준으로 수정한다. 서로 구분되는 원문을 실제 화면에서 만들고, 실행 전후 항목 순서와 새로고침 뒤 순서로 기대 결과를 계산한다. 고정 항목 ID, 내부 hook 상태, CSS class, 시트의 DOM 중첩, 삽입 명령 호출 횟수와 정확한 좌표를 검사하지 않는다.

- 좁은 확인과 저장 목록 관리에서 더보기를 누르면 대상 항목의 시트만 열리고 버튼 옆 팝오버는 열리지 않아야 한다. 설정이 꺼져 있으면 복제 및 삭제만, 켜져 있으면 가능한 방향의 아이콘 버튼만 추가되어야 한다. 첫 항목, 중간 항목, 마지막 항목과 한 항목 목록을 각각 확인한다.
- 아이콘에 보이는 동작 텍스트가 없는 상태에서도 접근 가능한 `위로 이동`과 `아래로 이동` 이름, 누를 수 있는 영역, `Enter`, `Space`, 포커스 표시와 누름 표시를 확인한다. 이동, 복제, 삭제 뒤 확인 작업 초안 또는 저장 목록의 순서와 복사 결과를 각각 비교하고 원본 메모 및 사용 횟수가 바뀌지 않아야 한다.
- 시트가 열린 동안 뒤쪽 목록을 조작할 수 없어야 한다. 승인된 닫기 동작을 실행하면 저장 자료를 바꾸지 않고 닫혀야 하며, 포커스는 실행 버튼 또는 삭제 후 남은 유효한 대상으로 돌아가야 한다. `Escape`, 화면 회전, 320 CSS px, 200% 확대, 화면 키보드와 safe area에서 마지막 동작이 가려지지 않는지도 실제 모바일 브라우저에서 확인한다.
- 넓은 저장 목록 관리와 넓은 패널에서는 기존 텍스트 팝오버, drag, 키보드 이동 및 실패 복원이 그대로 작동해야 한다. 같은 저장 목록 관리 화면에서 폭을 바꾸면 열린 시트가 안전하게 닫히고 한 가지 표현의 더보기만 조작할 수 있어야 한다. `pnpm notes:typecheck`, `pnpm notes:lint`, `pnpm notes:test`, `pnpm --filter notes-app test:browser`, 해당 E2E와 `pnpm notes:build`를 순서대로 실행한다.

한 화면에서 팝오버와 시트가 동시에 포커스를 받거나, 승인된 닫기 입력이 작업 자료를 바꾸거나, 아이콘만으로 이동 방향을 구분할 수 없으면 U32를 완료하지 않는다. 애니메이션이나 트랜지션이 일부 브라우저에서 지원되지 않아도 열기, 실행, 닫기와 포커스 복귀는 작동해야 하며 이를 위해 브라우저별 임시 코드나 별도 fixture를 추가하지 않는다.

진행 상태: 아래쪽 배치와 닫기 동작을 요구사항 및 결정 기록에 반영했다. 절차 1에서 native `dialog`를 사용하는 공통 시트, 방향별 아이콘과 항목 동작 조립 함수를 추가했다. 절차 2에서 모바일 확인 목록의 행별 팝오버를 제거하고 한 목록의 현재 항목 시트 하나로 연결했다. 절차 3에서 저장 목록 관리의 실제 가로 폭을 관찰해 시트 또는 팝오버 하나만 실행 버튼으로 표시하고, 넓은 보드 패널은 팝오버를 유지했다. 두 목록 모두 마지막 항목을 삭제해도 포커스 복귀 지점이 남도록 빈 목록 구조를 유지한다. 기존 재정렬 명령, 저장 자료와 실패 복원은 수정하지 않았다.

절차 4에서 320 CSS px의 확인 및 관리 화면, Escape, 바깥 누르기, 닫기 버튼과 삭제 후 포커스 복귀를 브라우저 과업으로 확인했다. 높이 360 CSS px의 모바일 터치 검사에서도 마지막 동작과 남은 항목에 접근했다. 타입 검사, lint, 199개 단위 검사, 51개 Browser Mode 검사, 빌드와 일괄 복사 브라우저 검사는 통과했다. 전체 E2E는 174개 중 171개가 통과했고, U12 재작성 대상으로 분류한 메모 선택 모델 검사가 세 브라우저에서 각각 실패했다. 실제 기기의 뒤로가기, 화면 키보드, safe area 및 200% 확대는 자동화 결과로 확인했다고 적지 않는다.

이후 선택 모델의 관찰과 조작 대상 오류를 바로잡고 전체 E2E 175개가 통과했다. 이 재실행은 U32의 기존 브라우저 과업 회귀가 없다는 근거이며, 실제 기기에서 확인하지 않은 조건과 U12의 재작성 완료를 대신하지 않는다.

## 모바일 문서 높이와 화면별 스크롤

[모바일 문서 스크롤과 화면 높이 조사](references/mobile-document-scroll-and-height-research.md)는 메모 상세 및 일괄 복사 확인 화면의 하단 동작이 위로 밀리는 현상과 같은 높이 계산을 쓰는 다른 route를 구분한다. [요구사항의 반드시 지킬 조건](requirements.md#반드시-지킬-조건) 중 화면별 프레임, 메모 상세 저장 영역, 일괄 복사 수집 및 확인의 하단 동작과 보조 화면의 스크롤이 기준이다. 화면의 자료, Clipboard, 저장, 이탈 확인, Drawer 및 액션 시트 동작은 바꾸지 않는다. 실제 Android 기기의 계산 높이는 아직 계측하지 않았으므로, 코드에서 도출한 영향 범위를 각 화면의 재현 결과로 확정한 뒤 수정한다.

### U33 과업 화면과 메모 화면의 바깥 문서 스크롤 제거

메모 상세 `/notes/[noteId]`와 일괄 복사 확인 및 저장 목록 관리 `/batch-copy`의 하단 동작이 본문을 스크롤해도 보이는 화면 아래쪽에 남도록 한다. 같은 높이 구성을 쓰는 `/`의 평상시 메모 목록, 일괄 복사 수집 상태와 넓은 보드도 함께 확인한다. U21의 프레임 내부 Grid 배치 수정과 U22의 화면 목적별 프레임 분리를 선행 상태로 사용한다.

#### 절차 1: 높이 차이를 실제 화면에서 확인

- 추가 및 제거: 운영 코드, 검사 전용 fixture와 스크립트는 추가하거나 제거하지 않는다. 대상 브라우저의 기존 개발자 도구에서 `body` 최소 높이, 현재 보이는 높이, 문서 스크롤 높이와 프레임 높이를 읽어 메모 상세 및 확인 화면의 빈 영역이 시작되는 위치와 비교한다.
- 확인: 주소창이 펼쳐진 상태에서 문서 전체가 프레임보다 길고 스크롤 후 하단 동작이 함께 올라가야 높이 충돌로 판단한다. 계산한 높이나 화면 움직임이 다르면 `body` 규칙을 바로 고치지 말고 본문 최소 크기, 내부 스크롤 및 화면 키보드 영향을 다시 조사해 계획을 갱신한다.

진행 상태: 로컬 Chromium의 320×720 모바일 설정에서는 주소창이 없어 `body` 최소 높이, 문서 높이와 보이는 높이가 모두 720 CSS px였다. 이 설정은 제보된 주소창 상태를 재현하지 못한다. 연결된 Android 기기도 없어 실제 주소창에서의 수치 판정은 남아 있다. 반면 `/usage`와 `/settings`의 짧은 화면은 문서 높이가 777 CSS px로 나타나 보조 화면의 중복 최소 높이를 재현했다. 운영 코드 변경은 이 절차에서 하지 않았다.

#### 절차 2: 한 곳에서 중복 높이 제한 제거

- 제거: `apps/notes/src/_app/styles/globals.css`의 `body`에 지정된 `min-height: 100vh`를 삭제한다. 모든 정상 route는 이미 자체 화면 프레임을 가지므로 `body`에 다른 전체 높이를 다시 지정하지 않는다.
- 수정 없음: `apps/notes/src/_app/ui/task-page-frame.tsx`와 `notes-workspace-frame.tsx`의 `h-dvh`, 자식의 남는 높이 배분 및 내부 넘침 처리는 유지한다. `note-detail-page.tsx`, `mobile-batch-copy-confirmation.tsx`, `batch-copy-start-page.tsx`, `mobile-notes-workspace.tsx`의 하단 동작과 목록 스크롤 책임도 옮기지 않는다.
- 추가하지 않음: route별 `position: fixed` footer, `body`의 일괄 `overflow: hidden`, JavaScript 높이 state 및 브라우저별 보정은 도입하지 않는다. 화면 밖 콘텐츠와 키보드 포커스가 접근 불가능해지는 방식으로 문서 스크롤을 숨기지 않는다.

진행 상태: `body`의 최소 높이 선언만 제거했다. 메모 화면과 과업 화면의 `h-dvh`, 내부 목록 스크롤 및 하단 동작 구성은 그대로 둔다. 주소창이 있는 실제 Android에서 문서의 남는 스크롤이 사라졌는지는 아직 판정하지 않았다.

#### 절차 3: 사용자 동작과 화면 위치로 확인

- 수정: `apps/notes/e2e/mobile-navigation.spec.ts`의 기존 메모 목록, 수집과 상세 과업에 짧은 내용 및 화면보다 긴 내용의 스크롤 뒤 하단 동작 위치와 실행 결과를 연결한다. `apps/notes/e2e/batch-copy.spec.ts`에는 여러 항목을 확인 페이지에서 스크롤한 뒤 `취소`와 `일괄 복사하기`에 접근하는 사례, 저장 목록 관리의 같은 하단 동작 사례를 추가한다. 예상 원문과 순서는 테스트에서 실행한 입력으로 구하고 생성된 ID나 임의 좌표는 고정하지 않는다.
- 확인: 메모 목록 자체는 끝까지 스크롤되고 새 메모 버튼은 보이는 우측 하단에 남아야 한다. 수집 중에는 마지막 메모와 `초기화` 및 `다음`에 접근해야 한다. 상세 본문과 두 일괄 복사 목록에서는 내용을 스크롤해도 하단 동작이 이동하지 않아야 한다. 넓은 보드의 캔버스 이동, 확대와 왼쪽 아래 보기 제어도 바깥 문서 스크롤로 흔들리지 않아야 한다.
- 실제 기기 확인: Android 브라우저의 주소창이 보이거나 접힌 상태에서 각 화면을 맨 위와 맨 아래로 움직이고, safe area 및 편집기 화면 키보드가 하단 동작을 가리지 않는지 별도로 본다. 고정된 Playwright 표시 영역에서는 `vh`와 `dvh`의 차이가 재현되지 않을 수 있으므로 이 검사만으로 완료하지 않는다.

진행 상태: 기존 모바일 목록과 수집 검사는 마지막 메모까지 이동한 전후의 하단 제어 위치를 비교하도록 보강했다. 일괄 복사 검사는 길게 만든 저장 목록과 확인 목록에서 마지막 항목 및 하단 동작에 접근하고 복사 후 안내를 확인한다. 전체 Playwright 212개와 메모 목록 및 일괄 복사 화면의 검사 57개가 통과했다. 실제 Android 주소창의 펼침과 접힘, safe area 및 편집기 화면 키보드는 자동화로 확인하지 못했으므로 U33의 기기 판정은 남아 있다.

이 단위는 새 순수 자료 규칙이 없는 CSS 높이와 브라우저 스크롤 수정이므로 TDD를 적용하지 않는다. [테스트 전략](../../dev/personal-notes-app/testing-strategy.md)과 [테스트 안티패턴](../../dev/personal-notes-app/test-anti-patterns.md)에 따라 CSS class, DOM 중첩, 특정 footer 픽셀 좌표나 내부 스크롤 요소의 이름이 아니라 사용자에게 보이는 동작과 하단 제어의 접근성을 판정한다. 실제 기기에서 본문의 끝이 가려지거나 문서 전체가 계속 움직이면 완료하지 않는다.

### U34 보조 화면과 접속 안내의 불필요한 높이 제거

U33 뒤에 `/usage`, `/analysis`, `/templates`, `/settings`와 접속 주소 확인 및 오류 상태를 확인한다. 이 화면들은 하단 고정 작업 행이 없으므로 U33의 버튼 증상으로 묶지 않는다. 짧은 콘텐츠에 불필요한 문서 스크롤을 만들지 않으면서 긴 콘텐츠의 일반 스크롤을 유지하는 것이 목적이다.

#### 절차 1: 본문 높이 책임을 프레임에 맞춤

- 제거: `apps/notes/src/_pages/usage/ui/usage-start-page.tsx`, `analysis/ui/analysis-start-page.tsx`, `templates/ui/templates-start-page.tsx`, `settings/ui/settings-start-page.tsx`의 `<main>`에 중복 지정된 `min-h-screen`을 제거한다. 탐색 높이를 포함해 최소 화면 높이를 확보하는 책임은 기존 `DocumentPageFrame`의 `min-h-dvh`에 남긴다.
- 수정: `apps/notes/src/_app/ui/runtime-access-guard.tsx`의 접속 확인 및 오류 상태에만 쓰는 `min-h-screen`을 현재 보이는 높이에 맞는 최소 높이로 바꾼다. 상태 문구와 주소 판정, 지원 주소에서 정상 route를 렌더링하는 분기는 유지한다.
- 추가하지 않음: 보조 화면마다 별도 프레임이나 scroll listener, 내용 길이에 따른 고정 높이, 새 높이 토큰을 만들지 않는다. `DocumentPageFrame`과 각 본문의 기존 FSD 역할을 합치지 않는다.

진행 상태: 네 보조 화면 본문의 중복 최소 높이를 제거하고, 접속 주소 확인 및 오류 상태의 최소 높이를 `min-h-dvh`로 바꿨다. `DocumentPageFrame`의 탐색과 본문 구성, 각 화면의 입력과 오류 처리 코드는 유지한다. 내용이 표시 영역 안에 드는 경우와 넘어서는 경우의 스크롤 동작은 다음 절차에서 판정한다.

#### 절차 2: 짧은 화면과 긴 화면을 구분해 확인

- 수정: `apps/notes/e2e/mobile-navigation.spec.ts`의 보조 화면 탐색 검사에서 내용이 짧은 상태로 각 route를 열어 탐색과 본문을 확인하고, 길어진 사용 빈도, 분석 결과, 템플릿 또는 설정 내용은 끝까지 읽고 조작할 수 있는지 해당 기존 과업 검사와 연결한다. 접속 주소 확인 및 오류 상태는 기존 주소 검사에서 안내가 보이는 영역에 나타나는지 확인한다.
- 확인: 짧은 화면은 탐색 높이를 한 번만 반영하고 스크롤 끝에 빈 한 화면을 만들지 않아야 한다. 실제 내용이 보이는 높이를 넘으면 문서 스크롤을 허용해야 하며 Drawer 열기, 화면 이동, 입력과 오류 복구가 유지돼야 한다. Android 주소창 상태와 큰 글자에서도 같은 차이를 확인한다.

진행 상태: 네 보조 화면의 초기 내용이 한 화면에 들어올 때 불필요한 문서 스크롤이 없는지, 화면 높이를 줄였을 때 각 화면의 마지막 내용에 접근할 수 있는지 기존 모바일 탐색 검사에 추가했다. 접속 주소 오류 안내도 보이는 영역 안에 남았다. Chromium, Firefox 및 WebKit에서 전체 Playwright 212개와 최종 스크롤 검사 6개가 통과했다. 단위 검사 188개, Browser Mode 검사 57개, lint, 타입 검사와 운영 빌드도 통과했다. 실제 Android 주소창과 큰 글자 설정은 확인하지 못했으므로 U34의 기기 판정은 남아 있다.

이 단위에도 TDD를 적용하지 않는다. 실제 화면의 스크롤 범위와 콘텐츠 접근성을 브라우저에서 확인하며 `min-h-screen` 문자열이나 프레임의 내부 구조를 테스트하지 않는다. 짧은 콘텐츠에서 여전히 탐색 높이만큼 빈 스크롤이 생기거나 긴 내용의 끝을 읽을 수 없으면 완료하지 않는다.

## 좌표 제한 제거와 일괄 복사 삽입식 재정렬

고정 캔버스의 위치 제한을 제거한다. 메모의 크기, 본문 저장과 모바일 표현은 유지한다. 좌표 제한 제거는 U2, U3, U4, U5와 U11에 적용하며 구현과 후속 오류 복구 절차를 완료했다. 모든 일괄 복사 화면은 현재 구현의 제거 후 삽입 계산을 유지하되 새 이동 핸들과 앞뒤 위치 표시를 같은 명령에 연결한다.

[좌표 제한 제거 조사](references/free-note-placement-research.md), [집중형 텍스트 유틸리티 디자인 시스템 조사](references/focused-text-utility-design-system-research.md)와 [일괄 복사 순서와 제거 복구 결정](decisions/accumulator-ordering-and-recovery.md)을 구현 전에 읽는다. 위치 교환 조사는 과거 결정의 근거이며 현재 순서 규칙으로 사용하지 않는다.

### 위치 저장과 화면 변환

1. 완료. U2의 `entities/note/model/note.ts`와 `note-geometry.ts`에서 양수 위치 및 캔버스 크기에 따른 X/Y 검사를 제거하고, 유한성과 안전한 수치 정밀도 검사만 유지했다. 너비와 높이 검사는 위치와 분리했으며 원점을 통과하는 이동과 위쪽 및 왼쪽 크기 조절에서 반대편 변을 보존한다. 제스처 계산이 안전 수치 범위를 넘으면 저장하지 않고 기존 geometry와 미리보기를 복원한다.
2. 완료. U3의 기존 자료 읽기와 migration 경로가 좌표를 다시 보정하지 않도록 정리했다. 기존 좌표, 원문과 revision은 유지하고 크기만 기존 범위로 정규화하며, zIndex가 실제로 바뀐 경우에만 전체 revision을 증가시키고 tabIndex 정규화만으로는 올리지 않는다. migration 통합 검사의 기대값을 이 규칙에 맞췄다.
3. 완료. U4와 U5의 `notes-board.tsx`, `note-card.tsx`, `note-properties-panel.tsx`에 카메라 원점과 화면 렌더링 기준을 분리해 연결했다. X/Y 입력에는 고정 상한을 두지 않고, 메모 이동과 크기 조절에서 위치를 다시 제한하지 않으며, 화면 배율을 적용한 상대 좌표를 CSS 위치로 전달해 큰 저장 좌표가 CSS `left` 상한에 먼저 걸리지 않게 한다.
4. 완료. 신규 메모의 기본 grid 배치는 기존 정책을 유지하고 좌표 제한을 다시 만들지 않았다. 전체 맞춤은 첫 실제 메모 외곽에서 경계를 계산하고 빈 목록을 별도 처리하며, 경계를 카메라 원점으로 사용해 메모를 표시한다. 전체 맞춤 배율이 수동 축소 하한보다 작아도 축소가 현재 배율을 증가시키지 않으며, 현재 표시 영역에 새 메모를 자동 배치하는 정책은 이번 절차에 포함하지 않고 별도 제품 결정으로 남긴다.

5. 완료. 캔버스 하단 보기 제어는 `absolute bottom-3 left-3` 고정을 유지하고, 이동, 확대, 축소와 전체 맞춤 동작을 아이콘 버튼으로 표시한다. 각 버튼은 접근 가능한 이름과 title을 유지하며 배율 상태는 숫자로 확인할 수 있게 둔다.

큰 좌표는 안전하게 표현할 수 있는 수치 범위만 허용하고, 고정 배치 상한을 다시 도입하거나 기존 메모를 옮기지 않는다. 지원 브라우저에서 정밀도가 부족하면 카메라 원점과의 차이에 배율을 먼저 적용해 CSS 위치를 계산한다. 입력 또는 제스처 계산이 안전한 수치 범위를 벗어나면 기존 geometry, 미리보기, gesture와 pointer capture를 정리하고 기존 geometry와 revision을 유지한 채 실패 안내를 표시한다.

U11에서는 X와 Y의 음수, 0, 4096 바깥을 각각 이동 및 속성 입력으로 적용하고 새로고침 뒤 같은 값을 확인한다. 확대, 패널 전환, 원점 통과와 화면 크기 변경에서도 누른 지점이 커서를 따라야 한다. 기존 자료 읽기, 잘못된 수치, 빈 목록, 안전 수치 상한 바로 안과 밖의 drag 및 resize 실패 복구, 멀리 떨어진 두 메모의 전체 맞춤에서 실제 DOM 위치가 기대한 화면 변환과 일치하는지 확인한다. 전체 맞춤 뒤 축소가 배율을 키우지 않는지도 확인한다. 하단 보기 제어가 좌측 하단에 고정되고 아이콘의 접근 가능한 이름이 유지되는지도 확인한다. `apps/notes/e2e/notes.spec.ts` 39개를 Chromium, Firefox와 WebKit에서 통과했고 전체 Playwright 77개와 단위 테스트 168개도 통과했으며, 많은 메모의 비용을 측정한 뒤 필요한 경우에만 그리기 생략을 검토한다. 편집 중 본문과 자동 저장 및 Tab 탐색을 잃지 않아야 한다.

### 모든 일괄 복사 화면의 삽입식 재정렬

1. U2에서 `moveBatchCopyItem`과 `moveMobileBatchCopyEntry`의 제거 후 삽입 계산을 공통 순서 규칙으로 유지한다. 저장 대상과 revision 처리는 각 모듈에 두고 항목 ID, 스냅샷, 선택, 포커스와 항목 수를 보존한다.
2. U7에서 `features/edit-batch-copy/ui/batch-copy-list.tsx`와 `mobile-batch-copy-confirmation-list.tsx`의 drag 시작점을 왼쪽 이동 핸들로 제한한다. 놓는 순간 pointer가 가리키는 항목의 앞 또는 뒤를 다시 판정하고, 유효한 위치에만 일시적인 삽입선을 표시한다.
3. 모바일 확인 화면과 저장 목록 관리는 설정을 켠 경우에만 현재 항목에서 실행할 수 있는 `위로 이동`과 `아래로 이동`을 더보기에 추가한다. 한 번 실행할 때 한 자리의 삽입 위치로 옮기며 키보드 방향키와 같은 명령을 호출한다. 항목 전체를 누르는 길게 누르기 재정렬과 별도 목적지 선택 단계는 제거한다.
4. U3와 U7에서 시작 목록 revision과 이동 ID 및 삽입 위치를 확인한 뒤 한 번에 저장한다. 목록 갱신, 대상 제거, 중복 완료와 저장 실패에서는 순서를 바꾸지 않는다. 패널 밖 제거, 제거 undo 및 redo 규칙, 모바일 작업과 저장 목록의 분리는 유지한다.

완료 증거는 `batch-copy-commands.test.ts`, `mobile-batch-copy-draft.test.ts`의 순서 규칙과 `e2e/batch-copy.spec.ts`, `e2e/touch-interactions.spec.ts`의 실제 조작에서 확인한다. `[A, B, C, D]`에서 A를 D 뒤에 놓으면 `[B, C, D, A]`, D 앞에 놓으면 `[B, C, A, D]`가 되어야 한다. 비인접 이동, 중복 텍스트의 서로 다른 ID, 자기 자신, 내부 여백, 마지막 항목까지 스크롤, 저장 실패와 대상 제거를 포함한다. 새로고침과 전체 복사 문자열에서도 같은 순서를 확인하며, 모바일 초안 편집이 원본 메모와 사용 횟수 및 저장 목록에 영향을 주지 않아야 한다.

## 모델 기반 탐색 테스트 도입

[모델 기반 탐색 테스트 요구사항](requirements.md#모델-기반-탐색-테스트)을 U12에서 구현한다. 기존 모듈별 TDD 분류와 실제 브라우저 검사 책임은 유지하며, [기술 조사](references/model-based-testing-research.md)에 따라 기존 Vitest와 Playwright에 생성 및 축소 실행을 연결한다. U12는 일부 검사를 추가했으나 기대값, 결함 탐지와 재현 증거를 보완해야 하며 완료하지 않았다.

첫 대상은 메모 기능이다. [기존 테스트의 목적 조사](references/existing-test-purposes.md)를 요구사항과 대조해 12개 세부 기능으로 나눈다. 각 기능에서 행동 생성, 오류 탐지, 실패 순서 축소, 로그 기록과 재현을 끝내고 필요한 실제 IndexedDB 및 화면 증거도 함께 확인한다. 저장 하나의 완료를 다른 기능의 시작 조건으로 삼지 않는다. [기능별 조사](references/note-feature-exploration-research.md)를 적용하며 템플릿과 분석의 탐색 확대는 이후 작업, 일괄 복사 탐색은 보류로 유지한다.

## 기준선과 문서 관리

첫 계획 커밋 전까지 다음 파일의 현재 검토본을 임시 기준선으로 사용한다. 계획을 처음 커밋한 뒤에는 `plan.md`를 마지막으로 변경한 커밋에 포함된 문서가 기준선이다. Git 개체 ID나 작성 시각을 기준선 식별자로 기록하지 않는다.

- [요구사항의 의도한 결과](requirements.md#의도한-결과)
- [요구사항의 반드시 지킬 조건](requirements.md#반드시-지킬-조건)
- [요구사항의 완료를 확인할 증거](requirements.md#완료를-확인할-증거)
- [요구사항의 모델 기반 탐색 테스트](requirements.md#모델-기반-탐색-테스트)
- [개인 메모의 모델 기반 탐색 테스트 조사](references/model-based-testing-research.md)
- [요구사항의 초기 범위에서 제외한 백로그](requirements.md#초기-범위에서-제외한-백로그)
- [화면 구성과 공간형 메모 상호작용 조사](references/interface-layout-research.md)
- [메모 조작과 모바일 일괄 복사 조사](references/note-interaction-and-mobile-batch-copy-research.md)
- [모바일 일괄 복사 확인과 오른쪽 패널 우선순위 조사](references/mobile-batch-copy-confirmation-and-panel-priority-research.md)
- [메모 Tab 순서, 항목 동작 팝오버와 모바일 지연 재정렬 조사](references/tab-order-popover-and-mobile-reorder-research.md)
- [메모 선택, 속성 편집과 삭제 복구 조사](references/note-selection-properties-and-removal-research.md)
- [데스크톱 입력 상태와 피드백 복원력 조사](references/desktop-input-and-feedback-resilience-research.md)
- [구현 필수 결정 교차검증](references/required-implementation-decisions-research.md)
- [초기 화면 hydration 오류 조사](references/hydration-diagnostics.md)
- [개인 메모 데이터 구조 조사 초안](references/data-model-draft.md)
- [로컬 실행 구조와 계정 및 라이브러리 백로그 조사](references/runtime-modes-and-architecture.md)
- [2026년 웹 애플리케이션 시각 디자인과 AI 생성 UI 조사](references/web-visual-design-research-2026.md)
- [개인 메모 UI 디자인 시스템과 사용자 템플릿 시각 비교](references/ui-design-system-visual-comparison.md)
- [React Hook Form 입력 상태 조사](references/react-hook-form-input-state-research.md)
- [개인 메모 애플리케이션 기술 안티패턴](../../dev/personal-notes-app/anti-patterns.md)
- [개인 메모 입력의 React Hook Form 사용 지침](../../dev/personal-notes-app/react-hook-form.md)
- [개인 메모 애플리케이션 테스트 전략](../../dev/personal-notes-app/testing-strategy.md)
- [개인 메모 애플리케이션 테스트 안티패턴](../../dev/personal-notes-app/test-anti-patterns.md)
- [메모 저장 뒤 초안 제거 재시도](decisions/note-draft-cleanup-retry.md)
- [좁은 화면 메모 표현 결정](decisions/responsive-note-presentation.md)
- [모바일 메모 목록 높이와 새 메모 제어 조사](references/mobile-note-list-sizing-and-action-overlay.md)
- [메모 화면 상태와 전체 목록 렌더링 조사](references/notes-screen-state-and-list-loading-research.md)

사용자에게 필요한 결과와 제외 범위는 `requirements.md`에서 관리한다. 상호작용, 자료 수명과 검증 방식의 선택은 `decisions/`에 기록한다. 각 작업 단위는 관찰 가능한 결과를 남긴다. 자동 검사로 결정할 수 없는 읽기 흐름, 조작 가능성과 상태 표현은 시각 및 접근성 검토 기록으로 판정한다. 문서, 계획, 코드와 커밋 문구에는 요구사항에서 행동 주체를 직접 밝힌 경우에만 인칭 표현을 사용하고, 출처가 없는 가상 역할을 요청이나 승인 근거처럼 만들지 않는다.

### 추가 요구사항의 영향

- U1은 로컬 모드를 정적 HTML과 동일시하지 않고, `next build`와 `next start`를 현재 독립 실행 배포로 사용한다. FSD 위반 판정은 커밋된 별도 검사 스크립트 대신 ESLint가 맡는다.
- U2와 U4는 자료형, 화면과 공개 진입점에서 `analysis`를 사용한다. U9는 분석 slice, Worker, 메시지와 결과 자료의 이름을 같은 용어로 맞춘다.
- U11은 별도의 애플리케이션 백엔드와 데이터베이스 서버 없이 사용자 과업이 완료되는지를 확인한다. localhost HTTP는 Next.js 운영 서버에서 자동 검증하고, HTTPS는 같은 revision을 TLS reverse proxy 또는 배포 플랫폼에서 제공해 확인한다.
- 로컬 실행 형식과 분석 명칭 정정은 U3, U5, U6, U7, U8과 U10의 사용자 동작 및 자료 규칙을 바꾸지 않는다. U10이 참조하는 입력 화면의 이름만 텍스트 분석으로 맞춘다.
- 설정 판정만을 위한 fixture와 일회용 검사 스크립트는 저장소에 추가하지 않는다. 임시 입력이 필요한 한 번의 ESLint 설정 검증은 Git이 무시하는 `temps/`에서 수행하고, 이후에는 실제 소스의 lint와 운영용 빌드를 반복 검증 근거로 사용한다.
- 정적 사이트 배포가 범위에서 제외됐으므로 `static-smoke.mjs`와 자체 정적 서버를 제거한다. 이 스크립트가 맡았던 사용자 결과는 과업별 Playwright Test로 옮기고, IndexedDB 내부 schema, DOM 순서, 운영 코드의 조작 시간과 임의 대기에 결합된 검사는 삭제한다. 같은 목적의 다른 전용 스크립트는 추가하지 않는다.
- U3 브라우저 검사에서 `_pages` slice의 하나뿐인 `index.ts`가 route UI와 조립용 IndexedDB 구현을 함께 다시 내보내면 저장 검사만 가져와도 `next/link`가 평가되는 문제가 확인됐다. route는 `index.ts`, `_app` 조립 지점은 같은 slice의 명시적 `composition.ts`를 가져오도록 public API 책임을 나눈다. 이는 server 및 client 환경 분리가 아니므로 대칭적인 `index.server.ts`와 `index.client.ts`를 만들지 않는다.
- 일괄 복사를 처음 재배치할 때 독립 route와 `_pages/accumulator` slice를 제거하고 메모 route의 보조 패널을 추가했다. 이후 모바일 요구사항은 `48rem` 미만의 목록 표현에 일괄 복사 확인과 저장 목록 관리 route를 다시 추가하고, `48rem` 이상에서는 승인된 보조 패널을 유지했다.
- 당시 모바일 route는 `/accumulator`, 화면 slice는 `_pages/accumulator`였다. 표시 용어를 `일괄 복사`로 바꾼 결정에 맞춰 기준 주소를 `/batch-copy`, 화면 slice를 `_pages/batch-copy`로 변경했다. 후속 결정에서는 이전 route를 호환 주소로 두는 안도 폐기했으므로 `/accumulator` 화면과 redirect를 만들지 않는다.
- 최신 모바일 요구는 목록 화면 헤더에서 일괄 복사 상태를 시작하고 메모 상세 route를 추가한다. 같은 메모를 반복해서 누른 경우도 별도 항목과 클릭 횟수로 기록한다. `다음`은 `/batch-copy` 확인 페이지로 이동하고, 이동 핸들 재정렬과 항목별 위치 변경, 복제 및 삭제는 실행 중 작업 사본만 바꾼다. U2부터 U8, U11과 U17이 영향을 받으며 작업 단계, 고유 항목 ID, 스냅샷, 사용 빈도와 제거 이력 규칙은 새 입력 방식에 맞게 다시 검증한다.
- 화면 문구 제한은 U1의 최소 화면, U4의 공통 화면 구조와 U5부터 U10까지 추가할 모든 사용자 문구에 적용한다. U11은 보이는 문자열의 역할과 중복을 최종 확인하며, 자료 규칙과 라우트 수는 바뀌지 않는다.
- 접속 안내 문구와 카드 표면 제한은 U4와 U11에 영향을 준다. 주소 확인 중에는 장식용 카드 없이 진행 상태만 표시하고 실패 제목은 `잘못된 접근입니다.`로 바꾸며, 본문에서 HTTPS 또는 `http://localhost`로 다시 여는 행동을 알려준다. 접속 상태, 사용 빈도 및 분석 빈 상태, 템플릿 원문 없음, 설정과 템플릿 폼, 표 및 목록을 현재 디자인 시스템의 카드 기준으로 다시 분류한다. 메모와 선택 가능한 일괄 복사 항목의 상태 표면은 유지한다.
- macOS가 `Command` key event, 창 포커스 변화, 문서 가시성 변화 또는 pointer 종료 event 일부를 전달하지 않는 경우는 U2, U3, U5, U6과 U11에 영향을 준다. U2는 일시적인 modifier 표시 상태와 영구 자료를 분리하고, U3는 modifier 표시 상태를 저장하거나 route 수명에 올리지 않는다. U5는 중단 신호 뒤에도 마지막으로 보인 캔버스 시점을 유지하며, U6은 다음 신뢰할 수 있는 event의 modifier 값으로 헤더 표시만 다시 맞추고 과거 복사나 선택 동작을 추정해 실행하지 않는다. U11은 실제 `Shift+Command+5` 완료 및 취소 직후 헤더 복원, 다음 복사와 캔버스 시점 이동을 각각 확인한다.
- 구현 전 검토에서 지원 접속 주소의 실행 중 판정, 일괄 복사 패널 전체 복사, 줄 조합 생성 규칙과 IndexedDB 연결 수명의 검증 공백을 확인했다. IndexedDB 저장, 공통 화면 구조, 일괄 복사 순서 편집, 줄 단위 텍스트 분석과 통합 완료 검증에 각각 책임을 배정한 뒤 영향을 받는 구현을 진행한다.
- 메모 화면의 왼쪽 사이드바 제거는 공통 화면 구조, 메모 영역의 반응형 전환과 통합 화면 검증에 영향을 준다. 저장 자료, 개별 복사, 일괄 복사, 사용 빈도와 분석 규칙은 바뀌지 않는다.
- 현재 동작 보존과 개발 지침 검토는 다음 미완료 작업보다 먼저 수행하고, 이후 각 작업 단위에서 변경한 모듈에 다시 적용한다. 이 선행 작업은 사용자 과업이나 TDD 분류를 바꾸지 않으며, 지침을 따르려면 승인된 동작, 외부 API 또는 저장 자료를 바꿔야 하는 경우 영향을 받는 구현을 멈춘다.
- 집중형 텍스트 유틸리티 방향은 U13부터 U20의 역할 기반 token, application bar, 메모 표면과 중립색 캔버스에 적용한다. 별도 메모 제목과 상단 작업 행을 만들지 않고 `48rem` 이상의 오른쪽 보조 패널 제어를 우측 상단에 유지한다. 좁은 화면은 제한된 높이 목록, 상세 화면, 일괄 복사 상태와 한 줄 주 헤더를 사용하며 전역 탐색 방식은 승인 전까지 보류한다.
- 새 메모와 일괄 복사 제어는 캔버스 전체 높이를 유지하는 가장자리 overlay에 둔다. U35는 새 메모 버튼이 높이를 차지하는 `notes-collection.tsx` 행을 제거하고 캔버스 위쪽 왼편의 버튼 영역으로 옮기며, 기존 일괄 복사 trigger의 우측 상단 배치는 유지한다. 버튼을 감싸는 빈 overlay 영역은 pointer 입력을 받지 않고, 버튼 영역만 입력을 받는다. 저장된 메모 좌표와 캔버스 시점은 위치 변경으로 바꾸지 않는다.
- U35의 모바일 일괄 복사 화면은 저장된 작업 초안과 현재 표시할 화면을 구분한다. 새로고침 시 초안을 지우지 않고 평상시 목록을 먼저 표시하며 사용자가 이어가기를 실행하면 기존 자료 전이 명령으로 수집 상태를 복원한다. 확인 화면에서 브라우저 뒤로가기를 실행하면 메모 목록에 도착해야 한다. 화면 안 뒤로가기와 브라우저 뒤로가기는 메모 목록을 다시 연 뒤 같은 초안 상태를 표시해야 한다.
- U35는 전체 메모 배열과 일괄 복사에서 사용할 수 있는 모든 메모를 유지한다. 저장소 페이지 조회로 목록을 나누지 않는다. 브라우저 측정에서 전체 읽기, 메모별 복구 초안 읽기, 첫 화면 렌더, JavaScript heap, DOM 수와 스크롤 응답 비용을 각각 구분한다. 화면 밖 layout과 paint가 병목이면 CSS `content-visibility: auto`를 먼저 확인한다. 그래도 React mount나 DOM 수가 병목이면 메모 배열을 그대로 두고 목록 렌더만 가상화한다. 자체 가상화기나 새 의존성은 측정값과 공식 통합 문서 검토 전에는 추가하지 않는다.
- U35는 사용 빈도, 텍스트 분석, 템플릿과 설정의 바깥 테두리와 안쪽 행 구분선이 같은 정보 묶음을 반복해서 나누는 경우에만 선을 줄인다. 표 행, 입력 포커스, 오류와 상태를 전달하는 선은 유지한다. 화면마다 묶음과 오류 표현이 다르므로 공통 선 제거 컴포넌트나 전역 스타일은 만들지 않는다.

### U35 화면 제어, 모바일 작업 복원과 전체 목록 성능

#### 목적 및 요구사항 범위

[요구사항의 의도한 결과](requirements.md#의도한-결과), [반드시 지킬 조건](requirements.md#반드시-지킬-조건), [완료를 확인할 증거](requirements.md#완료를-확인할-증거)에 적힌 상단 제어 가림, 모바일 일괄 복사 재진입, 전체 메모 사용, 보조 화면의 구분선 밀도와 저장 목록 관리 화면의 시각 규칙 문제를 해결한다. 화면별 사용자 결과와 조사 제안은 [메모 화면 상태와 전체 목록 렌더링 조사](references/notes-screen-state-and-list-loading-research.md)를 따른다. 이 절차는 요구사항에 적힌 메모, Clipboard, 저장 초안 및 모바일 목록 동작을 줄이지 않으며 페이지네이션을 도입하지 않는다.

#### 파일 변화

- 생성: `docs/designs/personal-notes-app-8fd/references/notes-screen-state-and-list-loading-research.md`에 전체 자료 조회와 렌더 비용의 차이, 현재 구현 관찰, 상태 전이 조사, 성능 측정 기준 및 근거 링크를 기록한다.
- 수정: `apps/notes/src/_pages/notes/ui/notes-collection.tsx`의 세로 공간을 차지하는 데스크톱 새 메모 행을 제거하고, 같은 화면 root에 새 메모 버튼을 캔버스 위쪽 왼편으로 absolute 배치한다. 이미 상단 우측에 있는 일괄 복사 trigger는 `apps/notes/src/_pages/notes/ui/batch-copy-workspace.tsx`에서 확인한다. 버튼별 hitbox만 포인터 입력을 받고 빈 전체 크기 wrapper는 추가하지 않는다.
- 수정: `apps/notes/src/features/add-note-to-batch-copy/model/mobile-batch-copy-provider.tsx`, `apps/notes/src/features/add-note-to-batch-copy/model/mobile-batch-copy-session.ts`, `apps/notes/src/_pages/notes/ui/mobile-notes-workspace.tsx`, `apps/notes/src/_pages/batch-copy/model/use-mobile-batch-copy-confirmation.ts`, `apps/notes/src/_pages/batch-copy/model/use-batch-copy-page.ts`와 `apps/notes/src/_pages/batch-copy/ui/batch-copy-start-page.tsx`에서 저장 초안, 화면 전환과 브라우저 기록을 함께 확인한다. `useBatchCopyPage`는 확인 화면과 메모 화면으로 복귀하는 두 상태의 페이지 전환을 소유하고, 복귀 중에는 확인 초안의 기존 참조를 유지한다. 확인 화면은 복귀 시작 callback 하나만 직접 받는다. 초안의 `confirming`에서 `collecting` 저장이 끝나도 URL 전환 전까지 확인 화면을 유지한다. `/batch-copy`에서 복귀 중이 아닌 `collecting` 초안이 감지되면 저장 목록 관리 기본 화면을 표시하지 않고 메모 화면으로 경로를 정리한다. 저장 실패에서는 확인 화면 및 항목을 유지하고 재시도할 수 있어야 한다. 전환 상태는 IndexedDB 초안에 추가하지 않고 자료 배열을 복제하지 않는다. 중간 컴포넌트 전달이나 새 Context를 만들지 않는다.
- 수정: `apps/notes/src/_pages/batch-copy/ui/batch-copy-start-page.tsx`와 `apps/notes/src/features/edit-batch-copy/ui/batch-copy-list.tsx`에서 저장 목록 관리 화면을 현재 디자인 규칙에 맞춘다. 한 줄 작업 헤더와 주요 동작, 평면 구성, 간격 및 중립색 토큰을 사용한다. 페이지 전체를 카드로 감싸지 않는다. 각각 이동 및 조작 대상인 항목 표면은 유지하되 바깥 장식 프레임과 같은 정보 묶음을 중복해서 나누는 선은 두지 않는다. `presentation="panel"`의 캔버스 보조 패널 표현은 유지하고 관리 화면 표현만 바꾼다. 확인 작업의 작업 사본과 저장 관리 목록의 데이터 수명은 섞지 않는다.
- 제거: `apps/notes/src/_pages/batch-copy/ui/batch-copy-start-page.tsx`에서 `BatchCopyManagementProps`, `BatchCopyManagement` 중간 전달 컴포넌트와 `{...props}` 전달을 제거하고 `BatchCopyPageContent`가 이미 가진 값과 기존 관리 훅을 명시적으로 조합한다. `BatchCopyEditingView` 자체에 필요한 목록 및 동작 입력은 명시적 Props로 유지한다. 일반 저장 목록 관리 화면, 기존 관리 기능과 모바일 확인 화면은 제거하지 않는다.
- 수정: 메모 초안 전체 조회가 첫 화면을 늦추는 것으로 측정된 경우에만 `apps/notes/src/_pages/notes/model/notes-data-provider.tsx`, `apps/notes/src/entities/note/api/indexed-db-note-draft-repository.ts`를 바꾸고 `apps/notes/src/_pages/notes/model/use-note-detail-read.ts`를 추가해 모바일 상세 메모의 초안만 읽는다. 데스크톱 복구 동작은 그대로 유지한다. 화면 밖 카드 layout 비용은 `apps/notes/src/_pages/notes/ui/mobile-note-list.tsx`에서 CSS로 먼저 줄이고, 측정 뒤에도 React mount나 DOM 수가 주요 병목일 때만 목록 UI를 가상화한다.
- 수정: `apps/notes/src/_app/ui/runtime-access-guard.tsx`에서 허용된 주소의 진행 문구를 숨기되 주소 판정과 허용하지 않은 주소의 차단 및 안내를 보존한다. `apps/notes/src/_pages/usage/ui/usage-table.tsx`, `apps/notes/src/_pages/usage/ui/usage-start-page.tsx`, `apps/notes/src/_pages/analysis/ui/analysis-results.tsx`, `apps/notes/src/_pages/templates/ui/saved-templates.tsx`, `apps/notes/src/_pages/templates/ui/template-editor.tsx`, `apps/notes/src/_pages/templates/ui/template-input-form.tsx`, `apps/notes/src/_pages/templates/ui/template-authoring.tsx`와 `apps/notes/src/_pages/settings/ui/settings-start-page.tsx`의 구분선을 화면별로 확인하고 실제로 중복되는 선만 줄인다.
- 제거: `notes-collection.tsx`에서 캔버스 높이를 차지하는 데스크톱 상단 새 메모 행과 지원 주소 판정만을 위해 표시하는 `접속 주소 확인 중` 사용자 화면을 제거한다. 저장 자료 삭제, 테스트 삭제, 기존 사용자 동작 또는 전체 메모 조회를 제거하지 않는다. 현행 main 소스에는 저장소 페이지네이션 코드가 확인되지 않았으므로 제거 대상 페이지네이션 구현은 없다.
- 테스트 변경: 기존 `apps/notes/e2e/notes.spec.ts`, `apps/notes/e2e/batch-copy.spec.ts`, `apps/notes/e2e/touch-interactions.spec.ts`, `apps/notes/e2e/mobile-navigation.spec.ts` 과업에서 데스크톱 캔버스 전체 크기와 버튼 동작, 모바일 새로고침과 이어가기, 확인 화면의 화면 내 뒤로가기 및 브라우저 뒤로가기, 전체 메모 복사 접근, 보조 화면의 정보 구분을 사용자가 관찰하는 값으로 확인한다. `batch-copy.spec.ts`에는 확인에서 복귀할 때 일반 관리 화면 헤더나 본문이 노출되지 않는지와 저장 목록 관리의 Drawer 진입, 항목 편집, 취소 보존 및 전체 복사를 확인한다. 사용자 검증이 부족한 경우에만 기존 과업 검사를 보강하며 별도 테스트 suite를 내부 구현 확인 용도로 만들지 않는다. UI 구현 세부, React hook, Provider 값, 내부 호출 수와 고정 DOM 경로를 검사하지 않는다. 측정 수치의 임의 합격선을 만들지 않는다.

#### 실행 순서와 확인 기준

1. 현재 구조를 기준으로 문제가 재현되는 브라우저 과업과 성능 기준 자료를 기록한다. `/`와 `/batch-copy`의 직접 진입, 새로고침, 화면 안 뒤로가기와 브라우저 뒤로가기를 구분한다. 전체 `getAll()` 시간, 초안 조회, 첫 화면 표시, DOM 수, JavaScript heap, 스크롤 응답과 React commit 비용을 실제 사용자 자료로 기록한다. 메모 수만 바꾼 임의 fixture는 만들지 않는다.
2. 데스크톱 새 메모 행을 제거하고 두 제어를 캔버스 가장자리 위에 배치한다. 보드의 가용 높이는 application bar 아래 전체로 유지한다. 빈 overlay는 pointer 입력을 통과시키고 버튼 hitbox만 상호작용한다. 버튼 영역 밖의 메모 선택, 본문 편집, drag와 캔버스 pan이 유지되는지 확인한다.
3. 모바일 수집 초안은 새로고침 직후 평상시 메모 목록을 표시하고 이어가기를 명시적으로 실행할 때만 수집 화면을 연다. 확인 화면 진입은 `confirming` 초안을 저장한 뒤 `/batch-copy`로 이동한다.
4. 화면 내 뒤로가기에서는 확인 화면 표현을 유지한 채 `collecting` 초안을 저장하고 `/`로 이동한다. 저장 실패에서는 확인 항목과 순서를 보존하고 화면 안에서 다시 시도할 수 있어야 한다. 브라우저 뒤로가기도 메모 선택 화면에 도착하고 다음 확인 진입 때 편집한 순서를 복원한다. URL이 아직 `/batch-copy`인 동안 저장 목록 관리 화면이 나타나지 않는지 확인한다.
5. `/batch-copy` 직접 진입 또는 새로고침 때 `collecting` 초안이 있으면 관리 화면을 표시하지 않고 `/`의 메모 화면으로 정리한다. 저장 목록 관리 화면은 활성 수집 초안이 없을 때 기존 Drawer 링크로 연다.
6. 읽기와 화면 렌더 측정을 비교한다. 메모별 초안 조회가 병목이면 모바일 상세에 필요한 메모의 초안만 복구할 수 있지만 데스크톱 초안 복구는 보존한다. 화면 밖 layout/paint가 병목이면 `content-visibility: auto`와 실제 목록 카드 높이 기반 intrinsic size를 먼저 적용한다. React mount 또는 DOM 수가 계속 문제이면 목록의 보이는 구간만 렌더링하는 방식을 조사하고 keyboard focus, 화면 낭독기 탐색, 깊은 scroll과 복사/일괄 복사에 접근 가능한지 확인한다. 성능 수치가 좋아지고 UX 조건이 유지되면 다음 최적화는 추가하지 않는다.
7. 허용된 HTTPS 및 `localhost` HTTP에서 확인 문구가 보이지 않고 애플리케이션이 열리는지, 허용하지 않은 주소에서는 기존 안내가 보이는지 확인한다. 서버 HTML과 첫 브라우저 렌더 사이의 hydration 오류가 없는지도 같이 확인한다.
8. 사용 빈도, 분석, 템플릿과 설정 화면을 실제 콘텐츠로 검토해 같은 그룹을 둘러싼 중복 구분선만 제거한다. 표 행 구분, focus-visible, 오류 및 동작 중 상태, 제목과 내용의 정보 관계가 읽히는지 확인한다.
9. 저장 목록 관리 화면은 320 CSS px, `48rem` 미만, `48rem` 이상 `72rem` 미만과 `72rem` 이상에서 검토한다. 제목, 관리 조작, 목록과 하단 취소 및 복사 동작을 읽는 순서대로 두고 빈 상태, 로딩, 실패 및 재시도를 카드 외곽 없이 표현한다. 이동 가능한 각 항목의 조작 단위는 식별 가능하게 유지하되 페이지 바깥 카드, 중복 구분선, 모서리 및 그림자 사용은 디자인 시스템의 역할 기준에 따라 제거하거나 줄인다. 취소 뒤 저장 항목과 순서가 보존되고 복사는 현재 순서의 원문을 사용한다. 같은 자료를 쓰는 `presentation="panel"`은 시각 회귀가 없어야 한다. 기존 `BatchCopyList`의 재정렬과 항목 동작은 유지하며 저장 자료 복제, 새 Context 또는 의존성을 추가하지 않는다. `BatchCopyManagementProps`와 `{...props}` 중간 전달 제거를 확인한다.

#### 중단 조건과 순서

전체 메모 접근, 일괄 복사 입력, 데스크톱 초안 복구, 모바일 새로고침 복구 또는 브라우저 뒤로가기 동작을 보존할 수 없으면 변경을 멈추고 초안 상태를 바꾸는 코드를 다시 확인한다. 측정 없이 저장소 페이지네이션이나 외부 가상화 의존성을 추가하지 않는다. 새로고침 시 수집 화면을 자동으로 표시할지 사용자 요구보다 넓게 바꾸거나 확인 취소 의미를 변경하지 않는다. U35는 U21, U22, U23, U24, U32, U33과 U34에서 정한 화면 frame, 모바일 탐색, 동작 sheet, 문서 높이 및 보조 화면 내용을 선행 근거로 쓴다. 기존 절차의 완료 기록은 다시 쓰지 않는다.
- 초기 화면 오류에 표시된 루트 속성은 서버 응답과 확장 기능이 개입하지 않는 브라우저에서 나타나지 않았다. U4와 U11은 깨끗한 브라우저 profile에서 애플리케이션이 만든 hydration 불일치가 없는지 확인하고, 외부 DOM 변경이 의심되면 서버 응답과 hydration 뒤 DOM을 분리해 비교한다. 원인을 확인하지 않은 루트 `suppressHydrationWarning`은 사용하지 않는다.
- 메모 표면 재구축은 U13과 U15에 적용한다. 넓은 화면의 메모는 이동 핸들, 상시 편집 본문, 바로 보이는 복사와 더보기를 사용한다. 가장자리와 꼭짓점 drag의 크기 변경, `Command+클릭` 개별 복사, `Command+Option+클릭` 및 선택 지점의 `Command+Option+Enter` 일괄 복사 추가는 유지한다.
- 메모 선택과 속성 패널은 U2부터 U5, U11과 U15에 영향을 준다. 이동 핸들 click과 저장된 `1000..32767` 양의 `tabindex`가 낮은 순서를 따르는 `Tab` 탐색은 메모 하나를 선택한다. 키보드 포커스, 선택과 속성 패널 대상을 서로 구분하고 더보기의 속성 또는 선택 지점의 `Enter`가 패널을 연다. X, Y, 너비와 높이 초안의 기존 적용 절차와 범위는 유지하고 메모 표면에 숫자 입력을 추가하지 않는다.
- 후속 선택 및 이동 요구는 U2, U4부터 U6과 U11에 영향을 준다. 이동이 아닌 헤더 한 번 click과 `Tab` 탐색은 선택 테두리만 새로 표시하고, 헤더 더블클릭 또는 선택 지점에 포커스가 있는 선택된 메모의 `Enter`는 속성 패널을 연다. 빈 캔버스 click과 `Command`는 메모 선택 ID만 비운다. 상위 임시 조작이 없는 `Escape`는 메모 및 일괄 복사 항목 선택 ID를 함께 비운다. 메모 선택 ID와 속성 패널 대상 ID를 분리하며 drag를 시작한 pointer 연속 입력의 click 및 더블클릭을 실행하지 않는다. drag 중 패널 표시 여부와 캔버스 계산 크기를 애플리케이션 동작으로 바꾸지 않는다. `Command`를 누르는 동안에는 헤더 행 높이와 메모 크기를 유지한 채 헤더와 아이콘을 숨기고, 본문 보조 키 복사는 메모를 다시 선택하거나 속성 패널 대상을 바꾸지 않는다.
- 두 오른쪽 패널의 최근 활성 우선순위는 U2, U4부터 U7과 U11에 영향을 준다. 이동이 아닌 헤더 더블클릭 또는 선택된 메모의 선택 지점에서 실행한 `Enter`는 속성 패널을, 일괄 복사 동작은 일괄 복사 패널을 활성화한다. 한 번의 헤더 click, `Tab` 선택과 선택 해제는 최근 활성 패널을 바꾸지 않으며, 한 패널을 숨겨도 속성 패널 대상, 속성 초안, 일괄 복사 항목과 제거 이력을 지우지 않는다.
- 메모 삭제 복구는 U2, U3, U4, U5와 U11에 영향을 준다. 삭제 직후 메인 패널 중앙 하단의 5초 토스트에 결과와 `취소`를 표시하고, 보이는 동안 현재 실행의 LIFO 이력에서 최근 삭제부터 같은 원문, 위치, 크기와 겹침 순서로 복원한다. 새로고침에서는 이력을 지운다. 삭제된 메모에 포커스가 있었다면 다음 `tabIndex` 메모, 이전 메모와 새 메모 제어 순으로 옮긴다.
- 빈 캔버스의 주 pointer drag로 시점을 이동하는 변경은 U5와 U11에 영향을 준다. 이벤트 시작 지점이 메모 또는 다른 조작 요소가 아니면 변환되는 보드의 현재 경계 밖에서도 viewport가 조작을 이어받아야 한다.
- 일괄 복사 패널 재구축은 U17에 적용한다. 패널 머리를 약 `38px`로 유지하고 결합 미리보기, 숫자 순서, 상시 관리 버튼, 실행 취소 및 다시 실행 버튼을 표시하지 않는다. 각 항목은 이동 핸들과 더보기를 사용하고 앞뒤 삽입식 재정렬, 위치 변경, 복제와 삭제를 제공한다. 전체 복사 결과는 주 작업 영역 우측 상단에서 5초 동안 보여준다.
- 넓은 패널과 모바일 확인 페이지는 이동 핸들 drag와 키보드 대체 조작으로 같은 삽입 명령을 호출한다. 더보기의 `위치 변경`은 앞뒤 삽입 위치를 선택하게 한다. 메모 크기 변경은 오른쪽 속성 패널의 숫자 입력이 drag 없는 대안이다.
- 최신 선택 및 입력 복원 요구는 U2, U4, U5, U7과 U11에 영향을 준다. 일괄 복사 항목 선택 ID를 메모 선택과 분리하고, 항목 본문 click, `Enter`와 `Space`로 하나를 선택하며 선택된 본문의 `ArrowUp` 및 `ArrowDown`으로 한 자리씩 재정렬한다. 상위 임시 조작이 없는 `Escape`는 두 선택을 함께 해제한다. 운영체제 단축키 뒤에는 `keyup`, `blur`, `visibilitychange`와 pointer 종료 event가 모두 온다고 가정하지 않고, 의미가 `Meta`인 신뢰할 수 있는 event에서 헤더 상태를 다시 맞춘다. pointer 완료는 중복 종료 신호에서 한 번만 확정하며 `pointerup` 뒤 정상적인 `lostpointercapture`가 결과를 되돌리지 않게 한다.
- 모바일 상세 화면은 IndexedDB 복구 초안을 사용하고 저장 전 내부 이동에 계속 편집 및 변경사항 버리기를 제공한다. 모바일 일괄 복사는 기존 저장 목록과 분리한 하나의 IndexedDB 작업 초안이며, 예기치 않은 이탈과 새로고침에서 복원하고 명시적 뒤로가기 및 `취소`에서 지운다. 확인 항목 복제는 대상 바로 뒤에 넣고 수집 상태의 길게 누르기는 아무 동작도 실행하지 않는다.
- 구현 필수 결정 재검토로 U2, U3, U5부터 U7과 U11의 이전 중단 조건을 해소했다. 800ms 자동 저장, 위치와 크기를 분리한 geometry, `72rem` 패널 전환, `12rem` 목록 미리보기 상한, mouse 및 pen `5 CSS px`와 touch `10 CSS px`의 직접 이동 기준, 500ms 길게 누르기는 표준값이 아닌 초기 설정값이므로 실제 브라우저 검증에서 재검토 조건을 확인한다.
- 사용자에게 보이는 기능명은 `일괄 복사`, 단일 메모 Clipboard 쓰기는 `개별 복사`로 통일한다. 새 TypeScript 이름은 `BatchCopy`를 사용하고 기존 `ordinaryCopy`, `accumulation` 및 `metaClickEnabled` record는 자료를 보존하는 변환을 U2와 U3에서 먼저 설계한다. 일괄 복사 자료를 저장하는 IndexedDB object store 이름은 `batchCopyLists`를 사용한다.
- 일괄 복사 확인과 저장 목록 관리의 기준 주소는 `/batch-copy`다. 모든 애플리케이션 링크와 이동은 이 주소만 사용하며, `/accumulator` 화면이나 redirect를 제공하지 않는다. 이전 schema에 저장된 일괄 복사 자료는 U3의 `versionchange`에서 저장소 이름을 `batchCopyLists`로 한 번 바꿔 보존한다.
- 직접 입력 상태 요구는 U4부터 U6, U10과 U11에 영향을 준다. 넓은 화면 및 모바일 상세의 메모 본문, 템플릿 원문과 이름, 플레이스홀더 이름 및 치환값, 속성 패널 수치와 설정 checkbox를 과업별 React Hook Form으로 옮긴다. 저장과 Clipboard event는 실행 시점에 `getValues`로 읽고, 대상이나 외부 revision을 반영하는 `reset`은 dirty 값 보존 조건을 화면별로 정한다. 일괄 복사 작업과 포인터 제스처를 폼으로 옮기지 않는다.

#### 절차별 진행 기록

- [x] 절차 1: `pnpm notes:build`, `pnpm notes:lint`, `pnpm notes:typecheck`, `pnpm notes:test`가 통과했다. 기존 Chromium 과업 두 건도 통과했으나, 확인 화면에서 돌아오는 순간 관리 화면이 잠시 보이는지와 수집 초안을 둔 채 새로고침했을 때 나타나는 화면은 아직 검사하지 않았다. 메모 화면으로 돌아가기 명령은 초안을 저장하면서 단계를 바꾸므로 확인 화면 조건을 벗어난다. 이에 따라 `/batch-copy`가 관리 화면을 그릴 수 있음을 코드에서 확인했다. 실제 사용자 메모를 확인할 수 없어 목록 성능은 측정하지 않았다. 임의의 대량 자료는 만들지 않았다.
- [x] 절차 2: 높이를 차지하던 새 메모 행을 없애고 새 메모 버튼을 캔버스 왼쪽 위에 배치했다. Chromium 과업에서 메모 영역이 주 작업 영역 높이를 유지하고 새 메모 추가와 일괄 복사 패널 열기가 동작함을 확인했다. 기존 확대 및 화면 밖 메모 과업도 통과했다. 운영 빌드, lint와 타입 검사가 통과했다.
- [x] 절차 3: 수집 초안 저장 여부와 현재 수집 화면 표시를 분리했다. 새로고침 뒤 일반 메모 화면과 `일괄 복사 이어가기`가 보이고, 이어가기를 누르면 저장된 항목과 횟수가 복원된다. 기존 Chromium 과업을 실제 메모 생성, 두 번 추가, 새로고침, 이어가기 순서로 확장했다. 이 브라우저 과업과 운영 빌드, lint, 타입 검사가 통과했다.
- [x] 절차 4: 화면 안 뒤로가기는 저장 중 기존 확인 화면을 유지하고 저장 실패 때에도 확인 화면에서 재시도할 수 있게 했다. 브라우저 뒤로가기는 일반 메모 화면에 도착하며 관리 화면이나 수집 작업 도구가 나타나지 않고, `일괄 복사 계속하기`로 확인 화면에 재진입하면 현재 항목 순서가 복원된다. 고유한 메모 두 개와 반복 항목을 사용한 기존 Chromium 과업, 운영 빌드, lint와 타입 검사가 통과했다.
- [x] 절차 5: `/batch-copy`에서 수집 초안 복구를 기다리는 동안 저장 목록 관리 화면을 숨기고, 수집 중인 초안이면 `replace`로 메모 화면에 정리한다. 확인 화면에서 메모 선택으로 돌아가는 전환은 이 판단에서 제외한다. 모바일 Chromium 과업에서 새로고침 뒤 직접 `/batch-copy/`에 진입해 메모 화면과 이어가기 상태로 돌아오는지 확인했고, `batch-copy.spec.ts` Chromium 7개 과업, 운영 빌드, lint와 타입 검사가 통과했다.
- [ ] 절차 6: 대표 실제 메모 자료에 접근할 수 없어 조회, 초안 복구, 첫 화면, DOM, heap과 스크롤 비용의 실측은 보류한다. 브라우저 과업에서 생성한 메모를 성능 기준 자료로 취급하거나 임의 대량 fixture를 만들지 않았으며, 측정 전에는 렌더 최적화를 적용하지 않는다. 실제 자료를 사용할 수 있을 때 이 절차를 재개한다.
- [x] 절차 7: 주소 확인 중에는 진행 문구 없이 동일한 빈 main shell을 서버와 첫 브라우저 렌더에 사용한다. HTTPS와 localhost HTTP에서는 메모 화면이 열리고, 그 밖의 주소 안내와 provider 차단은 유지된다. 첫 화면 hydration 및 주소 안내 Chromium 과업 두 건, 운영 빌드, lint와 타입 검사가 통과했다.
- [x] 절차 8: 사용 빈도와 분석의 빈 상태 및 목록, 저장 템플릿의 바깥선을 줄이고 표와 목록 행 구분은 유지했다. 템플릿 작성 및 입력과 설정의 장식용 위아래 선을 제거하고 화면 간격으로 내용을 묶었다. 빈 상태, 오류 복구, 입력 및 화면 이동을 확인한 Chromium 과업 29개, 운영 빌드, lint와 타입 검사가 통과했다.
- [x] 절차 9: 저장 목록 관리의 중간 전달 컴포넌트와 `{...props}`를 없애고 `BatchCopyEditingView`에 필요한 값을 직접 전달했다. 빈 화면은 제목이 아닌 상태 문구로 표시하고, 독립적으로 조작하는 목록 항목 표면과 메모 화면 패널 표현은 바꾸지 않았다. 취소, 복사와 항목 순서 변경을 포함한 Chromium 과업 7개가 320, 640, 900, 1280 CSS px에서 통과했고 운영 빌드, lint와 타입 검사도 통과했다.

### 현재 코드 검토 결과에 따른 선행 정리

현재 코드 검토에서 확인한 다음 문제를 기존 기능을 확장하기 전에 순서대로 해결한다. 각 묶음은 변경 뒤 적용 가능한 자동 검사와 브라우저 결과를 최대 두 차례 검토하고, 통과한 커밋을 만든 뒤 다음 묶음으로 이동한다.

1. 초기 화면 오류를 확장 기능이 개입하지 않는 브라우저 profile에서 다시 확인한다. 서버 응답, hydration 뒤 루트 DOM과 console을 비교하고 애플리케이션이 만든 차이가 없으면 외부 DOM 변경으로 분류한다. 루트 경고 억제로 차이를 숨기지 않는다.
2. 배포와 검증 책임을 바로잡는다. 정적 사이트 전용 설정, 자체 정적 서버와 거대한 기본 실행 스크립트를 제거하고, Next.js 운영 서버와 과업별 Playwright Test로 바꾼다. 사용자 결과와 무관한 IndexedDB store 이름, record shape, DOM 순서와 고정 대기 시간 검사는 옮기지 않는다.
3. 메모 편집 중 component가 revision 변화로 다시 mount되지 않게 key를 메모 식별자와 표현 종류에만 연결한다. 넓은 화면의 읽기 요소와 별도 편집 상태를 상시 `textarea`로 바꾸고, 기존 완료 UI를 제거한다. 제스처 중 geometry는 일시 상태로만 두고 저장 완료 뒤에는 provider가 준 geometry를 사용해 외부 변경도 반영한다. IME, 커서, 자동 저장과 저장된 배치를 실제 브라우저에서 확인한다.
4. 기존 이동 및 geometry 버튼을 제거하고 짧은 메모 헤더, 맨 앞으로, 맨 뒤로와 삭제 아이콘, 네 가장자리 및 네 꼭짓점 resize를 추가한다. 이동이 아닌 헤더 한 번 click과 `tabindex` 기반 `Tab`은 선택 테두리만 표시하고, 헤더 더블클릭 또는 선택 지점에 포커스가 있는 선택된 메모의 `Enter`는 속성 패널을 연다. 빈 캔버스 click은 메모 선택만 해제하고 상위 임시 조작이 없는 `Escape`는 메모 및 일괄 복사 항목 선택을 함께 해제한다. drag 뒤 click을 억제하고 이동 중 패널 표시 여부와 캔버스 계산 크기를 유지한다. `zIndex`는 `1..N`으로 전체 재정렬해 한 transaction에서 저장하고 원문 content revision 및 `tabIndex`를 바꾸지 않는다. 삭제는 LIFO 복구 스냅샷과 5초 토스트의 `취소`가 함께 동작할 때만 완료한다.
5. Clipboard adapter는 API 부재, 권한 거절과 그 밖의 쓰기 실패를 구분한 결과를 돌려준다. 넓은 화면의 `Command+클릭`은 개별 복사, `Command+Option+클릭`은 일괄 복사 항목 추가로 분리하고 두 명령이 함께 실행되지 않게 한다. `Command` keydown은 선택만 해제하고 메모 크기를 유지한 채 헤더를 숨기며, 기본 동작을 막지 않는다. 두 본문 동작이 메모 선택으로 전파되지 않게 한다. 알림은 원인에 맞는 다음 행동과 같은 텍스트의 재시도를 제공한다.
6. 기존 `ordinaryCopy`, `accumulation`과 `metaClickEnabled` record를 새 조작 의미에 맞는 이름으로 읽는 자료 변환을 설계한다. 이전 일괄 복사 object store는 한 번의 `versionchange`에서 `batchCopyLists`로 이름을 바꾸고, 변경 뒤에는 이전 저장소나 우회 읽기 경로를 남기지 않는다. 저장된 메모, 항목, 순서, 횟수와 설정을 잃지 않는 검증 자료를 기존 테스트 안에서 구성하고 변환 전후 값을 확인한다.
7. 작은 화면의 상시 편집과 long-press 항목 선택을 제거하고, 제한된 높이 목록, 짧은 누르기 상세 이동, 길게 누르기 개별 복사와 목록 헤더의 일괄 복사 상태를 추가한다. 같은 메모의 반복 입력도 순서와 클릭 횟수에 반영하고, 헤더 뒤로가기와 하단 `초기화` 및 `다음`을 구분한다. `다음`은 저장 목록과 분리한 IndexedDB 작업 초안의 확인 단계와 현재 순서를 저장한 뒤 확인 페이지로 이동한다.
8. 나란한 패널과 저장 목록 관리 페이지가 함께 쓰는 편집 명령, 이력, 전체 복사와 목록 UI는 역할에 맞게 이름을 바꾼 공통 feature가 맡고, 모바일 확인 작업의 재정렬, 복제와 삭제는 원본 메모 repository를 알지 못하는 별도 작업 사본 명령으로 둔다. 항목 추가 feature는 시작 입력과 transaction만 맡으며 이전 long-press 선택 연결을 새 흐름에 재사용하지 않는다.
9. `shared/lib/clipboard`, `shared/lib/join-class-names`와 `shared/lib/grapheme`에는 허용 책임과 제외 책임을 설명하는 짧은 README를 둔다. public API 밖의 내부 파일을 가져오거나 개인 메모 업무 규칙을 공통 라이브러리로 옮기지 않는다.
10. 테스트 이름과 검증문은 실제로 확인하는 결과만 설명하도록 맞춘다. 전체 텍스트 복사 검사는 정확한 Clipboard 문자열만 주장하고, 사용 빈도 projection은 메모 ID, content revision, 원문 스냅샷과 세 횟수를 행 순서와 무관하게 확인한다.
11. Worker 응답은 원래 요청의 `requestId`, `algorithm`, 입력 메모 집합과 결과의 두 줄 참조에 묶어 검증한다. 누락 및 중복 입력, 자기 비교, 입력 밖 참조, 같은 쌍의 역순 중복과 비결정적 순서를 거절한다. Worker 오류, 잘못된 메시지, 종료 시 대기 중인 요청 거절과 최신 실행만 수락하는 경합을 각각 확인한다.
12. Worker는 결과가 참조하는 표시 원문을 줄마다 한 번 응답에 포함하고, 결과 쌍에는 줄 참조만 넣어 같은 문자열을 반복 전송하지 않는다. 주 실행 흐름은 검증된 참조와 원문을 연결할 뿐 줄 정규화와 조합 생성을 다시 수행하지 않는다. 대표 입력 측정에서 차이가 확인된 grapheme 수와 n-gram 집합은 한 분석 실행 안에서 줄별로 지연 생성해 재사용한다.
13. Provider value와 callback의 참조 변화는 React Profiler로 실제 영향을 확인하기 전에는 `useMemo`나 `useCallback`을 일괄 추가하지 않는다. 측정에서 불필요한 consumer render가 확인되면 상태와 command Context 분리 또는 안정화 가운데 책임이 더 분명한 방법을 적용한다.
14. 사용자가 직접 편집하는 메모 본문, 템플릿 원문과 이름, 플레이스홀더 이름 및 치환값, 속성 패널 수치와 설정 checkbox의 현재 값과 입력 상태를 과업별 React Hook Form으로 옮긴다. 자동 저장과 IndexedDB 복구, 패널 전환, Clipboard 및 일괄 복사 작업 상태는 기존 책임과 동작을 유지한다. 템플릿의 교차 field 오류는 현재 이름 전체로 다시 계산해 이름 수정과 일반 텍스트 복원 직후 오래된 오류가 남지 않게 한다.
15. 알림 종료를 저장소 재시도와 분리하고, 메모 삭제 취소는 삭제 완료 시각에서 계산한 원래 5초를 route 이동 뒤에도 유지한다. 비동기 복원은 시작한 스냅샷만 정리한다. 일괄 복사 제거 및 다시 실행은 성공 결과에 대상 ID를 포함해 조립 지점에서 선택을 한 번 정리하고, 선택하지 않은 항목의 drag는 거리 기준을 넘을 때 대상을 선택한다. 전역 `Escape`는 보조 키와 IME 조합이 없을 때만 두 선택을 해제하며, `visibilitychange`의 두 방향에서 일시적인 `Command` 표시를 복원한다. 캔버스 pan은 pointer 수명 event, 창 `blur`, `pageshow`, 양방향 `visibilitychange` 및 다음 pointer 시작에서 남은 제스처만 정리하고 마지막 시점을 유지한다. 창 `focus` 하나만으로는 종료하지 않는다. 방향키 이동은 같은 문구가 반복돼도 live region에 새 변경을 만들고, 저장 목록 관리 검사는 두 항목의 유효한 이동과 새로고침 뒤 순서를 확인한다. IndexedDB migration 검사는 새 범위 안의 이전 geometry를 보존한다.

U4의 시각 및 접근성 승인 결과는 자동 검사나 에이전트 검토만으로 만들지 않는다. 승인 결과가 없다는 사실은 다른 코드 결함 수정의 중단 사유가 아니지만, 최종 완료 판정은 `needs human input`으로 유지한다.

## 결정 이력과 현재 선택

각 선택의 검토안, 변경 이유, 영향과 다시 검토할 조건은 다음 결정 기록이 관리한다. 계획은 결정의 결과를 연결할 뿐 이력을 다시 요약해 다른 기준을 만들지 않는다.

- [구현 필수 결정 교차검증](references/required-implementation-decisions-research.md): 자동 저장, 자료 수명, 양의 `tabindex`, geometry, 화면 전환, 목록 미리보기, 삭제 복구, 직접 이동 및 길게 누르기 판정과 drag 대안의 공식 근거, 제품 수치와 재검토 조건
- [메모 복사와 편집 동작](decisions/note-copy-and-edit.md): 넓은 화면의 상시 편집과 800ms 자동 저장, `Command+클릭` 개별 복사, 작은 화면의 상세 편집 및 복구 초안과 길게 누르기
- [일괄 복사 실행 동작](decisions/accumulation-activation.md): `Command+Option+클릭` 항목 추가와 작은 화면의 명시적 일괄 복사 상태
- [공간형 보드와 작은 화면 목록](decisions/responsive-note-presentation.md): 메모 영역의 inline size `48rem`을 기준으로 한 표현 전환, 위치 제한 없는 메모 배치와 크기 조건 및 빈 캔버스 시점 이동
- [메모 선택과 속성 편집](decisions/note-selection-and-properties.md): 헤더 한 번 click 및 관리된 양의 `tabindex` 순서, 패널 활성화와 포커스, 선택 및 패널 대상 구분, 수치 적용과 패널 닫기
- [메모 삭제와 복구](decisions/note-removal-recovery.md): 즉시 삭제, 5초 취소 토스트, 현재 실행의 LIFO 이력과 삭제 뒤 포커스
- [일괄 복사 순서와 제거 복구](decisions/accumulator-ordering-and-recovery.md): 추가 당시 원문, 데스크톱 항목 선택, drag 및 방향키 재정렬, 모바일 항목 교환과 실행 중 제거 이력
- [일괄 복사 패널과 모바일 확인 페이지](decisions/accumulator-workspace-panel.md): 간소화한 넓은 화면 패널, 고정된 복사 결과 알림과 작은 화면의 일괄 복사 상태 및 별도 확인 페이지
- [메모 Tab 순서, 항목 동작 팝오버와 모바일 지연 재정렬 조사](references/tab-order-popover-and-mobile-reorder-research.md): `tabindex`와 시각적 겹침의 분리, 내려받은 `.fig`의 팝오버 시각 비교와 지연 drag 상태
- [로컬 저장과 실행 중 상태](decisions/local-storage-and-ephemeral-state.md): 기준 자료, 메모 및 모바일 작업 복구 초안과 실행 중 이력의 수명, 공통 Provider와 다중 저장 transaction 책임
- [텍스트 사용 빈도 집계](decisions/usage-counting.md): 메모 ID, content revision과 원문 상태별 두 횟수 및 성공 조건
- [줄 단위 텍스트 분석](decisions/text-analysis.md): 줄 정규화, 정확한 반복, 포함 관계와 grapheme 3-gram Jaccard 정렬
- [템플릿 제안 생성](decisions/template-suggestion.md): 결과 행의 두 원문 전달, 결정적 차이 분석과 범위 선택 기반 수동 작성
- [로컬 실행과 텍스트 분석 Worker](decisions/local-runtime-and-analysis-worker.md): 별도 애플리케이션 백엔드와 데이터베이스 서버 없이 동작하는 로컬 모드, Next.js Node.js 서버와 요청 뒤 만드는 Dedicated Worker
- [모듈별 TDD와 동작 검증](decisions/verification-strategy.md): 순수 규칙만 TDD로 개발하고 브라우저 기능은 실제 실행 결과로 확인하는 분류
- [애플리케이션 패키지 위치와 FSD 구조](decisions/application-package-and-fsd.md): `apps/notes/` 패키지, 얇은 Next.js 라우트와 필요한 FSD 계층만 만드는 구조
- [개인 메모 디자인 시스템과 UI 기반](decisions/application-design-system.md): Tailwind CSS, 네이티브 폼 요소와 자체 `shared/ui`, 그리고 폼과 무관한 접근성 부품의 제한적 사용
- [집중형 텍스트 유틸리티 작업 화면](decisions/focused-text-utility-workspace.md): 본문 및 복사 우선순위, 역할 기반 토큰, 메모와 일괄 복사 제어 배치
- [집중형 텍스트 유틸리티 디자인 시스템 조사](references/focused-text-utility-design-system-research.md): 현재 구현 차이, 접근성 근거와 적용 범위
- [노트 서비스 디자인 시스템](../../../apps/notes/DESIGN.md): 구현에서 사용할 색, 글자, 간격, 표면과 상태 규칙
- [직접 입력 상태 관리](decisions/form-input-state-management.md): 과업별 React Hook Form, 입력값의 단일 책임, 이벤트 시점 읽기, 기본값 교체와 폼 밖 application 상태
- [이전 시각 방향의 대체 기록](decisions/figma-inspired-visual-direction.md): 유지하는 글자 및 접근성 결정과 폐기한 시각 규칙

초기 권장안을 다시 검토하면서 viewport `768px` 고정값, 전체 메모 revision만 사용하는 방식과 보편적인 Jaccard 합격 임계값은 채택하지 않았다. 메모 안의 누적 버튼을 유지하던 선택은 화면 사용 검토에서 취소했다. 변경 근거와 재검토 조건은 각각 연결된 결정 기록에 남아 있다.

## 범위

### 이번 계획에 포함하는 결과

- 독립 실행하는 Next.js 빌드 결과물
- HTTPS URL과 호스트 이름이 정확히 `localhost`인 HTTP URL에서의 로컬 실행
- 공간형 메모 보드와 작은 화면의 생성 순서 목록
- 넓은 화면의 메모 작성, 붙여넣기, 상시 편집, 헤더 이동, 겹침 순서 및 크기 변경
- 넓은 화면의 헤더 한 번 click 및 `Tab` 메모 선택, 헤더 더블클릭과 선택 지점의 `Enter`로 여는 오른쪽 속성 패널의 위치 및 크기 변경, 빈 캔버스 click, `Escape` 및 `Command` 선택 해제
- 헤더 drag 중 캔버스 크기 유지와 `Command` 상태의 헤더 비노출 및 선택 억제
- macOS가 `Command` key event 일부를 전달하지 않은 뒤의 헤더 상태 복원, 보조 키 복사와 캔버스 시점 유지
- 즉시 메모 삭제와 토스트 `취소`를 통한 복원
- 넓은 화면의 `Command+클릭` 개별 복사와 `Command+Option+클릭` 일괄 복사 항목 추가
- 작은 화면의 제한된 높이 목록, 상세 route 편집 및 저장과 길게 누르기 개별 복사
- 작은 화면의 일괄 복사 상태, 헤더 뒤로가기, 하단 `초기화` 및 클릭 횟수가 표시되는 `다음`, 길게 누른 뒤 재정렬 및 항목별 위치 변경, 복제와 삭제를 제공하는 확인 페이지, 평상시 메모 목록 Drawer의 저장 항목 수 링크
- 일괄 복사 순서 변경, 제거와 제거 복구
- 개별 복사, 일괄 복사와 합계로 구분한 사용 빈도
- 사용자가 명시적으로 요청하는 줄 단위 텍스트 분석
- 자동 제안과 수동 플레이스홀더를 모두 지원하는 템플릿 및 일회성 결과
- 현재 주소에서 앱을 열 수 없다는 사실과 다시 열 수 있는 주소 조건, Clipboard 실패를 설명하는 알림
- Tailwind CSS, 의미 기반 디자인 토큰과 자체 `shared/ui`로 만든 개인 메모 디자인 시스템
- 왼쪽 사이드바 없이 메모 작업 영역을 우선하는 메모 화면과 상단 탐색

### 이번 계획에서 제외하는 결과

- 계정, 로그인, 동기화, 원격 API, PostgreSQL과 그 UI
- 현재 사용자 과업에 필요하지 않은 Server Actions, 동적 Route Handlers, 요청 시점 서버 렌더링과 Next.js 서버 캐시
- TanStack Query, SharedWorker, 범용 DI 컨테이너와 실제 코드가 없는 FSD 계층의 선제 도입
- 의미 유사성 분석과 LLM 사용
- URL 자동 링크, 이동, 미리보기와 메타데이터
- 자료 내보내기, 가져오기와 브라우저가 지운 자료의 복구
- 라이브러리 패키지 및 포트폴리오 애플리케이션 연결

## 구현 구조

### 패키지와 계층 배치

```text
apps/notes/
  package.json
  app/                         Next.js App Router와 framework 파일
    layout.tsx
    page.tsx
    notes/[noteId]/page.tsx
    usage/page.tsx
    analysis/page.tsx
    templates/page.tsx
    settings/page.tsx
    batch-copy/page.tsx
  src/
    _app/                      provider, 조립, 전역 스타일
    _pages/                    화면별 slice
      notes/
      note-detail/
      usage/
      analysis/
      templates/
      settings/
      batch-copy/
    features/                  여러 화면에서 재사용하는 사용자 동작만 배치
    entities/                  메모, 일괄 복사, 사용 기록, 템플릿과 사용자 설정 자료 및 규칙
    shared/                    공통 UI와 브라우저 기술 연결
```

`apps/notes/app/`의 route 파일은 `apps/notes/src/_pages/`의 `index.ts`를 연결한다. `apps/notes/app/layout.tsx`는 `apps/notes/src/_app/`의 provider와 전역 스타일을 연결한다. route 파일에 화면 동작, IndexedDB 접근이나 메모, 일괄 복사 및 템플릿 규칙을 구현하지 않는다. `_app/composition`이 화면 slice의 provider, 책임별 interface와 브라우저 구현을 가져올 때에는 그 slice의 `composition.ts`를 사용해 route UI를 조립 모듈 그래프에 함께 넣지 않는다. `_pages/notes`, `_pages/note-detail`과 `_pages/batch-copy`는 서로 가져오지 않으며, 화면들이 함께 사용하는 메모 저장 및 일괄 복사 목록 동작은 실제 재사용이 확인된 feature 또는 entity command로 둔다.

FSD 계층 의존 방향은 `_app`, `_pages`, `features`, `entities`, `shared` 순서다. 한 slice는 같은 계층의 다른 slice를 직접 가져오지 않고 더 아래 계층만 가져온다. Entities 사이의 자료 관계를 type으로 직접 표현해야 할 때에만 `@x` public API를 예외로 사용한다. 다른 slice에서는 명시적 export를 둔 public API만 사용하고, 같은 slice 안에서는 자신의 public API를 거치지 않는 상대 경로를 사용한다. 화면 한 곳에서만 쓰는 UI와 동작은 그 화면의 `_pages` slice에 남기고, 여러 화면에서 실제로 다시 사용하는 사용자 동작만 `features`로 분리한다. `widgets`와 폐기된 `processes` 계층은 현재 만들지 않으며, 실제 파일이 없는 계층이나 segment도 만들지 않는다.

브라우저 구현은 `_app/composition`에서 만들고 명시적인 속성을 가진 의존성 객체로 각 책임을 가진 slice의 provider에 전달한다. `_app/providers`의 `PersonalNotesProvider`가 이 provider를 공통 layout 아래에서 한 번 조립하지만, 아래 계층은 `_app`을 가져오지 않는다. React에서는 책임이 제한된 provider와 기능별 hook으로 의존성을 전달해 Props Drilling을 피한다. 문자열 token으로 전역 객체를 찾는 범용 Service Locator는 만들지 않는다. Context는 의존성을 임의 조회하는 저장소가 아니라 조립 지점에서 만든 명시적 동작만 전달한다.

`PersonalNotesProvider`는 명시적인 Client Component 진입점이며 공통 루트 layout의 자식에서 한 번 유지한다. Client Component도 정적 빌드 중 미리 렌더링될 수 있으므로 `createLocalApplication`과 각 브라우저 구현의 생성 과정에서는 `navigator`, `indexedDB`, `window`나 Worker를 읽지 않는다. 이 브라우저 전역은 실제 읽기, 쓰기 또는 분석을 브라우저에서 시작할 때만 접근한다.

`Port`, `Adapter`, `Manager`처럼 역할을 다시 알아내야 하는 이름을 기본값으로 사용하지 않는다. `NoteRepository`, `ClipboardWriter`, `TextAnalyzer`처럼 수행하는 책임을 이름에 적고, 브라우저 구현은 `IndexedDbNoteRepository`, `BrowserClipboardWriter`, `WorkerTextAnalyzer`처럼 기술과 책임을 함께 나타낸다.

U1에서 [애플리케이션 패키지 위치와 FSD 구조 결정](decisions/application-package-and-fsd.md)에 따라 `apps/notes/`, package manager, 저장소 workspace 선언과 잠금 파일을 추가했다. 다음 작업은 현재 구조와 설정을 기준으로 삼으며, 라이브러리 패키지 또는 포트폴리오 연결 백로그를 위해 workspace 책임을 미리 넓히지 않는다.

각 slice와 slice가 없는 계층의 segment는 필요한 항목만 내보내는 public API를 둔다. `_pages`의 `index.ts`는 route UI만 내보내고, `_app`이 조립할 provider, interface와 브라우저 구현이 있으면 `composition.ts`가 그 항목만 내보낸다. 현재 로컬 애플리케이션은 server-only 자료 접근이나 실행 시점 서버 구현을 갖지 않으므로 `index.server.ts`와 `index.client.ts`를 대칭으로 만들지 않는다. 이후 실제 server-only export가 공통 진입점을 통해 브라우저 모듈 그래프에 들어가는 문제가 생길 때에만 명시적인 환경별 진입점을 추가한다.

### 디자인 시스템과 UI 구성 원칙

[개인 메모 디자인 시스템과 UI 기반 결정](decisions/application-design-system.md)에 따라 `_app/styles`는 전역 CSS, Tailwind CSS 연결과 의미 기반 디자인 토큰을 관리한다. `shared/ui`에는 개인 메모 업무 자료를 알지 못하는 네이티브 폼 제어와 상태 표현을 두고, 승인받은 외부 접근성 부품이 있다면 폼과 무관한 구성요소로 감싼다. `_app/ui`에는 탐색처럼 애플리케이션 전체 조립 위치를 알아야 하는 UI만 둔다. 현재 route를 기준으로 메모 화면에는 상단 탐색을, 나머지 화면에는 왼쪽 탐색을 조립하되 두 표현은 같은 이동 대상과 현재 위치 판정을 사용한다.

[Pretendard와 Figma식 작업 화면 결정](decisions/figma-inspired-visual-direction.md)에 따라 제목과 본문을 포함한 모든 인터페이스 글꼴은 Pretendard를 사용한다. 공통 탐색, 도구 영역과 패널은 중립적인 애플리케이션 프레임으로 보이게 하고, 메모가 놓이는 작업 캔버스만 낮은 대비의 밝은 목재 인상을 사용한다. 메모와 제어 요소는 종이 비유 대신 중립색 표면, 얇은 테두리와 절제된 깊이로 캔버스에서 구분한다.

단순 폼 구성요소는 실제 `button`, `input`, `textarea`와 `select`를 렌더링하고 checkbox는 `input[type="checkbox"]`로 렌더링하며, 네이티브 속성과 ref를 전달한다. Tailwind CSS로 고유 외형을 적용하므로 네이티브 요소 선택을 브라우저 기본 스타일 사용으로 해석하지 않는다. 외부 접근성 부품은 폼 입력값을 만들지 않는 복합 상호작용에 필요성이 확인된 경우에만 외부 부품을 감싸는 `shared/ui` 구성요소 안에서 가져온다. 화면과 업무 동작을 구현하는 모듈은 외부 UI 패키지를 직접 가져오지 않는다.

디자인 토큰은 색, 글자, 간격, 모서리, 테두리, 깊이, motion, 포커스와 제어 요소 크기의 용도를 나타낸다. 각 구성요소에 적용 가능한 기본, hover, `focus-visible`, pressed, disabled, 오류, 진행 중, 고대비와 reduced motion 상태를 정의한다. 실제 콘텐츠와 대표 상태의 시각 및 접근성 승인이 기록되기 전에는 화면마다 임의 값이나 외부 기본 테마로 스타일을 확장하지 않는다.

보이는 문구마다 내용 식별, 동작 또는 입력 이름, 조건, 상태 또는 결과, 오류 뒤 행동 가운데 맡는 역할을 확인한다. 어느 역할도 없거나 같은 영역의 제목, 컨트롤 및 상태 표현과 같은 내용을 반복하면 삭제하거나 합친다. Next.js, Worker, IndexedDB와 빌드 결과는 검증 근거에만 남기고 사용자 화면에는 쓰지 않는다.

카드 형태는 항목 전체가 독립된 대상이고 선택, 이동 또는 상세 이동을 전달하는 경우에만 사용한다. 진행 상태, 빈 상태, 단일 오류, 페이지 전체 폼과 한 화면의 유일한 콘텐츠는 둥근 외곽, 채운 배경과 그림자로 반복해서 감싸지 않는다. 관련 내용은 제목, 여백, 정렬과 구분선을 우선해 묶고, dialog, popover와 toast는 각 의미와 포커스 규칙을 가진 별도 상호작용 계층으로 다룬다.

### 자료와 실행 중 상태

```text
IndexedDB
  notes: 원문, 전체 revision, content revision, tabIndex, geometry와 생성 시각
  note drafts: 기준 메모, 저장 전 원문과 수정 시각
  batch copy: 현재 항목, 원문 스냅샷, 순서와 구분자
  mobile batch copy draft: 단계, 작업 항목, 클릭 횟수와 수정 시각
  usage: 메모 ID, content revision과 원문 상태별 개별 및 일괄 복사 횟수
  templates: 사용자가 저장한 segment와 metadata
  preferences: Command+Option+클릭 일괄 복사 사용 여부

애플리케이션 실행 중 메모리
  일괄 복사 항목 제거 undo 및 redo
  선택한 메모 ID, 선택한 데스크톱 일괄 복사 항목 ID, 최근 활성 오른쪽 패널과 속성 입력 초안
  삭제한 메모의 LIFO 복구 스냅샷
  분석 요청, 진행 상태와 결과
  저장 전 템플릿 제안
  일회성 텍스트 결과
```

IndexedDB transaction의 `complete`가 확인된 뒤에만 저장 성공으로 처리한다. 라우트 이동은 실행 중 상태를 유지하고 메모 및 모바일 일괄 복사 초안은 새로고침에서도 복원한다. 제거 undo 및 redo, 메모 삭제 복구 이력과 나머지 실행 중 상태는 새로고침에서 초기화한다. HTTP와 HTTPS, 서로 다른 port는 origin이 달라 같은 IndexedDB 자료를 공유하지 않으므로 두 접속 방식의 검증은 각각 독립된 자료로 수행한다.

기존 record 속성은 보존 변환이 완료될 때까지 이전 schema로도 읽을 수 있게 한다. 일괄 복사 object store는 같은 `versionchange` transaction에서 `batchCopyLists`로 이름을 바꾸며 기존 key와 record를 보존한다. 변경이 완료된 뒤에는 TypeScript 자료형, repository와 물리 저장소 모두 `BatchCopy` 계열 이름만 사용하고 이전 저장소 또는 우회 읽기 경로를 두지 않는다.

### 개별 복사와 일괄 복사 흐름

```text
넓은 화면 본문 Command+클릭 또는 모바일 목록 길게 누르기
  -> Clipboard 쓰기
  -> 성공하면 개별 복사 횟수 저장
  -> 횟수 저장 실패 시 복사 성공은 유지하고 기록 실패 알림

허용된 Command+Option+클릭
  -> 현재 원문과 content revision 스냅샷
  -> 일괄 복사 항목 추가와 해당 횟수 증가를 한 transaction으로 저장
  -> transaction 전체가 완료되면 목록과 항목 수 갱신

넓은 화면 메모 원문 입력
  -> 제어 초안을 동기적으로 갱신하고 메모를 dirty 상태로 표시
  -> 마지막 입력 800ms 뒤 최신 원문을 note draft에 기록
  -> note 저장 transaction 완료 뒤 대응 draft 제거
  -> blur, 애플리케이션 내부 이동, document hidden과 pagehide에서는 대기 없이 같은 저장 흐름 실행
  -> 실패하면 최신 입력과 draft를 유지하고 본문을 가리지 않는 재시도 제공

모바일 목록 화면 헤더 아이콘
  -> 저장 목록과 분리된 빈 일괄 복사 작업 초안으로 상태 시작
  -> 짧게 누를 때마다 원문 스냅샷 추가와 일괄 복사 횟수 증가를 한 transaction으로 저장
  -> 길게 누르기는 아무 동작도 실행하지 않음
  -> 초기화는 작업 초안과 클릭 횟수를 비우고 상태 유지
  -> 다음은 confirming 단계와 현재 순서를 저장한 뒤 /batch-copy 확인 페이지로 이동
  -> 확인 페이지에서 500ms 길게 누른 뒤 재정렬하거나 위치 변경, 복제 및 삭제
  -> 확인 편집은 작업 초안만 바꾸고 원본 메모, 저장 목록과 사용 횟수 유지
  -> 예기치 않은 route 이동과 새로고침에서는 초안 복원
  -> 헤더 뒤로가기와 확인 페이지 취소는 초안을 지움

넓은 일괄 복사 패널 항목 본문의 click, Enter 또는 Space
  -> 한 항목 선택 또는 같은 항목 선택 해제
  -> 메모 선택과 독립된 선택 ID 및 굵은 붉은 테두리 갱신

선택된 일괄 복사 항목 본문의 ArrowUp 또는 ArrowDown
  -> drag와 같은 재정렬 명령으로 한 자리 이동
  -> 같은 항목 ID의 선택과 포커스 유지
  -> 새 위치와 전체 항목 수를 정중한 상태로 전달
```

### 메모 선택, 속성 적용과 삭제 복구 흐름

```text
이동이 아닌 헤더 한 번 click 또는 저장된 양의 tabindex가 낮은 순서의 Tab 탐색
  -> 메모 하나 선택
  -> 굵고 끊기지 않는 붉은 선택 테두리와 별도 focus 표시
  -> 최근 활성 오른쪽 패널과 속성 패널 대상은 바꾸지 않음

이동이 아닌 헤더 더블클릭
  -> 같은 메모를 선택
  -> 속성 패널 대상을 해당 메모로 변경
  -> 최근 활성 오른쪽 패널을 note-properties로 변경
  -> 오른쪽 속성 패널에 X, Y, 너비와 높이 표시

선택 지점에 포커스가 있는 선택된 메모에서 보조 키 없는 Enter
  -> 속성 패널 대상을 선택된 메모로 변경
  -> 최근 활성 오른쪽 패널을 note-properties로 변경
  -> 첫 X 입력으로 포커스 이동
  -> 본문, 헤더 아이콘, 패널 입력과 입력기 조합 중 Enter는 각 동작 유지

빈 캔버스의 이동 없는 click
  -> 선택 ID와 붉은 선택 테두리만 제거
  -> 속성 패널 대상, 초안과 최근 활성 오른쪽 패널 유지
  -> 캔버스 viewport로 포커스 이동

보조 키 없는 Escape
  -> 상위 임시 조작이 없으면 메모 및 일괄 복사 항목 선택 ID와 붉은 선택 테두리를 함께 제거
  -> 현재 포커스, 속성 패널 대상, 초안과 최근 활성 오른쪽 패널 유지

헤더 drag
  -> 선택과 최근 활성 오른쪽 패널 유지
  -> 같은 pointer 연속 입력의 click과 더블클릭 억제
  -> 끝내거나 취소할 때까지 패널 표시 여부와 캔버스 계산 크기 유지

Command keydown
  -> 선택 ID와 붉은 선택 테두리 제거
  -> 헤더 행 높이와 메모 외곽 크기를 유지한 채 헤더와 아이콘 비노출
  -> 헤더 아이콘에 포커스가 있으면 같은 메모 선택 지점으로 이동
  -> 본문 Command+클릭 또는 Command+Option+클릭은 메모를 다시 선택하지 않고 속성 패널 대상 유지
  -> 기본 동작을 막지 않음
  -> keyup, 창 및 문서 상태 변화와 다음 신뢰할 수 있는 입력에서 헤더만 복원하고 선택은 되살리지 않음

속성 입력
  -> 문자열 초안만 변경
  -> blur, 패널 밖 click 또는 Enter에서 같은 검증 및 적용 절차 호출
  -> 위치 수치와 독립적인 크기 검사를 통과하면 geometry 저장
  -> 그 밖의 값이면 기존 geometry와 revision 유지

오른쪽 패널 닫기
  -> 유효한 속성 초안은 한 번 적용하고 닫음
  -> 유효하지 않은 초안은 패널을 유지하고 첫 오류 입력으로 이동
  -> 저장값으로 되돌리기 뒤에는 잘못된 초안을 버리고 닫을 수 있음
  -> 이전 패널을 자동 복원하지 않고 activeRightPanel을 비움

일괄 복사 동작
  -> 최근 활성 오른쪽 패널을 batch-copy로 변경
  -> 속성 패널은 숨기되 속성 패널 대상과 속성 초안 유지

다른 메모 헤더 더블클릭 또는 Tab 선택 뒤 선택 지점의 Enter
  -> 최근 활성 오른쪽 패널을 note-properties로 변경
  -> 속성 패널 대상을 활성화한 메모로 변경
  -> 일괄 복사 패널은 숨기되 항목과 제거 이력 유지

삭제 아이콘
  -> 메모 제거 transaction 완료와 LIFO 복구 스냅샷 추가
  -> 메인 패널 중앙 하단에 5초 토스트 표시
  -> 삭제한 메모에 포커스가 있으면 다음 tabIndex 메모, 이전 메모, 새 메모 제어 순으로 이동
  -> 취소하면 최근 삭제를 같은 원문, geometry와 겹침 순서로 복원하고 복원된 메모로 포커스 이동
```

### 제거 실행 취소 상태

```text
현재 목록 --제거--> 제거 결과와 이전 index를 undo에 추가
undo --실행 취소--> 이전 index에 복원하고 같은 결과를 redo로 이동
redo --다시 실행--> 같은 항목을 다시 제거하고 undo로 이동
undo 뒤 목록 변경 --추가, 재정렬 또는 제거--> redo 비우기
새로고침 --모든 경우--> undo와 redo 비우기
```

## 다음 작업을 시작하기 전 선행 작업

이 선행 작업을 다음 미완료 작업보다 먼저 끝낸다. 이미 완료한 작업 단위의 번호나 의존 순서를 바꾸지 않으며, 문서 검토만으로 기존 코드가 지침을 따른다고 판정하지 않는다. 이후 작업 단위에서는 저장소 전체를 반복해서 검토하지 않고 그 단위에서 변경한 모듈과 연결 지점에 같은 기준을 적용한다.

### 목적과 기준

[요구사항의 의도한 결과](requirements.md#의도한-결과), [반드시 지킬 조건](requirements.md#반드시-지킬-조건)과 [완료를 확인할 증거](requirements.md#완료를-확인할-증거)에 포함된 사용자 동작을 보존하면서, [기술 안티패턴](../../dev/personal-notes-app/anti-patterns.md), [테스트 전략](../../dev/personal-notes-app/testing-strategy.md)과 [테스트 안티패턴](../../dev/personal-notes-app/test-anti-patterns.md)을 현재 코드와 대조한다. 내부 component 분리, 함수 이름이나 CSS class 같은 구현 형태는 보존 대상이 아니며, 요구사항과 승인된 결정이 의도적으로 바꾸도록 정한 동작도 현재 동작이라는 이유로 유지하지 않는다.

### 선행 조건

변경할 모듈에 적용되는 요구사항, 결정 기록과 개발 지침을 찾을 수 있어야 한다. 기존 동작을 확인할 실행 방법이나 관찰 가능한 증거가 없으면 구현 전에 그 공백을 해결한다. 구조만 고정하는 테스트나 일회용 fixture 및 script로 증거를 대신하지 않는다.

### 변경 후보

- 현재 안티패턴이 남아 있는 `apps/notes/src/**/*.ts`와 `apps/notes/src/**/*.tsx`
- 정적 검사로 정확하게 판정할 수 있는 규칙을 연결할 `apps/notes/eslint.config.mjs`
- 동작 보존을 확인하는 기존 단위 및 브라우저 검사
- class 결합 도구처럼 별도 승인을 받은 의존성이 필요한 경우에만 `apps/notes/package.json`과 잠금 파일

### 작업

- 변경할 모듈의 현재 사용자 동작, route, 외부에서 사용하는 API, IndexedDB record, 오류 처리와 연결 지점을 확인한다. 요구사항과 결정 기록이 의도적으로 바꾸는 부분은 따로 표시해 보존 대상과 섞지 않는다.
- 현재 package script 가운데 변경 범위에 적용되는 lint, typecheck, 테스트, 운영용 build와 실제 브라우저 흐름을 구현 전에 실행한다. 영향을 받는 기준선이 실패하면 원인을 새 변경과 구분할 수 있을 때까지 구현을 시작하지 않는다.
- 기술 안티패턴 문서에서 현재 기술과 변경 모듈에 적용되는 절을 읽고, 가까운 기존 코드가 같은 작성 방식을 쓴다는 이유로 안티패턴을 복사하지 않는다. 문서에 기록된 현재 위반은 새 사용자 동작을 덧붙이기 전에 같은 사용자 동작을 유지하는 구조로 정리한다.
- `current` 지침은 바로 적용한다. `proposed` 지침에 새 의존성, 설정 또는 사용자 동작 변경이 필요하면 승인 상태를 바꾸지 않은 채 구현하지 않고 필요한 결정을 먼저 받는다.
- 조건부 class 결합 도구를 도입해야 하면 기술 안티패턴 문서가 제안한 후보와 설치된 대안을 다시 비교하고, 직접 및 전이 의존성 검토와 승인을 마친 뒤 추가한다. 기존 `className` template literal을 정리하기 전에 lint 규칙만 켜서 기준선을 실패 상태로 만들지 않는다.
- 정적 검사로 정확히 판정할 수 있는 규칙은 위반 및 정상 입력을 기존 검사 도구 안에서 확인한 뒤 적용한다. 별도 fixture나 일회용 검사 script를 만들지 않는다. 자동 검사가 판정하지 못하는 JSX 조합, 사용자 동작 보존과 브라우저 상태는 변경한 작업 단위의 한 차례 검토에서 확인한다.
- 테스트는 사용자에게 보이는 동작, 저장 불변 조건, 외부 시스템과 주고받는 값 또는 순수 알고리즘 결과를 확인한다. 이름, 문자열, CSS class, DOM 중첩이나 component 분리만 고정하는 테스트를 추가하지 않는다.

### 검증 방식

이 선행 작업 자체에는 TDD를 적용하지 않는다. 각 모듈은 [모듈별 TDD와 동작 검증 결정](decisions/verification-strategy.md)의 기존 분류를 유지한다. 리팩터링 전후에 같은 관찰 방법을 사용해 승인된 변경을 제외한 사용자 동작과 자료 값이 유지되는지 확인하고, 한 차례의 코드 검토에서 적용 가능한 개발 지침을 빠뜨리지 않았는지 판정한다.

- 변경 전 통과한 lint, typecheck, 변경 모듈의 단위 및 브라우저 검사와 운영용 build가 변경 뒤에도 통과한다.
- 메모 작성, 편집, 개별 복사, 일괄 복사, 저장 복원과 변경한 화면의 오류 처리가 승인된 변경을 제외하고 같이 동작한다.
- 공개 진입점과 application command의 입력 및 반환 형태, IndexedDB record와 migration 조건이 승인 없이 바뀌지 않는다.
- 변경한 TypeScript와 TSX에서 적용 가능한 기술 안티패턴을 찾을 수 없고, 테스트는 테스트 안티패턴 문서가 금지한 구현 세부사항을 완료 증거로 사용하지 않는다.
- 정적 검사로 판정할 수 없는 component state 보존, Clipboard, IndexedDB, Worker, 반응형 화면과 포커스 동작은 그 동작을 사용하는 브라우저 흐름에서 확인한다.
- 새 dependency, fixture 또는 script가 생겼다면 승인된 필요와 반복 실행 책임을 확인할 수 있다. 승인 근거가 없으면 추가하지 않는다.

### 중단 조건

기술 지침을 적용하면서 승인된 사용자 동작, 외부 API, 저장 자료나 오류 처리를 유지할 수 없으면 영향을 받는 구현을 멈추고 요구사항, 결정 기록과 계획을 먼저 갱신한다. 변경 범위의 기존 검사 실패를 설명할 수 없거나, 적용할 `current` 지침끼리 충돌하거나, 제안 상태인 의존성 및 검사 설정의 승인이 없으면 그 선택에 의존하는 코드를 작성하지 않는다. 변경 뒤 알려진 안티패턴이 남아 있거나 실제 동작을 확인할 증거가 없으면 다음 작업 단위로 진행하지 않는다.

## 실행 순서

다음 구현은 위 선행 작업을 먼저 끝낸 뒤, 아래 의존 순서에서 아직 완료되지 않은 가장 이른 작업 단위부터 이어간다.

U12는 기능별로 U2의 메모 규칙, U3의 실제 저장소, U5의 메모 화면, U6의 개별 복사와 U8의 사용 기록 화면을 연결한다. 각 기능의 생성부터 재현까지 완료한 뒤 다음 기능으로 진행하며 필요한 초기 메모는 독립 fixture로 준비할 수 있다. U9와 U10은 선행 조건이 아니며 U11의 일괄 복사와 무관한 검사는 유지한다. 이번 실행의 로컬 완료에는 12개 기능의 입증이 필요하다. 요구사항에 남아 있는 CI 재현 확인은 이번 실행에 포함하지 않는다.

```text
U1 기반 및 배포 확인
  -> U2 자료 규칙과 조립 구조
    -> U3 브라우저 저장
      -> U4 디자인 시스템과 공통 화면 구조
        -> U5 메모 작성 및 공간 배치
          -> U6 개별 복사, 일괄 복사 시작과 집계 저장
            |-> U7 일괄 복사 편집과 제거 복구 -> U8 사용 빈도 화면 -|
            |-> U9 텍스트 분석 -> U10 템플릿 ------------------|-> U11 통합 완료 검증
```

U7과 U9는 U6이 끝난 뒤 병렬로 진행할 수 있다. U8은 U7의 제거 및 재정렬 결과를 사용하므로 U7 뒤에 진행하고, U10은 U9의 원문 줄 선택 결과를 사용하므로 U9 뒤에 진행한다. U11은 U8과 U10이 모두 끝난 뒤 시작한다. 각 작업 단위에서 발견한 요구사항 변경은 [요구사항 변경 절차](../README.md#requirement-changes-during-work)를 따른다.

## U1. 독립 실행 기반과 Worker 배포 확인

### 목적과 기준

정확한 도구와 버전을 선택하고 Tailwind CSS 및 최소 Dedicated Worker가 Next.js 운영용 빌드와 Node.js 서버에서 실제로 동작하는지 먼저 확인한다. [로컬 실행과 텍스트 분석 Worker 결정](decisions/local-runtime-and-analysis-worker.md), [개인 메모 디자인 시스템과 UI 기반 결정](decisions/application-design-system.md)과 [요구사항의 로컬 실행 조건](requirements.md#반드시-지킬-조건)이 기준이다.

### 선행 조건

없다. 최초 실행은 package manifest, lockfile, workspace 설정, 애플리케이션 소스와 실행 명령이 없는 상태에서 시작했다. 현재 U1을 다시 검증하거나 조정할 때에는 이미 추가된 `apps/notes/` package와 저장소 workspace 설정을 기준으로 삼는다. 애플리케이션 위치와 FSD 배치는 [애플리케이션 패키지 위치와 FSD 구조 결정](decisions/application-package-and-fsd.md)으로, UI 기반은 [개인 메모 디자인 시스템과 UI 기반 결정](decisions/application-design-system.md)으로 확정됐다.

### 변경 후보

- `apps/notes/package.json`
- 저장소 루트의 workspace 선언과 선택한 package manager의 lockfile
- `apps/notes/next.config.*`
- `apps/notes/postcss.config.*`
- `apps/notes/tsconfig.json`
- `apps/notes/eslint.config.*`
- `apps/notes/app/layout.tsx`
- `apps/notes/app/page.tsx`
- `apps/notes/src/_app/styles/globals.css`
- `apps/notes/src/_pages/notes/index.ts`
- `apps/notes/src/_pages/analysis/api/analysis.worker.ts`
- Next.js 운영 서버와 Playwright 브라우저 검사 설정

### 작업

- 구현 시점의 Next.js, React, TypeScript, React Hook Form, Zod, Tailwind CSS와 필요한 PostCSS 연결의 공식 문서를 다시 확인하고 서로 호환되는 정확한 버전을 고정한다.
- 각 직접 및 전이 의존성의 기능, 버전, 라이선스, 유지보수 상태, peer 조건, 잠재적 문제와 적용할 작성 방식을 확인한다. TanStack Query, DI 컨테이너, IndexedDB wrapper, drag library와 외부 접근성 부품은 현재 필요와 플랫폼 API를 비교해 근거가 없으면 추가하지 않는다. U4에서 실제 필요가 확인되지 않은 외부 접근성 부품을 U1에서 미리 설치하지 않는다.
- `apps/notes/package.json`을 애플리케이션 매니페스트로 만들고 저장소 루트의 workspace 설정이 이 패키지를 선택해 실행할 수 있게 한다. package manager와 workspace 파일 형식은 의존성 조사 뒤 확정한다.
- App Router와 `next build` 및 `next start`를 사용하는 Node.js 배포를 구성한다. 현재 과업은 IndexedDB, Clipboard와 Worker만으로 완료할 수 있으므로 Server Actions, 동적 Route Handlers와 요청 시점 서버 자료 처리를 추가하지 않는다. 이후 작업에서 필요가 확인되면 현재 자료 책임에 미치는 영향을 요구사항 변경 절차에 따라 다시 검토한다.
- Tailwind CSS와 전역 스타일을 루트 layout에서 한 번 연결하고, 의미 기반 디자인 토큰과 utility class가 운영용 CSS에 포함되는 최소 화면을 만든다. 완성형 UI 라이브러리나 외부 기본 테마를 함께 설치하지 않는다.
- `apps/notes/app/`에는 framework 진입 파일만 두고 `apps/notes/src/`에는 필요한 FSD 계층만 만든다. `@boundaries/eslint-plugin`과 TypeScript resolver를 ESLint flat config에 연결해 `_app`, `_pages`, `features`, `entities`, `shared`의 import 방향, 허용된 Entities `@x`, public API 우회, `export *`와 Next.js route 연결을 검사한다. 정적 import와 동적 import를 모두 검사하며, 설정 판별은 저장소의 무시된 임시 입력에서 한 번 확인하고 fixture나 별도 구조 검사 script를 커밋하지 않는다.
- 분석 요청을 흉내 내는 최소 버튼에서 module-relative URL로 Dedicated Worker를 지연 생성하고 ping 및 응답을 주고받는다.
- 최소 화면은 사용자 동작과 결과만 표현하며 Tailwind CSS 적용, 독립 실행, Worker 생성 및 빌드 성공 같은 구현 검증 내용을 문구로 설명하지 않는다. Worker 왕복 여부는 브라우저 검사에서 판정한다.
- localhost HTTP는 `next start`로 제공하고 HTTPS는 reverse proxy 또는 배포 플랫폼이 TLS를 종료한다. 자동 브라우저 검사는 Playwright Test의 `webServer`가 Next.js 운영 서버를 시작하게 하고, HTTPS는 같은 revision의 배포 환경에서 확인한다. 현재 로컬 결과물에는 실행 모드 환경변수를 추가하지 않는다.
- 지원 브라우저와 최소 버전을 정하고 Clipboard, IndexedDB, Dedicated Worker, Pointer Events, container query와 필요한 `Intl` 기능을 실제 지원 범위와 대조한다.

### 검증 방식

TDD를 적용하지 않는다. 이 단위의 위험은 빌드 도구가 만든 Worker URL, MIME type, 브라우저 자산과 실행 주소이므로 가짜 Worker 단위 검사보다 운영용 빌드와 실제 브라우저 왕복이 직접적인 근거다.

- package script로 운영용 빌드가 성공하고 `next start`가 빌드 결과를 제공한다.
- 운영용 CSS 파일에 Tailwind CSS utility와 의미 기반 디자인 토큰이 포함되고, 최소 네이티브 제어 요소에 고유 스타일이 적용된다. 개발 실행과 운영용 빌드의 CSS 순서 차이로 외형이 바뀌지 않는다.
- 저장소 루트에서 `apps/notes`만 선택한 실행과 `apps/notes/package.json`의 package script 실행이 같은 애플리케이션을 대상으로 한다.
- ESLint가 계층 역방향 import, 허용되지 않은 같은 계층 import와 public API 우회를 각각 실패로 판정하고 Entities `@x`를 포함한 승인된 import는 통과시킨다.
- localhost HTTP의 운영 서버와 TLS를 종료한 배포 환경에서 첫 분석 요청 전에는 Worker가 없으며, 요청 뒤 사용자가 이해할 수 있는 분석 상태가 표시되고 검사 도구가 Worker 응답을 확인한다.
- 잘못된 Worker URL이나 MIME type이면 smoke가 실패한다.
- 결과물에서 현재 범위에 없는 서버 실행 코드와 계정 UI를 찾을 수 없다.
- 최소 화면에 구현 기술, 빌드 상태 또는 화면 역할을 되풀이하는 안내 문구가 없다.

### 중단 조건

Worker URL, MIME type 또는 Next.js 운영 서버에서의 메시지 왕복을 확인하지 못하면 U9를 시작하지 않는다. Tailwind CSS가 운영용 CSS에 포함되지 않거나 버전 호환성, 대상 브라우저, workspace 설정 또는 FSD ESLint 검사가 결정되지 않으면 의존하는 소스 구조를 만들지 않는다.

## U2. 자료 규칙과 의존성 조립 구조

### 목적과 기준

메모, 일괄 복사, 사용 빈도, 분석과 템플릿이 공유할 자료 형태와 외부 입력 경계를 정하고, 브라우저 구현을 UI에 숨겨 전달할 조립 구조를 만든다. [데이터 구조 조사 초안](references/data-model-draft.md), [로컬 저장과 실행 중 상태 결정](decisions/local-storage-and-ephemeral-state.md)과 [기술 안티패턴 지침](../../dev/personal-notes-app/anti-patterns.md)이 기준이다.

### 선행 조건

U1의 `apps/notes` package, TypeScript 및 Zod 버전, module alias와 FSD ESLint 검사가 확정되어야 한다.

### 변경 후보

- `apps/notes/src/entities/note/model/*`
- `apps/notes/src/entities/batch-copy/model/*`
- `apps/notes/src/entities/usage/model/*`
- `apps/notes/src/entities/template/model/*`
- `apps/notes/src/entities/preference/model/*`
- `apps/notes/src/_pages/analysis/model/*`
- 각 책임을 사용하는 slice의 `model/*` interface
- `apps/notes/src/_app/providers/personal-notes-provider.tsx`
- `apps/notes/src/_app/composition/create-local-application.ts`
- 각 model 파일과 같은 slice의 `*.test.ts`

### 작업

- 반복 접두어 대신 `note.id`, `note.revision`, `note.contentRevision`, `algorithm.type`과 `algorithm.version`으로 함께 이동하는 값을 묶는다.
- 일괄 복사 자료형과 책임 이름은 `BatchCopyList`, `BatchCopyRepository`와 `BatchCopyItemWriter`로 통일한다. 새 model 공개 API에 이전 이름을 별칭으로 남기지 않는다.
- 메모 원문이 바뀔 때만 content revision이 바뀌고 geometry만 바뀔 때는 전체 revision만 바뀌는 규칙을 만든다.
- 메모의 `1000..32767` 양의 `tabIndex`를 시각적 겹침을 나타내는 `geometry.zIndex`와 분리한다. 첫 메모는 `1000`, 새 메모는 최댓값 다음 값을 받고 누락, 중복, 정수가 아닌 값과 범위 밖 값은 기존 유효 값, 생성 시각과 ID 순으로 안정 정렬해 빈틈없이 다시 배정한다. 맨 앞으로 또는 맨 뒤로 보내기는 `zIndex`만 바꾸고 `tabIndex`는 유지한다.
- 선택한 메모 ID, 선택한 데스크톱 일괄 복사 항목 ID, 속성 패널 대상 ID, 최근 활성 오른쪽 패널과 `X`, `Y`, 너비 및 높이의 문자열 초안을 영구 자료와 분리한다. 한 번의 헤더 click과 `Tab`은 메모 선택 ID만 바꾸고, 이동이 아닌 헤더 더블클릭 또는 선택된 메모 선택 지점의 `Enter`가 속성 패널 대상과 최근 활성 패널을 바꾸게 한다. 일괄 복사 항목 본문 실행은 항목 선택 ID만 바꾼다. 빈 캔버스 click과 `Command`는 메모 선택 ID만 비우고, 상위 임시 조작이 없는 `Escape`는 두 선택 ID를 함께 비운다. 네 적용 입력이 같은 검증 결과와 geometry 변경 명령으로 이어지게 하고, 최근 패널 전환이나 선택 해제로 패널 대상, 초안, 일괄 복사 자료 또는 순서를 지우지 않는다.
- 위치의 고정 최솟값과 최댓값을 제거하고 X와 Y에 음수와 0을 허용한다. 너비 `240..4095`, 높이 `180..4095`는 위치와 분리한다. 입력 및 저장에서 유한성과 계산 정밀도를 확인한다.
- 맨 앞으로 또는 맨 뒤로 보내기가 성공한 직후의 `zIndex`는 `1..N`의 고유하고 빈틈없는 전체 순서다. 결과는 한 명령에서 계산하고 저장 계층이 한 transaction으로 반영할 수 있게 한다. 삭제 및 복원 뒤에는 빈 번호와 중복을 허용하며 복원한 숫자는 삭제 스냅샷과 같아야 한다.
- 삭제 복구 스냅샷은 메모 원문, revision, geometry, 겹침 순서와 복원에 필요한 식별 정보를 함께 보존하고 LIFO 이력으로 다룬다. 일괄 복사 항목 제거 이력과 같은 자료형이나 명령으로 합치지 않는다.
- 메모 저장 전 원문 초안은 기준 메모 ID, content revision과 수정 시각을 가져 기준 메모보다 새로운 초안만 복구할 수 있게 한다.
- 모바일 일괄 복사 작업 초안은 `collecting`과 `confirming` 단계를 구분하고 고유 ID, 추가 순서의 원문 스냅샷과 `clickCount`를 함께 가진다. 같은 메모의 반복 입력도 별도 항목이며 수집 단계에서는 `clickCount`가 항목 수와 일치해야 한다. 확인 단계의 위치 변경, 대상 바로 뒤 복제와 삭제는 항목 수 또는 순서만 바꿀 수 있고 `clickCount`를 바꾸지 않는다.
- 확인 작업의 재정렬, 새 ID 복제와 삭제 명령은 메모 repository, 저장된 일괄 복사 목록과 사용 횟수 저장을 호출하지 않고 작업 초안만 바꾸도록 자료 경계를 둔다.
- 데스크톱 일괄 복사 항목의 한 자리 위 및 아래 이동은 drag와 같은 저장 목록 재정렬 명령을 사용한다. 목록 처음과 끝에서는 자료를 바꾸지 않고 성공한 이동 뒤 선택한 항목 ID를 유지한다.
- 외부 입력, IndexedDB record와 Worker message를 `unknown`에서 검증하는 Zod schema를 책임별로 나눈다. React Hook Form 입력, application command와 저장 record를 하나의 만능 schema로 만들지 않는다.
- 저장, Clipboard, 분석과 ID 생성을 위한 interface는 구체적인 책임을 드러내는 이름으로 정의한다.
- 일괄 복사 스냅샷 추가와 사용 횟수 증가는 하나의 목적별 저장 동작으로 정의해 transaction 책임을 두 repository 호출로 나누지 않는다.
- 각 entity, page와 feature slice는 외부에서 사용할 항목만 public API로 명시하며, 같은 slice 안에서는 public API를 역으로 가져오지 않는다. page 전용 동작을 이름만 보고 `features`로 옮기지 않는다.
- `shared/ui`와 `shared/lib`는 전체를 다시 내보내는 하나의 barrel을 만들지 않는다. 각 구성요소와 내부 라이브러리는 자체 public API를 두고, 내부 라이브러리 README에 허용할 책임과 제외할 책임을 기록한다.
- composition root가 브라우저 구현과 명령 및 조회를 한 번 조립하고, `_app/providers`는 아래 계층이 정의한 필요한 동작만 제공하는 provider에 명시적인 의존성을 전달한다. Provider는 공통 루트 layout 아래에서 라우트 이동에도 유지하며, 생성 과정에서 브라우저 전역을 읽지 않는다. 아래 계층이 `_app`을 가져오거나 임의 token 조회 및 전역 singleton을 사용하지 않는다.

### 검증 방식

부분적으로 TDD를 적용한다. content revision 불변 조건, `tabIndex` 할당 및 정리, `zIndex` 전체 순서, geometry 범위 보정, 메모와 일괄 복사 항목 선택, 두 선택의 동시 해제, 속성 패널 대상의 독립 전이, 방향키 한 자리 재정렬과 목록 경계, 삭제 LIFO 복원, 모바일 일괄 복사 단계와 작업 초안 명령, 최근 활성 패널 전이 및 승인된 스키마의 성공 및 실패 결과는 구현 전에 입력과 결과를 안정적으로 쓸 수 있어 TDD가 필요하다. 실제 click, `dblclick`, `Enter`, `Escape`, drag와 보조 키 event는 TDD로 흉내 내지 않는다. interface 선언, composition root와 provider 연결은 TDD 대상이 아니며 타입 검사, import 방향과 라우트 기본 실행 검사로 확인한다.

- 원문 변경, geometry 변경과 두 변경의 조합에서 두 revision 결과가 결정과 일치한다.
- 맨 앞으로 또는 맨 뒤로 보내기는 모든 활성 메모의 `zIndex`를 고유한 `1..N`으로 만들고 나머지 상대 순서 및 각 메모의 `tabIndex`를 유지한다.
- 승인된 캔버스 및 크기 범위의 유한한 속성 초안은 한 geometry 변경으로 변환되고, 비어 있거나 숫자가 아니거나 범위를 벗어난 초안은 저장 자료와 revision을 바꾸지 않는 입력 오류가 된다.
- 삭제 복원 스냅샷으로 같은 원문, geometry와 겹침 순서를 복원할 수 있고 다른 메모는 바뀌지 않는다.
- 모바일 일괄 복사 초안은 같은 메모를 반복해서 추가해도 순서와 중복을 보존하며 초기화 뒤 항목 수와 `clickCount`가 모두 0이다. `다음`은 `confirming` 단계로만 바꾸고, 확인 작업의 재정렬, 복제와 삭제는 원본 메모 및 `clickCount`를 유지한다.
- 한 번의 헤더 click 또는 Tab 선택에 해당하는 전이는 메모 선택 ID만 바꾸고 속성 패널 대상과 최근 활성 패널을 유지한다. `Enter` 활성화 전이는 선택된 메모를 속성 패널 대상으로 설정하고 최근 활성 패널을 속성 패널로 바꾼다. 일괄 복사 항목 선택 전이는 메모 선택을 유지하면서 항목 선택 ID만 설정하거나 비운다. 빈 캔버스 click과 `Command`는 메모 선택만 비우고, 상위 임시 조작이 없는 `Escape`는 두 선택을 함께 비운다. 모든 선택 해제 전이는 속성 패널 대상, 속성 초안, 최근 활성 패널, 일괄 복사 항목, 순서와 제거 이력을 유지한다. 속성 패널 활성화와 일괄 복사 동작을 번갈아 적용하면 최근 활성 패널만 바뀌고 나머지 자료는 유지된다.
- 선택된 일괄 복사 항목의 한 자리 위 및 아래 이동은 중간 위치에서 정확히 한 번 재정렬하고 같은 선택 ID를 유지한다. 처음의 위쪽 이동과 마지막의 아래쪽 이동은 목록과 이력을 바꾸지 않는다.
- 누락 필드, 잘못된 revision, 빈 식별자와 알 수 없는 Worker message가 schema 경계에서 거절된다.
- UI 모듈이 IndexedDB, `navigator.clipboard`나 Worker 생성자를 직접 가져오지 않는다.
- ESLint가 FSD 역방향 import와 slice 내부 파일을 외부에서 직접 가져오는 코드를 실패로 판정한다.
- provider 없이 렌더링된 개발 오류는 누락된 조립 책임을 식별할 수 있고, 일반 사용 중 Service Locator 조회 실패가 발생하지 않는다.

### 중단 조건

같은 속성 이름이 전체 revision과 content revision 가운데 무엇을 뜻하는지 구분되지 않거나, 저장 record와 application 객체 변환 책임이 정해지지 않으면 U3을 시작하지 않는다. `tabIndex`, `zIndex`, geometry와 작업 초안 스키마가 위 결정과 다른 결과를 허용하면 해당 자료 구현을 시작하지 않는다.

## U3. IndexedDB 저장과 실행 중 상태 수명

### 목적과 기준

사용자가 만든 현재 자료, 저장 전 메모 원문과 모바일 일괄 복사 작업 초안을 새로고침 뒤에도 유지한다. 메모 및 데스크톱 일괄 복사 항목 선택, 속성 패널 대상, 최근 활성 오른쪽 패널, 속성 초안, 제거 이력과 분석 파생 상태는 승인된 실행 중 수명에 둔다. `Command` 눌림, pointer capture와 drag 시작 때의 캔버스 측정값은 현재 입력보다 오래 유지하지 않는다. [로컬 저장과 실행 중 상태 결정](decisions/local-storage-and-ephemeral-state.md)이 보관 범위와 성공 조건을 정한다.

### 선행 조건

U2의 객체, 레코드 스키마와 책임별 저장 interface가 필요하다. U1에서 IndexedDB wrapper를 승인하지 않았다면 브라우저 표준 API로 구현한다.

### 변경 후보

- `apps/notes/src/shared/lib/indexed-db/*`
- `apps/notes/src/_app/composition/indexed-db/open-personal-notes-database.ts`
- `apps/notes/src/entities/note/api/indexed-db-note-repository.ts`
- `apps/notes/src/entities/batch-copy/api/indexed-db-batch-copy-repository.ts`
- `apps/notes/src/features/add-note-to-batch-copy/api/indexed-db-batch-copy-item-writer.ts`
- `apps/notes/src/entities/usage/api/indexed-db-usage-repository.ts`
- `apps/notes/src/entities/template/api/indexed-db-template-repository.ts`
- `apps/notes/src/entities/preference/api/indexed-db-interaction-preferences-repository.ts`
- 각 저장 구현과 같은 slice의 `*.browser.test.ts`
- `apps/notes/src/_app/providers/session/create-session-state.ts`

### 작업

- 기존 `notes`, `usage`, `templates`와 `preferences` object store를 보존하면서 `noteDrafts`와 `mobileBatchCopyDrafts`를 추가한다. 새 데이터베이스에는 일괄 복사 저장소를 `batchCopyLists`로만 만든다. 이전 schema가 있으면 같은 `versionchange` transaction에서 기존 일괄 복사 저장소의 이름을 `batchCopyLists`로 바꿔 key, record와 항목 순서를 보존한다. 변경 뒤에는 이전 저장소나 우회 읽기 경로를 남기지 않고 `BatchCopyList`, `BatchCopyRepository`와 `BatchCopyItemWriter`를 사용한다.
- 기존 메모의 `tabIndex` 누락, 중복, 정수가 아닌 값과 범위 밖 값을 `1000`부터 빈틈없이 옮긴다. X와 Y는 `0`, 음수와 기존 캔버스 바깥을 포함해 그대로 보존하고, 너비와 높이만 현재 범위로 정규화한다. zIndex 또는 크기가 실제로 바뀐 경우에만 전체 revision을 한 번 증가시키며, tabIndex 정규화나 좌표를 읽기만 한 경우에는 revision을 올리지 않는다.
- 기존 `zIndex` 동률은 값, 생성 시각과 ID 순으로 안정 정렬한 뒤 `1..N`으로 옮긴다. migration은 하나의 version change transaction에서 완료하고 실패하면 이전 버전과 자료를 유지한다.
- `upgrade`, `blocked`, `versionchange`, transaction abort와 읽을 수 없는 record를 명시적인 결과로 처리한다.
- 다른 연결 때문에 upgrade가 `blocked`되면 안내 상태를 알리되 open 요청을 실패로 확정하지 않는다. 방해하는 연결이 닫힌 뒤 같은 요청이 upgrade와 open을 계속 완료하게 한다.
- 실행 중인 open 요청을 보유한 연결 관리자를 닫으면 그 요청의 세대를 무효화한다. 늦게 완료된 이전 요청은 즉시 닫고 현재 연결이나 이후 open 요청을 덮어쓰지 않는다.
- 첫 자료 읽기는 `불러오는 중`, `사용 가능한 빈 상태`, `자료 표시`, `읽기 실패`와 `다른 탭으로 인한 대기`로 구분한다. 첫 읽기가 끝나기 전과 읽기 실패 중에는 변경 동작을 제공하지 않고, 실패 상태에는 다시 시도, 다른 탭 확인과 기존 자료를 덮어쓰지 않았다는 설명을 제공한다.
- 일괄 복사 항목과 사용 횟수를 함께 쓰는 구현이 두 변경 request를 같은 readwrite transaction에 등록하고 외부 비동기 작업을 transaction 안에서 기다리지 않게 한다.
- transaction의 개별 request가 아니라 `complete`를 성공 기준으로 사용한다.
- 애플리케이션 실행 동안 유지할 session state에 일괄 복사 제거 이력, 메모 삭제 LIFO 이력과 삭제 시각, 선택한 메모 ID, 선택한 데스크톱 일괄 복사 항목 ID, 속성 패널 대상 ID, 최근 활성 오른쪽 패널, 속성 입력 초안, 분석 상태, 저장 전 제안과 일회성 출력을 둔다. 메모 삭제 취소는 삭제 완료 시각부터 원래 5초 안에서만 가능하며 route 이동이나 알림 component 재생성으로 기한을 늘리지 않는다. `Command` 눌림, pointer capture와 drag 시작 측정값은 이 session state나 IndexedDB에 넣지 않는다.
- 저장 전 메모 원문은 `noteDrafts`, 모바일 수집 및 확인 작업은 `mobileBatchCopyDrafts`에 둔다. 기준 메모 저장 완료, 명시적인 변경사항 버리기, 수집 화면 헤더 뒤로가기와 확인 페이지 `취소`에서 대응 초안을 지운다.
- 모바일 수집 상태의 항목 추가와 일괄 복사 횟수 증가는 한 transaction으로 완료한다. 확인 작업의 위치 변경, 복제와 삭제는 작업 초안만 갱신한다.
- 영구 저장 요청이 승인되더라도 백업 완료로 표시하지 않는다.
- IndexedDB 통합 검사는 Vitest Browser Mode에서 운영 repository를 직접 가져와 실행한다. `_app` 검사는 화면 slice의 `composition.ts`만 가져오고 route UI를 함께 평가하지 않으며, 테스트용 route나 운영 코드 분기를 만들지 않는다.

### 검증 방식

TDD를 적용하지 않는다. IndexedDB의 transaction 수명, upgrade와 origin별 보관은 가짜 저장소로 정확히 재현하기 어렵다. 저장 interface에 정한 동작을 기준으로 구현한 뒤 실제 브라우저 저장소를 사용하는 통합 검사로 판정한다. U2에서 이미 검증한 순수 레코드 스키마를 다시 내부 호출 횟수로 검사하지 않는다.

- 메모, 일괄 복사 목록, 횟수, 템플릿, 설정, 저장 전 메모 원문과 모바일 일괄 복사 작업 초안은 새로고침 뒤 복원된다.
- 새 데이터베이스의 `objectStoreNames`에는 `batchCopyLists`가 있고 이전 일괄 복사 저장소 이름은 없다. 이전 schema에 항목과 순서를 넣고 upgrade하면 같은 key, record와 순서를 `batchCopyLists`에서 읽을 수 있으며 이전 저장소는 남지 않는다.
- 일괄 복사 repository와 항목 및 사용 횟수의 원자적 저장은 모두 `batchCopyLists`를 사용한다. 변경 뒤에 이전 저장소를 찾거나 대신 읽는 분기는 없다.
- migration을 거친 메모는 `1000`부터 빈틈없는 양의 `tabIndex`, `1..N`의 고유한 `zIndex`와 허용 범위의 geometry를 유지한다. 새 범위에서 유효한 좌표는 보존하고 크기만 현재 범위로 정규화한다. zIndex 또는 크기가 바뀐 경우에만 전체 revision을 증가시키며, tabIndex 정규화와 좌표 읽기는 revision을 바꾸지 않는다. 이후 `zIndex` 변경은 `tabIndex`를 바꾸지 않는다.
- 첫 자료 읽기 전에는 빈 상태를 표시하거나 새 메모를 만들 수 없고, 읽기 완료 뒤에만 실제 빈 상태 또는 저장된 자료를 보여준다.
- 분석 결과, 저장 전 제안, 일괄 복사 제거 이력과 메모 삭제 LIFO 이력은 route 이동 뒤 유지되지만 새로고침 뒤에는 없다. 메모 선택, 데스크톱 일괄 복사 항목 선택, 속성 패널 대상과 속성 초안은 결정된 화면 수명에 따라 정리한다. `Command` 상태와 drag 측정값은 key release, 창 및 문서 상태 변화, pointer 종료 또는 화면 이탈에서 정리된다. 모바일 일괄 복사 작업 초안은 명시적 취소 전까지 새로고침 뒤에도 남고 저장된 일괄 복사 목록과 섞이지 않는다.
- 운영용 빌드 중 Provider 조립이 브라우저 전역 접근으로 실패하지 않고, Next.js 운영 서버의 라우트 이동 뒤에도 같은 실행 중 상태를 읽는다.
- 의도적으로 transaction을 중단하면 그 transaction이 바꾸는 object store가 일부만 갱신되지 않는다.
- 일괄 복사 항목 쓰기를 등록한 뒤 같은 transaction의 사용 횟수 쓰기를 실패시키면 두 object store가 모두 이전 상태를 유지한다.
- 모바일 작업 초안 항목 쓰기 뒤 사용 횟수 쓰기를 실패시키면 두 자료가 모두 이전 상태를 유지하고 클릭 횟수도 증가하지 않는다.
- 다른 database version을 연 탭이 있을 때 `blocked` 안내가 나타나고 방해하는 연결을 닫으면 원래 open 요청이 완료된다. `versionchange` 안내에서는 현재 연결을 닫고 다시 시도할 수 있다.
- open 진행 중 닫기, 곧바로 다시 열기와 React Strict Mode의 setup, cleanup, setup 순서에서 이전 open 결과가 현재 연결을 덮어쓰지 않는다.
- HTTPS와 localhost HTTP에서 만든 자료가 서로 섞이지 않는다.

### 중단 조건

transaction 일부 성공을 사용자가 성공으로 보거나 스키마 upgrade가 조용히 멈추면 U5와 U6을 시작하지 않는다. 첫 스키마 버전 뒤 자료 형태를 바꾸면 기존 저장 자료를 보존하는 migration과 필요한 이전 레코드 검증을 함께 추가하기 전에는 변경을 완료하지 않는다.

## U4. 개인 메모 디자인 시스템과 공통 화면 구조

이 단위의 구현 기반과 완료된 기능은 유지하되 시각 방향, 토큰, 탐색과 제어 배치는 U13부터 U20이 대체한다. 아래 Figma식 frame, 목재 캔버스, 굵은 붉은 선택선과 route별 탐색 설명은 이전 구현의 이력이며 새 UI 완료 조건이 아니다.

### 목적과 기준

개인 메모의 공간 작업 특성을 반영한 고유 디자인 시스템을 대표 화면에서 확정하고, 그 token과 구성요소로 로컬 애플리케이션의 다섯 주요 route, 모바일 메모 상세 및 일괄 복사 확인 route, 메모 화면의 일괄 복사 및 속성 패널, 화면별 탐색, 알림과 반응형 화면 구조를 만든다. [개인 메모 디자인 시스템과 UI 기반 결정](decisions/application-design-system.md), [Pretendard와 Figma식 작업 화면 결정](decisions/figma-inspired-visual-direction.md), [일괄 복사 패널과 모바일 확인 페이지 결정](decisions/accumulator-workspace-panel.md), [메모 선택과 속성 편집 결정](decisions/note-selection-and-properties.md), [메모 삭제와 복구 결정](decisions/note-removal-recovery.md), [화면 구성 조사](references/interface-layout-research.md), [메모 조작과 모바일 일괄 복사 조사](references/note-interaction-and-mobile-batch-copy-research.md), [모바일 일괄 복사 확인과 오른쪽 패널 우선순위 조사](references/mobile-batch-copy-confirmation-and-panel-priority-research.md), [메모 Tab 순서, 항목 동작 팝오버와 모바일 지연 재정렬 조사](references/tab-order-popover-and-mobile-reorder-research.md), [메모 선택, 속성 편집과 삭제 복구 조사](references/note-selection-properties-and-removal-research.md), [데스크톱 입력 상태와 피드백 복원력 조사](references/desktop-input-and-feedback-resilience-research.md), [시각 디자인 조사](references/web-visual-design-research-2026.md)와 [공간형 보드와 작은 화면 목록 결정](decisions/responsive-note-presentation.md)이 기준이다.

### 선행 조건

U1의 라우트, Tailwind CSS 및 운영용 CSS 확인과 U2의 provider가 필요하다.

### 변경 후보

- `apps/notes/app/page.tsx`
- `apps/notes/app/notes/[noteId]/page.tsx`
- `apps/notes/app/usage/page.tsx`
- `apps/notes/app/analysis/page.tsx`
- `apps/notes/app/templates/page.tsx`
- `apps/notes/app/settings/page.tsx`
- `apps/notes/app/batch-copy/page.tsx`
- `apps/notes/app/accumulator/page.tsx` 제거
- `apps/notes/src/_pages/{notes,note-detail,usage,analysis,templates,settings,batch-copy}/index.ts`
- `apps/notes/src/_app/ui/application-frame.tsx`
- `apps/notes/src/_app/ui/navigation/*`
- `apps/notes/src/_app/styles/{globals,tokens}.css`
- `apps/notes/src/shared/ui/{button,text-field,textarea,checkbox,status-notice}/*`
- `apps/notes/src/shared/ui/action-toast/*`
- `apps/notes/src/_pages/notes/ui/{note-card,note-header,note-properties-panel,batch-copy-workspace,mobile-note-list,mobile-batch-copy-bar}.tsx`
- `apps/notes/src/_pages/note-detail/ui/note-detail-page.tsx`
- 실제 필요가 승인된 폼과 무관한 접근성 구성요소의 `apps/notes/src/shared/ui/*`

### 작업

- `/`에는 메모 보드 또는 목록과 `48rem` 이상에서 열고 닫는 일괄 복사 패널을 배치한다. `/notes/[noteId]`에는 작은 화면 목록에서 진입하는 메모 상세 편집 화면을 두고, `/batch-copy`에는 모바일 일괄 복사 확인 및 저장 목록 관리 화면을 배치한다. 나머지 주요 route에는 사용 빈도, 텍스트 분석, 템플릿과 설정을 배치한다. 계정, 동기화와 서버 상태 전용 route는 만들지 않는다.
- `/accumulator` route를 제거하고 redirect를 추가하지 않는다. 애플리케이션 내부의 `Link`, 명시적 이동과 canonical metadata는 `/batch-copy`만 사용한다.
- 각 `app/**/page.tsx`는 같은 라우트를 담당하는 `_pages` slice의 공개 화면만 연결하고, 화면 구성과 상태 처리는 `_pages`에 둔다.
- 사용 빈도, 텍스트 분석, 템플릿과 설정 화면은 페이지 제목, 주요 동작, 주 콘텐츠 및 상태 알림을 공유하고 왼쪽 탐색을 사용한다. 메모 화면은 별도 페이지 제목과 상단 작업 행 없이 상단 탐색 바로 아래에서 캔버스를 시작한다. 메모 화면, 모바일 상세와 일괄 복사 관리 화면은 왼쪽 사이드바를 사용하지 않는다. 두 모바일 보조 화면은 메모 목록으로 돌아가는 동작과 저장 또는 하단 작업을 우선하며, 작은 화면에서는 전역 탐색을 접을 수 있어야 한다.
- 공통 화면과 자료 Provider를 시작하기 전에 현재 URL의 protocol, hostname과 secure context 여부를 판정한다. HTTPS 또는 호스트 이름이 정확히 `localhost`인 HTTP만 계속 진행한다. 그 밖의 주소에서는 `잘못된 접근입니다.`를 제목으로 표시하고 HTTPS 또는 `http://localhost`로 다시 열라는 안내만 제공한다. `지원하지 않는 접속 주소`, `유효하지 않음`, 내부 판정값과 Web API 이름은 화면에 표시하지 않는다.
- 지원 주소에서는 접속 판정 문구를 표시하지 않는다. 실패 안내는 장식용 카드로 감싸지 않고 제목, 본문과 여백으로 읽기 순서를 만든다.
- 확장 기능이 개입하지 않는 브라우저 profile에서 서버가 출력한 루트 HTML과 첫 client render가 일치하게 한다. 서버 응답, hydration 뒤 DOM과 console을 비교하고 원인을 확인하지 않은 `suppressHydrationWarning`은 루트 요소에 추가하지 않는다.
- 보이는 문자열마다 내용 식별, 동작 또는 입력 이름, 조건, 상태 또는 결과, 오류 뒤 행동 가운데 역할을 지정한다. 제목과 컨트롤을 되풀이하는 안내, 구현 기술 및 빌드 상태 설명과 과업에 필요하지 않은 소개 문구는 제거한다.
- 접속 확인과 실패, 사용 빈도 및 분석의 빈 상태, 템플릿 원문이 없는 상태에서 둥근 외곽, 채운 카드 배경과 그림자를 제거한다. 설정의 유일한 폼, 템플릿 편집 및 일회성 생성 폼은 평평한 section과 구분선으로 나누고, 사용 빈도 표와 분석 및 템플릿 목록은 행과 구분선을 기본으로 삼아 바깥쪽 그림자 및 둥근 카드 외곽을 제거한다. 메모와 선택 가능한 일괄 복사 항목은 독립된 대상의 선택 및 이동을 전달하므로 상태 표면을 유지한다.
- 색, 글자, 간격, 모서리, 테두리, 깊이, motion, 포커스, 제어 요소 크기와 화면 밀도를 용도별 디자인 토큰으로 정의한다. 화면에서 같은 임의 값을 반복하거나 색 이름을 업무 상태 이름처럼 사용하지 않는다.
- 제목, 본문, 버튼, 입력과 상태 문구에는 Pretendard를 사용하고 serif display 글꼴을 제거한다. 제목 위계는 크기, 굵기, 행간과 자간으로 만든다.
- 공통 탐색, 도구 영역과 패널은 중립적인 짙은 회색 및 차가운 회색 표면, 얇은 구획선과 조밀한 간격을 사용한다. 메모 화면은 왼쪽 사이드바와 캔버스를 밀어내는 도구 행을 추가하지 않고 상단 탐색과 캔버스 위 제어로 같은 역할을 제공한다.
- 메모 작업 캔버스는 낮은 대비의 밝은 목재 색과 결을 사용한다. 메모, 일괄 복사 패널과 제어 요소는 중립색 표면을 사용하고 종이 질감이나 어긋난 짙은 그림자를 반복하지 않는다.
- 보드를 고정 크기 문서로 만들지 않고 메모의 저장 좌표와 카메라를 분리한다. viewport는 남은 화면을 채우며 메모 이동 중 계산 크기를 유지한다. 화면 밖의 메모 위치 때문에 거대한 DOM 영역을 만들지 않는다.
- 메모 화면은 현재 위치를 상단 탐색에서 전달하고 별도 페이지 제목을 표시하지 않는다. 사용 빈도, 텍스트 분석, 템플릿과 설정 화면은 첫 자료나 주요 제어가 제목보다 먼저 읽히도록 조밀한 페이지 제목을 사용한다. 모바일 메모 상세와 일괄 복사 관리 화면은 대상 또는 목록을 식별하는 제목과 메모 목록으로 돌아가는 동작을 제공하되 설명 문단을 반복하지 않는다.
- 자체 `shared/ui`의 단순 폼 구성요소는 실제 `button`, `input`, `textarea`와 `select`를 렌더링하고 checkbox는 `input[type="checkbox"]`로 렌더링하며, 네이티브 속성, `name`, 이벤트와 ref를 전달한다. Tailwind CSS로 고유 외형을 적용하며 브라우저 기본 스타일에 완성도를 맡기지 않는다.
- 사용자가 직접 편집하는 단순 입력은 과업별 React Hook Form의 `register`로 연결할 수 있게 하고 자체 폼 구성요소가 `Controller` 또는 `useController`를 요구하지 않게 한다. 폼 입력값을 만드는 새로운 복합 제어가 필요하면 자체 구현이나 외부 부품을 추가하기 전에 디자인 시스템과 입력 상태 결정을 다시 검토한다.
- Dialog, Menu와 Tooltip처럼 폼 입력값을 만들지 않는 복합 상호작용이 실제 화면에 필요하면 네이티브 HTML 및 Web API로 충족할 수 있는지 먼저 확인한다. 외부 접근성 부품이 필요하면 정확한 package와 전체 의존성을 검토하고, import 및 API 변환을 외부 부품을 감싸는 `shared/ui` 구성요소 안에 둔다.
- 각 `shared/ui` 구성요소는 자체 public API를 두고 전체 UI를 한 번에 다시 내보내는 barrel을 만들지 않는다. 화면과 업무 동작을 구현하는 모듈은 외부 UI 패키지를 직접 가져오지 않는다.
- 메모 영역의 inline size를 기준으로 `48rem` 미만에서 내용에 따라 짧아지고 `12rem`을 넘지 않는 목록과 모바일 상호작용을 선택하며 User-Agent 분기를 두지 않는다. 넘치는 원문은 카드 안에서 스크롤하지 않고 원문이 더 있음을 표시한다.
- `48rem` 미만의 메모 목록 화면 헤더 오른쪽에는 일괄 복사 상태를 시작하는 아이콘 버튼을 둔다. 상태에 들어가면 헤더 왼쪽에 접근 가능한 이름을 가진 뒤로가기 아이콘 버튼을 표시하고, 화면 아래에 `초기화`와 `다음`을 고정한다. `다음` 문구 옆에는 같은 메모의 반복 입력을 포함한 클릭 횟수를 표시하고, 실행하면 `/batch-copy` 확인 페이지로 이동한다.
- 모바일 확인 목록의 각 항목 우측 상단에는 접근 가능한 이름을 가진 동작 아이콘 버튼을 둔다. HTML `popover="auto"`와 이름 있는 `role="group"` 안의 네이티브 버튼으로 `위치 변경`, `복제` 및 `삭제`를 제공하고 일반 `Tab` 순서를 유지한다. 열면 첫 동작으로 포커스를 옮기고 실행, `Escape` 또는 light dismiss로 닫으면 해당 항목의 실행 버튼으로 돌려준다. 선택창은 버튼 가까이에 붙는 자체 디자인 시스템의 표면과 조밀한 세로 행, 보이는 동작 이름, `focus-visible`, pressed 및 다른 동작과 구분된 삭제 상태를 제공하고 브라우저 기본 외형에 완성도를 맡기지 않는다. `menu` 및 `menuitem` 역할과 외부 접근성 package는 현재 범위에 추가하지 않는다.
- 메모 작업 영역이 `72rem` 이상이면 너비 `22rem`의 나란한 패널을 사용하고, `48rem` 이상 `72rem` 미만이면 같은 route의 모달 패널을 사용한다. 나란한 표현은 두 영역을 동시에 조작할 수 있어야 하고, 모달 표현은 바깥 메모 영역을 inert 상태로 만들며 열기 및 닫기 포커스를 관리해야 한다. 모달에서 선택이 남아 있으면 첫 `Escape`는 메모와 일괄 복사 항목 선택만 해제하고, 선택이 없는 다음 `Escape`가 모달을 닫는다.
- 상단 탐색과 주 작업 제어에는 `1..999`, 메모 선택 지점에는 저장된 `1000..32767`의 양의 `tabindex`를 적용한다. 나머지 조작은 네이티브 DOM 순서를 유지한다.
- 메모와 일괄 복사 항목 선택에는 대상 전체의 네 변과 꼭짓점에서 끊기지 않는 굵은 붉은 실선 테두리, 속성 패널 대상에는 바깥쪽 중립색 점선 표시를 사용하고 `focus-visible`에는 이 상태들과 다른 표시를 사용한다. 일괄 복사 항목의 drag 놓기 후보도 선택과 다른 형태를 사용한다. 패널 머리에는 대상 원문의 첫 비어 있지 않은 줄을 잘라 표시하며 고대비 모드에서도 각 상태를 구분할 수 있어야 한다.
- `Command`가 눌린 상태에서는 선택의 붉은 테두리를 제거하고 헤더의 시각 요소와 아이콘 조작을 숨기되 헤더 행의 계산 높이, 본문 시작 위치와 메모 외곽 크기를 유지한다. 숨겨질 헤더 아이콘에 포커스가 있으면 같은 메모 선택 지점으로 옮기고 그 밖의 포커스는 유지한다.
- 헤더 더블클릭 또는 선택된 메모의 선택 지점에서 실행한 `Enter`로 연 오른쪽 속성 패널에는 `X`, `Y`, 너비와 높이를 네이티브 숫자 입력으로 배치한다. 입력 label, 패널 대상, 현재 값, 너비 `240..4095`, 높이 `180..4095`와 위치 제한 제거와 수치 안전 조건, 오류와 적용 상태를 제공하되 메모 표면에는 같은 숫자 UI를 반복하지 않는다.
- 오른쪽에는 속성 패널과 일괄 복사 패널 가운데 마지막으로 활성화한 패널 하나만 표시한다. 이동이 아닌 헤더 더블클릭 또는 선택된 메모의 선택 지점에서 실행한 `Enter`는 속성 패널을, 일괄 복사 동작은 일괄 복사 패널을 활성화한다. 한 번의 헤더 click, `Tab` 선택과 선택 해제는 최근 활성 패널을 바꾸지 않는다. 패널 전환이나 선택 해제는 속성 패널 대상, 입력 초안, 일괄 복사 항목과 제거 이력을 조용히 버리지 않는다. 패널을 닫으면 이전 패널을 복원하지 않고 아무 패널도 표시하지 않는다.
- `48rem` 이상의 일괄 복사 패널 버튼은 화면 우측 상단에 유지하고 캔버스를 밀어내는 별도 행을 만들지 않는다. `48rem` 미만의 평상시 메모 목록에서는 저장된 항목이 하나 이상일 때 Drawer에 현재 항목 수가 보이는 관리 링크를 제공하고 `/batch-copy`로 이동한다. 두 제어는 항목 수와 단위를 접근 가능한 이름 또는 연결된 상태로 전달하며 개수는 시각적으로 동작 이름과 구분한다.
- 넓은 패널의 머리는 `38px` 높이로 `일괄 복사` 제목과 닫기 동작만 제공한다. 본문은 항목 목록만 제공하고 결합 미리보기 및 화면에 보이는 이력 제어를 배치하지 않는다.
- 넓은 패널의 각 항목 본문은 안정된 접근 가능한 이름과 `aria-pressed`를 가진 네이티브 toggle button으로 만든다. 우측 상단의 붉은 삭제 버튼은 본문 버튼과 중첩하지 않는다. 항목 선택, `focus-visible`, drag 놓기 후보와 삭제 hover를 디자인 토큰으로 각각 구분한다.
- 전체 복사 결과 알림은 상단 탐색 아래 주 작업 영역의 우측 상단에 고정한다. 변환되는 캔버스와 일괄 복사 패널의 자식으로 만들지 않아 시점 이동이나 패널 스크롤에 따라 움직이지 않게 한다.
- 전체 복사 결과 알림은 포커스를 가져가지 않고 표시된 시점부터 5초 뒤 사라진다. 다음 복사 시도가 같은 알림을 갱신하면 새 내용이 나타난 시점부터 5초를 다시 센다. 성공은 정중한 status로 알리고, 실패는 Clipboard 오류 원인과 다시 시도 또는 설정 확인 동작을 제공한다.
- 메모 삭제 결과 토스트는 메인 패널 중앙 하단에 고정하고 `메모를 제거했습니다.`와 오른쪽 `취소`를 제공한다. 상태 문구 영역은 `role="status"`에 해당하는 정중한 상태 전달을 사용하고, 토스트는 포커스를 가져가지 않은 채 표시된 시점부터 5초 뒤 사라진다.
- `72rem` 이상에서 첫 항목 추가가 성공하면 오른쪽 패널을 열어 새 항목을 보여주되 현재 포커스를 옮기지 않는다. `48rem` 이상 `72rem` 미만에서는 모달을 자동으로 열지 않고 항목 수만 갱신한다. 어느 표현에서도 `누적했습니다`와 같은 별도 성공 알림은 만들지 않는다.
- 모바일 일괄 복사 확인 페이지는 중립색 표면의 세로 목록, 500ms 동안 10 CSS px 이내로 누른 뒤 drag하는 항목과 우측 상단 동작 아이콘 및 작은 선택창을 사용한다. drag가 활성화되면 항목이 들린 상태를 색 이외의 변화로 보여주고 이동 중에는 교환 대상을 표시하며, `pointercancel`과 유효하지 않은 놓기에서는 원래 순서 및 시각 상태로 복원한다. 동작 선택창의 `위치 변경`을 누르면 최소 `24 × 24` CSS px의 교환 대상 버튼을 표시해 drag 없이 같은 결과를 만든다. 동작 아이콘에서는 재정렬을 시작하지 않는다. 하단의 `취소` 및 `일괄 복사하기`는 운영체제 안전 영역, 화면 확대와 키보드 포커스에서 가려지지 않아야 한다.
- 사용 빈도 빈 상태는 작은 화면에서 가로 이동 없이 보여준다. 실제 항목은 좁은 화면에서 원문과 개별 복사, 일괄 복사 및 합계를 한 묶음으로 재배치할 수 있는 구조를 사용한다.
- 실제 긴 한국어 메모, 여러 줄, URL 형식 문자열, 빈 화면, 오류, 진행 중과 키보드 포커스 상태로 대표 화면을 만든다.
- 공통 자료 상태 영역은 초기 불러오기, 사용 가능한 빈 상태, 자료 표시, 읽기 실패와 다른 탭 대기를 구분하며 각 상태에서 가능한 다음 동작을 보여준다.
- 기본, hover, `focus-visible`, pressed, disabled, 오류, 진행 중, 고대비와 reduced motion 가운데 대표 구성요소에 적용 가능한 상태를 확인한다. 상태는 색 하나에 의존하지 않고 네이티브 의미, 문구와 형태를 함께 사용한다.
- 시각 조사에서 제안한 글꼴, 색, 모서리, 깊이와 motion 후보를 실제 콘텐츠가 있는 대표 화면에 적용해 시각 및 접근성 검토 결과를 기록한다. 개인 메모의 공간 작업 특성, 정보 위계와 상태 식별이 승인되기 전에는 모든 화면에 세부 스타일을 확장하지 않는다.

### 검증 방식

TDD를 적용하지 않는다. 디자인 토큰, 구성요소 외형, 라우트 구성, container query, 읽기 흐름과 시각적 위계는 class 이름이나 DOM 내부 구조를 고정하는 단위 검사보다 실제 렌더링, 접근성 검사와 기록된 시각 검토가 직접적인 근거다.

- 다섯 주요 route, `/notes/[noteId]`와 `/batch-copy`를 Next.js 운영 서버에서 직접 열고 새로고침해도 화면이 열린다. 두 작업 route는 다섯 주요 화면의 탐색에 나타나지 않고 작은 메모 목록의 수정 제어, `다음` 또는 평상시 목록 Drawer의 저장 항목 수 링크에서 일반 진입 방법을 제공한다. `/accumulator`를 직접 요청해도 `/batch-copy`로 이동하거나 일괄 복사 화면을 표시하지 않는다.
- HTTPS와 `http://localhost`에서는 공통 화면이 열리고, `file:`과 `localhost`가 아닌 HTTP 판정에서는 자료 Provider를 시작하지 않은 채 카드 없는 화면에 `잘못된 접근입니다.`와 다시 열 수 있는 주소 조건이 보인다. 주소 확인 중에도 별도 카드 외곽이 보이지 않는다.
- 확장 기능이 개입하지 않는 브라우저에서 초기 화면을 열었을 때 애플리케이션이 만든 hydration 오류가 console에 없고, server HTML과 hydration 뒤 루트 속성이 일치한다.
- 로컬 탐색에는 계정과 동기화 항목이 없다.
- 메모 화면에는 왼쪽 사이드바가 없고 상단 탐색으로 다른 네 화면에 이동할 수 있다. 나머지 화면에서는 왼쪽 탐색으로 현재 위치와 같은 이동 대상을 확인할 수 있다.
- DOM 검사에서 단순 폼 제어가 승인된 네이티브 HTML 요소로 렌더링되고, 이름, 설명, 오류, 키보드 포커스와 네이티브 폼 참여가 유지된다.
- 같은 역할의 버튼, 입력과 알림을 여러 route에서 실행했을 때 같은 디자인 토큰, 상태 규칙과 `shared/ui` 구성요소를 사용한다. 이 검사는 class 문자열이 아니라 렌더링된 사용자 상태와 동작으로 판정한다.
- 다섯 주요 route, 모바일 메모 상세와 일괄 복사 관리 route의 제목, 본문, 버튼, 입력과 상태 문구의 계산된 `font-family`에서 Pretendard가 기본 글꼴이며 serif display 글꼴을 사용하지 않는다.
- 넓은 메모 화면에서 중립적인 상단 탐색 바로 아래의 밝은 목재 캔버스가 보이는 화면의 나머지 너비와 높이를 채우며, 별도 `메모` 제목, 메모 개수와 상단 작업 행이 없다. 중립색 메모와 캔버스를 구분할 수 있고 목재 결은 긴 한국어 메모, 포커스, 선택 및 정렬선의 대비를 방해하지 않는다.
- 320 CSS px, `48rem` 및 `72rem` 직전과 직후, 200% 및 400% zoom과 화면 분할에서 핵심 동작 영역이 가려지지 않는다.
- 320 CSS px의 사용 빈도 화면에서 빈 상태와 개별 복사, 일괄 복사 및 합계의 의미를 가로 이동 없이 확인할 수 있다.
- 일괄 복사 패널 버튼과 모바일 Drawer 저장 목록 링크의 접근 가능한 이름 또는 연결된 상태가 현재 개수를 전달한다. 두 자리와 세 자리 개수에서도 각각 우측 상단과 Drawer 행의 이름 및 수가 잘리지 않고 메모 배치를 바꾸지 않는다.
- `72rem` 이상에서는 비어 있는 일괄 복사 패널을 너비 `22rem`의 나란한 표현으로, `48rem` 이상 `72rem` 미만에서는 모달 표현으로 열어 높이 `38px`의 머리, 제목, 닫기 동작과 사용 가능한 빈 상태를 확인한다. 결합 미리보기, 실행 취소 및 다시 실행 버튼이 없다. 모달에 선택이 있으면 첫 `Escape`가 선택만 해제하고, 선택이 없는 다음 `Escape` 또는 닫기 버튼으로 닫은 뒤 포커스가 실행 버튼으로 돌아온다. 실제 항목과 이력의 공유는 U7에서 확인한다.
- 320 CSS px에서 메모 목록은 내용에 따라 짧아지고 `12rem`을 넘지 않으며, 화면 헤더의 일괄 복사 아이콘, 상태 안의 헤더 뒤로가기와 하단 `초기화` 및 `다음`이 메모와 시스템 안전 영역을 가리지 않는다. `다음`의 시각 문구와 접근 가능한 이름에서 클릭 횟수의 의미를 확인할 수 있다. 저장된 항목이 없으면 Drawer에 관리 링크가 보이지 않고, 항목이 생기면 `일괄 복사`와 실제 수가 한 링크 안에 나타난다. 우측 하단에는 새 메모 제어만 남는다. `/batch-copy` 확인 화면에서는 순서 목록, 항목별 동작 아이콘 및 자체 디자인 시스템 선택창과 하단 두 동작을 가로 이동 없이 확인할 수 있다. 선택창의 `위치 변경`, `복제`, `삭제`, 포커스 및 pressed 상태와 삭제 구분을 확인한다.
- 이동이 아닌 헤더 한 번 click과 저장된 `1000..32767`의 양의 `tabindex`가 낮은 순서를 따르는 `Tab`으로 같은 메모를 선택했을 때 동일한 굵고 끊기지 않는 붉은 실선 테두리만 새로 보이고, 패널 대상의 바깥쪽 점선 및 키보드 포커스 표시는 선택 테두리와 구분된다. 같은 헤더의 이동 없는 더블클릭 또는 선택 지점의 `Enter` 뒤에만 속성 패널이 나타난다. 맨 앞으로 또는 맨 뒤로 보내기 뒤에도 `tabindex` 순서는 유지된다. 헤더 더블클릭, 선택 지점의 `Enter`와 일괄 복사 동작을 번갈아 실행하면 최근 활성 패널만 나타나고 속성 패널과 일괄 복사 패널은 동시에 보이지 않는다. 패널을 닫으면 이전 패널이 자동으로 다시 나타나지 않는다.
- `Command`를 누르면 선택 테두리가 사라지고 모든 메모 헤더와 아이콘이 보이지 않아 조작할 수 없지만 메모의 계산 너비와 높이 및 본문 시작 위치는 움직이지 않는다. 헤더 아이콘의 포커스는 같은 메모 선택 지점으로 옮겨지고 그 밖의 포커스는 유지된다. `keyup`, 창 및 문서 상태 변화와 다음 신뢰할 수 있는 입력 뒤에는 헤더가 다시 나타나되 선택 테두리는 자동 복원되지 않는다.
- 삭제 결과 토스트는 메인 패널 중앙 하단에 5초 동안 보이고 캔버스 이동이나 오른쪽 패널 스크롤에 따라 움직이지 않는다. 상태 문구는 포커스를 옮기지 않고 전달되며 `취소`는 일반 `Tab` 순서에서 실행할 수 있다. 모든 토스트는 같은 5초 수명과 reduced motion 규칙을 사용한다.
- 키보드 포커스, 오류, 성공, 빈 상태와 진행 상태가 색 하나에만 의존하지 않는다.
- 고대비와 reduced motion 설정에서도 포커스, 선택, 오류와 진행 상태를 구분할 수 있다.
- 외부 접근성 부품을 추가했다면 승인된 폼과 무관한 구성요소에서만 import하고 외부 기본 테마가 실제 화면에 나타나지 않는다. 추가하지 않았다면 불필요한 package가 lockfile에 없다.
- 접속 상태, 빈 상태, 페이지 폼, 표와 목록의 바깥 컨테이너에 장식용 카드가 남지 않고, 메모와 선택 가능한 일괄 복사 항목처럼 독립된 조작 대상에만 카드 형태가 남았는지 시각 검토로 확인한다. 카드 외곽을 제거한 화면에서도 제목, 간격, 정렬과 구분선으로 읽기 순서를 알 수 있어야 한다. 범용 카드 격자와 장식용 그라데이션이 정보 구조를 대신하지 않아야 한다. hover에서 나타나는 항목 동작은 같은 항목의 키보드 포커스에서도 발견할 수 있어야 하며, hover가 없거나 coarse pointer인 환경에서는 항상 보여야 한다.
- 제목, 탐색, 컨트롤, 빈 상태, 진행 상태와 오류 문구를 함께 읽었을 때 같은 역할을 반복하지 않으며, 직접 알아차리기 어려운 결과와 오류 뒤 다음 행동이 빠지지 않았는지 검토한다.

### 중단 조건

대표 화면의 정보 위계, 디자인 토큰 역할, 네이티브 폼 구성요소와 사용자가 반드시 구분해야 하는 상태에 대한 시각 및 접근성 승인이 없으면 U5를 시작하지 않는다. 공통 화면 구조가 작은 화면에서 주 콘텐츠를 가리거나, 단순 입력이 불필요하게 제어 상태를 강제하거나, 외부 기본 테마가 화면에 드러나거나, 역할을 설명할 수 없는 카드 외곽이 접속 상태, 빈 상태, 페이지 폼, 표 또는 목록에 남으면 이 문제를 고치기 전에는 디자인 시스템을 다른 화면으로 확장하지 않는다.

### 메모 테두리 수정 순서

메모 본문을 누르면 나타나는 파란 외곽선과 헤더 및 모서리에서 두께가 달라지는 붉은 선택선을 수정한다. [메모 선택선과 본문 포커스 표시](decisions/note-selection-and-properties.md#메모-선택선과-본문-포커스-표시)를 기준으로 U4의 표시 방식부터 U5의 입력 구분, U11의 브라우저 확인 순서로 진행한다. 일반 pointer 입력과 보조 키 입력 뒤의 키보드 진입을 구분하는 복구 절차까지 구현했으며 Firefox와 WebKit의 고대비 시각 확인은 후속 검증으로 남긴다.

1. 완료. `apps/notes/src/_app/styles/globals.css`의 공통 포커스 기본값을 `@layer base`에 배치했고, `note-card.tsx`에서 실제로 포커스를 옮기는 보조 키 없는 primary pointer 입력만 별도로 기록한다. 보조 키 입력 뒤 `Tab` 또는 `Shift+Tab`으로 본문에 진입하면 pointer 상태를 해제해 키보드 포커스 표시를 유지한다. 본문의 커서 이동, 텍스트 선택과 자동 저장은 기존 `textarea` 및 React Hook Form 연결을 유지한다.
2. 완료. `apps/notes/src/_pages/notes/ui/note-card.tsx`에서 선택선을 카드의 단일 가상 요소로 그려 메모 내용보다 위에 표시하고 `pointer-events: none`을 적용했다. 선택선은 카드 크기와 `zIndex`를 바꾸지 않으며 헤더 배경에 가려지지 않는다.
3. 완료. 카드의 `overflow-visible`을 유지해 바깥쪽 크기 조절 지점과 포커스 표시가 잘리지 않게 했다. 가상 선택선은 resize handle보다 낮은 `z-index`로 배치하고 속성 패널 대상 점선 및 카드 포커스 외곽선과 분리했다.

구현 뒤에는 다음 항목을 브라우저에서 판정한다. 선의 모양은 CSS 클래스 이름이나 DOM 구조만 확인하는 검사로 대신하지 않는다.

- 선택 여부와 관계없이 본문을 마우스로 누르면 파란 외곽선이 나타나지 않는다. 보조 키 클릭으로 본문 focus를 막은 뒤 `Tab`과 `Shift+Tab`으로 본문에 도달하면 pointer 상태가 남지 않아 포커스를 식별할 수 있고 붉은 선택선을 가리지 않는다. 이후 일반 pointer로 다시 누르는 경우와 본문에서 헤더로 이동하는 경우도 확인한다.
- 메모가 온전히 보일 때 선택선이 네 변과 네 모서리에서 이어진다. 기본 보기, 캔버스 축소 및 확대, 브라우저 화면 확대에서 헤더와 본문의 선 두께가 달라지지 않는지 확인한다. 화면 끝 가까이에 놓은 메모에서도 헤더와 본문이 보이는 선택선을 가리지 않아야 한다. 화면 밖으로 나간 메모의 잘림은 모서리의 선택선 누락과 구분한다.
- 헤더 이동과 네 가장자리 및 네 꼭짓점 크기 조절, 본문 스크롤, 속성 패널 대상과 선택 대상이 다른 상태를 확인한다. 선택선을 고치기 전후의 메모 크기와 본문 시작 위치를 비교한다.
- 전역 포커스 기본값을 바꾼 뒤 메모 밖의 탐색, 버튼과 입력에도 키보드 포커스가 남는지 확인한다. Chromium, Firefox와 WebKit의 실제 화면 및 고대비 표시를 확인하기 전에는 테두리 수정을 완료로 판정하지 않는다.

Chromium에서 본문 pointer 포커스의 파란 외곽선 제거, 보조 키 클릭 뒤 `Shift+Tab` 진입 시 키보드 포커스 표시, 키보드 선택 뒤의 연속된 붉은 선택선과 속성 패널 대상 점선의 구분을 실제 화면으로 확인했다. `typecheck`, `lint`, 기존 단위 테스트 168개와 전체 Playwright 77개를 Chromium, Firefox와 WebKit에서 통과했다. 고대비 환경의 선택선과 포커스 표현은 별도 시각 검증에서 확인한다. 선택선의 연속성은 실제 화면을 보고 판정한다.

## U5. 메모 작성, 편집과 공간 배치

이 단위의 자료, 자동 저장, 자유 배치, 선택과 속성 동작은 유지한다. 헤더 이동, 상시 제어와 선택선의 시각 표현은 U15의 이동 핸들, 복사와 더보기 구조로 대체한다.

### 목적과 기준

메모를 만들고 다른 애플리케이션의 텍스트를 붙여넣어 편집한다. 넓은 화면에서는 본문을 항상 편집하고 짧은 헤더로 위치와 겹침 순서를 바꾸며 가장자리와 꼭짓점 또는 오른쪽 속성 패널로 위치와 크기를 조절한다. 이동이 아닌 헤더 한 번 click과 `Tab` 탐색은 메모만 선택하고, 헤더 더블클릭 또는 선택 지점의 `Enter`는 속성 패널을 연다. 빈 캔버스 click과 `Command`는 메모 선택을 해제하고, 상위 임시 조작이 없는 `Escape`는 메모와 일괄 복사 항목 선택을 함께 해제한다. 헤더 drag 중에는 선택과 패널을 바꾸지 않아 캔버스 계산 크기를 유지한다. 삭제 직후에는 5초 동안 토스트에서 되돌릴 수 있게 한다.

작은 화면에서는 제한된 높이 목록에서 상세 화면으로 이동해 원문을 수정하고 명시적으로 저장한다. [메모 복사와 편집 동작 결정](decisions/note-copy-and-edit.md), [메모 선택과 속성 편집 결정](decisions/note-selection-and-properties.md), [메모 삭제와 복구 결정](decisions/note-removal-recovery.md), [공간형 보드와 작은 화면 목록 결정](decisions/responsive-note-presentation.md), [메모 조작과 모바일 일괄 복사 조사](references/note-interaction-and-mobile-batch-copy-research.md)와 [메모 선택, 속성 편집과 삭제 복구 조사](references/note-selection-properties-and-removal-research.md)가 조작을 정한다.

### 선행 조건

U2의 revision 규칙, U3의 메모 저장과 U4의 두 화면 표현이 필요하다.

### 변경 후보

- `apps/notes/src/_pages/notes/ui/notes-collection.tsx`
- `apps/notes/src/_pages/notes/ui/note-card.tsx`
- `apps/notes/src/_pages/notes/ui/note-header.tsx`
- `apps/notes/src/_pages/notes/ui/note-resize-regions.tsx`
- `apps/notes/src/_pages/notes/ui/note-editor.tsx`
- `apps/notes/src/_pages/notes/ui/note-properties-panel.tsx`
- `apps/notes/src/_pages/notes/model/{note-selection,note-geometry-draft,remove-note}.ts`
- `apps/notes/src/_pages/notes/ui/note-actions.tsx` 제거 후보
- `apps/notes/src/_pages/notes/ui/note-geometry-controls.tsx` 제거 후보
- `apps/notes/app/notes/[noteId]/page.tsx`
- `apps/notes/src/_pages/note-detail/*`
- `apps/notes/src/entities/note/*`
- `apps/notes/e2e/notes.spec.ts`

### 작업

- 메모 생성과 외부 텍스트 붙여넣기가 현재 입력을 보존해 IndexedDB에 저장되게 한다.
- 넓은 화면은 메모마다 본문 React Hook Form을 두고, 모바일 상세 화면은 현재 메모의 본문 폼을 둔다. 자동 저장 timer, 저장 진행, 실패, revision과 IndexedDB 복구 초안은 application 상태로 유지하되 저장, `blur`, 화면 이탈과 보조 키 복사가 실행될 때 `getValues`로 최신 본문을 읽는다. 같은 본문을 React state나 Context에 매 입력마다 함께 쓰지 않는다.
- 새 메모 동작은 캔버스 위의 조밀한 제어에서 빈 상태와 자료가 있는 상태 모두 같은 위치를 유지하고 캔버스를 밀어내는 별도 행을 만들지 않는다. 빈 상태에서 실행하면 새 메모의 편집 위치를 바로 알 수 있게 한다.
- 넓은 화면의 메모는 짧은 헤더와 항상 편집 가능한 여러 줄 `textarea`만 표시한다. 이동, 복사, 일괄 복사, 편집, 크기 텍스트 버튼과 메모 안의 숫자 geometry UI를 제거한다.
- 본문의 일반 click과 drag는 커서 이동 및 텍스트 선택에 맡기고 메모 이동, 선택이나 별도 편집 상태 전환으로 이어지지 않게 한다. 메모 바깥 article의 `pointerdown` 또는 `focus` 전파로 본문 입력을 선택으로 다시 해석하지 않는다. URL 형식 문자열은 링크 요소로 변환하지 않는다.
- 헤더의 아이콘 버튼이 아닌 영역에서 이동 후보를 시작하고 pointer capture를 사용한다. 시작점부터 mouse 및 pen `5 CSS px`, touch `10 CSS px`를 넘으면 drag로 확정해 메모만 이동하며, 그 뒤 같은 연속 입력에서 생기는 click과 더블클릭을 실행하지 않는다. 이동 기준을 넘지 않은 한 번의 헤더 click은 메모를 선택하되 속성 패널, 원문 복사, 일괄 복사 항목 추가 또는 본문 포커스를 바꾸지 않는다.
- 이동이 아닌 헤더 더블클릭은 같은 메모를 선택하고 속성 패널 대상과 최근 활성 오른쪽 패널을 `note-properties`로 바꾼다. 단일 click을 지연하는 별도 타이머를 만들지 않고 브라우저의 `dblclick`을 사용한다. 헤더 아이콘 버튼의 더블클릭은 이 동작으로 전파하지 않는다.
- drag를 시작할 때 캔버스의 계산 inline size, block size와 좌표 변환 기준을 잡고, `pointerup`, `pointercancel` 또는 완료 전 `lostpointercapture`까지 오른쪽 패널 표시 여부와 작업 영역 열 정의를 애플리케이션 동작으로 바꾸지 않는다. 이동 좌표는 같은 기준으로 계산한다. `pointerup`은 마지막 geometry를 한 번 확정하고, 그 뒤 정상적으로 이어지는 `lostpointercapture`는 확정 결과를 되돌리거나 다시 저장하지 않는다. 완료 전 취소는 시작 geometry를 복원한다.
- 상단 탐색과 주 작업 제어에는 `1..999`, 각 메모 선택 지점에는 저장된 `1000..32767`의 양의 `tabIndex`를 HTML `tabindex`로 반영한다. `Tab`은 낮은 값부터 높은 값 순으로, `Shift+Tab`은 반대로 탐색한다. 이 순서는 `zIndex`와 DOM의 시각적 정렬에서 독립적으로 유지한다. 키보드 포커스를 받은 메모를 선택하되 포커스만으로 속성 패널을 열지 않는다. 한 번에 메모 하나만 선택하고 메모 전체를 감싸는 굵고 끊기지 않는 붉은 실선 테두리, 속성 패널 대상의 바깥쪽 점선 표시와 별도의 `focus-visible` 표시를 함께 제공한다.
- 선택 지점 자체에 포커스가 있고 해당 메모가 선택된 상태에서 `key === "Enter"`, 보조 키 없음, `isComposing === false`, `repeat === false`인 첫 `keydown`을 받으면 속성 패널 대상과 최근 활성 패널을 해당 메모와 `note-properties`로 바꾸고 첫 X 입력으로 포커스를 옮긴다. 메모 본문, 헤더 아이콘, 크기 조절 지점과 패널 입력을 포함한 하위 요소에서 전파된 `Enter`는 처리하지 않는다. 헤더 더블클릭으로 연 경우에는 현재 pointer 포커스를 유지한다.
- 빈 캔버스 자체에서 이동 없이 끝난 click은 메모 선택 ID를 비우고 캔버스 viewport로 포커스를 옮긴다. 상위 임시 조작이 없는 보조 키 없는 `Escape`는 메모 및 일괄 복사 항목 선택 ID를 함께 비우고 현재 포커스를 유지한다. 메모, 패널과 다른 조작 요소의 하위 click이 전파됐거나 캔버스 시점 drag로 판정된 입력은 선택 해제로 처리하지 않는다. 속성 패널 대상, 속성 초안, 최근 활성 패널과 일괄 복사 자료 및 순서는 유지한다.
- 오른쪽 속성 패널은 React Hook Form이 속성 패널 대상 ID가 가리키는 메모의 `X`, `Y`, 너비와 높이 문자열 및 입력 오류를 관리한다. `blur`, 패널 밖 click과 `Enter`를 하나의 멱등 적용 절차로 모아 같은 초안을 두 번 저장하지 않게 한다. 너비 `240..4095`, 높이 `180..4095`를 검사하고 X와 Y에는 음수와 0을 허용한다. 계산 불가능한 위치나 허용 크기를 벗어난 입력은 기존 geometry 및 revision을 유지하고 수정할 필드를 알려준다. 최근 활성 패널이 바뀌어도 폼 수명을 유지하고 다른 메모를 대상으로 열 때에는 정한 `reset` 절차로 값을 교체한다.
- 속성 패널을 닫을 때 유효하고 달라진 초안은 같은 명령으로 한 번 적용한다. 유효하지 않은 초안은 패널에 유지하고 첫 오류 입력으로 포커스를 옮기며, `저장값으로 되돌리기` 뒤에만 버리고 닫을 수 있게 한다. 패널을 닫으면 이전 패널을 복원하지 않고 최근 활성 패널을 비운다.
- 헤더 더블클릭 또는 선택된 메모의 선택 지점에서 실행한 `Enter`가 최근 활성 오른쪽 패널을 속성 패널로 바꾼다. 한 번의 헤더 click, `Tab` 선택과 선택 해제는 최근 활성 패널과 속성 패널 대상을 바꾸지 않는다. 일괄 복사 패널이 보이던 상태에서도 속성 패널 대상, 속성 초안과 일괄 복사 자료를 유지한 채 승인된 활성화 동작에서만 속성 패널을 표시한다. 속성 입력의 적용 계기가 함께 발생하면 공통 검증 및 적용 절차를 먼저 사용한다.
- 헤더 오른쪽에는 맨 앞으로, 맨 뒤로와 삭제 아이콘 버튼을 이 순서로 둔다. 네이티브 버튼, 접근 가능한 결과 이름, `Enter` 및 `Space`, focus 표시와 충분한 실행 영역을 제공한다.
- 맨 앞으로와 맨 뒤로는 나머지 메모의 상대 순서를 유지하면서 대상 메모를 전체 순서의 시작 또는 끝으로 옮기고 모든 활성 메모를 `1..N`의 고유한 `zIndex`로 다시 배정한다. 변경을 한 IndexedDB transaction으로 저장하고 content revision을 바꾸지 않는다.
- 맨 앞으로와 맨 뒤로 저장이 완료돼도 대상과 다른 메모의 `tabIndex`를 바꾸지 않는다. 현재 포커스는 동작 직후 같은 메모에 유지하고 다음 `Tab` 또는 `Shift+Tab`에서도 저장된 `tabIndex` 순서를 따른다.
- 삭제 아이콘은 확인 대화상자 없이 대상 메모를 즉시 제거하고 현재 실행의 LIFO 복구 이력에 스냅샷을 넣는다. 메인 패널 중앙 하단의 5초 토스트가 보이는 동안 최근 삭제를 `취소`할 수 있다. 삭제한 메모에 포커스가 있었다면 다음 `tabIndex` 메모, 이전 메모와 새 메모 제어 순으로 옮기고, 취소로 복원하면 복원된 메모 선택 지점으로 옮긴다.
- 메모의 위, 아래, 왼쪽과 오른쪽 가장자리 및 네 꼭짓점에서만 크기 변경을 시작한다. 별도 핸들이나 문구를 상시 표시하지 않고 방향 cursor와 조절 중 외곽선으로 상태를 알린다. 너비와 높이의 기존 제한을 유지하고 움직이지 않는 반대편 변을 유지하며 위치와 독립적인 너비 및 높이 제한을 적용한다. 내용이 사용자가 정한 크기를 넘으면 메모 안에서 스크롤한다.
- 보이는 캔버스에서 메모나 다른 조작 요소가 아닌 지점을 주 pointer로 누르고 mouse 및 pen `5 CSS px`, touch `10 CSS px`를 넘게 이동하면 시점을 이동한다. 변환되는 보드의 현재 경계 밖에서 시작해도 viewport가 pointer capture를 가져야 하며, 메모 본문 선택과 크기 변경을 가로채지 않는다.
- 새 캔버스 시점 이동을 시작할 때 직전 제스처의 pointer ID, 시작 좌표와 종료 대기 상태를 버리고 현재 화면에 반영된 시점을 새 기준값으로 잡는다. 첫 신뢰할 수 있는 pointer event에서 modifier 표시 상태도 다시 맞추되, 이 정리는 시점을 기본값이나 이전 제스처의 시작점으로 되돌리지 않는다.
- 캔버스 시점 이동은 각 유효한 이동의 마지막 시점을 화면과 확정 후보에 반영한다. `pointerup`은 그 시점을 한 번 확정하고, `pointercancel`, 완료 전 capture 상실, 창 또는 문서 상태 변화는 이미 화면에 반영한 마지막 유효 시점을 보존한 채 제스처만 정리한다. `pointerup` 뒤 정상적인 `lostpointercapture`는 시점을 다시 적용하거나 시작 위치로 되돌리지 않는다.
- 고정 크기와 무관한 메모 공간에서 `Space+drag`, trackpad 이동, 확대 및 축소와 모든 메모 맞춤을 제공한다. 저장 위치는 시점 이동이나 패널 표시로 바꾸지 않는다.
- 작은 화면 목록은 생성 순서대로 메모를 보여주고 각 미리보기는 내용에 따라 짧아지되 `12rem`을 넘지 않으며 저장 geometry를 바꾸지 않는다. 카드 안에 별도 스크롤 영역을 만들지 않고 원문이 더 있다는 표시를 제공한다.
- 목록의 짧은 누르기는 `/notes/[noteId]` 상세 화면으로 이동한다. 없는 메모 ID와 삭제된 메모 ID는 복구 가능한 화면 결과로 처리한다.
- 상세 화면은 전체 원문 `textarea`, 명시적인 저장과 메모 목록으로 돌아가는 동작을 제공한다. 입력은 IndexedDB 복구 초안에 기록하고 저장 전 애플리케이션 내부 이동에는 계속 편집과 변경사항 버리기를 제공한다. 저장 중 중복 실행을 막고 실패 뒤 입력 및 초안을 유지한다.
- 넓은 화면은 마지막 입력 800ms 뒤 자동 저장한다. `blur`, 애플리케이션 내부 route 이동, document hidden과 `pagehide`에서는 대기 중인 최신 원문을 즉시 같은 저장 흐름으로 보낸다. 복구 초안을 먼저 기록하고 메모 저장 transaction 완료 뒤 지우며 실패하면 입력을 유지하고 재시도를 제공한다.
- 저장 성공 응답이 도착했을 때 현재 본문이 그 요청값과 같으면 저장값을 React Hook Form의 새 기본값으로 확정한다. 저장 중 추가 입력이 있으면 최신 값과 dirty 상태를 유지하고 다음 저장 대상으로 남긴다. 모바일에서 저장, 변경사항 버리기 또는 복구 초안 반영을 실행할 때에도 명시한 `reset`으로 값과 dirty 상태를 함께 맞춘다.

### 검증 방식

모든 UI에 TDD를 적용하지 않는다. 겹침 순서의 전체 순서 및 상대 순서 보존, `zIndex` 변경과 `tabIndex` 유지의 불변 조건, 선택, 선택 해제와 패널 대상의 독립 전이, 속성 초안의 검증 및 중복 적용 방지, 삭제와 복원, `800ms` 자동 저장과 상세 저장의 순수 상태 전이 및 content revision 불변 조건에만 TDD를 적용한다. 새 제스처가 현재 시점에서 시작하는 전이와 중복 pointer 종료 신호에서 확정값을 한 번만 적용하는 순수 전이는 TDD로 검증한다. click, `dblclick`, `Enter`, `Escape`, 실제 `tabindex` 및 Tab 이동, 선택 및 포커스 표현, IME, header drag, pointer capture, drag 중 계산 크기, edge resize, 패널 밖 click, route 이동, 보드 이동, 확대와 container query는 브라우저의 event 및 렌더링 결과를 실제 실행으로 검사한다.

- 두 메모에 서로 다른 텍스트를 입력하고 외부 텍스트를 붙여넣은 뒤 새로고침해도 원문이 남는다.
- 빈 상태에서 키보드와 포인터로 새 메모를 만들 수 있고, 생성 직후 입력을 시작할 위치를 확인할 수 있다.
- 넓은 화면의 메모에는 짧은 헤더와 `textarea` 본문만 보인다. 헤더 오른쪽의 세 아이콘 외에 이동, 복사, 일괄 복사, 편집 및 크기 텍스트 버튼과 메모 안의 숫자 geometry UI가 없다.
- 본문을 click하거나 drag하면 커서 또는 선택 범위가 바뀌고 메모 이동이나 별도 편집 상태 전환을 시작하지 않는다.
- 헤더의 아이콘이 아닌 영역에서 mouse 및 pen `5 CSS px`, touch `10 CSS px`를 넘게 drag하면 메모 위치만 바뀌고, 기준 안에서 끝난 한 번의 click은 해당 메모 전체의 굵고 끊기지 않는 붉은 선택 테두리만 새로 표시한다. 포인터 입력에서는 같은 영역을 drag 기준 안에서 더블클릭한 뒤에만 해당 메모의 속성 패널이 나타나며 원문 복사와 일괄 복사 항목 추가는 어느 입력에서도 실행되지 않는다.
- 서로 멀리 떨어진 두 메모에서 전체 맞춤을 실행하면 저장 좌표 차이에 배율을 먼저 적용한 화면 좌표가 CSS 위치에 사용되어 두 메모의 실제 DOM 위치가 겹치지 않는다. 전체 맞춤 뒤 축소를 실행해도 현재 배율이 커지지 않으며, 새로고침 뒤 저장 좌표와 화면 관계가 유지된다.
- drag 중과 직후에는 속성 패널이 새로 나타나거나 다른 패널로 바뀌지 않고, 캔버스의 `getBoundingClientRect()`로 확인한 계산 inline size와 block size가 애플리케이션 동작 때문에 달라지지 않는다. pointer가 헤더 밖으로 이동해도 위치 변경을 이어간다. 완료 전 `pointercancel` 또는 capture 상실은 시작 geometry를 복원하고, 성공한 `pointerup` 뒤의 `lostpointercapture`는 확정 geometry를 되돌리지 않는다. 이동 또는 크기 계산이 안전 수치 범위를 넘으면 저장하지 않고 기존 geometry, 미리보기와 capture를 정리하며 실패 안내를 표시한다.
- 서로 다른 양의 `tabindex`를 가진 메모에서 `Tab`은 낮은 값부터 높은 값 순으로, `Shift+Tab`은 반대로 이동하며 헤더 한 번 click과 같은 메모 선택 결과만 만든다. `Tab` 포커스만으로 오른쪽 속성 패널이 나타나지 않고, 선택된 메모의 굵은 붉은 테두리와 현재 키보드 포커스를 서로 구분할 수 있다.
- `Tab`으로 선택 지점에 도달한 뒤 보조 키 없는 `Enter`를 한 번 누르면 속성 패널 대상과 최근 활성 패널이 해당 메모로 바뀌고 첫 X 입력에 포커스가 놓인다. 같은 키를 본문에서 누르면 줄바꿈이 입력되고 헤더 아이콘에서는 그 버튼만 실행되며, 입력기 조합과 key repeat는 패널을 열지 않는다.
- 메모를 선택한 뒤 빈 캔버스를 drag 시작 기준 안에서 click하면 메모 선택 테두리가 사라지고 캔버스 viewport로 포커스가 이동한다. 상위 임시 조작이 없는 보조 키 없는 `Escape`는 메모와 일괄 복사 항목 선택을 함께 해제하고 포커스를 유지한다. 캔버스 drag, 메모와 패널의 하위 click은 선택 해제를 함께 실행하지 않으며, 속성 패널 대상, 초안, 최근 활성 패널과 일괄 복사 자료 및 순서는 유지된다.
- 속성 패널에서 `X`, `Y`, 너비 또는 높이를 바꾼 뒤 `blur`, 패널 밖 click과 `Enter`를 각각 사용해도 같은 검증 및 저장 결과가 나온다. 한 이벤트에 뒤따른 다른 적용 계기가 같은 초안을 두 번 저장하지 않는다. 범위 밖 값은 기존 geometry 및 revision을 바꾸지 않는다. 유효하지 않은 초안으로 패널을 닫으려 하면 첫 오류 입력으로 이동하고 `저장값으로 되돌리기` 전에는 닫히지 않는다.
- 맨 앞으로와 맨 뒤로를 실행하면 대상이 모든 메모 위 또는 아래에 나타나고 나머지 메모의 상대 순서는 유지된다. 새로고침 뒤에도 겹침 순서가 복원되고 content revision은 바뀌지 않으며, 각 메모의 `tabindex`와 이후 Tab 순서는 실행 전과 같다.
- 삭제 직후 대상 메모만 사라지고 메인 패널 중앙 하단 토스트가 포커스를 가져가지 않은 채 5초 동안 나타난다. 보이는 동안 `취소`는 연속 삭제의 최근 항목부터 같은 원문, geometry와 겹침 순서로 복원하고 복원된 메모로 포커스를 옮긴다. 새로고침 뒤에는 삭제 이력이 없다.
- 네 가장자리와 네 꼭짓점을 pointer로 drag하면 해당 방향으로 크기가 바뀌고, 메모 본문 또는 메모 밖의 일반 지점에서는 크기 변경이 시작되지 않는다.
- 메모와 다른 조작 요소가 없는 보이는 캔버스의 서로 다른 지점에서 mouse 및 pen `5 CSS px`, touch `10 CSS px`를 넘게 drag하면 같은 방식으로 시점이 이동한다. 메모 본문에서 시작한 선택과 메모 가장자리에서 시작한 크기 변경은 캔버스 시점 이동을 함께 실행하지 않는다.
- 직전 캔버스 제스처의 종료 event 일부가 누락된 상태에서 다음 신뢰할 수 있는 pointer 입력으로 새 시점 이동을 시작해도 현재 보이는 시점에서 이어지고, `pointerup`, 뒤이은 `lostpointercapture`, 창 포커스 변화와 다음 화면 갱신 뒤에도 마지막 시점이 유지된다.
- geometry만 바꾸면 content revision이 유지되고, 원문을 바꾸면 content revision이 바뀐다.
- `48rem` 직전과 직후를 왕복하면 제한된 높이의 생성 순서 목록과 공간형 보드가 전환되고 기존 geometry 및 겹침 순서가 복원된다.
- 320 CSS px 목록의 짧은 누르기로 상세 화면에 이동하고 전체 원문을 수정해 저장한 뒤 목록과 넓은 화면에서 같은 원문을 확인한다.
- 넓은 화면의 자동 저장은 마지막 입력 `800ms` 뒤 또는 `blur`, 내부 route 이동, document hidden과 `pagehide`에서 최신 원문을 보존한다. 작은 화면의 명시적 저장은 저장 전 내부 이동, 중복 실행과 실패에서도 편집 초안을 보존한다.
- 넓은 화면과 모바일 상세의 현재 본문은 React Hook Form 한 곳에 있으며, 저장 중 추가 입력과 외부 revision 반영 뒤에도 최신 입력과 화면별 dirty 상태가 정한 규칙대로 유지된다.

### 중단 조건

자동 저장과 상세 편집 복구 초안이 transaction 완료 전 성공으로 표시되거나 최신 입력을 잃으면 이 단위를 완료하지 않는다. 본문 편집, 시점 이동, header click, 더블클릭, 선택 지점의 `Enter`, 선택 해제, drag와 edge resize가 같은 입력에서 의도하지 않은 결과를 함께 실행하면 U6을 시작하지 않는다. header drag 중 캔버스 계산 크기가 바뀌거나 작은 화면 전환 및 목록 최대 높이가 저장 geometry를 변경하면 geometry 저장을 바로 중단하고 복원 규칙을 먼저 고친다. `tabIndex`, `zIndex`, geometry, 패널 닫기, 삭제 LIFO 이력 또는 결정된 포커스 순서를 구현 결과가 어기면 영향을 받는 부분을 완료하지 않는다.

## U6. Clipboard 개별 복사, 일괄 복사 시작과 사용 횟수 기록

### 목적과 기준

넓은 화면의 `Command+클릭`과 작은 화면 목록의 길게 누르기는 메모 원문 전체를 개별 복사한다. 넓은 화면의 `Command+Option+클릭`은 현재 원문 스냅샷을 저장된 일괄 복사 목록에 추가하고, 작은 화면은 목록 헤더 아이콘으로 별도 일괄 복사 작업을 시작한다. 상태 안에서는 누른 횟수와 순서대로 IndexedDB 작업 초안을 만들고 각 항목 추가와 일괄 복사 사용 횟수를 함께 저장한다. 하단 `다음`은 Clipboard 쓰기 없이 저장한 확인 단계로 전환하고 일괄 복사 확인 페이지로 이동한다.

### 선행 조건

U3의 transaction 저장과 U5의 메모 상호작용이 필요하다.

### 변경 후보

- `apps/notes/src/_pages/notes/model/copy-note.ts`
- `apps/notes/src/_pages/notes/model/copy-note.test.ts`
- `apps/notes/src/features/add-note-to-batch-copy/model/add-note-to-batch-copy.ts`
- `apps/notes/src/features/add-note-to-batch-copy/model/add-note-to-batch-copy.test.ts`
- `apps/notes/src/shared/lib/clipboard/browser-clipboard-writer.ts`
- `apps/notes/src/_pages/settings/ui/settings-start-page.tsx`
- `apps/notes/src/_pages/notes/ui/note-actions.tsx` 제거 후보
- `apps/notes/src/_pages/notes/ui/note-card.tsx`
- `apps/notes/src/_pages/notes/ui/mobile-batch-copy-bar.tsx`
- `apps/notes/src/_pages/notes/model/mobile-batch-copy-session.ts`
- `apps/notes/src/_pages/notes/model/mobile-batch-copy-session.test.ts`
- `apps/notes/src/_pages/batch-copy/model/mobile-batch-copy-confirmation.ts`
- `apps/notes/src/_pages/batch-copy/model/mobile-batch-copy-confirmation.test.ts`
- `apps/notes/e2e/notes.spec.ts`

### 작업

- 넓은 화면의 본문 `Command+클릭`이 `copyNote` command를 호출하게 하고 별도의 복사 버튼은 제거한다. 일반 click과 drag는 본문의 커서 이동 및 텍스트 선택에 맡긴다.
- `key === "Meta"`인 첫 신뢰할 수 있는 `keydown`에서 메모 선택 ID를 비우고 `Command` 상태의 헤더 비노출을 시작하되 기본 동작을 막지 않는다. `keyup`에서는 헤더만 복원하고 선택은 되살리지 않는다. 실제 본문 pointer 입력에서는 해당 event의 `metaKey`를 복사 판정과 선택 억제의 최종 근거로 사용한다. 창과 문서 상태 변화는 보조 복원 신호로 사용하고, 다음 신뢰할 수 있는 key 또는 pointer event에서 `metaKey`가 거짓이면 남은 비노출 상태를 다시 맞춘다. 합성 event와 물리 키 코드를 실제 보조 키 상태의 근거로 사용하지 않는다. 브라우저 event 구독은 cleanup을 포함한 Effect로 연결하되 상태 변화를 관찰하는 Effect에서 복사, 선택 해제나 패널 활성화를 실행하지 않는다.
- `Command` 상태에서는 모든 메모의 헤더와 아이콘을 보이지 않고 pointer로 조작할 수 없게 하되 헤더 행의 계산 높이, 본문 위치와 메모 외곽 크기를 유지한다. 붉은 선택 테두리는 keydown에서 사라진다. 헤더 아이콘의 키보드 포커스는 같은 메모 선택 지점으로 옮기고 그 밖의 포커스는 유지한다.
- Clipboard 쓰기 성공 뒤 개별 복사 횟수를 저장하고, 횟수 저장 실패는 복사 성공과 분리해 알린다.
- `Command+Option+클릭`은 설정이 켜진 넓은 화면의 메모 본문에만 적용한다. 두 보조 키 조합을 먼저 판정해 `Command+클릭` 개별 복사와 함께 실행되지 않게 한다.
- 설정 checkbox의 현재 값과 입력 상태는 설정 화면의 React Hook Form이 맡는다. 변경 시 저장 명령에는 `getValues`로 읽은 값을 전달하고, 실패하면 저장된 값으로 `reset`하면서 원인과 재시도를 알린다. 설정 Context에는 매 입력값을 중복 보관하지 않고 저장된 설정 및 비동기 결과만 둔다.
- 포커스가 있는 메모 선택 지점에서 `Command+Option+Enter`를 실행하면 그 메모를 대상으로 같은 항목 추가 명령을 호출한다. `Command` keydown으로 선택 ID가 비워져도 포커스 대상 ID로 key sequence를 완료한다. 이 키보드 입력은 pointer 보조 키 설정과 관계없이 유지하고, 속성 패널 열기나 개별 복사를 함께 실행하지 않는다.
- 헤더, 헤더 아이콘, resize 영역, 탐색과 다른 제어의 클릭은 개별 복사 또는 일괄 복사 추가로 해석하지 않는다.
- 본문의 `Command+클릭`과 `Command+Option+클릭`은 메모의 상위 pointer 및 focus handler로 전파돼 메모를 다시 선택하거나 속성 패널 대상 및 `note-properties` 활성화를 바꾸지 않는다.
- 일괄 복사 항목과 해당 사용 횟수를 한 IndexedDB transaction으로 저장한다. 실패하면 둘 다 반영하지 않는다.
- `72rem` 이상에서 첫 항목 추가가 성공하면 현재 포커스를 옮기지 않고 오른쪽 패널을 열어 새 항목을 보여준다. `48rem` 이상 `72rem` 미만이면 모달을 자동으로 열지 않고 일괄 복사 패널 버튼의 항목 수만 갱신한다.
- inline 오른쪽 영역에서 `Command+Option+클릭`, 항목 추가 또는 일괄 복사 제어를 실행하면 최근 활성 패널을 일괄 복사 패널로 바꾼다. 속성 패널을 숨겨도 속성 패널 대상과 속성 초안을 지우지 않는다. 그 뒤 한 번의 헤더 click이나 `Tab` 선택만으로 속성 패널로 돌아가지 않고, 이동이 아닌 헤더 더블클릭 또는 선택된 메모의 선택 지점에서 실행한 `Enter`에서만 전환한다.
- `48rem` 미만 목록에는 Pointer Events 기반 길게 누르기 개별 복사를 제공한다. 500ms 동안 시작점에서 `10 CSS px` 안에 머물고 같은 메모 안에서 `pointerup`이 발생한 경우에만 완료한다. 성공하면 뒤따르는 `click` 상세 이동을 막는다. 스크롤, 메모 밖 이동, `pointercancel`과 `lostpointercapture`는 복사와 상세 이동을 모두 취소한다.
- 작은 화면 목록 헤더의 아이콘 버튼으로 저장 목록과 분리된 빈 일괄 복사 작업을 시작한다. 상태에서 메모를 짧게 누를 때마다 현재 원문 스냅샷 추가와 일괄 복사 사용 횟수 증가를 한 transaction으로 저장하고 완료 뒤 클릭 횟수를 갱신한다. 같은 메모의 반복 입력도 별도 항목으로 기록한다. 길게 누르기는 항목 추가, 개별 복사와 상세 이동을 모두 실행하지 않는다.
- 상태의 헤더 왼쪽 뒤로가기 아이콘은 Clipboard를 바꾸거나 다음 단계로 이동하지 않고 작업 초안을 지운 뒤 평상시 목록으로 돌아간다. 하단 `초기화`는 작업 초안과 클릭 횟수를 비우고 상태를 유지하며, `다음` 문구 옆에는 현재 클릭 횟수를 표시한다.
- `다음`은 작업 초안의 단계를 `confirming`으로 저장한 뒤 `/batch-copy` 확인 페이지로 이동한다. 이 동작은 Clipboard, 원본 메모와 저장된 일괄 복사 목록을 바꾸지 않는다.
- 예기치 않은 route 이동과 새로고침에서는 작업 초안을 복원한다. 작업 초안의 항목 및 클릭 횟수 변화로 결과를 전달하고 `누적했습니다`와 같은 별도 성공 알림은 만들지 않는다.
- Clipboard 거절과 쓰기 실패는 실패 원인, 다시 시도와 설정 확인 동작을 가진 5초 알림으로 보여준다. 성공 알림도 5초 뒤 사라지고 focus를 옮기지 않는다.

### 검증 방식

application 명령에는 TDD를 적용한다. 성공, Clipboard 실패, 개별 복사 성공 뒤 횟수 저장 실패, 일괄 복사 transaction 실패, 더 구체적인 보조 키 조합의 우선순위, 헤더 비노출 및 다음 신뢰할 수 있는 입력의 복원 전이, 최근 활성 패널 전이와 모바일 작업 초안의 반복 추가, 초기화, 명시적 취소, 복원 및 확인 단계 전환은 구현 전에 사용자 결과를 안정적으로 설명할 수 있다. 실제 Clipboard 권한, 사용자 활성화, 운영체제가 단축키를 가로채는 event 누락, 클릭, 보조 키, 길게 누르기의 시간 및 이동, 스크롤, route 이동과 새로고침은 TDD 대상이 아니며 허용 접속 주소의 실제 브라우저에서 검사한다.

- `Command+클릭` 또는 모바일 길게 누르기의 Clipboard 쓰기와 횟수 저장이 모두 성공하면 해당 content revision의 개별 복사 횟수가 한 번 증가한다.
- Clipboard 쓰기가 실패하면 횟수가 증가하지 않고 원인 및 다음 동작이 표시된다.
- Clipboard는 성공하고 횟수 저장만 실패하면 붙여넣기는 가능하며 기록 실패 알림이 따로 표시된다.
- 일괄 복사 transaction을 중단하면 항목과 횟수가 모두 바뀌지 않는다.
- `Command+Option+클릭`에 성공하면 같은 메모 화면의 항목 수와 목록이 갱신되고 개별 복사는 실행되지 않으며 별도 성공 알림도 나타나지 않는다.
- 포커스가 있는 선택 지점의 `Command+Option+Enter`에 성공하면 그 메모의 항목 추가 결과만 만들고 속성 패널이 열리지 않는다. `Command` keydown으로 선택 ID가 비워지고 pointer 보조 키 설정을 꺼도 이 키보드 입력은 유지된다.
- `Command`를 누르면 메모 선택 ID와 붉은 선택 테두리가 사라지고 헤더와 아이콘도 보이지 않아 조작할 수 없지만 각 메모의 계산 너비와 높이, 본문 시작 위치, 속성 패널 대상과 초안은 유지된다. 헤더 아이콘에 포커스가 있으면 같은 메모 선택 지점으로 옮기고, 그 밖의 포커스는 유지하며 계속 식별할 수 있어야 한다. `keyup`, 창 및 문서 상태 변화, route 이탈과 다음 신뢰할 수 있는 입력 뒤에는 헤더가 다시 나타나고 잘못 남은 보조 키 상태가 없어지며 선택은 자동 복원되지 않는다. `Command`와 조합한 운영체제 및 브라우저 기본 동작도 막지 않는다.
- macOS에서 `Shift+Command+5`로 Screenshot 도구를 열어 캡처를 완료하거나 취소한 뒤 별도의 `Command` 입력 없이 헤더가 다시 나타나는지 수동으로 확인한다. 자동 검사는 keyup, blur 또는 visibility event가 누락된 상태 전이와 다음 신뢰할 수 있는 event 복원을 검사하되 운영체제 단축키 자체를 재현했다고 주장하지 않는다.
- 본문의 `Command+클릭`과 `Command+Option+클릭` 전후에 선택 ID는 비어 있고 속성 패널 대상 ID는 유지되며, 속성 패널을 새로 열지 않는다. `Command` 상태에서 헤더가 있던 위치의 pointer 입력도 메모를 선택하거나 이동하지 않는다.
- 넓은 화면의 본문을 일반 click하거나 drag하면 커서 또는 선택 범위만 바뀌고 Clipboard나 일괄 복사 목록은 바뀌지 않는다.
- 설정을 끄면 `Command+Option+클릭`으로 항목이 추가되지 않고 메모 안에 일괄 복사 텍스트 버튼이 나타나지 않는다. `Command+클릭` 개별 복사는 유지된다.
- 설정 checkbox의 현재 값과 입력 상태는 설정 화면의 React Hook Form 한 곳에서 관리되고, 저장 실패 뒤에는 저장된 값과 오류 안내가 함께 복원된다.
- `Ctrl`, `Shift`, `Option+클릭`만, 헤더 아이콘과 탐색 항목에는 일괄 복사 추가가 발생하지 않는다.
- 320 CSS px에서 메모를 500ms 동안 `10 CSS px` 안에 누른 뒤 카드 안에서 손을 떼면 원문을 한 번 복사하고 상세 화면으로 이동하지 않는다.
- 길게 누르기 전에 pointer가 이동하거나 스크롤, `pointercancel`, `lostpointercapture` 또는 메모 밖 `pointerup`이 발생하면 Clipboard, 상세 route와 사용 횟수가 바뀌지 않는다.
- 모바일 목록 헤더 아이콘으로 일괄 복사 상태를 시작하면 헤더 뒤로가기와 하단 `초기화` 및 `다음`이 나타난다. 상태에서 같은 메모를 포함해 여러 번 짧게 누르면 상세 화면으로 이동하지 않고 누른 순서의 작업 초안과 같은 클릭 횟수를 만든다. `초기화` 뒤 두 값은 0이고 상태는 유지된다.
- 모바일 일괄 복사 상태의 짧은 누르기는 작업 초안 항목과 그 메모의 일괄 복사 사용 횟수를 함께 저장하고, 길게 누르기는 두 자료를 바꾸지 않는다. `다음`을 실행하면 `/batch-copy` 확인 페이지가 같은 순서와 중복의 작업 초안을 보여주며 Clipboard, 원본 메모와 저장 목록은 바뀌지 않는다.
- 속성 패널이 보일 때 일괄 복사 동작을 실행하면 일괄 복사 패널이 나타난다. `Command`로 메모 선택은 해제되지만 속성 패널 대상, 속성 초안, 항목과 제거 이력은 유지된다. 다시 메모를 한 번 click하거나 `Tab`으로 선택해도 일괄 복사 패널이 유지되고, 이동이 아닌 헤더 더블클릭 또는 선택된 메모의 선택 지점에서 실행한 `Enter`에서만 속성 패널이 나타난다.

### 중단 조건

브라우저 가짜 객체에서만 Clipboard 성공을 확인했거나 일괄 복사 항목 및 횟수가 부분 성공할 수 있으면 U7과 U8을 시작하지 않는다. `Command`를 놓거나 창 및 문서 상태가 바뀐 뒤, 또는 modifier가 없는 다음 신뢰할 수 있는 입력 뒤에도 헤더가 숨은 상태로 남거나 보조 키 복사가 메모를 다시 선택하거나 속성 패널 활성화를 함께 실행하면 U7을 시작하지 않는다. 합성 event가 헤더 상태를 실제 입력처럼 바꾸거나 실제 `Shift+Command+5` 완료 및 취소를 확인하지 못하면 해당 복원 결과를 완료하지 않는다. 헤더 아이콘 포커스가 `Command`에서 사라지거나 모바일 작업 초안이 저장 목록과 섞이거나 명시적 취소 뒤 복원되면 해당 결과를 완료하지 않는다. pointer 보조 키 설정을 끈 환경에서 선택 지점의 `Command+Option+Enter`가 일괄 복사 항목을 추가하지 못하면 해당 접근성 결과를 완료하지 않는다. 길게 누르기가 작은 화면의 세로 스크롤이나 상세 이동을 반복해서 가로채면 U7을 시작하기 전에 `500ms`, `10 CSS px`와 `touch-action` 범위를 실제 브라우저 근거로 다시 검토한다.

## U7. 일괄 복사 순서 편집과 제거 복구

이 단위의 스냅샷, 제거 복구와 저장 수명은 유지한다. 위치 교환, 항목 전체 long-press drag와 상시 삭제 제어는 U17의 이동 핸들, 삽입식 재정렬과 더보기 구조로 대체한다.

### 목적과 기준

항목 추가 순서의 원문 스냅샷을 메모 화면의 일괄 복사 패널과 모바일 확인 페이지에서 줄바꿈으로 결합한다. 넓은 패널에서는 항목 하나를 선택하고 pointer drag 또는 선택된 항목 본문의 방향키로 순서를 바꾸며, 패널 밖 놓기와 직접 삭제 버튼으로 제거한다. 저장 목록의 제거만 실행 취소 및 다시 실행할 수 있게 한다. 모바일 확인 페이지는 저장 목록과 분리된 IndexedDB 작업 초안을 길게 누른 뒤 drag하거나 `위치 변경`과 교환 대상 선택으로 재정렬하고 항목별 동작 선택창에서 복제 및 삭제한다. 이 세 동작은 원본 메모와 사용 횟수를 바꾸지 않는다.

[일괄 복사 순서와 제거 복구 결정](decisions/accumulator-ordering-and-recovery.md)이 이력 범위와 수명을 정하고 [일괄 복사 패널과 모바일 확인 페이지 결정](decisions/accumulator-workspace-panel.md)이 표시 위치와 반응형 표현을 정한다.

### 선행 조건

U3의 일괄 복사 저장 및 session state와 U6의 항목 추가 command가 필요하다.

### 변경 후보

- `apps/notes/app/batch-copy/page.tsx`
- `apps/notes/src/entities/batch-copy/model/batch-copy-commands.ts`
- `apps/notes/src/entities/batch-copy/model/batch-copy-history.ts`
- `apps/notes/src/entities/batch-copy/model/{batch-copy-commands,batch-copy-history}.test.ts`
- `apps/notes/src/features/edit-batch-copy/model/{edit-batch-copy,copy-batch-copy-text}.ts`
- `apps/notes/src/features/edit-batch-copy/ui/{batch-copy-editing-view,batch-copy-history-shortcuts,batch-copy-list,copy-batch-copy-action}.tsx`
- `apps/notes/src/_pages/notes/ui/batch-copy-workspace.tsx`
- `apps/notes/src/_pages/batch-copy/ui/batch-copy-start-page.tsx`
- `apps/notes/src/_pages/batch-copy/ui/mobile-batch-copy-confirmation.tsx`
- `apps/notes/src/_pages/batch-copy/ui/batch-copy-item-actions.tsx`
- `apps/notes/src/_pages/batch-copy/index.ts`
- `apps/notes/e2e/batch-copy.spec.ts`

### 작업

- 항목 ID, 원본 메모와 content revision, 클릭 당시 원문 및 추가 시각을 저장하고 같은 원문의 중복을 허용한다.
- 배열 순서를 결합 순서로 사용하고 기본 구분자는 줄바꿈으로 둔다.
- 넓은 패널 안의 drop은 재정렬하고 패널 전체의 외곽을 벗어난 이동 중에만 제거 예정 상태를 보여준다. 다른 항목 위에서는 그 항목 전체를 현재 놓기 후보로 표시한다. drag 중 `Escape`, `pointercancel`과 완료 전 capture 상실은 원래 순서로 되돌리고, 성공한 `pointerup` 뒤의 `lostpointercapture`는 확정 결과를 되돌리지 않는다.
- 넓은 패널에서는 항목 숫자, 위로 이동과 아래로 이동 버튼, action 또는 overflow 버튼과 동작 선택창을 표시하지 않는다. 항목 본문은 안정된 이름과 `aria-pressed`가 있는 네이티브 toggle button으로 만들고 클릭, `Enter` 또는 `Space`로 한 항목을 선택하거나 같은 항목의 선택을 해제한다. 우측 상단 붉은 삭제 버튼은 본문 버튼과 중첩하지 않으며 pointer hover 또는 항목 내부 `focus-within`에서 표시하고, hover가 없거나 coarse pointer인 환경에서는 항상 표시한다.
- 선택된 항목 본문에 포커스가 있을 때 `ArrowUp`과 `ArrowDown`은 같은 순수 재정렬 명령으로 항목을 한 자리 옮긴다. 목록 처음과 끝에서는 자료를 바꾸지 않고, 이동 뒤 같은 항목 ID의 선택과 포커스를 유지하며 새 위치와 전체 항목 수를 live region으로 알린다. 삭제 버튼과 다른 하위 제어의 방향키는 가로채지 않는다.
- 선택되지 않은 넓은 패널 항목을 drag하면 거리 기준을 처음 넘긴 시점에 해당 항목을 선택한다. 이미 선택된 항목의 drag는 선택을 해제하지 않으며, drag 종료 뒤 억제되는 click에 선택 결과를 맡기지 않는다.
- 메모 선택과 일괄 복사 항목 선택은 동시에 유지할 수 있다. drag, 열린 동작 선택창이나 다른 상위 임시 조작이 없을 때 한 번의 보조 키 없는 `Escape`로 둘을 함께 해제하되 일괄 복사 항목, 순서, 제거 이력, 속성 패널 대상과 최근 활성 패널을 유지한다. 모달 패널에서는 선택이 없는 다음 `Escape`만 패널을 닫는다.
- 저장된 목록 관리와 모바일 확인 페이지에서 `위치 변경`을 실행하면 다른 항목에 최소 `24 × 24` CSS px의 교환 대상 버튼을 표시한다. pointer 또는 키보드로 하나를 실행하면 drag와 같은 재정렬 명령을 사용하고, 취소하면 원래 순서를 유지한다.
- 저장된 목록 관리로 진입한 모바일 페이지의 각 항목 왼쪽에는 재정렬을 시작하는 네이티브 버튼을 두고, 위로 이동, 아래로 이동과 제거 버튼을 drag 없는 대안으로 유지한다.
- 일괄 복사 상태의 `다음`으로 진입한 모바일 확인 페이지는 `confirming` 작업 초안의 항목을 현재 결합 순서로 표시한다. 항목의 동작 아이콘이 아닌 영역을 500ms 동안 누르고 10 CSS px 이내에 머문 뒤에만 touch drag를 시작한다. 활성화되면 들린 항목과 교환 대상을 색 이외의 변화로 표시한다. 대기 중 범위 밖 이동 및 스크롤, `pointercancel`과 `lostpointercapture`는 순서와 작업 초안을 바꾸지 않고 원래 시각 상태로 복원한다.
- 확인 항목 우측 상단의 접근 가능한 아이콘 버튼은 버튼 가까이에 HTML `popover="auto"` 동작 선택창을 열고 `위치 변경`, `복제`와 `삭제`를 제공한다. 이름 있는 `role="group"` 안의 네이티브 버튼과 일반 `Tab` 순서를 사용하고, 내려받은 여러 `.fig`의 menu 및 action menu에서 확인한 표면, 조밀한 세로 행과 상태 구성을 개인 메모 디자인 토큰으로 구현한다. 열기, light dismiss, `Escape`, 실행 버튼으로의 포커스 복귀, 키보드 실행, `focus-visible`, pressed와 구분된 삭제 상태를 실제 브라우저에서 검증한다. 브라우저 기본 외형, `menu` 역할이나 외부 접근성 부품에 완성도를 맡기지 않는다.
- 복제는 같은 원본 메모 참조 및 원문 스냅샷을 가진 새 항목 ID를 대상 바로 뒤에 만들고, 삭제는 대상 항목 ID 하나만 확인 작업에서 제거한다. 재정렬, 복제와 삭제는 원본 메모 repository, 메모 revision, 저장 목록의 제거 이력과 사용 횟수를 바꾸지 않는다.
- 제거 command는 항목과 이전 index를 이력에 넣는다. 실행 취소는 이전 index에 복원하고 다시 실행은 같은 ID를 제거한다. 직접 제거와 다시 실행이 저장에 성공하면 결과에 실제 제거 ID를 포함하고, 조립 지점이 해당 일괄 복사 선택을 한 번 정리한다. 패널과 저장 목록 관리 route는 별도의 선택 정리 callback을 만들지 않는다.
- 모바일 확인 작업은 기존 저장 목록과 분리한 IndexedDB 초안으로 연결한다. 예기치 않은 route 이동과 새로고침에서는 단계와 순서를 복원하고, 확인 페이지의 뒤로가기는 편집한 항목을 유지한 채 수집 단계로 돌아간다. 수집 헤더 뒤로가기와 확인 페이지의 `취소`는 초안을 지운다. 이전 길게 누르기 선택과 저장 목록 제거 연결은 재사용하지 않는다.
- 실행 취소 뒤 추가, 재정렬 또는 제거가 성공하면 redo를 비운다. 추가와 재정렬 자체는 undo 대상에 넣지 않는다.
- 메모 편집기에 focus가 있으면 애플리케이션 이력 단축키가 편집기 undo를 가로채지 않는다.
- 패널에는 실행 취소와 다시 실행 버튼을 표시하지 않는다. 제거 이력과 키보드 단축키는 유지한다.
- `48rem` 이상에서는 메모 화면 우측 상단의 버튼에서 패널을 연다. `72rem` 이상의 첫 항목 추가 성공은 나란한 오른쪽 패널을 열고, `48rem` 이상 `72rem` 미만에서는 항목 수만 갱신한다.
- `48rem` 미만에서는 일괄 복사 상태의 `다음` 또는 평상시 메모 목록 Drawer의 저장 항목 수 링크로 `/batch-copy`에 이동한다. 화면은 진입 자료에 따라 실행 중 확인 작업과 저장 목록 관리를 구분한다.
- 나란한 표현, 모달 표현과 저장 목록 관리로 연 모바일 페이지는 `features/edit-batch-copy`의 같은 목록 UI 및 명령, 일괄 복사 자료와 제거 이력을 사용한다. `다음`으로 연 확인 페이지는 실행 중 작업 사본 명령을 사용하고 저장 목록 이력과 섞지 않는다. `_pages/notes`와 `_pages/batch-copy`가 서로 import하지 않게 한다.
- 모바일 확인 페이지 하단의 `취소`는 Clipboard와 저장된 일괄 복사 자료를 바꾸지 않고 작업 초안을 지운 뒤 메모 화면으로 돌아간다. 저장 목록 관리 페이지의 `취소`는 기존 자료와 이력을 유지한 채 메모 화면으로 돌아간다. `일괄 복사하기`는 현재 화면의 작업 순서와 줄바꿈 구분자로 만든 문자열을 Clipboard에 쓰고 성공 또는 다시 시도할 수 있는 실패 알림을 제공하되 현재 페이지와 작업 초안을 유지한다.
- 넓은 패널에는 결합된 전체 텍스트 미리보기를 표시하지 않는다. `복사`는 현재 순서와 줄바꿈 구분자로 문자열을 만들고 Clipboard에 쓴다. 결과 알림은 캔버스와 패널 밖 주 작업 영역 우측 상단에 고정하며 개별 복사와 일괄 복사 횟수를 모두 바꾸지 않는다.
- 전체 복사 결과 알림은 한 영역에서 갱신하고 포커스를 옮기지 않으며 표시된 시점부터 5초 뒤 사라진다. 새 결과가 오면 5초를 다시 세며 실패 상태에서는 같은 텍스트를 다시 시도하거나 설정을 확인할 수 있다. 저장 목록을 읽지 못한 상태처럼 복구 동작이 계속 필요한 오류는 자동 종료 토스트로 만들지 않고 명시적인 재시도 제어가 있는 오류 영역으로 유지한다.

### 검증 방식

일괄 복사 명령, 항목 선택, 방향키 한 자리 재정렬, 제거 이력과 모바일 확인 작업 초안 명령에는 TDD를 적용한다. 순서, 중복, 선택 전이, 처음 및 마지막 경계, 이전 index, 이력 분기, 교환 대상 선택, 대상 바로 뒤의 고유 ID 복제, 명시적 취소와 원본 메모 불변 조건은 안정된 상태 전이로 표현할 수 있고 경계 사례가 많다. click, `Enter`, `Space`, `Escape`, 실제 포커스와 live announcement, 길게 누르기 시간, drag 좌표, popover 위치, route 이동과 새로고침에 따른 복원은 TDD를 적용하지 않고 실제 브라우저에서 검사한다.

- 같은 원문을 세 번 추가하면 세 항목이 추가 순서로 결합된다.
- 첫 항목, 중간 항목과 마지막 항목을 제거한 뒤 각각 이전 위치로 복원할 수 있다.
- 실행 취소, 다시 실행과 실행 취소 뒤 새 변경의 redo 비우기가 결정대로 동작한다.
- 목록 밖으로 나갔다가 `Escape` 또는 `pointercancel`하면 항목과 이력이 바뀌지 않는다.
- 넓은 패널은 숫자 순서, 위로 이동, 아래로 이동, 실행 취소 및 다시 실행 버튼과 항목 동작 선택창을 표시하지 않는다. drag와 선택된 항목 본문의 방향키가 같은 순수 재정렬 명령을 사용하며 제거, 재정렬, undo 및 redo는 사용 횟수를 바꾸지 않는다.
- 넓은 패널 항목 본문을 click, `Enter` 또는 `Space`로 실행하면 한 항목만 선택되거나 같은 항목의 선택이 해제된다. 선택은 `aria-pressed`와 항목 전체의 굵고 끊기지 않는 붉은 테두리로 전달되며 키보드 `focus-visible` 및 drag 놓기 후보와 구분된다.
- 선택된 항목 본문의 `ArrowUp`과 `ArrowDown`은 중간 항목을 한 자리씩 옮기고 처음 및 마지막 경계에서는 자료를 바꾸지 않는다. 이동 뒤 같은 항목이 선택되고 포커스가 유지되며 새 위치와 전체 항목 수를 들을 수 있다. 메모와 항목이 함께 선택됐을 때 상위 임시 조작이 없는 `Escape`는 두 선택만 해제한다.
- 같은 위치 문구가 연속되는 방향키 이동도 live region에 별도 DOM 변경을 만들고, 보조 키가 있거나 IME 조합 중인 `Escape`는 전역 선택을 해제하지 않는다.
- 넓은 패널의 항목에 pointer를 올리거나 내부에 키보드 포커스를 두면 우측 상단의 붉은 직접 삭제 버튼이 나타난다. 항목을 떠나고 내부 포커스도 없으면 버튼이 사라지며 hover가 없는 환경에서는 항상 보인다.
- 다른 route를 다녀오면 제거 이력을 사용할 수 있고 새로고침하면 사용할 수 없다.
- 나란한 패널, 모달 패널과 저장 목록 관리 페이지를 오가거나 패널을 닫았다 다시 열어도 저장 항목 순서와 제거 이력이 유지된다. 패널에서 선택한 항목을 저장 목록 관리 페이지에서 제거하거나 다시 실행한 뒤 돌아오면 해당 선택은 남지 않는다.
- 저장 목록 관리로 연 모바일 페이지에서 서로 다른 항목 네 개 이상을 준비하고 위치 변경에서 첫 항목과 마지막 항목을 교환한다. 새로고침 뒤에도 같은 순서를 확인한다. 위로 및 아래로 이동 버튼은 각각 이웃 항목과 교환하는지 따로 확인한다. `취소`는 복사하지 않고 메모 화면으로 돌아가며 자료와 이력을 유지한다.
- 모바일 확인 페이지에서 일반 터치나 세로 스크롤은 순서를 바꾸지 않고, 항목을 500ms 동안 10 CSS px 이내로 누른 뒤 drag하면 활성 상태와 현재 교환 대상이 나타나며 놓은 위치의 순서가 결합 결과에 반영된다. `pointercancel`과 `lostpointercapture`에서는 작업 초안과 시각 상태가 원래대로 복원된다.
- 확인 항목의 동작 아이콘을 실행하면 실행 버튼 가까이에 개인 메모 디자인 시스템의 `위치 변경`, `복제`와 `삭제`가 있는 작은 선택창이 열린다. 복제는 대상 바로 뒤에 새 ID의 항목을 만들고 삭제는 대상 ID 하나만 제거하며, 세 동작 뒤에도 원본 메모, 메모 revision, 수집 단계 `clickCount`, 저장 목록 제거 이력과 사용 횟수는 바뀌지 않는다.
- 동작 선택창은 보이는 동작 이름, `focus-visible`, pressed와 다른 동작에서 구분된 삭제 상태를 제공한다. 바깥 영역 실행과 `Escape`로 닫히며, 키보드로 위치 변경, 복제 및 삭제를 실행할 수 있고 닫힌 뒤 포커스가 실행 버튼으로 돌아간다.
- 모바일 확인 작업은 route 이동과 새로고침 뒤 같은 단계 및 순서로 복원되고 저장된 일괄 복사 목록은 바뀌지 않는다. 확인 페이지 뒤로가기는 편집한 항목을 유지해 수집 단계로 돌아가며, 수집 헤더 뒤로가기와 확인 페이지 `취소` 뒤에는 작업 초안이 복원되지 않는다.
- 전체 복사는 현재 항목 순서와 줄바꿈 구분자로 만든 정확한 문자열을 Clipboard에 쓰며, 성공과 원인별 실패를 구분한다. 넓은 패널에는 결합 미리보기가 없고 결과 알림은 주 작업 영역 우측 상단에 고정된다. 알림은 포커스를 가져가지 않고 5초 뒤 사라지며 다음 복사 시도에서 같은 영역을 갱신하고 5초를 다시 센다. 어느 결과에서도 항목, 제거 이력과 두 사용 횟수는 바뀌지 않는다.

### 중단 조건

항목 ID가 아닌 원문 값으로 제거해 중복 항목을 잘못 처리하거나, 확인 작업 명령이 원본 메모, 저장된 목록 또는 사용 횟수를 바꾸거나, 편집기 undo와 애플리케이션 undo가 충돌하면 이 단위를 완료하지 않는다. 데스크톱 항목 선택, 키보드 포커스와 drag 놓기 후보를 구분할 수 없거나 방향키 이동 뒤 선택, 포커스 및 위치 안내가 끊기면 해당 결과를 완료하지 않는다. hover 없는 환경에서 직접 삭제 버튼을 사용할 수 없거나 모바일 `위치 변경`과 교환 대상 선택이 drag와 같은 순서를 만들지 못하면 해당 접근성 결과를 완료하지 않는다. 작업 초안이 명시적 취소 뒤 복원되거나 예기치 않은 새로고침에서 사라지면 자료 수명 구현을 고친 뒤 진행한다.

## U8. 사용 빈도 조회와 화면

### 목적과 기준

메모 ID, content revision과 복사 당시 원문별 개별 복사, 일괄 복사 항목 추가와 계산한 합계를 별도 화면에서 비교한다. [텍스트 사용 빈도 집계 결정](decisions/usage-counting.md)이 집계 단위와 제외 동작을 정한다.

### 선행 조건

U6의 두 횟수 저장이 완료되어야 한다. U7의 제거 및 재정렬이 횟수를 바꾸지 않는다는 결과를 함께 사용한다.

### 변경 후보

- `apps/notes/src/_pages/usage/model/read-usage.ts`
- `apps/notes/src/_pages/usage/model/usage-projection.ts`
- `apps/notes/src/_pages/usage/model/usage-projection.test.ts`
- `apps/notes/src/_pages/usage/ui/usage-page.tsx`
- `apps/notes/src/_pages/usage/ui/usage-row.tsx`
- `apps/notes/src/_pages/usage/usage.browser.test.ts`

### 작업

- 저장된 두 횟수에서 합계를 계산하고 합계를 별도 원본 필드로 저장하지 않는다.
- 현재 및 이전 content revision을 원문 스냅샷과 함께 읽되 서로 다른 메모의 같은 원문을 합치지 않는다.
- 개별 복사, 일괄 복사와 합계를 같은 행에서 비교할 수 있게 한다.
- 빈 상태와 횟수 기록 실패 뒤의 상태를 일반적인 0회와 구분한다.
- 빈 상태는 자료 표와 분리해 320 CSS px에서도 가로 이동 없이 보여준다. 실제 항목은 좁은 화면에서 원문과 세 수치를 한 항목 안에 재배치하고, 넓은 화면에서 표 형식으로 비교한다.
- 현재 요구에 없는 기간 그래프, 순위와 추세 수치를 만들지 않는다.

### 검증 방식

합계와 행 projection에는 TDD를 적용한다. 두 입력 횟수에서 화면 값을 만드는 순수 규칙이고 원문 상태를 섞지 않는 불변 조건을 먼저 고정할 필요가 있다. 실제 IndexedDB 읽기와 화면 밀도는 브라우저 통합 및 시각 검토로 확인한다.

- 같은 원문 상태에서 개별 복사 2회와 일괄 복사 항목 추가 3회 뒤 `2`, `3`, `5`가 구분되어 표시된다.
- geometry만 바꿔도 같은 행을 유지하고 원문을 바꾸면 새 content revision 행을 만든다.
- 제거, 재정렬, undo와 redo 뒤에도 두 횟수와 합계가 그대로다.
- 다른 메모에 같은 원문이 있어도 별도 행과 메모 식별 정보가 보인다.
- 320 CSS px와 400% 확대에서 한 항목의 원문, 개별 복사, 일괄 복사와 합계를 가로 이동 없이 같은 자료로 식별할 수 있다.

### 중단 조건

합계를 저장 필드와 계산값 양쪽에서 관리하거나 원문 상태가 다른 횟수를 설명 없이 합치면 U8을 완료하지 않는다.

## U9. 줄 단위 텍스트 분석

### 목적과 기준

사용자가 분석을 명시적으로 요청한 경우에만 메모 원문을 줄 단위로 비교하고, 정확한 반복, 포함 관계와 문자열 조각 점수를 원문 근거와 함께 보여준다. [줄 단위 텍스트 분석 결정](decisions/text-analysis.md)과 [로컬 실행과 텍스트 분석 Worker 결정](decisions/local-runtime-and-analysis-worker.md)이 기준이다.

### 선행 조건

U1의 운영용 Worker 기본 실행 검사, U2의 메시지 규칙 및 content revision, U3의 메모 읽기와 U5의 원문이 필요하다.

### 변경 후보

- `apps/notes/src/_pages/analysis/model/normalize-lines.ts`
- `apps/notes/src/_pages/analysis/model/classify-line-relation.ts`
- `apps/notes/src/_pages/analysis/model/grapheme-ngrams.ts`
- `apps/notes/src/_pages/analysis/model/*.test.ts`
- `apps/notes/src/_pages/analysis/api/analysis.worker.ts`
- `apps/notes/src/_pages/analysis/api/worker-text-analyzer.ts`
- `apps/notes/src/_pages/analysis/model/analysis-run-state.ts`
- `apps/notes/src/features/suggest-template/model/selected-source-lines.ts`
- `apps/notes/src/_pages/analysis/ui/analysis-start-page.tsx`
- `apps/notes/src/_pages/analysis/*.browser.test.ts`

### 작업

- CRLF, LF와 CR을 줄바꿈으로 인식하고 0부터 시작하는 원래 줄 위치를 보존한다.
- 빈 줄을 제외한 줄 위치를 `note.id`와 줄 위치로 안정적으로 정렬하고 서로 다른 두 위치의 순서 없는 조합을 한 번씩 만든다. 같은 메모 안의 줄을 포함하고 자기 비교와 A-B 및 B-A 중복은 제외하며, 서로 다른 위치의 같은 원문은 비교한다.
- 앞뒤 공백 제거, 내부 공백 정리, NFC, locale 비의존 소문자 변환과 다시 NFC를 적용한다. 문장부호와 원문은 보존하고 빈 결과는 제외한다.
- 정확한 반복, 포함 관계 순서로 분류하고 두 관계의 점수는 `null`로 둔다. 나머지 3 grapheme 이상 줄에 extended grapheme 3-gram 집합의 Jaccard 점수를 계산한다.
- 점수가 0보다 큰 후보만 내림차순으로 반환하되 고정 합격 임계값과 의미 동일 판정을 만들지 않는다. 3 grapheme 미만은 정확한 반복과 포함 관계만 다룬다.
- 첫 분석 요청에서 Worker를 만들고 현재 실행 동안 재사용한다. 요청 ID, 메모 ID와 content revision, 알고리즘 type 및 version으로 message를 검증한다.
- Worker 응답의 입력 메모와 원문 줄을 원래 요청과 양방향으로 대조하고, 결과 쌍이 응답의 원문 줄만 참조하는지 확인한다. 자기 비교, 역순, 중복 쌍과 비결정적 순서는 수락하지 않는다.
- 결과가 참조하는 원문은 Worker 응답에서 줄마다 한 번만 전달하고, 주 실행 흐름에서는 검증된 원문 목록과 결과 참조만 연결한다. 정규화, grapheme 분리, 조합 생성과 결과 정렬은 Worker 밖에서 반복하지 않는다.
- 현재 content revision과 다른 응답은 화면 결과로 수락하지 않는다.
- 결과에서 관계, 점수, 두 원문 줄, 메모와 줄 위치를 보여준다. 각 결과 행의 `이 두 줄로 템플릿 제안` 동작은 그 행의 두 원문 스냅샷을 하나의 선택 쌍으로 실행 중 상태에 보관하고 템플릿 화면으로 이동한다.

### 검증 방식

정규화, 관계 분류, Jaccard, 결정적 정렬과 오래된 응답 수락 상태에는 TDD를 적용한다. 입력과 결과가 순수하고 유니코드 및 짧은 줄 경계 사례가 많다. Worker 자산, 메시지 왕복, 주 실행 흐름의 응답성과 실제 계산 시간은 TDD를 적용하지 않고 Next.js 운영 서버를 연 브라우저에서 확인한다.

- 조합 문자가 다른 같은 문자열, 대소문자, 공백 묶음, 문장부호, CRLF와 빈 줄의 테스트 입력이 결정된 정규화 결과를 만든다.
- 유효한 줄이 하나, 둘과 셋일 때 각각 0개, 1개와 3개의 조합을 만들고, 같은 메모 안의 줄과 서로 다른 위치의 같은 원문을 빠뜨리지 않는다.
- 정확한 반복, 포함 관계, 3-gram 일부 겹침, 0점과 3 grapheme 미만 사례가 각각 정해진 분류 및 제외 결과를 만든다.
- 같은 점수의 결과도 정해진 보조 키로 항상 같은 순서를 만든다.
- 분석 버튼을 누르기 전에는 Worker와 결과가 없고, 누른 뒤 진행, 성공과 오류 상태가 구분된다.
- Worker 자산 또는 message 오류 뒤 실패 알림을 보여주고, 다시 실행하면 새 Worker에서 분석을 완료한다.
- 분석 중 원문을 바꾸면 이전 응답이 폐기되고 geometry만 바꾸면 결과를 유지한다.
- 결과 행에서 템플릿 제안을 실행하면 템플릿 화면에 같은 두 원문과 원본 메모 이동 동작이 표시된다.
- 대표 메모 묶음을 분석하는 동안 메모 편집, 탐색과 상태 알림이 main thread에서 계속 반응한다.

### 중단 조건

유니코드 분할이 UTF-16 code unit을 사용자 문자로 오인하거나, 알고리즘 버전 없이 결과 형태를 바꾸거나, Worker 실패를 주 실행 흐름의 동기 계산으로 조용히 대체하면 U9를 완료하지 않는다.

## U10. 템플릿 제안, 수동 편집과 일회성 결과

### 목적과 기준

선택한 두 원문 줄의 공통 구간과 차이 구간을 설명 가능한 템플릿으로 제안하고, 사용자가 직접 여러 플레이스홀더를 지정하거나 입력값으로 일회성 텍스트를 만든다. [템플릿 제안 생성 결정](decisions/template-suggestion.md)이 자동 제안 범위와 저장 조건을 정한다.

### 선행 조건

U3의 템플릿 저장, U9의 원문 줄 선택과 U2의 segment schema가 필요하다.

### 변경 후보

- `apps/notes/src/features/suggest-template/model/suggest-template.ts`
- `apps/notes/src/entities/template/model/render-template.ts`
- `apps/notes/src/entities/template/model/edit-segments.ts`
- 각 model 파일과 같은 slice의 `*.test.ts`
- `apps/notes/src/_pages/templates/ui/templates-start-page.tsx`
- `apps/notes/src/_pages/templates/ui/template-editor.tsx`
- `apps/notes/src/_pages/templates/ui/template-input-form.tsx`
- `apps/notes/src/_pages/templates/*.browser.test.ts`

### 작업

- 두 원문 줄을 grapheme 단위의 결정적 shortest edit script 또는 동등한 LCS diff로 비교한다.
- 분석 결과에서 전달받은 선택 쌍과 원본 메모를 먼저 보여준다. 선택 없이 직접 들어오거나 새로고침으로 선택이 사라졌으면 수동 작성 시작과 분석 결과로 돌아가기 동작을 제공한다.
- 공통 구간은 일반 텍스트로, 붙어 있는 차이 구간은 하나의 플레이스홀더로 만들고 여러 차이 구간은 순서형 플레이스홀더로 만든다.
- 공통 일반 텍스트가 없거나 공백과 문장부호만 공통인 경우, 또는 두 줄이 같은 경우에는 제안하지 않고 이유와 수동 작성 동작을 보여준다.
- 사용자가 입력하거나 붙여넣은 원문의 비어 있지 않은 범위를 선택하고 `플레이스홀더로 지정`을 실행해 여러 구간을 바꿀 수 있게 한다. 기존 플레이스홀더와 겹치거나 중첩된 선택은 이유를 표시하고 적용하지 않는다.
- 플레이스홀더를 만들면 이름 입력으로 포커스를 옮기고, 각 플레이스홀더에 이름 변경과 일반 텍스트로 되돌리기를 제공한다. 빈 이름과 중복 이름이 있으면 저장할 수 없다.
- 제안은 저장 전 상태로 유지하고 사용자가 명시적으로 저장한 경우에만 IndexedDB 템플릿에 추가한다.
- 템플릿 편집기의 React Hook Form은 사용자가 바꾸는 원문, 제목과 현재 플레이스홀더 이름을 관리한다. 플레이스홀더 범위와 순서는 domain draft에 남기되 이름을 두 상태에 중복 저장하지 않는다. 범위 선택처럼 현재 원문이 필요한 동작은 `getValues`로 읽고, segment 미리보기처럼 즉시 바뀌어야 하는 가장 가까운 표시는 필요한 field만 `useWatch`로 구독한다.
- 플레이스홀더 이름을 바꾸거나 일반 텍스트로 되돌리면 현재 이름 전체로 빈 값과 중복을 다시 검증한다. 관계된 수동 오류를 모두 지운 뒤 현재도 잘못된 field에만 오류를 설정해 이전 오류가 남지 않게 한다.
- React Hook Form이 관리하는 단순 입력은 U4의 네이티브 기반 `shared/ui` 구성요소와 `register`로 연결한다. 승인된 합성 폼 제어가 없는 현재 범위에서는 `Controller`와 `useController`를 사용하지 않는다. segment 편집, 분석 선택, IndexedDB 저장과 Clipboard 상태는 폼 전체 상태로 만들지 않는다.
- 입력값으로 만든 일회성 결과와 복사 동작을 제공하되 결과를 자동 저장하지 않는다.

### 검증 방식

제안기, segment 편집 규칙, schema와 renderer에는 TDD를 적용한다. 여러 차이 구간, 빈 literal, 중복 key와 치환 순서는 순수 입력 및 결과로 안정적으로 설명할 수 있다. 텍스트 범위 선택, 폼 오류의 읽기 순서, focus와 Clipboard는 실제 브라우저에서 확인한다.

- 앞, 중간과 끝에 차이가 있는 두 줄이 여러 플레이스홀더와 원래 공통 텍스트를 보존한다.
- 공통 일반 텍스트가 없는 두 줄과 같은 두 줄은 자동 저장 없이 이유와 수동 동작을 보여준다.
- 포인터와 키보드로 범위를 선택해 플레이스홀더를 지정하고, 겹치는 범위, 빈 이름과 중복 이름의 오류를 확인한 뒤 고칠 수 있다. 중복 이름 하나를 바꾸거나 해당 플레이스홀더를 일반 텍스트로 되돌리면 관련된 오래된 오류가 모두 사라지고 현재 문제가 있는 입력만 오류로 남는다.
- 플레이스홀더를 일반 텍스트로 되돌리면 확인한 텍스트가 같은 위치에 남고 segment 순서가 유지된다.
- 여러 플레이스홀더를 직접 만들고 이름을 바꾼 뒤 저장하면 새로고침 후 다시 사용할 수 있다.
- 필요한 값을 입력하면 순서대로 치환한 일회성 결과가 생기고, 저장하지 않은 결과는 새로고침 뒤 사라진다.
- 저장 전 제안은 템플릿 목록과 사용 빈도를 바꾸지 않는다.
- DOM에서 템플릿 원문, 메타데이터, 플레이스홀더 이름과 치환값 입력이 React Hook Form에 등록된 네이티브 폼 요소로 남고, 같은 값을 다른 React 상태에 매 입력마다 함께 쓰지 않으며 키보드 제출과 오류 포커스 동작을 유지한다.

### 중단 조건

정규화 문자열을 원문 대신 템플릿에 넣거나, 의미를 추론한 플레이스홀더 이름을 자동 확정하거나, 제안을 사용자 동작 없이 저장하면 U10을 완료하지 않는다.

## U11. 로컬 애플리케이션 통합 완료 검증

### 목적과 기준

[요구사항의 완료를 확인할 증거](requirements.md#완료를-확인할-증거)를 같은 독립 실행용 결과물에서 끝까지 검증하고, 자동 검사가 판정할 수 없는 화면과 조작은 기록된 시각 및 접근성 검토로 확인한다.

### 선행 조건

U1부터 U10까지 각 중단 조건이 해소되어야 한다.

### 변경 후보

- 승인된 브라우저 end-to-end 검사 파일
- 접근성 및 운영용 빌드 검사 설정
- package script와 CI 설정
- 구현에서 발견된 결함을 고치는 해당 모듈 파일

### 작업

- 요구사항의 완료 증거를 사용자 과업 단위로 자동화할 항목과 직접 확인할 항목으로 나눈다.
- 같은 revision의 운영용 빌드를 호스트 이름이 `localhost`인 HTTP에서는 `next start`로, HTTPS에서는 TLS를 종료하는 reverse proxy 또는 배포 플랫폼 뒤에서 제공한다. origin이 다르므로 같은 자료 공유를 기대하지 않고 각 환경에서 새 자료로 전체 흐름을 확인한다.
- `file:` URL과 `localhost`가 아닌 HTTP URL에서 자료 Provider와 과업 화면이 시작되지 않고, 카드 없는 화면에 `잘못된 접근입니다.`와 HTTPS 또는 `http://localhost`로 다시 열라는 다음 행동이 보이는지 확인한다. 지원하는 HTTPS 및 `localhost` HTTP 주소에서는 판정 문구 없이 메모 화면이 열리는지 확인한다.
- 확장 기능이 개입하지 않는 지원 브라우저 profile에서 server HTML, hydration 뒤 DOM과 console을 비교한다. 애플리케이션이 만든 hydration 차이는 수정하고 외부 DOM 변경만 분리해 기록한다.
- 키보드, 단일 포인터, 터치, 한글 IME, 텍스트 선택, 320 CSS px, `48rem` 및 `72rem` 전후, 확대, reduced motion과 고대비 상태를 확인한다.
- 메모 화면에는 왼쪽 사이드바가 없고, 상단 탐색과 메모 작업 동작이 보드 또는 목록을 가리지 않는지 확인한다.
- 메모 화면의 상단 탐색 아래에서 캔버스가 나머지 화면을 채우고 별도 페이지 제목, 메모 개수와 상단 작업 행이 없는지 확인한다. `48rem` 이상에서는 캔버스를 스크롤하거나 이동해도 일괄 복사 패널 버튼이 화면 우측 상단에 유지되는지 확인하고, `48rem` 미만에서는 항목이 있을 때 Drawer의 저장 항목 수 링크에서 관리 화면으로 이동할 수 있는지 확인한다.
- 넓은 화면의 메모에는 짧은 헤더, 항상 편집 가능한 본문과 헤더 오른쪽의 세 아이콘 버튼만 보이는지 확인한다. 헤더의 빈 영역 drag는 위치만, 네 가장자리와 네 꼭짓점 drag는 크기만 바꾸고, 빈 캔버스 drag는 시점만 이동해야 한다. 본문의 일반 click과 drag는 커서 및 선택 범위만 바꾸며 이 조작들이 같은 입력에서 함께 실행되지 않아야 한다.
- 이동이 아닌 헤더 한 번 click과 각 메모의 양의 `tabindex`가 낮은 순서를 따르는 `Tab` 및 `Shift+Tab`으로 메모를 선택하고 선택 및 키보드 포커스를 구분한다. 이 입력은 속성 패널을 새로 열거나 대상을 바꾸지 않아야 한다. 실제 DOM의 `tabindex` 값과 브라우저의 이동 순서를 함께 확인하며, 맨 앞으로 또는 맨 뒤로 보내기가 이 값을 바꾸지 않아야 한다.
- 이동이 아닌 헤더 더블클릭 또는 선택된 메모의 선택 지점에서 실행한 보조 키 없는 `Enter`에서만 속성 패널이 열리는지 확인한다. 선택 지점의 `Enter`는 본문 줄바꿈, 헤더 아이콘 실행, 패널 입력 적용과 입력기 조합 중 `Enter`를 가로채지 않아야 한다. 선택 지점의 `Enter`로 연 직후 첫 X 입력에 포커스가 놓이고, 헤더 더블클릭으로 연 경우 현재 pointer 포커스를 유지해야 한다. 오른쪽 속성 패널에서 대상 메모의 `X`, `Y`, 너비와 높이를 `blur`, 패널 밖 click 및 입력 안의 `Enter`로 적용하며, 음수와 0 및 기존 캔버스 바깥 위치도 저장해야 한다. 허용 크기를 벗어나거나 계산할 수 없는 입력은 저장 geometry 및 revision을 바꾸지 않아야 한다.
- 메모를 선택한 뒤 빈 캔버스 click과 `Command`를 각각 실행해 메모 선택 ID와 붉은 테두리만 사라지는지 확인한다. 메모와 일괄 복사 항목을 함께 선택한 뒤 상위 임시 조작이 없는 보조 키 없는 `Escape`를 실행하면 두 선택 ID와 테두리가 함께 사라져야 한다. 하위 요소 click과 캔버스 drag는 선택 해제를 함께 실행하지 않고, 속성 패널 대상, 초안, 최근 활성 패널, 일괄 복사 자료와 순서는 유지돼야 한다. 빈 캔버스 click은 캔버스 viewport로 포커스를 옮기고 `Escape`는 현재 포커스를 유지한다. `Command`를 눌렀을 때 헤더 아이콘에 포커스가 있으면 같은 메모 선택 지점으로 옮기고 그 밖의 포커스는 유지한다.
- 헤더 drag를 메모 안팎으로 이어가며 속성 패널이 열리거나 바뀌지 않고 캔버스의 계산 inline size와 block size가 유지되는지 확인한다. 성공한 `pointerup` 뒤 정상적인 `lostpointercapture`가 이어져도 geometry를 되돌리거나 다시 저장하지 않아야 한다. 완료 전 `pointercancel` 또는 capture 상실 뒤 발생할 수 있는 click 및 더블클릭도 선택이나 패널 활성화를 실행하지 않아야 한다.
- `Command`를 누르는 동안 선택 테두리와 헤더가 보이지 않고 헤더를 조작할 수 없지만 메모 크기, 본문 위치와 속성 패널 대상은 유지되는지 확인한다. 본문 `Command+클릭`과 `Command+Option+클릭`은 메모를 다시 선택하거나 속성 패널 대상을 바꾸지 않으며, 포커스가 있는 선택 지점의 `Command+Option+Enter`는 선택 ID가 비워진 뒤에도 그 메모 항목 하나만 추가해야 한다. `keyup`, 창 및 문서 상태 변화, route 이탈과 modifier가 없는 다음 신뢰할 수 있는 입력 뒤에는 헤더만 복원돼야 한다. 합성 event는 실제 상태를 바꾸지 않고 운영체제 및 브라우저 기본 단축키도 계속 동작해야 한다.
- macOS에서 `Shift+Command+5`로 Screenshot 도구를 열어 캡처를 완료한 경우와 취소한 경우를 각각 직접 확인한다. 두 경우 모두 별도 `Command` 입력 없이 헤더가 복원되고 다음 개별 및 일괄 복사가 정상이어야 한다. 이어서 빈 캔버스 drag를 다음 신뢰할 수 있는 pointer 입력으로 실행하고, `pointerup`, 뒤이은 `lostpointercapture`, 창 포커스 전환과 다음 화면 갱신 뒤에도 마지막으로 보인 시점이 유지되는지 확인한다. 이 확인은 브라우저 자동화가 운영체제 단축키 전달을 재현했다는 주장으로 대신하지 않는다.
- 헤더 더블클릭, 선택 지점의 `Enter`와 일괄 복사 동작을 번갈아 실행해 마지막으로 활성화한 오른쪽 패널만 보이는지 확인한다. 한 번의 헤더 click, `Tab` 선택과 선택 해제만으로 패널이 전환되지 않고, 전환이나 선택 해제 때 속성 패널 대상, 속성 초안, 일괄 복사 항목과 제거 이력을 잃지 않아야 한다.
- 메모 삭제 직후 공유 알림 영역에 5초 실행 취소 알림이 포커스를 가져가지 않고 나타나며, 연속 삭제에서는 현재 실행의 최근 항목 하나만 안내하는지 확인한다. 알림에 hover 또는 `focus-within`이 있으면 남은 시간이 멈추고 둘 다 떠나면 이어서 흐르는지 확인한다. `실행 취소`는 최근 삭제부터 같은 원문, geometry와 겹침 순서를 복원하고 복원된 메모 선택 지점으로 포커스를 옮겨야 한다. 삭제 뒤 다른 route를 다녀와도 삭제 완료 시각에서 계산한 남은 시간이 임의로 늘어나지 않고, 늦게 끝난 복원 중 새 삭제가 생겨도 시작한 스냅샷만 이력에서 빠져야 한다. 시간이 끝나면 알림이 화면과 접근성 트리에서 사라지고 새로고침 뒤에는 이력이 없어야 한다.
- Clipboard 거절, IndexedDB transaction 중단, Worker 오류, 오래된 분석 response와 읽을 수 없는 저장 record에서 사용자가 보존된 결과와 다음 동작을 알 수 있는지 확인한다.
- 일괄 복사 패널과 모바일 확인 및 관리 화면에서 전체 복사의 성공과 거절을 확인하고, 두 경우 모두 개별 복사 및 일괄 복사 횟수가 바뀌지 않는지 확인한다. 결과는 공유 알림 영역의 한 건을 갱신하며 항목 추가 성공만으로는 별도 알림이 나타나지 않아야 한다.
- 넓은 일괄 복사 항목 본문을 click, `Enter`와 `Space`로 선택하거나 해제하고, 선택된 항목 본문의 `ArrowUp`과 `ArrowDown`으로 한 자리씩 재정렬한다. 선택된 항목의 굵은 붉은 테두리, `focus-visible`과 drag 놓기 후보가 구분되고, 이동 뒤 같은 항목에 선택과 포커스가 남으며 새 위치가 보조 기술에 전달돼야 한다. 삭제 버튼과 다른 하위 제어의 방향키는 순서를 바꾸지 않아야 한다.
- 단순 성공 알림은 짧게 표시되고 닫기 버튼이 없으며, 같은 영역의 새 결과는 표시 시간을 다시 시작하고 현재 포커스를 가져가지 않아야 한다. 실행 취소 또는 다시 시도 동작이 있는 알림은 hover와 `focus-within`에서 시간이 멈추며, 자동 저장과 화면 자료 불러오기 실패는 해결되기 전에 사라지지 않는 상태로 남아야 한다.
- 다섯 주요 route, 모바일 상세 및 일괄 복사 확인 route와 메모 화면의 일괄 복사 패널에 실제 한국어 콘텐츠를 넣어 대표 구성요소에 적용 가능한 기본, hover, `focus-visible`, pressed, disabled, 오류와 진행 상태를 확인하고, 같은 역할의 구성요소가 U4에서 승인한 디자인 토큰과 `shared/ui`를 사용하는지 시각 및 접근성 검토 기록에 남긴다.
- 접속 확인 및 실패, 사용 빈도와 분석의 빈 상태, 템플릿 원문 없음, 설정과 템플릿 폼, 사용 빈도 표와 분석 및 템플릿 목록을 실제 화면에서 확인한다. 페이지 내용을 습관적으로 감싸는 둥근 테두리, 채운 카드 배경과 그림자는 없어야 하고, 제목, 간격, 정렬 및 구분선으로 구획을 이해할 수 있어야 한다. 메모와 선택 가능한 일괄 복사 항목의 상태 표면은 유지해야 한다.
- 다섯 주요 route, 모바일 상세 및 일괄 복사 확인 route의 제목, 본문, 버튼, 입력과 상태 문구에 Pretendard가 기본 글꼴로 계산되고 serif display 글꼴이 남지 않았는지 확인한다. 넓은 메모 화면에서는 중립적인 애플리케이션 프레임, 밝은 목재 캔버스와 중립색 메모의 구분 및 목재 결 위 상태 대비를 검토한다.
- 다섯 주요 route, 모바일 상세 및 일괄 복사 확인 route와 메모 화면의 일괄 복사 패널에서 보이는 문자열의 역할을 확인하고, 제목이나 컨트롤과 중복되는 안내, 구현 기술 및 빌드 상태 설명과 과업에 필요하지 않은 소개 문구가 없는지 검토한다. 사용자에게 보이는 기능명은 `일괄 복사`와 `개별 복사`로 통일한다.
- 넓은 화면 및 모바일 상세의 메모 본문, 템플릿 원문과 이름, 플레이스홀더 이름 및 치환값, 속성 패널 수치와 설정 checkbox가 과업별 React Hook Form 한 곳에 등록됐는지 확인한다. 자동 저장, 대상 전환, 변경사항 버리기, 저장 실패와 외부 revision 반영을 실행해 현재 값과 dirty 상태가 화면별 규칙을 따르고 기존 IndexedDB 결과가 유지되는지 확인한다. 외부 접근성 부품을 추가했다면 폼과 무관한 승인된 `shared/ui` 구성요소에만 격리되고 외부 기본 테마가 화면에 나타나지 않는지 import, lockfile과 실제 화면을 함께 확인한다.
- U1에서 확정한 FSD ESLint 검사를 최종 `apps/notes/src/` 전체에 다시 실행하고, `apps/notes/app/`의 route 파일이 `_pages` 및 `_app` public API만 연결하는지 확인한다.
- 브라우저 JavaScript 묶음과 라우트 목록에 계정, 동기화, PostgreSQL, 라이브러리 제공 코드와 환경변수 예시 값이 없는지 검사한다. Next.js 운영 서버에 현재 사용자 과업과 무관한 자료 처리 route가 없는지도 확인한다.
- 대표 자료 규모에서 Worker 분석 중 main thread 반응, 메모 수 증가에 따른 보드 조작과 IndexedDB 읽기 및 쓰기 시간을 측정해 기준선을 남긴다. 측정 전 임의 성능 합격값을 만들지 않는다.

### 검증 방식

이 단위 자체에는 TDD를 적용하지 않는다. 구현이 끝난 사용자 흐름과 실제 배포 동작을 확인하는 단계이며, 내부 함수나 구성요소 구조를 먼저 고정할 이유가 없다. 앞선 단위에서 TDD로 만든 순수 규칙 테스트와 실제 브라우저, 빌드, 접근성 및 시각 검토 증거를 함께 사용한다.

- 사용자가 메모 두 개를 만들고 붙여넣기, 편집, 헤더 한 번 click 및 `Tab` 선택, 헤더 더블클릭과 선택 지점의 `Enter` 속성 패널, 빈 캔버스 click, `Escape` 및 `Command` 선택 해제, drag를 이용한 위치 및 크기 변경, 맨 앞으로 및 맨 뒤로 보내기, 삭제와 취소 복원, 개별 복사와 일괄 복사 항목 추가를 완료한다. 헤더 drag 중 캔버스 크기와 `Command` 상태의 헤더 비노출, 운영체제 화면 캡처 뒤 복원도 같은 흐름에서 확인한다.
- 메모 화면의 일괄 복사 패널과 저장 목록 관리 화면에서 항목 click 선택, 선택 테두리, 방향키 및 drag 순서 변경, 패널 밖 제거, 단축키를 통한 실행 취소와 다시 실행을 완료한다. 메모 및 항목 동시 선택의 `Escape` 해제, 패널 열기 및 닫기, 다른 route 이동과 새로고침에 따른 수명도 결정대로 동작한다.
- 사용 빈도, 줄 단위 텍스트 분석, 템플릿 제안, 수동 플레이스홀더와 일회성 결과가 요구사항의 예시 값을 만든다.
- 작은 화면에서 새 메모를 만들면 목록에 남고, 생성된 메모의 수정 아이콘으로 상세에 이동한다. 원문을 명시적으로 저장한 뒤 목록으로 돌아온다. 목록 메모를 짧게 누르거나 길게 누르면 원문을 한 번만 복사하고 상세 화면으로 이동하지 않으며, 넓은 화면으로 돌아오면 저장 geometry가 복원된다.
- 작은 화면의 목록 헤더 아이콘으로 일괄 복사 상태를 시작하고, 같은 메모의 반복 입력을 포함한 순서와 클릭 횟수가 기록되며 상세 이동이 억제되는지 확인한다. 헤더 뒤로가기는 다음 단계로 이동하지 않고, 하단 `초기화`는 작업 초안과 횟수를 0으로 만들면서 상태를 유지한다. `다음`은 `/batch-copy` 확인 페이지로 이동하며 Clipboard, 원본 메모, 저장 목록과 사용 횟수를 바꾸지 않는다.
- 모바일 확인 페이지에서 일반 터치 및 세로 스크롤과 이동 핸들에서 `500ms` 동안 `10 CSS px` 안에 머문 길게 누르기 뒤 touch drag를 구분한다. drag 활성화, 앞뒤 삽입 위치와 취소 복원 상태를 색 이외의 변화로 확인한다. 우측 상단 관리 제어는 승인된 touch용 표면으로 `위치 변경`, `복제`, `삭제`, 키보드 포커스, pressed와 구분된 삭제 상태를 제공해야 한다. 복제 항목은 대상 바로 뒤에 생기고 재정렬, 복제와 삭제 뒤에도 원본 메모, 메모 revision, 수집 단계 클릭 횟수와 사용 횟수가 유지되는지 확인한다. `pointercancel`, `lostpointercapture`, 바깥 누르기, `Escape`와 포커스 복귀도 확인한다.
- 작은 화면의 평상시 메모 목록 Drawer에 있는 저장 항목 수 링크로 일괄 복사 관리 화면에 이동하고, 항목 동작 선택창의 `위치 변경`과 교환 대상 버튼으로 순서를 바꾼 뒤 하단 `취소`와 `일괄 복사하기`의 서로 다른 결과를 확인한다.
- HTTPS와 localhost HTTP에서 각각 Clipboard와 IndexedDB를 포함한 전체 과업을 완료한다.
- 현재 주소에서 앱을 열 수 없는 경우에는 메모 자료를 열거나 바꾸지 않고 `잘못된 접근입니다.`와 HTTPS 또는 `http://localhost`로 다시 열 수 있는 안내를 확인한다. `지원하지 않는 접속 주소`, `유효하지 않음`, 내부 판정값과 Web API 이름은 보이지 않아야 한다.
- `apps/notes/package.json`의 빌드 명령이 실행 가능한 결과물을 만들고, FSD ESLint 검사에서 허용된 Entities `@x` 외의 같은 계층 import, 역방향 import와 public API 우회가 발견되지 않는다.
- 화면 읽기 프로그램이 화면에 남은 버튼 이름, 복사 결과 알림, 분석 관계와 사용 횟수의 의미를 읽을 수 있고, keyboard focus가 가려지지 않는다.
- 같은 역할의 버튼, 입력과 알림이 다섯 주요 route, 모바일 상세 및 일괄 복사 확인 route와 메모 화면의 일괄 복사 패널에서 같은 디자인 규칙을 사용하고 포커스 표현도 같은 규칙을 따른다. 외부 UI 라이브러리의 기본 테마가 개인 메모 디자인 시스템을 대신하지 않는다.
- 다섯 주요 route, 모바일 상세 및 일괄 복사 확인 route의 계산된 글꼴에서 Pretendard가 제목과 본문의 기본 글꼴이고 serif display 글꼴은 없다. 메모 화면의 목재 결은 메모 내용, 선택, 키보드 포커스와 정렬선을 가리지 않으며, 우측 상단 및 우측 하단 고정 제어는 메모 작업 영역의 주요 동작을 가리지 않는다.
- 화면 문구는 현재 내용, 동작, 필요한 조건, 직접 알아차리기 어려운 상태 및 결과와 오류 뒤 다음 행동만 전달하며 같은 역할의 안내를 겹쳐 보여주지 않는다.
- 메모 화면은 왼쪽 사이드바 없이 상단 탐색으로 다른 화면에 이동할 수 있고, 사용 빈도, 텍스트 분석, 템플릿과 설정 화면에서는 왼쪽 탐색으로 현재 위치를 확인할 수 있다.
- 메모 화면은 별도 페이지 제목과 상단 작업 행 없이 캔버스가 상단 탐색 아래의 나머지 화면을 채운다. `48rem` 이상에서는 일괄 복사 패널 버튼이 캔버스의 이동 및 스크롤과 관계없이 우측 상단에 남고, `48rem` 미만에서는 저장된 일괄 복사 항목이 있을 때 평상시 목록 Drawer에 저장 수와 이동 대상이 함께 나타난다.
- 선택된 메모와 일괄 복사 항목의 굵고 끊기지 않는 붉은 테두리, 키보드 `focus-visible`과 drag 놓기 후보를 고대비 상태에서도 구분할 수 있다. Tab 순서는 저장된 양의 `tabindex`가 낮은 순서를 따르고 시각적 겹침이 바뀌어도 유지된다. 한 번의 헤더 click과 Tab 선택은 패널을 열지 않고, 헤더 더블클릭, 선택 지점의 `Enter`와 일괄 복사 동작만 최근 활성 패널을 바꾼다. 빈 캔버스 click과 `Command`는 메모 선택만, 상위 임시 조작이 없는 `Escape`는 메모 및 일괄 복사 항목 선택을 함께 없애며 패널은 하나만 표시된다. 패널 전환과 선택 해제 때 속성 패널 대상, 입력 초안과 숨겨진 패널 자료를 조용히 잃지 않고, `Command` 상태에서 헤더와 선택 테두리가 보이지 않아도 키보드 포커스를 확인할 수 있다.
- 메모 삭제 토스트는 메인 패널 중앙 하단에 남고 오른쪽 `취소`를 키보드로 실행할 수 있다. 삭제된 메모에서 이동할 포커스와 토스트의 수명은 승인된 결정과 일치한다.
- `72rem` 이상에서 첫 항목 추가 성공 때 나타나는 너비 `22rem`의 나란한 오른쪽 패널, `48rem` 이상 `72rem` 미만에서 사용하는 모달 패널과 저장 목록 관리 화면이 같은 항목 및 제거 이력을 사용한다. 모바일 확인 화면은 별도 작업 사본을 사용한다. 넓은 패널의 머리는 `38px`이고 결합 미리보기, 숫자 순서, 위아래 이동, 상시 제거, 실행 취소 및 다시 실행 버튼이 없다. `/batch-copy`는 전역 탐색 항목에 나타나지 않는다.
- 확장 기능이 개입하지 않는 브라우저에서 초기 화면에 애플리케이션이 만든 hydration 오류가 없고, 루트 경고 억제로 외부 변경과 애플리케이션 결함을 함께 숨기지 않는다.

### 중단 조건

문서 검사나 단위 test만으로 완료를 주장하지 않는다. 지원 브라우저의 실제 독립 실행용 결과물, 접근성 및 시각 검토 가운데 하나라도 필요한 증거가 없으면 해당 결과는 완료가 아니라 `needs revision` 또는 `needs human input`으로 남긴다. 선택, 포커스와 속성 패널 대상의 표시가 서로 구분되지 않거나, 모바일의 drag와 `위치 변경` 대안이 같은 저장 명령을 만들지 못하거나, 모바일에서 항목 동작 선택창을 열 수 없으면 관련 사용자 흐름을 완료로 판정하지 않는다. 접속 및 빈 상태와 페이지 폼에 역할 없는 카드 외곽이 남거나 카드 제거 뒤 화면 구획을 이해할 수 없어도 U4와 통합 화면 검증을 완료로 판정하지 않는다.

## U12. 모델 기반 탐색과 실패 재현

### 목적과 현재 판정

메모의 12개 기능에서 예제 테스트가 놓친 반복, 순서 변경, 취소와 재시도 오류를 찾아 짧은 행동 순서로 재현한다. 테스트 개수, 통과 수와 통제 결함 탐지 여부만으로 기능 완료를 판정하지 않는다. 각 기능의 사용자 행동과 저장 결과를 먼저 정의하고, 그 결과를 실행할 기존 서비스 코드에 연결한다.

제안서의 목적은 요구사항에서 단순한 행동 모델을 만들고 fast-check로 순서를 생성하여, 발견한 위반을 축소하고 다시 실행하는 것이다. 제안서의 디렉터리 예시, 공통 실행기와 보고서 타입을 모두 구현하는 것이 목표는 아니다. 현재 서비스에 이미 UI와 저장소가 있으므로 기능별로 필요한 실제 실행 계층을 사용한다.

기준은 [모델 기반 탐색 테스트](requirements.md#모델-기반-탐색-테스트), [완료를 확인할 증거](requirements.md#완료를-확인할-증거)와 [구현 기본값](requirements.md#구현에-적용할-결정-원칙과-기본값)이다. [테스트 전략](../../dev/personal-notes-app/testing-strategy.md), [테스트 안티패턴](../../dev/personal-notes-app/test-anti-patterns.md)과 [폼 지침](../../dev/personal-notes-app/react-hook-form.md)을 적용한다.

현재 생성, 본문 편집, 데스크톱 자동 저장, 모바일 명시적 저장, 초안 복구 및 제거 재시도, 위치와 크기, 겹침 순서, 삭제와 취소 및 만료, 선택과 포커스 및 속성 대상, 개별 복사, 사용 기록과 집계 화면의 열한 항목은 새 완료 기준의 로컬 증거를 확보했다. 캔버스 이동과 확대 및 축소는 최종 검증에서 발견한 회귀를 수정했지만, 수정 뒤 세 브라우저의 축소와 재실행을 끝내지 못해 `needs revision`이다.

기존 탐색 코드와 과거 실행 기록은 다른 항목의 새 완료 증거로 승계하지 않는다. [단일 실행 기록](model-based-testing-execution.md)의 과거 통과 수와 완료 표현보다 이 절의 현재 판정을 우선한다. 이는 기존 서비스 전체가 실패했다는 뜻이 아니다.

Git 이력 재구성은 검토 상태이며 실행 승인이 아니다. 캔버스 제어 아이콘 확대까지의 구현을 비교 대상으로 사용한다. 리셋을 승인받으면 문서 보존과 코드 복귀를 먼저 수행하고, 승인받지 않으면 아래 삭제 및 재작성 범위를 별도 코드 변경으로 진행한다. 어느 방식도 이 계획을 작성하는 단계에서 실행하지 않는다.

### 먼저 확정할 삭제 및 재작성 범위

목적은 기존 탐색 구현의 명령, 상태와 보고서 형식을 새 테스트의 정답으로 삼지 않는 것이다. 삭제 예정 파일에서 알고리즘을 옮겨 새 이름으로 보존하지 않는다. 다음 파일 목록은 현재 코드와 비교한 변경 대상이며, 실제 삭제와 재작성은 코드 변경 승인 후에만 실행한다.

- 삭제 여부를 기능별 대체 검사와 함께 결정할 파일: `apps/notes/src/_pages/notes/model/note-content.model.test.ts`, `apps/notes/e2e/notes-model.spec.ts`, `notes-selection-model.spec.ts`. 기존의 서로 다른 사용자 결과를 보호하는 부분은 대체 전까지 유지한다. `note-lifecycle.model.test.ts`는 삭제 및 복원 검사로, `copy-note.model.test.ts`는 개별 복사 검사로 책임을 옮긴 뒤 제거했다.
- 유지하며 보완한 파일: `apps/notes/src/_app/composition/indexed-db/note-storage.model.indexeddb.test.ts`, `apps/notes/e2e/notes-geometry-model.spec.ts`, `notes-order-model.spec.ts`, `notes-removal-model.spec.ts`. 실제 저장 및 카드 입력을 사용하므로 파일을 없애고 같은 검사를 다시 만드는 작업은 하지 않는다.
- 보조 코드 삭제 대상: `apps/notes/src/shared/lib/note-model-exploration/`와 `note-model-settings/`의 각 구현 및 `index.ts`, `apps/notes/test-app-revision.ts`, `apps/notes/e2e/support/read-stored-note.ts`. 삭제 전 전체 import를 찾아 같은 변경 단위에서 정리한다.
- 설정 재작성 검토 대상: `apps/notes/vitest.config.ts`와 `vitest.browser.config.ts`의 Git 조회 import, 상수 생성과 `__NOTES_GIT_REVISION__` 주입은 독립 실행 기록의 필요성과 함께 최종 단계에서 결정한다. `apps/notes/package.json`의 `test:model` 명령은 현재 남은 본문 탐색 파일을 실행한다. 일반 Vitest, Browser Mode와 Playwright 실행 명령도 사용한다.
- 기존 테스트의 부분 재작성 대상: `notes-data-provider.browser.test.tsx`, `note-content-save-state.test.ts`, `save-note-content.test.ts`, `note-draft.test.ts`, `apps/notes/e2e/notes.spec.ts`. 비교 대상 이후 추가한 모델 실행, 테스트용 화면, 내부 요청 검증을 분리하고 각 기능의 결과 검사로 교체한다. 원래 있던 예제와 같은 파일이라는 이유로 파일 전체를 삭제하지 않는다.
- 유지할 운영 수정: `save-note-content.ts`, `note-content-save-state.ts`, `use-note-content-autosave.ts`의 초안 정리 재시도 책임. 이력 재구성으로 사라진 경우 아래 초안 절차에서 다시 구현한다. 그대로 남아 있으면 결과 검사로 판단하고 이름이나 구조만 바꾸지 않는다.
- 유지할 자산: 기존 서비스 UI, 저장 schema, 메모 및 초안 repository, 기존 예제 테스트, `create-note-through-ui.ts`, `pointer-capture.ts`, `select-text-range.ts`. 기존 도우미도 사용 동작과 구현이 맞는지 확인하고 사용한다.

fast-check 사용 결정은 유지한다. 현재 설치 버전은 4.10.0이며, 이력 재구성 후에는 manifest와 잠금 파일을 확인하고 해당 기능 착수 시 필요한 의존성만 복원한다. 패키지 변경과 잠금 파일 변경을 같은 단위로 처리한다. Playwright의 worker 수는 기존 탐색의 비용을 근거로 영구 고정하지 않고 새 실행 비용을 측정해 결정한다.

완료 증거는 삭제한 모듈을 참조하는 import와 실행 명령이 없고, 기존 예제가 실행되며, 신규 탐색 결과가 없음을 완료 상태에 정확히 표시한 것이다. 이 단계에서 운영 기능 실패를 테스트 삭제로 감추거나, 탐색 코드를 다른 폴더로 이동하는 것으로 삭제를 대신하지 않는다.

### 로컬 검증력 재보완 절차

목적은 현재 구조를 이해한 뒤 필요한 부분만 바꾸는 것이다. 아래 준비를 선택한 기능마다 수행하며, 준비가 끝나기 전에는 명령 클래스, fixture, hook이나 실행 도우미를 추가하지 않는다.

1. 요구사항에서 시작 상황, 사용자의 행동, 허용된 실패와 마지막 관찰 결과를 적는다. 이전 모델 테스트의 기대값을 읽기 전에 작성한다. 기대 결과가 정해지지 않은 행동은 별도로 남기고 성공값을 추측하지 않는다.
2. 해당 기능의 운영 UI에서 이벤트 처리, application 명령, repository와 재조회까지 호출을 따라간다. 각 단계에서 폼 값, 저장 자료, 선택, 타이머와 진행 중 Promise를 어디서 관리하는지 기록한다. 운영 코드는 연결 위치를 찾는 근거이며 기대값을 복제하는 원본이 아니다.
3. 비교 대상의 기존 테스트에서 준비, 실행과 관찰을 읽고 보호하는 결과를 한 문장씩 기록한다. 새 행동 조합이 어느 누락을 보완하는지 정한다. 기존 예제와 목적이 같으면 같은 검사에 필요한 입력을 추가하고 별도 fixture나 테스트용 앱을 만들지 않는다.
4. 해당 기능의 공식 API 문서와 설치 버전을 다시 확인한다. 아래 기능별 조사 질문에 답하고 출처, 확인한 제약과 코드 작성 결정을 이 기능 절에 반영한 뒤 구현한다. 조사로 새 라이브러리나 별도 실행기를 자동 채택하지 않는다.
5. 변경 예정 파일마다 유지, 삭제 또는 재작성과 그 이유를 적는다. 새 상태가 필요하면 기존 값에서 계산할 수 없는 이유, 값을 바꾸는 동작과 수명을 먼저 설명한다. 같은 내용의 폼 값과 React state, ref 사본을 추가하지 않는다.

현재 구조에서 `NotesDataProvider`는 저장 명령과 직렬 실행을, `NoteSessionProvider`는 선택 및 삭제 이력을, React Hook Form은 본문과 속성 입력을 관리한다. `useNoteContentAutosave`는 저장 예약과 이탈 저장을, `ReadyNoteDetail`은 명시적 저장과 이탈 확인을 처리한다. 이 책임을 확인하지 않은 채 새 Provider, 상태 저장소 또는 중복 저장 함수를 만들지 않는다.

React의 [Effect 사용 판단](https://react.dev/learn/you-might-not-need-an-effect)에 따라 입력 결과 계산은 렌더링 또는 기존 이벤트 처리에서 수행한다. 외부 이벤트 구독과 정리는 필요한 Effect에서 유지한다. Hook 개수 자체를 합격 기준으로 삼지 않으며, 새 `useState`, `useEffect`, `useRef`로 기존 중복이나 잘못된 수명을 덮는 수정은 중단한다.

### 보완 순서와 단계별 완료 증거

다섯 절차는 아래 12개 기능 각각에서 수행한다. 한 기능의 로그 도구나 축소 성공을 다른 기능의 완료로 계산하지 않는다. 도구를 미리 완성하는 별도 장기 단계는 두지 않는다.

기존 파일에 명령 클래스와 검증문을 계속 덧붙이지 않는다. 먼저 같은 책임의 예제를 합치거나 교체할 위치를 정한다. 실행 계층과 초기화 방식이 달라 파일 분리가 필요하면 한 사용자 과업 단위로 분리하고, 기능마다 모델 파일 하나씩 만드는 규칙은 두지 않는다. 도메인 PoC는 정상 행동 3개 이상, 의미 있는 비정상 시도 2개 이상과 불변 조건 2개 이상이라는 기존 최소 조건을 유지한다.

1. 행동 생성의 목적은 정해 놓은 성공 순서 밖의 조합을 실행하는 것이다. 기존 테스트 파일에 `fc.commands`와 `AsyncCommand`를 직접 사용한다. 명령은 입력, `check`, 실제 실행과 `toString`만 가진 객체 또는 클래스면 충분하다. 상태는 기대 원문, 존재 여부, 필요한 순서와 시각만 보관하며 React 상태 전체를 복제하지 않는다.
2. 오류 탐지의 목적은 사용자 결과 또는 저장 규칙의 차이를 찾는 것이다. 각 행동 뒤와 후보 종료 시 해당 결과를 직접 비교한다. 실제 실행에서 받은 반환값과 Promise는 실행 대상에 보관하고 기대 모델로 요청을 다시 만들지 않는다. 단순 조회만 생성된 후보와 필수 행동 미실행은 탐색 충분성의 증거로 세지 않는다.
3. 실패 순서 축소의 목적은 같은 위반을 설명하는 데 불필요한 실제 행동을 제거하는 것이다. 생성기가 실행한 상태 변경 행동을 fast-check에 축소시킨다. 고정 실패 순서 앞에 조회를 덧붙였다가 제거하거나, 반드시 다섯 명령 또는 입력 `A`가 나와야 한다고 단언하지 않는다. 전역 최소를 증명했다고 표현하지 않는다.
4. 로그 기록의 목적은 다른 실행에서 같은 입력과 위반을 알아내는 것이다. fast-check의 seed, path와 필요한 replayPath, 기존 테스트 러너의 오류 출력 및 첨부 기능을 사용한다. 기능, 실행 계층, 최초 및 축소 행동, 초기 상태, 실패 시 기대 및 관찰값을 해당 테스트에서 덧붙인다. 일반 실패도 기록 후 원래 오류를 다시 던지며 통제 결함만 기록하지 않는다.
5. 재현의 목적은 난수 탐색에서 발견한 동일 위반이 실제 동작에서도 발생하는지 확인하는 것이다. 같은 생성기와 실행 조건으로 seed 재실행하고, 축소된 실제 행동을 난수 없이 실행한다. 같은 관찰식이 정상 구현에서 통과하고 해당 결함에서 실패해야 한다. 검증 결과의 `failed` 값은 이 확인의 보조 신호일 뿐 기능 결과를 대신하지 않는다.

[fast-check 모델 문서](https://fast-check.dev/docs/advanced/model-based-testing/)의 단순한 기대 모델과 command 재현 방식을 적용한다. 후보마다 새 실행 대상과 저장 공간을 만들고 종료 시 정리한다. 브라우저에서는 후보마다 BrowserContext를 새로 만들되 후보 안의 새로고침은 같은 저장 공간을 유지한다.

통제 결함은 정상 탐색과 같은 행동 및 관찰 코드를 사용한다. 기존 의존성 주입이 있는 명령 검사에서는 성공처럼 반환하되 쓰기를 누락하는 대역으로 탐지력을 확인할 수 있다. 이를 실제 IndexedDB 또는 UI 결함 증거로 세지 않는다. UI 결함은 실제 입력 연결의 누락을 격리된 검증에서 확인하며 DOM 결과를 사후 조작해 실패를 만들지 않는다. 재현 가능한 주입 방법이 없으면 해당 절차를 미완료로 남기고 먼저 방법을 조사한다.

별도 Git 조회 스크립트, 공통 reporter, 자체 축소기, fixture 디렉터리와 테스트용 서비스 화면은 추가하지 않는다. 실행 코드 버전은 실행 기록 또는 CI의 커밋 정보에 한 번 남기고 테스트 전역 상수로 주입하지 않는다. 미커밋 코드의 로그에는 그 제한을 명시한다. 프로필은 기존 테스트 설정의 실행 옵션으로 관리하고 실제 선택값과 실행 횟수 및 행동 수를 기록한다.

### 생성

목적은 연속 생성과 실패 뒤 재시도에서 메모가 빠지거나 중복되지 않고, 새로 열어도 입력한 메모가 남는지 확인하는 것이다.

먼저 `notes-collection.tsx`의 `createNewNote`, `notes-data-provider.tsx`의 `createNote`, `indexed-db-note-repository.ts`의 저장을 읽는다. `notes-data-provider.browser.test.tsx`와 `e2e/notes.spec.ts`에서 생성 검사 부분을 재작성한다. 전체 삭제 예정인 `notes-model.spec.ts`의 생성 검사는 먼저 제거하며, 그 파일의 생성 상태와 제어 화면은 복원하지 않는다.

1. 생성: 새 메모 만들기, 원문 입력, 다른 메모 만들기, 다시 열기와 실패 후 재시도를 조합한다. 초기 메모 삽입을 생성 행동으로 세지 않고 실제 생성 제어를 실행한다.
2. 탐지: 입력으로 정한 원문별 메모 개수, 서로 다른 ID, 처음 생성된 메모 보존과 새 연결 조회 결과를 비교한다. 실제 배치 알고리즘을 기대 모델에 복사하지 않고 겹침 및 Tab 순서의 요구 조건만 검사한다. 두 번째 생성의 저장 누락이 관찰에서 실패해야 한다.
3. 축소: 생성과 재시도 횟수를 줄이되 누락 또는 중복이 발생하는 순서는 남긴다. 적어도 필요한 생성 행동이 실행됐는지 확인한다.
4. 기록: 생성 입력, 생성 전후 개수, 각 입력으로 만들어진 메모 ID와 다시 읽은 원문을 남긴다. 생성 결과 전체 객체의 스냅샷은 만들지 않는다.
5. 재현: 같은 생성 버튼과 입력으로 최소 순서를 실행하고 새로고침 뒤 개수를 확인한다. 저장 명령의 대역 검사는 별도 범위로 기록한다.

조사 질문은 저장 요청 성공과 transaction 완료 중 어느 시점에 화면에 추가하는가이다. [IndexedDB transaction](https://w3c.github.io/IndexedDB/#transaction-concept)을 근거로 완료 후 조회를 확인한다. 생성 지연을 해결하려고 UI와 Provider에 별도 생성 목록을 추가하지 않는다.

- [x] 행동 생성: 증거 확보. `notes.spec.ts`에서 후보마다 새 BrowserContext를 열고 실제 `새 메모` 버튼, 편집기 입력과 새로고침을 `fc.commands`로 조합한다. 모든 후보는 실제 생성 두 번부터 시작하므로 빈 행동 목록 통과나 생성 한 번만 실행한 후보를 완료로 세지 않는다. 첫 IndexedDB 메모 쓰기만 중단하는 격리 조건에서는 같은 버튼으로 실패 알림을 확인한 뒤 다음 생성과 새로고침을 실행한다. 이 조건은 재시도 행동을 실행하기 위한 것이며 결함 탐지나 재현 완료 증거로 사용하지 않는다.
- [x] 오류 탐지: 증거 확보. 각 생성 뒤 새 IndexedDB 연결의 원문 목록과 서로 다른 ID 수를 입력 목록과 비교하고 새로고침 뒤에도 읽는다. 두 번째 메모에 대한 저장 요청만 성공처럼 끝나지만 쓰지 않는 격리 조건에서는 화면의 두 메모와 저장소의 한 메모가 달라 같은 관찰식이 실패한다. 첫 메모는 남아 있고 화면에는 두 메모가 보인다는 결과를 Chromium, Firefox 및 WebKit에서 확인했다.
- [x] 실패 순서 축소: 증거 확보. 고정한 두 생성 명령과 수동 예외 검사를 제거했다. 실제 버튼으로 실행하는 생성 및 다시 열기 명령을 `fc.commands`가 만들고, 두 번째 생성 쓰기 누락에서 같은 저장 관찰식이 실패한 뒤 fast-check가 실패 후보를 축소했다. WebKit에서는 실제로 실행한 생성, 다시 열기, 생성, 생성 네 행동이 생성 두 행동으로 줄었다. 축소 결과의 마지막 행동을 제외하면 누락이 발생하지 않고, 두 행동을 실행하면 같은 위반이 발생한다. 전역 최소 순서의 증명으로 주장하지 않는다.
- [x] 로그 기록: 증거 확보. 같은 E2E 검사에서 실제 실행한 행동만 기록해 실행 조건 때문에 생략된 명령을 제외한다. 각 브라우저 실행의 fast-check seed, path, replayPath가 붙은 축소 명령, 최초와 축소 후보의 예상 원문 및 새 연결에서 읽은 원문을 Playwright 첨부 자료와 출력에 남긴다. 최초와 축소 후보의 저장 누락 차이도 기록한다.
- [x] 재현: Chromium, Firefox 및 WebKit에서 증거 확보. 같은 seed, path 및 명령 replayPath로 축소 후보를 다시 생성해 저장 누락을 관찰했다. 축소 명령을 난수 없이 같은 버튼으로 재실행하면 쓰기 누락 조건에서 메모 하나가 빠지고, 정상 조건에서는 모두 저장된다. 두 조건은 같은 생성 명령과 화면 및 저장소 관찰식을 사용한다.
- [x] 생성 기능의 다섯 절차 완료. 세 브라우저에서 정상 생성, 첫 쓰기 실패 뒤 재시도 및 두 번째 쓰기 누락을 포함한 아홉 E2E 검사가 통과했다. 실제 기기의 입력기 동작은 이 자동화 결과에 포함하지 않는다.

행동 생성 절차에서 `notes-data-provider.browser.test.tsx`의 생성용 가짜 저장소, 테스트 화면 기반 명령과 `failed` 값 및 고정 최소 행동 검사를 삭제했다. `notes-model.spec.ts`의 생성 전용 두 검사를 제거하고 실제 서비스 E2E인 `notes.spec.ts`에 다시 작성했다. 운영 UI, Provider와 repository는 고치지 않았고 새 fixture, 별도 스크립트, React state, Effect와 ref를 추가하지 않았다.

이 코드 변경에서는 `e2e/notes.spec.ts`의 두 번째 메모 쓰기 누락 검사에서 고정된 두 생성 명령과 수동 예외 확인을 제거했다. 기존 생성 명령을 `fc.commands`로 생성해 같은 화면 및 저장소 관찰식에 연결하고, 통제 결함을 넣는 `BrowserContext` 구성을 재실행에도 사용했다. 운영 코드, 다른 예제 검사, 별도 fixture와 범용 reporter는 추가하거나 바꾸지 않았다. 축소 뒤 fast-check의 seed, path, 처음 실패한 실제 행동과 축소된 실제 행동을 기록하고 같은 조건의 재실행 및 난수 없는 명령 재실행으로 대조했다. 축소 결과를 미리 정한 행동 수나 원문에 맞추지 않았다.

### 본문 편집과 원문 revision

목적은 입력 순서가 바뀌어도 원문을 변형하지 않고, 본문 변경만 content revision에 영향을 주는지 확인하는 것이다.

먼저 `note-card.tsx`의 React Hook Form 연결, `note.ts`의 `reviseNote`와 저장 호출을 읽는다. `note.test.ts`와 `e2e/notes.spec.ts`의 해당 검사를 보완한다. `note-lifecycle.model.test.ts`의 revision 계산과 저장 모델은 삭제한다.

1. 생성: 공백, 줄바꿈, Unicode와 URL 모양 원문으로 전체 교체, 일부 교체, 이전 입력 복귀와 위치 변경을 섞는다. 실제 textarea 입력 또는 실제 `reviseNote`를 사용하고 실행 계층을 구분한다.
2. 탐지: 입력한 문자열과 읽은 원문을 비교한다. 본문이 같은 작업은 content revision을 유지하고 다른 원문 저장은 정해진 증가 규칙을 따른다. trim 적용 또는 geometry 변경의 잘못된 revision 증가를 잡는다.
3. 축소: 문자열 축소와 편집 순서 축소를 따로 기록한다. 공백 손실 사례에서 문제를 만드는 공백까지 제거한 후보를 같은 위반으로 인정하지 않는다.
4. 기록: 이전 원문, 실제 입력, 저장 원문과 content revision만 남긴다. 운영 객체를 그대로 기대값으로 사용하지 않는다.
5. 재현: 최소 입력을 실제 편집기에 넣고 저장 및 재진입 결과를 확인한다. 외부 앱 Clipboard 붙여넣기와 문자열 입력 자동화는 같은 증거로 묶지 않는다.

조사 질문은 입력기 조합, 줄바꿈과 form reset이 원문에 미치는 영향이다. [Playwright 입력](https://playwright.dev/docs/input)과 React Hook Form의 현재 API를 확인한다. 입력 사본을 `useState`에 추가하지 않고 기존 폼에서 값을 읽는다.

이번 절차의 코드 변경 전 결정: `entities/note/model/note.test.ts`에 `reviseNote`를 직접 실행하는 단순 기대 모델과 생성형 편집 및 위치 명령을 추가한다. 예상 원문과 revision은 이전 예상값 및 실행한 입력에서 계산하고 운영 함수를 기대값 생성에 쓰지 않는다. 같은 파일의 기존 예제와 `e2e/notes.spec.ts`의 실제 textarea 입력 및 저장 검사는 유지한다. 새 도메인 탐색이 정상 동작, 공백 제거 및 위치 변경 때의 잘못된 revision 증가를 구별하고 재현한 뒤 `note-lifecycle.model.test.ts`에서 본문 전용 명령, 상태, 보고와 검사만 제거한다. 그 파일의 배치, 삭제 및 복원 검사는 유지하며 사용하지 않게 된 import를 함께 제거한다. 운영 코드, 별도 테스트 파일, fixture, 공통 실행기와 UI 상태는 추가하지 않는다. fast-check의 명령 축소 및 replayPath는 공식 모델 기반 테스트 문서의 방식으로 사용하고, 실제 textarea 및 IME 결과는 도메인 검사에서 추정하지 않는다.

축소된 도메인 입력을 실제 편집기에 넣는 증거는 기존 브라우저 검사의 앞뒤 공백 및 여러 줄 입력만으로는 완성되지 않는다. `e2e/notes.spec.ts`의 같은 사용자 과업 안에 축소에서 얻은 공백만 있는 원문을 이어 입력하고, 새 저장소 조회와 새로고침 뒤 원문 및 revision을 확인한다. 별도 E2E 파일이나 비슷한 과업의 중복 검사는 추가하지 않는다.

- [x] 행동 생성: `note.test.ts`에서 공백을 포함한 원문, 여러 줄, URL 형태, 원래 원문 복귀, 같은 원문 재적용과 X 위치 변경을 `fc.commands`로 조합했다. 정상 후보 100개를 현재 도메인 함수로 실행했다.
- [x] 오류 탐지: 기대 원문과 revision을 이전 기대값 및 행동 입력에서 계산한다. 공백 제거와 위치만 바꿨을 때의 `contentRevision` 증가를 별도 통제 결함으로 구분했고, 같은 관찰식이 각각의 예상 및 실제 값 차이를 찾았다.
- [x] 실패 순서 축소: 두 통제 결함 모두 여러 행동이 포함된 최초 실패에서 한 번의 본문 교체 또는 한 번의 위치 변경으로 줄었다. 실제 명령의 실행 내역과 축소된 입력을 기록했다.
- [x] 로그 기록: 각 통제 결함의 최초 및 축소 행동, 예상 및 관찰값, fast-check seed, path, replayPath와 설치된 fast-check 버전을 검사 출력에 남겼다.
- [x] 재현: seed, path 및 replayPath로 같은 결함을 다시 생성했다. 축소 명령을 난수 없이 실행했을 때 통제 결함에서 실패하고 정상 `reviseNote`에서 통과했다. 별도 브라우저 검사에서는 실제 textarea 입력과 저장 원문 및 revision을 세 브라우저에서 확인했다.
- [x] 본문 편집과 원문 revision의 다섯 절차 완료. 기존 예제를 포함한 단위 검사 199개와 실제 편집 브라우저 검사 세 개가 통과했다. 입력기 조합과 외부 앱 붙여넣기는 확인하지 않았다.

본문 전용 탐색의 이전 구현을 `note-lifecycle.model.test.ts`에서 제거하고 사용하지 않는 계측 import를 정리했다. 같은 파일의 배치, 삭제 및 복원 검사는 유지했다. 새 test 화면이나 운영 상태를 만들지 않았고, 같은 책임의 두 도메인 탐색을 병행하지 않는다.

### 데스크톱 자동 저장

목적은 800ms 대기와 이탈 저장이 실제 입력에서 시작되고, 저장 도중 새로 입력한 원문이 뒤늦은 완료로 덮이지 않는지 확인하는 것이다.

먼저 `note-card.tsx` → `use-note-content-autosave.ts` → `NotesDataProvider.saveContent` → `save-note-content.ts`를 따라간다. `note-content.model.test.ts`의 `begin/complete/accept` 수동 조립은 삭제한다. 기존 `notes-data-provider.browser.test.tsx`와 `e2e/notes.spec.ts`에서 실제 편집 동작으로 재작성한다.

1. 생성: 입력, 800ms 직전 대기, 임계 시각 도달, 재입력, blur와 내부 이동을 조합한다. 시간 제어는 앱을 열기 전에 설치하고 저장 시각을 관찰하는 동안 새로고침이나 blur를 먼저 실행하지 않는다.
2. 탐지: 임계 시각 전후 저장 원문과 화면 입력을 확인한다. A 저장 중 입력한 B는 화면에 남고 후속 저장 뒤 B가 조회돼야 한다. timer 예약 누락과 늦은 A 완료가 B를 덮는 경우를 구분한다.
3. 축소: 실패를 만드는 입력 간 시간과 이탈 시점을 함께 줄인다. 저장 완료를 테스트가 가짜 상태 변경으로 대신하지 않는다.
4. 기록: 입력 순서, 가상 시각, 저장 완료와 화면 원문을 남긴다. 실제 pending Promise는 실행 대상에서 기다린다.
5. 재현: 같은 시간 진행과 실제 입력을 반복한다. hidden과 pagehide는 실제 문서 전환을 자동화할 수 있는 조건을 조사하고, 합성 이벤트 검사는 처리기 수준의 보조 증거로만 남긴다.

[Playwright Clock](https://playwright.dev/docs/clock)의 타이머 설치 순서와 `runFor`를 확인한다. 저장 수명에 문제가 있으면 기존 타이머와 이탈 처리를 수정하고 두 번째 autosave hook, 타이머 또는 동기화 Effect를 추가하지 않는다.

다음 코드 변경 전 결정: `e2e/notes.spec.ts`에 실제 메모 편집기의 입력, 가상 시각 진행, 저장 원문 조회와 blur를 실행하는 명령을 추가한다. 후보마다 새 BrowserContext와 IndexedDB를 사용하고 시계는 앱을 열기 전에 설치한다. 저장 대기 중 새 입력과 이탈 전 저장은 서로 다른 관찰 시점으로 둔다. 현재 `notes-data-provider.browser.test.tsx`의 테스트 전용 `AutosaveEditor`, 수동 저장 대역 및 공통 탐색 보고 코드는 실제 화면 검사로 같은 결과를 보호한 뒤 제거한다. 같은 파일의 저장소 차단, 재시도와 오래된 읽기 완료 검사는 유지하고, 기존 늦은 저장 완료 검사도 실제 화면에서 동등한 결과를 확인하기 전에는 제거하지 않는다. `note-content.model.test.ts`의 수동 `begin/complete/accept` 코드는 다른 초안 절차가 의존하는 부분을 확인한 뒤 제거한다. 운영 hook과 Provider, 새 fixture, 별도 시계 추상화는 추가하거나 변경하지 않는다.

진행 상태: `e2e/notes.spec.ts`의 실제 편집기에서 입력, `799ms`, `1ms`, `800ms` 진행과 blur를 생성하는 명령을 추가했다. 후보마다 새 BrowserContext와 IndexedDB를 사용한다. 실제 IndexedDB의 편집 후 쓰기를 성공처럼 누락한 조건에서는 저장 원문 비교가 실패했다. fast-check가 실제 행동을 줄였고, seed, path 및 replayPath 재생과 난수 없는 실행에서도 같은 저장 차이를 관찰했다. 같은 명령은 정상 저장에서 통과했다. 기존 Browser Mode의 늦은 완료 검사는 이 결과만으로 제거하지 않는다.

세 브라우저로 확대한 첫 실행은 여섯 검사 중 네 검사가 통과했다. Firefox의 쓰기 누락 검사와 Chromium의 정상 검사에서 `799ms` 진행 뒤 저장이 이미 완료되어 모델의 예상과 달랐다. 시계를 설치만 하면 페이지 작업 동안 시간은 계속 흐르므로, 사용자가 입력한 직후부터 경과한 시간과 `runFor` 인수만 누적한 모델 시간이 다르다. [Playwright Clock의 `pauseAt`](https://playwright.dev/docs/api/class-clock#clock-pause-at)을 따라 앱 로드와 초기 원문 저장 뒤 시계를 멈추고 생성 명령의 시간 진행만 허용하도록 검사 준비를 고쳤다. 이 차이를 운영 자동 저장 결함으로 분류하지 않는다.

첫 수정에서는 브라우저에서 읽은 현재 시각을 그대로 `pauseAt`에 전달했다가 명령 전달 사이의 시간이 지나 과거 시각이라는 오류가 났다. 이는 시계 준비 오류이며 저장 결과가 아니다. 같은 준비 지점에서 현재 시스템 시각보다 충분히 뒤의 가상 시각으로 한 번 이동해 멈추도록 바꾸고, 진단 출력은 제거했다. 시간 진행은 이후 생성 명령의 `runFor`에만 맡긴다.

시계 수정 뒤 정상과 쓰기 누락 검사가 Chromium, Firefox 및 WebKit에서 모두 통과했다. 쓰기 누락의 최초 실패는 입력과 시간 진행이 섞인 행동에서 실제 입력 및 저장 기한 도달 행동으로 축소됐다. 세 브라우저에서 축소 행동의 seed, path, replayPath 재실행과 난수 없는 실행이 같은 저장 차이를 보였고 정상 저장에서는 통과했다. 이 결과는 800ms 타이머 및 blur 입력과 저장소 연결의 증거다.

다음 코드 변경 전 결정: 실제 메모 화면에서 저장 기한 전의 내부 이동과 pagehide 및 숨김 신호를 각각 확인한다. 앱이 제공하는 이동 링크와 같은 브라우저 문서의 저장소를 사용하고, 합성 신호는 이벤트 처리 연결의 보조 증거라고 명시한다. 이어서 실제 화면에서 확인한 타이머 탐색과 중복되는 `notes-data-provider.browser.test.tsx`의 테스트용 편집기 기반 생성 명령 및 보고 코드를 제거하되, 앞선 저장이 끝난 뒤 최신 입력을 보존하는 지연 저장 예제와 저장소 차단 및 재시도 예제는 유지한다. 삭제할 import와 명령 실행기를 같은 변경 단위에서 정리하고 운영 코드는 변경하지 않는다.

진행 상태: 실제 메모 화면의 생성 명령에 숨김과 pagehide 신호를 추가하고, 저장 기한 전에 설정 링크로 내부 이동하는 별도 과업을 확인했다. 내부 이동과 타이머 및 이벤트 연결 검사는 Chromium, Firefox 및 WebKit에서 여섯 건 모두 통과했다. 숨김과 pagehide는 문서 이벤트를 합성했으므로 실제 OS 탭 전환의 증거로 세지 않는다. 기존 Browser Mode에서 타이머 저장을 다시 모델링하던 명령, 탐색 보고와 Git revision import를 제거했다. 이전 저장 완료가 지연되는 동안 최신 입력을 남기는 예제 및 저장소 차단과 재시도 예제는 유지했고, 해당 Browser Mode 검사 아홉 건과 타입 검사 및 lint가 통과했다.

다음 코드 변경 전 결정: 지연된 첫 저장의 실제 화면 입력과 원문 보존을 검증할 수 있는 기존 서비스 UI 조립 지점을 조사한다. 지연 저장을 위해 운영 Provider 또는 IndexedDB를 새 상태로 감싸지 않는다. 현재 예제의 테스트용 편집기를 실제 UI로 안전하게 교체할 수 없으면 지연 완료의 서비스 화면 증거는 미확인으로 남기고 자동 저장 단위를 완료 표시하지 않는다. 이미 확인한 타이머와 이탈 검사를 다시 복제하지 않는다.

조립 지점 확인 뒤 코드 변경 계획: `notes-data-provider.browser.test.tsx`의 `AutosaveEditor`는 `useForm` 등록과 `useNoteContentAutosave` 호출을 직접 복제해 실제 카드의 저장 후 입력 유지 동작을 검사하지 못한다. 이 테스트용 편집기의 props와 import를 삭제하고 같은 Provider 조립 안에 운영 `NoteCard`를 렌더링한다. 자동 저장 외의 카드 명령만 테스트용 무동작 callback으로 연결하며 새 Provider, fixture 파일이나 운영 prop을 만들지 않는다. 지연 저장 예제는 입력 원문 두 개를 생성해 카드의 실제 편집기에 연속으로 넣고 첫 쓰기를 대기시킨 뒤 두 번째 입력의 화면 유지, 첫 쓰기 해제 뒤 후속 쓰기 시작, 완료 후 카드와 repository 원문을 검사한다. 기존 저장소 대역은 쓰기 시점을 제어하는 데만 유지하고 기대 원문을 저장 요청에서 읽어 만들지 않는다. 카드 직접 조립에 필요한 callback 수가 지나치게 많아 검사의 목적을 흐리거나 기존 서비스 화면과 다르게 동작하면 이 변경을 중단하고 다른 실제 화면 조립 지점을 조사한다.

- [x] 데스크톱 자동 저장의 다섯 절차 완료. 실제 카드 편집기로 두 원문을 연속 입력하고 첫 쓰기를 지연시킨 뒤 후속 쓰기와 최종 저장 원문을 확인했다. 테스트가 운영 hook을 재구현하던 편집기는 제거했다. 타이머, blur, 내부 이동 및 합성 문서 이벤트의 앞선 실제 화면 탐색과 통제 결함 축소 및 재현은 유지한다. 합성 신호를 실제 OS 탭 전환이나 종료로 계산하지 않는다.

### 모바일 명시적 저장과 이탈

목적은 저장 버튼을 누르기 전에는 원문을 확정하지 않고, 계속 편집과 변경사항 버리기가 서로 다른 결과를 내는지 확인하는 것이다.

이번 코드 변경 전 결정: `e2e/notes.spec.ts`의 실제 320px 메모 목록과 상세 화면에서 본문 교체, 저장, 이탈 시도, 계속 편집, 변경사항 버리기와 재진입을 명령으로 조합한다. 기대 모델에는 입력 원문, 마지막으로 저장된 원문과 현재 화면만 둔다. 저장소 원문은 각 행동 뒤 실제 IndexedDB에서 읽고, 저장 버튼 누르기 누락은 해당 상세 화면의 click 연결만 격리해 같은 관찰식으로 축소 및 재현한다. `notes-model.spec.ts`의 모바일 전용 명령, 보고서와 오래된 검사 한 건은 새 검사가 같은 결과를 보호한 뒤 삭제한다. 그 파일의 자동 저장, 삭제 복원과 좁은 화면 기존 예제는 유지한다. 새 앱 상태, fixture, 실행기와 저장 schema는 추가하지 않는다.

조합 검사에서 첫 원문 저장 직후 두 번째 원문을 입력하면 화면에는 새 원문이 남지만 저장소에는 첫 원문이 남는 사례가 축소됐다. 설치된 React Hook Form 7.86.0의 `reset`은 기본적으로 필드 참조를 지운다. 현재 상세 편집기는 별도 callback ref를 유지하므로 같은 DOM 요소가 다시 연결되지 않고, 다음 `onChange`에서 폼 값이 `undefined`가 된다. 저장 실패와 초안 보관 실패가 뒤따른다. 다음 운영 코드 변경은 `use-note-detail-editing.ts`에서 저장 성공 후 `reset`할 때 기존 필드 참조를 유지하는 옵션을 적용하는 한 곳으로 제한한다. 추가 폼 state, 효과 또는 저장 대역은 만들지 않는다. 진단용 console 문구는 제거하고, 첫 저장 직후 두 번째 저장과 초안 보관 및 이탈 동작을 같은 브라우저 과업에서 다시 확인한다. 이 결정은 설치 버전의 타입과 구현, 공식 변경 기록에서 `keepFieldsRef` 동작을 확인한 뒤 적용한다.

수정 뒤 서로 다른 두 원문을 연속 저장하는 생성 입력과 이탈 선택 탐색이 Chromium, Firefox 및 WebKit에서 통과했다. 저장 버튼의 사용자 입력 연결만 누락한 통제 조건에서는 같은 IndexedDB 원문 비교가 실패했고, 세 브라우저에서 편집 및 저장 두 행동으로 축소, seed, path, replayPath 재생과 난수 없는 실행을 확인했다. 정상 조건에서는 축소된 행동이 저장됐다. 다음 삭제 변경 전 결정: `notes-model.spec.ts`에서 이 동작을 별도의 테스트 화면 상태와 고정 원문으로 다시 구성하던 모바일 명령, 계측 코드 및 검사 한 건을 제거한다. 그 파일의 나머지 사용자 과업을 유지하고, 삭제로 사용하지 않게 된 import만 정리한다. 먼저 실제 화면의 이탈 선택과 재진입 기존 검사가 남아 있는지 확인했고 `notes.spec.ts`에서 같은 행동을 검사한다.

중복 명령 제거 뒤 나머지 `notes-model.spec.ts`의 세 브라우저 과업 12개, 타입 검사와 lint가 통과했다. 다음 검사 변경 전 결정: `notes.spec.ts`의 변경사항 버리기 과업에서 IndexedDB 초안 부재를 추가로 읽고, 복구 초안이 있는 모바일 목록에서 실제 수정 링크로 들어갈 때 메모 원문이 상세 저장 버튼보다 먼저 바뀌지 않는지 별도 과업으로 확인한다. 초안은 기존 저장소 도우미로 준비하고 새 fixture나 화면 분기 상태를 만들지 않는다. 시간 진행은 Playwright Clock으로 제어한다. 예상 원문은 준비한 메모와 초안에서 계산한다. 이 검사에서 저장 수명 결함이 다시 드러나면 모바일 단위를 완료로 표시하지 않고 초안 절차의 운영 수정 범위를 먼저 확인한다.

당시 Chromium에서 복구 초안을 가진 모바일 목록을 다시 연 뒤 수정 링크로 이동하자, 저장 전 원문이 초안으로 바뀌었다. 당시 구현은 `NotesCollection`에서 CSS로 숨긴 `NotesBoard`와 모바일 목록을 동시에 마운트했다. 보드 편집기는 복구 초안을 초기 입력으로 받고 상세 이동 시 종료 저장을 실행했다.

이후 메모 작업 영역의 너비를 기준으로 화면 하나만 조건부 렌더링하도록 변경되어 이 동시 마운트 문제는 현재 코드에 남아 있지 않다. 당시 운영 코드 변경 계획은 `tokens.css`에 보드 최소 너비를 한 번 정의하고, `use-note-workspace-layout.ts`가 실제 메모 작업 영역의 `clientWidth`를 `ResizeObserver`로 관찰해 모바일 목록과 데스크톱 보드 중 하나만 렌더링하는 것이었다.

선택한 화면만 마운트하고 CSS-only 표시 분기 및 중복 너비 판단을 제거하며, `ResizeObserver`가 없으면 창 크기 변경 때 같은 영역을 다시 측정하기로 했다. `NotesDataProvider`, `useNoteContentAutosave`, 상세 폼, 저장소와 geometry 명령은 변경하지 않고, 측정 뒤 선택 화면을 활성화해 숨은 편집기의 종료 저장을 막는 계획이었다.

너비에 따라 두 화면 중 하나만 마운트하도록 바꾸자, 복구 초안이 있는 모바일 목록에서 상세로 이동해도 저장 전 메모 원문과 content revision이 유지됐다. 초안도 그대로 남아 있고 상세 편집기에 복구 원문이 보였다. Chromium, Firefox 및 WebKit에서 복구 초안 이동, 연속 저장, 저장 누락 탐지, 계속 편집과 버리기, 넓은 화면 전환을 포함한 15개 과업이 통과했다. 버리기 뒤 초안 부재도 실제 IndexedDB에서 확인했다. 보드 최소 너비는 한 토큰에서 읽고 CSS로 숨긴 보드의 마운트를 제거했다. 저장소와 자동 저장 hook에는 별도 조건을 추가하지 않았다.

먼저 `note-detail-page.tsx`의 `ReadyNoteDetail`, `navigation-guard-provider.tsx`, `saveDraft`와 `saveContent`를 읽는다. `notes-model.spec.ts`의 모바일 모델을 삭제하고 `e2e/notes.spec.ts`의 실제 목록과 상세 화면 검사로 재작성한다.

1. 생성: 320 CSS px 작업 영역에서 상세 진입, 입력, 이탈 시도, 계속 편집, 변경사항 버리기, 저장과 재진입을 조합한다. 저장 중 다시 누를 수 없는 버튼을 강제 클릭하지 않는다.
2. 탐지: 저장 전 원문 보존, 복구 입력, 저장 뒤 재조회 원문과 이탈 후 주소를 확인한다. 계속 편집은 입력 유지, 버리기 성공은 원문 유지와 초안 제거를 검사한다. 숨은 데스크톱 편집기의 자동 저장도 관찰한다.
3. 축소: 상세 진입과 편집 및 잘못된 이탈을 남기고 무관한 왕복을 제거한다. 취소 버튼 이름이나 내부 navigation phase를 결과로 비교하지 않는다.
4. 기록: 실제 작업 영역 너비, 편집 원문, 선택한 이탈 동작, 저장 원문과 초안 유무를 남긴다.
5. 재현: 목록에서 다시 상세로 들어가 같은 결과를 확인하고 넓은 화면으로 바꿔 geometry가 유지되는지 확인한다.

조사 질문은 상세 화면 이탈, form reset과 숨은 편집기의 수명이 함께 동작하는 방식이다. [React 상태 보존과 초기화](https://react.dev/learn/preserving-and-resetting-state)를 확인한다. 이탈 상태를 별도 ref와 Effect로 복제하지 않고 기존 navigation 상태와 폼을 수정한다.

- [x] 행동 생성: 서로 다른 두 원문을 연속 입력 및 저장하고, 추가 입력, 저장, 이탈 시도, 계속 편집, 버리기와 재진입을 조건부 명령으로 조합했다. 후보마다 독립된 320px BrowserContext와 IndexedDB를 사용했다.
- [x] 오류 탐지: 실제 textarea와 저장소 원문을 독립 모델의 현재 입력과 마지막 저장 원문에 대조했다. 저장 전에 원문이 바뀌는 숨은 보드 결함과 두 번째 저장에서 폼 값이 사라지는 결함을 찾아 수정했다. 저장 버튼 연결을 격리하면 같은 저장 원문 비교가 실패한다. 버리기 뒤에는 초안이 없고, 모바일에서 넓은 화면으로 바꿔도 저장 geometry가 유지된다.
- [x] 실패 순서 축소: 저장 버튼 연결 누락이 실제 편집 및 저장 두 행동으로 줄었다. 최초와 축소 입력은 생성기가 정하며 특정 텍스트나 행동 수를 정답으로 두지 않았다.
- [x] 로그 기록: 최초 및 축소 행동, 입력 원문, 저장 원문, 브라우저, fast-check seed, path 및 replayPath를 Playwright 첨부 자료와 출력에 남겼다.
- [x] 재현: 축소 행동을 seed, path, replayPath와 난수 없는 순서로 실행해 격리된 누락에서만 실패하고 정상 저장에서는 통과했다. 기존 화면 과업으로 계속 편집, 버리기, 목록 재진입과 넓은 화면 전환을 확인했다.
- [x] 모바일 명시적 저장과 이탈의 다섯 절차 완료. `notes-model.spec.ts`의 중복 모바일 명령 및 검사 한 건을 제거한 뒤 남은 12개 세 브라우저 과업, 단위 검사 199건, Browser Mode 48건, 전체 Playwright E2E 190건, 타입 검사, lint와 운영 빌드가 통과했다. 실제 기기 입력기와 OS 탭 전환은 이 판정에 포함하지 않는다.

### 초안 복구와 제거 재시도

목적은 저장 실패에서도 입력을 복구하고, 메모 저장 뒤 초안 제거만 실패하면 다음 실제 저장 기회에서 정리를 끝내는 것이다.

이번 코드 변경 전 결정: `note-content.model.test.ts`의 `begin`, `complete`, `accept`, `expectedRequest`와 고정 원문별 중복 검사를 제거한다. 같은 파일에는 사용자 관점의 편집, 저장, 저장 실패 및 재시도 명령을 작성하고, 후보별로 새 메모와 초안 저장 대역을 만들어 실제 `saveNoteContent` 및 저장 상태를 한 번의 저장 동작으로 실행한다. 기대 모델은 입력 원문, 마지막으로 저장된 원문 및 revision, 남은 초안과 다음 저장 실패만 보관한다. 저장 요청 생성 여부나 내부 pending 값을 기대 결과로 비교하지 않는다. `note-draft.test.ts`, `save-note-content.test.ts`, `note-content-save-state.test.ts`와 기존 실제 IndexedDB 검사는 새 탐색에서 입증되지 않는 단일 실패와 복구 분류 사례만 유지하며, 대체 증거 없이 삭제하지 않는다. `notes.spec.ts`의 실제 모바일 복구 및 정리 재시도 과업은 유지하고, 앞 절차에서 확인한 숨은 보드 수정이 저장 전 원문을 보존하는지도 함께 사용한다. 운영 저장 함수, Provider와 자료 형식은 현재 검사에서 새 결함이 확인되기 전에는 바꾸지 않는다. 기존 E2E의 전역 IndexedDB 실패 주입을 새 생성 검사에 복제하지 않고 저장소 주입으로 결함 조건을 만든다.

실제 화면의 메모 저장 실패 뒤 재접속은 기존 E2E로 확인되지 않는다. 이를 위해 `note-detail-page.browser.test.tsx`에 실제 상세 화면과 현재 `NotesDataProvider`를 렌더링하고, 메모 및 초안 repository의 한 번 실패를 주입하는 브라우저 검사를 추가한다. 저장 실패 후 오류 안내, 재마운트된 입력, 다음 저장의 메모 원문 및 초안 제거를 확인한다. `next/navigation`의 화면 이동 함수만 테스트에서 대체하며 운영 컴포넌트에 테스트용 prop이나 상태를 추가하지 않는다. 새 저장 대역은 이 검사 안에서만 사용하고 기존 Provider 검사용 편집기를 복사하지 않는다.

진행 상태: 저장 요청과 완료를 시험 코드가 따로 호출하던 명령을 사용자 관점의 저장 한 행동으로 합쳤다. 기대 모델은 입력, 저장 원문과 두 revision, 초안 및 다음 실패만 보관하고 저장 함수의 요청값을 정답으로 복사하지 않는다. 후보 100개에서 462개 행동을 실행했다. 초안 제거 실패 뒤 정리 상태를 잃는 결함과 메모 저장 실패 뒤 초안을 잃는 결함은 각각 네 행동과 세 행동으로 축소됐다. seed, path, replayPath 및 축소 행동의 직접 재실행에서 결함 조건만 실패하고 정상 저장은 통과했다. 초안 제거가 연달아 두 번 실패한 뒤의 정리도 생성 원문으로 확인했다.

실제 상세 화면에서는 메모 repository의 한 번 실패 뒤 오류 안내, 재마운트된 복구 입력과 다음 저장 완료를 세 브라우저의 Browser Mode 검사로 확인했다. 모바일 목록의 복구 초안 이동과 제거 실패 뒤 재시도는 Chromium, Firefox 및 WebKit의 실제 IndexedDB 과업 여섯 건이 통과했다. 기존 E2E의 실패 주입은 격리된 사례로 유지하고 새 생성 검사에는 복제하지 않았다. 단위 검사 197건, Browser Mode 51건, 타입 검사와 lint가 통과했다. 전체 E2E는 이번 테스트 변경 뒤 다시 실행하지 않았으며, 직전 운영 변경의 전체 190건 통과와 구분한다. 운영 코드와 저장 형식은 바꾸지 않았다.

먼저 `note-draft.ts`, 초안 repository, `NotesDataProvider`의 읽기 및 저장과 기존 자동 저장 상태를 읽는다. `note-content.model.test.ts`의 `expectedRequest`와 요청 생성 판정은 삭제한다. `note-draft.test.ts`, `save-note-content.test.ts`, `note-content-save-state.test.ts`, `personal-notes-database.indexeddb.test.ts`와 `e2e/notes.spec.ts`에서 책임별로 재작성한다.

1. 생성: 편집, 초안 저장 실패, 메모 저장 실패, 초안 제거 실패, 같은 입력의 다음 저장 기회, 재실패와 다시 열기를 조합한다. 실제 저장 함수와 기존 repository 주입을 사용한다. 오래된 초안처럼 UI로 만들 수 없는 초기 자료만 테스트 안에서 최소 레코드로 준비한다.
2. 탐지: 메모 저장 실패 시 초안과 입력 유지, 저장 성공 시 원문 유지, 정리 재시도 성공 시 초안 부재를 실제 저장소에서 확인한다. 두 번째 저장 요청 생성에서 끝내지 않고 완료 뒤 새 연결로 조회한다. 같은 원문 정리로 content revision이 증가하면 실패다.
3. 축소: 정리 실패와 다음 저장 기회의 순서를 남긴다. 재시도 불필요 플래그를 시험 코드가 강제로 변경한 것만으로 서비스 실패를 입증하지 않는다.
4. 기록: 저장된 원문과 revision, 초안의 기준 revision, 실패한 저장 작업, 재시도 완료 뒤 초안 유무를 남긴다. 앱 커밋 정보를 테스트 상수로 넣지 않는다.
5. 재현: 최소 순서를 실제 저장 함수와 화면 저장 기회에서 각각 재실행한다. 정상 함수의 초안 제거와 화면 연결까지 확인해야 완료다.

운영 수정 위치는 `save-note-content.ts`의 정리 결과, `note-content-save-state.ts`의 정리 보류 상태와 `use-note-content-autosave.ts`의 결과 반영이다. 기존 `draftCleanupRequired`로 처리할 수 있는 동안 중복 상태를 추가하지 않는다. 제거 재실패 뒤 보류 상태 유지도 검사한다.

별도 수정 대상은 `notes-collection.tsx`에서 함께 렌더링하는 `NotesBoard`와 모바일 목록, `note-card.tsx`의 자동 저장 수명이다. CSS 비표시만으로 Effect가 종료되지 않는 구조를 확인한다. 실제 작업 영역 너비를 기준으로 편집 책임을 하나만 활성화하고, 숨은 보드의 종료 저장이 모바일 복구 초안을 원문으로 확정하는 동작을 제거한다.

구체적인 구독 위치는 기존 크기 관찰 코드의 재사용 가능성을 먼저 확인해 정한다. 카드마다 너비 state와 Effect를 추가하거나 URL로 모바일 여부를 추정하지 않는다. 화면 전환 시 진행 중 저장, 입력과 geometry 보존을 함께 확인한 뒤 기존 구독 및 종료 처리를 교체한다.

조사 근거는 [IndexedDB transaction](https://w3c.github.io/IndexedDB/#transaction-concept), [React Effect 정리](https://react.dev/reference/react/useEffect)와 [승인된 정리 재시도 결정](decisions/note-draft-cleanup-retry.md)이다. 실제 브라우저에서 실패를 주입할 방법은 조사 후 기록하며, 임의 전역 IndexedDB 덮어쓰기를 기본 해법으로 사용하지 않는다.

- [x] 초안 복구와 제거 재시도의 다섯 절차 완료. 저장 실패 뒤 실제 상세 화면에서 다시 열어도 초안이 남고 재저장할 수 있다. 숨은 편집기가 모바일 초안을 먼저 원문에 확정하던 동작은 앞선 모바일 절차에서 제거했다. 실제 기기 종료와 CI 재현은 이번 로컬 판정에 포함하지 않는다.

### 위치와 크기 및 속성 적용

목적은 이동, 크기 조절과 속성 입력을 섞어도 원문을 보존하고 허용된 좌표 및 크기만 저장하는지 확인하는 것이다.

먼저 `note-geometry.ts`, `note-card.tsx`, `notes-board.tsx`, `note-properties-panel.tsx`와 `NotePropertiesFormProvider`를 읽는다. 실제 화면을 독립적으로 실행하는 geometry 과업은 유지하고 생명 주기 모델의 geometry 복제를 삭제한다. `note-geometry.test.ts`와 기존 실제 화면 과업에는 저장된 좌표와 크기를 읽는 검사를 보강한다.

이번 코드 변경 전 결정: `notes-geometry-model.spec.ts`는 이미 실제 카드, 속성 폼 및 새 IndexedDB 연결을 사용하는 독립 브라우저 과업이다. 이 브라우저 검사를 2천 줄이 넘는 `notes.spec.ts`로 옮기면 검사 대상은 그대로인데 파일만 커진다. 따라서 전용 파일은 유지하되 고정된 이동량, 한 방향만 조절하는 명령 및 최소 행동 문자열을 정답으로 고정한 검사를 교체한다. 여덟 조절 방향의 시작 지점을 화면 사각형에서 계산하고, 기대값은 반대쪽 변의 위치와 입력 이동량 및 허용 크기에서 구한다. pointer 종료 누락의 격리 조건과 seed/path 재현은 유지하며, 저장 원문과 두 revision은 모든 조회에서 함께 비교한다. `note-geometry.test.ts`의 고정 수치 목록은 허용 크기 안팎, 음수 및 캔버스 밖 좌표를 생성하는 입력으로 교체한다. `note-lifecycle.model.test.ts`의 geometry 갱신 명령과 중복 계산은 삭제하되 생성 배치, 겹침, 삭제 및 복원의 독립 검사는 유지한다. 운영 gesture hook, 카드, 속성 폼과 저장 형식은 실제 결함이 확인되지 않는 한 수정하지 않는다.

여덟 방향 검사에서 첫 메모의 북서쪽 꼭짓점에 pointer를 내려놓으면 메모가 아니라 `새 메모` 버튼이 입력을 받는 것을 `elementFromPoint`로 확인했다. `NotesCollection`의 데스크톱 생성 버튼은 작업 영역 위에 절대 배치되어 첫 메모의 조절 지점과 겹친다. 다음 운영 코드 변경은 생성 버튼을 데스크톱 메모 화면의 별도 상단 줄로 옮기고, `NotesBoard`를 남은 높이에 배치하는 것으로 제한한다. 모바일 목록과 상세 화면, 생성 함수 및 캔버스 좌표는 변경하지 않는다. 생성 버튼의 겹침을 피하려고 첫 메모의 저장 위치를 보정하거나 pointer 제스처를 우회하지 않는다. 화면 사각형에서 계산한 여덟 방향 조절 검사를 다시 실행한 뒤 진단용 로그를 제거한다.

확대 상태의 검사에서는 동일한 소수점 화면 좌표를 요청해도 Firefox와 WebKit이 전달한 pointer의 세로 위치가 달라 1 메모 좌표만큼 예상값이 어긋났다. 브라우저별 보정 상수를 만들지 않는다. 이동과 크기 조절 직전에 표준 `pointerdown`과 `pointermove`의 viewport 좌표를 기록하고, 그 차이를 화면에서 관찰한 배율로 변환해 기대 위치와 크기를 계산한다. 기록한 좌표는 입력값만 나타내며 앱의 gesture 상태나 계산 함수를 읽지 않는다. 기존 생성량과 결함 주입은 유지하고 운영 코드에는 이 차이만으로 수정을 가하지 않는다.

전체 E2E 실행에서는 여덟 방향 검사의 WebKit 후보가 저장값 확인 전에 `browser.newContext`에서 시간 초과됐다. 파일 단독 실행은 세 브라우저에서 통과했고, 전체 실행의 추적 자료에는 동쪽 방향의 새 문맥 시작 실패가 남았다. 여덟 방향 검사는 방향마다 새 브라우저를 열고 닫되, 그 안의 생성 후보는 이전과 같이 서로 다른 문맥과 저장소에서 실행한다. 특정 방향의 실행 횟수를 줄이거나 같은 저장소를 재사용해 축소된 행동을 오염시키지 않는다. 전체 실행의 다른 기존 검사에서 발생한 문맥 생성 지연은 이 변경의 성공으로 대신 판정하지 않는다.

1. 생성: 헤더 이동, 네 변 및 네 꼭짓점 조절, X/Y와 너비/높이 입력, 적용과 취소를 조합한다. 음수 및 4096 바깥 좌표, 크기 240/180의 하한과 4095 상한 안팎을 구분한다.
2. 탐지: 이동 후 위치, 크기 조절 시 반대편 변, 잘못된 입력 후 이전 저장값과 수정 가능 상태를 확인한다. 기대 좌표를 운영 계산 함수로 만들지 않고 시작 사각형과 입력 이동량에서 산출한다. 허용 좌표를 임의 보정하거나 취소된 값을 저장하는 결함을 잡는다.
3. 축소: 조절 방향, 배율과 취소가 필요한 사례는 보존하면서 다른 이동과 속성 입력을 줄인다. 실제 상태가 바뀌지 않은 조회만 줄인 결과는 충분한 증거가 아니다.
4. 기록: 시작 사각형, 입력값, pointer 시작 및 종료, 배율, 마지막 화면 사각형과 저장 geometry를 남긴다.
5. 재현: 최소 pointer 및 폼 행동을 실행하고 새로고침 뒤 위치, 크기와 원문을 확인한다. UI를 수치 입력만으로 우회해 resize 전체를 입증하지 않는다.

조사 질문은 [Pointer Events](https://www.w3.org/TR/pointerevents3/)의 capture 상실과 종료 순서, 배율이 적용된 이동량이다. 기존 pointer 진행 상태와 폼을 수정하며 mirror geometry state를 추가하지 않는다.

- [x] 위치와 크기의 다섯 절차 완료. 실제 메모 카드에서 여덟 방향 조절과 확대 뒤 이동 및 크기 조절, 속성의 잘못된 입력과 수정, pointer 종료 누락의 실패 축소와 재현을 확인했다. 첫 메모의 조절 지점을 가리던 데스크톱 생성 버튼은 작업 영역 위에서 분리했다. 저장 geometry와 원문 및 두 revision을 함께 확인했으며 화면 배율에 따른 기대 이동량은 실제 pointer 입력 좌표로 계산했다.

전체 E2E는 병렬 및 단일 작업자 실행에서 각각 193/196건이 통과했다. WebKit의 새 문맥 생성 지연 때문에 남은 세 건이 시간 초과됐으므로 전체 통과로 표시하지 않는다. 방향별 브라우저 분리 뒤 위치와 크기 대상 아홉 건은 다시 통과했고, 다른 시간 초과 검사는 이후 선택과 모바일 저장 절차에서 각각 다시 실행하고 전체 실행과 다른 조건임을 기록한다.

### 겹침 순서

목적은 앞뒤 이동 후 지정한 메모의 위치와 다른 메모의 상대 순서가 저장되고, Tab 순서 및 원문 revision은 유지되는지 확인하는 것이다.

먼저 `note-order.ts`, `NotesDataProvider.changeStack`과 repository의 `saveAll`을 읽는다. 기존 `notes-order-model.spec.ts`는 실제 카드 메뉴와 IndexedDB를 이미 사용하므로 파일을 옮기거나 새 탐색 실행기를 만들지 않는다. 이 파일의 고정 축소 순서 단언과 저장 숫자만 보는 관찰을 교체하고, 겹친 지점의 실제 입력 대상과 새로고침 뒤 결과를 같은 과업에서 확인한다. `note-order.test.ts`의 고정 예시는 생성된 메모의 상대 순서, 탐색 순서와 원문 revision 불변 조건으로 교체한다. 기존 IndexedDB 검사에는 `saveAll` transaction이 중단될 때 이전 값이 전부 유지되는 한 사례를 추가하되 저장소 구현과 schema는 변경하지 않는다. 생명 주기 모델의 순서 명령은 삭제 복원 시나리오도 지키므로 이 절에서 제거하지 않고 다음 삭제 복원 절차에서 같은 사용자 결과 검사로 대체한 뒤 제거한다. `e2e/notes.spec.ts`에 전용 파일과 같은 검사를 중복 추가하지 않는다.

코드 변경 전 범위: 추가는 `note-order.test.ts`의 생성 입력 기반 불변 조건과 IndexedDB 중단 관찰, `notes-order-model.spec.ts`의 실제 겹침 입력 관찰이다. 수정은 전용 탐색의 기대 모델과 실패 기록을 사용자에게 보이는 순서에 맞추는 부분이다. 제거는 고정 명령 배열과 특정 축소 결과를 정답으로 단언하는 부분이다. 운영용 컴포넌트, Provider, 저장소, 새 fixture 및 공통 reporter는 추가하거나 수정하지 않는다.

겹침 순서 변경을 순수 전이로 두고 UI 및 저장소를 각각 어댑터로 관찰하는 기존 역할 분담을 유지한다. [IndexedDB transaction](https://w3c.github.io/IndexedDB/#transaction-concept)은 완료 전 쓰기 결과를 확정할 수 없고 중단 시 전체 쓰기가 취소된다고 정한다. [CSSOM View의 `elementFromPoint`](https://drafts.csswg.org/cssom-view/#dom-document-elementfrompoint)는 겹친 화면 지점의 실제 최상단 입력 대상을 확인하는 데 사용한다. 이 관찰은 CSS 숫자 비교를 대체하지 않고 화면 결과를 보완한다.

1. 생성: 세 메모에서 앞/뒤 이동, 반복 이동, 삭제 복원으로 생긴 동률과 다시 열기를 조합한다. 정렬 알고리즘을 모델에 복제하지 않고 기대 ID 순서만 보관한다.
2. 탐지: 대상이 맨 앞 또는 뒤인지, 나머지 ID 순서, 명시적 이동 후 1..N, Tab 순서와 content revision 보존을 검사한다. `saveAll` 중 abort는 새 연결에서 일부만 저장되지 않았는지 확인한다.
3. 축소: 동률 및 부분 저장 위반에 필요한 메모 수와 이동만 남긴다. 특정 seed가 정확히 두 명령을 생성해야 한다고 요구하지 않는다.
4. 기록: 이동한 ID, 전후 상대 순서와 저장된 ID별 zIndex를 남긴다. CSS class 존재를 겹침 결과로 사용하지 않는다.
5. 재현: 새로고침 후 겹친 위치에서 실제 입력을 받는 메모와 저장 순서를 확인한다. 스타일 숫자만으로 사용자에게 보이는 순서를 대신하지 않는다.

조사 질문은 [IndexedDB의 원자적 commit](https://w3c.github.io/IndexedDB/#transaction-concept)과 동률 표시다. 동률을 무조건 없애는 읽기 보정이나 새 schema를 추가하지 않는다.

- [x] 겹침 순서의 다섯 절차 완료. 생성된 메모의 앞뒤 이동 불변 조건, 실제 카드 메뉴와 IndexedDB 재조회, 두 메모의 겹친 본문을 누른 뒤 입력 포커스, 저장 중단 후 전체 이전 값 유지를 확인했다. 이동 차단과 부분 저장 결함은 동일 관찰식에서 축소된 행동으로 재현했다. 대상 E2E 세 건, 단위 검사 다섯 건, IndexedDB Browser Mode 아홉 건, 타입 검사, lint 및 빌드가 통과했다. 전체 E2E 통과나 CI 재현으로 확대 해석하지 않는다.

### 삭제와 취소 및 만료

목적은 연속 삭제와 취소가 같은 메모를 복원하고, 원래 만료 시각과 삭제 전 zIndex를 유지하는지 확인하는 것이다.

먼저 `note-removal-history.ts`, `NoteSessionProvider`, `NotesCollection`의 삭제 및 복원과 repository를 읽는다. `notes-removal-model.spec.ts`는 이미 실제 카드의 삭제 메뉴, 알림의 취소 버튼, 새 연결의 저장값 및 Playwright Clock을 사용하므로 유지하고 고정 축소 행동 단언을 교체한다. `note-removal-history.test.ts`의 고정 시각 및 두 메모 예시는 생성된 삭제 순서와 만료 직전 및 직후의 불변 조건으로 보완한다. 생명 주기 모델의 중복 순서, 삭제와 복원 상태 및 통제 결함은 이 두 검사와 앞선 겹침 순서, 위치 검사로 대체한 뒤 파일 전체를 제거한다. `test:model` 명령에서는 제거한 파일만 빼고 남은 본문 및 복사 모델을 계속 실행한다. `e2e/notes.spec.ts`에는 같은 삭제 과업을 다시 쓰지 않는다.

코드 변경 전 범위: `note-removal-history.test.ts`에 생성된 여러 메모의 최근 삭제 우선 복원, 원문 및 위치 보존과 삭제 완료 시각부터 계산한 기한을 추가한다. `notes-removal-model.spec.ts`에서는 특정 최소 행동 문자열과 별도 수동 복제 순서를 제거하고 실제 축소된 명령을 정상 화면 및 통제 결함 화면에 직접 재실행한다. `note-lifecycle.model.test.ts`를 제거하며 `package.json`의 `test:model` 지정만 수정한다. 운영용 세션, 토스트, 메모 카드, 저장소, UI 컴포넌트, 새 fixture와 별도 시계 구현은 추가하거나 수정하지 않는다. 삭제 스냅샷을 최근 항목부터 복원하는 스택 전이와 실제 화면 및 저장소를 관찰하는 어댑터를 분리한다. [Playwright Clock](https://playwright.dev/docs/clock)은 앱의 타이머보다 먼저 설치하고, 로딩 뒤 기준 시각에 멈춘 상태에서 기한 전후를 실행한다. 테스트의 임의 시계값을 운영 조건으로 가정하지 않는다.

1. 생성: 서로 다른 메모 삭제, 취소, 순서 변경, 5초 직전 및 이후, 화면 왕복과 새로고침을 조합한다. 삭제 완료 시각부터 경과한 시간으로 취소 기한을 계산한다.
2. 탐지: 삭제 직후 부재, 취소 후 같은 ID 및 원문과 geometry, 포커스, 만료 후 취소 불가를 확인한다. 삭제 전 zIndex는 동률이어도 보존하며 복원 때문에 다른 메모를 재배정하지 않는다.
3. 축소: 잘못된 복원 대상이나 만료 연장에 필요한 삭제 및 왕복만 남긴다. 삭제 전에 존재하던 메모와 복원 스냅샷을 구별한다.
4. 기록: 삭제 대상, 완료 시각, 취소 시각, 삭제 전 값과 복원 후 조회값을 남긴다.
5. 재현: 실제 삭제와 취소 버튼으로 같은 순서를 실행한다. 연속 삭제의 LIFO, 화면 왕복의 원래 기한 유지와 새로고침 후 이력 부재도 확인한다.

조사 근거는 [Clock](https://playwright.dev/docs/clock)과 [복원 결정](decisions/note-removal-recovery.md)이다. `A=1,B=2,C=3`에서 B 삭제, A 앞으로, B 복원은 `C=1,A=2,B=2`를 유지한다. 세션 이력을 별도 컴포넌트 state에 복제하지 않는다.

- [x] 삭제, 취소와 만료의 다섯 절차 완료. 최근 삭제 우선 복원과 원래 원문 및 위치, 삭제 완료 시각의 기한을 생성된 입력으로 검사했다. 실제 카드의 삭제와 토스트 취소, 다른 화면 왕복, 새로고침 및 저장값 탐색에서 겹침 복원 결함을 축소하고 다시 실행했다. 같은 역할의 생명 주기 모델 파일을 제거하고 남은 모델 명령을 두 파일에 맞췄다. E2E 대상 세 건, 단위 검사 190건, 모델 명령 여덟 건, 타입 검사와 lint가 통과했다. 전체 E2E와 CI는 이 절차에서 실행하지 않았다.

### 선택과 포커스 및 속성 대상

목적은 선택한 메모, 실제 포커스와 속성 패널 대상이 서로 달라도 각자의 동작과 입력을 유지하는지 확인하는 것이다.

먼저 `note-workspace-state.ts`, `NoteSessionProvider`, `NotesCollection`, `note-card.tsx`와 속성 폼을 읽는다. `notes-selection-model.spec.ts`는 실제 Tab, 카드 버튼, 속성 폼과 접근 가능한 선택 설명을 이미 조작하므로 유지한다. 빈 캔버스 입력 뒤 다른 메모의 `dblclick`을 합성하는 결함은 제거하고 캔버스의 실제 pointer 종료 전달을 격리 조건에서 막아 선택 해제 누락을 관찰한다. `note-workspace-state.test.ts`에 생성된 두 메모 ID와 revision으로 속성 대상, 선택 및 해제의 독립 전이를 추가한다. `e2e/notes.spec.ts`에는 같은 키보드와 패널 과업을 중복 추가하지 않는다.

코드 변경 전 점검: 추가는 기존 상태 검사 파일의 생성 입력과 전용 브라우저 검사의 실제 빈 캔버스 입력 차단 조건이다. 수정은 통제 결함의 명칭 및 설치 지점, 특정 축소 행동 문자열을 정답으로 삼는 단언과 직접 재현 명령이다. 제거는 합성 `dblclick`과 그 DOM 대상 추적, 이미 축소된 명령을 수동으로 다시 작성한 배열이다. 운영 세션, 보드, 메모 카드, 속성 폼, 추가 선택 state 및 새로운 test helper는 수정하거나 추가하지 않는다.

선택, 포커스와 속성 대상을 서로 독립된 값으로 유지하는 상태 전이를 단일 출처로 두고 브라우저 입력과 화면을 어댑터로 관찰한다. [HTML 포커스](https://html.spec.whatwg.org/multipage/interaction.html#focus)와 [WAI 키보드 지침](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)에 따라 실제 포커스와 선택 설명을 별개로 검사하며 색이나 점선만으로 선택을 추정하지 않는다. 네이티브 팝오버를 닫은 직후에는 브라우저별 복귀 위치를 이 절의 요구사항으로 가정하지 않는다. 다음 헤더 동작을 시작할 때 버튼에 명시적으로 포커스를 두고 실제 활성 요소를 다시 확인한다.

1. 생성: Tab, 단일 헤더 클릭, 더블클릭, 선택 지점 Enter, 편집기 Enter, Escape, Command와 빈 캔버스 클릭을 두 메모에 조합한다. 패널 A에 잘못된 너비를 입력한 뒤 B 선택을 포함한다.
2. 탐지: 선택만 한 경우 패널이 열리지 않고, 지정 동작에서 패널과 첫 입력 포커스가 바뀌는지 확인한다. 선택 해제 후 A 제목과 미완성 입력은 유지돼야 한다. React state key 대신 패널 입력과 `toBeFocused`를 사용한다.
3. 축소: 선택 대상과 패널 대상이 다른 상태를 유지하며 무관한 입력을 제거한다. 실패를 만들려고 다른 메모의 dblclick을 사후 전달하지 않는다.
4. 기록: 실제 행동, 포커스된 접근 가능한 요소, 패널의 원문과 입력값을 남긴다. 선택 테두리의 시각 증거가 필요하면 기존 브라우저 시각 확인으로 보완한다.
5. 재현: 실제 키와 pointer로 최소 순서를 실행한다. 입력기 조합과 OS 단축키는 자동화된 일반 키 입력과 구분하고 확인하지 않은 조건을 완료로 표시하지 않는다.

조사 질문은 [Playwright 키보드 입력](https://playwright.dev/docs/api/class-keyboard)과 [HTML 포커스](https://html.spec.whatwg.org/multipage/interaction.html#focus)의 차이다. 새 선택 ref나 패널 state를 만들지 않고 기존 세션 전이와 폼 연결에서 고친다.

- [x] 생성: 두 메모의 Tab, 헤더, 편집기, 속성 패널과 선택 해제 입력을 정상 후보 10개 및 필수 순서로 실행했다.
- [x] 탐지: 빈 캔버스의 pointer 종료 전달만 막으면 선택 설명이 남고, 포커스와 속성 패널의 기존 대상 및 초안은 유지되는 차이를 찾았다.
- [x] 축소: 결함 조건에서 불필요한 기준 관찰 네 번을 없애고 실제 실패 명령을 남겼다. 특정 명령 문자열 전체를 정답으로 고정하지 않았다.
- [x] 기록: 실행한 명령 수, seed, path, 초기 자료와 화면에서 읽은 선택, 포커스, 패널 제목 및 입력값을 남겼다.
- [x] 재현: 축소된 명령을 seed와 path 및 직접 실행으로 다시 확인했다. 결함 조건에서만 실패하고 정상 화면에서는 통과했다.

2026년 9월 24일 현재 대상 E2E 세 건, 전체 단위 검사 191건, 타입 검사와 lint가 통과했다. Chromium, Firefox 및 WebKit에서 헤더 버튼의 팝오버 열림과 닫힘은 같았지만, 닫힌 직후의 자동 포커스 복귀는 일치하지 않았다. 버튼의 다음 키보드 행동 전에 명시적으로 포커스를 맞추고 선택 상태, 실제 포커스와 속성 패널의 값은 각각 검사했다. 운영 코드와 자료 형식은 변경하지 않았다. 전체 E2E와 CI는 이 절차에서 실행하지 않았다.

카드 선택은 접근성 설명 `선택됨`으로 전달하고, 포커스만 있는 카드는 선택으로 전달하지 않는다. `notes.spec.ts`의 키보드 및 패널 과업과 접근성 설명 검사로 현재 사용자 동작을 별도로 확인한다. 기존 `notes-selection-model.spec.ts`는 CSS `::after`의 선을 선택으로 읽으므로 접근성 설명 검사로 대체하지 않고 이 절의 재작성 대상으로 남긴다.

수정 전 기존 모델 검사는 Chromium, Firefox 및 WebKit의 전체 실행에서 실패했다. Chromium에서 60초와 180초 제한을 각각 적용해도 네 번째 후보 뒤에 실행 시간이 소진됐다. 추가 진단에서는 편집기에만 포커스를 둔 카드의 CSS 가상 요소 테두리를 기존 `selectedVisible`이 선택으로 오인함을 확인했다. 중간 수정에서는 `notes-selection-model.spec.ts`의 가상 요소 스타일 검사를 Playwright의 접근 가능한 설명 조회로 바꿨다. 메모 ID는 접근 가능한 설명이 붙은 카드가 어느 메모인지 식별하는 데에만 사용한다.

관찰식을 바로잡은 뒤 네 후보만 실행하고 중단된 직접 원인은 생성 비용이 아니었다. Playwright trace에서 다음 후보의 고정 좌표 더블클릭을 새 메모 버튼이 가로막아 계속 재시도한 사실을 확인했다. 헤더 선택과 열기는 메모의 실제 `메모 이동` 버튼을 대상으로 실행하고, 진단용 출력 및 늘린 시간 제한을 제거한다. 운영 코드, 생성 횟수와 기대 모델은 바꾸지 않으며, 이후 이 파일의 전체 교체를 완료한 것으로 계산하지 않는다. 수정 후 같은 세 브라우저에서 일반 탐색과 통제 결함 탐지를 다시 실행한다.

중간 수정 뒤 Chromium, Firefox 및 WebKit에서 일반 탐색 10회와 기존 통제 결함 탐지가 모두 통과했다. 기존 테스트의 잘못된 선택 관찰과 차단된 좌표 입력은 제거됐지만, 이 결과를 U12의 새 다섯 절차 또는 다른 기능의 완료 증거로 승계하지 않는다.

전체 E2E 재실행에서도 175개가 통과했다. 이 결과는 중간 수정으로 인한 회귀가 없다는 증거일 뿐 선택 기능의 새 행동 생성, 축소와 재현 절차는 여전히 미완료다.

### 캔버스 이동과 확대 및 축소

목적은 시점 조작이 메모 저장 위치를 바꾸지 않고, pointer 종료가 중복돼도 마지막 유효 시점이 유지되는지 확인하는 것이다.

먼저 `notes-board.tsx`, `use-notes-board-view.ts`의 시점, 크기 관찰과 pointer 처리를 읽고 `board-view.test.ts`의 기존 확대 기준점 및 메모 표시 검사를 확인한다. `e2e/notes.spec.ts`에 생성된 시점 조작 순서를 추가한다. 캔버스만을 위한 새 fixture나 별도 앱은 만들지 않는다.

코드 변경 전 점검: `notes.spec.ts`에 화면 제어, 빈 공간 drag, pointer 해제 뒤 hover, 확대와 맞춤 보기를 실제 UI에서 실행할 탐색만 추가한다. 테스트의 기대 위치와 크기는 각 입력 직전 화면 사각형과 이미 읽어 둔 저장 geometry에서 계산한다. 결함 격리에는 빈 공간의 `pointerup`과 뒤따르는 `lostpointercapture` 전달을 함께 막아 버튼을 놓은 뒤 hover에서 시점이 다시 움직이는지 관찰한다. fast-check가 반환한 축소 행동을 직접 재실행하고 같은 행동을 정상 화면에서도 실행한다.

기존 `notes.spec.ts`의 메모 이동, 크기 조절, capture 상실, 보조 키 휠 검사는 서로 다른 과업을 확인하므로 제거하지 않는다. `board-view.test.ts`의 기준점 불변 검사를 반복하지 않는다. 운영 보드, hook, 보기 제어, 저장소 및 새로운 시점 state는 변경하지 않는다. 이 절차에서 중복 구현이 확인될 때에만 그 부분의 교체를 별도로 기록한다. [Pointer Events](https://www.w3.org/TR/pointerevents3/)에 따라 `pointerup`과 `pointercancel` 뒤 capture가 해제된다는 점을 이용하고, 브라우저가 생성하지 않는 두 번째 `pointerup`을 정상 사용자 입력인 것처럼 합성하지 않는다.

1. 생성: 빈 공간 이동, 확대, 축소, 전체 맞춤, pointer 완료 및 취소와 화면 너비 전환을 조합한다. 메모에서 시작한 drag는 캔버스 이동으로 처리하지 않는 사례를 포함한다.
2. 탐지: 화면에서 메모 사각형과 배율의 변화, 저장 geometry 불변과 조작 종료 후 시점 유지를 확인한다. 중복 종료가 시작 위치로 되돌리거나 저장 좌표를 바꾸면 실패다.
3. 축소: 배율과 이동 방향 및 종료 순서를 보존하며 불필요한 보기 제어를 제거한다. 기대 시점을 운영 viewport 상태에서 복사하지 않는다.
4. 기록: 제어 입력, 배율, 조작 전후 화면 사각형과 저장 geometry를 남긴다.
5. 재현: 같은 pointer 순서와 보기 제어를 실행하고 다음 입력까지 시점이 유지되는지 확인한다. OS가 event를 누락하는 경우는 실제 OS 검사 없이는 완료로 세지 않는다.

조사 질문은 [Pointer Events](https://www.w3.org/TR/pointerevents3/)의 정상 capture 해제와 취소 차이다. 기존 진행 상태를 수정하며 별도 종료 플래그와 좌표 ref를 계속 추가하지 않는다.

- [x] 생성: 보기 버튼의 왼쪽 이동, 모두 보기와 축소를 섞고 보조 키 휠 확대, 빈 공간 이동, 일반 해제 또는 capture 상실, 뒤따르는 hover 및 화면 너비 변경을 생성한 원문과 이동량으로 실행했다. 실제 OS의 `pointercancel`은 생성했다고 주장하지 않는다.
- [x] 탐지: 실제 화면에서 조작 전후 메모의 사각형, 보기 제어의 위치 및 IndexedDB geometry를 확인했다. `pointerup`과 `lostpointercapture`를 함께 막은 조건에서 해제 뒤 hover만으로 시점이 다시 움직이는 차이를 찾았다.
- [x] 축소: 실패 순서의 불필요한 보기 이동을 없애고 휠 확대, 이동, 해제 및 hover와 필요한 입력량을 남겼다.
- [x] 기록: 최초 및 축소 입력의 휠과 이동량 및 화면 너비, 메모 원문, 화면의 기대 및 관찰 좌표, seed, path, 브라우저와 축소 횟수를 JSON으로 남겼다.
- [x] 재현: seed와 path 및 축소 입력 직접 실행에서 종료 신호가 모두 막힌 경우에만 실패했다. 정상 화면에서는 저장 위치가 그대로이고 해제 뒤 hover로 시점이 움직이지 않았다.

2026년 9월 24일 캔버스 동작 E2E 12건, 단위 검사 191건, 타입 검사와 lint가 통과했다. 이후 같은 캔버스 검사에 capture 상실과 화면 너비 변경을 추가한 대상 E2E 세 건도 통과했다. 운영 보드, 계산 함수, 보기 제어와 저장소는 바꾸지 않았다. 실제 터치패드 및 OS 입력 누락과 전체 E2E 및 CI는 이번 절차에서 확인하지 않았다.

최종 검증에서 WebKit의 capture 상실 뒤 버튼을 놓은 다음 움직임이 시점을 다시 이동시키는 사례가 나왔다. 앞선 대상 검사 통과만으로 이 입력 순서의 완료를 유지하지 않는다. 변경 대상으로 `use-notes-board-view.ts`의 제스처 종료와 `notes.spec.ts`의 통제 결함 입력을 정했다.

기존 viewport 종료 처리와 동일한 pointer ID에 대해 document가 받은 `pointerup`과 `pointercancel`에서도 제스처를 정리한다. 새 제스처 상태, 브라우저 분기, 테스트 fixture, 저장 자료 변경은 추가하지 않으며 기존 종료 처리는 제거하지 않는다. 수정 뒤 Chromium에서는 종료 신호를 viewport에서만 막아도 document 수신기가 제스처를 정리해 통제 결함이 탐지되지 않았다. capture 해제 뒤 대상이 달라져도 같은 결함을 만들도록 `notes.spec.ts`의 차단 지점을 document의 capture 단계로 옮긴다. 정상 입력과 화면 위치 및 저장 좌표 관찰식은 바꾸지 않는다.

보완 뒤 WebKit의 정상 및 통제 결함 탐색 한 번은 통과했다. 다만 그때의 통제 결함 차단은 viewport 기준이었다. 이후 차단 지점을 document로 옮긴 다음 Chromium의 정상 후보 다섯 개는 진행됐고, 별도 단일 후보에서 종료 신호 누락에 따른 화면 이동을 확인했다. 전체 축소와 재실행은 180초 제한에 걸렸고 Firefox는 브라우저 시작 단계에서 시간 초과가 발생했다.

현재 판정은 `needs revision`이다. 수정된 차단 조건으로 세 브라우저의 정상 후보, 통제 결함의 축소 및 재실행을 각각 완료해야 한다. 제한 시간을 늘리거나 후보 수를 줄여서 통과 처리하기 전에 실행 환경의 지연을 확인한다.

### 개별 복사

목적은 선택한 메모의 원문 전체를 복사하고, 실패와 취소를 성공 횟수로 기록하거나 상세 이동으로 이어가지 않는지 확인하는 것이다.

먼저 `copy-note.ts`, `browser-clipboard-writer.ts`, `mobile-note-card.tsx`, `use-mobile-note-long-press.ts`와 사용 기록 repository를 읽는다. `copy-note.model.test.ts`의 명령 및 메모리 배열 관찰은 제거하고 `copy-note.test.ts`, `clipboard-permissions.spec.ts`, `touch-interactions.spec.ts`에서 각 실행 계층의 결과를 확인한다.

코드 변경 전 점검: `copy-note.test.ts`의 고정 메모 한 건을 생성한 ID, 원문과 revision으로 바꾸고 Clipboard 쓰기 성공, 세 실패 이유 및 사용 기록 실패의 반환값과 외부 작성자 호출을 확인한다. `clipboard-permissions.spec.ts`에는 생성한 원문을 실제 Clipboard에서 읽는 정상 복사와 브라우저가 권한을 거절한 뒤 허용했을 때의 재시도를 추가한다. 격리된 잘못된 Clipboard 쓰기는 실제 브라우저 Clipboard API에 다른 원문을 넘기되 성공을 보고하게 해서 화면의 성공 알림만으로 원문 복사를 통과시키지 않는다. 그 실패 입력은 fast-check로 줄여 같은 입력을 결함 조건과 정상 조건에서 다시 실행한다. `touch-interactions.spec.ts`에서는 기존 CDP touch 입력과 Clock을 재사용해 길게 누르기 직전 및 직후, 이동 기준 안팎과 취소 뒤 복사 부재 및 주소 유지를 확인한다.

기존 `copy-note.model.test.ts`는 실제 Clipboard와 저장된 사용 횟수를 읽지 않고 별도 배열만 비교하므로 대체 검사 확보 뒤 삭제하며 `package.json`의 `test:model` 명령에서 복사 모델 파일을 뺀다. 운영 `copyNote`, 메모 카드, 터치 hook, 사용 기록 repository 및 외부 의존성은 수정하지 않는다. ClipboardWriter와 사용 기록 작성자를 주입하는 현재 포트와 구현 분리를 유지하고, [Clipboard API](https://w3c.github.io/clipboard-apis/)의 쓰기 권한 및 활성 문서 조건과 [DevTools touch 입력](https://chromedevtools.github.io/devtools-protocol/tot/Input/)을 구별한다. 테스트용 쓰기 성공은 실제 Clipboard 읽기 성공으로 주장하지 않는다.

1. 생성: 서로 다른 원문 복사, 반복 복사, 권한 거부 및 재시도, 모바일 500ms 전후와 10 CSS px 안팎 이동 및 취소를 조합한다. 일괄 복사 추가는 실행하지 않는다.
2. 탐지: 실제 Clipboard를 읽을 수 있는 환경에서는 복사 원문을 확인하고 성공 후 횟수를 조회한다. 실패 시 횟수 불변과 알림, 취소 시 상세 이동 및 복사 부재를 확인한다. 대역의 쓰기 성공은 실제 권한 성공과 구분한다.
3. 축소: 잘못된 원문이나 이중 동작을 만드는 원문 변경, gesture와 재시도만 남긴다. 장치 입력을 문자열 command로만 재생하지 않는다.
4. 기록: 원문, 쓰기 성공 여부, 권한 조건, gesture 시간 및 이동량, 주소와 횟수를 남긴다. Clipboard 읽기가 거부되면 미관찰을 성공으로 바꾸지 않는다.
5. 재현: 실제 Command 클릭 또는 실패한 터치 입력을 반복하고 붙여넣을 값과 이동 여부를 확인한다. 도구로 실행할 수 없는 네이티브 터치 동작은 별도 확인 대상으로 남긴다.

조사 근거는 [Clipboard 권한과 사용자 활성화](https://w3c.github.io/clipboard-apis/) 및 [Playwright 입력 지원](https://playwright.dev/docs/input)이다. 테스트를 통과시키려고 운영 권한 처리를 우회하거나 touch 상태를 두 군데서 관리하지 않는다.

- [x] 생성: 원문, ID와 content revision을 생성해 복사 성공 및 세 Clipboard 실패 이유와 사용 기록 실패를 검사했다. Chromium에서 실제 Clipboard 복사, 권한 거절 후 재시도 및 모바일 touch의 500ms와 10 CSS px 앞뒤 입력을 실행했다.
- [x] 탐지: 실제 Clipboard 읽기와 사용 빈도 화면의 개별 횟수를 확인했다. 쓰기 API에 다른 원문을 넘긴 격리 조건에서는 성공 알림이 보여도 복사 원문 불일치를 찾았다. 이동 또는 취소된 touch는 횟수를 늘리지 않았다.
- [x] 축소: 잘못 쓰인 원문을 하나의 공백 문자로 줄이고, 같은 입력의 정상 복사에서는 원문 전체가 유지됨을 확인했다.
- [x] 기록: 최초 및 축소 원문, 실제 Clipboard 읽기값, seed, path와 브라우저를 JSON으로 남겼다. 권한 및 touch 과업은 화면 결과와 사용 횟수로 기록했다.
- [x] 재현: seed와 path 및 축소된 원문 직접 실행에서 쓰기 변조 조건만 실패했다. 권한 재허용 뒤 같은 메모의 다시 시도 버튼으로 복사가 성공하고 개별 횟수가 증가했다.

2026년 9월 24일 Clipboard 및 touch E2E 13건, 전체 단위 검사 188건, 남은 모델 검사 네 건, 타입 검사와 lint가 통과했다. 메모리 배열만 비교하던 복사 모델 파일을 제거하고 중복 책임은 생성 입력의 서비스 검사와 실제 화면 검사로 옮겼다. Firefox와 WebKit의 실제 Clipboard 권한 및 네이티브 기기 touch는 이번 절차에서 확인하지 않았으며 전체 E2E와 CI도 실행하지 않았다.

### 사용 기록과 집계 화면

목적은 복사 당시 원문 revision별 성공 횟수가 저장되고, 화면 합계가 그 기록과 일치하는지 확인하는 것이다.

착수 전 코드 변경 대상: `text-usage-record.test.ts`와 `usage-projection.test.ts`의 고정 자료 및 고정 합계 검사를 생성 자료로 교체한다. 기존 IndexedDB 통합 검사에는 같은 메모의 원문 변경 전후 개별 복사와 새 연결 재조회를 더하고, 실제 Clipboard 권한을 설정하는 `e2e/clipboard-permissions.spec.ts`에는 메모 복사, 수정, 사용 빈도 화면 왕복과 저장 실패를 관찰하는 과업을 더한다. 새 운영 컴포넌트, 저장 상태, fixture, script 또는 의존성은 추가하지 않는다. 같은 집계값을 검사하는 기존 예제는 대체 검사가 준비된 경우에만 제거한다. 운영 결함이 확인되지 않으면 `copy-note.ts`, 저장소, projection과 table은 수정하지 않는다.

적용 방식은 복사 명령이 사용 기록 포트를 호출하고 IndexedDB adapter가 복사 시점의 메모 ID, 원문 revision 및 원문으로 한 건을 누적하는 현재 책임 분리를 유지하는 것이다. 화면은 저장된 횟수에서 합계를 계산하는 순수 projection을 사용한다. 따라서 테스트의 예상 합계는 생성한 개별 횟수와 일괄 횟수에서 독립적으로 계산하고 운영 projection을 기대값 생성에 호출하지 않는다. IndexedDB 표준에서 쓰기 요청의 성공과 transaction commit은 다르므로 새 연결의 재조회로 저장 완료를 판정한다. fast-check의 축소는 잘못된 원문 revision에 누적되는 편집과 복사의 최소 순서를 찾는 데 사용한다. Playwright는 실제 UI와 접근성 이름을 관찰한다.

먼저 `copy-note.ts`, `indexed-db-usage-repository.ts`, `read-usage.ts`, `usage-projection.ts`와 `usage-table.tsx`를 읽는다. 삭제할 복사 모델의 메모리 집계는 복원하지 않는다. `text-usage-record.test.ts`, `usage-projection.test.ts`, 기존 IndexedDB 검사와 `e2e/clipboard-permissions.spec.ts`에 사용 기록 검사를 작성한다.

1. 생성: 복사, 본문 변경, 다시 복사, 쓰기 실패, 기록 실패와 사용 화면 재진입을 조합한다. 기존 일괄 복사 횟수는 최소 초기 자료로만 준비하고 보류된 일괄 복사 행동을 생성하지 않는다.
2. 탐지: revision별 원문과 개별 횟수, 보존한 일괄 횟수 및 합계를 확인한다. Clipboard 성공 뒤 기록만 실패하면 두 결과를 구분하고 저장하지 못한 횟수가 성공 기록으로 남지 않는지 확인한다.
3. 축소: 잘못된 revision에 가산되는 최소 편집과 복사 순서를 남긴다. 합계 함수를 기대값 계산에 다시 호출하지 않는다.
4. 기록: 복사 당시 원문 revision, 각 쓰기의 결과, 저장 횟수와 화면 행의 값을 남긴다.
5. 재현: 최소 순서를 실행한 뒤 새 저장소 연결과 사용 화면에서 같은 값을 확인한다. 복사 기능의 통과만으로 집계 화면을 완료 처리하지 않는다.

조사 질문은 저장 실패 이후 표시와 재조회, [IndexedDB commit](https://w3c.github.io/IndexedDB/#transaction-concept)의 관계다. 계산 가능한 합계는 기존 projection에서 계산하고 별도 state 및 동기화 Effect를 추가하지 않는다.

- [x] 생성: 원문 변경 전후의 개별 복사 횟수, 기존 일괄 복사 횟수와 원문 revision을 생성했다. 실제 화면에서는 복사, 일괄 항목 추가, 본문 수정, 복사, 기록 실패와 사용 빈도 화면 재진입을 실행했다.
- [x] 탐지: 새 IndexedDB 연결에서 두 원문 기록을 분리해 확인하고, 나중 복사를 이전 revision에 쓰는 격리 조건에서 같은 비교가 실패했다. 화면에서는 Clipboard 쓰기 성공과 기록 실패 안내를 구분했고 실패한 횟수는 행에 더해지지 않았다.
- [x] 축소: 격리 조건에서 이전 원문 복사, 일괄 항목 추가, 한 번의 편집과 새 원문 복사만 남기고 각 개별 복사를 한 번으로, 원문을 공백으로 줄였다. 필요한 편집과 복사 순서를 고정한 상태에서 반복 횟수 및 입력을 축소했으며 임의의 전체 행동 순서에 대한 최소성 증명은 아니다.
- [x] 기록: 최초 및 축소된 입력, 원문 revision과 저장 횟수의 예상값 및 관찰값, 브라우저별 seed와 path를 Browser Mode의 표준 출력에 남겼다. 실제 화면의 두 행, 합계와 저장 실패 안내는 E2E로 기록했다.
- [x] 재현: seed 및 path와 축소 입력 직접 실행에서 잘못된 revision 전달 조건만 실패했다. 새 저장소 연결 및 사용 빈도 화면 재진입에서는 정상 기록이 유지됐다.

2026년 9월 24일 단위 검사 188건, IndexedDB Browser Mode 27건, Clipboard E2E 10건, 타입 검사, lint와 운영 빌드가 통과했다. 전체 E2E와 실제 기기 Clipboard 입력은 이 절차 뒤 아직 확인하지 않았다. 운영 사용 기록 저장소, 집계 함수, UI 및 저장 자료 형식은 바꾸지 않았다. 모델 검사의 축소 횟수가 항상 양수라는 우연적 전제는 최초 실패가 이미 최소일 수 있어, 축소된 행동 수가 최초 실패보다 늘지 않는 조건으로 고쳤다. 자동 저장을 기다리지 않고 화면을 새로 열면 수정 전 원문이 나타나므로, 화면 과업은 저장된 원문을 새 연결로 확인한 뒤 다시 연다.

### 실행 순서, 연구 갱신과 완료 기록

착수 순서는 삭제 대상 확인, 요구사항에서 시나리오와 기대값 도출, 운영 구조 및 기존 예제 파악, 관찰 방법 확정, 선택한 기능의 다섯 절차, 상태 및 실행 기록 갱신이다. 기능의 기본 순서는 위 12개 소제목 순서다. 초안 문제처럼 다른 저장 및 화면 동작에 영향을 주는 결함이 확인되면 영향을 받는 기능의 완료를 보류하고 그 결함을 먼저 해결한다.

기능 착수 때마다 명시한 조사 질문을 최신 공식 문서와 설치 버전에 대조한다. 확인한 사실, 아직 확인할 수 없는 동작과 적용할 코드 작성 방법을 해당 기능 절에 갱신한다. 실제 서비스 오류 원인과 연결되지 않은 일반 안티패턴 목록을 늘리거나 과거 테스트의 통과를 근거로 조사 결론을 정하지 않는다.

각 절차가 끝날 때 이 절의 해당 기능에 행동 생성, 오류 탐지, 순서 축소, 로그 기록과 재현 상태를 각각 추가한다. 상태는 미착수, 진행 중, 증거 확보 또는 보류로 표시하고, 완료한 절차의 실행 및 관찰 근거를 [단일 실행 기록](model-based-testing-execution.md)에 이어 적는다. 한 체크박스만 바꿔 다섯 절차를 동시에 완료로 만들지 않는다.

기존 단일 기록의 과거 결과는 재작성 후 현재 증거와 분리한다. 연구에서 확인한 요구사항과 승인된 결정은 유지하되, 삭제한 모듈의 존재와 완료를 전제하는 개발 지침 및 링크는 코드 정리 단계에서 함께 고친다. 이 계획 변경 자체는 새 실행 증거가 아니다.

검사는 기존 `pnpm notes:test`, `pnpm notes:typecheck`, `pnpm notes:lint`, `pnpm --filter notes-app test:browser`, `pnpm notes:test:e2e` 중 해당 변경을 판정하는 명령을 선택한다. 먼저 대상 검사를 실행하고 공유 저장 코드나 화면 연결이 바뀐 경우 관련 전체 검사를 한 번 수행한다. 실패 수정 후에는 해당 실패를 재확인한다.

재작성된 각 기능은 기존 예제와 함께 통과해야 한다. 코드 추가 전에 정한 삭제 및 대체 범위를 diff에서 확인하고, 같은 책임의 기존 함수와 새로운 중복 상태가 남지 않았는지 최종 검토한다. 별도 fixture, 스크립트나 상태를 추가해야 한다면 기존 기능으로 해결되지 않는 구체적인 이유와 삭제할 중복을 먼저 이 계획에 반영한다.

검증된 기능 단위로 커밋하며 통제 결함을 운영 코드에 남기지 않는다. 문서 전용 변경과 실행 코드를 구분하고 커밋 메시지는 실제 변경 내용만 설명한다. Git 이력 재구성과 코드 삭제는 계획 작성만으로 승인된 것으로 취급하지 않는다.

이번 실행에서는 CI 재현을 확인하지 않는다. 로컬 기능 및 브라우저 결과만 완료 근거로 삼고 CI 조건을 충족했다고 표시하지 않는다. 일괄 복사 탐색, HTTP Adapter, XState, 공통 패키지와 범용 UI 탐색은 이번 작업에 추가하지 않는다.

- [x] 12개 메모 기능의 목적, 운영 연결, 삭제 및 재작성 위치와 다섯 절차를 재정의했다.
- [x] 삭제 및 재작성 실행 범위를 기능별로 확정하고 기존 서비스와 필요한 예제 검사를 보존했다.
- [ ] 12개 항목 각각에서 다섯 절차와 필요한 실제 저장 및 화면 증거를 확보한다. 현재 캔버스의 수정 뒤 재검증이 남았다.
- [ ] 실제 실행 옵션, 도구 버전, 실패 자료와 정상 비교를 단일 실행 기록에 남긴다. 캔버스의 수정 뒤 축소 및 재실행 관찰값이 남았다.
- 이번 실행 제외: 같은 실행 조건의 CI 재현 확인. 요구사항은 유지한다.

## TDD 적용 요약

TDD 여부는 파일 종류나 모듈 크기가 아니라 구현 전에 사용자 결과 또는 저장 불변 조건을 안정적으로 쓸 수 있는지로 정한다.

- U1은 TDD를 적용하지 않고 운영용 빌드, Next.js 서버와 Worker 기본 실행 검사를 사용한다.
- U2는 content revision, `tabIndex`와 `zIndex`의 독립성, 메모 및 일괄 복사 항목 선택, 두 선택의 동시 해제, 방향키 한 자리 재정렬과 경계, 속성 패널 대상의 독립 전이, 속성 초안 범위, 삭제 복원 스냅샷, 최근 활성 패널, 모바일 일괄 복사 단계 및 작업 사본과 외부 schema 규칙에만 TDD를 적용하고 조립 wiring에는 적용하지 않는다.
- U3은 TDD를 적용하지 않고 실제 브라우저 IndexedDB 통합 검사를 사용한다.
- U4는 TDD를 적용하지 않고 운영용 CSS, 네이티브 폼 동작, 라우트, 반응형 렌더링, 접근성 검사와 기록된 시각 검토를 사용한다.
- U5는 겹침 순서의 상대 순서 보존, `zIndex` 변경과 `tabIndex` 유지, 선택, 선택 해제와 속성 패널 대상의 독립 전이, 속성 초안의 범위 검증 및 중복 적용 방지, 최근 활성 패널, 삭제와 복원, pointer 종료의 한 번 확정, `800ms` 자동 저장 및 상세 저장 상태 전이와 content revision 불변 조건에만 TDD를 적용한다. 한 번 click, `dblclick`, `Enter`, `Escape`, 실제 `tabindex`와 Tab 이동, event 전파, 입력기 조합, 선택과 포커스 표현, 보드, 편집, pointer capture, drag 중 캔버스 크기, 패널 밖 click과 drag는 실제 브라우저에서 확인한다.
- U6은 개별 복사 및 pointer와 키보드의 일괄 복사 항목 추가 명령, 헤더 비노출과 다음 신뢰할 수 있는 입력의 복원 전이, 최근 활성 패널, 모바일 작업 초안의 반복 추가, 초기화, 명시적 취소, 예기치 않은 이탈 뒤 복원과 확인 단계 전환에 TDD를 적용한다. 실제 Clipboard, 운영체제가 가로채는 `Command` event, 실제 헤더 비노출, 창 상태 복구, route 이탈과 길게 누르기 이벤트에는 적용하지 않는다.
- U7은 일괄 복사 명령, 항목 선택, 방향키 한 자리 재정렬과 경계, 제거 이력과 모바일 확인 작업의 재정렬, 새 ID 복제 및 삭제에 TDD를 적용하고 실제 click 및 key event, 포커스 유지, live announcement, 길게 누르기, drag 이벤트, popover 위치와 시각 상태에는 적용하지 않는다.
- U8은 합계 및 행 projection에 TDD를 적용하고 화면 내부 구조에는 적용하지 않는다.
- U9는 순수 분석기와 오래된 응답 판정에 TDD를 적용하고 Worker asset과 실행 수명에는 적용하지 않는다. 사용자 취소는 U11의 실제 시간 측정에서 필요성이 확인되기 전까지 구현하지 않는다.
- U10은 제안기, segment 편집, 스키마와 결과 생성기에 TDD를 적용하고 폼 연결 및 텍스트 선택에는 적용하지 않는다.
- U11은 TDD를 적용하지 않고 end-to-end, 빌드, 접근성 및 시각 검토로 완료를 판정한다.
- U12는 기존 TDD 대상의 순수 규칙에 행동 순서 탐색을 추가한다. 실제 저장 및 브라우저 Adapter의 증거는 기존 브라우저 검사로 확인한다.
- U26은 새 자료 규칙이 없으므로 TDD를 적용하지 않는다. U27과 U28에서 새로 만드는 순수 시점 계산에만 TDD를 적용할 수 있으며, 포커스, 숨은 스크롤, 휠 입력과 실제 터치패드 동작은 브라우저에서 확인한다.

각 자동 검사는 사용자에게 보이는 결과, 저장 불변 조건, 외부 시스템과 주고받기로 정한 동작 또는 순수 알고리즘 결과 가운데 하나를 이름으로 설명해야 한다. 내부 함수명, reducer action 문자열, 호출 횟수, CSS class, DOM 중첩, 구성요소 분리, 무관한 드래그 좌표와 큰 markup snapshot만 확인하는 테스트는 만들지 않는다. 테스트를 위해서만 운영 코드의 추상화를 추가하지 않는다.

## 실행 선택과 재검토 조건

구현에 반드시 필요한 선택은 [구현 필수 결정 교차검증](references/required-implementation-decisions-research.md)의 공식 자료, 현재 저장 구조와 화면 근거를 비교해 다음과 같이 확정했다. 각 값은 해당 작업 단위의 입력이며, 적힌 재검토 조건이 확인되기 전에는 구현 중 임의로 바꾸지 않는다.

- U1에서 package manager, 저장소 workspace 선언, Tailwind CSS와 PostCSS 연결, 정확한 의존성 버전, lockfile, FSD ESLint 설정, 지원 브라우저와 HTTPS 및 localhost HTTP 제공 방식을 확정했다. 다음 작업은 이 설정을 기준으로 삼고, 변경이 필요하면 의존성 및 배포 검토를 다시 수행한다.
- 현재 구현은 브라우저 IndexedDB와 Pointer Events를 직접 사용한다. 이후 wrapper 또는 드래그 package가 필요하면 설치 전에 플랫폼 기능, 직접 의존성과 전이 의존성을 다시 비교한다.
- Tailwind CSS, 네이티브 폼 요소와 자체 `shared/ui` 조합은 유지한다. U13에서 Pretendard 크기 및 굵기, 역할 기반 중립색, `#EE5165` accent, 모서리, 깊이, motion, 화면 밀도와 상태 조합의 구체적인 값을 대표 화면에서 확정한다. 목재 결과 물체 이름 중심 토큰은 제거한다.
- 외부 접근성 부품 package는 현재 필수 구현에 필요하지 않으므로 추가하지 않는다. 폼과 무관한 복합 상호작용에서 네이티브 Web API의 한계가 실제로 확인된 경우에만 정확한 버전과 전체 의존성을 조사한다.
- 넓은 화면의 저장 목록 관리는 HTML `popover="auto"`, 이름 있는 `role="group"`과 일반 네이티브 버튼을 사용한다. 직접 이동, 복제 및 삭제 동작에는 ARIA menu 역할을 사용하지 않으며 실행, `Escape`와 light dismiss 뒤 포커스를 해당 실행 버튼으로 돌려준다. 모바일 확인 및 관리 화면은 화면 아래에서 열리는 액션 시트를 사용한다. 이동 명령은 방향별 아이콘 버튼으로만 보이되 접근 가능한 이름을 유지하고, 복제와 삭제는 보이는 이름을 유지한다. 상단 닫기 버튼, 바깥 누르기, 기기 뒤로가기와 `Escape`로 닫으며 동작 실행 뒤 자동으로 닫는다.
- 현재 로컬 애플리케이션에는 실행 모드를 선택하는 환경변수를 두지 않는다. 계정 및 동기화 백로그를 시작할 때 실행 구성 방식을 다시 결정한다.
- 접속 주소 확인 중에는 별도 카드 없이 진행 상태만 표시한다. 접속 조건을 통과하지 못한 화면은 `잘못된 접근입니다.`와 HTTPS 또는 `http://localhost`로 다시 여는 방법을 제공한다. 카드 형태는 메모와 선택 가능한 일괄 복사 항목처럼 독립된 대상의 전체 조작을 전달하는 경우에만 유지한다.
- 메모 작업 영역의 나란한 오른쪽 패널은 `72rem` 이상에서 너비 `22rem`으로 표시하고, `48rem` 이상 `72rem` 미만에서는 같은 route의 모달로 표시한다. 작은 화면 메모 미리보기는 내용에 따라 짧아지고 `12rem`을 넘지 않으며 IndexedDB geometry를 바꾸지 않는다.
- 메모 이동 핸들과 빈 캔버스 시점 이동은 시작점에서 mouse 및 pen `5 CSS px`, touch `10 CSS px`를 넘은 뒤 drag로 판정한다. 모바일 목록 개별 복사는 500ms 동안 `10 CSS px` 안에 머문 경우에만 길게 누르기로 판정하고, 모바일 확인 항목 재정렬은 왼쪽 이동 핸들에서 시작한다.
- 넓은 화면은 마지막 입력 `800ms` 뒤 자동 저장하고 `blur`, 애플리케이션 내부 route 이동, document hidden과 `pagehide`에서 대기 중인 최신 원문을 같은 흐름으로 즉시 저장한다. 복구 초안을 먼저 기록하고 기준 메모 transaction이 완료된 뒤 지우며 실패하면 입력과 초안을 유지한다. 작은 화면 상세는 명시적으로 저장하고 저장 전 내부 이동에서 계속 편집 또는 변경사항 버리기를 선택하게 하며, 저장 중 중복 실행을 막는다.
- 메모 삭제 알림은 5초 뒤 사라지고 hover와 `focus-within`에서 남은 시간을 멈춘다. 연속 삭제는 현재 실행의 LIFO 이력으로 관리하고 최근 항목 하나만 안내한다. `실행 취소`는 알림이 보이는 동안 최근 항목을 복원하며, 새로고침에서는 이력을 지운다. 삭제 뒤 포커스는 다음 `tabIndex` 메모, 이전 메모, 새 메모 제어 순으로 옮기고 복원 뒤에는 복원한 메모 선택 지점으로 옮긴다.
- 전체 복사와 개별 복사의 성공은 공유 알림 영역의 `복사됨` 한 건으로 짧게 알리고 닫기 버튼을 두지 않는다. 다음 결과가 내용을 바꾸면 표시 시간을 다시 센다. 실패는 API 부재, 권한 거절 또는 그 밖의 쓰기 실패와 다음 동작으로 구분한다. 사용자가 계속 확인해야 하는 실패는 자동 종료 알림이 아니라 해당 작업 가까이의 지속 상태로 남기고 현재 포커스를 옮기지 않는다.
- 맨 앞으로 및 맨 뒤로 보내기는 모든 활성 메모를 고유한 `1..N` `zIndex`로 다시 배정하고 한 IndexedDB transaction에 저장한다. 기존 동률은 `zIndex`, 생성 시각, ID 순서로 정리하고 transaction 실패에서는 전체 변경을 반영하지 않는다.
- 모바일 일괄 복사는 저장 목록과 분리한 빈 작업 초안으로 시작하고 IndexedDB에 한 개의 활성 작업으로 보관한다. 예기치 않은 route 이탈과 새로고침에서는 복원하고, 수집 화면 헤더 뒤로가기와 확인 페이지의 명시적 취소에서는 지운다. 수집 상태의 길게 누르기는 아무 동작도 하지 않는다. 확인 항목 복제는 대상 바로 뒤에 새 ID로 넣고 원본 메모, 저장 목록과 사용 횟수를 바꾸지 않는다.
- 넓은 일괄 복사 패널과 모바일 확인 페이지는 왼쪽 이동 핸들의 pointer drag와 키보드 방향키로 같은 삽입식 재정렬 명령을 사용한다. 설정을 켜면 항목 더보기의 직접 이동 동작도 같은 명령을 사용한다. 첫 항목에는 `아래로 이동`, 마지막 항목에는 `위로 이동`만 제공하며 항목이 하나면 이동 동작을 표시하지 않는다. 모바일 drag는 이동 핸들에서 시작하며 스크롤, `pointercancel`과 완료 전 `lostpointercapture`에서 취소한다.
- 상단 탐색과 주 작업 제어는 양의 `tabindex` `1..999`, 메모 선택 지점은 `1000..32767`을 사용한다. 첫 메모는 `1000`, 새 메모는 현재 최댓값에 1을 더한 값을 받는다. 누락, 중복과 범위 밖 이전 값은 유효한 값, 생성 시각, ID 순서로 안정적으로 다시 배정한다. 메모 내부 textarea, 아이콘과 패널 제어는 해당 메모 선택 지점 뒤의 네이티브 순서를 따른다.
- 메모 및 일괄 복사 항목 선택, 속성 패널 대상, 키보드 `focus-visible`과 drag 삽입 위치는 서로 다른 형태와 역할 기반 토큰으로 구분한다. 과도하게 굵은 붉은 외곽선을 기본 선택 표현으로 사용하지 않는다. 선택 지점의 보조 키 없는 `Enter`는 속성 패널을 열고 첫 X 입력으로 포커스를 옮긴다. 빈 캔버스 click은 메모 선택을 해제하고 캔버스 viewport로 포커스를 옮긴다. 상위 임시 조작이 없는 `Escape`는 메모와 일괄 복사 항목 선택을 함께 해제하고 포커스를 유지한다. 패널을 닫으면 이전 패널을 복원하지 않는다.
- 속성 패널은 너비 `240..4095`, 높이 `180..4095`를 유지하고 X와 Y에 음수와 0을 허용한다. 계산 불가능한 초안은 기존 geometry를 유지하고 수정하게 한다. 이전 좌표를 양수 또는 과거 캔버스 안으로 다시 보정하지 않는다.
- 신뢰할 수 있는 `Command` keydown은 메모 선택만 해제하고 헤더와 아이콘을 보이지 않게 하되 행의 크기를 유지한다. 헤더 아이콘에 포커스가 있으면 같은 메모 선택 지점으로 옮기고 그 밖의 포커스는 유지한다. keyup, 창 및 문서 상태 변화와 modifier가 없는 다음 신뢰할 수 있는 입력에서 헤더 상태를 다시 맞추며 합성 event는 사용하지 않는다. 포커스가 있는 선택 지점의 `Command+Option+Enter`는 메모 선택 ID가 비워진 뒤에도 포커스 대상 ID를 사용해 pointer 보조 키 설정과 관계없이 일괄 복사 항목을 추가한다.
- 넓은 패널과 모바일 확인 페이지는 각 항목 오른쪽 더보기에서 `복제`와 `삭제`를 제공한다. 설정을 켠 경우에만 현재 실행할 수 있는 `위로 이동`과 `아래로 이동`을 추가한다. 직접 이동과 키보드 재정렬 뒤 같은 ID의 선택과 포커스를 유지하고, drag를 사용할 수 없는 사용자가 설정을 켜 같은 인접 삽입 결과를 만들 수 있어야 한다. `위치 변경`, `N번째로 이동`과 별도 취소 영역은 표시하지 않는다.

`800ms`, 메모 크기 제한, `72rem` 패널 전환, `12rem` 목록 미리보기 상한, mouse 및 pen `5 CSS px`, touch `10 CSS px`와 `500ms`는 표준이 아니라 첫 구현의 설정값이다. 실제 브라우저에서 입력 손실, 오작동, 도달하기 어려운 조작 또는 일반적인 화면에서 과도한 빈 공간이 확인되면 같은 근거 수집과 결정 기록 절차로 다시 검토한다. 이후 필수 선택이 새로 발견되면 영향을 받는 구현을 멈추고 선택지, 근거, 영향과 재검토 조건을 문서와 계획에 기록한 뒤 해당 구현을 재개한다.

## 계획 완료 판정

이 계획은 문서를 만들었다는 이유로 완료되지 않는다. U1부터 U12까지 요구사항에 연결된 저장 및 기능 증거를 유지하고 U13부터 U35까지 필요한 UI 재구축, 실제 브라우저 과업, 시각 및 접근성 검토가 모두 `pass`여야 로컬 애플리케이션 완성을 주장할 수 있다. 메모 목록과 보조 화면의 Drawer, 화면별 프레임, 우측 하단 새 메모, 메모 누르기 복사와 수정 아이콘 상세 이동 및 토스트 닫기가 구현되지 않았으면 U22부터 U25는 완료가 아니다. U14와 U18의 좁은 화면 탐색도 U23의 실제 동작 증거가 없으면 완료가 아니다.

새 메모의 본문 포커스가 헤더 아래에 별도 붉은 선을 만들거나 화면 밖 메모를 생성한 뒤 왼쪽 아래 보기 제어가 보이지 않으면 U26 및 U27은 완료가 아니다. 핀치와 보조키+휠이 같은 캔버스 시점을 바꾸고 메모 저장 자료와 일반 스크롤을 유지한다는 실제 기기 및 브라우저 증거가 없으면 U28은 완료가 아니다. 화면 높이가 줄 때 카드가 눌리거나 우측 하단 버튼을 위해 상시 빈 행이 남고 마지막 메모의 원문 또는 수정 동작을 사용할 수 없으면 U29와 U30은 완료가 아니다. 평상시와 수집 상태에 같은 하단 여백이 남거나, 모바일 생성 직후 상세 화면에 자동 이동하거나 숨겨진 보드 입력에 포커스가 가면 U30과 U31은 완료가 아니다.

좁은 일괄 복사 확인 또는 저장 목록 관리에서 버튼 옆 팝오버가 남거나, 이동 아이콘에 방향별 접근 가능한 이름이 없거나, 설정을 끈 상태에 이동 동작이 나타나면 U32는 완료가 아니다. 승인된 닫기 방식 중 하나라도 자료를 바꾸거나 작동하지 않으면 완료로 계산하지 않는다. 넓은 패널과 넓은 저장 목록 관리의 기존 팝오버, 이동과 복사 결과가 약해져도 완료할 수 없다.

모바일 주소창이 펼쳐지거나 접힌 뒤 메모 목록, 수집, 상세, 일괄 복사 확인 또는 저장 목록 관리에서 바깥 문서의 빈 영역으로 화면 전체가 스크롤되거나 하단 동작이 함께 이동하면 U33은 완료가 아니다. 사용 빈도, 분석, 템플릿, 설정 및 접속 안내의 짧은 화면에 불필요한 빈 스크롤이 남거나 긴 내용의 끝에 접근할 수 없으면 U34는 완료가 아니다. 고정된 데스크톱 표시 영역의 자동 검사만으로 실제 모바일 주소창과 화면 키보드 동작을 확인했다고 판정하지 않는다.

U35에서 캔버스가 상단 빈 행 때문에 줄어들거나 버튼 바깥 overlay가 메모 입력을 막으면 완료가 아니다. 모바일 새로고침에서 저장된 수집 화면이 자동으로 섞이거나 확인 화면의 뒤로가기 중 일반 관리 화면이 나타나거나 메모 목록과 초안 순서를 복원하지 못해도 완료가 아니다. 저장 목록 관리가 개인 메모 디자인 토큰, 본문 우선순위, 항목별 조작 상태와 일관되지 않거나 메모 화면의 일괄 복사 패널 표현을 약화해도 완료가 아니다. 전체 메모 접근 또는 일괄 복사 대상이 줄어들거나, 측정 증거 없이 저장소 페이지네이션을 적용해도 완료가 아니다. 보조 화면의 중복 구분선은 줄이되 표 행, focus-visible과 오류 상태가 사라지면 완료가 아니다.
