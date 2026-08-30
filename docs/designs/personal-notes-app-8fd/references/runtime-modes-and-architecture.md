# 로컬 모드와 계정 모드의 실행 구조 조사

## 결론

두 실행 형태는 메모, 누적, 분석과 템플릿 use case 및 공통 UI에 서로 다른 저장, 동기화와 분석 구현을 주입하는 구성이 적합하다. 빌드 시점의 공개 환경변수 하나로 실행 구성을 선택하고, 앱 시작 지점에서 이를 capabilities와 어댑터 묶음으로 변환하는 방식을 우선 검토할 수 있다. 화면 컴포넌트가 환경변수를 직접 읽거나 제공 항목마다 별도 환경변수를 두는 방식은 피하는 편이 낫다.

로컬 모드의 줄 단위 텍스트 겹침 분석은 백엔드와 LLM 없이 구현할 수 있다. 원문을 줄바꿈으로 분리하고, 유니코드 정규화 뒤 정확한 일치, 포함 관계와 문자 조각 기반 근접도를 계산하면 된다. 사용자가 분석을 요청할 때만 Web Worker에서 실행하면 정적 배포 조건과 명시적 실행 요구사항을 함께 만족시킬 수 있다.

이 문서는 [개인 메모 애플리케이션 요구사항](../requirements.md)의 두 실행 형태, 환경변수 검토, 의존성 주입, 백엔드 없는 분석 가능성을 조사한 참고 자료다. 구현 책임자가 조사 제안을 비교하고 결정 책임자가 실행 구조를 승인할 때 사용한다. 아래의 `제안`은 승인된 결정이 아니다. 공식 문서와 표준은 2026년 8월 30일에 검토했다.

## 저장소에서 확인한 전제

현재 저장소에는 애플리케이션 소스, 패키지 매니페스트, 잠금 파일, 프레임워크 설정과 데이터베이스 설정이 없다. 따라서 이 조사에서는 프레임워크, 데이터베이스 시스템, DI 컨테이너나 feature flag 라이브러리를 선택하지 않는다. Next.js와 Vite 자료는 환경변수와 정적 빌드가 널리 쓰이는 도구에서 어떻게 동작하는지 비교하는 근거일 뿐, 기술 스택 선정 근거가 아니다.

## 환경변수는 빌드 구성을 선택하는 입력으로만 쓴다

[Vite의 환경변수와 모드 문서](https://vite.dev/guide/env-and-mode)는 클라이언트에 노출되는 `import.meta.env` 값이 빌드 시 정적으로 치환된다고 설명한다. [Next.js 환경변수 문서](https://nextjs.org/docs/pages/guides/environment-variables)도 `NEXT_PUBLIC_` 변수가 브라우저 번들에 포함되며 빌드 뒤 값이 고정된다고 설명한다. 두 도구의 공통점은 공개 환경변수가 실행 중 바뀌는 비밀 설정이 아니라 빌드 결과를 만드는 공개 입력이라는 점이다.

[Next.js 정적 내보내기 문서](https://nextjs.org/docs/app/guides/static-exports)는 정적 결과물이 HTML, CSS와 JavaScript 파일로 만들어지며 요청마다 서버가 실행되어야 하는 기능은 지원하지 않는다고 명시한다. 이 사실은 특정 프레임워크 선택과 무관하게, 정적 결과물만 배포하는 로컬 모드가 요청 시점의 서버 기능에 기대면 안 된다는 요구를 뒷받침한다.

[Twelve-Factor App의 설정 원칙](https://12factor.net/config)은 배포마다 달라지는 설정을 코드에서 분리해 환경변수로 관리하라고 권한다. 그러나 이 원칙은 UI와 도메인 코드가 환경변수를 직접 읽어도 된다는 뜻이 아니다. 환경변수는 배포 설정을 전달하고, 애플리케이션 내부에서는 타입이 있는 구성 객체로 변환하는 책임을 별도로 두는 편이 역할을 분명히 한다.

### 제안: 하나의 모드에서 기능 목록을 파생한다

빌드 입력은 제안 이름인 `APP_MODE` 하나로 제한하고, 값은 두 실행 형태 가운데 하나를 나타내야 한다. 시작 지점인 composition root가 값을 검증한 뒤 다음 두 결과를 만든다.

- `capabilities`: 계정, 원격 동기화, 서버 분석처럼 현재 실행 형태가 제공하는 기능 목록
- `dependencies`: 저장소, 클립보드, 겹침 분석기와 동기화 서비스의 실제 구현 묶음

기능마다 `ENABLE_SYNC`, `ENABLE_ACCOUNT`, `ENABLE_REMOTE_STORAGE` 같은 환경변수를 따로 두면 계정 UI는 보이지만 원격 저장소는 없는 잘못된 조합을 만들 수 있다. 하나의 실행 형태에서 기능 목록을 파생하면 허용된 조합을 한 지점에서 검사할 수 있다.

공개 환경변수는 번들 안에서 읽을 수 있으므로 권한 검사의 근거가 될 수 없다. 계정 모드의 서버는 클라이언트 기능 목록과 관계없이 인증과 데이터 접근 권한을 검증해야 한다.

동일한 빌드 결과물을 배포 뒤 설정만 바꿔 두 형태로 전환해야 한다면 빌드 시점 환경변수만으로는 부족하다. 이 경우 서버가 제공하는 공개 런타임 설정이나 배포 시 생성하는 설정 파일이 필요하지만, 로컬 결과물에 계정 전용 코드까지 포함된다. 현재 요구처럼 두 결과물을 각각 배포할 수 있다면 빌드 시점 분리가 더 단순하며 로컬 결과물에서 계정 전용 코드를 제외하기도 쉽다.

## DI와 IoC는 실행 형태의 차이를 시작 지점에 모은다

[Martin Fowler의 Dependency Injection 글](https://martinfowler.com/articles/injection.html)은 객체가 필요한 구현을 직접 찾는 대신 외부 구성 코드가 구현을 전달하도록 설명하며, 특별한 이유가 없을 때 constructor injection을 우선하는 결론을 제시한다. [Inversion of Control 설명](https://martinfowler.com/bliki/InversionOfControl.html)은 프레임워크나 상위 흐름이 호출 순서를 맡고 애플리케이션 코드가 정해진 지점에 동작을 제공하는 구조를 설명한다. DI는 IoC를 구현하는 한 방법이며 두 용어를 같은 뜻으로 사용할 필요는 없다.

[Alistair Cockburn의 Ports and Adapters 설명](https://alistair.cockburn.us/hexagonal-architecture)은 애플리케이션의 내부 동작을 UI, 데이터베이스와 자동화된 테스트 같은 외부 기술에서 분리하고, 포트 뒤의 어댑터를 교체할 수 있게 구성한다. 로컬 저장소와 원격 저장소가 같은 과업을 제공해야 하는 이번 요구와 직접 맞닿는다.

### 제안: 수동 DI와 포트 및 어댑터를 먼저 사용한다

현재 의존성 그래프가 없으므로 DI 컨테이너 패키지를 추가할 근거도 없다. TypeScript interface와 일반 함수 또는 생성자만으로 다음 구조를 먼저 구성하는 방안을 검토한다.

```text
build configuration
  -> composition root
    -> capabilities
    -> local adapters or account adapters
      -> shared application use cases
        -> shared UI
```

공통 use case가 의존할 포트의 후보는 다음과 같다.

- `NoteRepository`: 메모와 공간 배치를 저장하고 읽는다.
- `AccumulatorRepository`: 누적 텍스트와 순서를 저장하고 읽는다.
- `TemplateRepository`: 템플릿과 플레이스홀더를 저장하고 읽는다.
- `UsageRepository`: 일반 복사와 누적 조작 횟수를 구분해 기록한다.
- `TextOverlapAnalyzer`: 줄 단위 겹침을 분석한다.
- `ClipboardPort`: 클립보드 쓰기 결과를 성공 또는 실패로 돌려준다.
- `SyncService`: 계정 모드에서만 제공하며 로컬 변경을 서버와 맞춘다.

로컬 composition root는 IndexedDB 저장 어댑터와 브라우저 분석기를 주입하고 `SyncService`를 제공하지 않는다. 계정 composition root는 원격 저장 어댑터와 동기화 서비스를 주입한다. UI는 `capabilities`를 보고 계정 전용 탐색 항목과 화면을 아예 만들지 않으며, 공통 화면은 같은 use case를 호출한다.

Service Locator처럼 use case가 전역 레지스트리에서 의존성을 찾으면 어떤 실행 형태에서 무엇이 필요한지 호출 지점만 보고 알기 어렵다. 시작 지점에서 의존성을 만들고 필요한 use case에 명시적으로 전달하면 로컬 코드가 실수로 서버 구현을 부르는 문제도 타입과 구성 검사에서 발견하기 쉬워진다.

## 로컬 저장과 분석은 브라우저 API만으로 수행할 수 있다

[Indexed Database API 3.0 표준](https://www.w3.org/TR/IndexedDB/)은 브라우저 안에서 구조화된 레코드와 인덱스를 저장하고 트랜잭션으로 변경을 묶는 API를 정의한다. 메모, 좌표, 누적 상태, 사용 횟수와 템플릿처럼 서로 다른 객체를 로컬에 저장할 수 있다. 다만 [Storage API의 영구 저장소 설명](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)은 영구 저장 요청이 승인된다는 보장이 없음을 명시하므로, IndexedDB만으로 장기 보관과 백업을 보장할 수는 없다.

[HTML 표준의 Web Workers 절](https://html.spec.whatwg.org/multipage/workers.html)는 문서의 UI 흐름과 분리된 작업자를 정의한다. 분석을 Worker에 두면 많은 줄을 비교하는 동안 메모 이동과 화면 조작이 멈추는 위험을 줄일 수 있다. Worker는 성능 문제를 없애는 것이 아니라 UI 스레드와 계산을 분리하는 수단이므로, 입력 규모에 따른 시간과 메모리 측정은 별도로 필요하다.

### 제안: 명시적 분석 요청 뒤 다음 절차를 실행한다

1. 분석을 누른 시점의 메모 내용과 revision을 스냅샷으로 만든다.
2. 각 메모의 원문을 줄바꿈으로 나누고 빈 줄 처리 규칙을 적용한다.
3. [Unicode Normalization Forms](https://unicode.org/reports/tr15/)의 NFC처럼 승인된 정규화 규칙으로 비교용 문자열을 만든다. 원문은 바꾸지 않는다.
4. 정규화된 문자열이 같은 줄을 정확한 반복으로 묶는다.
5. 한 줄이 다른 줄에 포함되는 관계를 찾는다.
6. 나머지 후보는 문자 n-gram 집합의 Jaccard 계열 점수나 지문 기반 점수로 어휘상 근접 반복을 계산한다.
7. 점수, 알고리즘 버전과 원본 줄 위치를 결과로 돌려준다.

[Broder의 문서 resemblance와 containment 논문](https://www.cs.princeton.edu/courses/archive/spr05/cos598E/bib/broder97resemblance.pdf)은 문자열 조각 집합을 이용해 문서 간 유사성과 포함 관계를 계산하는 방법을 제시한다. [Winnowing 논문](https://www.cs.princeton.edu/courses/archive/spring05/cos598E/bib/p76-schleimer.pdf)은 부분 일치를 찾기 위한 지문 선택 방법과 보장 조건을 설명한다. 두 방법은 의미의 같음을 판별하지 않지만, 요구사항의 생김새 기반 반복과 포함 관계 후보를 줄이는 근거가 된다.

한국어와 영어가 섞인 메모에서는 단어 분리 규칙에만 기대기보다 문자 n-gram을 우선 검토할 수 있다. 이는 승인된 알고리즘 선택이 아니다. n의 크기, 점수 기준, 짧은 줄 예외와 오탐 허용 범위는 실제 예제와 성능 측정으로 정해야 한다.

줄이 `n`개일 때 모든 쌍을 직접 비교하면 `n(n-1)/2`개 비교가 필요하다. 정확 일치 해시, 길이 차이, 공통 지문이나 역색인으로 후보를 먼저 줄이고, 분석 중 진행률과 취소 동작을 제공하는 방안이 필요하다. 입력 제한은 측정 전 임의로 정하지 않는다.

## 클립보드 실패는 실제 쓰기 결과로 판단한다

[Clipboard API and Events 표준](https://www.w3.org/TR/clipboard-apis/)은 비동기 클립보드 접근에 secure context와 사용자 활성화 또는 권한 조건이 적용될 수 있음을 정의한다. [MDN의 Clipboard API 문서](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)는 브라우저마다 `clipboard-write` 권한 처리와 사용자 활성화 요구가 다름을 정리한다. 따라서 Permissions API의 사전 조회만으로 복사 가능 여부를 결정하지 말고, 실제 `writeText` 결과를 처리해야 한다.

[Secure Contexts 표준](https://www.w3.org/TR/secure-contexts/)은 HTTPS, loopback과 규칙을 지키는 localhost를 잠재적으로 신뢰할 수 있는 출처로 다룬다. `file:`도 기본 알고리즘에서는 신뢰 대상으로 보지만 브라우저가 더 엄격하게 제외할 수 있다고 허용한다. [MDN의 same-origin policy 설명](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy)은 로컬 파일의 origin 처리가 구현별로 다르며 현대 브라우저가 보통 opaque origin으로 다룬다고 설명한다. 로컬 모드는 HTTPS 정적 호스팅이나 localhost를 우선 배포 후보로 두고, `file://` 직접 실행 지원 여부는 대상 브라우저에서 별도로 검증해야 한다.

## 계정 동기화에는 서버가 최종 변경을 판정할 기준이 필요하다

[HTTP Semantics의 ETag와 If-Match 규칙](https://httpwg.org/specs/rfc9110.html#field.if-match)은 클라이언트가 읽은 표현과 서버의 현재 표현이 같은 경우에만 변경을 적용해 갱신 손실을 막는 방법을 정의한다. 계정 모드는 각 엔티티의 revision이나 HTTP validator를 사용해 충돌을 감지하고, 충돌했을 때 덮어쓰기, 병합 또는 사용자 선택 가운데 어떤 동작을 할지 정해야 한다.

[Apache CouchDB의 충돌 설명](https://docs.couchdb.org/en/stable/replication/conflicts.html)은 분산 변경이 충돌할 수 있으며 선택된 승자 외의 revision도 충돌 정보로 남는 모델을 보여준다. [CouchDB 문서 API의 삭제 설명](https://docs.couchdb.org/en/stable/api/document/common.html#delete--db-docid)는 삭제를 즉시 흔적 없이 없애지 않고 삭제 revision으로 기록한다. 특정 데이터베이스를 추천하는 근거가 아니라, 오프라인 변경과 삭제를 여러 기기에 전파하려면 tombstone과 충돌 정책이 필요하다는 비교 사례다.

데이터베이스 시스템과 인증 방식은 아직 선택할 수 없다. 계정 모드의 저장 구조는 [데이터 구조 조사 초안](data-model-draft.md)의 논리 모델과 충돌 해결 쟁점을 먼저 승인한 뒤 결정해야 한다.

## 결정이 필요한 사항과 계획 영향

- 두 실행 형태를 별도 빌드 결과물로 배포할지, 한 결과물에 런타임 설정을 주입할지 결정해야 composition root와 배포 검증을 확정할 수 있다.
- 로컬 배포가 `file://` 직접 열기를 반드시 지원해야 하는지 결정해야 클립보드, 모듈 로딩, IndexedDB와 브라우저 범위를 검증할 수 있다.
- 겹침 점수와 입력 정규화 규칙을 승인하기 전에는 분석 결과의 합격 기준을 정할 수 없다.
- 계정 동기화의 충돌과 삭제 규칙을 승인하기 전에는 서버 API와 데이터베이스 구조를 확정할 수 없다.
- 현재는 외부 의존성이나 버전을 추가하지 않는다. 기술 스택과 매니페스트가 생긴 뒤 플랫폼 기능, 내부 구현과 후보 패키지의 직접 및 전이 의존성을 다시 비교해야 한다.
