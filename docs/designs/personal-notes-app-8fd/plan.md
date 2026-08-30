---
origin: docs/designs/personal-notes-app-8fd/requirements.md
---

# 로컬 개인 메모 애플리케이션 완성 계획

## 결론

현재 작업은 백엔드와 계정 없이 동작하는 정적 개인 메모 애플리케이션을 모듈별로 완성하는 것이다. 사용자 동작과 저장 규칙을 구현 전에 안정적으로 설명할 수 있는 모듈에만 TDD를 적용하고, Clipboard, IndexedDB, Worker 산출물, 공간형 화면과 드래그처럼 실제 브라우저가 결과를 결정하는 모듈은 브라우저 통합 검사와 담당자 검토로 확인한다. 모든 모듈에 같은 테스트 방식을 강제하지 않는다.

실행 순서는 정적 내보내기와 Dedicated Worker가 실제 배포 결과에서 동작하는지 먼저 확인한 뒤, 자료 형태와 브라우저 저장, 공통 화면 구조, 메모, 복사 및 누적, 사용 빈도, 겹침 분석과 템플릿 순으로 진행한다. 각 단위는 선행 결과와 중단 조건을 만족해야 다음 단위의 완료 근거가 될 수 있다.

계정, 로그인, 동기화, 백엔드와 데이터베이스는 이번 계획에서 제외하며 모든 백로그 가운데 우선순위가 가장 높다. 라이브러리 패키지와 포트폴리오 라우트 연결은 그 뒤의 백로그다. 현재 결과물에는 두 백로그를 위한 화면, 서버 코드나 미리 만든 추상화를 포함하지 않는다.

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
- [개인 메모 애플리케이션 기술 안티패턴](../../dev/personal-notes-app/anti-patterns.md)
- [개인 메모 애플리케이션 테스트 전략](../../dev/personal-notes-app/testing-strategy.md)

요구사항 책임자는 사용자에게 필요한 결과와 제외 범위를 관리한다. 결정 책임자는 상호작용, 자료 수명과 검증 방식의 선택을 관리한다. 구현 담당자는 이 계획의 각 작업 단위를 수행하고 관찰 가능한 결과를 남긴다. 시각 및 접근성 담당 검토자는 자동 검사로 결정할 수 없는 읽기 흐름, 조작 가능성과 상태 표현을 판정한다.

## 결정 이력과 현재 선택

각 선택의 검토안, 변경 이유, 영향과 다시 검토할 조건은 다음 결정 기록이 관리한다. 계획은 결정의 결과를 연결할 뿐 이력을 다시 요약해 다른 기준을 만들지 않는다.

- [메모 복사와 편집 동작](decisions/note-copy-and-edit.md): 본문 클릭 복사, 선택 드래그 억제와 항상 보이는 독립 동작 버튼
- [메모 누적 실행 동작](decisions/accumulation-activation.md): 항상 보이는 누적 버튼과 설정 가능한 `Command+클릭` 추가 동작
- [공간형 보드와 작은 화면 목록](decisions/responsive-note-presentation.md): 메모 영역의 inline size `48rem`을 기준으로 한 두 표현과 geometry 보존
- [누적 순서와 제거 복구](decisions/accumulator-ordering-and-recovery.md): 클릭 시점 원문, 중복 허용, 줄바꿈 결합과 제거 전용 실행 취소 및 다시 실행
- [로컬 저장과 실행 중 상태](decisions/local-storage-and-ephemeral-state.md): IndexedDB와 실행 중 상태의 수명, 공통 Provider, 초기 복원 상태와 다중 저장 transaction 책임
- [텍스트 사용 빈도 집계](decisions/usage-counting.md): 메모 ID, content revision과 원문 상태별 두 횟수 및 성공 조건
- [줄 단위 생김새 겹침 분석](decisions/surface-overlap-analysis.md): 줄 정규화, 정확한 반복, 포함 관계와 grapheme 3-gram Jaccard 정렬
- [템플릿 제안 생성](decisions/template-suggestion.md): 결과 행의 두 원문 전달, 결정적 차이 분석과 범위 선택 기반 수동 작성
- [로컬 정적 배포와 분석 Worker](decisions/static-export-and-worker.md): Next.js 정적 내보내기와 요청 뒤 만드는 Dedicated Worker
- [모듈별 TDD와 동작 검증](decisions/verification-strategy.md): 순수 규칙만 TDD로 개발하고 브라우저 기능은 실제 실행 결과로 확인하는 분류

초기 권장안을 다시 검토하면서 누적 버튼을 설정에 따라 숨기는 방식, viewport `768px` 고정값, 전체 메모 revision만 사용하는 방식과 보편적인 Jaccard 합격 임계값은 채택하지 않았다. 이 네 변경의 근거와 재검토 조건은 각각 연결된 결정 기록에 남아 있다.

## 범위

### 이번 계획에 포함하는 결과

- 독립 실행하는 Next.js 정적 결과물
- HTTPS URL과 호스트 이름이 정확히 `localhost`인 HTTP URL에서의 로컬 실행
- 공간형 메모 보드와 작은 화면의 생성 순서 목록
- 메모 작성, 붙여넣기, 편집, 위치 및 크기 변경과 일반 클릭 복사
- 버튼과 `Command+클릭`을 통한 누적, 순서 변경, 제거와 제거 복구
- 일반 복사, 누적과 합계로 구분한 사용 빈도
- 사용자가 명시적으로 요청하는 줄 단위 생김새 겹침 분석
- 자동 제안과 수동 플레이스홀더를 모두 지원하는 템플릿 및 일회성 결과
- 지원하지 않는 접속 주소와 Clipboard 실패를 설명하는 알림

### 이번 계획에서 제외하는 결과

- 계정, 로그인, 동기화, 원격 API, PostgreSQL과 그 UI
- Server Action, 동적 Route Handler, 요청 시점 서버 렌더링과 Next.js 서버 캐시
- TanStack Query, SharedWorker, FSD와 범용 DI 컨테이너의 선제 도입
- 의미 유사성 분석과 LLM 사용
- URL 자동 링크, 이동, 미리보기와 메타데이터
- 자료 내보내기, 가져오기와 브라우저가 지운 자료의 복구
- 라이브러리 패키지 및 포트폴리오 애플리케이션 연결

## 구현 구조

### 책임 흐름

```text
Next.js route와 공통 화면 구조
  -> 기능별 화면과 사용자 동작
    -> application command와 query
      -> 책임별 TypeScript interface
        -> 브라우저 구현
          -> Clipboard API
          -> IndexedDB
          -> Dedicated Worker
```

브라우저 구현은 한 composition root에서 만들고 명시적인 속성을 가진 의존성 객체로 application 계층에 전달한다. React에서는 책임이 제한된 provider와 기능별 hook으로 이 객체 또는 application facade를 전달해 Props Drilling을 피한다. 문자열 token으로 전역 객체를 찾는 범용 Service Locator는 만들지 않는다. Context는 의존성을 임의 조회하는 저장소가 아니라 composition root에서 이미 만든 명시적 동작만 전달한다.

`PersonalNotesProvider`는 명시적인 Client Component 진입점이며 공통 루트 layout의 자식에서 한 번 유지한다. Client Component도 정적 빌드 중 미리 렌더링될 수 있으므로 `createLocalApplication`과 각 브라우저 구현의 생성 과정에서는 `navigator`, `indexedDB`, `window`나 Worker를 읽지 않는다. 이 브라우저 전역은 실제 읽기, 쓰기 또는 분석을 브라우저에서 시작할 때만 접근한다.

`Port`, `Adapter`, `Manager`처럼 역할을 다시 알아내야 하는 이름을 기본값으로 사용하지 않는다. `NoteRepository`, `ClipboardWriter`, `OverlapAnalyzer`처럼 수행하는 책임을 이름에 적고, 브라우저 구현은 `IndexedDbNoteRepository`, `BrowserClipboardWriter`, `WorkerOverlapAnalyzer`처럼 기술과 책임을 함께 나타낸다.

현재 저장소에는 애플리케이션 구조와 패키지 설정이 없으므로 U1에서 독립 실행 프로젝트의 최상위 디렉터리를 정한다. 아래 작업 단위의 `app/`와 `src/`는 그 디렉터리를 기준으로 한 후보 경로다. U1은 저장소 루트에 단일 애플리케이션을 둘지 `apps/personal-notes/`에 독립 프로젝트를 둘지 비교하되, 라이브러리 또는 workspace 백로그를 함께 구현하지 않는다. 선택 결과를 package script와 이 계획의 후속 파일 위치에 일관되게 반영한다.

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

## 실행 순서

```text
U1 기반 및 배포 확인
  -> U2 자료 규칙과 조립 구조
    -> U3 브라우저 저장
      -> U4 공통 화면 구조
        -> U5 메모 작성 및 공간 배치
          -> U6 복사, 누적 시작과 집계 저장
            |-> U7 누적 편집과 제거 복구 -> U8 사용 빈도 화면 -|
            |-> U9 겹침 분석 -> U10 템플릿 --------------------|-> U11 통합 완료 검증
```

U7과 U9는 U6이 끝난 뒤 병렬로 진행할 수 있다. U8은 U7의 제거 및 재정렬 결과를 사용하므로 U7 뒤에 진행하고, U10은 U9의 원문 줄 선택 결과를 사용하므로 U9 뒤에 진행한다. U11은 U8과 U10이 모두 끝난 뒤 시작한다. 각 작업 단위에서 발견한 요구사항 변경은 [요구사항 변경 절차](../README.md#requirement-changes-during-work)를 따른다.

## U1. 정적 프로젝트 기반과 Worker 배포 확인

### 목적과 기준

정확한 도구와 버전을 선택하고 최소 정적 결과물에서 Dedicated Worker가 실제로 실행되는지 먼저 확인한다. [로컬 정적 배포와 분석 Worker 결정](decisions/static-export-and-worker.md)과 [요구사항의 로컬 실행 조건](requirements.md#반드시-지킬-조건)이 기준이다.

### 선행 조건

없다. 현재 저장소에 package manifest, lockfile, 애플리케이션 소스와 실행 명령이 없다는 상태에서 시작한다.

### 변경 후보

- `package.json`과 선택한 package manager의 lockfile
- `next.config.*`
- `tsconfig.json`
- `eslint.config.*`
- `app/layout.tsx`
- `app/page.tsx`
- `src/browser/analysis/overlap.worker.ts`
- 필요한 정적 호스팅 및 브라우저 검사 설정

### 작업

- 구현 시점의 Next.js, React, TypeScript, React Hook Form과 Zod 공식 문서를 다시 확인하고 서로 호환되는 정확한 버전을 고정한다.
- 각 직접 및 전이 의존성의 기능, 버전, 라이선스, 유지보수 상태, peer 조건, 잠재적 문제와 적용할 작성 방식을 확인한다. TanStack Query, DI 컨테이너, IndexedDB wrapper와 drag library는 현재 필요와 플랫폼 API를 비교해 근거가 없으면 추가하지 않는다.
- App Router와 정적 내보내기를 구성하고 Server Action, 동적 Route Handler와 요청 시점 서버 기능이 결과물에 들어오지 않게 한다.
- 분석 요청을 흉내 내는 최소 버튼에서 module-relative URL로 Dedicated Worker를 지연 생성하고 ping 및 응답을 주고받는다.
- 운영용 정적 결과물을 HTTPS와 호스트 이름이 `localhost`인 HTTP에서 제공할 개발 및 검증 방식을 정한다. 현재 로컬 결과물에는 실행 모드 환경변수를 추가하지 않는다.
- 지원 브라우저와 최소 버전을 정하고 Clipboard, IndexedDB, Dedicated Worker, Pointer Events, container query와 필요한 `Intl` 기능을 실제 지원 범위와 대조한다.

### 검증 방식

TDD를 적용하지 않는다. 이 단위의 위험은 빌드 도구가 만든 Worker URL, MIME type, 정적 자산과 실행 주소이므로 가짜 Worker 단위 검사보다 운영용 빌드와 실제 브라우저 왕복이 직접적인 근거다.

- package script로 운영용 정적 내보내기가 성공한다.
- 내보낸 파일을 두 허용 접속 방식에서 열고 첫 분석 요청 전에는 Worker가 없으며, 요청 뒤 Worker 응답이 화면에 표시된다.
- 잘못된 Worker URL이나 MIME type이면 smoke가 실패한다.
- 결과물에서 현재 범위에 없는 서버 실행 코드와 계정 UI를 찾을 수 없다.

### 중단 조건

Worker URL, MIME type 또는 정적 호스팅에서의 메시지 왕복을 확인하지 못하면 U9를 시작하지 않는다. 버전 호환성, 대상 브라우저 또는 package 구조가 결정되지 않으면 의존하는 소스 구조를 만들지 않는다.

## U2. 자료 규칙과 의존성 조립 구조

### 목적과 기준

메모, 누적, 사용 빈도, 분석과 템플릿이 공유할 자료 형태와 외부 입력 경계를 정하고, 브라우저 구현을 UI에 숨겨 전달할 조립 구조를 만든다. [데이터 구조 조사 초안](references/data-model-draft.md), [로컬 저장과 실행 중 상태 결정](decisions/local-storage-and-ephemeral-state.md)과 [기술 안티패턴 지침](../../dev/personal-notes-app/anti-patterns.md)이 기준이다.

### 선행 조건

U1의 프로젝트 위치, TypeScript 및 Zod 버전과 module 규칙이 확정되어야 한다.

### 변경 후보

- `src/model/note.ts`
- `src/model/accumulator.ts`
- `src/model/usage.ts`
- `src/model/analysis.ts`
- `src/model/template.ts`
- `src/application/interfaces/*.ts`
- `src/composition/PersonalNotesProvider.tsx`
- `src/composition/createLocalApplication.ts`
- `src/model/*.test.ts`

### 작업

- 반복 접두어 대신 `note.id`, `note.revision`, `note.contentRevision`, `algorithm.type`과 `algorithm.version`으로 함께 이동하는 값을 묶는다.
- 메모 원문이 바뀔 때만 content revision이 바뀌고 geometry만 바뀔 때는 전체 revision만 바뀌는 규칙을 만든다.
- 외부 입력, IndexedDB record와 Worker message를 `unknown`에서 검증하는 Zod schema를 책임별로 나눈다. React Hook Form 입력, application command와 저장 record를 하나의 만능 schema로 만들지 않는다.
- 저장, Clipboard, 분석과 ID 생성을 위한 interface는 구체적인 책임을 드러내는 이름으로 정의한다.
- 누적 스냅샷 추가와 사용 횟수 증가는 `AccumulationWriter`의 한 동작으로 정의해 transaction 책임을 두 repository 호출로 나누지 않는다.
- composition root가 브라우저 구현과 application 명령 및 조회를 한 번 조립하고, React provider는 명시적인 facade를 전달한다. Provider는 공통 루트 layout 아래에서 라우트 이동에도 유지하며, 생성 과정에서 브라우저 전역을 읽지 않는다. 임의 token 조회나 전역 singleton을 제공하지 않는다.

### 검증 방식

부분적으로 TDD를 적용한다. content revision 불변 조건과 승인된 스키마의 성공 및 실패 결과는 구현 전에 입력과 결과를 안정적으로 쓸 수 있어 TDD가 필요하다. interface 선언, composition root와 provider 연결은 TDD 대상이 아니며 타입 검사, import 방향과 라우트 기본 실행 검사로 확인한다.

- 원문 변경, geometry 변경과 두 변경의 조합에서 두 revision 결과가 결정과 일치한다.
- 누락 필드, 잘못된 revision, 빈 식별자와 알 수 없는 Worker message가 schema 경계에서 거절된다.
- UI 모듈이 IndexedDB, `navigator.clipboard`나 Worker 생성자를 직접 가져오지 않는다.
- provider 없이 렌더링된 개발 오류는 누락된 조립 책임을 식별할 수 있고, 일반 사용 중 Service Locator 조회 실패가 발생하지 않는다.

### 중단 조건

같은 속성 이름이 전체 revision과 content revision 가운데 무엇을 뜻하는지 구분되지 않거나, 저장 record와 application 객체 변환 책임이 정해지지 않으면 U3을 시작하지 않는다.

## U3. IndexedDB 저장과 실행 중 상태 수명

### 목적과 기준

사용자가 만든 현재 자료를 새로고침 뒤에도 유지하고, 제거 이력과 분석 파생 상태는 애플리케이션 실행이 끝날 때 지운다. [로컬 저장과 실행 중 상태 결정](decisions/local-storage-and-ephemeral-state.md)이 보관 범위와 성공 조건을 정한다.

### 선행 조건

U2의 객체, 레코드 스키마와 책임별 저장 interface가 필요하다. U1에서 IndexedDB wrapper를 승인하지 않았다면 브라우저 표준 API로 구현한다.

### 변경 후보

- `src/browser/storage/openPersonalNotesDatabase.ts`
- `src/browser/storage/IndexedDbNoteRepository.ts`
- `src/browser/storage/IndexedDbAccumulatorRepository.ts`
- `src/browser/storage/IndexedDbAccumulationWriter.ts`
- `src/browser/storage/IndexedDbUsageRepository.ts`
- `src/browser/storage/IndexedDbTemplateRepository.ts`
- `src/browser/storage/IndexedDbPreferenceRepository.ts`
- `src/browser/storage/*.browser.test.ts`
- `src/application/session/createSessionState.ts`

### 작업

- `notes`, `accumulators`, `usage`, `templates`와 `preferences` object store 및 첫 스키마 버전을 만든다.
- `upgrade`, `blocked`, `versionchange`, transaction abort와 읽을 수 없는 record를 명시적인 결과로 처리한다.
- 첫 자료 읽기는 `불러오는 중`, `사용 가능한 빈 상태`, `자료 표시`, `읽기 실패`와 `다른 탭으로 인한 대기`로 구분한다. 첫 읽기가 끝나기 전과 읽기 실패 중에는 변경 동작을 제공하지 않고, 실패 상태에는 다시 시도, 다른 탭 확인과 기존 자료를 덮어쓰지 않았다는 설명을 제공한다.
- `IndexedDbAccumulationWriter`가 누적 항목과 사용 횟수 변경 request를 같은 readwrite transaction에 등록하고 외부 비동기 작업을 transaction 안에서 기다리지 않게 한다.
- transaction의 개별 request가 아니라 `complete`를 성공 기준으로 사용한다.
- 애플리케이션 실행 동안 유지할 session state에 제거 이력, 분석 상태, 저장 전 제안과 일회성 출력을 두고 라우트 구성요소가 없어져도 유지한다.
- 영구 저장 요청이 승인되더라도 백업 완료로 표시하지 않는다.

### 검증 방식

TDD를 적용하지 않는다. IndexedDB의 transaction 수명, upgrade와 origin별 보관은 가짜 저장소로 정확히 재현하기 어렵다. 저장 interface에 정한 동작을 기준으로 구현한 뒤 실제 브라우저 저장소를 사용하는 통합 검사로 판정한다. U2에서 이미 검증한 순수 레코드 스키마를 다시 내부 호출 횟수로 검사하지 않는다.

- 메모, 누적 목록, 횟수, 템플릿과 설정은 새로고침 뒤 복원된다.
- 첫 자료 읽기 전에는 빈 상태를 표시하거나 새 메모를 만들 수 없고, 읽기 완료 뒤에만 실제 빈 상태 또는 저장된 자료를 보여준다.
- 분석 결과, 저장 전 제안과 제거 이력은 라우트 이동 뒤 유지되지만 새로고침 뒤에는 없다.
- 운영용 정적 빌드 중 Provider 조립이 브라우저 전역 접근으로 실패하지 않고, 라우트 이동 뒤에도 같은 실행 중 상태를 읽는다.
- 의도적으로 transaction을 중단하면 그 transaction이 바꾸는 object store가 일부만 갱신되지 않는다.
- 다른 database version을 연 탭이 있을 때 `blocked` 또는 `versionchange` 안내가 나타난다.
- HTTPS와 localhost HTTP에서 만든 자료가 서로 섞이지 않는다.

### 중단 조건

transaction 일부 성공을 사용자가 성공으로 보거나 스키마 upgrade가 조용히 멈추면 U5와 U6을 시작하지 않는다. 첫 스키마 버전 뒤 자료 형태를 바꾸면 migration과 이전 레코드 fixture를 함께 추가하기 전에는 변경을 완료하지 않는다.

## U4. 공통 화면 구조와 작은 화면 표현 기준선

### 목적과 기준

로컬 애플리케이션의 여섯 페이지와 공통 탐색, 알림 및 반응형 화면 뼈대를 만든다. [화면 구성 조사](references/interface-layout-research.md), [시각 디자인 조사](references/web-visual-design-research-2026.md)와 [공간형 보드와 작은 화면 목록 결정](decisions/responsive-note-presentation.md)이 기준이다.

### 선행 조건

U1의 라우트 및 CSS 구성과 U2의 provider가 필요하다.

### 변경 후보

- `app/page.tsx`
- `app/accumulator/page.tsx`
- `app/usage/page.tsx`
- `app/overlap/page.tsx`
- `app/templates/page.tsx`
- `app/settings/page.tsx`
- `app/globals.css`
- `src/ui/navigation/*`
- `src/ui/feedback/*`
- `src/ui/tokens.css`

### 작업

- `/`에는 메모 보드, 나머지 route에는 누적 텍스트, 사용 빈도, 텍스트 겹침, 템플릿과 설정을 배치한다. 계정, 동기화와 서버 상태 route는 만들지 않는다.
- 공통 화면 구조는 접을 수 있는 탐색, 페이지 제목과 주요 동작, 주 콘텐츠 및 상태 알림으로 구성한다. 사용자 문구와 문서 이름에도 `공통 화면 구조`라고 쓴다.
- 메모 영역의 inline size를 기준으로 `48rem` 미만에서 목록 표현을 선택할 자리를 만들고 User-Agent 분기를 두지 않는다.
- 실제 긴 한국어 메모, 여러 줄, URL 형식 문자열, 빈 화면, 오류, 진행 중과 키보드 포커스 상태로 대표 화면을 만든다.
- 공통 자료 상태 영역은 초기 불러오기, 사용 가능한 빈 상태, 자료 표시, 읽기 실패와 다른 탭 대기를 구분하며 각 상태에서 가능한 다음 동작을 보여준다.
- 시각 조사에서 제안한 글꼴, 색, 모서리, 깊이와 motion 후보를 대표 상태에만 적용해 담당자 검토를 받는다. 승인 전에는 모든 화면에 세부 스타일을 확장하지 않는다.

### 검증 방식

TDD를 적용하지 않는다. 라우트 구성, container query, 읽기 흐름과 시각적 위계는 DOM 내부 구조를 고정하는 단위 검사보다 실제 렌더링과 담당자 검토가 직접적인 근거다.

- 여섯 route를 직접 열고 새로고침해도 정적 hosting에서 화면이 열린다.
- 로컬 탐색에는 계정과 동기화 항목이 없다.
- 320 CSS px, `48rem` 직전과 직후, 200% 및 400% zoom과 화면 분할에서 핵심 동작 영역이 가려지지 않는다.
- 키보드 포커스, 오류, 성공, 빈 상태와 진행 상태가 색 하나에만 의존하지 않는다.
- 범용 카드 격자, 장식용 그라데이션과 hover 전용 동작이 정보 구조를 대신하지 않는지 담당자가 검토한다.

### 중단 조건

공통 화면 구조가 작은 화면에서 주 콘텐츠를 가리거나 시각 기준선의 책임자가 정해지지 않으면 세부 스타일 확대를 중단한다. 기능 모듈은 무채색 기준선으로 계속할 수 있지만 U11의 시각 완료 판정은 담당자 검토 전까지 완료하지 않는다.

## U5. 메모 작성, 편집과 공간 배치

### 목적과 기준

메모를 만들고 다른 애플리케이션의 텍스트를 붙여넣어 편집하며, 넓은 화면에서는 위치와 크기를 바꾸고 작은 화면에서는 같은 자료를 목록으로 다룬다. [메모 복사와 편집 동작 결정](decisions/note-copy-and-edit.md)과 [공간형 보드와 작은 화면 목록 결정](decisions/responsive-note-presentation.md)이 조작을 정한다.

### 선행 조건

U2의 revision 규칙, U3의 메모 저장과 U4의 두 화면 표현이 필요하다.

### 변경 후보

- `src/features/notes/NoteBoard.tsx`
- `src/features/notes/NoteList.tsx`
- `src/features/notes/NoteCard.tsx`
- `src/features/notes/NoteEditor.tsx`
- `src/features/notes/NoteGeometryControls.tsx`
- `src/features/notes/*.browser.test.ts`

### 작업

- 메모 생성, 붙여넣기, 편집 완료와 `Escape` 종료가 현재 입력을 보존해 IndexedDB에 저장되게 한다.
- 읽기 본문, 이동 손잡이, 복사, 누적 및 편집 버튼과 크기 조절 손잡이를 형제 동작으로 분리한다.
- 읽기 본문에서 텍스트 범위를 선택할 수 있게 하고 포인터 선택이 메모 이동이나 편집 전환으로 이어지지 않게 한다.
- 보드는 메모 외곽 범위에 따라 확장하고 pan, zoom과 모든 메모 맞춤을 제공한다. 내용이 사용자가 정한 크기를 넘으면 메모 안에서 스크롤한다.
- 드래그 외에도 위치 및 크기의 숫자 입력과 단계 조절 동작을 제공한다.
- 작은 화면 목록은 생성 순서로 같은 원문을 보여주며 저장 geometry를 바꾸지 않는다.
- URL 형식 문자열을 링크 요소로 변환하지 않는다.

### 검증 방식

TDD를 적용하지 않는다. 클릭, 선택 드래그, 보조 키와 편집 전환은 브라우저의 이벤트 순서, Selection API와 기본 동작이 결과를 결정하므로 별도 순수 판정 함수로 흉내 내지 않는다. content revision 불변 조건은 U2의 TDD 결과를 재사용한다. 본문 클릭과 선택 구분, Pointer Events, IME, 포커스, 보드 이동, 확대, 크기 조절, container query와 content revision 연결 결과는 실제 브라우저에서 검사한다.

- 두 메모에 서로 다른 텍스트를 입력하고 외부 텍스트를 붙여넣은 뒤 새로고침해도 원문이 남는다.
- 읽기 본문에서 텍스트 범위를 선택하면 선택을 유지하고 메모 이동이나 편집을 시작하지 않는다.
- 편집 버튼을 `Enter`와 `Space`로 실행하고 `Escape`로 나와도 입력 내용이 남는다.
- geometry만 바꾸면 content revision이 유지되고, 원문을 바꾸면 content revision이 바뀐다.
- `48rem` 직전과 직후를 왕복하면 생성 순서 목록과 공간형 보드가 전환되고 기존 geometry가 복원된다.
- 키보드와 단일 pointer만으로도 메모 위치와 크기를 바꿀 수 있다.

### 중단 조건

본문 텍스트 선택, 이동과 편집이 같은 이벤트에서 둘 이상 실행되면 U6을 시작하지 않는다. 작은 화면 전환이 저장 geometry를 변경하면 geometry 저장을 바로 중단하고 복원 규칙을 먼저 고친다.

## U6. Clipboard 복사, 누적 시작과 사용 횟수 기록

### 목적과 기준

일반 클릭과 복사 버튼은 원문 전체를 Clipboard에 쓰고, 누적 버튼과 허용된 `Command+클릭`은 현재 원문을 누적한다. 성공한 결과만 [텍스트 사용 빈도 집계 결정](decisions/usage-counting.md)에 맞게 기록한다.

### 선행 조건

U3의 transaction 저장과 U5의 메모 상호작용이 필요하다.

### 변경 후보

- `src/application/copyNote.ts`
- `src/application/accumulateNote.ts`
- `src/application/copyNote.test.ts`
- `src/application/accumulateNote.test.ts`
- `src/browser/clipboard/BrowserClipboardWriter.ts`
- `src/features/settings/InteractionSettingsForm.tsx`
- `src/features/notes/NoteActions.tsx`
- `src/features/notes/copy-and-accumulate.browser.test.ts`

### 작업

- 본문 일반 클릭과 복사 버튼이 같은 `copyNote` command를 호출하게 한다.
- 본문에서 텍스트 범위를 선택한 뒤 발생하는 클릭은 전체 원문 복사나 누적을 실행하지 않게 한다.
- Clipboard 쓰기 성공 뒤 일반 복사 횟수를 저장하고, 횟수 저장 실패는 복사 성공과 분리해 알린다.
- 누적 버튼은 설정과 입력 장치에 관계없이 항상 제공한다.
- `Command+클릭`은 설정이 켜진 읽기 본문의 주 포인터 클릭에만 적용한다. 다른 보조 키 조합, 탐색, 버튼과 편집 상태에는 적용하지 않는다.
- 누적 항목과 누적 횟수를 한 IndexedDB transaction으로 저장한다. 실패하면 둘 다 반영하지 않는다.
- Clipboard 거절과 쓰기 실패는 실패 원인, 다시 시도와 설정 확인 동작을 가진 지속 알림으로 보여준다. 성공 알림은 focus를 옮기지 않는다.

### 검증 방식

application 명령에는 TDD를 적용한다. 성공, Clipboard 실패, 복사 성공 뒤 횟수 저장 실패와 누적 transaction 실패는 구현 전에 사용자 결과를 안정적으로 설명할 수 있다. 실제 Clipboard 권한, 사용자 활성화, 클릭과 보조 키 조합 및 브라우저 기본 동작은 TDD 대상이 아니며 허용 접속 주소의 실제 브라우저에서 검사한다.

- 일반 복사와 횟수 저장이 모두 성공하면 클릭한 원문의 content revision에 해당하는 일반 복사 횟수가 한 번 증가한다.
- Clipboard 쓰기가 실패하면 횟수가 증가하지 않고 원인 및 다음 동작이 표시된다.
- Clipboard는 성공하고 횟수 저장만 실패하면 붙여넣기는 가능하며 기록 실패 알림이 따로 표시된다.
- 누적 transaction을 중단하면 누적 항목과 횟수가 모두 바뀌지 않는다.
- 읽기 본문을 일반 클릭하면 원문 전체를 실제 Clipboard에 쓰고, 텍스트 범위를 선택하면 선택을 유지하며 전체 원문을 쓰지 않는다.
- 설정을 꺼도 누적 버튼은 동작하고 `Command+클릭`만 일반 복사로 돌아간다.
- `Ctrl`, `Shift`, `Alt+클릭`, 다른 버튼과 탐색 항목에는 누적이 발생하지 않는다.

### 중단 조건

브라우저 가짜 객체에서만 Clipboard 성공을 확인했거나 누적 항목과 횟수가 부분 성공할 수 있으면 U7과 U8을 시작하지 않는다.

## U7. 누적 순서 편집과 제거 복구

### 목적과 기준

클릭 순서의 원문 스냅샷을 줄바꿈으로 결합하고, 사용자가 순서를 바꾸거나 목록 밖에 놓아 제거한 뒤 제거만 실행 취소 및 다시 실행할 수 있게 한다. [누적 순서와 제거 복구 결정](decisions/accumulator-ordering-and-recovery.md)이 이력 범위와 수명을 정한다.

### 선행 조건

U3의 누적 저장 및 session state와 U6의 누적 command가 필요하다.

### 변경 후보

- `src/application/accumulatorCommands.ts`
- `src/application/accumulatorHistory.ts`
- `src/application/accumulatorCommands.test.ts`
- `src/application/accumulatorHistory.test.ts`
- `src/features/accumulator/AccumulatorList.tsx`
- `src/features/accumulator/AccumulatorItem.tsx`
- `src/features/accumulator/CombinedTextPreview.tsx`
- `src/features/accumulator/*.browser.test.ts`

### 작업

- 항목 ID, 원본 메모와 content revision, 클릭 당시 원문 및 추가 시각을 저장하고 같은 원문의 중복을 허용한다.
- 배열 순서를 결합 순서로 사용하고 기본 구분자는 줄바꿈으로 둔다.
- 목록 안 drop은 재정렬하고 목록 밖 이동 중에는 제거 예정 상태를 보여준다. `Escape`와 `pointercancel`은 원래 상태로 되돌린다.
- 각 항목에 위로 이동, 아래로 이동과 제거 버튼을 제공한다.
- 제거 command는 항목과 이전 index를 이력에 넣는다. 실행 취소는 이전 index에 복원하고 다시 실행은 같은 ID를 제거한다.
- 실행 취소 뒤 추가, 재정렬 또는 제거가 성공하면 redo를 비운다. 추가와 재정렬 자체는 undo 대상에 넣지 않는다.
- 메모 편집기에 focus가 있으면 애플리케이션 이력 단축키가 편집기 undo를 가로채지 않는다.

### 검증 방식

누적 명령과 제거 이력에는 TDD를 적용한다. 순서, 중복, 이전 index와 이력 분기는 안정된 상태 전이로 표현할 수 있고 경계 사례가 많다. 드래그 좌표, 포커스, 상태 표현, 라우트 이동과 새로고침에 따른 이력 수명은 TDD를 적용하지 않고 실제 브라우저에서 검사한다.

- 같은 원문을 세 번 누적하면 세 항목이 클릭 순서로 결합된다.
- 첫 항목, 중간 항목과 마지막 항목을 제거한 뒤 각각 이전 위치로 복원할 수 있다.
- 실행 취소, 다시 실행과 실행 취소 뒤 새 변경의 redo 비우기가 결정대로 동작한다.
- 목록 밖으로 나갔다가 `Escape` 또는 `pointercancel`하면 항목과 이력이 바뀌지 않는다.
- drag와 버튼이 같은 최종 순서를 만들고 제거, 재정렬, undo 및 redo는 사용 횟수를 바꾸지 않는다.
- 다른 route를 다녀오면 제거 이력을 사용할 수 있고 새로고침하면 사용할 수 없다.

### 중단 조건

항목 ID가 아닌 원문 값으로 제거해 중복 항목을 잘못 처리하거나, 편집기 undo와 애플리케이션 undo가 충돌하면 이 단위를 완료하지 않는다.

## U8. 사용 빈도 조회와 화면

### 목적과 기준

메모 ID, content revision과 복사 당시 원문별 일반 복사, 누적과 계산한 합계를 별도 화면에서 비교한다. [텍스트 사용 빈도 집계 결정](decisions/usage-counting.md)이 집계 단위와 제외 동작을 정한다.

### 선행 조건

U6의 두 횟수 저장이 완료되어야 한다. U7의 제거 및 재정렬이 횟수를 바꾸지 않는다는 결과를 함께 사용한다.

### 변경 후보

- `src/application/readUsage.ts`
- `src/application/usageProjection.ts`
- `src/application/usageProjection.test.ts`
- `src/features/usage/UsagePage.tsx`
- `src/features/usage/UsageRow.tsx`
- `src/features/usage/usage.browser.test.ts`

### 작업

- 저장된 두 횟수에서 합계를 계산하고 합계를 별도 원본 필드로 저장하지 않는다.
- 현재 및 이전 content revision을 원문 스냅샷과 함께 읽되 서로 다른 메모의 같은 원문을 합치지 않는다.
- 일반 복사, 누적과 합계를 같은 행에서 비교할 수 있게 한다.
- 빈 상태와 횟수 기록 실패 뒤의 상태를 일반적인 0회와 구분한다.
- 현재 요구에 없는 기간 그래프, 순위와 추세 수치를 만들지 않는다.

### 검증 방식

합계와 행 projection에는 TDD를 적용한다. 두 입력 횟수에서 화면 값을 만드는 순수 규칙이고 원문 상태를 섞지 않는 불변 조건을 먼저 고정할 필요가 있다. 실제 IndexedDB 읽기와 화면 밀도는 브라우저 통합 및 시각 검토로 확인한다.

- 같은 원문 상태에서 일반 복사 2회와 누적 3회 뒤 `2`, `3`, `5`가 구분되어 표시된다.
- geometry만 바꿔도 같은 행을 유지하고 원문을 바꾸면 새 content revision 행을 만든다.
- 제거, 재정렬, undo와 redo 뒤에도 두 횟수와 합계가 그대로다.
- 다른 메모에 같은 원문이 있어도 별도 행과 메모 식별 정보가 보인다.

### 중단 조건

합계를 저장 필드와 계산값 양쪽에서 관리하거나 원문 상태가 다른 횟수를 설명 없이 합치면 U8을 완료하지 않는다.

## U9. 줄 단위 생김새 겹침 분석

### 목적과 기준

사용자가 분석을 명시적으로 요청한 경우에만 메모 원문을 줄 단위로 비교하고, 정확한 반복, 포함 관계와 문자열 조각 점수를 원문 근거와 함께 보여준다. [줄 단위 생김새 겹침 분석 결정](decisions/surface-overlap-analysis.md)과 [로컬 정적 배포와 분석 Worker 결정](decisions/static-export-and-worker.md)이 기준이다.

### 선행 조건

U1의 운영용 Worker 기본 실행 검사, U2의 메시지 규칙 및 content revision, U3의 메모 읽기와 U5의 원문이 필요하다.

### 변경 후보

- `src/analysis/normalizeLines.ts`
- `src/analysis/classifyOverlap.ts`
- `src/analysis/graphemeNgrams.ts`
- `src/analysis/*.test.ts`
- `src/browser/analysis/overlap.worker.ts`
- `src/browser/analysis/WorkerOverlapAnalyzer.ts`
- `src/application/analysisRunState.ts`
- `src/application/analysisRunState.test.ts`
- `src/features/overlap/OverlapPage.tsx`
- `src/features/overlap/*.browser.test.ts`

### 작업

- CRLF, LF와 CR을 줄바꿈으로 인식하고 0부터 시작하는 원래 줄 위치를 보존한다.
- 앞뒤 공백 제거, 내부 공백 정리, NFC, locale 비의존 소문자 변환과 다시 NFC를 적용한다. 문장부호와 원문은 보존하고 빈 결과는 제외한다.
- 정확한 반복, 포함 관계 순서로 분류한 뒤 나머지 3 grapheme 이상 줄에 extended grapheme 3-gram 집합의 Jaccard 점수를 계산한다.
- 점수가 0보다 큰 후보만 내림차순으로 반환하되 고정 합격 임계값과 의미 동일 판정을 만들지 않는다. 3 grapheme 미만은 정확한 반복과 포함 관계만 다룬다.
- 첫 분석 요청에서 Worker를 만들고 현재 실행 동안 재사용한다. 요청 ID, 메모 ID와 content revision, 알고리즘 type 및 version으로 message를 검증한다.
- 현재 content revision과 다른 응답은 화면 결과로 수락하지 않는다.
- 결과에서 관계, 점수, 두 원문 줄, 메모와 줄 위치를 보여준다. 각 결과 행의 `이 두 줄로 템플릿 제안` 동작은 그 행의 두 원문 스냅샷을 하나의 선택 쌍으로 실행 중 상태에 보관하고 템플릿 화면으로 이동한다.

### 검증 방식

정규화, 관계 분류, Jaccard, 결정적 정렬과 오래된 응답 수락 상태에는 TDD를 적용한다. 입력과 결과가 순수하고 유니코드 및 짧은 줄 경계 사례가 많다. Worker 자산, 메시지 왕복, 주 실행 흐름의 응답성과 실제 계산 시간은 TDD를 적용하지 않고 운영용 정적 결과물의 브라우저에서 확인한다.

- 조합 문자가 다른 같은 문자열, 대소문자, 공백 묶음, 문장부호, CRLF와 빈 줄 fixture가 결정된 정규화 결과를 만든다.
- 정확한 반복, 포함 관계, 3-gram 일부 겹침, 0점과 3 grapheme 미만 사례가 각각 정해진 분류 및 제외 결과를 만든다.
- 같은 점수의 결과도 정해진 보조 키로 항상 같은 순서를 만든다.
- 분석 버튼을 누르기 전에는 Worker와 결과가 없고, 누른 뒤 진행, 성공과 오류 상태가 구분된다.
- 분석 중 원문을 바꾸면 이전 response가 폐기되고 geometry만 바꾸면 결과를 유지한다.
- 결과 행에서 템플릿 제안을 실행하면 템플릿 화면에 같은 두 원문과 원본 메모 이동 동작이 표시된다.
- 대표 메모 묶음을 분석하는 동안 메모 편집, 탐색과 상태 알림이 main thread에서 계속 반응한다.

### 중단 조건

유니코드 분할이 UTF-16 code unit을 사용자 문자로 오인하거나, 알고리즘 버전 없이 결과 형태를 바꾸거나, Worker 실패를 main thread의 동기 계산으로 조용히 대체하면 U9를 완료하지 않는다.

## U10. 템플릿 제안, 수동 편집과 일회성 결과

### 목적과 기준

선택한 두 원문 줄의 공통 구간과 차이 구간을 설명 가능한 템플릿으로 제안하고, 사용자가 직접 여러 플레이스홀더를 지정하거나 입력값으로 일회성 텍스트를 만든다. [템플릿 제안 생성 결정](decisions/template-suggestion.md)이 자동 제안 범위와 저장 조건을 정한다.

### 선행 조건

U3의 템플릿 저장, U9의 원문 줄 선택과 U2의 segment schema가 필요하다.

### 변경 후보

- `src/template/suggestTemplate.ts`
- `src/template/renderTemplate.ts`
- `src/template/editSegments.ts`
- `src/template/*.test.ts`
- `src/features/templates/TemplatePage.tsx`
- `src/features/templates/TemplateEditor.tsx`
- `src/features/templates/TemplateInputForm.tsx`
- `src/features/templates/*.browser.test.ts`

### 작업

- 두 원문 줄을 grapheme 단위의 결정적 shortest edit script 또는 동등한 LCS diff로 비교한다.
- 겹침 결과에서 전달받은 선택 쌍과 원본 메모를 먼저 보여준다. 선택 없이 직접 들어오거나 새로고침으로 선택이 사라졌으면 수동 작성 시작과 겹침 결과로 돌아가기 동작을 제공한다.
- 공통 구간은 일반 텍스트로, 붙어 있는 차이 구간은 하나의 플레이스홀더로 만들고 여러 차이 구간은 순서형 플레이스홀더로 만든다.
- 공통 일반 텍스트가 없거나 공백과 문장부호만 공통인 경우, 또는 두 줄이 같은 경우에는 제안하지 않고 이유와 수동 작성 동작을 보여준다.
- 사용자가 입력하거나 붙여넣은 원문의 비어 있지 않은 범위를 선택하고 `플레이스홀더로 지정`을 실행해 여러 구간을 바꿀 수 있게 한다. 기존 플레이스홀더와 겹치거나 중첩된 선택은 이유를 표시하고 적용하지 않는다.
- 플레이스홀더를 만들면 이름 입력으로 포커스를 옮기고, 각 플레이스홀더에 이름 변경과 일반 텍스트로 되돌리기를 제공한다. 빈 이름과 중복 이름이 있으면 저장할 수 없다.
- 제안은 저장 전 상태로 유지하고 사용자가 명시적으로 저장한 경우에만 IndexedDB 템플릿에 추가한다.
- React Hook Form은 템플릿 메타데이터와 입력값처럼 제출 단위가 있는 범위에만 사용하고, segment 편집과 분석 상태를 form 전체 상태로 만들지 않는다.
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

### 중단 조건

정규화 문자열을 원문 대신 템플릿에 넣거나, 의미를 추론한 플레이스홀더 이름을 자동 확정하거나, 제안을 사용자 동작 없이 저장하면 U10을 완료하지 않는다.

## U11. 정적 로컬 애플리케이션 통합 완료 검증

### 목적과 기준

[요구사항의 완료를 확인할 증거](requirements.md#완료를-확인할-증거)를 같은 정적 결과물에서 끝까지 검증하고, 자동 검사가 판정할 수 없는 화면과 조작을 담당자가 확인한다.

### 선행 조건

U1부터 U10까지 각 중단 조건이 해소되어야 한다.

### 변경 후보

- 승인된 브라우저 end-to-end 검사 파일
- 접근성 및 운영용 빌드 검사 설정
- package script와 CI 설정
- 구현에서 발견된 결함을 고치는 해당 모듈 파일

### 작업

- 요구사항의 완료 증거를 사용자 과업 단위로 자동화할 항목과 담당자가 직접 확인할 항목으로 나눈다.
- 운영용 정적 결과물 하나를 HTTPS와 호스트 이름이 `localhost`인 HTTP에서 각각 제공한다. origin이 다르므로 같은 자료 공유를 기대하지 않고 각 환경에서 새 자료로 전체 흐름을 확인한다.
- 키보드, 단일 포인터, 터치, 한글 IME, 텍스트 선택, 320 CSS px, `48rem` 전후, 확대, reduced motion과 고대비 상태를 확인한다.
- Clipboard 거절, IndexedDB transaction 중단, Worker 오류, 오래된 분석 response와 읽을 수 없는 저장 record에서 사용자가 보존된 결과와 다음 동작을 알 수 있는지 확인한다.
- 운영용 JavaScript 묶음과 라우트 목록에 계정, 동기화, 서버 실행, PostgreSQL, 라이브러리 제공 코드와 환경변수 예시 값이 없는지 검사한다.
- 대표 자료 규모에서 Worker 분석 중 main thread 반응, 메모 수 증가에 따른 보드 조작과 IndexedDB 읽기 및 쓰기 시간을 측정해 기준선을 남긴다. 측정 전 임의 성능 합격값을 만들지 않는다.

### 검증 방식

이 단위 자체에는 TDD를 적용하지 않는다. 구현이 끝난 사용자 흐름과 실제 배포 동작을 확인하는 단계이며, 내부 함수나 구성요소 구조를 먼저 고정할 이유가 없다. 앞선 단위에서 TDD로 만든 순수 규칙 테스트와 실제 브라우저, 빌드, 접근성 및 시각 검토 증거를 함께 사용한다.

- 사용자가 메모 두 개를 만들고 붙여넣기, 편집, 위치 및 크기 변경, 복사와 누적을 완료한다.
- 누적 순서 변경, 목록 밖 제거, 실행 취소, 다시 실행과 라우트 이동 및 새로고침 수명이 결정대로 동작한다.
- 사용 빈도, 줄 단위 겹침, 템플릿 제안, 수동 플레이스홀더와 일회성 결과가 요구사항의 예시 값을 만든다.
- 작은 화면 목록에서 작성, 편집, 복사와 누적을 완료하고 넓은 화면으로 돌아오면 geometry가 복원된다.
- HTTPS와 localhost HTTP에서 각각 Clipboard와 IndexedDB를 포함한 전체 과업을 완료한다.
- 화면 읽기 프로그램이 버튼 이름, 상태 알림, 분석 관계와 사용 횟수의 의미를 읽을 수 있고, keyboard focus가 가려지지 않는다.

### 중단 조건

문서 검사나 단위 test만으로 완료를 주장하지 않는다. 지원 브라우저의 실제 정적 결과물, 접근성 및 시각 검토 가운데 하나라도 필요한 증거가 없으면 해당 결과는 완료가 아니라 `needs revision` 또는 `needs human input`으로 남긴다.

## TDD 적용 요약

TDD 여부는 파일 종류나 모듈 크기가 아니라 구현 전에 사용자 결과 또는 저장 불변 조건을 안정적으로 쓸 수 있는지로 정한다.

- U1은 TDD를 적용하지 않고 운영용 빌드 및 Worker 기본 실행 검사를 사용한다.
- U2는 content revision과 외부 schema 규칙에만 TDD를 적용하고 조립 wiring에는 적용하지 않는다.
- U3은 TDD를 적용하지 않고 실제 브라우저 IndexedDB 통합 검사를 사용한다.
- U4는 TDD를 적용하지 않고 라우트, 반응형 렌더링과 담당자 검토를 사용한다.
- U5는 TDD를 적용하지 않고 U2의 content revision TDD 결과를 재사용한다. 본문 클릭, 텍스트 선택, 보조 키, 보드, 편집, focus와 drag는 실제 브라우저에서 확인한다.
- U6은 복사 및 누적 command의 성공과 실패 규칙에 TDD를 적용하고 실제 Clipboard에는 적용하지 않는다.
- U7은 누적 명령과 제거 이력에 TDD를 적용하고 드래그 이벤트 및 시각 상태에는 적용하지 않는다.
- U8은 합계 및 행 projection에 TDD를 적용하고 화면 내부 구조에는 적용하지 않는다.
- U9는 순수 분석기와 오래된 응답 판정에 TDD를 적용하고 Worker asset과 실행 수명에는 적용하지 않는다. 사용자 취소는 U11의 실제 시간 측정에서 필요성이 확인되기 전까지 구현하지 않는다.
- U10은 제안기, segment 편집, 스키마와 결과 생성기에 TDD를 적용하고 폼 연결 및 텍스트 선택에는 적용하지 않는다.
- U11은 TDD를 적용하지 않고 end-to-end, 빌드, 접근성 및 시각 검토로 완료를 판정한다.

각 자동 검사는 사용자에게 보이는 결과, 저장 불변 조건, 외부 시스템과 주고받기로 정한 동작 또는 순수 알고리즘 결과 가운데 하나를 이름으로 설명해야 한다. 내부 함수명, reducer action 문자열, 호출 횟수, CSS class, DOM 중첩, 구성요소 분리, 무관한 드래그 좌표와 큰 markup snapshot만 확인하는 테스트는 만들지 않는다. 테스트를 위해서만 운영 코드의 추상화를 추가하지 않는다.

## 미해결 실행 선택과 중단 지점

다음 항목은 사용자 동작을 바꾸는 미해결 요구사항이 아니라 구현을 시작할 때 실제 저장소와 배포 환경을 확인해 정할 기술 선택이다.

- U1은 독립 실행 프로젝트의 디렉터리, package manager, 정확한 의존성 버전, lockfile, 지원 브라우저와 HTTPS 및 localhost HTTP 제공 방식을 정해야 한다.
- U1은 브라우저 기본 IndexedDB와 wrapper, 기본 Pointer Events와 드래그 라이브러리를 각각 비교하고 직접 및 전이 의존성 검토 없이 새 package를 추가하지 않는다.
- U4는 대표 화면으로 시각 token과 밀도를 검토할 담당자를 확인해야 한다. 이 결정이 없으면 기능 기준선은 진행할 수 있지만 최종 시각 완료는 판정할 수 없다.
- 현재 로컬 애플리케이션에는 실행 모드를 선택하는 환경변수가 필요하지 않다. 계정 및 동기화 백로그를 시작할 때만 실행 구성 방식을 다시 결정한다.

이 선택이 해당 작업 단위의 중단 조건에 걸리면 추정으로 넘기지 않는다. 결정되지 않은 부분만 `needs human input`으로 남기고, 그 선택과 독립적인 앞선 작업만 계속한다.

## 계획 완료 판정

이 계획은 문서를 만들었다는 이유로 완료되지 않는다. U1부터 U11까지 요구사항에 연결된 관찰 결과가 있고, 적용한 개발 지침과 결정 기록을 다시 검토했으며, 정적 결과물의 실제 브라우저 흐름과 담당자 검토가 모두 `pass`인 경우에만 로컬 애플리케이션 완성을 주장할 수 있다.
