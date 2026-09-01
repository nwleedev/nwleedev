---
origin: docs/designs/personal-notes-app-8fd/requirements.md
---

# 로컬 개인 메모 애플리케이션 완성 계획

## 결론

현재 작업은 별도의 백엔드, 데이터베이스와 계정 없이 동작하는 개인 메모 애플리케이션을 모듈별로 완성하는 것이다. 사용자 동작과 저장 규칙을 구현 전에 안정적으로 설명할 수 있는 모듈에만 TDD를 적용하고, Clipboard, IndexedDB, Worker 산출물, 공간형 화면과 드래그처럼 실제 브라우저가 결과를 결정하는 모듈은 브라우저 통합 검사와 담당자 검토로 확인한다. 모든 모듈에 같은 테스트 방식을 강제하지 않는다.

다음 미완료 작업을 시작하기 전에 현재 사용자 동작, 외부에서 사용하는 API, IndexedDB 자료 형식과 오류 처리를 보존 기준으로 확인하고, 적용할 개발 지침을 검토하는 선행 작업을 먼저 완료한다. 기존 코드의 작성 방식을 그대로 복사하지 않고, 요구사항과 승인된 결정이 바꾸도록 정한 부분을 제외한 현재 사용자 동작과 자료 처리를 유지하면서 알려진 안티패턴을 제거한다.

실행 순서는 현재 독립 실행 배포 선택인 Next.js Node.js 서버와 Dedicated Worker가 운영용 빌드에서 동작하는지 먼저 확인한 뒤, 자료 형태와 브라우저 저장, 디자인 시스템과 공통 화면 구조, 메모, 복사 및 누적, 사용 빈도, 텍스트 분석과 템플릿 순으로 진행한다. 정적 사이트 산출물은 만들지 않으며, 이후 작업에 Next.js Server Actions나 Route Handlers가 필요하다고 확인되면 현재 자료 책임과 배포에 미치는 영향을 먼저 검토한다. 각 단위는 선행 결과와 중단 조건을 만족해야 다음 단위의 완료 근거가 될 수 있다.

독립 실행 애플리케이션은 `apps/notes/package.json`이 관리한다. Next.js 라우트는 `apps/notes/app/`에 두고 FSD 코드는 `apps/notes/src/`에 둔다. 모든 FSD 계층을 먼저 만드는 대신 현재 화면, 메모와 템플릿 자료 및 사용자 동작에 필요한 계층만 추가하고, 계층 의존 방향과 slice public API를 각 작업 단위에서 확인한다.

UI는 Tailwind CSS, 네이티브 폼 요소와 자체 `shared/ui`를 바탕으로 개인 메모 애플리케이션 고유의 디자인 시스템을 만든다. 모든 인터페이스 글꼴은 Pretendard를 사용하고, Figma Design 편집기처럼 중립적인 애플리케이션 프레임과 조밀한 도구 배치를 사용한다. 메모 작업 캔버스만 밝은 목재 인상을 갖게 하며, 네이티브 요소의 의미와 기본 동작을 유지하면서 고유 외형과 상태를 적용한다. 폼과 무관한 복합 상호작용만 실제 필요가 확인된 범위에서 외부 접근성 부품을 사용할 수 있다.

메모 화면은 왼쪽 사이드바 없이 공간형 보드와 누적 패널에 가로 폭을 우선 배정한다. 다른 화면으로 가는 탐색은 메모 화면 상단에서 제공하고, 사용 빈도, 텍스트 분석, 템플릿과 설정 화면은 왼쪽 탐색을 유지한다. `48rem` 미만의 메모 목록에서는 길게 누른 순서로 텍스트를 누적하고 우측 하단 항목 수 제어로 모바일 누적 관리 페이지에 이동한다.

사용자에게 보이는 문구는 현재 내용과 동작, 필요한 조건, 바로 알아차리기 어려운 상태 및 결과와 오류 뒤 다음 행동만 전달한다. 화면 구조와 컨트롤이 이미 알려주는 역할, 구현 기술, 빌드 상태와 현재 과업에 필요하지 않은 소개는 표시하지 않는다. 문구를 줄이더라도 입력 조건, 접근 가능한 이름과 사용자가 직접 확인할 수 없는 동작 결과는 유지한다.

계정, 로그인, 동기화, 백엔드와 데이터베이스는 이번 계획에서 제외하며 모든 백로그 가운데 우선순위가 가장 높다. 라이브러리 패키지와 포트폴리오 라우트 연결은 그 뒤의 백로그다. 현재 결과물에는 두 백로그를 위한 화면, 현재 과업에 필요하지 않은 서버 코드나 미리 만든 추상화를 포함하지 않는다.

## 기준선과 문서 책임

첫 계획 커밋 전까지 다음 파일의 현재 검토본을 임시 기준선으로 사용한다. 계획을 처음 커밋한 뒤에는 `plan.md`를 마지막으로 변경한 커밋에 포함된 문서가 기준선이다. Git 개체 ID나 작성 시각을 기준선 식별자로 기록하지 않는다.

- [요구사항의 의도한 결과](requirements.md#의도한-결과)
- [요구사항의 반드시 지킬 조건](requirements.md#반드시-지킬-조건)
- [요구사항의 완료를 확인할 증거](requirements.md#완료를-확인할-증거)
- [요구사항의 초기 범위에서 제외한 백로그](requirements.md#초기-범위에서-제외한-백로그)
- [화면 구성과 공간형 메모 상호작용 조사](references/interface-layout-research.md)
- [개인 메모 데이터 구조 조사 초안](references/data-model-draft.md)
- [로컬 실행 구조와 계정 및 라이브러리 백로그 조사](references/runtime-modes-and-architecture.md)
- [2026년 웹 애플리케이션 시각 디자인과 AI 생성 UI 조사](references/web-visual-design-research-2026.md)
- [개인 메모 UI 디자인 시스템과 사용자 템플릿 시각 비교](references/ui-design-system-visual-comparison.md)
- [개인 메모 애플리케이션 기술 안티패턴](../../dev/personal-notes-app/anti-patterns.md)
- [개인 메모 애플리케이션 테스트 전략](../../dev/personal-notes-app/testing-strategy.md)
- [개인 메모 애플리케이션 테스트 안티패턴](../../dev/personal-notes-app/test-anti-patterns.md)

요구사항 책임자는 사용자에게 필요한 결과와 제외 범위를 관리한다. 결정 책임자는 상호작용, 자료 수명과 검증 방식의 선택을 관리한다. 구현 담당자는 이 계획의 각 작업 단위를 수행하고 관찰 가능한 결과를 남긴다. 시각 및 접근성 담당 검토자는 자동 검사로 결정할 수 없는 읽기 흐름, 조작 가능성과 상태 표현을 판정한다.

### 추가 요구사항의 영향

- U1은 로컬 모드를 정적 HTML과 동일시하지 않고, `next build`와 `next start`를 현재 독립 실행 배포로 사용한다. FSD 위반 판정은 커밋된 별도 검사 스크립트 대신 ESLint가 맡는다.
- U2와 U4는 자료형, 화면과 공개 진입점에서 `analysis`를 사용한다. U9는 분석 slice, Worker, 메시지와 결과 자료의 이름을 같은 용어로 맞춘다.
- U11은 별도의 애플리케이션 백엔드와 데이터베이스 서버 없이 사용자 과업이 완료되는지를 확인한다. localhost HTTP는 Next.js 운영 서버에서 자동 검증하고, HTTPS는 같은 revision을 TLS reverse proxy 또는 배포 플랫폼에서 제공해 확인한다.
- 로컬 실행 형식과 분석 명칭 정정은 U3, U5, U6, U7, U8과 U10의 사용자 동작 및 자료 규칙을 바꾸지 않는다. U10이 참조하는 입력 화면의 이름만 텍스트 분석으로 맞춘다.
- 설정 판정만을 위한 fixture와 일회용 검사 스크립트는 저장소에 추가하지 않는다. 임시 입력이 필요한 한 번의 ESLint 설정 검증은 Git이 무시하는 `temps/`에서 수행하고, 이후에는 실제 소스의 lint와 운영용 빌드를 반복 검증 근거로 사용한다.
- 정적 사이트 배포가 범위에서 제외됐으므로 `static-smoke.mjs`와 자체 정적 서버를 제거한다. 이 스크립트가 맡았던 사용자 결과는 과업별 Playwright Test로 옮기고, IndexedDB 내부 schema, DOM 순서, 운영 코드의 조작 시간과 임의 대기에 결합된 검사는 삭제한다. 같은 목적의 다른 전용 스크립트는 추가하지 않는다.
- U3 브라우저 검사에서 `_pages` slice의 하나뿐인 `index.ts`가 route UI와 조립용 IndexedDB 구현을 함께 다시 내보내면 저장 검사만 가져와도 `next/link`가 평가되는 문제가 확인됐다. route는 `index.ts`, `_app` 조립 지점은 같은 slice의 명시적 `composition.ts`를 가져오도록 public API 책임을 나눈다. 이는 server 및 client 환경 분리가 아니므로 대칭적인 `index.server.ts`와 `index.client.ts`를 만들지 않는다.
- 누적 기능의 첫 위치 변경은 독립 route와 `_pages/accumulator` slice를 제거하고 메모 route의 보조 패널을 추가했다. 이후 모바일 누적 요구사항은 `48rem` 미만의 목록 표현에만 `/accumulator`와 `_pages/accumulator`를 다시 추가하고, `48rem` 이상에서는 승인된 보조 패널을 유지한다. U3부터 U7과 U11이 영향을 받으며 누적 스냅샷, 사용 빈도와 제거 이력의 기존 규칙은 바뀌지 않는다.
- 화면 문구 제한은 U1의 최소 화면, U4의 공통 화면 구조와 U5부터 U10까지 추가할 모든 사용자 문구에 적용한다. U11은 보이는 문자열의 역할과 중복을 최종 확인하며, 자료 규칙과 라우트 수는 바뀌지 않는다.
- 구현 전 검토에서 지원 접속 주소의 실행 중 판정, 누적 패널 전체 복사, 줄 조합 생성 규칙과 IndexedDB 연결 수명의 검증 공백을 확인했다. IndexedDB 저장, 공통 화면 구조, 누적 순서 편집, 줄 단위 텍스트 분석과 통합 완료 검증에 각각 책임을 배정한 뒤 영향을 받는 구현을 진행한다.
- 메모 화면의 왼쪽 사이드바 제거는 공통 화면 구조, 메모 영역의 반응형 전환과 통합 화면 검증에 영향을 준다. 저장 자료, 복사, 누적, 사용 빈도와 분석 규칙은 바뀌지 않는다.
- 현재 동작 보존과 개발 지침 검토는 다음 미완료 작업보다 먼저 수행하고, 이후 각 작업 단위에서 변경한 모듈에 다시 적용한다. 이 선행 작업은 사용자 과업이나 TDD 분류를 바꾸지 않으며, 지침을 따르려면 승인된 동작, 외부 API 또는 저장 자료를 바꿔야 하는 경우 영향을 받는 구현을 멈춘다.
- Pretendard, Figma식 애플리케이션 프레임과 밝은 목재 메모 캔버스 요구는 U4의 글꼴 및 색 토큰, 공통 탐색, 메모 표면과 캔버스 배경을 바꾼다. 별도 메모 제목과 상단 작업 행을 제거하고 캔버스를 상단 탐색 아래의 나머지 화면에 채우며, `48rem` 이상의 누적 제어를 우측 상단에 유지하는 요구는 U4의 화면 구조와 U6 및 U7의 패널 표시 시점을 바꾼다. 모바일 누적 요구는 작은 화면의 우측 하단 항목 수 제어, `/accumulator` 목록과 하단 동작을 같은 디자인 시스템에 추가한다. U11은 실제 브라우저에서 계산된 글꼴, 화면 구성, 두 고정 제어와 목재 결 위의 상태 대비를 확인한다.

### 현재 코드 검토 결과에 따른 선행 정리

현재 코드 검토에서 확인한 다음 문제를 기존 기능을 확장하기 전에 순서대로 해결한다. 각 묶음은 변경 뒤 적용 가능한 자동 검사와 브라우저 결과를 한 차례만 검토하고, 통과한 커밋을 만든 뒤 다음 묶음으로 이동한다.

1. 배포와 검증 책임을 먼저 바로잡는다. 정적 사이트 전용 설정, 자체 정적 서버와 거대한 기본 실행 스크립트를 제거하고, Next.js 운영 서버와 과업별 Playwright Test로 바꾼다. 사용자 결과와 무관한 IndexedDB store 이름, record shape, DOM 순서와 고정 대기 시간 검사는 옮기지 않는다.
2. 메모 편집 중 component가 revision 변화로 다시 mount되지 않게 key를 메모 식별자와 표현 종류에만 연결한다. 제스처 중 geometry는 일시 상태로만 두고 저장 완료 뒤에는 provider가 준 geometry를 사용해 외부 변경도 반영한다. 편집 포커스, 커서와 저장된 배치를 실제 브라우저에서 확인한다.
3. Clipboard adapter는 API 부재, 권한 거절과 그 밖의 쓰기 실패를 구분한 결과를 돌려준다. 알림은 원인에 맞는 다음 행동과 같은 텍스트의 재시도를 제공하고, `Command+클릭`만 설정하는 화면을 Clipboard 권한 해결 경로처럼 연결하지 않는다.
4. 누적 항목 제거 뒤 같은 메모를 다시 선택한 상태에서 실행 취소하면 복원된 항목이 선택 연결을 되찾도록 상태 전이를 고친다. 나란한 패널과 모바일 관리 페이지가 함께 쓰는 편집 명령, 이력, 전체 복사와 목록 UI는 `features/edit-accumulated-text`가 맡고 `features/accumulate-note`는 누적 시작과 선택 연결만 맡는다.
5. `shared/lib/clipboard`, `shared/lib/join-class-names`와 `shared/lib/grapheme`에는 허용 책임과 제외 책임을 설명하는 짧은 README를 둔다. public API 밖의 내부 파일을 가져오거나 개인 메모 업무 규칙을 공통 라이브러리로 옮기지 않는다.
6. 테스트 이름과 검증문은 실제로 확인하는 결과만 설명하도록 맞춘다. 전체 텍스트 복사 검사는 정확한 Clipboard 문자열만 주장하고, 사용 빈도 projection은 메모 ID, content revision, 원문 스냅샷과 세 횟수를 행 순서와 무관하게 확인한다.
7. Worker 응답은 원래 요청의 `requestId`, `algorithm`, 입력 메모 집합과 결과의 두 줄 참조에 묶어 검증한다. 누락 및 중복 입력, 자기 비교, 입력 밖 참조, 같은 쌍의 역순 중복과 비결정적 순서를 거절한다. Worker 오류, 잘못된 메시지, 종료 시 대기 중인 요청 거절과 최신 실행만 수락하는 경합을 각각 확인한다.
8. Worker는 결과가 참조하는 표시 원문을 줄마다 한 번 응답에 포함하고, 결과 쌍에는 줄 참조만 넣어 같은 문자열을 반복 전송하지 않는다. 주 실행 흐름은 검증된 참조와 원문을 연결할 뿐 줄 정규화와 조합 생성을 다시 수행하지 않는다. 대표 입력 측정에서 차이가 확인된 grapheme 수와 n-gram 집합은 한 분석 실행 안에서 줄별로 지연 생성해 재사용한다.
9. Provider value와 callback의 참조 변화는 React Profiler로 실제 영향을 확인하기 전에는 `useMemo`나 `useCallback`을 일괄 추가하지 않는다. 측정에서 불필요한 consumer render가 확인되면 상태와 command Context 분리 또는 안정화 가운데 책임이 더 분명한 방법을 적용한다.

U4의 시각 및 접근성 담당자 승인은 자동 검사나 에이전트 검토로 대신하지 않는다. 그 승인이 없다는 사실은 다른 코드 결함 수정의 중단 사유가 아니지만, 최종 완료 판정은 `needs human input`으로 유지한다.

## 결정 이력과 현재 선택

각 선택의 검토안, 변경 이유, 영향과 다시 검토할 조건은 다음 결정 기록이 관리한다. 계획은 결정의 결과를 연결할 뿐 이력을 다시 요약해 다른 기준을 만들지 않는다.

- [메모 복사와 편집 동작](decisions/note-copy-and-edit.md): 본문 클릭 복사, 선택 드래그 억제와 항상 보이는 독립 동작 버튼
- [메모 누적 실행 동작](decisions/accumulation-activation.md): 항상 보이는 누적 버튼과 설정 가능한 `Command+클릭` 추가 동작
- [공간형 보드와 작은 화면 목록](decisions/responsive-note-presentation.md): 메모 영역의 inline size `48rem`을 기준으로 한 두 표현과 geometry 보존
- [누적 순서와 제거 복구](decisions/accumulator-ordering-and-recovery.md): 누적 시점 원문, 중복 허용, 줄바꿈 결합과 제거 전용 실행 취소 및 다시 실행
- [누적 작업 패널과 모바일 관리 페이지](decisions/accumulator-workspace-panel.md): 넓은 화면의 나란한 패널 및 모달과 작은 화면의 별도 목록 페이지
- [로컬 저장과 실행 중 상태](decisions/local-storage-and-ephemeral-state.md): IndexedDB와 실행 중 상태의 수명, 공통 Provider, 초기 복원 상태와 다중 저장 transaction 책임
- [텍스트 사용 빈도 집계](decisions/usage-counting.md): 메모 ID, content revision과 원문 상태별 두 횟수 및 성공 조건
- [줄 단위 텍스트 분석](decisions/text-analysis.md): 줄 정규화, 정확한 반복, 포함 관계와 grapheme 3-gram Jaccard 정렬
- [템플릿 제안 생성](decisions/template-suggestion.md): 결과 행의 두 원문 전달, 결정적 차이 분석과 범위 선택 기반 수동 작성
- [로컬 실행과 텍스트 분석 Worker](decisions/local-runtime-and-analysis-worker.md): 별도 애플리케이션 백엔드와 데이터베이스 서버 없이 동작하는 로컬 모드, Next.js Node.js 서버와 요청 뒤 만드는 Dedicated Worker
- [모듈별 TDD와 동작 검증](decisions/verification-strategy.md): 순수 규칙만 TDD로 개발하고 브라우저 기능은 실제 실행 결과로 확인하는 분류
- [애플리케이션 패키지 위치와 FSD 구조](decisions/application-package-and-fsd.md): `apps/notes/` 패키지, 얇은 Next.js 라우트와 필요한 FSD 계층만 만드는 구조
- [개인 메모 디자인 시스템과 UI 기반](decisions/application-design-system.md): Tailwind CSS, 네이티브 폼 요소와 자체 `shared/ui`, 그리고 폼과 무관한 접근성 부품의 제한적 사용
- [Pretendard와 Figma식 작업 화면](decisions/figma-inspired-visual-direction.md): Pretendard 글자 체계, 중립적인 애플리케이션 프레임과 밝은 목재 메모 캔버스

초기 권장안을 다시 검토하면서 누적 버튼을 설정에 따라 숨기는 방식, viewport `768px` 고정값, 전체 메모 revision만 사용하는 방식과 보편적인 Jaccard 합격 임계값은 채택하지 않았다. 이 네 변경의 근거와 재검토 조건은 각각 연결된 결정 기록에 남아 있다.

## 범위

### 이번 계획에 포함하는 결과

- 독립 실행하는 Next.js 빌드 결과물
- HTTPS URL과 호스트 이름이 정확히 `localhost`인 HTTP URL에서의 로컬 실행
- 공간형 메모 보드와 작은 화면의 생성 순서 목록
- 메모 작성, 붙여넣기, 편집, 위치 및 크기 변경과 일반 클릭 복사
- 버튼과 `Command+클릭`을 통한 누적, 순서 변경, 제거와 제거 복구
- 작은 화면의 길게 누르기 누적 선택, 우측 하단 항목 수 제어와 모바일 누적 관리 페이지
- 일반 복사, 누적과 합계로 구분한 사용 빈도
- 사용자가 명시적으로 요청하는 줄 단위 텍스트 분석
- 자동 제안과 수동 플레이스홀더를 모두 지원하는 템플릿 및 일회성 결과
- 지원하지 않는 접속 주소와 Clipboard 실패를 설명하는 알림
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
    usage/page.tsx
    analysis/page.tsx
    templates/page.tsx
    settings/page.tsx
    accumulator/page.tsx
  src/
    _app/                      provider, 조립, 전역 스타일
    _pages/                    화면별 slice
      notes/
      usage/
      analysis/
      templates/
      settings/
      accumulator/
    features/                  여러 화면에서 재사용하는 사용자 동작만 배치
    entities/                  메모, 누적, 사용 기록, 템플릿과 사용자 설정 자료 및 규칙
    shared/                    공통 UI와 브라우저 기술 연결
```

`apps/notes/app/`의 route 파일은 `apps/notes/src/_pages/`의 `index.ts`를 연결한다. `apps/notes/app/layout.tsx`는 `apps/notes/src/_app/`의 provider와 전역 스타일을 연결한다. route 파일에 화면 동작, IndexedDB 접근이나 메모, 누적 및 템플릿 규칙을 구현하지 않는다. `_app/composition`이 화면 slice의 provider, 책임별 interface와 브라우저 구현을 가져올 때에는 그 slice의 `composition.ts`를 사용해 route UI를 조립 모듈 그래프에 함께 넣지 않는다. `_pages/notes`와 `_pages/accumulator`는 서로 가져오지 않으며, 두 화면이 함께 사용하는 누적 목록 편집 동작과 UI는 실제 재사용이 확인된 `features/edit-accumulated-text`에 둔다.

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

디자인 토큰은 색, 글자, 간격, 모서리, 테두리, 깊이, motion, 포커스와 제어 요소 크기의 용도를 나타낸다. 각 구성요소에 적용 가능한 기본, hover, `focus-visible`, pressed, disabled, 오류, 진행 중, 고대비와 reduced motion 상태를 정의한다. 실제 콘텐츠와 대표 상태를 담당자가 승인하기 전에는 화면마다 임의 값이나 외부 기본 테마로 스타일을 확장하지 않는다.

보이는 문구마다 내용 식별, 동작 또는 입력 이름, 조건, 상태 또는 결과, 오류 뒤 행동 가운데 맡는 역할을 확인한다. 어느 역할도 없거나 같은 영역의 제목, 컨트롤 및 상태 표현과 같은 내용을 반복하면 삭제하거나 합친다. Next.js, Worker, IndexedDB와 빌드 결과는 검증 근거에만 남기고 사용자 화면에는 쓰지 않는다.

### 자료와 실행 중 상태

```text
IndexedDB
  notes: 원문, 전체 revision, content revision, geometry와 생성 시각
  accumulators: 현재 항목, 원문 스냅샷, 순서와 구분자
  usage: 메모 ID, content revision과 원문 상태별 두 횟수
  templates: 사용자가 저장한 segment와 metadata
  preferences: Command+클릭 사용 여부

애플리케이션 실행 중 메모리
  제거 undo 및 redo
  분석 요청, 진행 상태와 결과
  저장 전 템플릿 제안
  일회성 텍스트 결과
```

IndexedDB transaction의 `complete`가 확인된 뒤에만 저장 성공으로 처리한다. 라우트 이동은 실행 중 상태를 유지하지만 새로고침은 이를 초기화한다. HTTP와 HTTPS, 서로 다른 port는 origin이 달라 같은 IndexedDB 자료를 공유하지 않으므로 두 접속 방식의 검증은 각각 독립된 자료로 수행한다.

### 복사와 누적 흐름

```text
읽기 본문 일반 클릭
  -> 텍스트 선택 드래그 여부 확인
  -> Clipboard 쓰기
  -> 성공하면 일반 복사 횟수 저장
  -> 횟수 저장 실패 시 복사 성공은 유지하고 기록 실패 알림

누적 버튼 또는 허용된 Command+클릭
  -> 현재 원문과 content revision 스냅샷
  -> 누적 항목 추가와 누적 횟수 증가를 한 transaction으로 저장
  -> transaction 전체가 완료된 경우에만 성공 알림
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
- 메모 작성, 편집, 복사, 누적, 저장 복원과 변경한 화면의 오류 처리가 승인된 변경을 제외하고 같이 동작한다.
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
          -> U6 복사, 누적 시작과 집계 저장
            |-> U7 누적 편집과 제거 복구 -> U8 사용 빈도 화면 -|
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

메모, 누적, 사용 빈도, 분석과 템플릿이 공유할 자료 형태와 외부 입력 경계를 정하고, 브라우저 구현을 UI에 숨겨 전달할 조립 구조를 만든다. [데이터 구조 조사 초안](references/data-model-draft.md), [로컬 저장과 실행 중 상태 결정](decisions/local-storage-and-ephemeral-state.md)과 [기술 안티패턴 지침](../../dev/personal-notes-app/anti-patterns.md)이 기준이다.

### 선행 조건

U1의 `apps/notes` package, TypeScript 및 Zod 버전, module alias와 FSD ESLint 검사가 확정되어야 한다.

### 변경 후보

- `apps/notes/src/entities/note/model/*`
- `apps/notes/src/entities/accumulator/model/*`
- `apps/notes/src/entities/usage/model/*`
- `apps/notes/src/entities/template/model/*`
- `apps/notes/src/entities/preference/model/*`
- `apps/notes/src/_pages/analysis/model/*`
- 각 책임을 사용하는 slice의 `model/*` interface
- `apps/notes/src/_app/providers/PersonalNotesProvider.tsx`
- `apps/notes/src/_app/composition/createLocalApplication.ts`
- 각 model 파일과 같은 slice의 `*.test.ts`

### 작업

- 반복 접두어 대신 `note.id`, `note.revision`, `note.contentRevision`, `algorithm.type`과 `algorithm.version`으로 함께 이동하는 값을 묶는다.
- 메모 원문이 바뀔 때만 content revision이 바뀌고 geometry만 바뀔 때는 전체 revision만 바뀌는 규칙을 만든다.
- 외부 입력, IndexedDB record와 Worker message를 `unknown`에서 검증하는 Zod schema를 책임별로 나눈다. React Hook Form 입력, application command와 저장 record를 하나의 만능 schema로 만들지 않는다.
- 저장, Clipboard, 분석과 ID 생성을 위한 interface는 구체적인 책임을 드러내는 이름으로 정의한다.
- 누적 스냅샷 추가와 사용 횟수 증가는 `AccumulationWriter`의 한 동작으로 정의해 transaction 책임을 두 repository 호출로 나누지 않는다.
- 각 entity, page와 feature slice는 외부에서 사용할 항목만 public API로 명시하며, 같은 slice 안에서는 public API를 역으로 가져오지 않는다. page 전용 동작을 이름만 보고 `features`로 옮기지 않는다.
- `shared/ui`와 `shared/lib`는 전체를 다시 내보내는 하나의 barrel을 만들지 않는다. 각 구성요소와 내부 라이브러리는 자체 public API를 두고, 내부 라이브러리 README에 허용할 책임과 제외할 책임을 기록한다.
- composition root가 브라우저 구현과 명령 및 조회를 한 번 조립하고, `_app/providers`는 아래 계층이 정의한 필요한 동작만 제공하는 provider에 명시적인 의존성을 전달한다. Provider는 공통 루트 layout 아래에서 라우트 이동에도 유지하며, 생성 과정에서 브라우저 전역을 읽지 않는다. 아래 계층이 `_app`을 가져오거나 임의 token 조회 및 전역 singleton을 사용하지 않는다.

### 검증 방식

부분적으로 TDD를 적용한다. content revision 불변 조건과 승인된 스키마의 성공 및 실패 결과는 구현 전에 입력과 결과를 안정적으로 쓸 수 있어 TDD가 필요하다. interface 선언, composition root와 provider 연결은 TDD 대상이 아니며 타입 검사, import 방향과 라우트 기본 실행 검사로 확인한다.

- 원문 변경, geometry 변경과 두 변경의 조합에서 두 revision 결과가 결정과 일치한다.
- 누락 필드, 잘못된 revision, 빈 식별자와 알 수 없는 Worker message가 schema 경계에서 거절된다.
- UI 모듈이 IndexedDB, `navigator.clipboard`나 Worker 생성자를 직접 가져오지 않는다.
- ESLint가 FSD 역방향 import와 slice 내부 파일을 외부에서 직접 가져오는 코드를 실패로 판정한다.
- provider 없이 렌더링된 개발 오류는 누락된 조립 책임을 식별할 수 있고, 일반 사용 중 Service Locator 조회 실패가 발생하지 않는다.

### 중단 조건

같은 속성 이름이 전체 revision과 content revision 가운데 무엇을 뜻하는지 구분되지 않거나, 저장 record와 application 객체 변환 책임이 정해지지 않으면 U3을 시작하지 않는다.

## U3. IndexedDB 저장과 실행 중 상태 수명

### 목적과 기준

사용자가 만든 현재 자료를 새로고침 뒤에도 유지하고, 제거 이력과 분석 파생 상태는 애플리케이션 실행이 끝날 때 지운다. [로컬 저장과 실행 중 상태 결정](decisions/local-storage-and-ephemeral-state.md)이 보관 범위와 성공 조건을 정한다.

### 선행 조건

U2의 객체, 레코드 스키마와 책임별 저장 interface가 필요하다. U1에서 IndexedDB wrapper를 승인하지 않았다면 브라우저 표준 API로 구현한다.

### 변경 후보

- `apps/notes/src/shared/lib/indexed-db/*`
- `apps/notes/src/_app/composition/indexed-db/openPersonalNotesDatabase.ts`
- `apps/notes/src/entities/note/api/IndexedDbNoteRepository.ts`
- `apps/notes/src/entities/accumulator/api/IndexedDbAccumulatorRepository.ts`
- `apps/notes/src/_pages/notes/api/IndexedDbAccumulationWriter.ts`
- `apps/notes/src/entities/usage/api/IndexedDbUsageRepository.ts`
- `apps/notes/src/entities/template/api/IndexedDbTemplateRepository.ts`
- `apps/notes/src/entities/preference/api/IndexedDbPreferenceRepository.ts`
- 각 저장 구현과 같은 slice의 `*.browser.test.ts`
- `apps/notes/src/_app/providers/session/createSessionState.ts`

### 작업

- `notes`, `accumulators`, `usage`, `templates`와 `preferences` object store 및 첫 스키마 버전을 만든다.
- `upgrade`, `blocked`, `versionchange`, transaction abort와 읽을 수 없는 record를 명시적인 결과로 처리한다.
- 다른 연결 때문에 upgrade가 `blocked`되면 안내 상태를 알리되 open 요청을 실패로 확정하지 않는다. 방해하는 연결이 닫힌 뒤 같은 요청이 upgrade와 open을 계속 완료하게 한다.
- 실행 중인 open 요청을 보유한 연결 관리자를 닫으면 그 요청의 세대를 무효화한다. 늦게 완료된 이전 요청은 즉시 닫고 현재 연결이나 이후 open 요청을 덮어쓰지 않는다.
- 첫 자료 읽기는 `불러오는 중`, `사용 가능한 빈 상태`, `자료 표시`, `읽기 실패`와 `다른 탭으로 인한 대기`로 구분한다. 첫 읽기가 끝나기 전과 읽기 실패 중에는 변경 동작을 제공하지 않고, 실패 상태에는 다시 시도, 다른 탭 확인과 기존 자료를 덮어쓰지 않았다는 설명을 제공한다.
- `IndexedDbAccumulationWriter`가 누적 항목과 사용 횟수 변경 request를 같은 readwrite transaction에 등록하고 외부 비동기 작업을 transaction 안에서 기다리지 않게 한다.
- transaction의 개별 request가 아니라 `complete`를 성공 기준으로 사용한다.
- 애플리케이션 실행 동안 유지할 session state에 제거 이력, 길게 눌러 추가한 누적 항목 ID와 메모 선택 상태의 연결, 분석 상태, 저장 전 제안과 일회성 출력을 두고 라우트 구성요소가 없어져도 유지한다.
- 영구 저장 요청이 승인되더라도 백업 완료로 표시하지 않는다.
- IndexedDB 통합 검사는 Vitest Browser Mode에서 운영 repository를 직접 가져와 실행한다. `_app` 검사는 화면 slice의 `composition.ts`만 가져오고 route UI를 함께 평가하지 않으며, 테스트용 route나 운영 코드 분기를 만들지 않는다.

### 검증 방식

TDD를 적용하지 않는다. IndexedDB의 transaction 수명, upgrade와 origin별 보관은 가짜 저장소로 정확히 재현하기 어렵다. 저장 interface에 정한 동작을 기준으로 구현한 뒤 실제 브라우저 저장소를 사용하는 통합 검사로 판정한다. U2에서 이미 검증한 순수 레코드 스키마를 다시 내부 호출 횟수로 검사하지 않는다.

- 메모, 누적 목록, 횟수, 템플릿과 설정은 새로고침 뒤 복원된다.
- 첫 자료 읽기 전에는 빈 상태를 표시하거나 새 메모를 만들 수 없고, 읽기 완료 뒤에만 실제 빈 상태 또는 저장된 자료를 보여준다.
- 분석 결과, 저장 전 제안, 제거 이력과 모바일 메모 선택 연결은 라우트 이동 뒤 유지되지만 새로고침 뒤에는 없다. 새로고침 뒤에도 IndexedDB의 누적 항목은 남는다.
- 운영용 빌드 중 Provider 조립이 브라우저 전역 접근으로 실패하지 않고, Next.js 운영 서버의 라우트 이동 뒤에도 같은 실행 중 상태를 읽는다.
- 의도적으로 transaction을 중단하면 그 transaction이 바꾸는 object store가 일부만 갱신되지 않는다.
- 누적 항목 쓰기를 등록한 뒤 같은 transaction의 사용 횟수 쓰기를 실패시키면 두 object store가 모두 이전 상태를 유지한다.
- 다른 database version을 연 탭이 있을 때 `blocked` 안내가 나타나고 방해하는 연결을 닫으면 원래 open 요청이 완료된다. `versionchange` 안내에서는 현재 연결을 닫고 다시 시도할 수 있다.
- open 진행 중 닫기, 곧바로 다시 열기와 React Strict Mode의 setup, cleanup, setup 순서에서 이전 open 결과가 현재 연결을 덮어쓰지 않는다.
- HTTPS와 localhost HTTP에서 만든 자료가 서로 섞이지 않는다.

### 중단 조건

transaction 일부 성공을 사용자가 성공으로 보거나 스키마 upgrade가 조용히 멈추면 U5와 U6을 시작하지 않는다. 첫 스키마 버전 뒤 자료 형태를 바꾸면 migration과 이전 레코드 fixture를 함께 추가하기 전에는 변경을 완료하지 않는다.

## U4. 개인 메모 디자인 시스템과 공통 화면 구조

### 목적과 기준

개인 메모의 공간 작업 특성을 반영한 고유 디자인 시스템을 대표 화면에서 확정하고, 그 토큰과 구성요소로 로컬 애플리케이션의 다섯 주요 route, 모바일 누적 관리 route, 메모 화면의 누적 패널, 화면별 탐색, 알림과 반응형 화면 구조를 만든다. [개인 메모 디자인 시스템과 UI 기반 결정](decisions/application-design-system.md), [Pretendard와 Figma식 작업 화면 결정](decisions/figma-inspired-visual-direction.md), [누적 작업 패널과 모바일 관리 페이지 결정](decisions/accumulator-workspace-panel.md), [화면 구성 조사](references/interface-layout-research.md), [시각 디자인 조사](references/web-visual-design-research-2026.md)와 [공간형 보드와 작은 화면 목록 결정](decisions/responsive-note-presentation.md)이 기준이다.

### 선행 조건

U1의 라우트, Tailwind CSS 및 운영용 CSS 확인과 U2의 provider가 필요하다.

### 변경 후보

- `apps/notes/app/page.tsx`
- `apps/notes/app/usage/page.tsx`
- `apps/notes/app/analysis/page.tsx`
- `apps/notes/app/templates/page.tsx`
- `apps/notes/app/settings/page.tsx`
- `apps/notes/app/accumulator/page.tsx`
- `apps/notes/src/_pages/{notes,usage,analysis,templates,settings,accumulator}/index.ts`
- `apps/notes/src/_app/ui/navigation/*`
- `apps/notes/src/_app/ui/feedback/*`
- `apps/notes/src/_app/styles/{globals,tokens}.css`
- `apps/notes/src/shared/ui/{button,icon-button,text-field,textarea,native-select,checkbox,field-message}/*`
- 실제 필요가 승인된 폼과 무관한 접근성 구성요소의 `apps/notes/src/shared/ui/*`

### 작업

- `/`에는 메모 보드 또는 목록과 `48rem` 이상에서 열고 닫는 누적 작업 패널을 배치한다. 나머지 주요 route에는 사용 빈도, 텍스트 분석, 템플릿과 설정을 배치하고, `/accumulator`에는 모바일 누적 관리 목록을 배치한다. 계정, 동기화와 서버 상태 전용 route는 만들지 않는다.
- 각 `app/**/page.tsx`는 같은 라우트를 담당하는 `_pages` slice의 공개 화면만 연결하고, 화면 구성과 상태 처리는 `_pages`에 둔다.
- 사용 빈도, 텍스트 분석, 템플릿과 설정 화면은 페이지 제목, 주요 동작, 주 콘텐츠 및 상태 알림을 공유하고 왼쪽 탐색을 사용한다. 메모 화면은 별도 페이지 제목과 상단 작업 행 없이 상단 탐색 바로 아래에서 캔버스를 시작한다. 메모 화면과 모바일 누적 관리 페이지는 왼쪽 사이드바를 사용하지 않는다. 모바일 누적 관리 페이지는 메모 화면으로 돌아가는 동작과 하단 작업을 우선하며, 작은 화면에서는 전역 탐색을 접을 수 있어야 한다.
- 공통 화면과 자료 Provider를 시작하기 전에 현재 URL의 protocol, hostname과 secure context 여부를 판정한다. HTTPS 또는 호스트 이름이 정확히 `localhost`인 HTTP만 계속 진행하고, 지원하지 않는 주소에서는 HTTPS 또는 `http://localhost`로 다시 접속하라는 안내 화면만 제공한다.
- 보이는 문자열마다 내용 식별, 동작 또는 입력 이름, 조건, 상태 또는 결과, 오류 뒤 행동 가운데 역할을 지정한다. 제목과 컨트롤을 되풀이하는 안내, 구현 기술 및 빌드 상태 설명과 과업에 필요하지 않은 소개 문구는 제거한다.
- 색, 글자, 간격, 모서리, 테두리, 깊이, motion, 포커스, 제어 요소 크기와 화면 밀도를 용도별 디자인 토큰으로 정의한다. 화면에서 같은 임의 값을 반복하거나 색 이름을 업무 상태 이름처럼 사용하지 않는다.
- 제목, 본문, 버튼, 입력과 상태 문구에는 Pretendard를 사용하고 serif display 글꼴을 제거한다. 제목 위계는 크기, 굵기, 행간과 자간으로 만든다.
- 공통 탐색, 도구 영역과 패널은 중립적인 짙은 회색 및 차가운 회색 표면, 얇은 구획선과 조밀한 간격을 사용한다. 메모 화면은 왼쪽 사이드바와 캔버스를 밀어내는 도구 행을 추가하지 않고 상단 탐색과 캔버스 위 제어로 같은 역할을 제공한다.
- 메모 작업 캔버스는 낮은 대비의 밝은 목재 색과 결을 사용한다. 메모, 누적 패널과 제어 요소는 중립색 표면을 사용하고 종이 질감이나 어긋난 짙은 그림자를 반복하지 않는다.
- 메모 화면은 현재 위치를 상단 탐색에서 전달하고 별도 페이지 제목을 표시하지 않는다. 사용 빈도, 텍스트 분석, 템플릿과 설정 화면은 첫 자료나 주요 제어가 제목보다 먼저 읽히도록 조밀한 페이지 제목을 사용한다. 모바일 누적 관리 페이지는 목록의 목적을 식별하는 제목과 메모 화면으로 돌아가는 동작을 제공하되 설명 문단을 반복하지 않는다.
- 자체 `shared/ui`의 단순 폼 구성요소는 실제 `button`, `input`, `textarea`와 `select`를 렌더링하고 checkbox는 `input[type="checkbox"]`로 렌더링하며, 네이티브 속성, `name`, 이벤트와 ref를 전달한다. Tailwind CSS로 고유 외형을 적용하며 브라우저 기본 스타일에 완성도를 맡기지 않는다.
- 단순 입력은 React Hook Form의 `register`로 연결할 수 있게 하고 자체 폼 구성요소가 `Controller` 또는 `useController`를 요구하지 않게 한다. 폼 입력값을 만드는 새로운 복합 제어가 필요하면 자체 구현이나 외부 부품을 추가하기 전에 디자인 시스템 결정을 다시 검토한다.
- Dialog, Menu와 Tooltip처럼 폼 입력값을 만들지 않는 복합 상호작용이 실제 화면에 필요하면 네이티브 HTML 및 Web API로 충족할 수 있는지 먼저 확인한다. 외부 접근성 부품이 필요하면 정확한 package와 전체 의존성을 검토하고, import 및 API 변환을 외부 부품을 감싸는 `shared/ui` 구성요소 안에 둔다.
- 각 `shared/ui` 구성요소는 자체 public API를 두고 전체 UI를 한 번에 다시 내보내는 barrel을 만들지 않는다. 화면과 업무 동작을 구현하는 모듈은 외부 UI 패키지를 직접 가져오지 않는다.
- 메모 영역의 inline size를 기준으로 `48rem` 미만에서 목록과 모바일 누적 표현을 선택할 자리를 만들고 User-Agent 분기를 두지 않는다.
- `48rem` 이상에서는 메모와 누적 작업 패널의 실제 inline size를 기준으로 나란한 패널과 같은 route의 모달 패널을 전환한다. 나란한 표현은 두 영역을 동시에 조작할 수 있어야 하고, 모달 표현은 바깥 메모 영역을 inert 상태로 만들며 열기 및 닫기 포커스를 관리해야 한다.
- `48rem` 이상의 누적 작업 패널 버튼은 화면 우측 상단에 유지하고 캔버스를 밀어내는 별도 행을 만들지 않는다. `48rem` 미만에서는 누적 항목이 하나 이상일 때 우측 하단에 현재 항목 수를 표시하는 고정 버튼을 제공하고 `/accumulator`로 이동한다. 두 제어는 항목 수와 단위를 접근 가능한 이름 또는 연결된 상태로 전달하며 개수는 시각적으로 동작 이름과 구분한다.
- 넓은 화면의 첫 누적 성공은 오른쪽 패널을 열어 새 항목을 보여주되 현재 포커스를 옮기지 않는다. 나란한 표시 공간이 부족한 화면에서는 모달을 자동으로 열지 않고 항목 수와 상태를 갱신한다.
- 모바일 누적 관리 페이지는 중립색 표면의 세로 목록, 각 항목 왼쪽의 재정렬 버튼과 하단의 `취소` 및 `복사` 버튼을 사용한다. 우측 하단 항목 수 제어와 하단 동작은 운영체제 안전 영역, 화면 확대와 키보드 포커스에서 가려지지 않아야 한다.
- 사용 빈도 빈 상태는 작은 화면에서 가로 이동 없이 보여준다. 실제 항목은 좁은 화면에서 원문과 일반 복사, 누적 및 합계를 한 묶음으로 재배치할 수 있는 구조를 사용한다.
- 실제 긴 한국어 메모, 여러 줄, URL 형식 문자열, 빈 화면, 오류, 진행 중과 키보드 포커스 상태로 대표 화면을 만든다.
- 공통 자료 상태 영역은 초기 불러오기, 사용 가능한 빈 상태, 자료 표시, 읽기 실패와 다른 탭 대기를 구분하며 각 상태에서 가능한 다음 동작을 보여준다.
- 기본, hover, `focus-visible`, pressed, disabled, 오류, 진행 중, 고대비와 reduced motion 가운데 대표 구성요소에 적용 가능한 상태를 확인한다. 상태는 색 하나에 의존하지 않고 네이티브 의미, 문구와 형태를 함께 사용한다.
- 시각 조사에서 제안한 글꼴, 색, 모서리, 깊이와 motion 후보를 실제 콘텐츠가 있는 대표 화면에 적용해 담당자 검토를 받는다. 개인 메모의 공간 작업 특성, 정보 위계와 상태 식별이 승인되기 전에는 모든 화면에 세부 스타일을 확장하지 않는다.

### 검증 방식

TDD를 적용하지 않는다. 디자인 토큰, 구성요소 외형, 라우트 구성, container query, 읽기 흐름과 시각적 위계는 class 이름이나 DOM 내부 구조를 고정하는 단위 검사보다 실제 렌더링, 접근성 검사와 담당자 검토가 직접적인 근거다.

- 다섯 주요 route와 `/accumulator`를 Next.js 운영 서버에서 직접 열고 새로고침해도 화면이 열린다. `/accumulator`는 전역 탐색에 나타나지 않고 작은 메모 화면의 우측 하단 항목 수 제어에서만 일반 진입 경로를 제공한다.
- HTTPS와 `http://localhost`에서는 공통 화면이 열리고, `file:`과 `localhost`가 아닌 HTTP 판정에서는 자료 Provider를 시작하지 않은 채 지원 주소 안내가 보인다.
- 로컬 탐색에는 계정과 동기화 항목이 없다.
- 메모 화면에는 왼쪽 사이드바가 없고 상단 탐색으로 다른 네 화면에 이동할 수 있다. 나머지 화면에서는 왼쪽 탐색으로 현재 위치와 같은 이동 대상을 확인할 수 있다.
- DOM 검사에서 단순 폼 제어가 승인된 네이티브 HTML 요소로 렌더링되고, 이름, 설명, 오류, 키보드 포커스와 네이티브 폼 참여가 유지된다.
- 같은 역할의 버튼, 입력과 알림을 여러 route에서 실행했을 때 같은 디자인 토큰, 상태 규칙과 `shared/ui` 구성요소를 사용한다. 이 검사는 class 문자열이 아니라 렌더링된 사용자 상태와 동작으로 판정한다.
- 다섯 주요 route와 모바일 누적 관리 route의 제목, 본문, 버튼, 입력과 상태 문구의 계산된 `font-family`에서 Pretendard가 기본 글꼴이며 serif display 글꼴을 사용하지 않는다.
- 넓은 메모 화면에서 중립적인 상단 탐색 바로 아래의 밝은 목재 캔버스가 보이는 화면의 나머지 너비와 높이를 채우며, 별도 `메모` 제목, 메모 개수와 상단 작업 행이 없다. 중립색 메모와 캔버스를 구분할 수 있고 목재 결은 긴 한국어 메모, 포커스, 선택 및 정렬선의 대비를 방해하지 않는다.
- 320 CSS px, `48rem` 직전과 직후, 200% 및 400% zoom과 화면 분할에서 핵심 동작 영역이 가려지지 않는다.
- 320 CSS px의 사용 빈도 화면에서 빈 상태와 일반 복사, 누적 및 합계의 의미를 가로 이동 없이 확인할 수 있다.
- 누적 작업 패널 버튼과 모바일 항목 수 버튼의 접근 가능한 이름 또는 연결된 상태가 현재 개수를 전달한다. 두 자리와 세 자리 개수에서도 각각 우측 상단과 우측 하단 위치를 유지하고 메모 배치를 바꾸지 않는다.
- 비어 있는 누적 패널을 나란한 표현과 모달 표현으로 각각 열어 제목, 닫기 동작과 사용 가능한 빈 상태를 확인하고, 모달 표현을 `Escape`와 닫기 버튼으로 닫은 뒤 포커스가 실행 버튼으로 돌아온다. 실제 항목, 결합 미리보기와 이력의 공유는 U7에서 확인한다.
- 320 CSS px에서 누적 항목이 없으면 우측 하단 항목 수 버튼이 보이지 않고, 항목이 생기면 메모 조작을 가리지 않는 위치에 나타난다. `/accumulator`에서는 목록, 왼쪽 재정렬 버튼과 하단 두 동작을 가로 이동 없이 확인할 수 있다.
- 키보드 포커스, 오류, 성공, 빈 상태와 진행 상태가 색 하나에만 의존하지 않는다.
- 고대비와 reduced motion 설정에서도 포커스, 선택, 오류와 진행 상태를 구분할 수 있다.
- 외부 접근성 부품을 추가했다면 승인된 폼과 무관한 구성요소에서만 import하고 외부 기본 테마가 실제 화면에 나타나지 않는다. 추가하지 않았다면 불필요한 package가 lockfile에 없다.
- 범용 카드 격자, 장식용 그라데이션과 hover 전용 동작이 정보 구조를 대신하지 않는지 담당자가 검토한다.
- 제목, 탐색, 컨트롤, 빈 상태, 진행 상태와 오류 문구를 함께 읽었을 때 같은 역할을 반복하지 않으며, 직접 알아차리기 어려운 결과와 오류 뒤 다음 행동은 빠지지 않았는지 담당자가 검토한다.

### 중단 조건

대표 화면의 정보 위계, 디자인 토큰 역할, 네이티브 폼 구성요소와 사용자가 반드시 구분해야 하는 상태를 담당자가 승인하지 않으면 U5를 시작하지 않는다. 공통 화면 구조가 작은 화면에서 주 콘텐츠를 가리거나, 단순 입력이 불필요하게 제어 상태를 강제하거나, 외부 기본 테마가 화면에 드러나면 이 문제를 고치기 전에는 디자인 시스템을 다른 화면으로 확장하지 않는다.

## U5. 메모 작성, 편집과 공간 배치

### 목적과 기준

메모를 만들고 다른 애플리케이션의 텍스트를 붙여넣어 편집하며, 넓은 화면에서는 위치와 크기를 바꾸고 작은 화면에서는 같은 자료를 목록으로 다룬다. [메모 복사와 편집 동작 결정](decisions/note-copy-and-edit.md)과 [공간형 보드와 작은 화면 목록 결정](decisions/responsive-note-presentation.md)이 조작을 정한다.

### 선행 조건

U2의 revision 규칙, U3의 메모 저장과 U4의 두 화면 표현이 필요하다.

### 변경 후보

- `apps/notes/src/_pages/notes/ui/NoteBoard.tsx`
- `apps/notes/src/_pages/notes/ui/NoteList.tsx`
- `apps/notes/src/_pages/notes/ui/NoteCard.tsx`
- `apps/notes/src/_pages/notes/ui/NoteEditor.tsx`
- `apps/notes/src/_pages/notes/ui/NoteGeometryControls.tsx`
- `apps/notes/src/_pages/notes/*.browser.test.ts`

### 작업

- 메모 생성, 붙여넣기, 편집 완료와 `Escape` 종료가 현재 입력을 보존해 IndexedDB에 저장되게 한다.
- 새 메모 동작은 캔버스 위의 조밀한 제어에서 빈 상태와 자료가 있는 상태 모두 같은 위치를 유지하고 캔버스를 밀어내는 별도 행을 만들지 않는다. 빈 상태에서 실행하면 새 메모의 편집 위치를 바로 알 수 있게 한다.
- 메모 입력, 위치와 크기 조절에는 U4에서 승인한 네이티브 기반 `shared/ui` 구성요소를 사용한다. 화면 전용 편집 상태와 업무 동작을 `shared/ui`로 옮기지 않는다.
- 읽기 본문, 이동 손잡이, 복사, 누적 및 편집 버튼과 크기 조절 손잡이를 형제 동작으로 분리한다.
- 읽기 본문에서 텍스트 범위를 선택할 수 있게 하고 포인터 선택이 메모 이동이나 편집 전환으로 이어지지 않게 한다.
- 보드는 메모 외곽 범위에 따라 확장하고 pan, zoom과 모든 메모 맞춤을 제공한다. 내용이 사용자가 정한 크기를 넘으면 메모 안에서 스크롤한다.
- 드래그 외에도 위치 및 크기의 숫자 입력과 단계 조절 동작을 제공한다.
- 작은 화면 목록은 생성 순서로 같은 원문을 보여주며 저장 geometry를 바꾸지 않는다.
- URL 형식 문자열을 링크 요소로 변환하지 않는다.

### 검증 방식

TDD를 적용하지 않는다. 클릭, 선택 드래그, 보조 키와 편집 전환은 브라우저의 이벤트 순서, Selection API와 기본 동작이 결과를 결정하므로 별도 순수 판정 함수로 흉내 내지 않는다. content revision 불변 조건은 U2의 TDD 결과를 재사용한다. 본문 클릭과 선택 구분, Pointer Events, IME, 포커스, 보드 이동, 확대, 크기 조절, container query와 content revision 연결 결과는 실제 브라우저에서 검사한다.

- 두 메모에 서로 다른 텍스트를 입력하고 외부 텍스트를 붙여넣은 뒤 새로고침해도 원문이 남는다.
- 빈 상태에서 키보드와 포인터로 새 메모를 만들 수 있고, 생성 직후 입력을 시작할 위치를 확인할 수 있다.
- 읽기 본문에서 텍스트 범위를 선택하면 선택을 유지하고 메모 이동이나 편집을 시작하지 않는다.
- 편집 버튼을 `Enter`와 `Space`로 실행하고 `Escape`로 나와도 입력 내용이 남는다.
- geometry만 바꾸면 content revision이 유지되고, 원문을 바꾸면 content revision이 바뀐다.
- `48rem` 직전과 직후를 왕복하면 생성 순서 목록과 공간형 보드가 전환되고 기존 geometry가 복원된다.
- 키보드와 단일 pointer만으로도 메모 위치와 크기를 바꿀 수 있다.

### 중단 조건

본문 텍스트 선택, 이동과 편집이 같은 이벤트에서 둘 이상 실행되면 U6을 시작하지 않는다. 작은 화면 전환이 저장 geometry를 변경하면 geometry 저장을 바로 중단하고 복원 규칙을 먼저 고친다.

## U6. Clipboard 복사, 누적 시작과 사용 횟수 기록

### 목적과 기준

일반 클릭과 복사 버튼은 원문 전체를 Clipboard에 쓴다. 누적 버튼, 허용된 `Command+클릭`과 `48rem` 미만 목록의 길게 누르기는 현재 원문을 누적한다. 성공한 결과만 [텍스트 사용 빈도 집계 결정](decisions/usage-counting.md)에 맞게 기록한다.

### 선행 조건

U3의 transaction 저장과 U5의 메모 상호작용이 필요하다.

### 변경 후보

- `apps/notes/src/_pages/notes/model/copyNote.ts`
- `apps/notes/src/_pages/notes/model/accumulateNote.ts`
- `apps/notes/src/_pages/notes/model/{copyNote,accumulateNote}.test.ts`
- `apps/notes/src/shared/lib/clipboard/BrowserClipboardWriter.ts`
- `apps/notes/src/_pages/settings/ui/InteractionSettingsForm.tsx`
- `apps/notes/src/_pages/notes/ui/NoteActions.tsx`
- `apps/notes/src/_pages/notes/ui/MobileAccumulationControl.tsx`
- `apps/notes/src/_pages/notes/copy-and-accumulate.browser.test.ts`

### 작업

- 본문 일반 클릭과 복사 버튼이 같은 `copyNote` command를 호출하게 한다.
- 본문에서 텍스트 범위를 선택한 뒤 발생하는 클릭은 전체 원문 복사나 누적을 실행하지 않게 한다.
- Clipboard 쓰기 성공 뒤 일반 복사 횟수를 저장하고, 횟수 저장 실패는 복사 성공과 분리해 알린다.
- 누적 버튼은 설정과 입력 장치에 관계없이 항상 제공한다.
- `Command+클릭`은 설정이 켜진 읽기 본문의 주 포인터 클릭에만 적용한다. 다른 보조 키 조합, 탐색, 버튼과 편집 상태에는 적용하지 않는다.
- 메모 작업 영역이 `48rem` 미만일 때 읽기 상태의 메모에 Pointer Events 기반 길게 누르기를 제공한다. 이름 있는 기준 시간과 허용 이동 거리를 사용하고, 같은 메모 안의 `pointerup`에서만 완료한다. 스크롤, 메모 밖 이동, `pointercancel`과 `lostpointercapture`는 누적을 취소한다.
- 길게 누르기 성공은 누적 명령이 반환한 항목 ID와 메모 ID를 실행 중 선택 상태에 연결한다. 길게 누르기 기준을 채우지 않은 선택되지 않은 메모의 짧은 누르기는 일반 복사로 처리한다.
- 누적 항목과 누적 횟수를 한 IndexedDB transaction으로 저장한다. 실패하면 둘 다 반영하지 않는다.
- 넓은 화면의 첫 누적 성공 뒤 현재 포커스를 옮기지 않고 오른쪽 패널을 열어 새 항목을 보여준다. 나란한 표시 공간이 부족하면 모달을 자동으로 열지 않고 누적 작업 패널 버튼의 항목 수와 상태 알림을 갱신한다.
- 작은 화면의 누적 성공 뒤 페이지를 자동 이동하지 않고 선택 표시, 상태 알림과 우측 하단 고정 버튼의 누적 항목 수를 갱신한다. 선택된 메모의 짧은 누르기를 통한 제거와 복구는 U7의 제거 명령으로 완성한다.
- Clipboard 거절과 쓰기 실패는 실패 원인, 다시 시도와 설정 확인 동작을 가진 지속 알림으로 보여준다. 성공 알림은 focus를 옮기지 않는다.

### 검증 방식

application 명령에는 TDD를 적용한다. 성공, Clipboard 실패, 복사 성공 뒤 횟수 저장 실패와 누적 transaction 실패는 구현 전에 사용자 결과를 안정적으로 설명할 수 있다. 실제 Clipboard 권한, 사용자 활성화, 클릭, 보조 키, 길게 누르기의 시간 및 이동, 스크롤과 브라우저 기본 동작은 TDD 대상이 아니며 허용 접속 주소의 실제 브라우저에서 검사한다.

- 일반 복사와 횟수 저장이 모두 성공하면 클릭한 원문의 content revision에 해당하는 일반 복사 횟수가 한 번 증가한다.
- Clipboard 쓰기가 실패하면 횟수가 증가하지 않고 원인 및 다음 동작이 표시된다.
- Clipboard는 성공하고 횟수 저장만 실패하면 붙여넣기는 가능하며 기록 실패 알림이 따로 표시된다.
- 누적 transaction을 중단하면 누적 항목과 횟수가 모두 바뀌지 않는다.
- 누적에 성공하면 같은 메모 화면의 항목 수와 상태 알림이 갱신되고, 닫힌 누적 작업 패널과 현재 포커스는 그대로 유지된다.
- 읽기 본문을 일반 클릭하면 원문 전체를 실제 Clipboard에 쓰고, 텍스트 범위를 선택하면 선택을 유지하며 전체 원문을 쓰지 않는다.
- 설정을 꺼도 누적 버튼은 동작하고 `Command+클릭`만 일반 복사로 돌아간다.
- `Ctrl`, `Shift`, `Alt+클릭`, 다른 버튼과 탐색 항목에는 누적이 발생하지 않는다.
- 320 CSS px에서 서로 다른 메모를 길게 누르면 누른 순서대로 항목이 추가되고 각 메모에 선택 상태가 나타나며 우측 하단 항목 수가 증가한다.
- 길게 누르기 전에 pointer가 이동하거나 스크롤, `pointercancel`, `lostpointercapture` 또는 메모 밖 `pointerup`이 발생하면 항목과 사용 횟수가 바뀌지 않는다.
- 선택되지 않은 메모를 짧게 누르면 원문을 복사하고, 누적 버튼은 터치와 키보드에서 길게 누르기와 같은 누적 결과를 만든다.

### 중단 조건

브라우저 가짜 객체에서만 Clipboard 성공을 확인했거나 누적 항목과 횟수가 부분 성공할 수 있으면 U7과 U8을 시작하지 않는다. 길게 누르기가 작은 화면의 세로 스크롤, 일반 복사 또는 텍스트 선택을 반복해서 가로채면 U7을 시작하기 전에 기준 시간, 허용 이동 거리와 `touch-action` 범위를 다시 검토한다.

## U7. 누적 순서 편집과 제거 복구

### 목적과 기준

누적 조작 순서의 원문 스냅샷을 메모 화면의 누적 작업 패널과 모바일 관리 페이지에서 줄바꿈으로 결합한다. 사용자가 순서를 바꾸거나 목록 밖에 놓아 제거한 뒤 제거만 실행 취소 및 다시 실행할 수 있게 하고, 모바일 메모의 선택 해제를 같은 제거 명령에 연결한다. [누적 순서와 제거 복구 결정](decisions/accumulator-ordering-and-recovery.md)이 이력 범위와 수명을 정하고 [누적 작업 패널과 모바일 관리 페이지 결정](decisions/accumulator-workspace-panel.md)이 표시 위치와 반응형 표현을 정한다.

### 선행 조건

U3의 누적 저장 및 session state와 U6의 누적 command가 필요하다.

### 변경 후보

- `apps/notes/app/accumulator/page.tsx`
- `apps/notes/src/features/edit-accumulated-text/model/accumulatorCommands.ts`
- `apps/notes/src/features/edit-accumulated-text/model/accumulatorHistory.ts`
- `apps/notes/src/features/edit-accumulated-text/model/{accumulatorCommands,accumulatorHistory}.test.ts`
- `apps/notes/src/features/edit-accumulated-text/ui/AccumulatorList.tsx`
- `apps/notes/src/features/edit-accumulated-text/ui/AccumulatorItem.tsx`
- `apps/notes/src/features/edit-accumulated-text/ui/CombinedTextPreview.tsx`
- `apps/notes/src/_pages/notes/ui/accumulator/AccumulatorPanel.tsx`
- `apps/notes/src/_pages/accumulator/ui/AccumulatorPage.tsx`
- `apps/notes/src/_pages/accumulator/index.ts`
- `apps/notes/src/_pages/notes/accumulator.browser.test.ts`
- `apps/notes/src/_pages/accumulator/accumulator-page.browser.test.ts`

### 작업

- 항목 ID, 원본 메모와 content revision, 클릭 당시 원문 및 추가 시각을 저장하고 같은 원문의 중복을 허용한다.
- 배열 순서를 결합 순서로 사용하고 기본 구분자는 줄바꿈으로 둔다.
- 목록 안 drop은 재정렬하고 목록 밖 이동 중에는 제거 예정 상태를 보여준다. `Escape`와 `pointercancel`은 원래 상태로 되돌린다.
- 모바일 관리 페이지의 각 항목 왼쪽에는 재정렬을 시작하는 네이티브 버튼을 두고, 패널과 페이지의 각 항목에 위로 이동, 아래로 이동과 제거 버튼을 제공한다.
- 제거 command는 항목과 이전 index를 이력에 넣는다. 실행 취소는 이전 index에 복원하고 다시 실행은 같은 ID를 제거한다.
- 길게 누르기로 선택된 메모를 짧게 누르면 실행 중 연결이 가리키는 항목 ID 하나를 제거하고 선택 상태를 해제한다. 실행 취소가 같은 항목을 복원하면 선택 연결도 복원하고, 관리 페이지에서 항목을 제거하면 연결된 메모 선택 상태도 해제한다.
- 실행 취소 뒤 추가, 재정렬 또는 제거가 성공하면 redo를 비운다. 추가와 재정렬 자체는 undo 대상에 넣지 않는다.
- 메모 편집기에 focus가 있으면 애플리케이션 이력 단축키가 편집기 undo를 가로채지 않는다.
- `48rem` 이상에서는 메모 화면 우측 상단의 버튼에서 패널을 연다. 넓은 화면의 첫 누적 성공은 오른쪽 패널을 열고, 나란한 표시 공간이 부족하면 항목 수와 상태 알림만 갱신한다.
- `48rem` 미만에서는 메모 화면 우측 하단의 항목 수 버튼으로 `/accumulator`에 이동한다. 관리 페이지는 현재 순서의 세로 목록과 각 항목의 왼쪽 재정렬 버튼을 제공한다.
- 나란한 표현, 모달 표현과 모바일 관리 페이지는 `features/edit-accumulated-text`의 같은 목록 UI 및 명령, 누적 자료와 제거 이력을 사용한다. `_pages/notes`와 `_pages/accumulator`가 서로 import하지 않게 한다.
- 모바일 관리 페이지 하단의 `취소`는 Clipboard와 누적 상태를 바꾸지 않고 메모 화면으로 돌아간다. `복사`는 결합 미리보기 문자열을 Clipboard에 쓰고 성공 또는 다시 시도할 수 있는 실패 알림을 제공하되 현재 페이지를 유지한다.
- 결합된 전체 텍스트 복사는 현재 순서와 줄바꿈 구분자로 만든 미리보기 문자열을 Clipboard에 쓰고 성공 또는 다시 시도할 수 있는 실패 알림을 제공한다. 이 동작은 일반 복사와 누적 횟수를 모두 바꾸지 않는다.

### 검증 방식

누적 명령, 제거 이력과 메모 선택 연결에는 TDD를 적용한다. 순서, 중복, 이전 index, 선택된 항목 ID와 이력 분기는 안정된 상태 전이로 표현할 수 있고 경계 사례가 많다. 드래그 좌표, 포커스, 상태 표현, 라우트 이동과 새로고침에 따른 이력 수명은 TDD를 적용하지 않고 실제 브라우저에서 검사한다.

- 같은 원문을 세 번 누적하면 세 항목이 누적 조작 순서로 결합된다.
- 첫 항목, 중간 항목과 마지막 항목을 제거한 뒤 각각 이전 위치로 복원할 수 있다.
- 실행 취소, 다시 실행과 실행 취소 뒤 새 변경의 redo 비우기가 결정대로 동작한다.
- 목록 밖으로 나갔다가 `Escape` 또는 `pointercancel`하면 항목과 이력이 바뀌지 않는다.
- drag와 버튼이 같은 최종 순서를 만들고 제거, 재정렬, undo 및 redo는 사용 횟수를 바꾸지 않는다.
- 선택된 메모를 짧게 누르면 연결된 항목 하나만 제거되고, 실행 취소와 다시 실행에 따라 해당 메모의 선택 상태가 복원되고 다시 해제된다.
- 다른 route를 다녀오면 제거 이력을 사용할 수 있고 새로고침하면 사용할 수 없다.
- 나란한 패널, 모달 패널과 모바일 관리 페이지를 오가거나 패널을 닫았다 다시 열어도 항목 순서와 제거 이력이 유지된다.
- 모바일 관리 페이지에서 왼쪽 재정렬 버튼으로 목록 순서를 바꾸고 위로 및 아래로 이동 버튼으로 같은 순서를 만들 수 있다. `취소`는 복사하지 않고 메모 화면으로 돌아가며 자료와 이력을 유지한다.
- 전체 복사는 현재 미리보기와 정확히 같은 문자열을 Clipboard에 쓰며, 성공과 거절 상태를 구분한다. 어느 결과에서도 항목, 제거 이력과 두 사용 횟수는 바뀌지 않는다.

### 중단 조건

항목 ID가 아닌 원문 값으로 제거해 중복 항목을 잘못 처리하거나, 편집기 undo와 애플리케이션 undo가 충돌하면 이 단위를 완료하지 않는다.

## U8. 사용 빈도 조회와 화면

### 목적과 기준

메모 ID, content revision과 복사 당시 원문별 일반 복사, 누적과 계산한 합계를 별도 화면에서 비교한다. [텍스트 사용 빈도 집계 결정](decisions/usage-counting.md)이 집계 단위와 제외 동작을 정한다.

### 선행 조건

U6의 두 횟수 저장이 완료되어야 한다. U7의 제거 및 재정렬이 횟수를 바꾸지 않는다는 결과를 함께 사용한다.

### 변경 후보

- `apps/notes/src/_pages/usage/model/readUsage.ts`
- `apps/notes/src/_pages/usage/model/usageProjection.ts`
- `apps/notes/src/_pages/usage/model/usageProjection.test.ts`
- `apps/notes/src/_pages/usage/ui/UsagePage.tsx`
- `apps/notes/src/_pages/usage/ui/UsageRow.tsx`
- `apps/notes/src/_pages/usage/usage.browser.test.ts`

### 작업

- 저장된 두 횟수에서 합계를 계산하고 합계를 별도 원본 필드로 저장하지 않는다.
- 현재 및 이전 content revision을 원문 스냅샷과 함께 읽되 서로 다른 메모의 같은 원문을 합치지 않는다.
- 일반 복사, 누적과 합계를 같은 행에서 비교할 수 있게 한다.
- 빈 상태와 횟수 기록 실패 뒤의 상태를 일반적인 0회와 구분한다.
- 빈 상태는 자료 표와 분리해 320 CSS px에서도 가로 이동 없이 보여준다. 실제 항목은 좁은 화면에서 원문과 세 수치를 한 항목 안에 재배치하고, 넓은 화면에서 표 형식으로 비교한다.
- 현재 요구에 없는 기간 그래프, 순위와 추세 수치를 만들지 않는다.

### 검증 방식

합계와 행 projection에는 TDD를 적용한다. 두 입력 횟수에서 화면 값을 만드는 순수 규칙이고 원문 상태를 섞지 않는 불변 조건을 먼저 고정할 필요가 있다. 실제 IndexedDB 읽기와 화면 밀도는 브라우저 통합 및 시각 검토로 확인한다.

- 같은 원문 상태에서 일반 복사 2회와 누적 3회 뒤 `2`, `3`, `5`가 구분되어 표시된다.
- geometry만 바꿔도 같은 행을 유지하고 원문을 바꾸면 새 content revision 행을 만든다.
- 제거, 재정렬, undo와 redo 뒤에도 두 횟수와 합계가 그대로다.
- 다른 메모에 같은 원문이 있어도 별도 행과 메모 식별 정보가 보인다.
- 320 CSS px와 400% 확대에서 한 항목의 원문, 일반 복사, 누적과 합계를 가로 이동 없이 같은 자료로 식별할 수 있다.

### 중단 조건

합계를 저장 필드와 계산값 양쪽에서 관리하거나 원문 상태가 다른 횟수를 설명 없이 합치면 U8을 완료하지 않는다.

## U9. 줄 단위 텍스트 분석

### 목적과 기준

사용자가 분석을 명시적으로 요청한 경우에만 메모 원문을 줄 단위로 비교하고, 정확한 반복, 포함 관계와 문자열 조각 점수를 원문 근거와 함께 보여준다. [줄 단위 텍스트 분석 결정](decisions/text-analysis.md)과 [로컬 실행과 텍스트 분석 Worker 결정](decisions/local-runtime-and-analysis-worker.md)이 기준이다.

### 선행 조건

U1의 운영용 Worker 기본 실행 검사, U2의 메시지 규칙 및 content revision, U3의 메모 읽기와 U5의 원문이 필요하다.

### 변경 후보

- `apps/notes/src/_pages/analysis/model/normalizeLines.ts`
- `apps/notes/src/_pages/analysis/model/classifyLineRelation.ts`
- `apps/notes/src/_pages/analysis/model/graphemeNgrams.ts`
- `apps/notes/src/_pages/analysis/model/*.test.ts`
- `apps/notes/src/_pages/analysis/api/analysis.worker.ts`
- `apps/notes/src/_pages/analysis/api/WorkerTextAnalyzer.ts`
- `apps/notes/src/_pages/analysis/model/analysisRunState.ts`
- `apps/notes/src/features/suggest-template/model/selectedSourceLines.ts`
- `apps/notes/src/_pages/analysis/ui/AnalysisPage.tsx`
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

- `apps/notes/src/features/suggest-template/model/suggestTemplate.ts`
- `apps/notes/src/entities/template/model/renderTemplate.ts`
- `apps/notes/src/entities/template/model/editSegments.ts`
- 각 model 파일과 같은 slice의 `*.test.ts`
- `apps/notes/src/_pages/templates/ui/TemplatePage.tsx`
- `apps/notes/src/_pages/templates/ui/TemplateEditor.tsx`
- `apps/notes/src/_pages/templates/ui/TemplateInputForm.tsx`
- `apps/notes/src/_pages/templates/*.browser.test.ts`

### 작업

- 두 원문 줄을 grapheme 단위의 결정적 shortest edit script 또는 동등한 LCS diff로 비교한다.
- 분석 결과에서 전달받은 선택 쌍과 원본 메모를 먼저 보여준다. 선택 없이 직접 들어오거나 새로고침으로 선택이 사라졌으면 수동 작성 시작과 분석 결과로 돌아가기 동작을 제공한다.
- 공통 구간은 일반 텍스트로, 붙어 있는 차이 구간은 하나의 플레이스홀더로 만들고 여러 차이 구간은 순서형 플레이스홀더로 만든다.
- 공통 일반 텍스트가 없거나 공백과 문장부호만 공통인 경우, 또는 두 줄이 같은 경우에는 제안하지 않고 이유와 수동 작성 동작을 보여준다.
- 사용자가 입력하거나 붙여넣은 원문의 비어 있지 않은 범위를 선택하고 `플레이스홀더로 지정`을 실행해 여러 구간을 바꿀 수 있게 한다. 기존 플레이스홀더와 겹치거나 중첩된 선택은 이유를 표시하고 적용하지 않는다.
- 플레이스홀더를 만들면 이름 입력으로 포커스를 옮기고, 각 플레이스홀더에 이름 변경과 일반 텍스트로 되돌리기를 제공한다. 빈 이름과 중복 이름이 있으면 저장할 수 없다.
- 제안은 저장 전 상태로 유지하고 사용자가 명시적으로 저장한 경우에만 IndexedDB 템플릿에 추가한다.
- React Hook Form은 템플릿 메타데이터와 입력값처럼 제출 단위가 있는 범위에만 사용하고, segment 편집과 분석 상태를 form 전체 상태로 만들지 않는다.
- React Hook Form이 관리하는 단순 입력은 U4의 네이티브 기반 `shared/ui` 구성요소와 `register`로 연결한다. 승인된 복합 폼 제어가 없는 현재 범위에서는 `Controller`와 `useController`를 사용하지 않는다.
- 입력값으로 만든 일회성 결과와 복사 동작을 제공하되 결과를 자동 저장하지 않는다.

### 검증 방식

제안기, segment 편집 규칙, schema와 renderer에는 TDD를 적용한다. 여러 차이 구간, 빈 literal, 중복 key와 치환 순서는 순수 입력 및 결과로 안정적으로 설명할 수 있다. 텍스트 범위 선택, 폼 오류의 읽기 순서, focus와 Clipboard는 실제 브라우저에서 확인한다.

- 앞, 중간과 끝에 차이가 있는 두 줄이 여러 플레이스홀더와 원래 공통 텍스트를 보존한다.
- 공통 일반 텍스트가 없는 두 줄과 같은 두 줄은 자동 저장 없이 이유와 수동 동작을 보여준다.
- 포인터와 키보드로 범위를 선택해 플레이스홀더를 지정하고, 겹치는 범위, 빈 이름과 중복 이름의 오류를 확인한 뒤 고칠 수 있다.
- 플레이스홀더를 일반 텍스트로 되돌리면 확인한 텍스트가 같은 위치에 남고 segment 순서가 유지된다.
- 여러 플레이스홀더를 직접 만들고 이름을 바꾼 뒤 저장하면 새로고침 후 다시 사용할 수 있다.
- 필요한 값을 입력하면 순서대로 치환한 일회성 결과가 생기고, 저장하지 않은 결과는 새로고침 뒤 사라진다.
- 저장 전 제안은 템플릿 목록과 사용 빈도를 바꾸지 않는다.
- DOM에서 템플릿 메타데이터와 플레이스홀더 값 입력이 네이티브 폼 요소로 남고, 키보드 제출과 오류 포커스 동작을 유지한다.

### 중단 조건

정규화 문자열을 원문 대신 템플릿에 넣거나, 의미를 추론한 플레이스홀더 이름을 자동 확정하거나, 제안을 사용자 동작 없이 저장하면 U10을 완료하지 않는다.

## U11. 로컬 애플리케이션 통합 완료 검증

### 목적과 기준

[요구사항의 완료를 확인할 증거](requirements.md#완료를-확인할-증거)를 같은 독립 실행용 결과물에서 끝까지 검증하고, 자동 검사가 판정할 수 없는 화면과 조작을 담당자가 확인한다.

### 선행 조건

U1부터 U10까지 각 중단 조건이 해소되어야 한다.

### 변경 후보

- 승인된 브라우저 end-to-end 검사 파일
- 접근성 및 운영용 빌드 검사 설정
- package script와 CI 설정
- 구현에서 발견된 결함을 고치는 해당 모듈 파일

### 작업

- 요구사항의 완료 증거를 사용자 과업 단위로 자동화할 항목과 담당자가 직접 확인할 항목으로 나눈다.
- 같은 revision의 운영용 빌드를 호스트 이름이 `localhost`인 HTTP에서는 `next start`로, HTTPS에서는 TLS를 종료하는 reverse proxy 또는 배포 플랫폼 뒤에서 제공한다. origin이 다르므로 같은 자료 공유를 기대하지 않고 각 환경에서 새 자료로 전체 흐름을 확인한다.
- `file:` URL과 `localhost`가 아닌 HTTP URL에서 자료 Provider와 과업 화면이 시작되지 않고, 지원하는 접속 주소로 이동할 다음 행동이 보이는지 확인한다.
- 키보드, 단일 포인터, 터치, 한글 IME, 텍스트 선택, 320 CSS px, `48rem` 전후, 확대, reduced motion과 고대비 상태를 확인한다.
- 메모 화면에는 왼쪽 사이드바가 없고, 상단 탐색과 메모 작업 동작이 보드 또는 목록을 가리지 않는지 확인한다.
- 메모 화면의 상단 탐색 아래에서 캔버스가 나머지 화면을 채우고 별도 페이지 제목, 메모 개수와 상단 작업 행이 없는지 확인한다. `48rem` 이상에서는 캔버스를 스크롤하거나 이동해도 누적 작업 패널 버튼이 화면 우측 상단에 유지되는지 확인하고, `48rem` 미만에서는 항목이 있을 때 우측 하단 항목 수 버튼이 메모 조작을 가리지 않는지 확인한다.
- Clipboard 거절, IndexedDB transaction 중단, Worker 오류, 오래된 분석 response와 읽을 수 없는 저장 record에서 사용자가 보존된 결과와 다음 동작을 알 수 있는지 확인한다.
- 누적 패널과 모바일 관리 페이지에서 전체 복사의 성공과 거절을 확인하고, 두 경우 모두 일반 복사 및 누적 횟수가 바뀌지 않는지 확인한다.
- 다섯 주요 route, 모바일 누적 관리 route와 메모 화면의 누적 패널에 실제 한국어 콘텐츠를 넣어 대표 구성요소에 적용 가능한 기본, hover, `focus-visible`, pressed, disabled, 오류와 진행 상태를 확인하고, 같은 역할의 구성요소가 U4에서 승인한 디자인 토큰과 `shared/ui`를 사용하는지 담당자가 검토한다.
- 다섯 주요 route와 모바일 누적 관리 route의 제목, 본문, 버튼, 입력과 상태 문구에 Pretendard가 기본 글꼴로 계산되고 serif display 글꼴이 남지 않았는지 확인한다. 넓은 메모 화면에서는 중립적인 애플리케이션 프레임, 밝은 목재 캔버스와 중립색 메모의 구분 및 목재 결 위 상태 대비를 검토한다.
- 다섯 주요 route, 모바일 누적 관리 route와 메모 화면의 누적 패널에서 보이는 문자열의 역할을 확인하고, 제목이나 컨트롤과 중복되는 안내, 구현 기술 및 빌드 상태 설명과 과업에 필요하지 않은 소개 문구가 없는지 검토한다.
- 단순 폼 제어가 네이티브 HTML 요소와 React Hook Form의 직접 등록 방식을 유지하는지 확인한다. 외부 접근성 부품을 추가했다면 폼과 무관한 승인된 `shared/ui` 구성요소에만 격리되고 외부 기본 테마가 화면에 나타나지 않는지 import, lockfile과 실제 화면을 함께 확인한다.
- U1에서 확정한 FSD ESLint 검사를 최종 `apps/notes/src/` 전체에 다시 실행하고, `apps/notes/app/`의 route 파일이 `_pages` 및 `_app` public API만 연결하는지 확인한다.
- 브라우저 JavaScript 묶음과 라우트 목록에 계정, 동기화, PostgreSQL, 라이브러리 제공 코드와 환경변수 예시 값이 없는지 검사한다. Next.js 운영 서버에 현재 사용자 과업과 무관한 자료 처리 route가 없는지도 확인한다.
- 대표 자료 규모에서 Worker 분석 중 main thread 반응, 메모 수 증가에 따른 보드 조작과 IndexedDB 읽기 및 쓰기 시간을 측정해 기준선을 남긴다. 측정 전 임의 성능 합격값을 만들지 않는다.

### 검증 방식

이 단위 자체에는 TDD를 적용하지 않는다. 구현이 끝난 사용자 흐름과 실제 배포 동작을 확인하는 단계이며, 내부 함수나 구성요소 구조를 먼저 고정할 이유가 없다. 앞선 단위에서 TDD로 만든 순수 규칙 테스트와 실제 브라우저, 빌드, 접근성 및 시각 검토 증거를 함께 사용한다.

- 사용자가 메모 두 개를 만들고 붙여넣기, 편집, 위치 및 크기 변경, 복사와 누적을 완료한다.
- 메모 화면의 누적 패널과 모바일 관리 페이지에서 순서 변경, 목록 밖 제거, 실행 취소와 다시 실행을 완료하고, 패널 열기 및 닫기, 다른 route 이동과 새로고침에 따른 수명이 결정대로 동작한다.
- 사용 빈도, 줄 단위 텍스트 분석, 템플릿 제안, 수동 플레이스홀더와 일회성 결과가 요구사항의 예시 값을 만든다.
- 작은 화면 목록에서 작성, 편집과 일반 복사를 완료한다. 서로 다른 메모를 길게 누른 순서대로 선택하고, 선택된 메모를 다시 짧게 눌러 선택 해제한 뒤 넓은 화면으로 돌아오면 geometry가 복원된다.
- 작은 화면의 우측 하단 항목 수 제어로 `/accumulator`에 이동하고, 왼쪽 재정렬 버튼과 드래그 없는 대안으로 순서를 바꾼 뒤 하단 `취소`와 `복사`의 서로 다른 결과를 확인한다.
- HTTPS와 localhost HTTP에서 각각 Clipboard와 IndexedDB를 포함한 전체 과업을 완료한다.
- 지원하지 않는 접속 주소에서는 메모 자료를 열거나 바꾸지 않고 HTTPS 또는 `http://localhost`로 다시 접속할 수 있는 안내를 확인한다.
- `apps/notes/package.json`의 빌드 명령이 실행 가능한 결과물을 만들고, FSD ESLint 검사에서 허용된 Entities `@x` 외의 같은 계층 import, 역방향 import와 public API 우회가 발견되지 않는다.
- 화면 읽기 프로그램이 버튼 이름, 상태 알림, 분석 관계와 사용 횟수의 의미를 읽을 수 있고, keyboard focus가 가려지지 않는다.
- 같은 역할의 버튼, 입력과 알림이 다섯 주요 route, 모바일 누적 관리 route와 메모 화면의 누적 패널에서 같은 디자인 규칙을 사용하고 포커스 표현도 같은 규칙을 따른다. 외부 UI 라이브러리의 기본 테마가 개인 메모 디자인 시스템을 대신하지 않는다.
- 다섯 주요 route와 모바일 누적 관리 route의 계산된 글꼴에서 Pretendard가 제목과 본문의 기본 글꼴이고 serif display 글꼴은 없다. 메모 화면의 목재 결은 메모 내용, 선택, 키보드 포커스와 정렬선을 가리지 않으며, 우측 상단 및 우측 하단 고정 제어는 메모 작업 영역의 주요 동작을 가리지 않는다.
- 화면 문구는 현재 내용, 동작, 필요한 조건, 직접 알아차리기 어려운 상태 및 결과와 오류 뒤 다음 행동만 전달하며 같은 역할의 안내를 겹쳐 보여주지 않는다.
- 메모 화면은 왼쪽 사이드바 없이 상단 탐색으로 다른 화면에 이동할 수 있고, 사용 빈도, 텍스트 분석, 템플릿과 설정 화면에서는 왼쪽 탐색으로 현재 위치를 확인할 수 있다.
- 메모 화면은 별도 페이지 제목과 상단 작업 행 없이 캔버스가 상단 탐색 아래의 나머지 화면을 채운다. `48rem` 이상에서는 누적 작업 패널 버튼이 캔버스의 이동 및 스크롤과 관계없이 우측 상단에 남고, `48rem` 미만에서는 누적 항목이 있을 때 항목 수 버튼이 우측 하단에 남는다.
- 넓은 작업 영역의 첫 누적 성공 때 나타나는 나란한 오른쪽 패널, `48rem` 이상의 좁은 작업 영역에서 사용하는 모달 패널과 `/accumulator`의 모바일 목록이 같은 항목, 결합 결과와 제거 이력을 사용한다. `/accumulator`는 전역 탐색 항목에 나타나지 않는다.

### 중단 조건

문서 검사나 단위 test만으로 완료를 주장하지 않는다. 지원 브라우저의 실제 독립 실행용 결과물, 접근성 및 시각 검토 가운데 하나라도 필요한 증거가 없으면 해당 결과는 완료가 아니라 `needs revision` 또는 `needs human input`으로 남긴다.

## TDD 적용 요약

TDD 여부는 파일 종류나 모듈 크기가 아니라 구현 전에 사용자 결과 또는 저장 불변 조건을 안정적으로 쓸 수 있는지로 정한다.

- U1은 TDD를 적용하지 않고 운영용 빌드, Next.js 서버와 Worker 기본 실행 검사를 사용한다.
- U2는 content revision과 외부 schema 규칙에만 TDD를 적용하고 조립 wiring에는 적용하지 않는다.
- U3은 TDD를 적용하지 않고 실제 브라우저 IndexedDB 통합 검사를 사용한다.
- U4는 TDD를 적용하지 않고 운영용 CSS, 네이티브 폼 동작, 라우트, 반응형 렌더링, 접근성 검사와 담당자 검토를 사용한다.
- U5는 TDD를 적용하지 않고 U2의 content revision TDD 결과를 재사용한다. 본문 클릭, 텍스트 선택, 보조 키, 보드, 편집, focus와 drag는 실제 브라우저에서 확인한다.
- U6은 복사 및 누적 command의 성공과 실패 규칙에 TDD를 적용하고 실제 Clipboard와 길게 누르기 이벤트에는 적용하지 않는다.
- U7은 누적 명령, 제거 이력과 메모 선택 연결에 TDD를 적용하고 드래그 이벤트 및 시각 상태에는 적용하지 않는다.
- U8은 합계 및 행 projection에 TDD를 적용하고 화면 내부 구조에는 적용하지 않는다.
- U9는 순수 분석기와 오래된 응답 판정에 TDD를 적용하고 Worker asset과 실행 수명에는 적용하지 않는다. 사용자 취소는 U11의 실제 시간 측정에서 필요성이 확인되기 전까지 구현하지 않는다.
- U10은 제안기, segment 편집, 스키마와 결과 생성기에 TDD를 적용하고 폼 연결 및 텍스트 선택에는 적용하지 않는다.
- U11은 TDD를 적용하지 않고 end-to-end, 빌드, 접근성 및 시각 검토로 완료를 판정한다.

각 자동 검사는 사용자에게 보이는 결과, 저장 불변 조건, 외부 시스템과 주고받기로 정한 동작 또는 순수 알고리즘 결과 가운데 하나를 이름으로 설명해야 한다. 내부 함수명, reducer action 문자열, 호출 횟수, CSS class, DOM 중첩, 구성요소 분리, 무관한 드래그 좌표와 큰 markup snapshot만 확인하는 테스트는 만들지 않는다. 테스트를 위해서만 운영 코드의 추상화를 추가하지 않는다.

## 실행 선택과 중단 지점

다음 항목은 사용자 동작을 바꾸는 미해결 요구사항이 아니다. 이미 확정한 선택은 현재 설정을 유지할 조건을 설명하고, 아직 필요한 선택은 그 선택이 필요한 구현을 시작할 때 실제 저장소와 배포 환경에서 결정한다.

- U1에서 package manager, 저장소 workspace 선언, Tailwind CSS와 PostCSS 연결, 정확한 의존성 버전, lockfile, FSD ESLint 설정, 지원 브라우저와 HTTPS 및 localhost HTTP 제공 방식을 확정했다. 다음 작업은 이 설정을 기준으로 삼고, 변경이 필요하면 의존성 및 배포 검토를 다시 수행한다.
- 현재 구현은 브라우저 IndexedDB를 직접 사용하고 IndexedDB wrapper와 드래그 라이브러리를 설치하지 않았다. 이후 드래그 구현에 외부 package가 필요하면 기본 Pointer Events와 다시 비교하고 직접 및 전이 의존성을 검토한 뒤 승인받는다.
- U4의 글꼴 계열, 애플리케이션 프레임과 메모 캔버스의 시각 방향은 승인됐다. 실제 콘텐츠가 있는 대표 화면에서 Pretendard의 크기 및 굵기, 중립색, 밝은 목재 결, 모서리, 깊이, motion, 화면 밀도와 상태 조합의 구체적인 값을 검토할 담당자를 확인해야 한다. Tailwind CSS, 네이티브 폼 요소와 자체 `shared/ui` 조합은 다시 선택하지 않는다.
- 외부 접근성 부품 package는 미리 정하지 않는다. U4에서 폼과 무관한 복합 상호작용의 실제 필요와 네이티브 Web API의 한계를 확인한 경우에만 정확한 버전과 전체 의존성을 조사해 선택한다.
- 현재 로컬 애플리케이션에는 실행 모드를 선택하는 환경변수가 필요하지 않다. 계정 및 동기화 백로그를 시작할 때만 실행 구성 방식을 다시 결정한다.

이 선택이 해당 작업 단위의 중단 조건에 걸리면 추정으로 넘기지 않는다. 결정되지 않은 부분만 `needs human input`으로 남기고, 그 선택과 독립적인 앞선 작업만 계속한다.

## 계획 완료 판정

이 계획은 문서를 만들었다는 이유로 완료되지 않는다. U1부터 U11까지 요구사항에 연결된 관찰 결과가 있고, 적용한 개발 지침과 결정 기록을 다시 검토했으며, 독립 실행용 결과물의 실제 브라우저 흐름과 담당자 검토가 모두 `pass`인 경우에만 로컬 애플리케이션 완성을 주장할 수 있다.
