---
origin: docs/designs/personal-notes-app-8fd/requirements.md
---

# 로컬 개인 메모 애플리케이션 완성 계획

## 결론

현재 작업은 별도의 백엔드, 데이터베이스와 계정 없이 동작하는 개인 메모 애플리케이션을 모듈별로 완성하는 것이다. 사용자 동작과 저장 규칙을 구현 전에 안정적으로 설명할 수 있는 모듈에만 TDD를 적용하고, Clipboard, IndexedDB, Worker 산출물, 공간형 화면과 드래그처럼 실제 브라우저가 결과를 결정하는 모듈은 브라우저 통합 검사와 기록된 시각 및 접근성 검토로 확인한다. 모든 모듈에 같은 테스트 방식을 강제하지 않는다.

다음 미완료 작업을 시작하기 전에 현재 사용자 동작, 외부에서 사용하는 API, IndexedDB 자료 형식과 오류 처리를 보존 기준으로 확인하고, 적용할 개발 지침을 검토하는 선행 작업을 먼저 완료한다. 기존 코드의 작성 방식을 그대로 복사하지 않고, 요구사항과 승인된 결정이 바꾸도록 정한 부분을 제외한 현재 사용자 동작과 자료 처리를 유지하면서 알려진 안티패턴을 제거한다.

이번 재검토에서는 현재 구현에 필수이지만 값이 없던 선택을 최신 공식 자료, 현재 저장 자료와 실제 화면 근거로 교차검증해 채택했다. 검토한 선택지, 이유, 영향과 다시 검토할 조건은 이 계획에 연결된 결정 기록에 남기고 작업 입력과 검증 항목을 같은 값으로 갱신했다. 사용자 화면과 새 TypeScript 이름에는 `일괄 복사` 및 `BatchCopy`를 사용하고, IndexedDB object store 이름도 `batchCopyLists`로 맞춘다. 이전 schema의 저장소는 `versionchange`에서 한 번 이름을 바꿔 자료를 보존하며, 변경이 끝난 뒤 이전 저장소나 우회 읽기 경로를 유지하지 않는다. 이후 필수 선택이 새로 발견되면 영향을 받는 구현을 멈추고 같은 절차를 적용하며, 현재 범위에서 제외한 백로그의 선택은 그 작업을 시작하기 전에 검토한다.

실행 순서는 현재 독립 실행 배포 선택인 Next.js Node.js 서버와 Dedicated Worker가 운영용 빌드에서 동작하는지 먼저 확인한 뒤, 자료 형태와 브라우저 저장, 디자인 시스템과 공통 화면 구조, 메모, 개별 복사 및 일괄 복사, 사용 빈도, 텍스트 분석과 템플릿 순으로 진행한다. 정적 사이트 산출물은 만들지 않으며, 이후 작업에 Next.js Server Actions나 Route Handlers가 필요하다고 확인되면 현재 자료 책임과 배포에 미치는 영향을 먼저 검토한다. 각 단위는 선행 결과와 중단 조건을 만족해야 다음 단위의 완료 근거가 될 수 있다.

독립 실행 애플리케이션은 `apps/notes/package.json`이 관리한다. Next.js 라우트는 `apps/notes/app/`에 두고 FSD 코드는 `apps/notes/src/`에 둔다. 모든 FSD 계층을 먼저 만드는 대신 현재 화면, 메모와 템플릿 자료 및 사용자 동작에 필요한 계층만 추가하고, 계층 의존 방향과 slice public API를 각 작업 단위에서 확인한다.

UI는 Tailwind CSS, 네이티브 폼 요소와 자체 `shared/ui`를 바탕으로 개인 메모 애플리케이션 고유의 디자인 시스템을 만든다. 모든 인터페이스 글꼴은 Pretendard를 사용하고, Figma Design 편집기처럼 중립적인 애플리케이션 프레임과 조밀한 도구 배치를 사용한다. 메모 작업 캔버스만 밝은 목재 인상을 갖게 하며, 네이티브 요소의 의미와 기본 동작을 유지하면서 고유 외형과 상태를 적용한다. 폼과 무관한 복합 상호작용만 실제 필요가 확인된 범위에서 외부 접근성 부품을 사용할 수 있다.

사용자가 네이티브 폼 요소에서 직접 바꾸는 현재 값과 입력 상태는 React Hook Form이 맡는다. 메모, 화면 또는 과업마다 독립된 폼 수명을 사용하고 같은 편집값을 React state, Context 또는 domain draft에 함께 저장하지 않는다. 자동 저장 실행, IndexedDB 자료, Clipboard, pointer gesture, 일괄 복사 작업과 분석 상태는 각 application 및 domain 책임을 유지한다.

메모 화면은 왼쪽 사이드바 없이 공간형 보드와 오른쪽 보조 패널에 가로 폭을 우선 배정한다. 다른 화면으로 가는 탐색은 메모 화면 상단에서 제공하고, 사용 빈도, 텍스트 분석, 템플릿과 설정 화면은 왼쪽 탐색을 유지한다. 넓은 화면의 메모는 짧은 헤더와 항상 편집 가능한 본문으로 구성한다.

상단 탐색과 주 작업 제어는 `1..999`, 각 메모 선택 지점은 저장된 `1000..32767`의 양의 `tabindex`를 사용한다. 이동이 아닌 헤더 한 번 click이나 `Tab` 탐색은 메모를 선택해 메모 전체를 감싸는 굵은 붉은 테두리만 새로 표시하고, 헤더 더블클릭 또는 선택 지점에 포커스가 있는 선택된 메모의 보조 키 없는 `Enter`가 오른쪽 속성 패널을 연다. 선택 지점의 `Command+Option+Enter`는 pointer 설정과 관계없이 일괄 복사 항목을 추가한다. 탐색 순서는 시각적 겹침 순서와 독립적으로 유지한다.

빈 캔버스 click과 `Command`는 메모 선택을 해제한다. 상위 임시 조작이 없는 `Escape`는 메모와 일괄 복사 항목 선택을 함께 해제하되 패널 대상과 자료는 유지한다. 헤더 drag 중에는 패널 전환으로 캔버스 계산 크기를 바꾸지 않는다. `Command`를 누르는 동안에는 메모 크기를 유지한 채 헤더를 숨겨 본문 복사가 선택으로 이어지지 않게 한다. 운영체제 단축키가 keyup, blur 또는 가시성 event를 누락해도 다음 신뢰할 수 있는 입력에서 헤더 상태를 다시 맞춘다.

`48rem` 미만의 메모 목록은 제한된 높이 미리보기를 사용한다. 짧게 누르면 메모 상세 화면으로 이동해 원문을 편집하고 저장하며, 길게 누르면 원문 전체를 개별 복사한다. 목록 화면 헤더의 아이콘으로 일괄 복사 상태를 시작하고, 상태 안에서는 짧게 누른 횟수와 순서대로 항목을 추가하며 길게 누르기는 아무 동작도 실행하지 않는다. 헤더 왼쪽의 뒤로가기 아이콘으로 상태를 끝내며, 화면 아래에는 `초기화`와 클릭 횟수가 함께 표시되는 `다음`을 둔다.

`다음`은 별도 일괄 복사 확인 페이지로 이동한다. 이 페이지에서는 항목을 `500ms` 동안 `10 CSS px` 이내로 누른 뒤 touch drag로 재정렬하거나 동작 선택창에서 위치 변경, 복제 및 삭제할 수 있다. 확인 작업은 원본 메모와 저장된 일괄 복사 목록을 바꾸지 않는 IndexedDB 작업 초안이다.

넓은 화면의 일괄 복사 패널은 현재 항목 목록과 전체 복사만 제공한다. 패널 머리는 현재 `63px`의 약 60%인 `38px`로 줄이고, 결합 미리보기, 숫자 순서, 위아래 이동, 상시 제거, 실행 취소 및 다시 실행 버튼을 표시하지 않는다. 항목 본문은 클릭, `Enter`와 `Space`로 하나를 선택하고 메모 선택과 같은 의미의 굵은 붉은 테두리를 표시한다. 선택된 항목 본문의 `ArrowUp`과 `ArrowDown` 또는 pointer drag로 순서를 바꾸고, 우측 상단의 붉은 삭제 아이콘으로 직접 제거한다. 삭제 아이콘은 hover 및 `focus-within`에서 나타나고 hover가 없는 환경에서는 항상 보인다. 항목 추가 성공 알림은 만들지 않으며, 전체 복사 결과는 캔버스 변환과 패널의 영향을 받지 않는 주 작업 영역 우측 상단에 5초 동안 보여준다.

메모 삭제는 확인 대화상자 없이 즉시 반영하고 메인 패널 중앙 하단의 토스트에 `메모를 제거했습니다.`와 오른쪽 `취소`를 표시한다. 토스트는 포커스를 가져가지 않고 5초 뒤 사라지며, 보이는 동안 현재 실행의 LIFO 이력에서 최근 삭제부터 복원한다. 오른쪽 속성 패널과 일괄 복사 패널을 동시에 열지 않으며, 마지막으로 활성화한 패널 하나를 표시한다. 이동이 아닌 헤더 더블클릭 또는 선택된 메모의 선택 지점에서 실행한 `Enter`는 속성 패널을, 일괄 복사 동작은 일괄 복사 패널을 활성화하고 전환으로 숨겨진 자료를 지우지 않는다. 활성 패널을 닫으면 이전 패널을 자동 복원하지 않는다.

사용자에게 보이는 문구는 현재 내용과 동작, 필요한 조건, 바로 알아차리기 어려운 상태 및 결과와 오류 뒤 다음 행동만 전달한다. 화면 구조와 컨트롤이 이미 알려주는 역할, 구현 기술, 빌드 상태와 현재 과업에 필요하지 않은 소개는 표시하지 않는다. 문구를 줄이더라도 입력 조건, 접근 가능한 이름과 사용자가 직접 확인할 수 없는 동작 결과는 유지한다.

접속 주소 확인 중에는 카드 외곽 없이 빈 주 화면에 간결한 진행 상태만 표시한다. 접속 조건을 통과하지 못하면 `잘못된 접근입니다.`와 HTTPS 또는 `http://localhost`로 다시 열라는 행동을 표시하고, `지원하지 않는 접속 주소`나 `유효하지 않음` 같은 판정어를 사용하지 않는다. 다른 화면도 메모 및 선택 가능한 일괄 복사 항목처럼 독립된 대상의 조작을 전달할 때만 카드 형태를 유지하며, 빈 상태, 단일 오류, 페이지 전체 폼, 표와 목록의 바깥 구조는 제목, 간격, 정렬과 구분선을 우선한다.

계정, 로그인, 동기화, 백엔드와 데이터베이스는 이번 계획에서 제외하며 모든 백로그 가운데 우선순위가 가장 높다. 라이브러리 패키지와 포트폴리오 라우트 연결은 그 뒤의 백로그다. 현재 결과물에는 두 백로그를 위한 화면, 현재 과업에 필요하지 않은 서버 코드나 미리 만든 추상화를 포함하지 않는다.

## 기준선과 문서 관리

첫 계획 커밋 전까지 다음 파일의 현재 검토본을 임시 기준선으로 사용한다. 계획을 처음 커밋한 뒤에는 `plan.md`를 마지막으로 변경한 커밋에 포함된 문서가 기준선이다. Git 개체 ID나 작성 시각을 기준선 식별자로 기록하지 않는다.

- [요구사항의 의도한 결과](requirements.md#의도한-결과)
- [요구사항의 반드시 지킬 조건](requirements.md#반드시-지킬-조건)
- [요구사항의 완료를 확인할 증거](requirements.md#완료를-확인할-증거)
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
- 최신 모바일 요구는 목록 화면 헤더에서 일괄 복사 상태를 시작하고 메모 상세 route를 추가한다. 같은 메모를 반복해서 누른 경우도 별도 항목과 클릭 횟수로 기록한다. `다음`은 `/batch-copy` 확인 페이지로 이동하고, 길게 누른 뒤 재정렬과 항목별 복제 및 삭제는 실행 중 작업 사본만 바꾼다. U2부터 U8과 U11이 영향을 받으며 작업 단계, 고유 항목 ID, 스냅샷, 사용 빈도와 제거 이력 규칙은 새 입력 방식에 맞게 다시 검증한다.
- 화면 문구 제한은 U1의 최소 화면, U4의 공통 화면 구조와 U5부터 U10까지 추가할 모든 사용자 문구에 적용한다. U11은 보이는 문자열의 역할과 중복을 최종 확인하며, 자료 규칙과 라우트 수는 바뀌지 않는다.
- 접속 안내 문구와 카드 표면 제한은 U4와 U11에 영향을 준다. 주소 확인 중에는 장식용 카드 없이 진행 상태만 표시하고 실패 제목은 `잘못된 접근입니다.`로 바꾸며, 본문에서 HTTPS 또는 `http://localhost`로 다시 여는 행동을 알려준다. 접속 상태, 사용 빈도 및 분석 빈 상태, 템플릿 원문 없음, 설정과 템플릿 폼, 표 및 목록을 현재 디자인 시스템의 카드 기준으로 다시 분류한다. 메모와 선택 가능한 일괄 복사 항목의 상태 표면은 유지한다.
- macOS가 `Command` key event, 창 포커스 변화, 문서 가시성 변화 또는 pointer 종료 event 일부를 전달하지 않는 경우는 U2, U3, U5, U6과 U11에 영향을 준다. U2는 일시적인 modifier 표시 상태와 영구 자료를 분리하고, U3는 modifier 표시 상태를 저장하거나 route 수명에 올리지 않는다. U5는 중단 신호 뒤에도 마지막으로 보인 캔버스 시점을 유지하며, U6은 다음 신뢰할 수 있는 event의 modifier 값으로 헤더 표시만 다시 맞추고 과거 복사나 선택 동작을 추정해 실행하지 않는다. U11은 실제 `Shift+Command+5` 완료 및 취소 직후 헤더 복원, 다음 복사와 캔버스 시점 이동을 각각 확인한다.
- 구현 전 검토에서 지원 접속 주소의 실행 중 판정, 일괄 복사 패널 전체 복사, 줄 조합 생성 규칙과 IndexedDB 연결 수명의 검증 공백을 확인했다. IndexedDB 저장, 공통 화면 구조, 일괄 복사 순서 편집, 줄 단위 텍스트 분석과 통합 완료 검증에 각각 책임을 배정한 뒤 영향을 받는 구현을 진행한다.
- 메모 화면의 왼쪽 사이드바 제거는 공통 화면 구조, 메모 영역의 반응형 전환과 통합 화면 검증에 영향을 준다. 저장 자료, 개별 복사, 일괄 복사, 사용 빈도와 분석 규칙은 바뀌지 않는다.
- 현재 동작 보존과 개발 지침 검토는 다음 미완료 작업보다 먼저 수행하고, 이후 각 작업 단위에서 변경한 모듈에 다시 적용한다. 이 선행 작업은 사용자 과업이나 TDD 분류를 바꾸지 않으며, 지침을 따르려면 승인된 동작, 외부 API 또는 저장 자료를 바꿔야 하는 경우 영향을 받는 구현을 멈춘다.
- Pretendard, Figma식 애플리케이션 프레임과 밝은 목재 메모 캔버스 요구는 U4의 글꼴 및 색 token, 공통 탐색, 메모 표면과 캔버스 배경을 바꾼다. 별도 메모 제목과 상단 작업 행을 제거하고 캔버스를 상단 탐색 아래의 나머지 화면에 채우며, `48rem` 이상의 오른쪽 보조 패널 제어를 우측 상단에 유지한다. 최신 모바일 요구는 제한된 높이 목록, 상세 화면, 목록 헤더의 일괄 복사 상태 아이콘, 헤더 뒤로가기와 하단 작업 영역을 같은 디자인 시스템에 추가한다. U11은 실제 브라우저에서 계산된 글꼴, 화면 구성, 고정 제어와 목재 결 위의 상태 대비를 확인한다.
- 초기 화면 오류에 표시된 루트 속성은 서버 응답과 확장 기능이 개입하지 않는 브라우저에서 나타나지 않았다. U4와 U11은 깨끗한 브라우저 profile에서 애플리케이션이 만든 hydration 불일치가 없는지 확인하고, 외부 DOM 변경이 의심되면 서버 응답과 hydration 뒤 DOM을 분리해 비교한다. 원인을 확인하지 않은 루트 `suppressHydrationWarning`은 사용하지 않는다.
- 메모 표면 간소화와 상호작용 변경은 U2부터 U6과 U11에 영향을 준다. 넓은 화면의 메모는 짧은 헤더와 상시 편집 본문으로 만들고, 기존 이동, 복사, 일괄 복사, 편집, 크기 및 숫자 조절 텍스트 UI를 제거한다. 헤더 drag가 이동을, 가장자리와 꼭짓점 drag가 크기 변경을 맡고 헤더 오른쪽에는 맨 앞으로, 맨 뒤로와 삭제 아이콘만 둔다. `Command+클릭`은 개별 복사, `Command+Option+클릭`은 pointer 일괄 복사 항목 추가로 바꾼다. 포커스가 있는 메모 선택 지점에서는 `Command+Option+Enter`로 같은 추가 명령을 실행한다.
- 메모 선택과 속성 패널은 U2부터 U5와 U11에 영향을 준다. 헤더 click과 메모의 저장된 `1000..32767` 양의 `tabindex`가 낮은 순서를 따르는 `Tab` 탐색은 메모 하나를 선택하고 메모 전체의 굵은 붉은 테두리를 표시한다. 상단 탐색과 주 작업 제어는 `1..999`를 사용하며, 메모의 `tabindex`는 `zIndex`와 독립적이다. 키보드 포커스는 선택과 구분하고 속성 패널 대상은 바깥쪽 점선 표시로 구분한다. 선택 지점의 `Enter`는 패널을 열고 첫 X 입력으로 포커스를 옮긴다. 오른쪽 속성 패널의 `X`, `Y`, 너비와 높이 초안은 `blur`, 패널 밖 click 또는 입력 안의 `Enter`에서 하나의 적용 절차로 검증한다. `4096 × 4096` 논리 캔버스 안의 너비 `240..4095`, 높이 `180..4095`와 양의 위치만 저장한다. 메모 표면에는 숫자 입력을 추가하지 않는다.
- 후속 선택 및 이동 요구는 U2, U4부터 U6과 U11에 영향을 준다. 이동이 아닌 헤더 한 번 click과 `Tab` 탐색은 선택 테두리만 새로 표시하고, 헤더 더블클릭 또는 선택 지점에 포커스가 있는 선택된 메모의 `Enter`는 속성 패널을 연다. 빈 캔버스 click과 `Command`는 메모 선택 ID만 비운다. 상위 임시 조작이 없는 `Escape`는 메모 및 일괄 복사 항목 선택 ID를 함께 비운다. 메모 선택 ID와 속성 패널 대상 ID를 분리하며 drag를 시작한 pointer 연속 입력의 click 및 더블클릭을 실행하지 않는다. drag 중 패널 표시 여부와 캔버스 계산 크기를 애플리케이션 동작으로 바꾸지 않는다. `Command`를 누르는 동안에는 헤더 행 높이와 메모 크기를 유지한 채 헤더와 아이콘을 숨기고, 본문 보조 키 복사는 메모를 다시 선택하거나 속성 패널 대상을 바꾸지 않는다.
- 두 오른쪽 패널의 최근 활성 우선순위는 U2, U4부터 U7과 U11에 영향을 준다. 이동이 아닌 헤더 더블클릭 또는 선택된 메모의 선택 지점에서 실행한 `Enter`는 속성 패널을, 일괄 복사 동작은 일괄 복사 패널을 활성화한다. 한 번의 헤더 click, `Tab` 선택과 선택 해제는 최근 활성 패널을 바꾸지 않으며, 한 패널을 숨겨도 속성 패널 대상, 속성 초안, 일괄 복사 항목과 제거 이력을 지우지 않는다.
- 메모 삭제 복구는 U2, U3, U4, U5와 U11에 영향을 준다. 삭제 직후 메인 패널 중앙 하단의 5초 토스트에 결과와 `취소`를 표시하고, 보이는 동안 현재 실행의 LIFO 이력에서 최근 삭제부터 같은 원문, 위치, 크기와 겹침 순서로 복원한다. 새로고침에서는 이력을 지운다. 삭제된 메모에 포커스가 있었다면 다음 `tabIndex` 메모, 이전 메모와 새 메모 제어 순으로 옮긴다.
- 빈 캔버스의 주 pointer drag로 시점을 이동하는 변경은 U5와 U11에 영향을 준다. 이벤트 시작 지점이 메모 또는 다른 조작 요소가 아니면 변환되는 보드의 현재 경계 밖에서도 viewport가 조작을 이어받아야 한다.
- 일괄 복사 패널의 간소화는 U4, U6, U7과 U11에 영향을 준다. 패널 머리를 약 `38px`로 줄이고 결합 미리보기, 숫자 순서, 위아래 이동, 상시 제거, 실행 취소 및 다시 실행 버튼을 제거한다. 항목 추가 성공 알림은 만들지 않고 전체 복사 결과는 주 작업 영역 우측 상단에서 5초 동안 보여준다. 넓은 패널은 항목 우측 상단에 붉은 직접 삭제 버튼을 제공하고 action 또는 overflow 선택창을 제공하지 않는다. 저장된 목록 관리로 진입한 모바일 페이지의 기존 drag 없는 재정렬 대안은 유지하고, `다음`으로 진입한 확인 작업에는 길게 누른 뒤 drag와 항목별 복제 및 삭제를 적용한다. 내려받은 여러 `.fig`의 menu 및 action menu를 비교한 결과에 따라 모바일 항목 선택창은 자체 디자인 시스템의 실행 버튼에 연결된 표면과 세로 행, 포커스 및 pressed 상태와 구분된 삭제 동작을 제공한다. 길게 누르기 활성화, 삽입 위치 및 취소 복원 상태도 화면에서 구분한다.
- 넓은 패널은 항목 drag와 선택된 항목 본문의 방향키로 순서를 바꾸고, 모바일 확인 페이지는 항목 동작 선택창의 `위치 변경`과 삽입 위치 버튼을 drag와 같은 결과의 단일 pointer 및 키보드 대안으로 제공한다. 넓은 패널의 직접 삭제 버튼은 hover와 `focus-within`에서 표시하고 hover가 없거나 coarse pointer인 환경에서는 항상 표시한다. 메모 크기 변경은 오른쪽 속성 패널의 숫자 입력이 drag 없는 대안이다.
- 최신 선택 및 입력 복원 요구는 U2, U4, U5, U7과 U11에 영향을 준다. 일괄 복사 항목 선택 ID를 메모 선택과 분리하고, 항목 본문 click, `Enter`와 `Space`로 하나를 선택하며 선택된 본문의 `ArrowUp` 및 `ArrowDown`으로 한 자리씩 재정렬한다. 상위 임시 조작이 없는 `Escape`는 두 선택을 함께 해제한다. 운영체제 단축키 뒤에는 `keyup`, `blur`, `visibilitychange`와 pointer 종료 event가 모두 온다고 가정하지 않고, 의미가 `Meta`인 신뢰할 수 있는 event에서 헤더 상태를 다시 맞춘다. pointer 완료는 중복 종료 신호에서 한 번만 확정하며 `pointerup` 뒤 정상적인 `lostpointercapture`가 결과를 되돌리지 않게 한다.
- 모바일 상세 화면은 IndexedDB 복구 초안을 사용하고 저장 전 내부 이동에 계속 편집 및 변경사항 버리기를 제공한다. 모바일 일괄 복사는 기존 저장 목록과 분리한 하나의 IndexedDB 작업 초안이며, 예기치 않은 이탈과 새로고침에서 복원하고 명시적 뒤로가기 및 `취소`에서 지운다. 확인 항목 복제는 대상 바로 뒤에 넣고 수집 상태의 길게 누르기는 아무 동작도 실행하지 않는다.
- 구현 필수 결정 재검토로 U2, U3, U5부터 U7과 U11의 이전 중단 조건을 해소했다. 800ms 자동 저장, `4096 × 4096` 캔버스, geometry 범위, `72rem` 패널 전환, `12rem` 목록 미리보기 상한, mouse 및 pen `5 CSS px`와 touch `10 CSS px`의 직접 이동 기준, 500ms 길게 누르기는 표준값이 아닌 초기 제품값이므로 실제 브라우저 검증에서 재검토 조건을 확인한다.
- 사용자에게 보이는 기능명은 `일괄 복사`, 단일 메모 Clipboard 쓰기는 `개별 복사`로 통일한다. 새 TypeScript 이름은 `BatchCopy`를 사용하고 기존 `ordinaryCopy`, `accumulation` 및 `metaClickEnabled` record는 자료를 보존하는 변환을 U2와 U3에서 먼저 설계한다. 일괄 복사 자료를 저장하는 IndexedDB object store 이름은 `batchCopyLists`를 사용한다.
- 일괄 복사 확인과 저장 목록 관리의 기준 주소는 `/batch-copy`다. 모든 애플리케이션 링크와 이동은 이 주소만 사용하며, `/accumulator` 화면이나 redirect를 제공하지 않는다. 이전 schema에 저장된 일괄 복사 자료는 U3의 `versionchange`에서 저장소 이름을 `batchCopyLists`로 한 번 바꿔 보존한다.
- 직접 입력 상태 요구는 U4부터 U6, U10과 U11에 영향을 준다. 넓은 화면 및 모바일 상세의 메모 본문, 템플릿 원문과 이름, 플레이스홀더 이름 및 치환값, 속성 패널 수치와 설정 checkbox를 과업별 React Hook Form으로 옮긴다. 저장과 Clipboard event는 실행 시점에 `getValues`로 읽고, 대상이나 외부 revision을 반영하는 `reset`은 dirty 값 보존 조건을 화면별로 정한다. 일괄 복사 작업과 포인터 제스처를 폼으로 옮기지 않는다.

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
15. 알림 종료를 저장소 재시도와 분리하고, 메모 삭제 취소는 삭제 완료 시각에서 계산한 원래 5초를 route 이동 뒤에도 유지한다. 비동기 복원은 시작한 스냅샷만 정리한다. 일괄 복사 제거 및 다시 실행은 성공 결과에 대상 ID를 포함해 조립 지점에서 선택을 한 번 정리하고, 선택하지 않은 항목의 drag는 거리 기준을 넘을 때 대상을 선택한다. 전역 `Escape`는 보조 키와 IME 조합이 없을 때만 두 선택을 해제하며, `visibilitychange`의 두 방향에서 일시적인 `Command` 표시를 복원한다. 캔버스 pan은 창과 문서 재진입, 주 버튼 bit 및 `pressure`가 함께 해제된 pointer 이동과 다음 pointer 시작에서 남은 제스처만 정리하고 마지막 시점을 유지한다. 방향키 이동은 같은 문구가 반복돼도 live region에 새 변경을 만들고, 저장 목록 관리 검사는 두 항목의 유효한 이동과 새로고침 뒤 순서를 확인한다. IndexedDB migration 검사는 새 범위 안의 이전 geometry를 보존한다.

U4의 시각 및 접근성 승인 결과는 자동 검사나 에이전트 검토만으로 만들지 않는다. 승인 결과가 없다는 사실은 다른 코드 결함 수정의 중단 사유가 아니지만, 최종 완료 판정은 `needs human input`으로 유지한다.

## 결정 이력과 현재 선택

각 선택의 검토안, 변경 이유, 영향과 다시 검토할 조건은 다음 결정 기록이 관리한다. 계획은 결정의 결과를 연결할 뿐 이력을 다시 요약해 다른 기준을 만들지 않는다.

- [구현 필수 결정 교차검증](references/required-implementation-decisions-research.md): 자동 저장, 자료 수명, 양의 `tabindex`, geometry, 화면 전환, 목록 미리보기, 삭제 복구, 직접 이동 및 길게 누르기 판정과 drag 대안의 공식 근거, 제품 수치와 재검토 조건
- [메모 복사와 편집 동작](decisions/note-copy-and-edit.md): 넓은 화면의 상시 편집과 800ms 자동 저장, `Command+클릭` 개별 복사, 작은 화면의 상세 편집 및 복구 초안과 길게 누르기
- [일괄 복사 실행 동작](decisions/accumulation-activation.md): `Command+Option+클릭` 항목 추가와 작은 화면의 명시적 일괄 복사 상태
- [공간형 보드와 작은 화면 목록](decisions/responsive-note-presentation.md): 메모 영역의 inline size `48rem`을 기준으로 한 표현 전환, `4096 × 4096` 논리 캔버스, geometry 범위와 빈 캔버스 시점 이동
- [메모 선택과 속성 편집](decisions/note-selection-and-properties.md): 헤더 한 번 click 및 관리된 양의 `tabindex` 순서, 패널 활성화와 포커스, 선택 및 패널 대상 구분, 수치 적용과 패널 닫기
- [메모 삭제와 복구](decisions/note-removal-recovery.md): 즉시 삭제, 5초 취소 토스트, 현재 실행의 LIFO 이력과 삭제 뒤 포커스
- [일괄 복사 순서와 제거 복구](decisions/accumulator-ordering-and-recovery.md): 추가 당시 원문, 데스크톱 항목 선택, drag 및 방향키 재정렬, 모바일 삽입 위치 재정렬과 실행 중 제거 이력
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
- [직접 입력 상태 관리](decisions/form-input-state-management.md): 과업별 React Hook Form, 입력값의 단일 책임, 이벤트 시점 읽기, 기본값 교체와 폼 밖 application 상태
- [Pretendard와 Figma식 작업 화면](decisions/figma-inspired-visual-direction.md): Pretendard 글자 체계, 중립적인 애플리케이션 프레임과 밝은 목재 메모 캔버스

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
- 작은 화면의 일괄 복사 상태, 헤더 뒤로가기, 하단 `초기화` 및 클릭 횟수가 표시되는 `다음`, 길게 누른 뒤 재정렬 및 항목별 위치 변경, 복제와 삭제를 제공하는 확인 페이지, 우측 하단 저장 항목 수 제어
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
  -> 고정 캔버스의 위치 및 크기 범위 안이면 geometry 저장
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
- 논리 캔버스는 `4096 × 4096` CSS px이고 geometry는 너비 `240..4095`, 높이 `180..4095`, X `1..(4096 - width)`, Y `1..(4096 - height)` 범위일 때만 적용한다. HTML 입력, 폼 schema와 application command가 같은 범위를 사용한다.
- 활성 메모의 `zIndex`는 `1..N`의 고유하고 빈틈없는 전체 순서다. 맨 앞으로 또는 맨 뒤로 보내기 결과는 한 명령에서 계산하고 저장 계층이 한 transaction으로 반영할 수 있게 한다.
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
- 기존 메모의 `tabIndex` 누락, 중복, 정수가 아닌 값과 범위 밖 값을 `1000`부터 빈틈없이 옮긴다. X 또는 Y가 `0`이거나 geometry가 범위를 벗어나면 원래 배치를 가능한 많이 유지해 캔버스 안으로 보정하고 전체 revision만 증가시킨다. 현재 `240..4095` 너비와 `180..4095` 높이 안에 있는 이전 값은 예전 상한으로 줄이지 않는다.
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
- migration을 거친 메모는 `1000`부터 빈틈없는 양의 `tabIndex`, `1..N`의 고유한 `zIndex`와 허용 범위의 geometry를 유지한다. 새 범위에서도 유효한 이전 geometry는 보존하고 범위 밖 값만 보정한다. 이후 `zIndex` 변경은 `tabIndex`를 바꾸지 않는다.
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
- 접속 주소 확인 중에는 별도 카드, 테두리, 그림자와 채운 표면을 만들지 않고 빈 주 화면에 간결한 진행 상태만 표시한다. 실패 안내도 장식용 카드로 감싸지 않고 제목, 본문과 여백으로 읽기 순서를 만든다.
- 확장 기능이 개입하지 않는 브라우저 profile에서 서버가 출력한 루트 HTML과 첫 client render가 일치하게 한다. 서버 응답, hydration 뒤 DOM과 console을 비교하고 원인을 확인하지 않은 `suppressHydrationWarning`은 루트 요소에 추가하지 않는다.
- 보이는 문자열마다 내용 식별, 동작 또는 입력 이름, 조건, 상태 또는 결과, 오류 뒤 행동 가운데 역할을 지정한다. 제목과 컨트롤을 되풀이하는 안내, 구현 기술 및 빌드 상태 설명과 과업에 필요하지 않은 소개 문구는 제거한다.
- 접속 확인과 실패, 사용 빈도 및 분석의 빈 상태, 템플릿 원문이 없는 상태에서 둥근 외곽, 채운 카드 배경과 그림자를 제거한다. 설정의 유일한 폼, 템플릿 편집 및 일회성 생성 폼은 평평한 section과 구분선으로 나누고, 사용 빈도 표와 분석 및 템플릿 목록은 행과 구분선을 기본으로 삼아 바깥쪽 그림자 및 둥근 카드 외곽을 제거한다. 메모와 선택 가능한 일괄 복사 항목은 독립된 대상의 선택 및 이동을 전달하므로 상태 표면을 유지한다.
- 색, 글자, 간격, 모서리, 테두리, 깊이, motion, 포커스, 제어 요소 크기와 화면 밀도를 용도별 디자인 토큰으로 정의한다. 화면에서 같은 임의 값을 반복하거나 색 이름을 업무 상태 이름처럼 사용하지 않는다.
- 제목, 본문, 버튼, 입력과 상태 문구에는 Pretendard를 사용하고 serif display 글꼴을 제거한다. 제목 위계는 크기, 굵기, 행간과 자간으로 만든다.
- 공통 탐색, 도구 영역과 패널은 중립적인 짙은 회색 및 차가운 회색 표면, 얇은 구획선과 조밀한 간격을 사용한다. 메모 화면은 왼쪽 사이드바와 캔버스를 밀어내는 도구 행을 추가하지 않고 상단 탐색과 캔버스 위 제어로 같은 역할을 제공한다.
- 메모 작업 캔버스는 낮은 대비의 밝은 목재 색과 결을 사용한다. 메모, 일괄 복사 패널과 제어 요소는 중립색 표면을 사용하고 종이 질감이나 어긋난 짙은 그림자를 반복하지 않는다.
- 변환되는 논리 캔버스는 `4096 × 4096` CSS px로 고정하고 메모 추가, 삭제나 오른쪽 패널 표시로 크기를 다시 계산하지 않는다. viewport는 남은 화면을 채우고 빈 영역 어느 지점에서든 시점 이동을 시작할 수 있게 한다.
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
- 헤더 더블클릭 또는 선택된 메모의 선택 지점에서 실행한 `Enter`로 연 오른쪽 속성 패널에는 `X`, `Y`, 너비와 높이를 네이티브 숫자 입력으로 배치한다. 입력 label, 패널 대상, 현재 값, 너비 `240..4095`, 높이 `180..4095`와 고정 캔버스 안의 양의 좌표 조건, 오류와 적용 상태를 제공하되 메모 표면에는 같은 숫자 UI를 반복하지 않는다.
- 오른쪽에는 속성 패널과 일괄 복사 패널 가운데 마지막으로 활성화한 패널 하나만 표시한다. 이동이 아닌 헤더 더블클릭 또는 선택된 메모의 선택 지점에서 실행한 `Enter`는 속성 패널을, 일괄 복사 동작은 일괄 복사 패널을 활성화한다. 한 번의 헤더 click, `Tab` 선택과 선택 해제는 최근 활성 패널을 바꾸지 않는다. 패널 전환이나 선택 해제는 속성 패널 대상, 입력 초안, 일괄 복사 항목과 제거 이력을 조용히 버리지 않는다. 패널을 닫으면 이전 패널을 복원하지 않고 아무 패널도 표시하지 않는다.
- `48rem` 이상의 일괄 복사 패널 버튼은 화면 우측 상단에 유지하고 캔버스를 밀어내는 별도 행을 만들지 않는다. `48rem` 미만에서는 저장된 항목이 하나 이상일 때 우측 하단에 현재 항목 수를 표시하는 고정 버튼을 제공하고 `/batch-copy`로 이동한다. 두 제어는 항목 수와 단위를 접근 가능한 이름 또는 연결된 상태로 전달하며 개수는 시각적으로 동작 이름과 구분한다.
- 넓은 패널의 머리는 `38px` 높이로 `일괄 복사` 제목과 닫기 동작만 제공한다. 본문은 항목 목록만 제공하고 결합 미리보기 및 화면에 보이는 이력 제어를 배치하지 않는다.
- 넓은 패널의 각 항목 본문은 안정된 접근 가능한 이름과 `aria-pressed`를 가진 네이티브 toggle button으로 만든다. 우측 상단의 붉은 삭제 버튼은 본문 버튼과 중첩하지 않는다. 항목 선택, `focus-visible`, drag 놓기 후보와 삭제 hover를 디자인 토큰으로 각각 구분한다.
- 전체 복사 결과 알림은 상단 탐색 아래 주 작업 영역의 우측 상단에 고정한다. 변환되는 캔버스와 일괄 복사 패널의 자식으로 만들지 않아 시점 이동이나 패널 스크롤에 따라 움직이지 않게 한다.
- 전체 복사 결과 알림은 포커스를 가져가지 않고 표시된 시점부터 5초 뒤 사라진다. 다음 복사 시도가 같은 알림을 갱신하면 새 내용이 나타난 시점부터 5초를 다시 센다. 성공은 정중한 status로 알리고, 실패는 Clipboard 오류 원인과 다시 시도 또는 설정 확인 동작을 제공한다.
- 메모 삭제 결과 토스트는 메인 패널 중앙 하단에 고정하고 `메모를 제거했습니다.`와 오른쪽 `취소`를 제공한다. 상태 문구 영역은 `role="status"`에 해당하는 정중한 상태 전달을 사용하고, 토스트는 포커스를 가져가지 않은 채 표시된 시점부터 5초 뒤 사라진다.
- `72rem` 이상에서 첫 항목 추가가 성공하면 오른쪽 패널을 열어 새 항목을 보여주되 현재 포커스를 옮기지 않는다. `48rem` 이상 `72rem` 미만에서는 모달을 자동으로 열지 않고 항목 수만 갱신한다. 어느 표현에서도 `누적했습니다`와 같은 별도 성공 알림은 만들지 않는다.
- 모바일 일괄 복사 확인 페이지는 중립색 표면의 세로 목록, 500ms 동안 10 CSS px 이내로 누른 뒤 drag하는 항목과 우측 상단 동작 아이콘 및 작은 선택창을 사용한다. drag가 활성화되면 항목이 들린 상태를 색 이외의 변화로 보여주고 이동 중에는 삽입 위치를 표시하며, `pointercancel`과 유효하지 않은 놓기에서는 원래 순서 및 시각 상태로 복원한다. 동작 선택창의 `위치 변경`을 누르면 최소 `24 × 24` CSS px의 삽입 위치 버튼을 표시해 drag 없이 같은 결과를 만든다. 동작 아이콘에서는 재정렬을 시작하지 않는다. 하단의 `취소` 및 `일괄 복사하기`, 우측 하단 저장 항목 수 제어는 운영체제 안전 영역, 화면 확대와 키보드 포커스에서 가려지지 않아야 한다.
- 사용 빈도 빈 상태는 작은 화면에서 가로 이동 없이 보여준다. 실제 항목은 좁은 화면에서 원문과 개별 복사, 일괄 복사 및 합계를 한 묶음으로 재배치할 수 있는 구조를 사용한다.
- 실제 긴 한국어 메모, 여러 줄, URL 형식 문자열, 빈 화면, 오류, 진행 중과 키보드 포커스 상태로 대표 화면을 만든다.
- 공통 자료 상태 영역은 초기 불러오기, 사용 가능한 빈 상태, 자료 표시, 읽기 실패와 다른 탭 대기를 구분하며 각 상태에서 가능한 다음 동작을 보여준다.
- 기본, hover, `focus-visible`, pressed, disabled, 오류, 진행 중, 고대비와 reduced motion 가운데 대표 구성요소에 적용 가능한 상태를 확인한다. 상태는 색 하나에 의존하지 않고 네이티브 의미, 문구와 형태를 함께 사용한다.
- 시각 조사에서 제안한 글꼴, 색, 모서리, 깊이와 motion 후보를 실제 콘텐츠가 있는 대표 화면에 적용해 시각 및 접근성 검토 결과를 기록한다. 개인 메모의 공간 작업 특성, 정보 위계와 상태 식별이 승인되기 전에는 모든 화면에 세부 스타일을 확장하지 않는다.

### 검증 방식

TDD를 적용하지 않는다. 디자인 토큰, 구성요소 외형, 라우트 구성, container query, 읽기 흐름과 시각적 위계는 class 이름이나 DOM 내부 구조를 고정하는 단위 검사보다 실제 렌더링, 접근성 검사와 기록된 시각 검토가 직접적인 근거다.

- 다섯 주요 route, `/notes/[noteId]`와 `/batch-copy`를 Next.js 운영 서버에서 직접 열고 새로고침해도 화면이 열린다. 두 보조 route는 전역 탐색에 나타나지 않고 작은 메모 목록 또는 우측 하단 항목 수 제어에서만 일반 진입 방법을 제공한다. `/accumulator`를 직접 요청해도 `/batch-copy`로 이동하거나 일괄 복사 화면을 표시하지 않는다.
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
- 일괄 복사 패널 버튼과 모바일 항목 수 버튼의 접근 가능한 이름 또는 연결된 상태가 현재 개수를 전달한다. 두 자리와 세 자리 개수에서도 각각 우측 상단과 우측 하단 위치를 유지하고 메모 배치를 바꾸지 않는다.
- `72rem` 이상에서는 비어 있는 일괄 복사 패널을 너비 `22rem`의 나란한 표현으로, `48rem` 이상 `72rem` 미만에서는 모달 표현으로 열어 높이 `38px`의 머리, 제목, 닫기 동작과 사용 가능한 빈 상태를 확인한다. 결합 미리보기, 실행 취소 및 다시 실행 버튼이 없다. 모달에 선택이 있으면 첫 `Escape`가 선택만 해제하고, 선택이 없는 다음 `Escape` 또는 닫기 버튼으로 닫은 뒤 포커스가 실행 버튼으로 돌아온다. 실제 항목과 이력의 공유는 U7에서 확인한다.
- 320 CSS px에서 메모 목록은 내용에 따라 짧아지고 `12rem`을 넘지 않으며, 화면 헤더의 일괄 복사 아이콘, 상태 안의 헤더 뒤로가기와 하단 `초기화` 및 `다음`이 메모와 시스템 안전 영역을 가리지 않는다. `다음`의 시각 문구와 접근 가능한 이름에서 클릭 횟수의 의미를 확인할 수 있다. 저장된 항목이 없으면 우측 하단 항목 수 버튼이 보이지 않고, 항목이 생기면 메모 조작을 가리지 않는 위치에 나타난다. `/batch-copy` 확인 화면에서는 순서 목록, 항목별 동작 아이콘 및 자체 디자인 시스템 선택창과 하단 두 동작을 가로 이동 없이 확인할 수 있다. 선택창의 `위치 변경`, `복제`, `삭제`, 포커스 및 pressed 상태와 삭제 구분을 확인한다.
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

## U5. 메모 작성, 편집과 공간 배치

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
- 오른쪽 속성 패널은 React Hook Form이 속성 패널 대상 ID가 가리키는 메모의 `X`, `Y`, 너비와 높이 문자열 및 입력 오류를 관리한다. `blur`, 패널 밖 click과 `Enter`를 하나의 멱등 적용 절차로 모아 같은 초안을 두 번 저장하지 않게 한다. 너비 `240..4095`, 높이 `180..4095`, X `1..(4096 - width)`, Y `1..(4096 - height)` 범위만 한 geometry 변경으로 저장하고, 범위를 벗어난 값은 기존 geometry 및 revision을 유지하면서 해당 입력 오류를 보여준다. 최근 활성 패널이 바뀌어도 폼 수명을 유지하고 다른 메모를 대상으로 열 때에는 정한 `reset` 절차로 값을 교체한다.
- 속성 패널을 닫을 때 유효하고 달라진 초안은 같은 명령으로 한 번 적용한다. 유효하지 않은 초안은 패널에 유지하고 첫 오류 입력으로 포커스를 옮기며, `저장값으로 되돌리기` 뒤에만 버리고 닫을 수 있게 한다. 패널을 닫으면 이전 패널을 복원하지 않고 최근 활성 패널을 비운다.
- 헤더 더블클릭 또는 선택된 메모의 선택 지점에서 실행한 `Enter`가 최근 활성 오른쪽 패널을 속성 패널로 바꾼다. 한 번의 헤더 click, `Tab` 선택과 선택 해제는 최근 활성 패널과 속성 패널 대상을 바꾸지 않는다. 일괄 복사 패널이 보이던 상태에서도 속성 패널 대상, 속성 초안과 일괄 복사 자료를 유지한 채 승인된 활성화 동작에서만 속성 패널을 표시한다. 속성 입력의 적용 계기가 함께 발생하면 공통 검증 및 적용 절차를 먼저 사용한다.
- 헤더 오른쪽에는 맨 앞으로, 맨 뒤로와 삭제 아이콘 버튼을 이 순서로 둔다. 네이티브 버튼, 접근 가능한 결과 이름, `Enter` 및 `Space`, focus 표시와 충분한 실행 영역을 제공한다.
- 맨 앞으로와 맨 뒤로는 나머지 메모의 상대 순서를 유지하면서 대상 메모를 전체 순서의 시작 또는 끝으로 옮기고 모든 활성 메모를 `1..N`의 고유한 `zIndex`로 다시 배정한다. 변경을 한 IndexedDB transaction으로 저장하고 content revision을 바꾸지 않는다.
- 맨 앞으로와 맨 뒤로 저장이 완료돼도 대상과 다른 메모의 `tabIndex`를 바꾸지 않는다. 현재 포커스는 동작 직후 같은 메모에 유지하고 다음 `Tab` 또는 `Shift+Tab`에서도 저장된 `tabIndex` 순서를 따른다.
- 삭제 아이콘은 확인 대화상자 없이 대상 메모를 즉시 제거하고 현재 실행의 LIFO 복구 이력에 스냅샷을 넣는다. 메인 패널 중앙 하단의 5초 토스트가 보이는 동안 최근 삭제를 `취소`할 수 있다. 삭제한 메모에 포커스가 있었다면 다음 `tabIndex` 메모, 이전 메모와 새 메모 제어 순으로 옮기고, 취소로 복원하면 복원된 메모 선택 지점으로 옮긴다.
- 메모의 위, 아래, 왼쪽과 오른쪽 가장자리 및 네 꼭짓점에서만 크기 변경을 시작한다. 별도 핸들이나 문구를 상시 표시하지 않고 방향 cursor와 조절 중 외곽선으로 상태를 알린다. 최소 너비와 높이는 유지하되 작은 고정 상한을 두지 않고 움직이지 않는 반대편 변과 논리 캔버스 경계에서 가능한 최댓값을 계산한다. 내용이 사용자가 정한 크기를 넘으면 메모 안에서 스크롤한다.
- 보이는 캔버스에서 메모나 다른 조작 요소가 아닌 지점을 주 pointer로 누르고 mouse 및 pen `5 CSS px`, touch `10 CSS px`를 넘게 이동하면 시점을 이동한다. 변환되는 보드의 현재 경계 밖에서 시작해도 viewport가 pointer capture를 가져야 하며, 메모 본문 선택과 크기 변경을 가로채지 않는다.
- 새 캔버스 시점 이동을 시작할 때 직전 제스처의 pointer ID, 시작 좌표와 종료 대기 상태를 버리고 현재 화면에 반영된 시점을 새 기준값으로 잡는다. 첫 신뢰할 수 있는 pointer event에서 modifier 표시 상태도 다시 맞추되, 이 정리는 시점을 기본값이나 이전 제스처의 시작점으로 되돌리지 않는다.
- 캔버스 시점 이동은 각 유효한 이동의 마지막 시점을 화면과 확정 후보에 반영한다. `pointerup`은 그 시점을 한 번 확정하고, `pointercancel`, 완료 전 capture 상실, 창 또는 문서 상태 변화는 이미 화면에 반영한 마지막 유효 시점을 보존한 채 제스처만 정리한다. `pointerup` 뒤 정상적인 `lostpointercapture`는 시점을 다시 적용하거나 시작 위치로 되돌리지 않는다.
- 논리 캔버스는 `4096 × 4096` CSS px로 고정하고 `Space+drag`, trackpad 이동, zoom과 모든 메모 맞춤을 함께 제공한다. 메모 외곽이나 패널 표시로 논리 크기를 바꾸지 않는다.
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
- drag 중과 직후에는 속성 패널이 새로 나타나거나 다른 패널로 바뀌지 않고, 캔버스의 `getBoundingClientRect()`로 확인한 계산 inline size와 block size가 애플리케이션 동작 때문에 달라지지 않는다. pointer가 헤더 밖으로 이동해도 위치 변경을 이어간다. 완료 전 `pointercancel` 또는 capture 상실은 시작 geometry를 복원하고, 성공한 `pointerup` 뒤의 `lostpointercapture`는 확정 geometry를 되돌리지 않는다.
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

### 목적과 기준

항목 추가 순서의 원문 스냅샷을 메모 화면의 일괄 복사 패널과 모바일 확인 페이지에서 줄바꿈으로 결합한다. 넓은 패널에서는 항목 하나를 선택하고 pointer drag 또는 선택된 항목 본문의 방향키로 순서를 바꾸며, 패널 밖 놓기와 직접 삭제 버튼으로 제거한다. 저장 목록의 제거만 실행 취소 및 다시 실행할 수 있게 한다. 모바일 확인 페이지는 저장 목록과 분리된 IndexedDB 작업 초안을 길게 누른 뒤 drag하거나 `위치 변경`과 삽입 위치 선택으로 재정렬하고 항목별 동작 선택창에서 복제 및 삭제한다. 이 세 동작은 원본 메모와 사용 횟수를 바꾸지 않는다.

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
- 저장된 목록 관리와 모바일 확인 페이지에서 `위치 변경`을 실행하면 항목 사이에 최소 `24 × 24` CSS px의 삽입 위치 버튼을 표시한다. pointer 또는 키보드로 하나를 실행하면 drag와 같은 재정렬 명령을 사용하고, 취소하면 원래 순서를 유지한다.
- 저장된 목록 관리로 진입한 모바일 페이지의 각 항목 왼쪽에는 재정렬을 시작하는 네이티브 버튼을 두고, 위로 이동, 아래로 이동과 제거 버튼을 drag 없는 대안으로 유지한다.
- 일괄 복사 상태의 `다음`으로 진입한 모바일 확인 페이지는 `confirming` 작업 초안의 항목을 현재 결합 순서로 표시한다. 항목의 동작 아이콘이 아닌 영역을 500ms 동안 누르고 10 CSS px 이내에 머문 뒤에만 touch drag를 시작한다. 활성화되면 들린 항목과 삽입 위치를 색 이외의 변화로 표시한다. 대기 중 범위 밖 이동 및 스크롤, `pointercancel`과 `lostpointercapture`는 순서와 작업 초안을 바꾸지 않고 원래 시각 상태로 복원한다.
- 확인 항목 우측 상단의 접근 가능한 아이콘 버튼은 버튼 가까이에 HTML `popover="auto"` 동작 선택창을 열고 `위치 변경`, `복제`와 `삭제`를 제공한다. 이름 있는 `role="group"` 안의 네이티브 버튼과 일반 `Tab` 순서를 사용하고, 내려받은 여러 `.fig`의 menu 및 action menu에서 확인한 표면, 조밀한 세로 행과 상태 구성을 개인 메모 디자인 토큰으로 구현한다. 열기, light dismiss, `Escape`, 실행 버튼으로의 포커스 복귀, 키보드 실행, `focus-visible`, pressed와 구분된 삭제 상태를 실제 브라우저에서 검증한다. 브라우저 기본 외형, `menu` 역할이나 외부 접근성 부품에 완성도를 맡기지 않는다.
- 복제는 같은 원본 메모 참조 및 원문 스냅샷을 가진 새 항목 ID를 대상 바로 뒤에 만들고, 삭제는 대상 항목 ID 하나만 확인 작업에서 제거한다. 재정렬, 복제와 삭제는 원본 메모 repository, 메모 revision, 저장 목록의 제거 이력과 사용 횟수를 바꾸지 않는다.
- 제거 command는 항목과 이전 index를 이력에 넣는다. 실행 취소는 이전 index에 복원하고 다시 실행은 같은 ID를 제거한다. 직접 제거와 다시 실행이 저장에 성공하면 결과에 실제 제거 ID를 포함하고, 조립 지점이 해당 일괄 복사 선택을 한 번 정리한다. 패널과 저장 목록 관리 route는 별도의 선택 정리 callback을 만들지 않는다.
- 모바일 확인 작업은 기존 저장 목록과 분리한 IndexedDB 초안으로 연결한다. 예기치 않은 route 이동과 새로고침에서는 단계와 순서를 복원하고, 확인 페이지의 뒤로가기는 편집한 항목을 유지한 채 수집 단계로 돌아간다. 수집 헤더 뒤로가기와 확인 페이지의 `취소`는 초안을 지운다. 이전 길게 누르기 선택과 저장 목록 제거 연결은 재사용하지 않는다.
- 실행 취소 뒤 추가, 재정렬 또는 제거가 성공하면 redo를 비운다. 추가와 재정렬 자체는 undo 대상에 넣지 않는다.
- 메모 편집기에 focus가 있으면 애플리케이션 이력 단축키가 편집기 undo를 가로채지 않는다.
- 패널에는 실행 취소와 다시 실행 버튼을 표시하지 않는다. 제거 이력과 키보드 단축키는 유지한다.
- `48rem` 이상에서는 메모 화면 우측 상단의 버튼에서 패널을 연다. `72rem` 이상의 첫 항목 추가 성공은 나란한 오른쪽 패널을 열고, `48rem` 이상 `72rem` 미만에서는 항목 수만 갱신한다.
- `48rem` 미만에서는 일괄 복사 상태의 `다음` 또는 메모 화면 우측 하단의 저장 항목 수 버튼으로 `/batch-copy`에 이동한다. 화면은 진입 자료에 따라 실행 중 확인 작업과 저장 목록 관리를 구분한다.
- 나란한 표현, 모달 표현과 저장 목록 관리로 연 모바일 페이지는 `features/edit-batch-copy`의 같은 목록 UI 및 명령, 일괄 복사 자료와 제거 이력을 사용한다. `다음`으로 연 확인 페이지는 실행 중 작업 사본 명령을 사용하고 저장 목록 이력과 섞지 않는다. `_pages/notes`와 `_pages/batch-copy`가 서로 import하지 않게 한다.
- 모바일 확인 페이지 하단의 `취소`는 Clipboard와 저장된 일괄 복사 자료를 바꾸지 않고 작업 초안을 지운 뒤 메모 화면으로 돌아간다. 저장 목록 관리 페이지의 `취소`는 기존 자료와 이력을 유지한 채 메모 화면으로 돌아간다. `일괄 복사하기`는 현재 화면의 작업 순서와 줄바꿈 구분자로 만든 문자열을 Clipboard에 쓰고 성공 또는 다시 시도할 수 있는 실패 알림을 제공하되 현재 페이지와 작업 초안을 유지한다.
- 넓은 패널에는 결합된 전체 텍스트 미리보기를 표시하지 않는다. `복사`는 현재 순서와 줄바꿈 구분자로 문자열을 만들고 Clipboard에 쓴다. 결과 알림은 캔버스와 패널 밖 주 작업 영역 우측 상단에 고정하며 개별 복사와 일괄 복사 횟수를 모두 바꾸지 않는다.
- 전체 복사 결과 알림은 한 영역에서 갱신하고 포커스를 옮기지 않으며 표시된 시점부터 5초 뒤 사라진다. 새 결과가 오면 5초를 다시 세며 실패 상태에서는 같은 텍스트를 다시 시도하거나 설정을 확인할 수 있다. 저장 목록을 읽지 못한 상태처럼 복구 동작이 계속 필요한 오류는 자동 종료 토스트로 만들지 않고 명시적인 재시도 제어가 있는 오류 영역으로 유지한다.

### 검증 방식

일괄 복사 명령, 항목 선택, 방향키 한 자리 재정렬, 제거 이력과 모바일 확인 작업 초안 명령에는 TDD를 적용한다. 순서, 중복, 선택 전이, 처음 및 마지막 경계, 이전 index, 이력 분기, 삽입 위치 선택, 대상 바로 뒤의 고유 ID 복제, 명시적 취소와 원본 메모 불변 조건은 안정된 상태 전이로 표현할 수 있고 경계 사례가 많다. click, `Enter`, `Space`, `Escape`, 실제 포커스와 live announcement, 길게 누르기 시간, drag 좌표, popover 위치, route 이동과 새로고침에 따른 복원은 TDD를 적용하지 않고 실제 브라우저에서 검사한다.

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
- 저장 목록 관리로 연 모바일 페이지에서 서로 다른 항목 두 개 이상을 준비하고 왼쪽 재정렬 버튼의 유효한 삽입 위치로 목록 순서를 바꾼다. 새로고침 뒤에도 같은 순서를 확인하고 위로 및 아래로 이동 버튼으로 같은 결과를 만들 수 있어야 한다. `취소`는 복사하지 않고 메모 화면으로 돌아가며 자료와 이력을 유지한다.
- 모바일 확인 페이지에서 일반 터치나 세로 스크롤은 순서를 바꾸지 않고, 항목을 500ms 동안 10 CSS px 이내로 누른 뒤 drag하면 활성 상태와 현재 삽입 위치가 나타나며 놓은 위치의 순서가 결합 결과에 반영된다. `pointercancel`과 `lostpointercapture`에서는 작업 초안과 시각 상태가 원래대로 복원된다.
- 확인 항목의 동작 아이콘을 실행하면 실행 버튼 가까이에 개인 메모 디자인 시스템의 `위치 변경`, `복제`와 `삭제`가 있는 작은 선택창이 열린다. 복제는 대상 바로 뒤에 새 ID의 항목을 만들고 삭제는 대상 ID 하나만 제거하며, 세 동작 뒤에도 원본 메모, 메모 revision, 수집 단계 `clickCount`, 저장 목록 제거 이력과 사용 횟수는 바뀌지 않는다.
- 동작 선택창은 보이는 동작 이름, `focus-visible`, pressed와 다른 동작에서 구분된 삭제 상태를 제공한다. 바깥 영역 실행과 `Escape`로 닫히며, 키보드로 위치 변경, 복제 및 삭제를 실행할 수 있고 닫힌 뒤 포커스가 실행 버튼으로 돌아간다.
- 모바일 확인 작업은 route 이동과 새로고침 뒤 같은 단계 및 순서로 복원되고 저장된 일괄 복사 목록은 바뀌지 않는다. 확인 페이지 뒤로가기는 편집한 항목을 유지해 수집 단계로 돌아가며, 수집 헤더 뒤로가기와 확인 페이지 `취소` 뒤에는 작업 초안이 복원되지 않는다.
- 전체 복사는 현재 항목 순서와 줄바꿈 구분자로 만든 정확한 문자열을 Clipboard에 쓰며, 성공과 원인별 실패를 구분한다. 넓은 패널에는 결합 미리보기가 없고 결과 알림은 주 작업 영역 우측 상단에 고정된다. 알림은 포커스를 가져가지 않고 5초 뒤 사라지며 다음 복사 시도에서 같은 영역을 갱신하고 5초를 다시 센다. 어느 결과에서도 항목, 제거 이력과 두 사용 횟수는 바뀌지 않는다.

### 중단 조건

항목 ID가 아닌 원문 값으로 제거해 중복 항목을 잘못 처리하거나, 확인 작업 명령이 원본 메모, 저장된 목록 또는 사용 횟수를 바꾸거나, 편집기 undo와 애플리케이션 undo가 충돌하면 이 단위를 완료하지 않는다. 데스크톱 항목 선택, 키보드 포커스와 drag 놓기 후보를 구분할 수 없거나 방향키 이동 뒤 선택, 포커스 및 위치 안내가 끊기면 해당 결과를 완료하지 않는다. hover 없는 환경에서 직접 삭제 버튼을 사용할 수 없거나 모바일 `위치 변경`과 삽입 위치 선택이 drag와 같은 순서를 만들지 못하면 해당 접근성 결과를 완료하지 않는다. 작업 초안이 명시적 취소 뒤 복원되거나 예기치 않은 새로고침에서 사라지면 자료 수명 구현을 고친 뒤 진행한다.

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
- `file:` URL과 `localhost`가 아닌 HTTP URL에서 자료 Provider와 과업 화면이 시작되지 않고, 카드 없는 화면에 `잘못된 접근입니다.`와 HTTPS 또는 `http://localhost`로 다시 열라는 다음 행동이 보이는지 확인한다. 접속 주소 확인 중에도 장식용 카드 외곽이 없어야 한다.
- 확장 기능이 개입하지 않는 지원 브라우저 profile에서 server HTML, hydration 뒤 DOM과 console을 비교한다. 애플리케이션이 만든 hydration 차이는 수정하고 외부 DOM 변경만 분리해 기록한다.
- 키보드, 단일 포인터, 터치, 한글 IME, 텍스트 선택, 320 CSS px, `48rem` 및 `72rem` 전후, 확대, reduced motion과 고대비 상태를 확인한다.
- 메모 화면에는 왼쪽 사이드바가 없고, 상단 탐색과 메모 작업 동작이 보드 또는 목록을 가리지 않는지 확인한다.
- 메모 화면의 상단 탐색 아래에서 캔버스가 나머지 화면을 채우고 별도 페이지 제목, 메모 개수와 상단 작업 행이 없는지 확인한다. `48rem` 이상에서는 캔버스를 스크롤하거나 이동해도 일괄 복사 패널 버튼이 화면 우측 상단에 유지되는지 확인하고, `48rem` 미만에서는 항목이 있을 때 우측 하단 항목 수 버튼이 메모 조작을 가리지 않는지 확인한다.
- 넓은 화면의 메모에는 짧은 헤더, 항상 편집 가능한 본문과 헤더 오른쪽의 세 아이콘 버튼만 보이는지 확인한다. 헤더의 빈 영역 drag는 위치만, 네 가장자리와 네 꼭짓점 drag는 크기만 바꾸고, 빈 캔버스 drag는 시점만 이동해야 한다. 본문의 일반 click과 drag는 커서 및 선택 범위만 바꾸며 이 조작들이 같은 입력에서 함께 실행되지 않아야 한다.
- 이동이 아닌 헤더 한 번 click과 각 메모의 양의 `tabindex`가 낮은 순서를 따르는 `Tab` 및 `Shift+Tab`으로 메모를 선택하고 선택 및 키보드 포커스를 구분한다. 이 입력은 속성 패널을 새로 열거나 대상을 바꾸지 않아야 한다. 실제 DOM의 `tabindex` 값과 브라우저의 이동 순서를 함께 확인하며, 맨 앞으로 또는 맨 뒤로 보내기가 이 값을 바꾸지 않아야 한다.
- 이동이 아닌 헤더 더블클릭 또는 선택된 메모의 선택 지점에서 실행한 보조 키 없는 `Enter`에서만 속성 패널이 열리는지 확인한다. 선택 지점의 `Enter`는 본문 줄바꿈, 헤더 아이콘 실행, 패널 입력 적용과 입력기 조합 중 `Enter`를 가로채지 않아야 한다. 선택 지점의 `Enter`로 연 직후 첫 X 입력에 포커스가 놓이고, 헤더 더블클릭으로 연 경우 현재 pointer 포커스를 유지해야 한다. 오른쪽 속성 패널에서 대상 메모의 `X`, `Y`, 너비와 높이를 `blur`, 패널 밖 click 및 입력 안의 `Enter`로 적용하며, 너비 `240..4095`, 높이 `180..4095`, X `1..(4096 - width)`, Y `1..(4096 - height)` 밖의 값은 저장 geometry 및 revision을 바꾸지 않아야 한다.
- 메모를 선택한 뒤 빈 캔버스 click과 `Command`를 각각 실행해 메모 선택 ID와 붉은 테두리만 사라지는지 확인한다. 메모와 일괄 복사 항목을 함께 선택한 뒤 상위 임시 조작이 없는 보조 키 없는 `Escape`를 실행하면 두 선택 ID와 테두리가 함께 사라져야 한다. 하위 요소 click과 캔버스 drag는 선택 해제를 함께 실행하지 않고, 속성 패널 대상, 초안, 최근 활성 패널, 일괄 복사 자료와 순서는 유지돼야 한다. 빈 캔버스 click은 캔버스 viewport로 포커스를 옮기고 `Escape`는 현재 포커스를 유지한다. `Command`를 눌렀을 때 헤더 아이콘에 포커스가 있으면 같은 메모 선택 지점으로 옮기고 그 밖의 포커스는 유지한다.
- 헤더 drag를 메모 안팎으로 이어가며 속성 패널이 열리거나 바뀌지 않고 캔버스의 계산 inline size와 block size가 유지되는지 확인한다. 성공한 `pointerup` 뒤 정상적인 `lostpointercapture`가 이어져도 geometry를 되돌리거나 다시 저장하지 않아야 한다. 완료 전 `pointercancel` 또는 capture 상실 뒤 발생할 수 있는 click 및 더블클릭도 선택이나 패널 활성화를 실행하지 않아야 한다.
- `Command`를 누르는 동안 선택 테두리와 헤더가 보이지 않고 헤더를 조작할 수 없지만 메모 크기, 본문 위치와 속성 패널 대상은 유지되는지 확인한다. 본문 `Command+클릭`과 `Command+Option+클릭`은 메모를 다시 선택하거나 속성 패널 대상을 바꾸지 않으며, 포커스가 있는 선택 지점의 `Command+Option+Enter`는 선택 ID가 비워진 뒤에도 그 메모 항목 하나만 추가해야 한다. `keyup`, 창 및 문서 상태 변화, route 이탈과 modifier가 없는 다음 신뢰할 수 있는 입력 뒤에는 헤더만 복원돼야 한다. 합성 event는 실제 상태를 바꾸지 않고 운영체제 및 브라우저 기본 단축키도 계속 동작해야 한다.
- macOS에서 `Shift+Command+5`로 Screenshot 도구를 열어 캡처를 완료한 경우와 취소한 경우를 각각 직접 확인한다. 두 경우 모두 별도 `Command` 입력 없이 헤더가 복원되고 다음 개별 및 일괄 복사가 정상이어야 한다. 이어서 빈 캔버스 drag를 다음 신뢰할 수 있는 pointer 입력으로 실행하고, `pointerup`, 뒤이은 `lostpointercapture`, 창 포커스 전환과 다음 화면 갱신 뒤에도 마지막으로 보인 시점이 유지되는지 확인한다. 이 확인은 브라우저 자동화가 운영체제 단축키 전달을 재현했다는 주장으로 대신하지 않는다.
- 헤더 더블클릭, 선택 지점의 `Enter`와 일괄 복사 동작을 번갈아 실행해 마지막으로 활성화한 오른쪽 패널만 보이는지 확인한다. 한 번의 헤더 click, `Tab` 선택과 선택 해제만으로 패널이 전환되지 않고, 전환이나 선택 해제 때 속성 패널 대상, 속성 초안, 일괄 복사 항목과 제거 이력을 잃지 않아야 한다.
- 메모 삭제 직후 메인 패널 중앙 하단의 5초 토스트가 포커스를 가져가지 않고 나타나며, 연속 삭제에서는 현재 실행의 최근 항목 하나만 안내하는지 확인한다. 토스트가 보이는 동안 `취소`는 최근 삭제부터 같은 원문, geometry와 겹침 순서를 복원하고 복원된 메모 선택 지점으로 포커스를 옮겨야 한다. 삭제 뒤 다른 route를 다녀와도 삭제 완료 시각에서 계산한 원래 5초가 늘어나지 않고, 늦게 끝난 복원 중 새 삭제가 생겨도 시작한 스냅샷만 이력에서 빠져야 한다. 5초 뒤에는 토스트가 화면과 접근성 트리에서 사라지고 새로고침 뒤에는 이력이 없어야 한다.
- Clipboard 거절, IndexedDB transaction 중단, Worker 오류, 오래된 분석 response와 읽을 수 없는 저장 record에서 사용자가 보존된 결과와 다음 동작을 알 수 있는지 확인한다.
- 일괄 복사 패널과 모바일 확인 및 관리 화면에서 전체 복사의 성공과 거절을 확인하고, 두 경우 모두 개별 복사 및 일괄 복사 횟수가 바뀌지 않는지 확인한다. 넓은 패널의 결과 알림은 주 작업 영역 우측 상단에 고정되고 항목 추가 성공만으로는 별도 알림이 나타나지 않아야 한다.
- 넓은 일괄 복사 항목 본문을 click, `Enter`와 `Space`로 선택하거나 해제하고, 선택된 항목 본문의 `ArrowUp`과 `ArrowDown`으로 한 자리씩 재정렬한다. 선택된 항목의 굵은 붉은 테두리, `focus-visible`과 drag 놓기 후보가 구분되고, 이동 뒤 같은 항목에 선택과 포커스가 남으며 새 위치가 보조 기술에 전달돼야 한다. 삭제 버튼과 다른 하위 제어의 방향키는 순서를 바꾸지 않아야 한다.
- 모든 토스트는 표시된 시점부터 5초 뒤 화면과 접근성 트리에서 사라지고, 같은 영역의 새 토스트는 수명을 다시 시작하며 현재 포커스를 가져가지 않아야 한다.
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
- 작은 화면의 제한된 높이 목록에서 짧게 누르면 상세 화면으로 이동하고, 전체 원문을 편집해 명시적으로 저장한 뒤 목록으로 돌아온다. 목록에서 길게 누르면 개별 복사가 한 번만 실행되고 상세 화면으로 이동하지 않으며, 넓은 화면으로 돌아오면 저장 geometry가 복원된다.
- 작은 화면의 목록 헤더 아이콘으로 일괄 복사 상태를 시작하고, 같은 메모의 반복 입력을 포함한 순서와 클릭 횟수가 기록되며 상세 이동이 억제되는지 확인한다. 헤더 뒤로가기는 다음 단계로 이동하지 않고, 하단 `초기화`는 작업 초안과 횟수를 0으로 만들면서 상태를 유지한다. `다음`은 `/batch-copy` 확인 페이지로 이동하며 Clipboard, 원본 메모, 저장 목록과 사용 횟수를 바꾸지 않는다.
- 모바일 확인 페이지에서 일반 터치 및 세로 스크롤과 `500ms` 동안 `10 CSS px` 안에 머문 길게 누르기 뒤 touch drag를 구분한다. drag 활성화, 삽입 위치와 취소 복원 상태를 색 이외의 변화로 확인한다. 우측 상단 동작 선택창은 실행 버튼 가까이에 자체 디자인 시스템 표면으로 나타나고 `위치 변경`, `복제`, `삭제`, 키보드 포커스, pressed와 구분된 삭제 상태를 제공해야 한다. 복제 항목은 대상 바로 뒤에 생기고 재정렬, 복제와 삭제 뒤에도 원본 메모, 메모 revision, 수집 단계 클릭 횟수와 사용 횟수가 유지되는지 확인한다. `pointercancel`, `lostpointercapture`, light dismiss, `Escape`와 포커스 복귀도 확인한다.
- 작은 화면의 우측 하단 저장 항목 수 제어로 일괄 복사 관리 화면에 이동하고, 항목 동작 선택창의 `위치 변경`과 삽입 위치 버튼으로 순서를 바꾼 뒤 하단 `취소`와 `일괄 복사하기`의 서로 다른 결과를 확인한다.
- HTTPS와 localhost HTTP에서 각각 Clipboard와 IndexedDB를 포함한 전체 과업을 완료한다.
- 현재 주소에서 앱을 열 수 없는 경우에는 메모 자료를 열거나 바꾸지 않고 `잘못된 접근입니다.`와 HTTPS 또는 `http://localhost`로 다시 열 수 있는 안내를 확인한다. `지원하지 않는 접속 주소`, `유효하지 않음`, 내부 판정값과 Web API 이름은 보이지 않아야 한다.
- `apps/notes/package.json`의 빌드 명령이 실행 가능한 결과물을 만들고, FSD ESLint 검사에서 허용된 Entities `@x` 외의 같은 계층 import, 역방향 import와 public API 우회가 발견되지 않는다.
- 화면 읽기 프로그램이 화면에 남은 버튼 이름, 복사 결과 알림, 분석 관계와 사용 횟수의 의미를 읽을 수 있고, keyboard focus가 가려지지 않는다.
- 같은 역할의 버튼, 입력과 알림이 다섯 주요 route, 모바일 상세 및 일괄 복사 확인 route와 메모 화면의 일괄 복사 패널에서 같은 디자인 규칙을 사용하고 포커스 표현도 같은 규칙을 따른다. 외부 UI 라이브러리의 기본 테마가 개인 메모 디자인 시스템을 대신하지 않는다.
- 다섯 주요 route, 모바일 상세 및 일괄 복사 확인 route의 계산된 글꼴에서 Pretendard가 제목과 본문의 기본 글꼴이고 serif display 글꼴은 없다. 메모 화면의 목재 결은 메모 내용, 선택, 키보드 포커스와 정렬선을 가리지 않으며, 우측 상단 및 우측 하단 고정 제어는 메모 작업 영역의 주요 동작을 가리지 않는다.
- 화면 문구는 현재 내용, 동작, 필요한 조건, 직접 알아차리기 어려운 상태 및 결과와 오류 뒤 다음 행동만 전달하며 같은 역할의 안내를 겹쳐 보여주지 않는다.
- 메모 화면은 왼쪽 사이드바 없이 상단 탐색으로 다른 화면에 이동할 수 있고, 사용 빈도, 텍스트 분석, 템플릿과 설정 화면에서는 왼쪽 탐색으로 현재 위치를 확인할 수 있다.
- 메모 화면은 별도 페이지 제목과 상단 작업 행 없이 캔버스가 상단 탐색 아래의 나머지 화면을 채운다. `48rem` 이상에서는 일괄 복사 패널 버튼이 캔버스의 이동 및 스크롤과 관계없이 우측 상단에 남고, `48rem` 미만에서는 저장된 일괄 복사 항목이 있을 때 항목 수 버튼이 우측 하단에 남는다.
- 선택된 메모와 일괄 복사 항목의 굵고 끊기지 않는 붉은 테두리, 키보드 `focus-visible`과 drag 놓기 후보를 고대비 상태에서도 구분할 수 있다. Tab 순서는 저장된 양의 `tabindex`가 낮은 순서를 따르고 시각적 겹침이 바뀌어도 유지된다. 한 번의 헤더 click과 Tab 선택은 패널을 열지 않고, 헤더 더블클릭, 선택 지점의 `Enter`와 일괄 복사 동작만 최근 활성 패널을 바꾼다. 빈 캔버스 click과 `Command`는 메모 선택만, 상위 임시 조작이 없는 `Escape`는 메모 및 일괄 복사 항목 선택을 함께 없애며 패널은 하나만 표시된다. 패널 전환과 선택 해제 때 속성 패널 대상, 입력 초안과 숨겨진 패널 자료를 조용히 잃지 않고, `Command` 상태에서 헤더와 선택 테두리가 보이지 않아도 키보드 포커스를 확인할 수 있다.
- 메모 삭제 토스트는 메인 패널 중앙 하단에 남고 오른쪽 `취소`를 키보드로 실행할 수 있다. 삭제된 메모에서 이동할 포커스와 토스트의 수명은 승인된 결정과 일치한다.
- `72rem` 이상에서 첫 항목 추가 성공 때 나타나는 너비 `22rem`의 나란한 오른쪽 패널, `48rem` 이상 `72rem` 미만에서 사용하는 모달 패널과 저장 목록 관리 화면이 같은 항목 및 제거 이력을 사용한다. 모바일 확인 화면은 별도 작업 사본을 사용한다. 넓은 패널의 머리는 `38px`이고 결합 미리보기, 숫자 순서, 위아래 이동, 상시 제거, 실행 취소 및 다시 실행 버튼이 없다. `/batch-copy`는 전역 탐색 항목에 나타나지 않는다.
- 확장 기능이 개입하지 않는 브라우저에서 초기 화면에 애플리케이션이 만든 hydration 오류가 없고, 루트 경고 억제로 외부 변경과 애플리케이션 결함을 함께 숨기지 않는다.

### 중단 조건

문서 검사나 단위 test만으로 완료를 주장하지 않는다. 지원 브라우저의 실제 독립 실행용 결과물, 접근성 및 시각 검토 가운데 하나라도 필요한 증거가 없으면 해당 결과는 완료가 아니라 `needs revision` 또는 `needs human input`으로 남긴다. 선택, 포커스와 속성 패널 대상의 표시가 서로 구분되지 않거나, 모바일의 drag와 `위치 변경` 대안이 같은 저장 명령을 만들지 못하거나, 모바일에서 항목 동작 선택창을 열 수 없으면 관련 사용자 흐름을 완료로 판정하지 않는다. 접속 및 빈 상태와 페이지 폼에 역할 없는 카드 외곽이 남거나 카드 제거 뒤 화면 구획을 이해할 수 없어도 U4와 통합 화면 검증을 완료로 판정하지 않는다.

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

각 자동 검사는 사용자에게 보이는 결과, 저장 불변 조건, 외부 시스템과 주고받기로 정한 동작 또는 순수 알고리즘 결과 가운데 하나를 이름으로 설명해야 한다. 내부 함수명, reducer action 문자열, 호출 횟수, CSS class, DOM 중첩, 구성요소 분리, 무관한 드래그 좌표와 큰 markup snapshot만 확인하는 테스트는 만들지 않는다. 테스트를 위해서만 운영 코드의 추상화를 추가하지 않는다.

## 실행 선택과 재검토 조건

구현에 반드시 필요한 선택은 [구현 필수 결정 교차검증](references/required-implementation-decisions-research.md)의 공식 자료, 현재 저장 구조와 화면 근거를 비교해 다음과 같이 확정했다. 각 값은 해당 작업 단위의 입력이며, 적힌 재검토 조건이 확인되기 전에는 구현 중 임의로 바꾸지 않는다.

- U1에서 package manager, 저장소 workspace 선언, Tailwind CSS와 PostCSS 연결, 정확한 의존성 버전, lockfile, FSD ESLint 설정, 지원 브라우저와 HTTPS 및 localhost HTTP 제공 방식을 확정했다. 다음 작업은 이 설정을 기준으로 삼고, 변경이 필요하면 의존성 및 배포 검토를 다시 수행한다.
- 현재 구현은 브라우저 IndexedDB와 Pointer Events를 직접 사용한다. 이후 wrapper 또는 드래그 package가 필요하면 설치 전에 플랫폼 기능, 직접 의존성과 전이 의존성을 다시 비교한다.
- U4의 글꼴 계열, 애플리케이션 프레임, 메모 캔버스의 시각 방향과 Tailwind CSS, 네이티브 폼 요소, 자체 `shared/ui` 조합은 확정했다. 실제 콘텐츠가 있는 대표 화면에서는 Pretendard 크기 및 굵기, 중립색, 밝은 목재 결, 모서리, 깊이, motion, 화면 밀도와 상태 조합의 구체적인 값만 시각 검토 대상으로 남긴다.
- 외부 접근성 부품 package는 현재 필수 구현에 필요하지 않으므로 추가하지 않는다. 폼과 무관한 복합 상호작용에서 네이티브 Web API의 한계가 실제로 확인된 경우에만 정확한 버전과 전체 의존성을 조사한다.
- 저장 목록 관리와 모바일 확인 페이지의 항목 동작 선택창은 HTML `popover="auto"`, 이름 있는 `role="group"`과 일반 네이티브 버튼을 사용한다. 현재 세 명령에는 ARIA menu 역할을 사용하지 않으며 실행, `Escape`와 light dismiss 뒤 포커스를 해당 실행 버튼으로 돌려준다. 넓은 일괄 복사 패널에는 이 선택창을 제공하지 않는다.
- 현재 로컬 애플리케이션에는 실행 모드를 선택하는 환경변수를 두지 않는다. 계정 및 동기화 백로그를 시작할 때 실행 구성 방식을 다시 결정한다.
- 접속 주소 확인 중에는 별도 카드 없이 진행 상태만 표시한다. 접속 조건을 통과하지 못한 화면은 `잘못된 접근입니다.`와 HTTPS 또는 `http://localhost`로 다시 여는 방법을 제공한다. 카드 형태는 메모와 선택 가능한 일괄 복사 항목처럼 독립된 대상의 전체 조작을 전달하는 경우에만 유지한다.
- 메모 작업 영역의 나란한 오른쪽 패널은 `72rem` 이상에서 너비 `22rem`으로 표시하고, `48rem` 이상 `72rem` 미만에서는 같은 route의 모달로 표시한다. 작은 화면 메모 미리보기는 내용에 따라 짧아지고 `12rem`을 넘지 않으며 IndexedDB geometry를 바꾸지 않는다.
- 메모 헤더 이동과 빈 캔버스 시점 이동은 시작점에서 mouse 및 pen `5 CSS px`, touch `10 CSS px`를 넘은 뒤 drag로 판정한다. 모바일 목록 개별 복사와 모바일 확인 항목 재정렬은 500ms 동안 `10 CSS px` 안에 머문 경우에만 길게 누르기로 판정한다.
- 넓은 화면은 마지막 입력 `800ms` 뒤 자동 저장하고 `blur`, 애플리케이션 내부 route 이동, document hidden과 `pagehide`에서 대기 중인 최신 원문을 같은 흐름으로 즉시 저장한다. 복구 초안을 먼저 기록하고 기준 메모 transaction이 완료된 뒤 지우며 실패하면 입력과 초안을 유지한다. 작은 화면 상세는 명시적으로 저장하고 저장 전 내부 이동에서 계속 편집 또는 변경사항 버리기를 선택하게 하며, 저장 중 중복 실행을 막는다.
- 메모 삭제 토스트는 표시된 시점부터 5초 뒤 사라진다. 연속 삭제는 현재 실행의 LIFO 이력으로 관리하고 최근 항목 하나만 안내한다. `취소`는 토스트가 보이는 동안 최근 항목을 복원하며, 새로고침에서는 이력을 지운다. 삭제 뒤 포커스는 다음 `tabIndex` 메모, 이전 메모, 새 메모 제어 순으로 옮기고 복원 뒤에는 복원한 메모 선택 지점으로 옮긴다.
- 전체 복사 알림도 표시된 시점부터 5초 뒤 사라진다. 한 알림만 유지하고 다음 복사 시도가 내용을 바꾸면 5초를 다시 센다. 성공은 정중한 status로, 실패는 API 부재, 권한 거절 또는 그 밖의 쓰기 실패와 다음 동작으로 구분하고 현재 포커스를 옮기지 않는다.
- 맨 앞으로 및 맨 뒤로 보내기는 모든 활성 메모를 고유한 `1..N` `zIndex`로 다시 배정하고 한 IndexedDB transaction에 저장한다. 기존 동률은 `zIndex`, 생성 시각, ID 순서로 정리하고 transaction 실패에서는 전체 변경을 반영하지 않는다.
- 모바일 일괄 복사는 저장 목록과 분리한 빈 작업 초안으로 시작하고 IndexedDB에 한 개의 활성 작업으로 보관한다. 예기치 않은 route 이탈과 새로고침에서는 복원하고, 수집 화면 헤더 뒤로가기와 확인 페이지의 명시적 취소에서는 지운다. 수집 상태의 길게 누르기는 아무 동작도 하지 않는다. 확인 항목 복제는 대상 바로 뒤에 새 ID로 넣고 원본 메모, 저장 목록과 사용 횟수를 바꾸지 않는다.
- 넓은 일괄 복사 패널은 pointer drag와 선택된 항목 본문의 `ArrowUp` 및 `ArrowDown`으로 같은 재정렬 명령을 사용한다. 데스크톱에는 동작 선택창이나 삽입 위치 버튼을 두지 않는다. 저장 목록 관리와 모바일 확인 페이지에는 항목 동작 선택창의 `위치 변경`과 최소 `24 × 24 CSS px` 삽입 위치 버튼을 같은 저장 명령의 단일 pointer 및 키보드 대안으로 제공한다. 모바일 drag는 `500ms` 안에 `10 CSS px`를 넘지 않은 길게 누르기로 시작하며 스크롤, `pointercancel`과 완료 전 `lostpointercapture`에서 취소한다.
- 상단 탐색과 주 작업 제어는 양의 `tabindex` `1..999`, 메모 선택 지점은 `1000..32767`을 사용한다. 첫 메모는 `1000`, 새 메모는 현재 최댓값에 1을 더한 값을 받는다. 누락, 중복과 범위 밖 이전 값은 유효한 값, 생성 시각, ID 순서로 안정적으로 다시 배정한다. 메모 내부 textarea, 아이콘과 패널 제어는 해당 메모 선택 지점 뒤의 네이티브 순서를 따른다.
- 메모 및 일괄 복사 항목 선택은 대상 전체를 감싸는 굵고 끊기지 않는 붉은 실선, 속성 패널 대상은 바깥쪽 중립색 점선, 키보드 포커스와 drag 놓기 후보는 각각 별도 표시로 구분한다. 선택 지점의 보조 키 없는 `Enter`는 속성 패널을 열고 첫 X 입력으로 포커스를 옮기며, 헤더 더블클릭은 현재 pointer 포커스를 유지한다. 빈 캔버스 click은 메모 선택을 해제하고 캔버스 viewport로 포커스를 옮긴다. 상위 임시 조작이 없는 `Escape`는 메모와 일괄 복사 항목 선택을 함께 해제하고 포커스를 유지한다. 패널을 닫으면 이전 패널을 복원하지 않는다.
- 속성 패널은 너비 `240..4095`, 높이 `180..4095`, X `1..(4096 - width)`, Y `1..(4096 - height)`만 적용한다. 유효하지 않은 초안에서는 패널을 유지하고 첫 오류 입력으로 이동하며, `저장값으로 되돌리기` 뒤에만 닫을 수 있다. 이전 `0` 좌표와 범위 밖 geometry는 가능한 위치와 크기를 유지하면서 이 범위로 보정한다.
- 신뢰할 수 있는 `Command` keydown은 메모 선택만 해제하고 헤더와 아이콘을 보이지 않게 하되 행의 크기를 유지한다. 헤더 아이콘에 포커스가 있으면 같은 메모 선택 지점으로 옮기고 그 밖의 포커스는 유지한다. keyup, 창 및 문서 상태 변화와 modifier가 없는 다음 신뢰할 수 있는 입력에서 헤더 상태를 다시 맞추며 합성 event는 사용하지 않는다. 포커스가 있는 선택 지점의 `Command+Option+Enter`는 메모 선택 ID가 비워진 뒤에도 포커스 대상 ID를 사용해 pointer 보조 키 설정과 관계없이 일괄 복사 항목을 추가한다.
- 넓은 패널의 붉은 직접 삭제 버튼은 hover와 `focus-within`에서 표시하고 hover가 없거나 coarse pointer인 환경에서는 항상 표시한다. 항목 본문은 `aria-pressed`가 있는 toggle button이며 선택된 본문의 방향키 재정렬 뒤 같은 ID의 선택과 포커스를 유지한다. 저장 목록 관리 페이지와 모바일 확인 페이지는 항목 동작 선택창을 통해 drag 없는 조작을 제공한다.

`800ms`, 캔버스 `4096 × 4096 CSS px`, geometry 범위, `72rem` 패널 전환, `12rem` 목록 미리보기 상한, mouse 및 pen `5 CSS px`, touch `10 CSS px`와 `500ms`는 표준이 아니라 첫 구현의 제품값이다. 실제 브라우저에서 입력 손실, 오작동, 도달하기 어려운 조작 또는 일반적인 화면에서 과도한 빈 공간이 확인되면 같은 근거 수집과 결정 기록 절차로 다시 검토한다. 이후 필수 선택이 새로 발견되면 영향을 받는 구현을 멈추고 선택지, 근거, 영향과 재검토 조건을 문서와 계획에 기록한 뒤 해당 구현을 재개한다.

## 계획 완료 판정

이 계획은 문서를 만들었다는 이유로 완료되지 않는다. U1부터 U11까지 요구사항에 연결된 관찰 결과가 있고, 적용한 개발 지침과 결정 기록을 다시 검토했으며, 독립 실행용 결과물의 실제 브라우저 흐름과 기록된 시각 및 접근성 검토가 모두 `pass`인 경우에만 로컬 애플리케이션 완성을 주장할 수 있다.
