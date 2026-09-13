# 개인 메모 애플리케이션 테스트 전략

이 애플리케이션은 모든 모듈에 TDD를 적용하지 않는다. [모듈별 TDD와 동작 검증 결정](../../designs/personal-notes-app-8fd/decisions/verification-strategy.md)이 TDD 대상과 다른 검증 방식을 정하며, 구현자와 검토자는 이 문서의 판정 절차로 새 모듈과 변경된 책임에 알맞은 증거를 선택한다. 개별 테스트의 검증문과 선택자 품질은 [테스트 안티패턴 지침](test-anti-patterns.md)이 관리한다.

이 지침의 상태는 `current`다. 순수 규칙은 Vitest, IndexedDB 운영 모듈은 Vitest Browser Mode, Next.js 운영 서버의 사용자 과업은 Playwright Test로 확인한다. coverage 수치는 완료 목표로 사용하지 않는다.

## TDD 적용 판정

다음 질문에 모두 답할 수 있을 때만 TDD를 적용한다.

- 구현 전에 모듈이 받는 입력과 사용자 결과 또는 저장 불변 조건을 설명할 수 있는가
- 브라우저 화면 배치, 권한, 실행 시점이나 빌드 도구 내부 동작을 흉내 내지 않고 결과를 재현할 수 있는가
- 테스트가 함수명, 구성요소 트리와 자료구조를 몰라도 같은 책임을 검증할 수 있는가
- 실패 테스트가 빠진 동작을 증명하며 테스트만을 위한 추상화를 운영 코드에 추가하지 않는가

하나라도 충족하지 못하면 더 직접적인 검증 방식을 선택한다. 타입 및 스키마 검사는 자료 형태를, 브라우저 통합 검사는 외부 구현의 동작을, 운영용 기본 실행 검사는 빌드와 자산을, 실제 브라우저 검사는 사용 흐름과 Web API를, 담당자 검토는 시각 품질과 조작 가능성을 판정한다.

IndexedDB repository는 Vitest Browser Mode와 Playwright provider로 운영 모듈을 세 브라우저에서 직접 실행한다. Next.js 운영 빌드의 라우트, Worker URL 및 MIME type, CSS와 사용자 흐름은 Playwright Test의 `webServer`가 `next start`를 실행한 상태에서 확인한다. HTTPS는 TLS를 종료하는 배포 환경에서 같은 애플리케이션 revision으로 확인한다. 같은 결과를 두 도구가 검사하면 더 간접적인 검사를 제거하고, 일회용 fixture나 진단 스크립트를 저장소에 남기지 않는다.

## TDD 실행 규칙

TDD 대상으로 승인된 모듈은 한 번에 하나의 동작을 나타내는 실패 테스트부터 작성한다. 테스트 이름은 입력, 사용자의 동작 또는 상태 전이와 관찰 결과를 함께 드러내야 한다. 구현 뒤에는 사용자가 확인할 결과를 유지하면서 중복과 이름을 정리하며, 내부 구현을 바꿨다는 이유만으로 테스트를 고치지 않는다.

입력과 예상값을 나열하는 테스트가 적합한 정규화, 스키마와 상태 전이에서는 승인된 경계 사례를 각각 독립된 입력과 예상 결과로 둔다. coverage 수치는 누락 후보를 찾는 보조 신호일 뿐 완료 기준이나 테스트 생성 목표로 사용하지 않는다.

## 브라우저 및 저장소 검증

- Clipboard 대역은 명령이 성공과 실패를 처리하는 규칙을 확인할 때만 사용한다. 실제 쓰기, 사용자 활성화와 권한 알림은 대상 브라우저에서 별도로 확인한다.
- IndexedDB 대역은 application interface를 빠르게 검사하는 보조 수단일 수 있지만 transaction 완료, upgrade, `blocked`, `versionchange`, quota와 새로고침 보존의 증거가 될 수 없다.
- IndexedDB migration 검사는 이전 schema의 실제 record를 운영 repository로 읽는다. 새 규칙에서도 유효한 값은 그대로 유지되고 범위 밖 값만 보정되는지를 구분해 확인한다.
- Worker의 제어 가능한 메시지 수신기는 오래된 응답 판정 규칙을 검사할 수 있다. 자산 URL, MIME type, 실제 메시지 왕복과 주 실행 흐름의 응답성은 Next.js 운영 서버를 연 브라우저에서 확인한다.
- 메모 본문 클릭, 텍스트 선택, `Command+클릭`과 편집 전환은 순수 판정 함수로 복제하지 않는다. 실제 Selection API, 이벤트 순서와 브라우저 기본 동작을 사용하는 브라우저 검사에서 복사, 누적 또는 편집 가운데 의도한 결과 하나만 발생하는지 확인한다.
- 드래그 모의 동작은 최종 순서와 제거 결과를 확인한다. 라이브러리의 중간 이벤트 수나 정확한 포인터 좌표를 고정하지 않는다.
- route를 오가는 흐름은 메모리 상태와 저장 상태를 함께 확인한다. 제거 및 다시 실행 뒤 대상 선택이 정리되는지, 삭제 취소의 원래 만료 시각이 route 재진입으로 늘어나지 않는지 확인한다.

[Selection API](https://www.w3.org/TR/selection-api/)와 [Clipboard API](https://www.w3.org/TR/clipboard-apis/)는 선택 범위, 사용자 활성화와 권한 동작을 브라우저가 처리하는 규칙으로 정의한다. [IndexedDB](https://w3c.github.io/IndexedDB/)의 transaction 수명과 [HTML Worker 표준](https://html.spec.whatwg.org/multipage/workers.html)의 Worker 실행 및 메시지 규칙도 같은 이유로 실제 대상 브라우저의 증거가 필요하다. 내부 모의 객체는 application 명령의 분기만 확인하며 이 플랫폼 동작의 완료 증거로 사용하지 않는다.

## UI 테스트 기준

UI 자동화는 role, 접근 가능한 이름, 사용자가 입력한 값, 상태 알림, Clipboard 결과, 저장된 순서와 라우트 결과를 사용한다. CSS class, DOM 중첩, hook 호출 횟수와 구성요소 instance는 완료 증거가 아니다. 큰 스냅샷 대신 요구사항의 한 결과를 직접 확인하는 검증문을 사용한다.

일괄 복사 교환 검사는 항목을 네 개 이상 준비하고 첫 항목과 마지막 항목을 바꾼다. 가운데 항목이 그대로인지 확인해 제거 후 삽입과 구분한다. 화면 순서가 바뀐 결과를 확인한 뒤 새로고침 또는 새 repository 읽기로 같은 순서가 저장됐는지 다시 확인한다. 버튼 수나 비활성 버튼의 존재만으로 재정렬과 저장을 검증했다고 판단하지 않는다.

[Testing Library Guiding Principles](https://testing-library.com/docs/guiding-principles/)는 DOM node와 사용자가 쓰는 방식에 가까운 test를 권한다. [Playwright Best Practices](https://playwright.dev/docs/best-practices)는 사용자에게 보이는 동작과 접근 가능한 locator를 우선하고 구현 세부를 피하도록 안내한다.

## 모델 기반 탐색 적용

[기존 테스트의 목적 조사](../../designs/personal-notes-app-8fd/references/existing-test-purposes.md)를 먼저 읽고 추가할 탐색이 어떤 기존 규칙을 확장하는지 정한다. provider의 브라우저 검사에도 대역이 사용되므로 실행 도구 이름만으로 실제 저장소나 Worker의 검증 범위를 판단하지 않는다. 첫 대상과 실행 순서는 U12에서 관리하며 일괄 복사 목록은 요구사항 확인 전까지 보류한다.

[모델 기반 탐색 요구사항](../../designs/personal-notes-app-8fd/requirements.md#모델-기반-탐색-테스트)에 따라 순수 규칙의 예제 테스트에 행동 순서 탐색을 추가한다. fast-check와 `test:model`은 구성되어 있으며 기존 실행 증거는 [단일 실행 기록](../../designs/personal-notes-app-8fd/model-based-testing-execution.md)에 있다. 기능별 생성부터 재현까지의 완료 여부는 [U12 계획](../../designs/personal-notes-app-8fd/plan.md#u12-모델-기반-탐색과-실패-재현)의 증거로 판정한다.

생성할 행동과 결과 판정은 요구사항에 연결하고, 실제 구현의 자료구조와 알고리즘을 정답 모델로 복제하지 않는다. 정상 행동의 실행 조건이 비정상 시도까지 걸러내지 않는지 실제 실행 기록을 확인한다. 기대 결과 미정, 구현 위반과 환경 실패는 각각 구분한다.

매 생성 사례와 축소 후보는 독립된 초기 상태에서 실행한다. 브라우저 모델 실행에서는 바깥 Playwright 테스트 하나의 격리만으로 후보들이 분리된다고 가정하지 않는다. seed와 재실행 정보뿐 아니라 버전과 초기 자료를 기록하고, 장기 회귀에 필요한 실제 행동 및 입력도 보존한다. 구체적인 제약은 [재현 및 실행 격리 조사](../../designs/personal-notes-app-8fd/references/model-based-testing-research.md#실패-축소와-재실행)를 따른다.

모델 실행의 성공은 실제 IndexedDB transaction, Clipboard 권한과 브라우저 조작의 성공을 대신하지 않는다. 검토자는 생성 후보 수가 아닌 실제 실행 수, 통제된 결함 탐지, 축소 뒤 같은 위반의 재현과 정상 구현에서의 통과를 완료 근거로 확인한다.

## 리뷰 방법

구현자는 각 변경의 계획 단위 또는 변경 설명에 선택한 검증 방식과 그 이유를 남긴다. 검토자는 다음 순서로 판정한다.

1. 변경된 사용자 결과, 저장 불변 조건과 외부 시스템에서 확인할 동작을 찾는다.
2. TDD 판정 질문을 적용하고 [승인된 모듈 분류](../../designs/personal-notes-app-8fd/decisions/verification-strategy.md#승인된-결정)와 비교한다.
3. 각 테스트가 사용자에게 보이는 결과를 검사하는지 이름과 검증문에서 확인한다.
4. 브라우저 또는 빌드에서만 판단할 속성을 단위 테스트로 대신하지 않았는지 확인한다.
5. 실제 브라우저 및 저장소 증거와 담당자 검토가 필요한 항목을 실행 기록에서 확인한다.

판정은 `pass`, `needs revision`, `needs human input` 또는 `not applicable`로 기록하고 근거가 되는 테스트, 브라우저 결과나 요구사항 소제목을 함께 제시한다.

## 다시 검토할 때

공통 테스트 실행 도구, 대상 브라우저, CI와 coverage 도구가 승인되면 이 지침을 실제 명령과 연결한다. 모듈 책임이 합쳐지거나 나뉘어 TDD 판정이 달라지면 먼저 결정 기록을 검토하고, 특정 도구의 편의를 이유로 사용자 동작 규칙을 바꾸지 않는다.
