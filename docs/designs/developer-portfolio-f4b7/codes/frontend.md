# Frontend Engineering

프론트엔드를 개발하면서 발생할 수 있는 개발 이슈를 파악하고 대응 방안을 정리한 글입니다.

## 설계 규칙

- 하나의 모듈은 하나의 역할만 담당해야 한다.
- HTTP 클라이언트, 스토리지, 로그, 애널리틱스, 외부 SDK를 사용하는 모듈은 실행 환경이 달라지거나 테스트할 때 모듈 내부를 변경하지 않고 교체할 수 있어야 한다.
- 폴더명, 파일명, 타입명은 상위 디렉터리에서 파악가능한 컨텍스트를 불필요하게 반복하지 않는다. 이름에 Feature, Entities, View, Controller와 같은 개념 용어를 그대로 사용하지 않는다.
- FSD를 통해서 각 모듈의 관심사와 역할, 목적을 분명하게 구분할 수 있어야 한다.
  - app
  - pages
  - widgets
  - features
  - entities
  - shared
- 상위 모듈에서 서비스 기능 코드를 직접 작성하지 않는다. 하위 모듈을 조합하여 상위 모듈을 구성하는 방식으로 작업을 진행한다.하위 모듈이 상위 모듈을 호출하는 코드를 작성하지 않는다. 모듈이 다른 모듈을 사용할 때에는 Public API을 통해 호출한다.
- Pages에서 사용하지 않는 기능 상태나 콜백을 하위 컴포넌트에 전달하기 위해 Pages에 Props를 추가하지 않는다. 입력 검증과 저장 재시도는 기능을 담당하는 하위 모듈에서 수행하고, 저장 진행 상태도 그 모듈에서 관리한다.
- 모듈의 상하 관계는 FSD 계층과 import 방향을 기준으로 판단한다. 컴포넌트 트리에서 Provider는 자신이 감싸는 하위 컴포넌트에 Context를 제공한다.
- 현재 기능이 간단하다는 이유만으로 Pages에 구현하지 않는다. 개발이 진행되면 기능에 검증이나 실패 시 재시도 같은 동작이 추가될 수 있다. 화면과 독립적으로 변경되는 동작을 파악하고 그 책임을 맡을 모듈에 배치한다.
- 서비스에 대해서 하나의 컨테이너에 여러 가지의 모듈을 보관하지 않는다. UI 컴포넌트가 `useDependencies()`와 같은 방대한 컨테이너를 가져오는 코드를 작성하지 않는다. UI 컴포넌트는 자신에게 필요한 기능을 제공하는 모듈만 호출하도록 한다.
- 컴포넌트 Props는 정말 필요한 값만 지정할 수 있다. Props를 금지하는 것은 아니다.
- 특히 재사용해야 하는 컴포넌트의 경우 특정 기능에 의존하지 않도록 한다.
- Spread Operator로 객체를 통째로 컴포넌트에 전달하지 않는다.
- UI 구조를 확장성있게 구성하기 위해서는 `children`과 Compound Components를 우선 사용하고, 서비스 자체 컴포넌트에 새로운 Render Props 패턴을 기본 수단으로 도입하지 않는다. JSX를 일반 데이터처럼 임의의 Props에 전달하여 UI 슬롯을 계속 증가시키지 않는다.
- 하위 컴포넌트는 별도로 분리해 상위 컴포넌트 밖에 정의한다. Hook도 다른 컴포넌트의 렌더링 중에 새로 정의하지 않는다. `useState`, `useMemo`, `useCallback` 등으로 렌더링 중 컴포넌트 타입을 동적으로 생성하지 않는다.
- 컴포넌트 본문에서 JSX 마크업을 변수에 할당하지 않는다. 마크업은 반환하는 JSX에 작성하고, 분리해야 할 부분은 별도의 컴포넌트로 정의한다.
- Component 함수는 JSX를 통해 React가 호출하게 하고 Component 함수를 일반 함수처럼 직접 호출하지 않는다.
- 재사용 가능한 순수 UI 컴포넌트는 Props와 `children` 만으로 동작하게 한다. 데이터 조회, 화면 이동, 캐시 무효화 또는 서비스 의존성 모듈 호출 코드를 작성하지 않는다.
- 상위 컴포넌트가 직접 사용하지 않는 서버 데이터를 하위 컴포넌트에 Props로 중계하지 않는다.
- 서로 독립적인 서비스 컴포넌트가 같은 서버 데이터를 사용하면 공통 `queryOptions`로 같은 쿼리 키를 각각 구독한다. 서로의 조회 결과를 Props로 전달하지 않는다.
- 쿼리 데이터의 일부 속성이나 파생값만 독립적으로 사용하는 서비스 컴포넌트는 그 데이터를 상위 컴포넌트에서 Props로 받지 않는다. `select`를 사용해 필요한 값만 선택적으로 구독하는 방식을 검토한다.
- `useQuery`, `useMutation` 등의 반환 객체 전체를 Context나 Props로 전달하거나 별도 React 상태에 복사하지 않는다. Props로 전달할 때는 받는 컴포넌트의 책임에 필요한 데이터와 상태만 선택한다.
- 상위 컴포넌트가 조회 시작 시점만 결정하는 경우에는 공통 쿼리 옵션으로 사전 조회(prefetch)할 수 있다. 실제로 데이터를 사용하는 하위 컴포넌트가 같은 쿼리 키를 구독하고, 상위 컴포넌트는 사전 조회 결과를 Props로 전달하지 않는다.
- 사용자 이벤트가 발생한 뒤에만 필요한 서버 데이터는 브라우저에서 API를 호출해 조회한다. 현재 인증 범위에 있는 캐시 값이 필요한 최신성을 충족하면 `getQueryData`로 읽을 수 있다. 이벤트에서 사용할 데이터를 Props로 미리 전달하지 않는다.
- 클라이언트에서 구독하거나 재검증하는 서버 데이터와 캐시 정책은 TanStack Query로 관리한다. 쿼리 데이터를 Zustand나 별도 Context 상태에 복제하지 않는다.
- 이미 존재하는 데이터를 수정하는 UI를 개발하는 경우 서버 데이터를 폼의 초기값으로 활용할 수 있다. 사용자가 편집을 시작한 뒤에는 Form 상태를 React Hook Form이 관리하고, TanStack Query의 캐시 데이터 또는 별도 store와 실시간으로 양방향 동기화하지 않는다. Form 초기값을 설정하기 위해서는 비동기 defaultValue 함수를 우선 활용한다.
- 백그라운드 재조회가 가져온 값으로 사용자가 편집 중인 Form 값을 덮어쓰지 않는다. 서버 쪽 데이터의 변경과 편집 중인 데이터 사이의 충돌 정책이 필요하면 명시적으로 구현한다.
- 각 Form을 담당하는 `useForm`이 그 form의 생명주기를 관리한다. 하위 필드가 동일한 입력 상태를 공유해야 할 때는 `FormProvider`와 React Hook Form의 공식 Context API를 사용한다.
- 일반적인 입력 상태를 UI와 연동할 때에는 `register`을 우선 사용한다. 외부 라이브러리 등에서 제공하는 제어 컴포넌트, 또는 미세하게 컨트롤해야 하는 경우 `useController`를 사용한다.
- `useController`, `useWatch`, `useFormContext`, `watch`, `setValue`와 같은 React Hook Form API는 필드 구독, 외부 컴포넌트 연동 또는 명령적인 데이터 갱신이 필요할 때만 사용한다.
- 리스트 형태의 입력 상태를 관리해야 하는 경우 useFieldArray를 사용한다.
- 전체 form 값을 모두 watch해 불필요한 렌더링을 일으키지 말고, 특정 필드나 파생값만 필요한 컴포넌트는 필요한 필드만 구독한다.
- 쿼리 클라이언트처럼 브라우저에서 단 한 번만 생성되어야 하는 경우 컴포넌트 외부에서 생성시킨다.
- React Hook Form의 state, control, register 및 field 값을 별도의 DI Context나 Zustand store에 다시 복제하지 않는다.
- Compound Component의 하위 필드는 자신이 속한 form 또는 UI Context를 사용할 수 있지만, UI 책임과 무관한 API, 서비스 기능 모듈 호출까지 담당하지 않는다.
- 순환 모듈를 방치하는 대신 문제가 발생하는 코드를 별도의 모듈로 분할하는 방법을 리서치한다.
- useEffect의 경우 반드시 필요한 경우에만 사용한다. 리액트 공식문서 You Might Not Need an Effect를 참고할 것.
- useRef의 경우 용도가 맞는지 확인한다.
- Props나 State에서 파생되는 값은 기본적으로 렌더링 중에 직접 계산한다. 같은 입력으로 비용이 큰 계산을 반복하거나 `memo`로 감싼 하위 컴포넌트에 전달하는 값의 참조를 유지해 불필요한 렌더링을 줄일 수 있을 때 `useMemo`를 검토한다.
- 함수는 기본적으로 메모이제이션 없이 정의한다. 함수 참조를 유지해 `memo`로 감싼 하위 컴포넌트의 불필요한 렌더링을 줄이거나 다른 Hook의 불필요한 재실행을 줄일 수 있을 때 `useCallback`을 검토한다.
- 기존 Props 또는 State에서 도출할 수 있는 값은 별도의 State로 관리하지 않는다
- 사용자 이벤트를 Effect로 처리하지 않는다
- Props 변경에 대해서 Effect로 상태 초기화를 하지 않는다
- Tanstack Query의 쿼리 객체, 뮤테이션 객체, React Hook Form의 Form 객체를 별도의 리액트 State로 복제하지 않는다
- 리액트의 선언적 인터페이스를 제공하지 않는 외부 UI 라이브러리를 연동할 때 Effect를 사용할 수 있다.
- ESLint 경고를 무시하지 않는다
- Strict Mode의 작동 방식을 우회하지 않는다.
- 다음과 같은 ESLint 규칙을 사용한다, rules-of-hooks, exhaustive-deps, set-state-in-effect
- WebSocket, SSE, 외부 SDK처럼 리액트 기법으로 리소스가 해제되지 않는 경우에 Effect로 연결을 명시적으로 관리한다
- Cleanup 함수로 리소스가 낭비되지 않도록 정리한다.

- Form 객체를 Props로 전달하지 않는다.
- register와 useController의 용도와 사용해야 하는 상황을 구분한다.
- 입력값을 별도의 useState로 관리하지 않는다
- watch로 전체 폼 구독을 함부로 하지 않는다.
- 파생 데이터를 별도의 상태로 저장하지 않는다
- formState는 사용하는 컴포넌트에서 구독한다. 조건부 접근을 주의한다.
- Tanstack Query로 조회한 데이터를 사용할 때 쿼리와 입력 UI의 라이프사이클을 분리한다
- 쿼리 데이터를 Form의 초기값으로 사용할 때 비동기 defaultValues 함수를 사용한다. ensureQueryData를 사용하면 QueryClient의 캐시 정책과 데이터 조회를 활용할 수 있다.
- register와 useController를 중복 사용하지 않는다
- 무분별하게 reset를 호출하지 않는다
- 입력값이 이벤트에서 실행할 작업에만 필요하다면 `getValues`로 필요한 필드만 조회하고 입력 변경을 구독하지 않는다. 현재 입력값을 화면에 반영해야 하는 경우와 이벤트 실행에 필요한 값을 읽는 경우를 구분한다.
- `getValues`가 구독이나 렌더링을 발생시키지 않는다는 사실을 별도 State 추가의 근거로 사용하지 않는다. 렌더링 최적화만을 목적으로 입력값이나 현재 입력값에서 계산할 수 있는 표시값을 State에 복제하지 않는다. 화면에 현재값을 표시해야 한다면 필요한 컴포넌트에서 필요한 필드만 구독하고 표시값을 계산한다.
- `useWatch`는 입력 변경을 실시간으로 표시해야 하는 컴포넌트에서 필요한 필드 이름을 명시해 사용한다. 폼 전체나 특정 객체 전체를 구독하지 않는다.
- `setValue`와 `setValues`는 변경 대상 필드 자신의 입력 이벤트가 아닌 다른 필드의 선택, 자동 채우기 버튼 등 외부 이벤트에 의해 값을 변경해야 할 때만 사용한다. 필드 자신의 입력 이벤트는 `register` 또는 `useController`가 제공하는 입력 이벤트 처리 함수로 연결한다.
- `reset`은 폼 전체의 입력값과 기본값, 수정 여부와 오류 등 폼 상태를 다시 설정할 때 사용한다. 개별 입력값을 변경하는 용도로 사용하지 않으며, 유지해야 할 값과 상태는 옵션으로 명시한다.
- `resetField`는 등록된 특정 필드의 값과 `dirtyFields`, `touchedFields`, 오류 상태를 초기화할 때 사용한다. `defaultValue`를 지정하면 해당 필드의 기본값도 변경되므로, 유지할 필드 상태와 기본값 변경 여부를 구분한다. 이때 폼 전체의 수정 여부와 유효성도 다시 평가될 수 있다.

- useFieldArray를 사용할 때 입력값을 업데이트할 때 setValue 함수를 가급적 사용하지 않는다.
- 목록 형태의 Form 값의 경우 각 항목마다 입력값을 관리하는 방법을 사용할 수 있다. 즉 각 항목마댜 useController 또는 register를 사용할 수 있다.
- field 객체를 하위 컴포넌트에 전달하지 않는다.
- 기존 항목의 컴포넌트 식별성과 UI 상태를 보존해야 하는 상황에서는 update를 함부로 사용하지 않는다

- 외부 저장소 구독도 무조건 직접 Effect로 작성하지 않습니다. 라이브러리의 React 연동 API나 useSyncExternalStore가 적합한지 먼저 비교한다.
- 네비게이션 처리를 Effect로 하는 것보다 더 직관적인 방식을 찾아서 도입한다.

### 테스트

- 서비스 코드에 `data-testid`, `data-cy`, `data-qa` 같은 테스트 전용 식별자 속성을 정의하지 않는다. 테스트 코드에서도 테스트 전용 식별자를 조회하는 선택자를 사용하지 않는다.
- 테스트에서 요소를 찾기 위해 ARIA 역할이나 속성, 접근 가능한 이름, HTML `id`, CSS 클래스를 추가하거나 변경하지 않는다. 테스트 전용 식별자를 생성하거나 전달하는 함수, Props, Context와 컴포넌트도 정의하지 않는다.
- 요소의 의미론적 역할과 사용자에게 제공하는 접근 가능한 이름 및 레이블로 대상을 찾는다. 링크의 목적지나 버튼의 비활성 상태처럼 실제 기능을 나타내는 속성은 그 동작을 확인할 때 사용한다. 접근성 속성은 실제 역할, 이름 또는 상태를 표현하는 데 사용한다.
- 요소를 구별할 때 CSS 클래스, DOM 계층과 목록 인덱스에 불필요하게 의존하지 않는다. 목록 순서가 요구사항이면 각 항목을 사용자에게 표시되는 이름이나 값으로 식별한 뒤 그 순서를 확인한다.
- 내부 State, Hook 호출 횟수와 구현 순서를 검증 기준으로 삼지 않는다. 화면을 검증할 때는 사용자가 조작하는 요소를 통해 기능을 실행하고 화면 상태나 저장 결과를 확인한다. 함수나 모듈을 검증할 때는 공개 인터페이스의 반환값과 외부에서 관찰할 수 있는 결과를 확인한다.
- 저장이나 제출의 완료 여부는 저장된 값, 재조회한 값 또는 처리 결과가 반영된 화면에서 확인한다. 외부 요청 전송이 요구사항이면 요청 대상과 전달값을 검증한다. 요청 횟수는 중복 전송 방지처럼 횟수 자체가 요구사항일 때 검증한다.
- `toHaveTextContent` 같은 텍스트 검증은 문구의 내용이나 표시 값이 요구사항일 때 사용한다. 안내 문구가 표시됐다는 사실만으로 저장, 제출과 같은 기능의 완료를 판단하지 않는다.
- 정상 입력, 입력 범위의 경계값, 오류 처리, 상태 전이와 실패 이후의 복구 동작을 요구사항에 따라 검증한다. 복구 기능이 있으면 실패를 관찰한 뒤 재시도하거나 취소했을 때의 결과를 확인한다.
- 기대값은 요구사항과 테스트가 준비한 입력에서 얻는다. 검증 대상 구현의 상수, 반환값이나 계산 로직을 기대값 산출에 재사용하지 않는다.
- React, TanStack Query와 React Hook Form의 연동을 검증하는 통합 테스트에서는 각 라이브러리의 실제 구현을 사용한다. 네트워크 실패 등을 재현해야 하면 외부 시스템에 연결하는 기존 인터페이스에서 응답을 제어한다.
- 테스트마다 독립된 QueryClient 캐시, 저장소, 인증 상태와 테스트 데이터를 준비한다. 테스트 실행 순서와 병렬 실행 여부가 결과에 영향을 주지 않도록 한다.
- 테스트 데이터는 같은 조건에서 재현할 수 있게 구성한다. 기대 결과에 영향을 주는 입력값, 시각과 난수 시드는 테스트 코드에서 확인할 수 있게 한다.
- 고정된 시간만큼 대기하는 대신 요소의 등장이나 상태 변경처럼 검증할 조건을 기다린다. 만료와 지연처럼 시간 자체가 요구사항이면 테스트에서 시계를 제어해 기준 시각 전후의 동작을 확인한다.
- `waitFor`처럼 콜백을 반복 호출할 수 있는 API에는 조회와 검증문만 작성한다. 클릭, 입력, 요청 전송과 데이터 변경은 콜백 밖에서 실행한다.
- 테스트에서 시작한 외부 연결과 구독은 해제하고 타이머는 취소한다. 테스트가 끝나면 대역의 상태를 초기화하고 스파이와 가짜 시계를 원래 구현으로 복원한다.
- 테스트 이름에는 실행 조건과 기대 결과를 작성한다. 반복되는 환경 구성만 공통 헬퍼로 분리하고, 기능을 실행하는 조작과 결과를 확인하는 검증문은 각 테스트에서 확인할 수 있게 한다.
- 테스트를 통과시키기 위해 요구사항을 바꾸거나 서비스 모듈의 인터페이스를 불필요하게 확장하지 않는다. 필요한 입력과 오류 상황은 사용자 인터페이스 또는 기존 공개 인터페이스를 통해 재현한다.
- 테스트 통과만으로 구현의 정확성을 판단하지 않는다. 주요 규칙은 잘못된 입력 허용, 상태 전이 누락이나 외부 요청 누락을 재현했을 때 기존 검증문이 실패하는지 확인한다.
- 코드 커버리지는 실행되지 않은 코드나 분기를 찾는 데 사용한다. 코드가 실행됐더라도 그 결과를 검증하는 조건이 있는지 별도로 확인한다.
- 금액 계산이나 권한 판정처럼 오류 영향이 큰 도메인 규칙에는 뮤테이션 테스트를 적용해 조건 반전과 경계값 변경을 검출하는지 확인한다. 검출하지 못한 변이는 요구사항이 정한 결과에 영향을 주는지 확인한 뒤 검증 사례를 보완한다.

## 상세 & 사례

### 모듈 & FSD

화면 구성, 사용자 동작과 외부 시스템 연동은 각각 그 책임을 맡는 모듈에 배치한다. FSD 계층은 슬라이스 사이의 import 방향을 정한다. 슬라이스는 함께 변경되는 화면이나 동작을 묶고, 슬라이스 내부의 세그먼트는 `ui`, `model`, `api`처럼 코드의 용도를 나타낸다.

아래 예시는 프로젝트 제목 편집에 필요한 모듈을 발췌한 코드이며 미실행 상태다. 예시에서 `@/`는 FSD 소스 루트의 import 별칭이다.

#### 화면에서 독립적으로 바뀌는 편집 기능

제목의 검증 규칙이나 저장 실패 후 다시 제출하는 동작을 변경하면 편집 모듈을 수정한다. 편집 대상 선택이나 저장 후 이동처럼 화면에 따라 달라지는 동작은 화면의 Pages 슬라이스에서 정한다. 첫 화면에서만 사용하고 코드가 짧아도 편집 규칙이 화면과 독립적으로 바뀐다면 Features에 배치할 수 있다. 여러 화면에서 같은 동작을 사용하는 경우에도 Features 배치를 검토한다. [FSD 계층 지침](https://feature-sliced.design/docs/reference/layers)

아래 구조에서 `app`은 라우트와 애플리케이션 전체 설정을 조합한다. `pages`는 화면을 구성하고, `features`는 제목 편집을 담당한다. 여러 동작에서 공통으로 사용하는 프로젝트 자료와 도메인 규칙은 `entities`에 배치할 수 있다. 프로젝트 규칙에 의존하지 않는 공용 UI와 통신 기반은 `shared`에 둔다. 큰 화면 블록을 독립적으로 배치하거나 재사용할 경우 `widgets`를 사용한다. 예시의 제목 편집은 화면에서 바로 조합하므로 Widgets 계층 없이 구성한다.

```text
src/
  app/
    routes.tsx
  pages/
    project-edit/
      index.ts
      ui/project-edit-page.tsx
  features/
    edit-project/
      index.ts
      api/save-project.ts
      model/save-project-context.ts
      ui/project-editor.tsx
      ui/title-form.tsx
  entities/
    project/
      index.ts
      model/project.ts
  shared/
    ui/
      button/
        index.ts
        button.tsx
```

#### 편집 상태를 중계하지 않는 Pages

Pages는 편집 대상과 화면을 구성하는 데 필요한 값을 전달한다. 저장 진행 상태, 오류와 재시도는 편집 모듈에서 관리한다. Pages가 이 값을 중계하는 구성에서는 편집 방식이 달라질 때마다 화면의 Props도 함께 바뀐다. 저장 후 이동처럼 화면마다 다른 동작이 있을 경우에는 화면이 결정한 콜백을 편집 모듈에 전달할 수 있다.

`pages/project-edit/ui/project-edit-page.tsx`는 화면을 구성하고 편집할 대상과 초기 제목을 전달한다. `key`는 다른 편집 대상으로 이동했을 때 그 대상의 입력 상태를 시작하는 데 사용한다.

```tsx
import { ProjectEditor } from "@/features/edit-project";

type Props = {
  projectId: string;
  initialTitle: string;
};

export function ProjectEditPage({ projectId, initialTitle }: Props) {
  return (
    <main>
      <h1>프로젝트 제목 편집</h1>
      <ProjectEditor
        key={projectId}
        projectId={projectId}
        initialTitle={initialTitle}
      />
    </main>
  );
}
```

`features/edit-project/ui/title-form.tsx`는 제목을 검증하고 저장 요청을 실행한다. 요청이 실패하면 편집값을 유지한 채 오류를 표시하고 같은 버튼으로 다시 제출할 수 있다. 공용 `Button`은 편집 모듈이 결정한 비활성화 여부와 버튼 문구를 받는다. 폼 상태의 세부 규칙은 [Form](#form)을 참고한다.

```tsx
import { useForm } from "react-hook-form";

import { Button } from "@/shared/ui/button";

import { useSaveProject } from "../model/save-project-context";

type Fields = { title: string };
type Props = { projectId: string; initialTitle: string };

export function TitleForm({ projectId, initialTitle }: Props) {
  const saveProject = useSaveProject();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({ defaultValues: { title: initialTitle } });

  const title = register("title", {
    validate: (value) => value.trim().length > 0 || "제목을 입력하세요.",
  });

  const submit = handleSubmit(async ({ title }) => {
    try {
      await saveProject(projectId, title.trim());
    } catch {
      setError("root.save", {
        message: "저장하지 못했습니다. 다시 시도하세요.",
      });
    }
  });

  return (
    <form onSubmit={submit}>
      <label>
        제목
        <input
          name={title.name}
          ref={title.ref}
          onBlur={title.onBlur}
          onChange={title.onChange}
          readOnly={isSubmitting}
        />
      </label>
      {errors.title?.message && <p role="alert">{errors.title.message}</p>}
      {errors.root?.save?.message && (
        <p role="alert">{errors.root.save.message}</p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        저장
      </Button>
    </form>
  );
}
```

#### 편집 컴포넌트가 선택하는 저장 구현

Provider의 JSX 위치는 Context를 사용할 수 있는 컴포넌트를 정한다. 모듈의 상하 관계는 FSD 계층과 import 방향으로 판단한다. 예시에서는 Pages가 Features의 `ProjectEditor`를 가져오고, `ProjectEditor`가 같은 슬라이스의 `TitleForm`을 감싼다. 폼은 저장 함수의 인터페이스와 Hook에 의존한다. 실제 HTTP 함수는 편집 컴포넌트가 선택하므로 저장 구현을 교체할 때 폼 코드를 수정할 필요가 없다. [React Context](https://react.dev/reference/react/useContext)

`model/save-project-context.ts`는 저장 함수와 그 함수에 접근하는 Hook을 정의한다. 이 Context에는 편집값이나 제출 상태를 저장하지 않는다. 구현을 교체하는 조건과 테스트에서의 제공 방식은 [의존성 주입과 제어 역전](#의존성-주입과-제어-역전)을 참고한다.

```ts
import { createContext, useContext } from "react";

export type SaveProject = (projectId: string, title: string) => Promise<void>;

export const SaveProjectContext = createContext<SaveProject | null>(null);

export function useSaveProject(): SaveProject {
  const saveProject = useContext(SaveProjectContext);
  if (saveProject === null)
    throw new Error("프로젝트 저장 함수가 제공되지 않았습니다.");
  return saveProject;
}
```

`api/save-project.ts`는 저장 요청을 실행하고 실패 응답을 오류로 전달한다. 오류를 표시할 시점은 폼이 결정한다.

```ts
import type { SaveProject } from "../model/save-project-context";

export const saveProject: SaveProject = async (projectId, title) => {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    },
  );

  if (!response.ok) throw new Error("프로젝트 제목 저장에 실패했습니다.");
};
```

`ui/project-editor.tsx`는 운영 환경의 저장 함수를 제공한다. 아래 Context의 JSX 문법은 React 19 기준이다. 저장 함수가 필요한 컴포넌트는 편집 모듈의 Context를 읽으며 Pages를 import하지 않는다.

```tsx
import { saveProject } from "../api/save-project";
import { SaveProjectContext } from "../model/save-project-context";

import { TitleForm } from "./title-form";

type Props = { projectId: string; initialTitle: string };

export function ProjectEditor({ projectId, initialTitle }: Props) {
  return (
    <SaveProjectContext value={saveProject}>
      <TitleForm projectId={projectId} initialTitle={initialTitle} />
    </SaveProjectContext>
  );
}
```

#### 다른 슬라이스가 사용하는 공개 진입점

다른 슬라이스는 허용된 하위 계층의 공개 진입점에서 필요한 선언을 가져온다. 같은 계층의 서로 다른 슬라이스는 기본적으로 서로 가져오지 않는다. 같은 슬라이스 안에서는 선언을 정의한 파일을 상대 경로로 가져온다. import 별칭이나 재수출을 사용하더라도 실제 선언이 속한 계층을 확인한다. [FSD 공개 API 지침](https://feature-sliced.design/docs/reference/public-api)

`features/edit-project/index.ts`는 Pages가 사용하는 `ProjectEditor`만 내보낸다. 저장 함수와 폼은 편집 슬라이스 안에서 직접 사용한다. 외부가 내부 파일에 의존하지 않으면 파일을 옮겨도 Pages의 import를 유지할 수 있다.

```ts
export { ProjectEditor } from "./ui/project-editor";
```

`pages/project-edit/ui/project-edit-page.tsx`는 아래 진입점을 사용한다. `@/features/edit-project/ui/project-editor`를 직접 가져오면 Pages가 편집 모듈 내부의 파일 위치에 의존한다. 계층과 진입점을 검사하는 도구로 이 두 import를 구별할 수 있는지 확인한다.

```tsx
import { ProjectEditor } from "@/features/edit-project";
```

#### 자기 슬라이스의 진입점에서 발생한 순환 import

순환 import가 발생하면 처음 파일로 돌아오는 import와 재수출을 따라가며 원인이 된 선언을 확인한다. 예를 들어 `index.ts`가 `ProjectEditor`를 내보내고 `ProjectEditor`가 자신의 `index.ts`에서 `TitleForm`을 가져오면 두 파일 사이에 순환이 생긴다. 다음 두 블록은 이 상황을 표현한 별도 예시다.

`features/edit-project/index.ts`

```ts
export { ProjectEditor } from "./ui/project-editor";
export { TitleForm } from "./ui/title-form";
```

`features/edit-project/ui/project-editor.tsx`의 피해야 할 import다.

```tsx
import { TitleForm } from "../index";
```

`ProjectEditor`에서 `TitleForm`을 정의한 파일을 직접 가져오고 외부 소비자가 사용하지 않는 재수출을 정리한다. 여러 파일이 공통 상수를 요구하는 경우에는 해당 상수의 책임에 맞는 모듈에서 선언한다. 서로 다른 두 기능이 실행 순서를 조정하면서 양방향 의존성이 생긴 경우에는 상위 모듈에서 두 기능을 조합한다. 변경 후에는 import와 재수출을 따라갔을 때 같은 파일로 돌아오는지 확인한다. [FSD 순환 import 지침](https://feature-sliced.design/docs/reference/public-api#circular-imports), [VS Code의 순환 import 수정 사례](https://github.com/microsoft/vscode/pull/313123)

```tsx
import { TitleForm } from "./title-form";
```

### 의존성 주입과 제어 역전

하나의 모듈을 여러 컴포넌트에서 재사용하기 위해서 Provider를 사용할 수 있다.

#### 필요한 모듈을 제공하는 Context

Props로 모듈을 제공하는 방식은 단순하다. 하지만 필요한 컴포넌트에 모듈을 제공하기 위해서 여러 컴포넌트에 Props을 정의해야 한다. 그리고 모듈에 변경사항이 발생하면 모듈을 Props로 제공받고 전달하는 모든 컴포넌트를 전부 수정해야 한다.

모듈을 사용해야 하는 컴포넌트만 모듈을 제공할 수 있도록 Provider 기반의 의존성 주입을 사용할 수 있다.

모든 서비스를 노출하는 전역 `useServices()`, `useDependencies()`, `container.get()` 및 유사한 Service Locator를 만들지 않는다.

```tsx
// context.tsx
import { createContext, useContext } from "react";

export type User = Readonly<{ id: string; name: string }>;
export type UpdateUserNameArgs = Readonly<{ id: string; name: string }>;

export type ProfileActions = Readonly<{
  getUser: (id: string) => Promise<User>;
  updateUserName: (input: UpdateUserNameArgs) => Promise<User>;
}>;

export const ProfileContext = createContext<ProfileActions | null>(null);

function useProfileActions(): ProfileActions {
  const actions = useContext(ProfileContext);
  if (!actions) throw new Error("ProfileProvider is missing");
  return actions;
}

export function useGetUser() {
  return useProfileActions().getUser;
}

export function useUpdateUserName() {
  return useProfileActions().updateUserName;
}
```

#### 구현체를 연결하는 Provider

모듈을 제공하는 Provider는 구현체를 props로 받지 않는다.

`http.ts`는 브라우저에서 사용 가능한 함수만 정의해야 한다.

운영용 `ProfileProvider`가 프로필 조회와 이름 변경에 사용할 HTTP 함수를 연결한다. 상위 화면은 필요한 영역을 Provider로 감싸고, 하위 컴포넌트는 `useGetUser`나 `useUpdateUserName`으로 필요한 함수를 얻는다. `ProfileActions`에 정의한 입력과 반환 형식을 유지하면 HTTP 구현을 교체해도 기존 기능별 Hook을 같은 방식으로 사용할 수 있다.

```tsx
// provider.tsx
import type { ReactNode } from "react";
import { ProfileContext, type ProfileActions } from "./context";
import { getUser, updateUserName } from "./http";

const actions = {
  getUser,
  updateUserName,
} satisfies ProfileActions;

export function ProfileProvider({ children }: { children: ReactNode }) {
  return <ProfileContext value={actions}>{children}</ProfileContext>;
}
```

#### 동일한 Context 인터페이스를 제공하는 테스트 Provider

`useContext`는 같은 Context 객체를 사용하는 Provider 중 호출한 컴포넌트에서 가장 가까운 상위 Provider의 값을 반환한다. 따라서 테스트용 Provider도 운영용 Hook이 읽는 `ProfileContext`에 `ProfileActions`를 제공한다. 테스트에서 조회에 성공하거나 이름 변경에 실패하는 함수를 제공하면 실제 HTTP 요청 없이 각 상황에서 화면이 어떻게 반응하는지 확인할 수 있다.

```tsx
// profile-testing.tsx — 테스트에서만 import
import type { ReactNode } from "react";
import { ProfileContext, type ProfileActions } from "./context";

export function createTestProfileProvider(actions: ProfileActions) {
  return function TestProfileProvider({ children }: { children: ReactNode }) {
    return <ProfileContext value={actions}>{children}</ProfileContext>;
  };
}
```

### Props

컴포넌트의 책임, 목적, 역할을 위해 필요한 데이터를 Props로 전달할 수 있다.

#### 필요한 값만 전달하는 Props

사용하지 않는 정보까지 전달하지 않는다.

```tsx
type Props = {
  name: string;
};

function UserName({ name }: Props) {
  return <span>{name}</span>;
}
```

#### 사용하지 않는 정보까지 포함한 Props

다음 코드는 조직 정보와 권한 정보까지 인터페이스에 포함하고 있기 때문에 따르지 않도록 한다.

```tsx
interface Props {
  user: User;
  organization: Organization;
  permissions: Permission[];
}

function UserName({ user }: Props) {
  return <span>{user.name}</span>;
}
```

#### 의미적으로 응집된 객체 전달

의미적으로 응집된 객체를 전달해야 하는 경우에는 객체를 Props로 전달할 수 있다.

```tsx
type Money = Readonly<{
  amount: number;
  currency: string;
}>;

type Props = {
  price: Money;
};

function ProductPrice({ price }: Props) {
  const formatted = new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: price.currency,
  }).format(price.amount);

  return <span>{formatted}</span>;
}
```

#### 시각적 표현과 UI 기능의 Props

컴포넌트의 시각적 표현 및 고유한 UI 기능에 필요한 데이터를 Props로 전달한다.

```tsx
<Button variant="primary" size="medium" disabled={isPending}>
  저장
</Button>
```

#### 도메인 정책을 전달받는 공용 버튼

서비스에 존재하는 도메인 관련 정책 또는 데이터를 UI 컴포넌트에 전달하지 않는다.

다음 코드에서는 공용 버튼이 다음과 같은 책임까지 담당해야 한다.

- 버튼의 시각적 표현과 상호작용
- 사용자의 권한 판별
- 구독 정책 판단
- 리소스에 대한 접근 조건 판단

```tsx
<Button
  userRole={user.role}
  subscription={subscription}
  permissions={permissions}
  resourceOwnerId={ownerId}
>
  수정
</Button>
```

#### 권한 판단과 버튼 UI 분리

`EditProductButton`은 `useCanEditProduct`로 상품의 수정 가능 여부를 확인한다. 수정할 수 없으면 `disabled`를 `true`로 전달한다. 권한 정책이 바뀌어도 공용 `Button`은 `disabled`로 비활성 상태를 표시한다. 다른 권한 정책을 적용하는 화면에서도 같은 `Button`을 사용할 수 있다.

```tsx
function EditProductButton({ productId }: Props) {
  const canEdit = useCanEditProduct(productId);

  return <Button disabled={!canEdit}>수정</Button>;
}
```

#### 삭제 기능과 캐시 갱신을 담당하는 버튼

다음 코드의 경우 버튼 UI 외에도 삭제 기능, 캐시 갱신, 알림 기능 등을 담당하고 있다. 의존성을 Props로 주입해도 책임 분리가 제대로 되어있지 않다.

```tsx
type Props = {
  productId: string;
  deleteProduct: (id: string) => Promise<void>;
  invalidateQueries: () => Promise<void>;
  showToast: (message: string) => void;
};

function DeleteButton({
  productId,
  deleteProduct,
  invalidateQueries,
  showToast,
}: Props) {
  async function handleClick() {
    await deleteProduct(productId);
    await invalidateQueries();
    showToast("삭제되었습니다.");
  }

  return <button onClick={handleClick}>삭제</button>;
}
```

#### 삭제 동작을 전달받는 버튼

UI 컴포넌트는 외부에서 어떤 기능 또는 시나리오가 발생하는지 파악할 필요가 없어야 한다.

```tsx
type Props = {
  disabled?: boolean;
  onDelete: () => void;
};

function DeleteButton({ disabled, onDelete }: Props) {
  return (
    <button disabled={disabled} onClick={onDelete}>
      삭제
    </button>
  );
}

function DeleteProduct({ productId }: Props) {
  const { remove, isPending } = useDeleteProduct();

  return (
    <DeleteButton disabled={isPending} onDelete={() => remove(productId)} />
  );
}
```

### 컴포넌트 구조 & 분할

화면의 구성은 `children` 기반 합성과 Compound Component 패턴으로 표현한다. JSX를 담는 임의의 Props를 추가해 UI 슬롯을 늘리지 않는다. 하위 컴포넌트와 Hook은 상위 컴포넌트의 렌더링 함수 밖에 정의한다.

아래 컴포넌트 정의와 조건부 마크업 예시는 React 19 기준이며 미실행 상태다.

#### 렌더링 중 생성한 하위 컴포넌트

React는 같은 위치의 컴포넌트 타입과 `key`를 비교해 이전 상태의 유지 여부를 결정한다. 렌더링 중 선언한 함수를 하위 컴포넌트로 사용하면, 함수 참조가 바뀔 때, React는 기존 컴포넌트를 제거하고 새로 마운트한다. 이때 하위 컴포넌트의 State와 입력 요소가 보관하던 값이 초기화될 수 있다. `useMemo`나 `useCallback`도 의존성이 바뀌면 새 함수를 반환할 수 있다.

다음 코드에서는 안내 문구 표시 여부가 바뀌면 `TitleInput`의 함수 참조가 바뀐다. 사용자가 입력한 제목도 새 입력 요소가 마운트될 때 초기화되므로 이 방식으로 하위 컴포넌트를 정의하지 않는다.

```tsx
import { useCallback } from "react";

function TitleEditor({ showHint }: { showHint: boolean }) {
  const TitleInput = useCallback(
    function TitleInput() {
      return (
        <label>
          제목
          <input name="title" />
          {showHint && <small>검색 결과에 표시할 제목을 입력하세요.</small>}
        </label>
      );
    },
    [showHint],
  );

  return <TitleInput />;
}
```

#### 상위 컴포넌트 밖에 정의한 입력 컴포넌트

하위 컴포넌트를 모듈 최상위에 정의하고, 렌더링마다 달라지는 값은 Props로 전달한다. 동일한 위치에서 같은 `TitleInput`을 렌더링하면 안내 문구만 바뀌어도 입력 요소가 유지된다.

```tsx
function TitleInput({ showHint }: { showHint: boolean }) {
  return (
    <label>
      제목
      <input name="title" />
      {showHint && <small>검색 결과에 표시할 제목을 입력하세요.</small>}
    </label>
  );
}

function TitleEditor({ showHint }: { showHint: boolean }) {
  return <TitleInput showHint={showHint} />;
}
```

#### 반환하는 JSX에 작성하는 조건부 마크업

컴포넌트 본문에서 JSX를 변수에 할당하지 않는다. 반환하는 JSX에 조건과 표시할 요소를 함께 작성하면 어떤 조건에서 어느 위치의 요소가 바뀌는지 확인할 수 있다. 조건에 따라 반환할 화면 전체가 달라지면 조건문에서 JSX를 바로 반환한다. 별도로 분리할 UI는 상위 컴포넌트 밖에 정의한다.

다음 예시는 상품이 없어도 제목과 섹션을 유지한다. 상품 수에 따라 제목 아래에 목록이나 안내 문구를 표시한다.

```tsx
type Product = Readonly<{ id: string; name: string }>;

function ProductResults({ products }: { products: readonly Product[] }) {
  return (
    <section>
      <h2>상품 검색 결과</h2>
      {products.length > 0 ? (
        <ul>
          {products.map((product) => (
            <li key={product.id}>{product.name}</li>
          ))}
        </ul>
      ) : (
        <p>검색 결과가 없습니다.</p>
      )}
    </section>
  );
}
```

#### 서비스 정보를 전달받는 레이아웃

다음 코드는 레이아웃 모듈이 여러 서비스 모듈의 인터페이스에 의존하게 된다.

```tsx
<PageLayout
  user={user}
  products={products}
  cart={cart}
  onLogout={logout}
  onAddToCart={addToCart}
/>
```

#### Children 기반 레이아웃 합성

Children 기반 합성을 활용하여 레이아웃이 서비스 기능에 대해서 몰라도 작동할 수 있도록 한다.

```tsx
<PageLayout>
  <Header>
    <ProfileMenu />
  </Header>

  <Main>
    <ProductList />
  </Main>

  <Sidebar>
    <Cart />
  </Sidebar>
</PageLayout>
```

### Props과 Provider 기반 의존성 주입 활용

컴포넌트에서 Props와 DI를 함께 사용할 수 있다.

#### 상품 삭제

`productId`는 삭제 버튼마다 달라지는 입력이므로 Props로 받는다. 삭제 함수는 `RemoveProductProvider`가 제공하므로 실행 환경에 맞게 구현을 교체할 때 버튼을 호출하는 화면은 같은 Props를 사용한다.

`useDeleteProduct`는 삭제에 성공하면 `["products"]`로 시작하는 쿼리를 무효화하고 기본 설정에서는 활성 쿼리를 다시 조회한다. `onSuccess`에서 쿼리 무효화와 재조회가 끝날 때까지 기다리므로 그동안 `isPending`이 유지되고 버튼은 비활성 상태로 표시된다. 공용 `Button`에는 클릭 동작과 화면 표시에 필요한 값만 전달한다.

우선 기능에 대한 의존성 인터페이스를 설계한다.

```tsx
// context.tsx

import { createContext, useContext } from "react";

export type RemoveProduct = (productId: string) => Promise<void>;

export const RemoveProductContext = createContext<RemoveProduct | null>(null);

export function useRemoveProduct() {
  const remove = useContext(RemoveProductContext);

  if (!remove) {
    throw new Error("RemoveProductProvider is missing");
  }

  return remove;
}
```

그리고 서비스 기능을 위한 Provider를 구성한다.

```tsx
// provider.tsx

import type { ReactNode } from "react";
import { RemoveProductContext } from "./context";
import { removeProduct } from "./http";

export function RemoveProductProvider({ children }: { children: ReactNode }) {
  return (
    <RemoveProductContext value={removeProduct}>
      {children}
    </RemoveProductContext>
  );
}
```

서비스에 필요한 기능 및 캐시 갱신을 Hooks으로 정의한다.

```tsx
// use-delete-product.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useRemoveProduct } from "./context";

export function useDeleteProduct() {
  const removeProduct = useRemoveProduct();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: removeProduct,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },
  });

  return {
    remove: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
  };
}
```

```tsx
// delete-product.tsx

import { Button } from "@/shared/ui/button";
import { useDeleteProduct } from "../model/use-delete-product";

type Props = {
  productId: string;
};

export function DeleteProduct({ productId }: Props) {
  const { remove, isPending, isError } = useDeleteProduct();

  return (
    <>
      <Button disabled={isPending} onClick={() => remove(productId)}>
        {isPending ? "삭제 중" : "삭제"}
      </Button>

      {isError && <p role="alert">삭제하지 못했습니다.</p>}
    </>
  );
}
```

#### 상세 정보 조회

조회 대상은 Props, 조회 환경과 캐시 관리는 QueryClientProvider를 통해 제공받는다.

```tsx
// product-details.tsx

import { useQuery } from "@tanstack/react-query";

import { useGetProduct } from "../model/context";

type Props = {
  productId: string;
};

export function ProductDetails({ productId }: Props) {
  const getProduct = useGetProduct();

  const { data, isPending, isError } = useQuery({
    queryKey: ["products", productId],

    queryFn: ({ signal }) => getProduct(productId, signal),
  });

  if (isPending) {
    return <p>불러오는 중...</p>;
  }

  if (isError) {
    return <p role="alert">조회에 실패했습니다.</p>;
  }

  return (
    <section>
      <h2>{data.name}</h2>
      <p>{data.description}</p>
    </section>
  );
}
```

#### 다양한 실행 환경을 지원해야 하는 컴포넌트

각각의 입력 데이터과 이벤트 처리 방식은 Props를 통해 달라지도록 한다. 반면 업로드 구현체는 Provider 모듈에서 결정된다.

기능 의존성 인터페이스를 다음과 같이 설정할 수 있다.

```tsx
// model/types.ts

export type UploadedFile = {
  id: string;
  url: string;
};

export type UploadFile = (input: {
  file: File;
  targetId: string;
}) => Promise<UploadedFile>;
```

컴포넌트 예시이다.

```tsx
type Props = {
  targetId: string;
  accept?: string;
  onSuccess?: (file: UploadedFile) => void;
};

export function FileUpload({ targetId, accept, onSuccess }: Props) {
  const uploadFile = useUploadFile();

  const mutation = useMutation({
    mutationFn: (file: File) =>
      uploadFile({
        file,
        targetId,
      }),

    onSuccess: (file) => {
      onSuccess?.(file);
    },
  });

  return (
    <>
      <input
        type="file"
        aria-label="업로드할 파일"
        accept={accept}
        disabled={mutation.isPending}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];

          if (file) {
            mutation.mutate(file);
          }
        }}
      />

      {mutation.isError && <p role="alert">업로드에 실패했습니다.</p>}
    </>
  );
}
```

실제 사용 예시는 다음과 같다.

```tsx
<FileUpload
  targetId={profileId}
  accept="image/*"
  onSuccess={handleProfileImageUploaded}
/>

<FileUpload
  targetId={documentId}
  accept="application/pdf"
  onSuccess={handleDocumentUploaded}
/>
```

### Hooks `useEffect`

`useEffect`는 React가 직접 관리하지 않는 외부 시스템을 현재 Props나 State와 동기화해야 할 때만 사용한다. 렌더링 중 계산, 이벤트 핸들러 또는 라이브러리의 React 연동 API로 같은 동작을 구현할 수 있다면 Effect를 추가하지 않는다. 컴포넌트의 최초 표시나 Props 변경만으로 Effect 사용을 결정하지 않는다.

Effect를 작성하기 전에 다음을 확인한다.

- 계산 결과라면 렌더링 중에 계산한다. 같은 값을 State에 다시 저장하지 않는다.
- 사용자 조작 때문에 실행할 명령이라면 그 조작의 이벤트 핸들러에서 호출한다.
- 조회, 입력, 화면 이동이나 외부 저장소 구독이라면 이를 담당하는 라이브러리와 프레임워크의 API를 먼저 비교한다.
- 외부 서비스에 연결하거나 외부 UI 위젯을 제어해야 한다면 동기화할 값, 다시 실행할 조건과 해제할 자원을 식별한다. 동기화 대상과 실행 조건을 설명할 수 없으면 Effect를 작성하지 않는다.

Effect 코드를 사용자 정의 Hook으로 분리하거나 `useLayoutEffect`, `useEffectEvent`로 옮겨도 외부 동기화가 필요한지 먼저 판단해야 한다.

#### Props와 State에서 계산할 수 있는 값

현재 Props와 State로 계산할 수 있는 값을 Effect에서 별도 State에 저장하면, 입력이 바뀌었을 때 이전 계산값으로 렌더링한 뒤 State 갱신으로 다시 렌더링한다. 원본과 복사본의 값도 계속 일치시켜야 한다. 렌더링 중 직접 계산하면 같은 렌더링에서 변경된 입력에 맞는 값을 얻을 수 있다. 계산 시간이 화면 응답을 지연시키는 경우 `useMemo`를 검토한다.

다음 코드는 합계를 별도의 State로 저장하므로 작성하지 않는다.

```tsx
import { useEffect, useState } from "react";

type Props = { subtotal: number; deliveryFee: number };

function Total({ subtotal, deliveryFee }: Props) {
  const [total, setTotal] = useState(subtotal + deliveryFee);

  useEffect(() => {
    setTotal(subtotal + deliveryFee);
  }, [subtotal, deliveryFee]);

  return <output>{total}</output>;
}
```

같은 입력으로 합계를 계산하는 코드는 다음과 같다.

```tsx
type Props = { subtotal: number; deliveryFee: number };

function Total({ subtotal, deliveryFee }: Props) {
  const total = subtotal + deliveryFee;
  return <output>{total}</output>;
}
```

#### 사용자 이벤트에서 실행할 명령

클릭이나 제출 때문에 실행할 명령은 이벤트 핸들러에서 호출한다. 명령을 실행하려고 State를 변경한 뒤 Effect에서 그 값을 확인하지 않는다. 아래 예시의 `requested`는 첫 클릭 뒤 계속 `true`이므로 다시 클릭해도 State가 바뀌지 않아 `onAdd`를 다시 호출하지 못한다. 반대로 `onAdd` 함수 참조가 바뀌면 클릭하지 않아도 Effect가 명령을 다시 실행할 수 있다.

```tsx
import { useEffect, useState } from "react";

type Props = { onAdd: () => void };

function AddButton({ onAdd }: Props) {
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (requested) onAdd();
  }, [onAdd, requested]);

  return (
    <button type="button" onClick={() => setRequested(true)}>
      추가
    </button>
  );
}
```

다음 버튼은 클릭할 때 `onAdd`를 호출한다. 비동기 저장 명령은 이벤트 핸들러에서 완료를 기다리고 성공과 실패를 구분한다. 저장 성공 뒤의 알림과 이동도 저장 완료를 확인한 함수에서 실행한다.

```tsx
type Props = { onAdd: () => void };

function AddButton({ onAdd }: Props) {
  return (
    <button type="button" onClick={onAdd}>
      추가
    </button>
  );
}
```

#### 대상이 바뀔 때 초기화할 UI 상태

프로젝트가 바뀔 때 펼침 상태를 초기값으로 되돌려야 한다면 프로젝트 ID를 `key`로 사용한다. Effect에서 초기화하면 변경된 프로젝트를 이전 프로젝트의 펼침 상태로 먼저 렌더링한다.

다음 코드는 프로젝트가 바뀔 때 펼침 상태를 Effect로 초기화하므로 작성하지 않는다.

```tsx
import { useEffect, useState } from "react";

function ProjectDetails({ projectId }: { projectId: string }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [projectId]);

  return (
    <section>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        상세
      </button>
      {expanded && <p>{projectId}</p>}
    </section>
  );
}
```

펼침 상태를 관리하는 하위 컴포넌트에만 `key`를 지정한다. 같은 프로젝트의 조회 결과가 갱신돼도 프로젝트 ID가 같으면 `key`를 유지한다. `key` 변경은 하위 상태와 DOM을 다시 생성하므로, 유지해야 할 입력값이나 키보드 포커스가 사라지는지 확인한다.

```tsx
import { useState } from "react";

function ProjectDetails({ projectId }: { projectId: string }) {
  return <Details key={projectId} projectId={projectId} />;
}

function Details({ projectId }: { projectId: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        상세
      </button>
      {expanded && <p>{projectId}</p>}
    </section>
  );
}
```

#### Query와 Form이 제공하는 상태 사용

TanStack Query의 쿼리 및 뮤테이션 반환 객체와 React Hook Form의 Form 객체를 Effect로 다른 React State에 복사하지 않는다. 필요한 값과 상태는 각 라이브러리의 API에서 읽는다. 별도 State에 복사하면 라이브러리의 값이 바뀔 때마다 그 State도 갱신해야 하므로 같은 상태를 두 곳에서 관리하게 된다.

뮤테이션 상태는 별도 State 없이 필요한 값만 선택한다. 아래 Hook의 인자 `save`는 저장 함수다. 반환값의 `pending`과 `failed`로 저장 진행 여부와 실패 여부를 표시할 수 있다.

```tsx
import { useMutation } from "@tanstack/react-query";

function useSaveProject(save: () => Promise<void>) {
  const { mutate, isPending, isError } = useMutation({ mutationFn: save });
  return { save: mutate, pending: isPending, failed: isError };
}
```

폼 값으로 계산하는 표시값도 필요한 필드만 구독한 뒤 계산한다. 다음 컴포넌트는 `FormProvider` 안에서 사용하며, `title` 필드와 글자 수를 별도 State로 복제하지 않는다.

서버에서 받은 값은 폼을 시작할 때 편집용 초기값으로 사용할 수 있다. 편집을 시작한 뒤에는 폼이 입력값을 관리한다. 재조회 결과를 Effect로 편집 중인 값에 계속 반영하지 않는다.

```tsx
import { useFormContext, useWatch } from "react-hook-form";

type Fields = { title: string };

function TitleLength() {
  const { control } = useFormContext<Fields>();
  const title = useWatch({ control, name: "title", defaultValue: "" });
  return <output>{title.length}</output>;
}
```

#### 링크와 저장 완료 처리에서 화면 이동 결정

목적지가 정해진 이동은 링크로 표현한다. 이동하려고 State를 바꾼 뒤 Effect에서 `navigate()`나 `router.push()`를 호출하지 않는다. 링크를 사용하면 키보드 조작과 새 탭 열기 등 브라우저의 링크 동작을 유지할 수 있다.

React Router에서 프로젝트 카드의 이동은 다음처럼 표현한다.

```tsx
import { Link } from "react-router";

function ProjectLink({ projectId }: { projectId: string }) {
  return <Link to={`/projects/${projectId}`}>프로젝트 열기</Link>;
}
```

Next.js에서도 일반 이동은 `next/link`를 사용한다.

```tsx
import Link from "next/link";

function ProjectLink({ projectId }: { projectId: string }) {
  return <Link href={`/projects/${projectId}`}>프로젝트 열기</Link>;
}
```

React Router에서 저장 성공 뒤 이동해야 한다면 저장 완료를 확인한 이벤트 핸들러에서 `navigate()`를 호출한다.

Next.js App Router에서 사용자 이벤트에 따라 이동할 때는 이벤트 핸들러에서 `router.push()` 또는 `router.replace()`를 호출한다.

렌더링 본문에서 `navigate()`나 `router.push()`를 직접 호출하지 않는다. 외부 SDK 알림이나 타이머 때문에 이동해야 한다면 구독이 필요한지 먼저 판단하고, 알림을 받는 콜백에서 이동한다.

#### 외부 저장소가 제공하는 구독 API 우선 비교

외부 저장소의 값을 읽기 위해 Effect와 State를 추가하기 전에 라이브러리의 React용 Hook을 확인한다. 제공되는 Hook으로 필요한 값을 구독할 수 있다면 그 Hook을 사용한다. 직접 연결해야 하고 동기적으로 읽을 수 있는 스냅샷이 있다면 `useSyncExternalStore`를 검토한다.

다음 예시는 브라우저에서만 실행되며 네트워크 연결 상태를 구독한다. 구독 함수는 컴포넌트 밖에 선언한다. 연결 상태가 바뀌면 `notify`를 호출하고, React는 `readOnline`으로 현재 값을 다시 읽는다. `navigator.onLine`이 `true`여도 특정 서버에 요청이 성공한다는 의미는 아니다.

```tsx
import { useSyncExternalStore } from "react";

function subscribeOnline(notify: () => void) {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
}

function readOnline() {
  return navigator.onLine;
}

function useOnlineStatus() {
  return useSyncExternalStore(subscribeOnline, readOnline);
}
```

객체 스냅샷은 변경이 없을 때 같은 참조를 반환해야 한다.

`getSnapshot`은 현재 값을 동기적으로 반환해야 하므로 IndexedDB의 비동기 조회 함수를 직접 전달할 수 없다. IndexedDB를 연결하려면 조회 결과를 캐시하고 그 값을 동기적으로 반환하는 구성이 필요한지 판단한다.

#### 선언적 인터페이스가 없는 외부 UI 동기화

외부 UI 라이브러리에 React 컴포넌트나 전용 Hook이 있다면 그 인터페이스로 값을 전달한다. 그러한 인터페이스가 없고 명령형 API만 제공할 때 Effect로 현재 Props나 State를 외부 위젯에 반영할 수 있다. 외부 위젯에 값을 반영하는 것과 React State를 Props에 맞춰 초기화하는 것은 구분한다.

다음은 이미 생성된 플레이어의 음소거 값을 동기화하는 예시다. `Player`는 이 연동에 필요한 메서드만 나타낸다. 플레이어를 제공하는 모듈이 생성과 해제를 담당한다. 아래 Effect는 음소거 설정만 변경하고 연결이나 구독을 생성하지 않으므로 Cleanup 함수를 작성하지 않는다.

```tsx
import { useEffect } from "react";

type Player = { setMuted: (muted: boolean) => void };

function usePlayerMuted(player: Player, muted: boolean) {
  useEffect(() => {
    player.setMuted(muted);
  }, [muted, player]);
}
```

#### 연결과 구독을 생성한 Effect에서 정리

화면이 표시되는 동안 WebSocket이나 SSE 연결, 브라우저 이벤트 구독 또는 외부 SDK를 유지해야 하고 이를 담당하는 React 연동 API가 없다면 Effect를 사용한다. 의존성이 바뀌면 기존 연결과 구독을 해제한 뒤 다시 설정하고, 컴포넌트가 제거될 때도 해제한다. 외부 이벤트로 받은 값을 State에 저장하는 것은 Props에서 계산할 수 있는 값을 복제하는 것과 다르다.

다음 예시는 SSE를 직접 연결해야 하는 경우다. 수신한 메시지는 당시의 URL과 함께 저장한다. 메시지를 수신한 URL이 현재 URL과 다르면 표시하지 않는다. `EventSource`는 연결이 끊기면 재연결을 시도하며 Cleanup에서 호출하는 `close()`는 연결과 재연결 시도를 종료한다.

```tsx
import { useEffect, useState } from "react";

type Received = { url: string; text: string };

function useServerEvents(url: string) {
  const [received, setReceived] = useState<Received>();

  useEffect(() => {
    const source = new EventSource(url);
    function receive(event: MessageEvent<string>) {
      setReceived({ url, text: event.data });
    }
    source.addEventListener("message", receive);
    return () => {
      source.removeEventListener("message", receive);
      source.close();
    };
  }, [url]);

  return received?.url === url ? received.text : "";
}
```

각 Effect의 Cleanup은 그 Effect가 생성한 연결과 등록한 리스너만 해제한다. 다른 화면과 공유하는 연결을 임의로 종료하지 않는다. 타이머는 해제하고 Observer는 관찰을 중단한다.

비동기 작업은 취소 기능이 있으면 취소한다. 취소할 수 없다면 대상이 바뀌거나 후속 작업이 시작됐을 때 이전 작업의 결과가 현재 화면에 반영되지 않도록 구분한다. Cleanup 실행 뒤 연결과 구독이 실제로 해제되는지 확인한다.

#### 동기화에 사용하는 값을 의존성에 포함

Effect가 참조하는 Props, State와 컴포넌트 본문에서 선언한 변수 및 함수는 의존성에 포함한다. 반복 실행을 막으려고 의존성을 누락하거나 ESLint 경고를 비활성화하지 않는다. 렌더링마다 생성하는 객체가 의존성에 포함돼 재연결을 유발한다면 객체를 Effect 안에서 생성할 수 있는지 확인한다.

동기화 대상과 재실행 조건이 다른 연결이나 작업은 별도의 Effect로 분리한다. 한 작업에 필요한 값이 바뀌었을 때 다른 연결까지 다시 생성하지 않도록 한다.

다음 예시는 옵션 객체를 Effect 안에서 생성한다. URL과 `withCredentials`가 같으면 다른 UI 값이 바뀌어도 재연결하지 않는다. 연결 여부에 조건이 필요한 경우에도 Hook은 컴포넌트나 사용자 정의 Hook의 최상위에서 호출하고 Effect 내부에서 조건을 판단한다.

```tsx
import { useEffect } from "react";

function useAuthenticatedEvents(url: string, withCredentials: boolean) {
  useEffect(() => {
    const source = new EventSource(url, { withCredentials });
    return () => source.close();
  }, [url, withCredentials]);
}
```

값이 바뀔 때 재연결해야 하는 코드와 재연결 없이 알림에서 현재 값을 읽어야 하는 코드를 구분한다. `useEffectEvent`는 후자의 용도로 검토할 수 있다. 연결 대상 URL을 `useEffectEvent` 안에서만 읽어 의존성 배열에서 제외하지 않는다. `useCallback`과 `useMemo`를 사용하더라도 Effect의 필요성과 의존성 누락 여부를 확인한다.

#### Strict Mode의 재실행을 차단하지 않는 연결

개발 환경에서 React 트리 최상위에 Strict Mode를 적용하면 설정 코드, Cleanup, 설정 코드를 차례로 실행해 정리 누락을 확인한다. 아래 예시는 ref에 실행 여부를 기록해 첫 Cleanup 뒤의 연결 생성을 차단한다. URL이 바뀌어도 다시 연결하지 못하므로 작성하지 않는다.

```tsx
import { useEffect, useRef } from "react";

function useSingleConnection(url: string) {
  const connected = useRef(false);

  useEffect(() => {
    if (connected.current) return;
    connected.current = true;
    const source = new EventSource(url);
    return () => source.close();
  }, [url]);
}
```

연결이 필요하다면 앞의 SSE 예시처럼 설정 코드에서 연결을 생성하고 Cleanup에서 그 연결을 종료한다. Strict Mode의 추가 실행을 차단하거나 Strict Mode를 비활성화하지 않는다. 연결과 해제를 반복했을 때 활성 연결과 리스너 개수가 계속 증가하지 않는지 확인한다.

최초 마운트에서 Effect를 추가 실행하는 조건은 Strict Mode의 적용 위치에 따라 다르다. 운영 빌드에서는 개발용 추가 검사가 실행되지 않는다.

#### ESLint 검사와 사용 목적 검토

`rules-of-hooks`, `exhaustive-deps`, `set-state-in-effect`를 사용하고 경고 원인을 해결한다. 다음 설정은 `eslint-plugin-react-hooks`를 사용하는 프로젝트의 기존 flat config에 반영할 규칙을 나타낸다. 프레임워크가 이미 제공하는 설정과 적용 파일을 확인하고 기존 설정 전체를 교체하지 않는다.

```js
import hooks from "eslint-plugin-react-hooks";

export default [
  {
    plugins: { "react-hooks": hooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/set-state-in-effect": "error",
    },
  },
];
```

`set-state-in-effect`는 Effect에서 State를 동기적으로 갱신해 추가 렌더링을 유발하는 일부 패턴을 검사한다. Effect 안의 모든 State 변경을 금지하는 규칙은 아니므로 외부 이벤트로 받은 값을 표시하는 경우와 React 내부의 파생 값을 다시 저장하는 경우를 구분한다.

ESLint는 외부 시스템과 동기화할 필요가 있는지, 연결이 실제로 종료되는지 또는 다른 화면의 공유 자원을 해제하는지 판단하지 못한다. Effect의 목적은 코드에서 확인하고 자원 해제는 재연결과 컴포넌트 제거 동작에서 확인한다.

### Hooks `useRef`

`<공란: 간략한 설명>`

#### useRef 사용

`<공란: 이유>`

`<공란: 코드 예시>`

### Hooks `useCallback` & `useMemo`

`useMemo`는 계산 결과를, `useCallback`은 함수 참조를 렌더링 사이에 재사용한다. React는 의존성 목록의 각 값을 이전 렌더링과 `Object.is`로 비교한다. 의존성이 매번 바뀌면 계산 결과나 함수 참조를 재사용할 수 없다. React가 캐시를 폐기할 수 있으므로 두 Hook은 성능 최적화에 사용한다. 캐시가 초기화되어도 같은 입력으로 같은 화면을 렌더링하고 이벤트를 처리할 수 있어야 한다.

같은 입력과 사용자 조작으로 메모이제이션 적용 전후를 비교한다. 계산을 줄이려는 경우 계산에 걸리는 시간을 확인한다. 하위 컴포넌트의 재렌더링을 줄이려는 경우 React DevTools의 Profiler에서 렌더링 여부와 소요 시간을 확인한다.

아래 예시는 React 19 기준이며 미실행 상태다.

#### 직접 계산하는 파생값과 일반 이벤트 핸들러

간단한 연산으로 얻을 수 있는 값은 렌더링 중에 직접 계산한다. 함수가 일반 DOM 요소의 이벤트 핸들러로만 사용된다면 렌더링마다 새 함수가 생성되어도 그 이유만으로 `useCallback`을 추가하지 않는다.

아래 예시에서 합계는 곱셈 한 번으로 계산한다. 버튼은 클릭한 시점의 수량을 `onConfirm`에 전달한다.

```tsx
type Props = {
  unitPrice: number;
  quantity: number;
  onConfirm: (quantity: number) => void;
};

function OrderSummary({ unitPrice, quantity, onConfirm }: Props) {
  const total = unitPrice * quantity;

  function handleConfirm() {
    onConfirm(quantity);
  }

  return (
    <div>
      <output>합계 {total}원</output>
      <button type="button" onClick={handleConfirm}>
        수량 확인
      </button>
    </div>
  );
}
```

#### 검색 결과와 상품 열기 함수의 재사용

상품 수가 많아 검색과 정렬에 드는 시간이 화면 응답에 영향을 주고, 상품 배열과 검색어가 그대로인 렌더링이 반복되면 `useMemo`를 검토한다. 아래 예시에서 `useMemo`는 계산을 생략할 수 있게 하며, `memo`로 감싼 목록에 같은 배열 참조를 전달한다.

목록에는 상품 ID만 받는 열기 함수를 전달한다. `useCallback`을 사용하면 `collectionId`와 `onOpenProduct`가 유지될 때 같은 함수 참조를 전달할 수 있다. `memo`는 목록이 받는 Props 중 하나라도 바뀌면 Props 비교만으로 렌더링을 건너뛸 수 없다. 상위 컴포넌트가 상품 배열이나 열기 함수를 매번 새로 생성한다면 어느 참조가 바뀌는지부터 확인한다.

```tsx
import { memo, useCallback, useMemo } from "react";

type Product = Readonly<{ id: string; name: string }>;

type ProductListProps = {
  products: readonly Product[];
  onOpen: (productId: string) => void;
};

const ProductList = memo(function ProductList({
  products,
  onOpen,
}: ProductListProps) {
  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>
          <button type="button" onClick={() => onOpen(product.id)}>
            {product.name}
          </button>
        </li>
      ))}
    </ul>
  );
});

type ProductSearchProps = {
  products: readonly Product[];
  query: string;
  collectionId: string;
  onOpenProduct: (collectionId: string, productId: string) => void;
};

function ProductSearch({
  products,
  query,
  collectionId,
  onOpenProduct,
}: ProductSearchProps) {
  const matchingProducts = useMemo(() => {
    const term = query.trim().toLowerCase();

    return products
      .filter((product) => product.name.toLowerCase().includes(term))
      .sort((first, second) => first.name.localeCompare(second.name, "ko"));
  }, [products, query]);

  const handleOpen = useCallback(
    (productId: string) => {
      onOpenProduct(collectionId, productId);
    },
    [collectionId, onOpenProduct],
  );

  return <ProductList products={matchingProducts} onOpen={handleOpen} />;
}
```

#### 외부 저장소 구독 함수의 참조 유지

`useSyncExternalStore`는 전달받은 `subscribe` 함수의 참조가 바뀌면 다시 구독한다. 구독 함수가 컴포넌트의 값에 의존하지 않으면 컴포넌트 밖에 정의한다. 구독 대상이 컴포넌트에 전달되는 값으로 정해지고 재구독 비용을 줄일 필요가 있을 때 `useCallback`을 검토한다.

아래 브라우저 전용 예시에서 저장소의 `subscribe`는 재고가 바뀌면 `notify`를 호출하고, 구독 해제 함수를 반환한다. 저장소와 상품 ID가 유지되는 동안에는 같은 구독 함수를 전달한다.

```ts
import { useCallback, useSyncExternalStore } from "react";

type StockStore = {
  subscribe: (productId: string, notify: () => void) => () => void;
  isInStock: (productId: string) => boolean;
};

function useProductStock(store: StockStore, productId: string) {
  const subscribe = useCallback(
    (notify: () => void) => {
      return store.subscribe(productId, notify);
    },
    [store, productId],
  );

  return useSyncExternalStore(subscribe, () => store.isInStock(productId));
}
```

### 상태 관리

`<공란: 간략한 설명>`

#### 외부 상태를 별도 상태로 복사하지 않는 구성

useState, useEffect 등을 사용해서 별도의 상태로 복사하는 코드를 작성하지 않는다.

- Tanstack Query의 쿼리, 뮤테이션 객체
- React Hook Form의 Form 객체
- Zustand와 같은 전역 상태 (여러 컴포넌트 간 공유하도록 구성된 로컬 상태도 포함)

`<공란: 이유>`

`<공란: 코드 예시>`

### 쿼리 데이터 관리

서버 데이터의 클라이언트 캐시와 재조회는 TanStack Query가 관리한다. 화면에 표시할 데이터는 표시를 담당하는 서비스 컴포넌트에서 구독한다. 사용자 이벤트에서만 필요한 값은 핸들러에서 읽고, 사전 조회에는 표시 컴포넌트가 구독하는 쿼리 키를 사용한다.

아래 예시는 TanStack Query 5.102.8을 기준으로 한다. 클라이언트 컴포넌트의 조회와 사전 조회는 같은 `QueryClientProvider`의 QueryClient를 사용한다.

#### 공통 쿼리 옵션으로 직접 구독하는 서비스 컴포넌트

같은 서버 데이터를 사용하는 컴포넌트는 공통 `queryOptions`로 각각 구독한다. 같은 QueryClient에서 쿼리 키가 같으면 하나의 캐시 항목을 사용하며, 재조회 시점은 각 구독의 설정과 캐시 상태에 따라 결정된다. 상위 컴포넌트가 조회 결과를 직접 사용하지 않으면 하위 컴포넌트에는 `exhibitionId`처럼 조회 대상을 식별하는 값만 전달한다.

응답을 구분하는 식별자와 필터는 쿼리 키에 포함한다. 아래 예시에서 `exhibition-options.ts`는 쿼리 키, `staleTime`과 브라우저의 조회 함수를 공통 옵션으로 정의한다. 조회 함수는 받은 취소 신호를 요청에 전달하고 조회에 실패하면 예외를 발생시킨다.

```ts
export type Exhibition = Readonly<{
  title: string;
  artworks: ReadonlyArray<Readonly<{ id: string; title: string }>>;
  guideEdition: string;
}>;
```

```ts
import { queryOptions } from "@tanstack/react-query";

import { getExhibition } from "./get-exhibition";

export function exhibitionOptions(exhibitionId: string) {
  return queryOptions({
    queryKey: ["exhibitions", "detail", exhibitionId] as const,
    staleTime: 30_000,
    queryFn: ({ signal }) => getExhibition(exhibitionId, signal),
  });
}
```

`ExhibitionPanel`은 배치만 담당한다. `ExhibitionHeading`과 `ArtworkCount`는 각각 화면에 필요한 데이터를 구독한다.

```tsx
import { ArtworkCount } from "./artwork-count";
import { ExhibitionHeading } from "./exhibition-heading";

export function ExhibitionPanel({ exhibitionId }: { exhibitionId: string }) {
  return (
    <section>
      <ExhibitionHeading exhibitionId={exhibitionId} />
      <ArtworkCount exhibitionId={exhibitionId} />
    </section>
  );
}
```

#### 표시할 값만 전달하는 UI Props

서비스 컴포넌트가 조회 상태와 표시할 데이터를 결정한다. UI 컴포넌트에는 자신이 표시하는 값만 전달한다. 조회나 뮤테이션 Hook의 반환 객체를 통째로 전달하면 UI가 접근할 수 있는 값과 동작이 늘어난다. 그 객체나 데이터를 다른 React 상태나 저장소에 복사하면 캐시가 바뀔 때 복사본도 따로 갱신해야 한다.

아래 예시에서 제목을 표시하는 UI는 `title`만 받는다. 서비스 컴포넌트가 최초 조회의 진행과 실패를 표시하고, 캐시에 데이터가 있으면 백그라운드 재조회 중에도 제목을 표시한다.

```tsx
import { useQuery } from "@tanstack/react-query";

import { exhibitionOptions } from "./exhibition-options";

function ExhibitionTitle({ title }: { title: string }) {
  return <h2>{title}</h2>;
}

export function ExhibitionHeading({ exhibitionId }: { exhibitionId: string }) {
  const { data, isError } = useQuery(exhibitionOptions(exhibitionId));

  if (data !== undefined) return <ExhibitionTitle title={data.title} />;
  if (isError) return <p role="alert">전시 정보를 불러오지 못했습니다.</p>;
  return <p role="status">전시 정보를 불러오는 중입니다.</p>;
}
```

#### select로 필요한 값만 구독하는 컴포넌트

전체 응답 중 일부 속성이나 파생값만 독립적으로 사용하는 컴포넌트는 `select`로 필요한 데이터를 선택한다. `select`는 해당 구독이 읽는 `data`를 바꾼다. 서버가 반환하는 응답의 크기와 캐시에 저장하는 원본은 그대로 유지된다. 선택 함수에 외부 입력이 필요 없으면 컴포넌트 밖에 정의한다.

`ArtworkCount`는 작품 수를 표시한다. 작품 제목이 바뀌어도 작품 수가 같으면 이 구독의 `data`는 바뀌지 않는다. 조회 전에는 수를 표시하지 않으며 작품이 없는 경우에는 `0`을 표시한다.

```tsx
import { useQuery } from "@tanstack/react-query";

import { exhibitionOptions } from "./exhibition-options";
import type { Exhibition } from "./types";

function selectArtworkCount(exhibition: Exhibition) {
  return exhibition.artworks.length;
}

export function ArtworkCount({ exhibitionId }: { exhibitionId: string }) {
  const { data: count } = useQuery({
    ...exhibitionOptions(exhibitionId),
    select: selectArtworkCount,
  });

  if (count === undefined) return null;
  return <p>작품 {count}점</p>;
}
```

#### 조회를 미리 시작하는 상위 컴포넌트

패널을 열기 전에 데이터를 가져올 수 있으면 상위 컴포넌트는 사전 조회만 시작한다. 실제 데이터를 표시하는 컴포넌트가 같은 쿼리 키를 구독하면 사용 가능한 캐시를 읽을 수 있다. 아래 예시는 포인터가 버튼에 들어오거나 키보드 포커스가 도달할 때 조회를 시작한다. 사전 조회가 실패해도 버튼을 누르면 패널을 열 수 있으며, 실제 조회의 실패는 패널에 표시한다.

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { exhibitionOptions } from "./exhibition-options";
import { ExhibitionPanel } from "./exhibition-panel";

export function ExhibitionDisclosure({
  exhibitionId,
}: {
  exhibitionId: string;
}) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  function prefetchExhibition() {
    void queryClient
      .query(exhibitionOptions(exhibitionId))
      .catch(() => undefined);
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={isOpen}
        onPointerEnter={prefetchExhibition}
        onFocus={prefetchExhibition}
        onClick={() => setIsOpen((open) => !open)}
      >
        전시 상세
      </button>
      {isOpen && <ExhibitionPanel exhibitionId={exhibitionId} />}
    </>
  );
}
```

#### 이벤트 시점의 캐시 조회와 서버 조회

클릭할 때만 필요한 데이터는 이벤트 핸들러에서 읽는다. 캐시에 저장된 값으로 충분하면 `getQueryData`로 한 번 읽고 일치하는 값이 없을 때의 동작을 정한다. `getQueryData`는 호출 시점의 캐시 값만 반환한다.

캐시가 없거나 허용한 최신성 기준을 벗어났을 때 조회해야 하면 해당 `staleTime`을 `queryClient.query`에 지정하고 결과를 기다린다. 기존 캐시가 있어도 조회 결과를 기다려야 하는 이벤트에는 `staleTime: 0`을 지정한다. 같은 키의 조회가 이미 진행 중이면 그 요청의 결과를 사용할 수 있다.

아래 예시는 캐시에 있는 전시 제목을 복사한다. 안내 페이지를 열 때는 현재 제공 중인 안내서 버전이 필요하므로 조회 결과를 받은 뒤 이동한다. 제목과 안내서 버전은 핸들러 안에서 사용하고, UI 상태에는 조회 실패나 복사 완료처럼 화면에 표시할 메시지만 저장한다.

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { exhibitionOptions } from "./exhibition-options";

export function ExhibitionActions({ exhibitionId }: { exhibitionId: string }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const options = exhibitionOptions(exhibitionId);

  async function copyCachedTitle() {
    const exhibition = queryClient.getQueryData(options.queryKey);
    if (exhibition === undefined) {
      setMessage("전시 상세를 먼저 열어 주세요.");
      return;
    }

    try {
      await navigator.clipboard.writeText(exhibition.title);
      setMessage("전시 제목을 복사했습니다.");
    } catch {
      setMessage("전시 제목을 복사하지 못했습니다.");
    }
  }

  async function openCurrentGuide() {
    setMessage("");

    try {
      const exhibition = await queryClient.query({ ...options, staleTime: 0 });
      const id = encodeURIComponent(exhibitionId);
      const edition = encodeURIComponent(exhibition.guideEdition);
      window.location.assign(`/exhibitions/${id}/guides/${edition}`);
    } catch {
      setMessage("전시 안내 페이지를 열지 못했습니다.");
    }
  }

  return (
    <>
      <button type="button" onClick={copyCachedTitle}>
        전시 제목 복사
      </button>
      <button type="button" onClick={openCurrentGuide}>
        최신 전시 안내 열기
      </button>
      <p role="status">{message}</p>
    </>
  );
}
```

### Form

입력값과 입력 상태는 각 폼의 `useForm`이 관리한다. 하위 필드는 React Hook Form의 공식 Context로 같은 폼에 접근하고, 화면에 필요한 값과 상태만 구독한다. 입력값을 별도 State나 저장소에 복제하지 않으며, 조회 데이터로 폼을 초기화하는 시점과 사용자가 편집하는 기간을 구분한다.

아래 코드는 React Hook Form 7.86.0을 기준으로 한 독립적인 예시이며 미실행 상태다. Context를 사용하는 필드는 해당 폼의 `FormProvider` 안에서 사용한다. TanStack Query 예시는 5 계열의 `QueryClientProvider`가 설정된 환경을 전제로 한다.

#### Form 객체의 Props 전달

Form 객체를 일반 하위 컴포넌트의 Props로 전달하지 않는다. 폼 생성과 기본값 설정은 상위 폼이 담당하고, 하위 필드는 `useFormContext`로 필요한 메서드에 접근한다. 같은 폼을 사용해야 하는 필드에서 별도의 `useForm`을 호출하면 입력 상태와 제출 대상이 분리된다.

공식 `FormProvider`에 폼 메서드를 제공하는 것은 일반 컴포넌트에 Form 객체를 전달하거나 별도 DI Context에 다시 보관하는 것과 구분한다. 다음 예시는 제공할 메서드를 명시한다. `control`, `register`, `field`와 폼 상태를 Zustand나 다른 Context에 다시 복제하지 않는다. Compound Component의 하위 필드도 같은 공식 Context를 사용하고, 입력 연결과 무관한 API 요청이나 서비스 모듈 호출은 담당하지 않는다.

```tsx
import { FormProvider, useForm, useFormContext } from "react-hook-form";

type Fields = { title: string };

function ProjectForm() {
  const form = useForm<Fields>({ defaultValues: { title: "" } });

  return (
    <FormProvider {...form}>
      <form>
        <TitleField />
      </form>
    </FormProvider>
  );
}

function TitleField() {
  const { register } = useFormContext<Fields>();
  const input = register("title");

  return (
    <label>
      제목
      <input
        name={input.name}
        onChange={input.onChange}
        onBlur={input.onBlur}
        ref={input.ref}
      />
    </label>
  );
}
```

#### register를 사용하는 입력

일반적인 입력 상태를 UI와 연결할 때는 `register`를 우선 사용한다. 외부 라이브러리의 입력도 `name`, `onChange`, `onBlur`, `ref`를 실제 입력 요소에 전달할 수 있다면 같은 방식으로 연결할 수 있다. 외부 라이브러리라는 이유만으로 `useController`를 선택하지 않는다.

등록한 입력값을 `useState`에 다시 저장하거나 입력할 때마다 `setValue`를 호출하지 않는다. 등록 결과의 이벤트 함수와 `ref`를 유지해야 입력 변경, 포커스 이동과 오류 발생 시 포커스 지정이 연결된다. 아래 예시는 공통 UI에 객체 전체를 전달하는 대신 필요한 속성을 명시한다.

```tsx
import { useFormContext } from "react-hook-form";

type Fields = { title: string };

function RequiredTitleField() {
  const { register } = useFormContext<Fields>();
  const input = register("title", { required: "제목을 입력하세요." });

  return (
    <label>
      제목
      <input
        name={input.name}
        onChange={input.onChange}
        onBlur={input.onBlur}
        ref={input.ref}
      />
    </label>
  );
}
```

#### useController를 사용하는 입력

`value`와 값 변경 콜백으로 동작하는 제어 컴포넌트나 필드 단위 제어가 필요한 입력에는 `useController`를 사용할 수 있다. 구독은 그 입력을 연결하는 컴포넌트에 둔다. 같은 필드에 `register`를 중복 적용하거나 입력값을 별도 State에 복제하지 않는다.

다음 `TextInput`은 문자열 값과 전용 변경 콜백을 받는 UI의 인터페이스를 나타낸다. 폼 연결은 `ControlledTitleField`가 담당한다. `field` 객체 전체를 하위 UI에 전달하지 않고 값, 이벤트와 입력 요소의 `ref`를 각각 연결한다. `onChange`만 연결하고 `onBlur`나 `ref`를 누락하지 않는다. 제어 입력의 기본값은 `undefined` 대신 빈 문자열처럼 입력에서 사용할 수 있는 값으로 지정한다.

```tsx
import type { Ref } from "react";
import { useController, useFormContext } from "react-hook-form";

type Fields = { title: string };
type TextInputProps = {
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  onBlur: () => void;
  inputRef: Ref<HTMLInputElement>;
};

function TextInput({
  name,
  value,
  onValueChange,
  onBlur,
  inputRef,
}: TextInputProps) {
  return (
    <input
      name={name}
      value={value}
      onChange={(event) => onValueChange(event.currentTarget.value)}
      onBlur={onBlur}
      ref={inputRef}
    />
  );
}

function ControlledTitleField() {
  const { control } = useFormContext<Fields>();
  const { field } = useController({ control, name: "title" });

  return (
    <label>
      제목
      <TextInput
        name={field.name}
        value={field.value}
        onValueChange={field.onChange}
        onBlur={field.onBlur}
        inputRef={field.ref}
      />
    </label>
  );
}
```

#### 필요한 필드만 구독하는 파생값

입력 변경을 실시간으로 표시해야 하는 컴포넌트에서만 `useWatch`를 사용한다. 폼 전체나 특정 객체 전체를 구독하지 않고 필요한 필드 이름을 지정한다. 구독한 값으로 계산할 수 있는 글자 수나 합계는 렌더링 중에 계산한다. 입력값과 계산 결과를 별도 State에 저장하거나 Effect로 동기화하지 않는다.

다음 예시는 글자 수를 표시하는 컴포넌트에서 제목만 구독한다. 구독 항목 수만으로 성능 저하를 단정하지 않고, 값이 변경되는 빈도와 다시 렌더링되는 컴포넌트의 계산 비용을 확인한다. Hook을 분리했다는 이유만으로 다른 원인에 의한 렌더링까지 차단되는 것은 아니다.

```tsx
import { useFormContext, useWatch } from "react-hook-form";

type Fields = { title: string; description: string };

function TitleLength() {
  const { control } = useFormContext<Fields>();
  const title = useWatch({ control, name: "title", exact: true });

  return <output>제목 {title.length}자</output>;
}
```

#### 이벤트에서 필요한 값을 읽는 getValues

입력값이 이벤트에서 실행할 명령에만 필요하다면 `getValues`로 필요한 필드를 조회한다. 버튼을 클릭할 때 제목을 전달하기 위해 제목의 변경을 계속 구독할 필요는 없다. 화면에 현재값을 표시해야 하는 경우에는 `getValues`를 구독의 대체 수단으로 사용하지 않는다.

`getValues` 자체가 렌더링을 발생시키지 않더라도 그 값을 State에 저장하면 State 갱신에 따른 렌더링이 발생한다. 렌더링 최적화만을 목적으로 입력값이나 파생 표시값을 별도 State에 복제하지 않는다. 다음 버튼은 조회한 값을 콜백에 전달하며 표시용 복사본을 저장하지 않는다.

```tsx
import { useFormContext } from "react-hook-form";

type Fields = { title: string };

function CopyTitleButton({ onCopy }: { onCopy: (title: string) => void }) {
  const { getValues } = useFormContext<Fields>();

  function copyTitle() {
    onCopy(getValues("title"));
  }

  return (
    <button type="button" onClick={copyTitle}>
      제목 복사
    </button>
  );
}
```

#### 사용하는 컴포넌트에서 구독하는 formState

오류, 수정 여부와 제출 상태는 이를 표시하거나 사용하는 컴포넌트에서 `useFormState`로 구독한다. 상위 폼에서 모든 상태를 읽은 뒤 하위 컴포넌트에 전달하지 않는다. 필드 오류만 필요하다면 필드 이름을 지정하고, 폼 전체의 제출 여부가 필요하다면 그 상태를 사용하는 버튼에서 구독한다.

`formState`는 속성 접근으로 구독을 설정하므로 필요한 속성은 조건식을 평가하기 전에 읽는다. `!formState.isDirty || !formState.isValid`처럼 바로 접근하면 단락 평가 때문에 `isValid`를 읽지 않는 경우가 생긴다. 모든 속성을 읽으라는 의미가 아니라 실제로 사용하는 속성을 먼저 구조 분해하라는 의미다.

```tsx
import { useFormContext, useFormState } from "react-hook-form";

type Fields = { title: string };

function TitleError() {
  const { control } = useFormContext<Fields>();
  const { errors } = useFormState({ control, name: "title", exact: true });
  const message = errors.title?.message;

  if (!message) return null;
  return <p role="alert">{message}</p>;
}

function SubmitButton() {
  const { control } = useFormContext<Fields>();
  const { isDirty, isValid, isSubmitting } = useFormState({ control });
  const unavailable = !isDirty || !isValid;
  const disabled = unavailable || isSubmitting;

  return (
    <button type="submit" disabled={disabled}>
      저장
    </button>
  );
}
```

#### 비동기 defaultValues를 사용하는 초기값

TanStack Query로 조회하는 데이터를 폼의 초기값으로 사용할 때는 비동기 `defaultValues` 함수를 사용한다. 조회와 캐시 정책은 Query가 담당하고, 초기화 이후의 편집값은 폼이 관리한다. 쿼리 객체나 데이터를 State에 복제하지 않으며, 캐시 변경을 편집값에 실시간으로 반영하지 않는다.

`ensureQueryData`는 캐시가 있으면 그 값을 반환하고 없으면 조회한다. 오래된 캐시가 있어도 항상 최신 응답을 기다리는 함수는 아니다. `revalidateIfStale`로 백그라운드 재조회를 실행해도 그 응답을 편집 중인 폼에 자동으로 적용하지 않는다. 편집 전에 최신 자료를 확인해야 한다면 초기 조회의 캐시 정책을 별도로 정한다.

프로젝트 조회 함수의 구현은 `ProjectProvider`가 선택한다. 조회 옵션과 폼은 HTTP 구현을 직접 가져오지 않고, `useGetProject`로 제공받은 기능을 사용한다. 기능 Provider에는 조회 함수만 제공하며 Form 객체, 쿼리 반환 객체와 입력 상태를 다시 보관하지 않는다. 아래 파일명은 예시 안의 모듈 구분을 나타낸다.

`types.ts`는 조회에 필요한 입력과 반환값을 정의한다. 요청 취소 신호도 조회 함수에 전달할 수 있도록 한다.

```ts
export type Project = Readonly<{ title: string }>;
export type GetProject = (
  projectId: string,
  signal: AbortSignal,
) => Promise<Project>;
```

브라우저에서 사용하는 `http.ts`는 URL 구성, HTTP 응답 검사와 데이터 검증을 담당한다. 실패는 오류로 전달하고, 취소 신호를 실제 요청에 연결한다. 구현체를 교체하더라도 이 동작과 반환 형식을 유지한다.

```ts
import { z } from "zod";

import type { GetProject } from "./types";

const projectSchema = z.object({ title: z.string() });

export const getProject: GetProject = async (projectId, signal) => {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}`,
    { signal },
  );
  if (!response.ok) throw new Error("프로젝트를 불러오지 못했습니다.");
  return projectSchema.parse(await response.json());
};
```

`context.tsx`는 조회 함수에 접근하는 Hook을 제공한다. 필요한 기능의 Provider가 없으면 오류를 발생시켜 설정 누락을 확인할 수 있게 한다. 이 Context는 폼의 입력값이나 조회 결과를 관리하지 않는다.

```tsx
import { createContext, useContext } from "react";

import type { GetProject } from "./types";

export const GetProjectContext = createContext<GetProject | null>(null);

export function useGetProject() {
  const getProject = useContext(GetProjectContext);
  if (!getProject) throw new Error("ProjectProvider가 필요합니다.");
  return getProject;
}
```

운영용 `provider.tsx`는 구현체를 Props로 받지 않고 HTTP 조회 함수를 직접 선택한다. `children`으로 전달받은 하위 컴포넌트는 같은 기능 인터페이스를 사용한다. QueryClient는 `QueryClientProvider`에서, 폼 메서드는 `FormProvider`에서 제공한다.

```tsx
import type { ReactNode } from "react";

import { GetProjectContext } from "./context";
import { getProject } from "./http";

export function ProjectProvider({ children }: { children: ReactNode }) {
  return <GetProjectContext value={getProject}>{children}</GetProjectContext>;
}
```

`use-project-query-options.ts`는 Provider에서 조회 함수를 얻어 쿼리 옵션을 구성한다. React 컴포넌트에서 사용하는 옵션이므로 조회 함수를 별도 매개변수로 받는 함수를 추가하지 않는다. Hook은 최상위에서 호출하고, 나중에 실행되는 `queryFn`은 이미 얻은 함수를 사용한다. 쿼리 함수나 비동기 `defaultValues` 안에서 Context Hook을 호출하지 않는다.

```ts
import { queryOptions } from "@tanstack/react-query";

import { useGetProject } from "./context";

export function useProjectQueryOptions(projectId: string) {
  const getProject = useGetProject();

  return queryOptions({
    queryKey: ["projects", projectId],
    queryFn: ({ signal }) => getProject(projectId, signal),
  });
}
```

`project-editor.tsx`는 조회 구현을 연결하는 Provider 아래에서 조회와 폼 초기화를 실행한다. 상위 컴포넌트는 최초 조회의 로딩과 실패를 표시하고, 데이터가 준비되면 하위 폼이 같은 QueryClient의 캐시로 초기화된다. 재조회가 실패해도 기존 데이터가 있으면 편집 중인 폼을 제거하지 않는다.

`defaultValues`는 폼 수명 동안 캐시되므로 다른 프로젝트를 편집할 때만 프로젝트 ID로 `key`를 변경한다. 같은 프로젝트의 데이터 갱신마다 `key`를 변경하거나 Effect에서 `reset`하지 않는다. 일반 하위 입력은 조회 기능을 호출하지 않고 폼의 입력 연결만 담당한다.

```tsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { ProjectProvider } from "./provider";
import type { Project } from "./types";
import { useProjectQueryOptions } from "./use-project-query-options";

type Fields = Pick<Project, "title">;

export function ProjectEditor({ projectId }: { projectId: string }) {
  return (
    <ProjectProvider>
      <ProjectEditorContent projectId={projectId} />
    </ProjectProvider>
  );
}

function ProjectEditorContent({ projectId }: { projectId: string }) {
  const options = useProjectQueryOptions(projectId);
  const { data, isPending } = useQuery(options);

  if (isPending) return <p>불러오는 중입니다.</p>;
  if (data === undefined)
    return <p role="alert">프로젝트를 불러오지 못했습니다.</p>;

  return <ProjectForm key={projectId} projectId={projectId} />;
}

function ProjectForm({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const options = useProjectQueryOptions(projectId);
  const {
    register,
    formState: { isLoading },
  } = useForm<Fields>({
    defaultValues: async () => {
      const project = await queryClient.ensureQueryData(options);
      return { title: project.title };
    },
  });
  const input = register("title");

  return (
    <form>
      <fieldset disabled={isLoading}>
        <legend>프로젝트 편집</legend>
        <label>
          제목
          <input
            name={input.name}
            onChange={input.onChange}
            onBlur={input.onBlur}
            ref={input.ref}
          />
        </label>
      </fieldset>
    </form>
  );
}
```

조회 구현을 교체해도 같은 QueryClient와 쿼리 키를 사용하면 기존 캐시를 사용할 수 있다. 계정이나 조직에 따라 조회 대상이 달라지는 경우에는 해당 식별자를 쿼리 키에 포함한다. Provider의 구현체 변경만으로 캐시와 폼 초기값이 다시 설정된다고 가정하지 않는다.

초기값을 읽는 비동기 함수가 실패했을 때 오류가 자동으로 Error Boundary에 전달된다고 가정하지 않는다. 초기 조회를 폼 내부에서 직접 수행하는 구성에서는 실패 표시와 재시도, 입력 허용 여부까지 정의해야 한다. 대상 변경 시 기존 편집을 보존해야 하는 화면에서는 `key`로 폼을 제거하기 전에 편집 유지 또는 취소 정책을 정한다.

#### 폼의 값과 상태를 재설정하는 reset

`reset`은 입력값 하나를 변경하는 용도로 사용하지 않는다. 편집 취소처럼 폼 전체를 기본값으로 되돌리거나, 저장한 값을 새로운 기본값으로 정하면서 폼 상태를 재설정할 때 사용한다. 인자 없이 호출하면 현재 기본값으로 복원한다. 새 값을 전달하면 `keepDefaultValues` 등으로 유지하도록 지정하지 않은 기본값도 바뀐다.

다음 버튼은 사용자가 편집 취소를 선택했을 때만 폼을 복원한다. 쿼리 데이터나 Props가 바뀔 때마다 자동으로 호출하지 않는다. 유지할 값과 상태가 있다면 해당 동작에 필요한 옵션을 명시한다. `keepDirty`는 수정 여부를 유지하는 옵션이며 수정한 입력값을 보존하는 `keepDirtyValues`와 다르다.

```tsx
import { useFormContext } from "react-hook-form";

type Fields = { title: string; description: string };

function DiscardChangesButton() {
  const { reset } = useFormContext<Fields>();

  return (
    <button type="button" onClick={() => reset()}>
      편집 취소
    </button>
  );
}
```

저장 응답으로 재설정할 때는 저장 요청 이후 추가한 입력을 덮어쓰지 않는지 먼저 확인한다. 현재 편집값이 요청 당시와 다르면 응답값으로 폼 전체를 초기화하지 않는다. 또한 `handleSubmit`은 제출 콜백이 끝난 뒤 제출 상태를 갱신하므로, 콜백 안의 `reset`으로 모든 제출 상태까지 초기화됐다고 가정하지 않는다. 제출 상태 초기화가 필요하다면 제출 완료 시점과 유지할 상태를 함께 정한다.

#### 특정 필드를 초기화하는 resetField

등록된 특정 필드의 값과 상태만 초기화하려면 `resetField`를 사용한다. 기본 호출은 그 필드의 기본값으로 복원하고 `dirtyFields`, `touchedFields`와 오류 상태를 초기화한다. 특정 필드만 초기화하려고 폼 전체의 `reset`을 호출하지 않는다.

아래 첫 번째 버튼은 제목만 되돌린다. 두 번째 버튼은 이미 저장한 제목을 사용자가 적용하는 경우로, 새 값과 함께 해당 필드의 기본값도 변경한다. 값만 변경하고 수정 여부를 유지해야 한다면 `resetField` 대신 외부 이벤트에 의한 값 변경인지 검토한다. `keepDirty`, `keepTouched`, `keepError`로 상태를 유지할 수 있으며, 호출 결과에 따라 폼 전체의 `isDirty`와 `isValid`도 다시 평가될 수 있다.

```tsx
import { useFormContext } from "react-hook-form";

type Fields = { title: string; description: string };

function TitleResetButtons({ savedTitle }: { savedTitle: string }) {
  const { resetField } = useFormContext<Fields>();

  return (
    <>
      <button type="button" onClick={() => resetField("title")}>
        제목 편집 취소
      </button>
      <button
        type="button"
        onClick={() => resetField("title", { defaultValue: savedTitle })}
      >
        저장한 제목 적용
      </button>
    </>
  );
}
```

#### 외부 이벤트에서 값을 변경하는 setValue와 setValues

필드 자신의 입력은 `register` 또는 `useController`가 제공하는 이벤트 함수로 연결한다. 다른 필드의 선택이나 자동 채우기 버튼처럼 외부 이벤트가 특정 필드를 변경해야 할 때만 `setValue` 또는 `setValues`를 사용한다. 값을 변경한 뒤 `dirtyFields`, `touchedFields`와 검증 결과를 어떻게 갱신할지 옵션으로 지정한다.

다음 버튼은 제목만 변경할 때 `setValue`, 여러 필드를 함께 변경할 때 `setValues`를 사용한다. 기본값을 새로 확정하는 동작과 다르므로 `reset`으로 대체하지 않는다. `setValues`에 중첩 객체를 전달하면 최상위 속성을 기준으로 병합하므로, 일부 속성만 전달해 다른 하위 값을 제거하지 않도록 주의한다. 중첩 필드 하나를 변경할 때는 구체적인 필드 이름을 사용하는 `setValue`를 검토한다.

```tsx
import { useFormContext } from "react-hook-form";

type Fields = { title: string; description: string };

function ApplyTemplateButtons({ title, description }: Fields) {
  const { setValue, setValues } = useFormContext<Fields>();

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setValue("title", title, { shouldDirty: true, shouldValidate: true })
        }
      >
        템플릿 제목 적용
      </button>
      <button
        type="button"
        onClick={() =>
          setValues(
            { title, description },
            { shouldDirty: true, shouldValidate: true },
          )
        }
      >
        템플릿 내용 적용
      </button>
    </>
  );
}
```

#### useFieldArray를 사용하는 입력 목록

사용자가 항목을 추가하거나 제거하는 목록 형태의 폼 입력에는 `useFieldArray`를 사용한다. 목록의 추가, 제거와 이동은 배열 API가 담당하고, 각 항목의 입력값은 그 항목의 `register` 또는 `useController`가 관리한다. 입력할 때마다 배열 전체를 다시 저장하거나 폼 밖의 State에 목록을 복제하지 않는다.

React의 `key`에는 `field.id`를 사용하고 입력 이름에는 현재 항목의 인덱스를 사용한다. 두 값은 용도가 다르다. `fields`는 목록 구조와 항목 식별에 사용하며, 항상 최신 입력값을 반환하는 구독 결과로 취급하지 않는다. 다음 예시는 `field` 객체를 행에 전달하지 않고 행이 자신의 입력을 등록한다. 입력값을 편집하지 않는 일반 데이터 표나 화면 목록에는 폼 배열을 도입하지 않는다.

```tsx
import { useFieldArray, useFormContext } from "react-hook-form";

type Fields = { members: { name: string }[] };

function MemberFields() {
  const { control } = useFormContext<Fields>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "members",
  });

  return (
    <>
      {fields.map((field, index) => (
        <div key={field.id}>
          <MemberNameField index={index} />
          <button type="button" onClick={() => remove(index)}>
            항목 삭제
          </button>
        </div>
      ))}
      <button type="button" onClick={() => append({ name: "" })}>
        항목 추가
      </button>
    </>
  );
}

function MemberNameField({ index }: { index: number }) {
  const { register } = useFormContext<Fields>();
  const input = register(`members.${index}.name` as const);

  return (
    <label>
      이름
      <input
        name={input.name}
        onChange={input.onChange}
        onBlur={input.onBlur}
        ref={input.ref}
      />
    </label>
  );
}
```

#### 기존 배열 항목의 식별성을 유지하는 값 변경

`update`는 특정 항목을 교체하면서 그 항목을 언마운트한 뒤 다시 마운트한다. 기존 입력 요소의 식별성, 포커스와 행 내부 UI 상태를 보존해야 한다면 일반적인 입력 변경에 `update`를 사용하지 않는다. 항목을 교체하는 것이 목적일 때만 그 영향을 확인한 뒤 사용하며, 전달하는 값은 항목 전체를 포함해야 한다.

사용자가 항목에 입력할 때는 앞 예시처럼 등록된 입력 이벤트를 사용한다. 외부 버튼이 기존 항목의 필드 하나를 변경해야 하고 재마운트를 피해야 한다면 구체적인 필드 이름으로 `setValue`를 사용할 수 있다. 이는 배열 입력에 `setValue`를 기본 수단으로 사용하라는 의미가 아니다. 배열 전체 교체는 `replace`를 사용하고, 기존 항목의 UI 상태가 유지된다고 가정하지 않는다.

```tsx
import { useFormContext } from "react-hook-form";

type Fields = { members: { name: string }[] };

function ApplyMyNameButton({ name }: { name: string }) {
  const { getValues, setValue } = useFormContext<Fields>();

  function applyMyName() {
    if (getValues("members").length === 0) return;
    setValue("members.0.name", name, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <button type="button" onClick={applyMyName}>
      첫 항목에 내 이름 적용
    </button>
  );
}
```

### 테스트

테스트는 요구사항에서 입력과 기대값을 정하고, 공개 인터페이스를 통해 동작을 실행한 뒤 관찰할 수 있는 결과를 확인한다. 화면은 사용자가 조작하는 요소로 검증하고, 서버 저장처럼 화면만으로 판단하기 어려운 결과는 기존 조회 인터페이스에서 확인한다. 아래 예시는 각 절에 명시한 서비스 화면, 모듈과 실행 환경을 전제로 한다. 화면을 사용하는 예시는 미실행 상태다.

#### 이름이 같은 입력을 실제 그룹으로 구분하는 알림 설정

같은 레이블을 가진 입력이 여러 그룹에 있으면 사용자에게 표시되는 그룹 이름으로 검색 범위를 정한다. 이 화면은 `fieldset`과 `legend`로 댓글 알림과 배포 알림을 구분하며, 두 그룹 모두 `이메일` 레이블을 사용하는 체크박스를 제공한다. 사용자가 구분하는 이름을 사용하면 그룹의 표시 순서나 DOM 구조가 바뀌어도 같은 입력을 선택할 수 있다. 서비스에 테스트 전용 식별자나 Props를 추가하지 않는다.

예시의 `notificationPreferences`는 테스트마다 독립된 설정과 인증 상태를 준비하고 종료 시 정리하는 Playwright fixture다. 두 채널이 켜진 상태에서 댓글 알림만 끈 뒤 두 체크박스의 상태를 확인한다.

```ts
import { expect } from "@playwright/test";

import { test } from "./fixtures";

test("댓글 이메일 알림을 끄면 배포 이메일 알림은 유지된다", async ({
  page,
  notificationPreferences,
}) => {
  const settings = await notificationPreferences.create({
    commentsByEmail: true,
    deploymentsByEmail: true,
  });
  await page.goto(settings.url);

  const comments = page.getByRole("group", { name: "댓글 알림", exact: true });
  const deployments = page.getByRole("group", {
    name: "배포 알림",
    exact: true,
  });
  const commentsByEmail = comments.getByRole("checkbox", {
    name: "이메일",
    exact: true,
  });
  const deploymentsByEmail = deployments.getByRole("checkbox", {
    name: "이메일",
    exact: true,
  });

  await expect(commentsByEmail).toBeChecked();
  await expect(deploymentsByEmail).toBeChecked();

  await commentsByEmail.uncheck();

  await expect(commentsByEmail).not.toBeChecked();
  await expect(deploymentsByEmail).toBeChecked();
});
```

#### 서버 조회로 확인하는 배송 주소 저장

새 주소로 입력란을 채운 뒤에는 사용자가 편집한 값과 서버에 저장된 값을 각각 확인할 수 있다. 입력값이나 성공 안내만 검사하면 저장 요청을 생략해도 테스트가 통과할 수 있다. 서버 저장이 요구사항인 이 예시는 실제 테스트 서버의 주문 조회 API에서 주소를 다시 읽는다. `expect.poll`에는 읽기 요청만 두고 저장 조작은 한 번 실행한다.

`orders` fixture는 서로 다른 주문과 인증된 브라우저 컨텍스트를 테스트마다 준비한다. 주문 조회 API는 화면과 같은 쿠키 인증을 사용하고 저장된 값을 반환한다. 기대 주소는 테스트가 선택한 입력값에서 얻는다.

```ts
import { expect } from "@playwright/test";

import { test } from "./fixtures";

test("배송 주소를 수정해 저장하면 주문 조회에서 수정한 주소를 반환한다", async ({
  page,
  orders,
}) => {
  const previousAddress = "서울시 종로구 사직로 161";
  const nextAddress = "서울시 중구 세종대로 110";
  const order = await orders.create({ shippingAddress: previousAddress });
  await page.goto(order.editUrl);

  const address = page.getByLabel("배송 주소", { exact: true });
  await expect(address).toHaveValue(previousAddress);

  await address.fill(nextAddress);
  await page.getByRole("button", { name: "배송 주소 저장" }).click();

  await expect
    .poll(async () => {
      const response = await page.request.get(
        `/api/orders/${encodeURIComponent(order.id)}`,
      );
      if (!response.ok()) return undefined;
      const orderData: unknown = await response.json();
      return orderData;
    })
    .toMatchObject({ shippingAddress: nextAddress });
});
```

서버 전송 자체가 요구사항이면 요청 대상과 전달값을 검증한다. 횟수는 결제 중복 방지처럼 그 수가 요구사항에 명시된 경우에 검증한다. 안내 문구의 내용은 사용자에게 전달할 정보가 요구사항으로 정해진 테스트에서 검증한다.

#### 서버 오류 뒤 편집값을 유지하는 프로필 폼

폼 입력과 제출, 오류 표시와 조회 갱신을 함께 확인하려면 실제 React, React Hook Form과 TanStack Query를 사용한다. 예시의 `ProfileEditor`는 사용자가 입력한 표시 이름을 `PATCH`로 보내고, 저장 성공 후 프로필 쿼리를 재조회한다. 저장 실패 시 입력값을 유지하고 사용자가 다시 저장할 수 있도록 한다. 오류 응답은 MSW로 제어하며, 두 번째 요청의 실제 본문이 조회 응답에 반영되도록 구성한다.

테스트마다 QueryClient와 프로필 데이터를 새로 만든다. 예시는 저장 실패 뒤 사용자가 다시 저장하는 동작을 검증하며, 실패한 저장을 자동으로 재시도하지 않는 환경을 전제로 한다. 자동 재시도 자체가 요구사항인 테스트에서는 서비스에 적용된 재시도 정책을 사용한다. 오류를 확인한 뒤 버튼을 다시 눌러 복구를 시작한다. `waitFor`는 검증문을 반복 실행할 수 있으므로 그 안에서 클릭이나 데이터 변경을 실행하지 않는다.

```tsx
import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";

import { ProfileEditor } from "./profile-editor";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("프로필 저장이 실패해도 이름을 유지하며 다시 저장하면 요약을 갱신한다", async () => {
  const profileId = "profile-1";
  const initialName = "가은";
  const nextName = "윤서";
  const endpoint = `/api/profiles/${profileId}`;
  let storedName = initialName;
  let rejectSave = true;

  server.use(
    http.get(endpoint, () =>
      HttpResponse.json({ id: profileId, displayName: storedName }),
    ),
    http.patch(endpoint, async ({ request }) => {
      if (rejectSave) {
        return HttpResponse.json({ code: "UNAVAILABLE" }, { status: 503 });
      }

      const body: unknown = await request.json();
      if (typeof body !== "object" || body === null) {
        return HttpResponse.json({ code: "INVALID_NAME" }, { status: 400 });
      }
      if (!("displayName" in body) || typeof body.displayName !== "string") {
        return HttpResponse.json({ code: "INVALID_NAME" }, { status: 400 });
      }

      storedName = body.displayName;
      return HttpResponse.json({ id: profileId, displayName: storedName });
    }),
  );

  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const user = userEvent.setup();
  const { unmount } = render(
    <QueryClientProvider client={queryClient}>
      <ProfileEditor profileId={profileId} />
    </QueryClientProvider>,
  );

  try {
    const input = await screen.findByRole("textbox", { name: "표시 이름" });
    const save = screen.getByRole("button", { name: "저장" });

    expect(input).toHaveValue(initialName);
    await user.clear(input);
    await user.type(input, nextName);
    await user.click(save);

    expect(await screen.findByRole("alert")).toBeVisible();
    expect(input).toHaveValue(nextName);
    expect(
      within(screen.getByRole("region", { name: "프로필 요약" })).getByText(
        initialName,
        { exact: true },
      ),
    ).toBeVisible();

    rejectSave = false;
    await user.click(save);

    await waitFor(() => {
      expect(storedName).toBe(nextName);
      expect(
        within(screen.getByRole("region", { name: "프로필 요약" })).getByText(
          nextName,
          { exact: true },
        ),
      ).toBeVisible();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  } finally {
    unmount();
    queryClient.clear();
  }
});
```

이 통합 테스트는 실패 뒤 입력 보존, HTTP 요청으로 전달된 이름과 응답에 따른 화면 갱신을 확인한다. 실제 서버의 저장 결과는 앞의 배송 주소 예시처럼 실제 조회 API를 사용하는 테스트에서 확인한다. 테스트가 추가한 응답 핸들러는 매번 초기화하고, 프로필 컴포넌트를 언마운트한 뒤 QueryClient의 캐시를 정리한다.

#### 종료 시각의 직전과 정각을 확인하는 발표 타이머

시간이 경과한 뒤의 상태가 요구사항이면 목표 시간을 테스트에서 직접 진행시킨다. 발표 타이머는 전달한 종료 시각 직전까지 진행 중으로 표시하고, 종료 시각에 도달하면 상태 문구를 바꾼다. 예시는 두 문구가 사용자에게 전달해야 할 상태 안내라는 요구사항을 전제로 한다. 가짜 시계는 타이머가 등록되기 전에 설정하고, 테스트가 끝나면 컴포넌트와 타이머를 정리한 뒤 실제 시계를 복원한다.

```tsx
import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { PresentationTimer } from "./presentation-timer";

test("발표 종료 직전까지 진행 중으로 표시하고 종료 시각에 상태를 갱신한다", async () => {
  vi.useFakeTimers();

  try {
    vi.setSystemTime(new Date("2030-04-15T10:00:00.000Z"));
    render(<PresentationTimer endsAt={new Date("2030-04-15T10:01:00.000Z")} />);

    expect(screen.getByRole("status")).toHaveTextContent(/^발표 진행 중$/);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(59_999);
    });
    expect(screen.getByRole("status")).toHaveTextContent(/^발표 진행 중$/);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole("status")).toHaveTextContent(/^발표 종료$/);
  } finally {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  }
});
```

#### 기준 금액에서 배송비가 바뀌는지 검증

주문 금액이 50,000원 이상이면 배송비가 0원이고 그보다 낮으면 3,000원이라는 요구사항을 가정한다. 기대값은 이 규칙에서 얻는다. 구현의 금액 상수나 비교식을 테스트에서 다시 호출하지 않는다. 기준보다 1원 낮은 금액, 기준과 같은 금액, 기준보다 1원 높은 금액을 비교하면 어느 조건에서 결과가 달라지는지 테스트 이름에서 확인할 수 있다. 예시의 `shipping-fee.ts`는 주문 금액을 원 단위 정수로 받아 배송비를 반환한다.

```ts
export function calculateShippingFee(orderTotal: number): number {
  return orderTotal >= 50_000 ? 0 : 3_000;
}
```

테스트는 공개 함수의 반환값을 요구사항에 명시된 배송비와 비교한다. 같은 형식의 입력과 기대값으로 세 사례를 개별 실행한다.

```ts
import { expect, test } from "vitest";

import { calculateShippingFee } from "./shipping-fee";

test.each([
  { orderTotal: 49_999, expectedFee: 3_000 },
  { orderTotal: 50_000, expectedFee: 0 },
  { orderTotal: 50_001, expectedFee: 0 },
])(
  "주문 금액이 $orderTotal원이면 배송비는 $expectedFee원이다",
  ({ orderTotal, expectedFee }) => {
    expect(calculateShippingFee(orderTotal)).toBe(expectedFee);
  },
);
```

#### 비교 연산자 변경을 배송비 테스트가 검출하는지 확인

코드 커버리지는 실행되지 않은 줄과 분기를 찾는 데 사용한다. 무료와 유료 분기를 모두 실행해도 기준 금액의 기대값이 빠져 있으면 아래 변경을 검출하지 못할 수 있다. 뮤테이션 테스트로 비교 연산자를 임시 변경하면 주문 금액 50,000원 사례에서 배송비 기대값 0원과 실제 값 3,000원이 달라져야 한다. 정상 구현의 통과와 변이 구현의 실패를 같은 테스트로 확인한다. 변이가 계산 결과를 바꾸는지 확인한 뒤 부족한 입력 사례를 보완한다.

```diff
- return orderTotal >= 50_000 ? 0 : 3_000;
+ return orderTotal > 50_000 ? 0 : 3_000;
```

### 네이밍

`<공란: 간략한 설명>`

#### 폴더명, 파일명과 타입명 구성

폴더명, 파일명, 타입명 등은 상위 디렉터리에서 파악할 수 있는 컨텍스트를 불필요하게 반복하지 않는다.

이름에 Adapter, Port, Entities, View, Controller와 같은 개념 용어를 그대로 사용하지 않는다.

`<공란: 이유>`

`<공란: 코드 예시>`
