# 개인 메모 애플리케이션 테스트 안티패턴

테스트는 함수, 변수, React 내부 상태, CSS와 DOM 구조가 아니라 사용자가 확인할 결과, 저장 불변 조건, 외부 시스템과 정한 동작 또는 순수 알고리즘 결과를 검증해야 한다. ESLint는 정적으로 식별할 수 있는 일부 위반만 차단하며, 문자열과 모의 구현이 실제 요구사항을 나타내는지는 구현 담당자와 검토자가 요구사항 근거로 판정한다.

이 지침의 상태는 `current`다. [모듈별 TDD 결정](../../designs/personal-notes-app-8fd/decisions/verification-strategy.md)과 [테스트 전략](testing-strategy.md)에 따라 테스트를 작성하고 검토할 때 적용한다. Vitest 4.1.11과 `@vitest/eslint-plugin` 1.6.27은 순수 규칙 및 브라우저 통합 검사에 사용한다. IndexedDB 검사는 `@vitest/browser-playwright` 4.1.11로 운영 모듈을 실행하고, Next.js 운영 서버의 과업별 검사는 Playwright Test 1.62.1과 `eslint-plugin-playwright` 2.11.0을 사용한다. 아래 후보 가운데 설치하지 않은 플러그인은 채택된 설정이 아니다.

## 판정 이력

- 초기 후보는 함수 및 상태 이름, 문자열, 클래스명과 HTML 또는 JSX 태그를 직접 비교하는 테스트를 금지하는 것이었다.
- 재검토에서는 문자열의 정확한 값이 Clipboard 결과, 정규화 알고리즘, 저장 레코드와 승인된 접근 가능한 이름에서는 실제 요구사항일 수 있다는 점을 확인했다. 문자열 matcher 전체를 금지하면 필요한 테스트도 막는다.
- 클래스명과 DOM 순회는 정적 분석으로 비교적 정확히 찾을 수 있지만, 제3자 SVG, canvas와 가상화 구성요소에는 의미 기반 locator가 없을 수 있다. 이때 해당 구성요소에만 쓰는 test ID 또는 raw locator가 더 안정적이다.
- 현재 결정은 정밀한 기존 ESLint 규칙을 먼저 사용하고, 테스트가 실제 결과를 증명하는지는 요구사항 연결과 검토로 판정하는 것이다. 이름이나 문자열 리터럴을 문맥 없이 금지하는 사용자 정의 규칙은 만들지 않는다.

## 모든 테스트에 적용할 판정 질문

구현 담당자는 검증문마다 다음 질문에 답할 수 있어야 한다. 하나라도 답할 수 없으면 검증 대상을 바꾸거나 테스트를 제거한다.

- 이 검증문은 사용자가 보는 결과, 저장 불변 조건, 외부 interface의 동작 또는 순수 알고리즘 반환값 가운데 무엇을 증명하는가
- 요구사항이나 결정 기록의 어느 문장이 그 결과를 필요로 하는가
- 함수, 변수, hook, reducer, 구성요소, CSS와 DOM 구조를 바꾸되 결과를 유지하면 이 테스트도 계속 통과하는가
- 구현이 실제로 고장났을 때 이 검증문이 실패하며, 상수나 복제한 알고리즘끼리 비교하는 것은 아닌가
- 브라우저가 결정하는 결과를 jsdom, 모의 구현 또는 가짜 저장소의 성공만으로 대신하고 있지 않은가

테스트 이름도 입력과 관찰 결과를 설명한다. `works`, `handles state`나 함수명만 적은 제목은 실패 원인과 보호하는 결과를 알려주지 못한다.

## 함수, 변수와 내부 상태 이름을 결과처럼 검사하지 않는다

### 막으려는 실패

함수의 `name`, 지역 변수, React state key, reducer action 문자열, private method와 구성요소 instance를 검사하면 동작이 그대로여도 이름 변경과 구조 정리만으로 테스트가 실패한다. 반대로 함수 이름이 유지되면 복사, 저장과 오류 처리가 망가져도 테스트가 통과할 수 있다.

다음 테스트는 구현 식별자만 고정한다.

```ts
test('copyNote', () => {
  expect(copyNote.name).toBe('copyNote')
  expect(noteCardState.status).toBe('copied')
  expect(clipboard.writeText).toHaveBeenCalledTimes(1)
})
```

검증 대상은 사용자가 붙여넣을 값과 성공한 사용 횟수다.

```ts
test('클립보드 쓰기가 성공하면 원문을 복사하고 일반 복사 횟수를 늘린다', async () => {
  const result = await copyNote({ note, clipboard, usage })

  expect(result).toEqual({ kind: 'copied' })
  expect(clipboard.text).toBe(note.text)
  expect(await usage.read(note.id, note.contentRevision)).toMatchObject({
    direct: 1,
    accumulated: 0,
  })
})
```

외부 interface 호출 자체가 승인된 동작이면 전달값과 실패 처리를 검사할 수 있다. 예를 들어 누적 항목과 횟수를 한 transaction으로 저장한다는 불변 조건은 저장 interface의 결과를 통해 확인한다. 호출 횟수는 중복 전송 금지나 정확히 한 번 실행이 요구사항일 때만 근거와 함께 검사한다.

ESLint는 `.name`, 상태 속성과 모의 구현 호출이 구현 세부인지 외부 동작인지 알 수 없다. `no-restricted-syntax`로 모든 `.name`이나 `toHaveBeenCalledTimes`를 금지하면 `Error.name`과 정확히 한 번 저장해야 하는 동작까지 오탐한다. UI 테스트의 DOM 내부 접근은 `testing-library/no-container`와 `testing-library/no-node-access`로 줄일 수 있지만 최종 판정은 검토자가 맡는다.

[Kubeflow Pipelines 2537f36](https://github.com/kubeflow/pipelines/commit/2537f361f700b7312c457c77719f2e95c4eb98f8)은 Enzyme의 `instance()`와 `state()` 접근을 사용자 이벤트와 화면 query 함수로 바꾸고 29개 테스트가 통과한 결과를 기록한다. [Kibana 실패 보고 #270803](https://github.com/elastic/kibana/issues/270803)은 `react-virtualized` 모의 구현이 적용된다는 전제에 의존한 테스트가 실제 구성요소의 `width: 0` 동작에서 반복 실패한 사례다. 이 이슈의 자동 조사는 원인을 중간 신뢰도로 분류했으므로 확정된 수정 근거가 아니라 모의 구현 의존 위험을 보여주는 보조 사례로만 사용한다.

## 문자열 비교의 목적을 먼저 밝힌다

### 막으려는 실패

긴 안내 문구 전체, 번역 문자열, 임시 제목과 fixture 이름을 동작 완료의 대리값으로 검사하면 문구만 바뀌어도 테스트가 실패한다. 반대로 너무 넓은 정규식이나 아무 텍스트 하나를 찾는 검사는 잘못된 화면도 통과시킬 수 있다.

다음 검증문은 성공 결과보다 현재 문구를 고정한다.

```ts
expect(screen.getByText('메모의 텍스트가 클립보드에 성공적으로 복사되었습니다.'))
  .toBeInTheDocument()
```

알림이 복사 완료를 전달하는지 검사하고, 실제 복사값은 별도로 확인한다. `status` 역할의 본문이 자동으로 접근 가능한 이름이 된다고 가정하지 않는다.

```ts
const notice = await screen.findByRole('status')

expect(notice).toHaveTextContent(/복사 완료/)
expect(clipboard.text).toBe(note.text)
```

다음 값은 정확한 문자열 비교가 필요할 수 있다.

- Clipboard에 기록된 메모 원문과 누적 구분자
- 줄 정규화와 template renderer의 승인된 출력
- 저장 레코드, Worker message와 오류 code처럼 외부 interface가 정한 값
- 요구사항에서 정확한 문구로 승인한 접근 가능한 이름
- 보안 또는 자료 손실 경고에서 빠지면 안 되는 정보

정확한 비교를 쓸 때 테스트 이름이나 가까운 문맥에서 어떤 요구사항을 보호하는지 드러낸다. `getByText`를 모두 없애거나 exact option을 일괄 해제하지 않는다. [Loculus 논의 #1692](https://github.com/loculus-project/loculus/issues/1692)는 넓은 `getByText`가 의도치 않게 텍스트의 유일성까지 검사할 수 있다고 지적했지만, 단순 치환은 원하는 대상을 확인하지 못하는 더 약한 assertion이 될 수 있다는 이유로 일괄 변경하지 않았다.

Jest, Vitest와 Playwright의 `no-restricted-matchers`는 지정한 matcher를 막을 수 있지만 문자열의 의미는 판정하지 못한다. `toBe`, `toEqual` 또는 문자열 리터럴 전체를 금지하지 않는다. UI 테스트 파일처럼 적용 위치와 허용 사례가 정해진 뒤에만 `toBeTruthy`, 큰 스냅샷 matcher와 같은 구체적인 약한 matcher를 제한한다.

## CSS, HTML과 JSX 구조를 선택자 또는 결과로 고정하지 않는다

### 막으려는 실패

클래스명, 태그 이름, 자식 순서, `innerHTML`, `outerHTML`, CSS 선택자와 XPath를 검사하면 접근 가능한 동작이 같아도 마크업 정리로 테스트가 실패한다. CSS class가 존재한다는 사실만으로 사용자가 상태를 구분할 수 있는지도 알 수 없다.

```ts
const { container } = render(<NoteCard note={note} />)
const button = container.querySelector('.note-card > div:nth-child(2) > button')

expect(button?.tagName).toBe('BUTTON')
expect(button?.className).toContain('is-copied')
expect(container.innerHTML).toContain('<span class="success-icon">')
```

```ts
render(<NoteCard note={note} />)

const copyButton = screen.getByRole('button', { name: '메모 복사' })
await user.click(copyButton)

const notice = await screen.findByRole('status')

expect(notice).toHaveTextContent(/복사 완료/)
```

Testing Library에서는 role, label, 현재 입력값과 상태 알림을 먼저 사용한다. Playwright에서도 `getByRole`, `getByLabel`과 사용자가 읽는 이름을 우선한다. 색, 간격과 겹침처럼 DOM 의미로 판정할 수 없는 결과는 스크린샷 비교와 담당자 시각 검토로 확인한다.

의미 기반 locator를 쓸 수 없는 제3자 canvas, SVG 내부, iframe과 가상화 라이브러리는 예외다. 이때 변경 책임이 분명한 test ID 또는 허용 목록에 넣은 raw locator를 해당 제3자 DOM 요소에만 사용한다. 테스트만을 위해 불필요한 `aria-label`을 애플리케이션 마크업에 넣지 않는다.

[Kubeflow Pipelines #13228](https://github.com/kubeflow/pipelines/issues/13228)은 25개 테스트 파일의 `querySelector`가 접근성 의미를 우회하고 변경에 취약하다고 기록했다. [c99ba2b](https://github.com/kubeflow/pipelines/commit/c99ba2b42f0de3dc23fca3c9c034195a02045905)와 [4e30677](https://github.com/kubeflow/pipelines/commit/4e3067752ea6c460c4eb2e81872300b3432356a7)은 role, text와 test ID로 바꾸면서 제3자 DOM처럼 대체 수단이 없는 선택자는 명시적으로 남겼다. [Grafana f32d200](https://github.com/grafana/grafana/commit/f32d200fc0047810e03255d38cced0ed36f983ce)은 테스트 선택자 때문에 불필요한 `aria-label`을 늘리는 문제를 피하려고 별도 test ID를 도입했다.

다음 ESLint 규칙이 이 형태를 비교적 정확하게 찾는다.

- `testing-library/no-container`
- `testing-library/no-node-access`
- `testing-library/prefer-screen-queries`
- `playwright/no-raw-locators`
- `playwright/no-nth-methods`
- `playwright/prefer-native-locators`

`testing-library/no-test-id-queries`는 모든 화면에서 의미 기반 locator가 가능하다고 확인한 뒤에만 사용한다. 현재 요구의 공간형 보드와 향후 제3자 drag 또는 canvas 구현 가능성을 고려하면 전역 error로 미리 켜지 않는다. ESLint core의 `no-restricted-properties`로 `className`, `innerHTML`, `outerHTML`과 `tagName`을 브라우저 테스트에서 제한할 수 있지만, 위 예외를 표현한 정상 및 위반 사례가 생긴 뒤 적용한다.

다음 설정 조각은 구성요소 및 브라우저 테스트 전용 설정 영역에서 검증할 후보다. `files`가 포함할 파일과 허용 사례를 정하기 전에는 저장소 전체에 적용하지 않는다.

```ts
{
  rules: {
    'no-restricted-properties': [
      'error',
      {
        property: 'className',
        message: 'CSS class 대신 사용자가 구분하는 상태를 검사하세요.',
      },
      {
        property: 'innerHTML',
        message: 'HTML 문자열 대신 사용자 결과를 검사하세요.',
      },
      {
        property: 'outerHTML',
        message: 'HTML 문자열 대신 사용자 결과를 검사하세요.',
      },
      {
        property: 'tagName',
        message: '태그 이름 대신 역할과 접근 가능한 이름을 검사하세요.',
      },
    ],
  },
}
```

이 규칙은 `toHaveClass('is-copied')`, JSX fixture의 태그와 문자열 스냅샷을 찾지 못한다. 이를 잡겠다는 이유로 모든 matcher 호출이나 JSX를 제한하는 넓은 AST selector를 추가하지 않는다. 반복되는 실제 위반이 생기면 먼저 그 matcher가 사용 결과가 아니라 구현 구조만 검사한다는 위반 사례와, 허용해야 하는 시각 상태 검증 사례를 함께 만든다.

## 전체 DOM과 큰 객체 스냅샷으로 결과를 대신하지 않는다

### 막으려는 실패

큰 스냅샷은 한 번에 많은 변경을 보여주지만 어떤 사용자 결과가 깨졌는지 알려주지 않는다. 자동 갱신이나 대량 승인으로 실제 회귀가 숨고, CSS class와 마크업 변경이 의미 없는 변경 내역을 만든다.

```ts
const { container } = render(<NotesPage />)
expect(container).toMatchSnapshot()
```

```ts
expect(screen.getAllByRole('article')).toHaveLength(2)
expect(screen.getByRole('button', { name: '메모 복사' })).toBeEnabled()
expect(screen.getByRole('status')).toHaveTextContent(/자료를 불러오는 중/)
```

작은 serializer 결과, 고정 protocol message와 의도적으로 검토하는 시각 기준선에는 스냅샷을 사용할 수 있다. 스냅샷의 책임과 승인자가 분명해야 하며, UI 구조 스냅샷과 시각 스크린샷을 같은 증거로 취급하지 않는다.

[Kubeflow Pipelines 15796f3](https://github.com/kubeflow/pipelines/commit/15796f3cfcb22e051c394eaa740278ea2be183f7)은 안정되지 않은 MUI DOM을 기록한 4,359줄 스냅샷을 삭제하고 행동 검증을 유지했다. [Sentry의 고정 revision](https://github.com/getsentry/sentry/blob/63618ec25f914f76bfcd14ca87241e42feb1de30/eslint.config.ts#L951)은 스냅샷을 권장하지 않으며 남아 있는 스냅샷 크기를 `jest/no-large-snapshots`로 제한한다고 설명한다.

Jest와 Vitest의 `no-large-snapshots`는 큰 inline 및 external 스냅샷을 찾는다. `no-restricted-matchers`로 UI 테스트의 `toMatchSnapshot`과 `toMatchInlineSnapshot`을 금지할 수도 있다. 허용할 serializer 테스트 위치와 스냅샷 최대 크기는 실제 테스트 모음을 확인한 뒤 정하고, 근거 없는 숫자를 현재 지침에 넣지 않는다.

## 모의 구현 호출과 테스트 전용 구조를 실제 동작으로 오인하지 않는다

### 막으려는 실패

모든 의존성을 모의 구현으로 바꾸고 호출 횟수와 순서만 검사하면 실제 Clipboard, IndexedDB transaction, Worker asset과 브라우저 이벤트가 실패해도 테스트가 통과한다. private module을 export하거나 실행 코드에 테스트 전용 분기를 넣으면 테스트를 유지하려고 애플리케이션 구조가 굳어진다.

```ts
expect(repository.save).toHaveBeenCalledTimes(1)
expect(repository.save).toHaveBeenCalledBefore(notifier.show)
```

```ts
expect(await accumulator.read()).toEqual([
  expect.objectContaining({ textSnapshot: note.text }),
])
expect(await usage.read(note.id, note.contentRevision)).toMatchObject({
  accumulated: 1,
})
```

순수 application command는 interface의 가짜 구현으로 성공과 실패 분기를 TDD할 수 있다. 그러나 IndexedDB의 `complete`, `abort`, `blocked`와 upgrade, Clipboard 권한 및 Worker URL과 MIME type은 실제 브라우저 검사로 별도 증명한다. 테스트 도우미는 사용자 동작을 짧게 표현할 수 있지만 실행 코드의 내부 상태를 제공하는 우회 통로가 되어서는 안 된다.

`jest/prefer-called-with`와 Vitest의 같은 규칙은 모의 구현 검증문에 전달값을 포함하도록 도울 뿐 지나친 모의 구현을 판정하지 못한다. 프로젝트 내부 import 위치가 확정되면 ESLint core `no-restricted-imports`로 UI 내부 module과 테스트 전용 실행 진입점 import를 막을 수 있다. 아직 소스 구조가 없으므로 금지 패턴을 추정하지 않는다.

[Kubeflow Pipelines e27593f](https://github.com/kubeflow/pipelines/commit/e27593f828a3189a48e50b5b4190cb8d31ed142e)는 `waitFor(spy)`를 화면에 나타나는 결과를 기다리는 `findByText`로 바꾸고, 이미 행동 검증이 있는 반복 MUI 스냅샷과 비어 있는 portal 스냅샷을 삭제한 뒤 43개 테스트가 통과한 결과를 기록한다.

## 비동기 재시도 안에서 동작을 반복하지 않는다

### 막으려는 실패

`waitFor` 콜백은 성공하거나 제한 시간이 끝날 때까지 여러 번 실행될 수 있다. 콜백 안에서 클릭, 렌더링과 저장을 실행하면 한 번의 사용자 동작이 여러 번 발생한다. 임의 대기, 조건부 검증문과 누락된 `await`는 느린 환경에서 테스트를 불규칙하게 만든다.

```ts
await waitFor(() => {
  user.click(screen.getByRole('button', { name: '누적' }))
  expect(screen.getByRole('status')).toBeVisible()
  expect(mockWriter).toHaveBeenCalledTimes(1)
})
```

```ts
await user.click(screen.getByRole('button', { name: '누적' }))
const notice = await screen.findByRole('status')

expect(notice).toHaveTextContent(/누적 완료/)
```

다음 형태도 허용하지 않는다.

- `page.waitForTimeout()`으로 렌더링 완료를 추정하는 테스트
- `if` 안에서만 실행되어 실패 경로가 검증문 없이 끝나는 테스트
- 오류를 `try/catch`로 삼키고 `expect` 없이 통과하는 테스트
- Promise를 반환하는 query, 이벤트와 Playwright 검증문에서 `await`를 빠뜨린 테스트
- `force: true`로 실제 클릭 불가능 상태를 우회하는 브라우저 테스트

[Kubeflow Pipelines #13228](https://github.com/kubeflow/pipelines/issues/13228)은 여러 assertion이나 side effect를 `waitFor`에 넣으면 timing 문제를 숨긴다고 기록했다. Testing Library도 `waitFor`가 callback을 여러 번 실행할 수 있고 `findBy`가 query와 대기를 결합한다고 설명한다.

위 [e27593f](https://github.com/kubeflow/pipelines/commit/e27593f828a3189a48e50b5b4190cb8d31ed142e) 변경은 `waitFor(spy)`를 `findByText`로 바꿔 재시도 대상이 모의 구현 호출이 아니라 화면 결과가 되게 한 고정 사례다.

다음 규칙은 정밀도가 높다.

- Testing Library: `await-async-events`, `await-async-queries`, `await-async-utils`, `no-wait-for-side-effects`, `no-wait-for-multiple-assertions`, `prefer-find-by`, `prefer-user-event`, `no-unnecessary-act`
- Jest 또는 Vitest: `expect-expect`, `valid-expect`, `no-conditional-expect`, `no-conditional-in-test`, `no-focused-tests`, `no-disabled-tests`, `no-commented-out-tests`
- Playwright: `missing-playwright-await`, `no-wait-for-timeout`, `prefer-web-first-assertions`, `no-force-option`, `no-conditional-expect`, `no-conditional-in-test`, `no-focused-test`, `no-skipped-test`

## 약한 검증문과 실행 로직 복제를 피한다

### 막으려는 실패

`toBeTruthy`, 존재 여부 한 번, 오류가 없었다는 사실과 coverage 수치만으로는 올바른 결과를 확인할 수 없다. 테스트가 실행 코드의 알고리즘을 같은 방식으로 다시 구현하면 둘이 같은 오류를 내면서 통과할 수 있다.

```ts
const expected = input.trim().replaceAll(/\s+/g, ' ').toLowerCase()

expect(normalizeLine(input)).toBe(expected)
expect(result).toBeTruthy()
```

```ts
expect(normalizeLine('  A\u030A   B  ')).toEqual({
  original: '  A\u030A   B  ',
  normalized: 'å b',
})
expect(classifyLineRelation('memo', 'memory')).toMatchObject({
  relation: 'surface',
  score: expect.any(Number),
})
```

예상값은 요구사항의 사례와 독립적으로 선택한 경계값에서 가져온다. 성공, 실패, 빈 입력, 중복, 오래된 Worker 응답과 transaction 중단처럼 결과가 달라지는 대표 분기를 포함한다. coverage는 누락 후보를 찾는 자료일 뿐 완료 조건으로 사용하지 않는다.

`expect-expect`는 검증문이 전혀 없는 테스트를 찾고 Playwright의 `no-unnecessary-assertions`는 절대로 실패할 수 없는 일부 locator 검증문을 찾는다. `no-restricted-matchers`로 `toBeTruthy`와 `toBeDefined`를 제한할 수 있지만, boolean 또는 optional 값 자체가 승인된 출력인 테스트도 있으므로 전역 금지는 하지 않는다. 실행 로직 복제, 잘못된 fixture와 빠진 실패 분기는 ESLint가 판정할 수 없으며 요구사항별 검토가 필요하다.

## 테스트 사이에 상태와 순서를 공유하지 않는다

### 막으려는 실패

다른 테스트가 만든 IndexedDB 레코드, module singleton, fake timer, 현재 시각과 무작위 값에 의존하면 개별 실행은 통과하지만 전체 테스트의 순서와 병렬 실행에서 실패한다. 재시도로 통과시키면 원인을 숨긴다.

- 테스트마다 데이터베이스 이름, 브라우저 context와 fixture를 분리한다.
- 시간과 ID가 동작 결과에 영향을 주면 명시적으로 주입하고 각 테스트 뒤 원래 상태로 되돌린다.
- 순서가 요구사항이면 입력 배열과 동률 정렬 기준을 fixture에 직접 기록한다.
- 동일 seed 없이 무작위 입력을 사용하지 않고 실패한 seed를 보고서에 남긴다.
- 브라우저 테스트는 HTTP와 HTTPS origin의 자료가 분리된다는 현재 요구를 반영한다.

Jest와 Vitest의 `no-duplicate-hooks` 및 hook 순서 규칙은 setup 형태만 검사한다. `no-hooks`를 켠다고 상태 공유가 자동으로 없어지지 않으므로 기본 규칙으로 제안하지 않는다. Playwright의 격리된 context와 실제 IndexedDB 검사가 필요한 이유도 lint로 대체하지 않는다.

## ESLint가 판정할 수 있는 코드 형태

### 조사한 버전과 호환 조건

2026년 8월 31일에 다음 공식 release와 package 정보를 다시 확인했다. 모두 MIT license다.

- ESLint `10.9.1`: Node.js `^20.19.0`, `^22.13.0` 또는 `>=24`
- `eslint-plugin-testing-library` `7.16.2`: ESLint `^8.57.0`, `^9.0.0` 또는 `^10.0.0`; Node.js `^18.18.0`, `^20.9.0` 또는 `>=21.1.0`
- `eslint-plugin-jest` `29.16.5`: ESLint `^8.57.0`, `^9.0.0` 또는 `^10.0.0`; Node.js `^20.12.0`, `^22.0.0` 또는 `>=24.0.0`
- `@vitest/eslint-plugin` `1.6.27`: ESLint `>=8.57.0`; Node.js `>=18`
- `eslint-plugin-playwright` `2.11.0`: ESLint `>=8.40.0`; Node.js `>=16.9.0`

현재 `@vitest/eslint-plugin` 1.6.27은 Vitest 파일에 적용하고, `eslint-plugin-playwright` 2.11.0은 `apps/notes/e2e/**/*.spec.ts`에만 적용한다. `@vitest/browser-playwright`는 Vitest Browser Mode의 실행 provider이므로 그 파일에는 Playwright ESLint 규칙을 적용하지 않는다. Playwright 플러그인이 추가한 실행 의존성은 `globals` 17.11.0 하나이며 애플리케이션 묶음에는 포함되지 않는다. Testing Library와 Jest 플러그인은 설치하지 않는다. 새 테스트 문법이나 실행기를 도입하면 해당 플러그인의 정확한 버전, peer 조건, 전이 의존성과 규칙 적용 대상을 다시 확인한다.

### Testing Library를 선택했을 때의 제안

다음 flat config 조각은 React 구성요소 테스트 전용 설정 영역에 넣을 후보다. 실행 가능한 전체 설정이 아니며 U1에서 플러그인 import, 파일 glob과 recommended config를 확인해야 한다. 아직 테스트 파일 명명 규칙이 없으므로 모든 `*.test.*` 파일을 포함하는 glob을 여기서 정하지 않는다.

```ts
{
  rules: {
    'testing-library/await-async-events': 'error',
    'testing-library/await-async-queries': 'error',
    'testing-library/await-async-utils': 'error',
    'testing-library/no-container': 'error',
    'testing-library/no-node-access': 'error',
    'testing-library/no-unnecessary-act': 'error',
    'testing-library/no-wait-for-multiple-assertions': 'error',
    'testing-library/no-wait-for-side-effects': 'error',
    'testing-library/no-wait-for-snapshot': 'error',
    'testing-library/prefer-find-by': 'error',
    'testing-library/prefer-screen-queries': 'error',
    'testing-library/prefer-user-event': 'error',
  },
}
```

도메인 또는 Worker 순수 함수 테스트에는 Testing Library 규칙을 적용하지 않는다. custom render와 query를 만들면 플러그인의 aggressive reporting 설정이 실제 import를 인식하는지도 위반 및 정상 사례로 확인한다.

### Jest 또는 Vitest를 선택했을 때의 제안

Jest를 고르면 다음 후보를 테스트 파일에 적용한다.

```ts
{
  files: ['**/*.{test,spec}.{ts,tsx}'],
  ignores: ['**/*.browser.test.{ts,tsx}'],
  rules: {
    'jest/expect-expect': 'error',
    'jest/no-commented-out-tests': 'error',
    'jest/no-conditional-expect': 'error',
    'jest/no-conditional-in-test': 'error',
    'jest/no-disabled-tests': 'error',
    'jest/no-focused-tests': 'error',
    'jest/no-large-snapshots': 'error',
    'jest/no-standalone-expect': 'error',
    'jest/valid-expect': 'error',
  },
}
```

Vitest를 고르면 같은 책임의 `vitest/expect-expect`, `vitest/no-commented-out-tests`, `vitest/no-conditional-expect`, `vitest/no-conditional-in-test`, `vitest/no-disabled-tests`, `vitest/no-focused-tests`, `vitest/no-large-snapshots`, `vitest/no-standalone-expect`와 `vitest/valid-expect`를 사용한다. 현재 설정은 `e2e/**/*.spec.ts`를 Vitest 규칙에서 제외한다. Jest와 Vitest 플러그인을 같은 테스트 파일에 동시에 적용하지 않는다.

### Playwright Test에 적용한 규칙

```ts
{
  files: ['e2e/**/*.spec.ts'],
  extends: [playwright.configs['flat/recommended']],
  rules: {
    'playwright/no-commented-out-tests': 'error',
    'playwright/no-nth-methods': 'error',
    'playwright/no-raw-locators': 'error',
    'playwright/no-skipped-test': 'error',
    'playwright/no-wait-for-timeout': 'error',
    'playwright/prefer-native-locators': 'error',
  },
}
```

flat recommended 설정이 `await` 누락, 조건부 검증, 초점 및 비활성화된 테스트, 강제 클릭, 임의 대기와 약한 검증을 막는다. 명시적으로 추가한 규칙은 raw locator, 순서 번호 선택, 주석 처리 및 건너뛴 테스트를 막고 의미 기반 locator를 요구한다. raw locator 예외가 필요하면 플러그인의 `allowed` option에 허용할 선택자와 다른 방법이 없는 이유를 기록한다. `no-raw-locators`를 끄거나 테스트 파일 전체를 제외하지 않는다.

### 현재 만들지 않을 규칙

- 문자열 리터럴을 matcher에 전달하는 모든 코드를 금지하는 `no-restricted-syntax`
- `.name`, `.state`, `className`과 모의 구현 matcher를 테스트 종류와 무관하게 금지하는 정규식 또는 AST selector
- 검증문 개수, 테스트 길이와 hook 사용 횟수를 근거 없는 숫자로 제한하는 규칙
- coverage 비율을 테스트 품질로 판정하는 규칙
- 현재 소스 구조를 추정한 내부 module import 패턴

기존 플러그인으로 검출되지 않는 위반이 실제 검토에서 반복되면 사용자 정의 규칙을 검토할 수 있다. 그때에도 잘못된 코드와 같은 모양이지만 허용해야 하는 코드를 각각 fixture로 만들고 RuleTester 또는 동등한 실행 증거로 오탐 및 누락을 확인한 뒤 채택한다.

## 검토와 적용 절차

구현 담당자는 테스트를 추가할 때 [테스트 전략의 TDD 판정](testing-strategy.md#tdd-적용-판정)과 이 문서의 모든 판정 질문을 적용한다. 검토자는 변경된 사용자 결과와 저장 규칙마다 정상, 실패 및 취소 또는 중단 경로가 필요한지 확인하고, 각 검증문이 그 결과를 직접 검사하는지 판정한다.

정적 검사 결과는 다음 순서로 처리한다.

1. 규칙이 찾은 코드가 실제 위반인지 요구사항과 테스트 종류를 확인한다.
2. 의미 기반 query 함수, 직접적인 결과 검증문 또는 실제 브라우저 검사로 바꾼다.
3. 예외가 필요하면 허용할 선택자, 대상 라이브러리와 다른 방법이 없는 이유를 해당 테스트 파일의 설정에 기록한다.
4. `eslint-disable`로 파일 전체를 제외하지 않는다. 한 줄 예외도 같은 이유와 대체 검증을 검토한다.
5. lint가 통과해도 이름, 문자열, 모의 구현, fixture와 알고리즘 복제가 실제 결과를 대신하지 않는지 사람이 다시 확인한다.

문서, lint와 단위 테스트만으로 로컬 애플리케이션의 완료를 주장하지 않는다. Clipboard, IndexedDB, Worker, 드래그, 초점과 반응형 표현은 계획에 지정한 실제 브라우저 및 담당자 검토 증거가 있어야 한다.

## 출처와 고정 사례

### 공식 자료

- [Testing Library Guiding Principles](https://testing-library.com/docs/guiding-principles/), [query 우선순위와 예외](https://testing-library.com/docs/queries/about/) 및 [비동기 API](https://testing-library.com/docs/dom-testing-library/api-async/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices), [Locators](https://playwright.dev/docs/locators)와 [Assertions](https://playwright.dev/docs/test-assertions)
- [`eslint-plugin-testing-library` 7.16.2](https://github.com/testing-library/eslint-plugin-testing-library/releases/tag/v7.16.2) 및 [고정 태그의 규칙 문서](https://github.com/testing-library/eslint-plugin-testing-library/tree/v7.16.2/docs/rules)
- [`eslint-plugin-jest` 29.16.5](https://github.com/jest-community/eslint-plugin-jest/releases/tag/v29.16.5) 및 [고정 태그의 규칙 문서](https://github.com/jest-community/eslint-plugin-jest/tree/v29.16.5/docs/rules)
- [`@vitest/eslint-plugin` 1.6.27](https://github.com/vitest-dev/eslint-plugin-vitest/releases/tag/v1.6.27) 및 [고정 태그의 규칙 문서](https://github.com/vitest-dev/eslint-plugin-vitest/tree/v1.6.27/docs/rules)
- [`eslint-plugin-playwright` 2.11.0](https://github.com/mskelton/eslint-plugin-playwright/releases/tag/v2.11.0) 및 [고정 태그의 규칙 문서](https://github.com/mskelton/eslint-plugin-playwright/tree/v2.11.0/docs/rules)
- [ESLint `no-restricted-imports`](https://eslint.org/docs/latest/rules/no-restricted-imports), [`no-restricted-properties`](https://eslint.org/docs/latest/rules/no-restricted-properties)와 [`no-restricted-syntax`](https://eslint.org/docs/latest/rules/no-restricted-syntax)

### 외부 저장소의 고정 사례

- Kubeflow Pipelines [테스트 현대화 이슈 #13228](https://github.com/kubeflow/pipelines/issues/13228), 선택자 변경 [c99ba2b](https://github.com/kubeflow/pipelines/commit/c99ba2b42f0de3dc23fca3c9c034195a02045905) 및 [4e30677](https://github.com/kubeflow/pipelines/commit/4e3067752ea6c460c4eb2e81872300b3432356a7), 큰 스냅샷 제거 [15796f3](https://github.com/kubeflow/pipelines/commit/15796f3cfcb22e051c394eaa740278ea2be183f7)
- Grafana의 테스트 선택자와 접근성 판단 [f32d200](https://github.com/grafana/grafana/commit/f32d200fc0047810e03255d38cced0ed36f983ce)
- Kibana의 모의 구현 의존 테스트 실패 [#270803](https://github.com/elastic/kibana/issues/270803)과 그 테스트 파일을 확장한 변경 [39ed9004](https://github.com/elastic/kibana/commit/39ed9004b944a23696f2f7a787860e1302dbd07b1)
- Loculus `getByText` 정밀도 판단 [#1692](https://github.com/loculus-project/loculus/issues/1692)
- Sentry 스냅샷 제한 설정 [63618ec](https://github.com/getsentry/sentry/blob/63618ec25f914f76bfcd14ca87241e42feb1de30/eslint.config.ts#L951)
