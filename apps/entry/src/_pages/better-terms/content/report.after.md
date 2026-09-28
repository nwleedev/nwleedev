# React와 Spring Boot에서 AI로 테스트 코드를 작성하고 검토하는 방법

## 결론

AI에는 테스트 초안과 놓친 사례 후보를 제안하게 한다. 기대 동작은 요구사항과 사용자가 확인할 수 있는 행동에서 먼저 정한다. 생성된 테스트를 채택하기 전에는 실제로 실행되는지, 단언이 무엇을 확인하는지, 실패 사례가 있는지, 어떤 외부 시스템을 모의 처리했는지 살핀다. [Vitest의 AI 테스트 작성 지침](https://vitest.dev/guide/learn/writing-tests-with-ai), [GitHub Copilot 사용 지침](https://docs.github.com/en/copilot/get-started/best-practices)

현재 저장소의 React 앱은 Vitest와 Playwright를 사용한다. 상태 모델과 순수 함수, 브라우저에서의 상호작용, 화면을 이동할 때의 동작 가운데 무엇을 검사할지 먼저 정하면 된다. 현재 저장소에서는 Spring Boot 백엔드를 확인하지 못했으므로 백엔드 항목은 향후 Java 서비스에 적용할 기준으로 읽어야 한다. [Spring Boot 테스트 문서](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html)

## 근거와 해석

- Vitest 공식 문서는 AI 생성 테스트를 첫 초안으로 취급하고, 구현 세부사항을 검사하는 단언, 과도한 모의 객체, 실제 실행 실패, 누락된 예외 사례를 확인하도록 안내한다. 짧은 원문은 “Treat AI-generated tests as a first draft”이다. [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai)
- GitHub는 AI에 구체적인 요구사항과 테스트 대상 코드 및 설정을 제공하고, 생성된 코드를 이해한 뒤 자동화 도구와 사람이 확인하라고 권한다. 따라서 AI가 제시한 예상값을 그대로 요구사항으로 받아들이지 않고, 원래 기대한 동작과 대조해야 한다. 이는 GitHub의 권고와 Vitest의 단언 검토 기준을 함께 적용한 해석이다. [GitHub Copilot](https://docs.github.com/en/copilot/get-started/best-practices), [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai)
- Meta의 TestGen-LLM 연구는 사람이 작성한 기존 테스트를 보강한 사례다. Instagram의 Reels와 Stories에서 생성한 테스트 중 75%가 빌드되었고, 57%가 안정적으로 통과했으며, 25%가 커버리지를 늘렸다. 이 수치를 React 또는 Spring Boot 프로젝트의 예상 성공률로 옮길 수는 없다. AI가 생성한 테스트를 실행하고 실제 개선 여부를 확인해야 하는 이유를 보여주는 사례로만 사용한다. [원 논문](https://arxiv.org/abs/2402.09171)

## 테스트를 만들기 전 정할 것

1. **검사할 동작:** 사용자 요청, API 사양, 버그 재현 자료, 저장값에 관한 규칙에서 입력과 기대 동작을 확인한다. 현재 코드가 반환한 값을 기대값으로 그대로 복사하면 기존 버그까지 테스트에 고정할 수 있다. AI에는 코드와 별도로 확인한 기대 동작을 제공한다. 이는 GitHub의 구체적 요구사항 제공 지침과 Vitest의 의미 있는 단언 기준을 적용한 권고다. [GitHub Copilot](https://docs.github.com/en/copilot/get-started/best-practices), [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai)
2. **실패 양상:** 정상 입력 외에 빈 입력, 경계값, 중복, 권한 부족, 네트워크 실패, 동시 변경처럼 검사할 동작에서 실제로 일어날 수 있는 상황을 고른다. 모든 경우를 기계적으로 나열하기보다 동작이 달라지는 대표 사례를 선택한다. [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai)
3. **테스트 수준:** 순수 계산, 브라우저 상호작용, HTTP 처리, 실제 데이터베이스 연동 중 결함을 확인할 수 있는 가장 가벼운 수준을 고른다. 모든 사례를 상위 수준의 테스트로 만들면 실패 원인을 찾기 어렵고 실행 시간도 늘어난다. Spring은 단위 테스트에서 객체를 직접 생성할 수 있고, 필요할 때 애플리케이션 컨텍스트를 사용하는 통합 테스트로 확장하도록 설명한다. [Spring Boot](https://docs.spring.io/spring-boot/reference/testing/spring-applications.html)

## AI에 제공할 입력과 작업 순서

AI에 대상 함수나 사용자의 작업 순서, 그 코드에서 사용하는 타입과 의존성, 확인된 기대 동작, 기존 테스트 하나, 테스트 실행 설정을 제공한다. 어떤 외부 의존성을 모의 처리해도 되는지도 알려준다. Vitest는 구현 코드의 import와 타입, 기존 테스트, 설정을 함께 제공해야 잘못된 API와 실행 환경을 피할 수 있다고 설명한다. Spring Boot에서는 사용 중인 버전과 테스트 모듈도 알려야 한다. 최신 참조 문서의 패키지나 애너테이션을 다른 버전의 프로젝트에 그대로 가져오면 빌드가 실패할 수 있기 때문이다. [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai), [Spring Boot 테스트 모듈](https://docs.spring.io/spring-boot/reference/testing/test-modules.html)

| 순서 | 사람의 판단과 AI의 도움 | 채택 기준 |
| --- | --- | --- |
| 1. 사례 선정 | 사람이 요구사항에서 정상 동작, 실패와 경계값의 기대 동작을 정한다. AI는 놓친 사례 후보를 제안한다. | 각 사례에 기대 동작의 근거와 실제로 확인할 대상이 있다. |
| 2. 초안 생성 | AI가 기존 테스트 도구와 작성 방식을 참고해 필요한 테스트만 작성한다. | 내부 메서드 호출 순서나 모의 객체 자체보다 관찰할 동작을 확인한다. |
| 3. 실행 | 생성 직후 작성한 테스트를 실행하고 컴파일, import, 비동기 처리 오류를 고친다. | 테스트가 우연히 통과하지 않고 기대 동작을 검사한다. |
| 4. 최종 확인 | 대표적인 오류가 있을 때 테스트가 실패할지를 사람이 검토한다. 중요한 규칙은 통제된 결함 주입이나 변이 테스트로 추가 확인할 수 있다. | 단언이 결함을 감지하고, 실행이 반복 가능하며, 유지할 가치가 있다. |

이 순서는 Vitest의 생성, 즉시 실행, 각 테스트 확인, 수정 절차를 바탕으로 하며, 변이 테스트는 단언의 결함 감지 능력이 중요한 경우에만 검토할 추가 수단이다. PIT는 변경한 코드에 테스트를 실행하여 변형이 살아남는지 확인한다. [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai), [PIT 기본 개념](https://pitest.org/quickstart/basic_concepts/)

AI에 전달할 요청은 다음처럼 구체화할 수 있다. 저장소의 실제 지침과 테스트할 동작에 맞게 문장을 바꿔야 한다.

> `[테스트할 동작]`을 검사할 사례 후보를 먼저 나열하라. 각 사례의 입력, 사용자 또는 API 사용자가 확인할 동작이나 응답, `[확인된 기대 동작]`의 근거를 적어라. 승인된 사례만 기존 `[테스트 도구와 버전]`으로 작성하라. `[실제 외부 의존성]`만 필요에 따라 대체하고 내부 구현 순서는 검사하지 마라. 테스트를 실행해 실패 원인을 보고하고, 요구사항이 불명확한 기대값은 추측하지 마라.

## React 프론트엔드에 적용

| 대상 | 적합한 확인 | AI 생성 테스트에서 살필 점 |
| --- | --- | --- |
| 모델과 순수 함수 | 입력에 따른 반환값, 오류와 상태 전이 | 구현과 같은 계산을 테스트에서 반복하지 않았는가. 경계값 사례가 실제 규칙을 확인하는가. |
| 컴포넌트 상호작용 | 사용자가 찾는 이름과 역할로 요소를 찾고, 입력 뒤 보이는 상태를 확인 | CSS 클래스, 컴포넌트 내부 상태, 불필요한 `data-testid`에 묶이지 않았는가. 비동기 변경을 기다리는가. |
| 페이지 이동과 복원 | 브라우저에서 탐색, 저장, 복원과 오류 표시를 확인 | 테스트 간 저장 상태가 격리되고, 고정 시간 지연이나 불안정한 선택자를 피하는가. |

Testing Library는 역할과 접근 가능한 이름으로 요소를 찾는 방식을 우선 권한다. `user-event`는 단일 DOM 이벤트보다 실제 입력 과정을 더 가깝게 재현한다. 브라우저가 필요한 동작은 Vitest Browser Mode 또는 Playwright에서 검증할 수 있으며, Playwright는 사용자에게 보이는 결과와 테스트 간 격리를 권한다. 비동기 화면 단언에는 Playwright의 자동 재시도 단언을 사용할 수 있다. [Testing Library 쿼리](https://testing-library.com/docs/queries/about/), [user-event](https://testing-library.com/docs/user-event/intro/), [Vitest Browser Mode](https://vitest.dev/guide/browser/), [Playwright 모범 사례](https://playwright.dev/docs/best-practices), [Playwright 단언](https://playwright.dev/docs/test-assertions)

이 저장소의 `apps/notes/package.json`에는 Vitest, Vitest Browser Mode와 Playwright 실행 명령 및 의존성이 있다. `apps/notes/src`에는 모델 테스트와 `.browser.test.tsx` 테스트가 있고, `apps/notes/e2e`에는 페이지 이동을 검사하는 테스트가 있다. 따라서 새로운 도구를 가정하기보다 대상 동작에 맞는 기존 테스트 수준을 선택하면 된다. React Testing Library는 공식 문서가 안내하는 도구지만 현재 패키지 목록에는 없으므로, 이 보고서는 설치를 권하지 않는다.

## Java Spring Boot 백엔드에 적용

| 대상 | 적합한 확인 | 주의할 점 |
| --- | --- | --- |
| 서비스 규칙 | Spring 컨텍스트 없이 객체를 생성하고 반환값, 예외, 상태 변화를 확인 | 저장소나 외부 서비스만 필요한 만큼 대신한다. 모의 객체의 호출 순서만 검사하지 않는다. |
| HTTP 처리 | `@WebMvcTest`와 MockMvc로 요청 매핑, 검증 오류, 상태 코드와 응답 본문을 확인 | 컨트롤러를 직접 호출하는 단위 테스트는 요청 매핑과 데이터 바인딩을 확인하지 못한다. |
| 데이터 접근 | `@DataJpaTest`로 실제 쿼리와 엔티티 매핑을 확인 | 운영 DB와 다른 임베디드 DB를 쓰면 차이가 남을 수 있다. 필요한 경우 실제 DB 유형으로 통합 검사를 구성한다. |
| HTTP 요청부터 저장까지 | 필요할 때 `@SpringBootTest`와 실제 서버 또는 외부 서비스로 요청부터 저장된 값까지 확인 | `RANDOM_PORT`의 서버 요청은 테스트 메서드와 별도 트랜잭션에서 처리되어 테스트 메서드의 롤백만으로 정리되지 않는다. |

Spring Framework는 MockMvc가 서버를 띄우지 않고 MVC 요청 처리를 검증한다고 설명한다. Spring Boot 문서는 `@WebMvcTest`, `@DataJpaTest`, `@SpringBootTest`가 각각 검사하는 부분과 트랜잭션 차이를 명시한다. 실제 서비스가 DB 유형이나 드라이버 동작에 의존한다면 Testcontainers를 사용할 수 있지만, 설치 여부는 프로젝트의 DB와 실행 환경을 확인한 뒤 결정해야 한다. 인증과 권한을 검사할 때는 Spring Security의 테스트 도구로 허용되는 요청과 거부되는 요청을 모두 확인한다. [Spring Framework MockMvc](https://docs.spring.io/spring-framework/reference/testing/mockmvc/overview.html), [Spring Boot 애플리케이션 테스트](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html), [Spring Boot Testcontainers](https://docs.spring.io/spring-boot/reference/testing/testcontainers.html), [Spring Security 테스트](https://docs.spring.io/spring-security/reference/servlet/test/)

JUnit의 매개변수 테스트는 같은 규칙을 여러 입력으로 확인할 때 사용할 수 있다. 다만 입력값을 무작정 늘리기보다 각 값이 서로 다른 조건이나 동작을 대표하는지 먼저 확인해야 한다. 이는 JUnit이 제공하는 입력별 반복 실행을 테스트 설계에 적용할 때의 권고다. [JUnit User Guide](https://docs.junit.org/6.1.3/writing-tests/parameterized-classes-and-tests.html)

## 생성 테스트의 채택 기준

- 테스트 이름과 본문만 읽어도 어떤 사용자 동작이나 API 응답을 검사하는지 알 수 있다.
- 기대값을 현재 코드의 실행값에서 그대로 복사하지 않았고, 요구사항이나 확인된 저장값 규칙으로 설명할 수 있다.
- 정상 사례와 실제 위험이 있는 실패 사례를 포함하되, 같은 동작을 여러 수준에서 이유 없이 반복하지 않는다.
- 단언이 실제 반환값이나 화면 변화를 확인하며 `toBeDefined` 같은 약한 단언만으로 끝나지 않는다. [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai)
- 모의 처리는 외부 시스템이나 통제하기 어려운 입력에 한정한다. 모의 객체에서 지정한 값을 그대로 받아 확인하는 테스트만 남기지 않는다. [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai)
- 비동기 처리를 기다리고 테스트마다 상태를 초기화한다. 재시도로만 간헐적 실패를 덮지 않는다. [Testing Library](https://testing-library.com/docs/react-testing-library/faq/), [Playwright](https://playwright.dev/docs/best-practices)
- 현재 프로젝트의 실제 버전과 설정으로 실행된다. Vitest의 AI 지침은 Jest API 혼용과 복원되지 않는 모의 객체를 대표적인 오류로 든다. [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai)

## 확인한 자료와 한계

2026년 9월 28일에 공식 도구 문서와 원 연구를 확인했다. 이 보고서를 위해 테스트 코드를 작성하거나 실행하지는 않았다. 현재 저장소에서는 패키지 목록과 테스트 파일 이름만 확인했다. 기존 테스트의 품질을 평가하지 않았고 Spring Boot 백엔드도 확인하지 못했다. Spring Boot 참조 문서는 현재 제공되는 4.1.1 문서이므로 실제 Java 프로젝트에 적용할 때는 그 프로젝트의 Spring Boot, Spring Framework와 JUnit 버전에 맞는 문서를 다시 확인해야 한다.
