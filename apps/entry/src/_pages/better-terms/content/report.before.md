# AI를 활용한 테스트 코드 작성 조사

## 결론

AI에는 테스트 초안과 빠뜨린 사례의 후보를 만들게 하고, 기대 결과는 요구사항과 사용자에게 보이는 동작에서 먼저 정해야 한다. 생성된 테스트는 실행 여부, 단언의 의미, 실패 사례, 외부 시스템을 대신한 범위를 확인한 뒤 채택한다. 현재 저장소의 React 앱에는 Vitest와 Playwright가 있으므로 이 도구로 검증할 수 있는 모델 동작, 브라우저 상호작용과 화면 간 흐름을 우선 구분하는 것이 적절하다. Spring Boot 백엔드는 현재 저장소에서 확인되지 않았으므로 아래 백엔드 항목은 향후 Java 서비스에 적용할 기준이다. [Vitest의 AI 테스트 작성 지침](https://vitest.dev/guide/learn/writing-tests-with-ai), [GitHub Copilot 사용 지침](https://docs.github.com/en/copilot/get-started/best-practices), [Spring Boot 테스트 문서](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html)

## 근거와 해석

- Vitest 공식 문서는 AI 생성 테스트를 첫 초안으로 취급하고, 구현 세부사항을 검사하는 단언, 과도한 모의 객체, 실제 실행 실패, 누락된 예외 사례를 확인하도록 안내한다. 짧은 원문은 “Treat AI-generated tests as a first draft”이다. [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai)
- GitHub는 구체적인 요구사항과 관련 코드 및 설정을 제공하고, 생성 코드를 이해한 뒤 자동화 검사와 사람의 검토로 확인하라고 권한다. AI가 제시한 예상값 자체를 요구사항으로 받아들이지 말아야 한다는 아래 절차는 이 권고와 Vitest의 단언 검토 항목을 함께 적용한 해석이다. [GitHub Copilot](https://docs.github.com/en/copilot/get-started/best-practices), [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai)
- Meta의 TestGen-LLM 연구는 기존 사람이 작성한 테스트를 보강한 사례다. 대상 제품군에서 생성 사례의 75%가 빌드되었고, 57%가 안정적으로 통과했으며, 25%만 커버리지를 늘렸다. 특정 사내 시스템에서 얻은 수치이므로 React 또는 Spring Boot 프로젝트의 예상 성공률로 옮길 수 없다. AI 결과를 자동 채택하지 않고 실행과 개선 여부로 거르는 이유를 보여주는 사례로만 사용한다. [원 논문](https://arxiv.org/abs/2402.09171)

## 테스트를 만들기 전 정할 것

1. **검사할 동작:** 사용자 요청, API 사양, 버그 재현 자료, 저장 데이터 규칙 등에서 입력, 동작, 기대 결과를 적는다. 현재 코드가 반환한 값을 그대로 기대값으로 복사하면 기존 버그를 고정할 수 있다. AI에는 코드와 함께 이 독립적인 기대 결과를 제공한다. 이는 GitHub의 구체적 요구사항 제공 지침과 Vitest의 의미 있는 단언 기준을 적용한 권고다. [GitHub Copilot](https://docs.github.com/en/copilot/get-started/best-practices), [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai)
2. **실패 양상:** 정상 입력만 나열하지 말고 빈 입력, 값의 경계, 중복, 권한 부족, 네트워크 실패, 동시 변경 등 해당 기능에서 실제로 일어날 수 있는 경우를 고른다. 가능한 경우를 모두 기계적으로 추가하지 않고 결과가 달라지는 대표 사례를 선택한다. [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai)
3. **필요한 실행 범위:** 순수 계산, 브라우저 상호작용, HTTP 처리, 실제 데이터베이스 연동 중 결함이 드러날 가장 가벼운 수준을 고른다. 높은 수준의 테스트만 일괄 생성하면 무엇이 실패했는지 찾기 어렵고 실행 비용이 커진다. Spring은 단위 테스트에서 객체를 직접 생성할 수 있고, 필요할 때 애플리케이션 컨텍스트를 사용하는 통합 테스트로 확장하도록 설명한다. [Spring Boot](https://docs.spring.io/spring-boot/reference/testing/spring-applications.html)

## AI에 제공할 입력과 작업 순서

AI에 대상 함수 또는 사용자 흐름, 관련 타입과 의존성, 승인된 기대 결과, 기존 테스트 하나, 테스트 실행 설정, 실제로 허용한 모의 처리 범위를 제공한다. Vitest는 구현과 import, 기존 테스트, 설정을 함께 제공해야 잘못된 API와 실행 환경을 피할 수 있다고 설명한다. Spring Boot에서는 사용 중인 버전과 테스트 모듈을 함께 알려야 한다. 최신 참조 문서의 패키지나 애너테이션을 다른 버전의 프로젝트에 그대로 가져오면 빌드가 실패할 수 있기 때문이다. [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai), [Spring Boot 테스트 모듈](https://docs.spring.io/spring-boot/reference/testing/test-modules.html)

| 순서 | 사람의 판단과 AI의 도움 | 채택 기준 |
| --- | --- | --- |
| 1. 사례 선정 | 사람이 기능 요구사항에서 정상, 실패, 경계 상황의 기대 결과를 정한다. AI는 빠진 사례 후보를 제안한다. | 각 사례가 독립적인 근거와 관찰 가능한 결과를 가진다. |
| 2. 초안 생성 | AI가 기존 테스트 도구와 패턴을 참고하여 필요한 테스트만 작성한다. | 내부 메서드 호출 순서나 모의 객체 자체보다 결과를 확인한다. |
| 3. 실행 | 생성 직후 해당 테스트를 실행하고 컴파일, import, 비동기 처리 오류를 고친다. | 우연히 통과한 테스트가 아니라 기대 동작을 검증한다. |
| 4. 최종 확인 | 대표적인 오류가 있을 때 테스트가 실패할지를 사람이 검토한다. 중요한 규칙은 통제된 결함 주입이나 변이 테스트로 추가 확인할 수 있다. | 단언이 결함을 감지하고, 실행이 반복 가능하며, 유지할 가치가 있다. |

이 순서는 Vitest의 생성, 즉시 실행, 각 테스트 확인, 수정 절차를 바탕으로 하며, 변이 테스트는 단언의 결함 감지 능력이 중요한 경우에만 검토할 추가 수단이다. PIT는 변경한 코드에 테스트를 실행하여 변형이 살아남는지 확인한다. [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai), [PIT 기본 개념](https://pitest.org/quickstart/basic_concepts/)

AI에 전달할 요청은 다음 정도로 구체화할 수 있다. 저장소의 실제 지침과 대상 기능에 맞게 문장을 바꿔야 한다.

> `[대상 기능]`의 `[확인된 기대 동작]`을 검사할 테스트 후보를 먼저 나열하라. 각 사례의 입력, 사용자 또는 API 사용자가 관찰할 결과, 기대 결과의 근거를 적어라. 승인된 사례만 기존 `[테스트 도구와 버전]`으로 작성하라. `[실제 외부 의존성]`만 필요에 따라 대체하고 내부 구현 순서는 검사하지 마라. 테스트를 실행해 실패 원인을 보고하고, 요구사항이 불명확한 기대값은 추측하지 마라.

## React 프론트엔드에 적용

| 대상 | 적합한 확인 | AI 생성 테스트에서 살필 점 |
| --- | --- | --- |
| 모델과 순수 함수 | 입력에 따른 반환값, 오류와 상태 전이 | 구현과 같은 계산을 테스트에서 반복하지 않았는가. 하나의 경계 사례가 실제 규칙을 확인하는가. |
| 컴포넌트 상호작용 | 사용자가 찾는 이름과 역할로 요소를 찾고, 입력 뒤 보이는 상태를 확인 | CSS 클래스, 컴포넌트 내부 상태, 불필요한 `data-testid`에 묶이지 않았는가. 비동기 변경을 기다리는가. |
| 페이지 간 흐름 | 브라우저에서 탐색, 저장, 복원과 오류 표시를 확인 | 테스트 간 저장 상태가 격리되고, 고정 시간 지연이나 불안정한 선택자를 피하는가. |

Testing Library는 역할과 접근 가능한 이름으로 요소를 찾는 방식을 우선 권한다. `user-event`는 단일 DOM 이벤트보다 실제 입력 과정을 더 가깝게 재현한다. 브라우저가 필요한 동작은 Vitest Browser Mode 또는 Playwright에서 검증할 수 있으며, Playwright는 사용자에게 보이는 결과와 테스트 간 격리를 권한다. 비동기 화면 단언에는 Playwright의 자동 재시도 단언을 사용할 수 있다. [Testing Library 쿼리](https://testing-library.com/docs/queries/about/), [user-event](https://testing-library.com/docs/user-event/intro/), [Vitest Browser Mode](https://vitest.dev/guide/browser/), [Playwright 모범 사례](https://playwright.dev/docs/best-practices), [Playwright 단언](https://playwright.dev/docs/test-assertions)

이 저장소의 `apps/notes/package.json`에는 Vitest, Vitest Browser Mode와 Playwright 실행 명령 및 의존성이 있다. `apps/notes/src`에는 모델 테스트와 `.browser.test.tsx` 테스트가 있고, `apps/notes/e2e`에는 페이지 흐름 테스트가 있다. 따라서 새로운 도구를 가정하기보다 대상 동작에 맞는 기존 실행 수준을 선택하면 된다. React Testing Library는 공식적으로 유용한 접근법이지만, 현재 패키지 목록에 없으므로 이 보고서가 설치를 권하는 것은 아니다.

## Java Spring Boot 백엔드에 적용

| 대상 | 적합한 확인 | 주의할 점 |
| --- | --- | --- |
| 서비스 규칙 | Spring 컨텍스트 없이 객체를 생성하고 반환값, 예외, 상태 변화를 확인 | 저장소나 외부 서비스만 필요한 만큼 대신한다. 모의 객체의 호출 순서만 검사하지 않는다. |
| HTTP 처리 | `@WebMvcTest`와 MockMvc로 라우팅, 검증 오류, 상태 코드와 응답 본문을 확인 | 컨트롤러를 직접 호출하는 단위 테스트는 요청 매핑과 데이터 바인딩을 확인하지 못한다. |
| 데이터 접근 | `@DataJpaTest`로 실제 쿼리와 매핑 결과를 확인 | 운영 DB와 다른 임베디드 DB를 쓰면 차이가 남을 수 있다. 필요한 경우 실제 DB 유형으로 통합 검사를 구성한다. |
| 전체 흐름 | 필요할 때 `@SpringBootTest`와 실제 서버 또는 외부 서비스로 요청부터 저장 결과까지 확인 | `RANDOM_PORT`의 서버 요청은 테스트 메서드와 별도 트랜잭션에서 처리되어 테스트 메서드의 롤백만으로 정리되지 않는다. |

Spring Framework는 MockMvc가 서버를 띄우지 않고 MVC 요청 처리를 검증한다고 설명한다. Spring Boot 문서는 `@WebMvcTest`, `@DataJpaTest`, `@SpringBootTest`의 범위와 트랜잭션 차이를 명시한다. 실제 서비스가 DB 유형이나 드라이버 동작에 의존한다면 Testcontainers를 사용할 수 있지만, 설치 여부는 프로젝트의 DB와 실행 환경을 확인한 뒤 결정해야 한다. 인증과 권한을 검사하는 경우에는 Spring Security의 테스트 지원을 사용해 허용과 거부 양쪽 결과를 확인한다. [Spring Framework MockMvc](https://docs.spring.io/spring-framework/reference/testing/mockmvc/overview.html), [Spring Boot 애플리케이션 테스트](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html), [Spring Boot Testcontainers](https://docs.spring.io/spring-boot/reference/testing/testcontainers.html), [Spring Security 테스트](https://docs.spring.io/spring-security/reference/servlet/test/)

JUnit의 매개변수 테스트는 같은 규칙을 여러 입력으로 확인할 때 사용할 수 있다. 그러나 입력값을 무작정 늘리기보다 각 값이 다른 조건이나 결과를 대표하는지 먼저 확인해야 한다. 이는 JUnit이 제공하는 반복 실행 기능을 테스트 설계에 적용할 때의 권고다. [JUnit User Guide](https://docs.junit.org/6.1.3/writing-tests/parameterized-classes-and-tests.html)

## 생성 테스트의 채택 기준

- 테스트 이름과 본문만 읽어도 어떤 사용자 동작이나 API 결과가 보장되는지 알 수 있다.
- 기대값을 실제 실행 결과에서 그대로 복사하지 않았고, 요구사항이나 확인된 데이터 규칙으로 설명할 수 있다.
- 정상 사례와 실제 위험이 있는 실패 사례를 포함하되, 같은 동작을 여러 수준에서 이유 없이 반복하지 않는다.
- 모든 단언이 실제 결과를 확인하며 `toBeDefined` 같은 약한 단언만으로 끝나지 않는다. [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai)
- 모의 처리는 외부 시스템이나 통제하기 어려운 입력에 한정한다. 모의 객체에서 지정한 값을 그대로 받아 확인하는 테스트만 남기지 않는다. [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai)
- 비동기 처리를 기다리고 테스트마다 상태를 초기화한다. 재시도로만 간헐적 실패를 덮지 않는다. [Testing Library](https://testing-library.com/docs/react-testing-library/faq/), [Playwright](https://playwright.dev/docs/best-practices)
- 현재 프로젝트의 실제 버전과 설정으로 실행된다. Vitest의 AI 지침은 Jest API 혼용과 복원되지 않는 모의 객체를 대표적인 오류로 든다. [Vitest](https://vitest.dev/guide/learn/writing-tests-with-ai)

## 조사 범위

2026년 9월 28일에 공식 도구 문서와 원 연구를 확인했다. 이 보고서는 테스트 코드를 작성하거나 실행한 결과가 아니다. 현재 저장소의 패키지 목록과 테스트 파일 이름만 확인했으며, 기존 테스트의 품질이나 Spring Boot 백엔드의 존재를 검증했다고 주장하지 않는다. Spring Boot 참조 문서는 현재 제공되는 4.1.1 문서이므로 실제 Java 프로젝트에 적용할 때는 해당 프로젝트의 Spring Boot, Spring Framework와 JUnit 버전에 맞는 문서를 다시 확인해야 한다.
