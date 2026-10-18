# 모바일 메모 재설계의 테스트 작성 근거

순수 명령과 상태 규칙에만 선택적으로 TDD를 적용하고, 터치, 탐색, 시트와 실제 저장은 브라우저에서 관찰한다. 각 테스트에는 입력 준비, 실제 조작, 요구사항에서 정한 예상 결과와 완료 후 읽을 자료가 있어야 한다. 검사 대상 구현으로 예상값을 계산하거나 대역의 결과만 확인해서 실제 기기 동작이 검증됐다고 판단하지 않는다.

[재설계 요구사항](../requirements.md#메모-조작과-드래그-앤-드롭-재설계)을 구현할 때 기존 기능을 보존할 테스트의 위치와 작성 방법을 다룬다. 확인한 날짜는 2026년 10월 18일이다. 단위별 적용은 [U45부터 U48의 계획](../plan.md#각-절차의-테스트-작성-기준)에 둔다. 공통 원칙은 기존 [테스트 전략](../../../dev/personal-notes-app/testing-strategy.md), [안티패턴 지침](../../../dev/personal-notes-app/test-anti-patterns.md)과 [선택적 TDD 결정](../decisions/verification-strategy.md)을 따른다.

## 현재 실행 도구와 증거의 범위

[패키지 설정](../../../../apps/notes/package.json)은 Vitest 및 Browser Mode 4.1.11, Playwright Test 1.62.1과 fast-check 4.10.0을 사용한다. 새 테스트 실행기, DOM 대역이나 드래그 라이브러리는 전제하지 않는다.

- [단위 실행 설정](../../../../apps/notes/vitest.config.ts)은 일반 모델 테스트를 실행하고 `browser` 및 `indexeddb` 파일은 제외한다. `test`의 `--passWithNoTests` 때문에 실행 사례가 없어도 종료 코드가 0일 수 있다. 대상 사례가 수집되고 검증문까지 실행됐는지 확인해야 한다. `test:model`은 현재 `note-content.model.test.ts` 하나만 선택하므로 새 모델 검사가 자동으로 포함된다고 가정하지 않는다.
- [Browser Mode 설정](../../../../apps/notes/vitest.browser.config.ts)은 Chromium, Firefox와 WebKit의 실제 브라우저를 사용한다. 다만 [메모 Provider 검사](../../../../apps/notes/src/_pages/notes/model/notes-data-provider.browser.test.tsx)는 저장 대역을 사용한다. 이는 비동기 완료와 UI 연결의 근거이며 실제 IndexedDB 저장의 근거는 아니다. [Vitest Browser Mode 설명](https://vitest.dev/guide/browser/)의 실행 환경과 검사에서 선택한 의존성은 구분해야 한다.
- [Playwright 설정](../../../../apps/notes/playwright.config.ts)은 빌드한 Next.js 서버를 사용한다. 일반 세 브라우저에서 실행하는 320 CSS px의 [탐색 검사](../../../../apps/notes/e2e/mobile-navigation.spec.ts)는 화면 너비에 따른 표현을 검사한다. 실제 터치 시퀀스는 별도 `chromium-touch`의 [터치 검사](../../../../apps/notes/e2e/touch-interactions.spec.ts)에서 실행한다. 이 파일은 CDP 입력을 사용하며 [Playwright 1.62.1의 Chromium 터치 구현](https://github.com/microsoft/playwright/blob/v1.62.1/packages/playwright-core/src/server/chromium/crInput.ts)도 `Input.dispatchTouchEvent`를 사용한다. Chromium 입력 결과를 실제 스마트폰이나 WebKit 터치의 성공으로 확대하지 않는다.
- Clipboard 권한 허용 및 거부는 [권한 검사](../../../../apps/notes/e2e/clipboard-permissions.spec.ts)와 실제 Chromium Clipboard에서 확인한다. 다른 엔진에서 쓰기 대역을 사용한 결과는 명령 연결의 근거로 한정한다. Cloudflare 스마트폰, 브라우저 도구 모음, safe area와 브라우저 재실행의 보존은 실제 환경에서 별도로 확인한다.

## 사용자 조작과 독립된 예상값

[Playwright의 권장 사항](https://playwright.dev/docs/best-practices)은 사용자에게 보이는 동작, 사례별 격리와 역할 기반 선택자를 권장한다. 이 앱에서는 메모 생성, 더보기, 수정과 명시적 저장으로 입력을 준비하고 실제 본문 터치, 메뉴 및 핸들로 변경을 실행한다. 검사 대상 동작을 repository 호출, React 내부 상태 변경이나 DOM 수정으로 대신하지 않는다.

React 애플리케이션 Kubeflow Pipelines의 [PR #13255](https://github.com/kubeflow/pipelines/pull/13255)는 `instance()` 및 `state()` 접근을 사용자 조작과 의미 있는 UI 관찰로 바꾼 이유를 설명한다. 고정 revision [e27593f](https://github.com/kubeflow/pipelines/commit/e27593f828a3189a48e50b5b4190cb8d31ed142e)의 업로드 대화상자 테스트에서는 내부 `setState`로 탭을 바꾸던 부분을 실제 탭 선택으로 바꿨다. portal 때문에 빈 `DocumentFragment`만 담던 스냅샷도 제거했다. 이 사례는 모양 검사가 실행 화면을 보지 못할 수 있다는 근거이며 해당 앱의 테스트 라이브러리를 추가할 이유는 아니다.

피할 예시는 `setState({ deleted: true }); expect(state.deleted).toBe(true)`다. 권장 예시는 `삭제 확인 → 삭제 실행 → 실제 저장에서 대상 부재와 열린 완료 시트 확인`이다. 후자는 입력 연결과 저장 결과가 빠지면 실패한다. 내부 구조를 정답으로 고정하지 않으므로 Provider를 정비해도 유지할 동작을 같은 방식으로 검사할 수 있다. 실패를 제어할 명령 검사에는 필요한 외부 함수만 대역으로 전달할 수 있지만 해당 대역에서의 성공이 실제 저장이나 Clipboard 성공을 대신하지는 않는다.

검사 자료는 이 과업을 구분할 수 있는 원문과 식별자를 사용한다. 공백, 줄바꿈, 긴 본문과 같은 텍스트의 별도 메모를 준비하고 실행 중 만든 ID를 보관한다. 운영 자료의 ID, DOM index나 CSS 클래스 이름을 고정하지 않는다. 요구사항에 따라 독립적으로 정한 문자열과 순서는 사용할 수 있다. 예를 들어 `[A, B, C, D]`에서 A를 D 뒤로 옮긴 예상값 `[B, C, D, A]`는 의미 있는 사례다. `expected = move(actual)`처럼 운영 이동 함수를 예상값 계산에 다시 사용하는 것이 피할 방식이다.

일괄 복사에는 [승인된 삽입 결정](../decisions/accumulator-ordering-and-recovery.md)을 적용한다. 기존 테스트 전략의 교환 예시는 이 결정과 다르므로 그대로 옮기지 않는다. 네 항목의 앞뒤 비인접 이동으로 맞바꾸기 결과 `[D, B, C, A]`와 구분하고, 중복 텍스트는 ID로 구분한다. 모바일 원본 목록과 일괄 복사 작업 및 저장 목록은 서로 다른 저장 대상을 관찰한다.

## 기다림과 실패가 실제로 검사되는 조건

[Playwright 검증문](https://playwright.dev/docs/test-assertions)은 비동기 재시도와 `await`를 제공한다. [Vitest 4.1.11의 expect 설명](https://github.com/vitest-dev/vitest/blob/v4.1.11/docs/api/expect.md#resolves)도 Promise 검증문에 `await`가 필요함을 명시한다. 동작을 한 번 실행한 뒤 결과만 기다리고, 재시도 함수 안에서 클릭, 저장이나 삭제를 반복하지 않는다. 완료 전에 읽은 DOM, 호출 횟수와 즉시 계산한 boolean만으로 성공을 판정하지 않는다.

피할 예시는 `await expect.poll(() => clickDelete()).toBeTruthy()`와 `expect(write()).resolves.toEqual(result)`다. 권장 방식은 삭제를 한 번 실행한 뒤 실제 대상 부재를 읽어 기다리고, Promise 검증문은 끝까지 기다리는 것이다. 조건문 안의 검증, 오류를 삼키는 `catch`, 고정 sleep, `force: true`, `skip`과 검증 없는 테스트로 실패를 숨기지 않는다. 외부 콜백 자체가 실행되지 않을 위험이 남으면 실행 완료와 필요한 검증 도달도 확인한다.

시간 조건은 [Playwright Clock](https://playwright.dev/docs/clock)으로 재현한다. 기존 5초를 넘긴 시점에도 완료 시트에서 복원이 가능한지 확인하며 길게 누르기 판정 전후의 시간을 통제한다. 이 시간 조작을 페이지 이동 성능 측정에 사용하지 않는다. long press의 500ms 및 이동 10 CSS px은 현재 구현의 비교 후보이므로 최종 기준이 정해진 뒤 판정 전후를 검사하고 운영 상수를 가져와 예상값까지 함께 바꾸지 않는다.

저장 실패는 대상 transaction의 abort나 명령 의존성의 실패처럼 실제로 제어한 위치를 명시한다. 실패를 주기 전에 대상이 존재하고 처리 요청이 실행 가능한지 확인한다. 실패 뒤에는 성공 표시가 없는 것뿐 아니라 이전 원문, 순서와 복원 기회의 보존 및 다음 정상 재시도의 성공을 확인한다. 다른 후속 행동이 앞선 실패를 덮어쓰기 전에 관찰한다. 메모리 저장 대역의 예외를 실제 quota 재현으로, 테스트가 직접 던진 오류를 서비스 결함 탐지로 보고하지 않는다.

[IndexedDB 표준](https://w3c.github.io/IndexedDB/#transaction-concept)에 따라 메모와 모바일 순서의 원자적 저장은 실제 DB로 검사한다. 성공 화면만 보지 않고 요청 완료 후 독립적인 readonly transaction이나 새 연결에서 읽는다. 새 연결과 페이지 새로고침은 브라우저 프로세스 재실행의 근거와 구분한다. 새 테스트 context가 원래 저장 자료를 자동으로 이어받는다고 가정하거나 자료를 다시 주입해 재실행 보존을 통과시키지 않는다.

## 기존 검사를 바꾸거나 확장할 위치

- [현재 작업 명령 검사](../../../../apps/notes/src/features/add-note-to-batch-copy/model/mobile-batch-copy-session.test.ts)와 [작업 사본 검사](../../../../apps/notes/src/entities/batch-copy/model/mobile-batch-copy-draft.test.ts)는 원문 스냅샷, 연속 추가, 실패 보존, 복제와 삽입을 계속 보호한다. 별도 수집 시작, `step`과 `clickCount`를 고정한 검증만 새 조작의 실제 결과로 대체한다.
- [실제 DB 검사](../../../../apps/notes/src/_app/composition/indexed-db/personal-notes-database.indexeddb.test.ts)와 [저장 모델 검사](../../../../apps/notes/src/_app/composition/indexed-db/note-storage.model.indexeddb.test.ts)는 새 연결, 이행, blocked, versionchange와 transaction abort를 이미 다룬다. 모바일 순서와 생성, 삭제 및 복원의 동시 저장을 같은 실행 기반에서 확장한다.
- [UI 생성 도우미](../../../../apps/notes/e2e/support/create-note-through-ui.ts)의 모바일 수정 링크 진입은 더보기의 수정으로 바꿀 대상이다. 도우미를 새 UI로 옮겨도 실제 생성, 편집과 저장을 유지한다. [저장 읽기 도우미](../../../../apps/notes/e2e/support/read-stored-note.ts)의 readonly 관찰은 재사용하되 확인할 동작을 저장소에 직접 써 넣는 도우미로 바꾸지 않는다. 이행용 이전 schema나 장애를 준비하는 자료 주입은 준비 단계로 한정한다.
- 기존 터치 검사는 길게 누르기 복사와 수집 모드의 짧은 추가를 새 짧은 복사 및 긴 추가로 바꿀 대상이다. 취소, 허용 이동량, 실제 세로 스크롤, capture 상실과 다음 정상 조작은 계속 검사한다. 기존 일괄 복사 항목 시트가 조작 후 닫히는 사례도 유지한다.
- 기존 `notes.spec.ts`의 상세 저장, 초안 복구, 이탈 확인, 데스크톱 자동 저장, 삭제 이력 및 geometry 검사는 새 메모 조작 뒤에도 보호할 기능이다. 변경 파일 수에 맞춰 새 테스트 파일을 일대일로 만들거나 기존 검사를 통째로 삭제하지 않는다.

## 생성 검사와 통과 판정

생성 검사는 명시적 사례가 안정된 순수 작업 상태와 ID 순서에 한정해 검토한다. [fast-check의 모델 설명](https://fast-check.dev/docs/advanced/model-based-testing/)은 실제 시스템보다 단순한 모델, 실제 실행된 command와 재현 정보를 구분한다. 모델에는 원문, 존재 여부와 필요한 상대 순서만 두고 운영 reducer나 repository를 복제하지 않는다. 생성 입력과 축소 후보마다 상태를 새로 만들며 중요한 실패와 취소를 우연한 생성에만 맡기지 않는다. 생성 수와 실제 변경 실행 수를 구분하고 seed, path 및 해당하는 replayPath를 남긴다.

통과하는 것처럼 보이는 검사는 같은 입력과 관찰에서 요구사항 위반을 탐지할 수 있는지 확인한다. 대상 동작이 미구현이면 실패하는지, 저장 누락, 다른 항목 이동이나 취소 후 저장 중 해당 단위에 알맞은 결함을 넣으면 실패하는지, 이를 제거하면 정상 통과하는지를 단위 마지막 확인에서 함께 판단한다. 이 방법과 대역 증거의 범위는 [기존 통제 결함 기준](../../../dev/personal-notes-app/testing-strategy.md#잘못된-동작을-실제로-구별하는지-확인한다)을 따른다. 새 변이 도구나 점수 목표를 추가하지 않는다.

현재 [ESLint 설정](../../../../apps/notes/eslint.config.mjs)은 조건부 검증, 건너뛴 검사, 고정 대기와 큰 스냅샷 등 일부 형태를 제한한다. 설정을 바꾸기보다 기존 검사를 적용하고, lint가 결정할 수 없는 예상값의 독립성, 실제 입력 도달과 저장 완료는 위 동작 증거로 판단한다. 이 문서에는 재설계 구현이나 테스트 실행의 완료 증거가 없으며 단위별 실행 결과는 구현 후 계획에 기록한다.
