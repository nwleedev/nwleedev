# 초기 화면 hydration 오류 조사

## 결론

제공된 화면의 오류는 애플리케이션이 출력한 `<html lang="ko">`와 hydration 전 브라우저 DOM에 추가된 `data-swiftread-extension-automation-bridge-ready="1"` 속성이 달라서 발생한 것으로 보인다. 같은 브랜치의 서버 응답과 확장 기능이 개입하지 않는 브라우저에서는 해당 속성과 console 오류가 나타나지 않았다. 따라서 이 사례만으로 애플리케이션 루트에 `suppressHydrationWarning`을 추가하면 안 된다.

애플리케이션은 지원 브라우저의 깨끗한 profile에서 자신이 만든 server HTML과 첫 client render가 일치해야 한다. 오류가 확장 기능이 있는 환경에서만 재현되면 원인을 외부 DOM 변경으로 분류하고, 애플리케이션이 만든 불일치는 별도의 결함으로 계속 다룬다.

## 조사 질문과 범위

- 제공된 화면에 표시된 속성 차이가 애플리케이션 코드에서 생성되는가
- 같은 화면을 브라우저 확장 기능이 개입하지 않는 조건에서 열어도 hydration 경고가 발생하는가
- Next.js와 React가 hydration 불일치 및 경고 억제를 어떻게 다루는가

이번 조사는 원인 분류와 검증 조건을 정한다. 브라우저 확장 기능의 내부 구현을 분석하거나 모든 외부 DOM 변경을 애플리케이션이 흡수하는 방안은 범위에 포함하지 않는다.

## 확인한 사실

### 제공된 화면

오류 화면은 server 쪽 `<html>`에는 없던 `data-swiftread-extension-automation-bridge-ready="1"` 속성이 client DOM에 있다고 표시한다. 오류 위치는 `app/layout.tsx`의 `<html lang="ko">`지만, 차이로 표시된 속성은 해당 요소의 애플리케이션 코드가 작성한 값이 아니다.

### 같은 브랜치의 분리 검증

2026년 9월 1일에 같은 브랜치의 개발 서버 응답과 확장 기능이 개입하지 않는 브라우저를 비교했다.

- HTTP 응답의 루트 요소에는 `lang="ko"`만 있고 문제 화면의 추가 속성은 없었다.
- client hydration이 끝난 DOM의 루트 요소에도 `lang="ko"`만 있었다.
- 이 조건에서는 hydration 관련 console 오류와 경고가 없었다.

이 결과는 제공된 화면의 추가 속성이 서버 출력과 저장소 코드에서 만들어진 것이 아님을 보여준다. 속성 이름과 Next.js가 문서화한 원인을 함께 보면 브라우저 확장 기능이 hydration 전에 DOM을 바꿨을 가능성이 높다. 다만 화면 한 장과 분리 실행 결과만으로 어느 확장 기능의 어느 코드가 속성을 넣었는지 확정할 수는 없다.

### 공식 문서

[Next.js hydration 오류 안내](https://nextjs.org/docs/messages/react-hydration-error)는 브라우저 확장 기능이 HTML을 수정하는 경우를 hydration 불일치의 원인으로 명시한다. 같은 문서는 `suppressHydrationWarning`을 제한적으로 사용하는 escape hatch로 설명하며 과도한 사용을 경고한다.

[React `hydrateRoot` 문서](https://react.dev/reference/react-dom/client/hydrateRoot)는 server 출력과 client 출력이 같아야 하고 불일치는 결함으로 취급해야 한다고 설명한다. 성능상 모든 차이를 검증하거나 수정한다고 보장하지도 않는다. [React 공통 컴포넌트 문서](https://react.dev/reference/react-dom/components/common#suppressing-unavoidable-hydration-mismatch-errors)는 timestamp처럼 피할 수 없는 한 단계 차이에만 `suppressHydrationWarning`을 쓰며 깊게 적용되지 않는다고 설명한다.

## 요구사항과 구현 계획에 미치는 영향

- 지원 브라우저의 확장 기능이 개입하지 않는 profile에서 초기 화면을 열었을 때 애플리케이션이 만든 hydration 오류가 없어야 한다.
- 제공된 속성 차이처럼 외부 DOM 변경이 의심되면 서버 응답, hydration 뒤 DOM과 console을 분리해 비교한다.
- 원인을 확인하지 않은 채 `<html>` 또는 `<body>`에 `suppressHydrationWarning`을 추가하지 않는다.
- 애플리케이션이 생성한 날짜, 난수, locale 결과, 저장소 복원값이나 server/client 분기에서 차이가 발견되면 해당 자료 흐름을 수정하고 외부 변경으로 분류하지 않는다.

## 조사 한계

- 개발 서버의 깨끗한 브라우저 실행을 확인했으며, 설치 가능한 모든 확장 기능 조합을 검증하지 않았다.
- 제공된 화면에 표시된 속성의 이름은 원인 추론을 강하게 뒷받침하지만 확장 기능의 소스 코드를 직접 확인한 증거는 아니다.
- 외부 확장 기능이 DOM을 바꾼 환경에서 Next.js 개발용 오류 화면을 완전히 막는 것을 애플리케이션 완료 조건으로 삼지 않는다.

## 출처와 검토 시점

- [Next.js: Text content does not match server-rendered HTML](https://nextjs.org/docs/messages/react-hydration-error), 2026년 9월 1일 검토
- [React: `hydrateRoot`](https://react.dev/reference/react-dom/client/hydrateRoot), 2026년 9월 1일 검토
- [React: Common components, suppressing unavoidable hydration mismatch errors](https://react.dev/reference/react-dom/components/common#suppressing-unavoidable-hydration-mismatch-errors), 2026년 9월 1일 검토
