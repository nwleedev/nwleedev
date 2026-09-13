# 개인 메모의 모델 기반 탐색 테스트 조사

현재 앱에는 기존 테스트의 목적을 먼저 파악하고, 요구사항과 비교해 선정한 도메인에 fast-check의 행동 순서 탐색을 추가하는 방식이 적합하다. 첫 적용 대상은 미정이며 일괄 복사 목록은 요구사항 확인 전까지 보류한다. 실제 IndexedDB와 Next.js 화면의 증거는 현재 브라우저 검사로 유지한다. seed만 저장하면 재현이 보장된다는 가정과 모든 비동기 실행을 스케줄러가 통제한다는 가정은 적용할 수 없다.

이 자료는 [모델 기반 탐색 테스트 요구사항](../requirements.md#모델-기반-탐색-테스트)을 구현할 때 사용할 기술 근거다. 2026-09-13에 공식 문서, 배포 정보와 현재 저장소를 확인했다. 아래 구현 제안은 실행 결과나 설치 완료를 뜻하지 않는다.

## 현재 실행 환경과 첫 적용 대상

[앱 매니페스트](../../../../apps/notes/package.json)는 TypeScript 6.0.3, Vitest 및 Browser Mode 4.1.11, Playwright Test 1.62.1을 고정한다. Node.js 조건은 `>=24.15.0 <25`, pnpm은 11.22.0이다. 매니페스트와 잠금 파일에는 fast-check와 XState가 없다.

[Vitest 설정](../../../../apps/notes/vitest.config.ts)은 `src/**/*.{test,spec}.{ts,tsx}`를 수집하고 브라우저 전용 검사를 제외한다. 따라서 제안서의 최상위 `tests/model/` 구조를 그대로 추가하면 현재 단위 테스트 명령으로 실행되지 않는다. 첫 모델은 선정한 도메인의 `src/` 안에서 기존 단위 테스트와 함께 배치하고, 공통 실행 코드가 실제로 생길 때 분리하는 방식을 제안한다.

[Browser Mode 설정](../../../../apps/notes/vitest.browser.config.ts)은 Chromium, Firefox와 WebKit에서 운영 모듈을 실행한다. [Playwright 설정](../../../../apps/notes/playwright.config.ts)은 `e2e/`의 과업별 spec과 `next start`를 사용한다. 조사한 Git 추적 파일에는 GitHub Actions, GitLab CI, Azure Pipelines 또는 Jenkins의 실행 설정이 없다. CI 완료 증거는 아직 없으며, PoC에서 실행 환경과 명령 연결을 마련해야 한다.

[기존 테스트의 목적 조사](existing-test-purposes.md)에는 자동 저장 및 초안 복구, 삭제 복원과 오래된 분석 응답 배제처럼 상태 변화가 드러나는 사례가 있다. 이들은 검토 후보이며 현재 검증문만으로 첫 대상이나 정답을 확정하지 않는다. 일괄 복사 목록의 순서 및 이력 동작은 요구사항을 확인한 뒤 별도로 판단한다.

## 명령 생성과 오류 판정

[fast-check 모델 기반 테스트 문서](https://fast-check.dev/docs/advanced/model-based-testing/)는 모델을 “a simplified representation”으로 설명한다. `check`는 실행할 상태인지 판단하고 `run`은 실제 동작과 검증을 수행한다. `commands`는 실행된 명령을 고려해 실패 순서를 축소하며, 동기 및 비동기 실행에는 각각 `modelRun`과 `asyncModelRun`을 제공한다.

[Hypothesis 상태 기반 테스트](https://hypothesis.readthedocs.io/en/latest/stateful.html)는 규칙의 연속 실행, 전제조건, 불변 조건과 이전 실행에서 생성한 값의 재사용을 제공한다. 두 도구의 공통점은 단일 입력뿐 아니라 앞 행동의 결과에 의존하는 다음 행동을 탐색한다는 것이다. Hypothesis는 Python 도구이므로 이 앱의 실행 의존성으로 추가할 이유는 없지만, 생성한 항목의 ID를 후속 행동에 연결하는 설계 근거가 된다.

오래된 식별자나 빈 이력에 대한 시도를 탐색하려면 그 상태에서도 명령을 실행하도록 정의해야 한다. 정상 상태만 허용하는 `check`를 공통으로 적용하면 의도한 비정상 시도를 건너뛴다. 반대로 반복이나 빈 값이라는 이유만으로 실패라고 판정할 수도 없다. 대상의 요구사항에 따라 거부, 허용된 반복 또는 상태 보존을 비교하고 기대 결과가 없는 시도는 미정으로 남긴다.

생성된 명령 수와 실제 실행 수는 다르다. `maxCommands`는 상한이며 최소 실행 수가 아니다. [명령 생성 옵션](https://fast-check.dev/docs/core-blocks/arbitraries/others/)을 설정하는 것만으로 비정상 시도 2종이 실행됐다고 볼 수 없다. PoC에서는 실제 실행된 행동 종류와 횟수도 확인해야 한다.

## 실패 축소와 재실행

[fast-check의 재실행 절차](https://fast-check.dev/docs/advanced/model-based-testing/#replay-model-based-tests)는 `assert`에 `seed`와 `path`, `commands`에 `replayPath`를 전달한다. `replayPath`는 실행 조건 때문에 생략된 명령의 이력을 반영한다. 축소 결과를 바로 재실행할 때는 문서 예제처럼 `endOnFailure: true`를 사용하되, 처음 실패를 찾는 실행부터 이 값을 켜서 축소를 생략하지 않는다.

유지관리자는 [재현 seed의 장기 보존 논의](https://github.com/dubzzz/fast-check/discussions/4406#discussioncomment-7490585)에서 minor 버전 변경만으로도 seed와 path가 같은 사례를 만들지 않을 수 있다고 설명한다. 따라서 단기 진단에는 재실행 값과 정확한 버전을 함께 기록하고, 장기 회귀에는 실제 입력과 행동 순서를 보존하는 방식을 제안한다. 명령 클래스의 문자열 출력만으로 역직렬화가 가능하다고 가정하지 않는다.

실패 기록에는 요구사항의 필수 항목 외에 앱 및 모델 revision, fast-check와 pure-rand 버전, 실행 설정, Node.js 또는 브라우저 버전, 초기 자료와 제어한 시각 및 ID 생성 조건을 포함하는 것이 필요하다. 난수 seed를 고정해도 `Date.now()`, 임의 ID, 남은 저장 자료와 외부 응답 시점은 자동으로 고정되지 않기 때문이다.

축소 결과는 설정한 축소 규칙과 시간 안에서 얻은 사례다. 모든 가능한 순서를 비교해 가장 짧은 사례를 찾았다는 뜻은 아니다. 알려진 결함 사례에서는 불필요한 행동이 실제로 줄고 같은 불변 조건 위반이 남는지를 확인한다.

## 실행별 초기화와 비동기 제한

[Playwright의 격리 문서](https://playwright.dev/docs/browser-contexts)는 테스트마다 독립 BrowserContext를 사용하는 방식을 설명한다. 한 Playwright 테스트 안에서 fast-check가 여러 생성 사례와 축소 후보를 실행하면, 바깥 테스트의 기본 context 하나만으로는 후보 사이의 격리가 되지 않는다. 브라우저 Adapter는 각 후보를 실행할 때 초기 자료를 새로 구성하고 명시적으로 만든 context를 닫아야 한다.

Domain Adapter도 같은 이유로 매 실행에 새 모델과 새 실행 대상을 만든다. 한 행동 순서 내부의 새로고침은 저장 자료를 보존하고 실행 중 이력을 초기화하는 도메인 행동이다. 다음 생성 사례를 시작할 때의 전체 초기화와 구분해야 한다. IndexedDB의 transaction, 연결 종료와 새로고침 보존은 [기존 테스트 전략](../../../dev/personal-notes-app/testing-strategy.md#브라우저-및-저장소-검증)의 실제 브라우저 증거를 계속 사용한다.

[fast-check 스케줄러 문서](https://fast-check.dev/docs/advanced/race-conditions/)에 따르면 `scheduleFunction`은 호출 자체를 늦추지 않고 반환한 Promise가 관찰되는 완료 순서를 늦춘다. 연결하지 않은 네트워크 요청이나 외부 이벤트는 통제하지 못한다. 따라서 Worker 응답의 수락 순서와 실제 Worker 계산 순서, IndexedDB 저장 명령의 완료 관찰과 실제 transaction 실행 순서를 같은 것으로 취급하지 않는다.

[시간 제한 문서](https://fast-check.dev/docs/configuration/timeouts/)도 시간 초과가 진행 중 Promise를 취소하지 않는다고 명시한다. 이전 후보의 작업이 다음 후보를 바꾸지 않도록 완료를 기다리거나 실행 대상을 종료해야 한다. 시간 제한으로 중단한 탐색은 완료한 실행과 구분하고, 필수 실행량을 채우지 못한 결과를 CI 성공으로 잘못 보고하지 않도록 설정해야 한다.

## 의존성과 대안

### fast-check

조사일의 [최신 공식 배포](https://github.com/dubzzz/fast-check/releases/tag/v4.10.0)는 2026-09-11의 4.10.0이다. [해당 버전 매니페스트](https://github.com/dubzzz/fast-check/blob/v4.10.0/packages/fast-check/package.json)는 MIT 라이선스, Node.js `>=12.17.0`, ESM 및 CommonJS 진입점과 실행 의존성 `pure-rand: ^8.0.0`을 명시한다. 앱의 Node.js 조건은 이 최소 버전을 충족한다. 이 사실은 설치 및 테스트 성공을 뜻하지 않는다.

통합 방식은 Vitest 테스트 안에서 fast-check의 property를 실행하고 모델의 행동을 실제 도메인 함수에 연결하는 것이다. 기존 Vitest는 사례 실행과 assertion을 맡고 fast-check는 생성과 축소를 맡으므로 새 테스트 러너는 필요하지 않다. 주의할 점은 생성기 변경에 따른 재현값 변화, 실행 조건에 따른 명령 생략과 브라우저 실행 비용이다.

### pure-rand

[npm 배포 메타데이터](https://registry.npmjs.org/pure-rand/8.4.2)에서 확인한 8.4.2는 MIT 라이선스의 seed 기반 난수 생성기이며 추가 실행 의존성을 선언하지 않는다. fast-check 4.10.0의 버전 범위를 만족하는 전이 의존성 후보다. 앱에서는 직접 난수 생성기를 감싸지 않고 fast-check를 통해 사용한다. 생성기 구현 또는 버전이 바뀌면 같은 seed에 의존하는 재현을 다시 확인해야 한다.

이는 설치 전 배포 선언 조사이며 실제로 해석된 의존성 트리는 아니다. 설치 단계에서는 pnpm이 선택한 정확한 버전과 잠금 파일 변경, 라이선스, 알려진 보안 문제 및 호환성을 확인해야 한다. 이 조사로 취약점이 없다고 판정하지 않는다.

### 기존 도구와 선택적 확장

현재 Vitest의 예제 나열과 Playwright의 브라우저 조작은 계속 사용한다. `Math.random()`과 자체 반복문은 입력을 섞을 수 있지만 실패 축소와 재실행 규칙을 별도로 구현해야 하므로 fast-check 대신 사용하지 않는다.

[Stately Graph 문서](https://stately.ai/docs/graph)는 현재 `XState v6 alpha` 문맥에서 `xstate/graph`를 안내한다. 따라서 이를 연도만으로 모든 안정 버전의 import 방식이라고 일반화해서는 안 된다. 상태 도달 순서가 필요한 단계에서 선택할 버전과 해당 버전의 exports를 다시 확인한다. 첫 PoC에는 XState를 설치하지 않는다.

[Playwright 권장사항](https://playwright.dev/docs/best-practices)은 사용자에게 보이는 동작, 역할과 이름 기반 locator, 격리와 자동 재시도 assertion을 권한다. 이 앱은 이미 Playwright를 사용하므로 Browser Adapter를 추가할 때 기존 실행 환경을 재사용한다. disabled 제어를 강제로 실행한 결과를 실제 사용자 행동으로 계산하지 않는다.

[TESTAR 공식 소개](https://testar.org/)는 실행 중 GUI를 탐색해 행동을 선택하는 방식이다. 요구사항만 있는 단계의 모델 생성이나 이 앱의 텍스트 및 복구 규칙 판정을 대신하지 않는다. UI에서 관찰한 행동과 모델의 차이를 조사하는 후속 참고 자료로 한정한다.

## 적용 순서와 남은 확인

기존 테스트의 목적과 요구사항을 비교해 첫 대상을 선정하는 일이 선행한다. 선정 후 첫 PoC를 기존 예제 테스트와 함께 실행하고 정상 행동 3종 이상과 비정상 시도 2종 이상의 실제 실행, 불변 조건 2개 이상, 통제된 결함 탐지, 축소와 재실행을 확인한다. 일괄 복사 목록은 이 선정 작업에서 보류한다.

그다음 공통 정책을 추출하고 저장소 및 브라우저 Adapter를 연결한다. 여러 실행 계층에서 같은 의미를 공유하더라도 Clipboard 권한, 저장 transaction과 실제 화면 선택은 각 계층에서 관찰한다. HTTP Adapter와 계정 권한 탐색은 계정 및 동기화 기능이 생긴 뒤의 작업이다.

`local-fast`, `pr`, `main`, `nightly`의 실행 횟수와 명령 수는 측정 전 예시값을 고정하지 않는다. 순차 실행 시간, 축소 시간, 실제 행동 실행 수와 결과 일치 여부를 확인해 정한다. 현재 CI 설정 부재, 패키지 미설치와 브라우저 후보별 초기화 비용은 구현 단계에서 확인할 사항이며 문서만으로 완료 처리할 수 없다.
