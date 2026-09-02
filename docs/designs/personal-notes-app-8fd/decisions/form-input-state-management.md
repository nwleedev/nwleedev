# 직접 입력 상태 관리

사용자가 네이티브 폼 요소에서 직접 바꾸는 값과 입력 상태는 React Hook Form이 맡는다. 사용자 동작에서 생겼더라도 폼 값이 아닌 자동 저장 실행, 자료 복구, 제스처, Clipboard 및 일괄 복사 작업 상태는 기존 application 및 domain 모듈이 맡는다.

## 결정 배경

기존 계획은 React Hook Form을 템플릿의 제출 단위에만 사용했다. 2026년 9월 3일 상태 및 폼 검토에서 넓은 화면과 모바일 상세의 메모 본문, 템플릿 원문, 속성 패널 수치와 설정 checkbox가 React state 또는 Context에 남아 있음이 확인됐다. 이후 요구사항 작성자가 React Hook Form이 모든 직접 입력 상태를 관리하도록 결정했다.

[입력 상태 조사](../references/react-hook-form-input-state-research.md)는 공식 문서, 공식 source와 오픈소스 애플리케이션을 교차검증했다. 조사 근거에 따라 직접 편집값까지 React Hook Form의 책임을 넓히되 모든 사용자 동작을 폼 상태로 바꾸지는 않는 구분을 채택했다.

## 선택한 구조

- 넓은 화면의 메모 본문은 메모마다 독립된 폼을 사용한다.
- 모바일 메모 상세, 템플릿 편집기, 속성 패널과 설정 화면은 과업별 지역 폼을 사용한다.
- 같은 편집값을 React Hook Form과 `useState`, Context 또는 domain draft에 매 입력마다 함께 저장하지 않는다.
- 이벤트 당시 값은 `getValues`로 읽고, 즉시 바뀌어야 하는 가까운 표시는 필요한 field만 `useWatch`로 구독한다.
- 네이티브 입력은 `register`를 사용한다. 합성 제어가 실제로 필요할 때만 `Controller` 또는 `useController`를 다시 검토한다.
- 저장 성공, 다른 대상 선택과 IndexedDB 복구 자료 반영에는 화면별 `reset` 조건을 둔다. 저장 중 생긴 최신 입력을 오래된 응답으로 덮지 않는다.
- 템플릿 원문에서 placeholder로 지정한 시작 및 끝 위치와 순서는 domain draft에 남기고, 사용자가 편집하는 원문과 placeholder 이름은 폼에서만 관리한다.
- 일괄 복사 작업, 포인터 제스처와 비동기 저장 상태는 React Hook Form으로 옮기지 않는다.

## 제외한 방안

보드 전체의 `FormProvider`는 메모별 저장 단위를 하나의 렌더링 및 폼 수명으로 묶으므로 제외했다. 모든 사용자 동작을 `useFieldArray`와 field 값으로 표현하는 방안은 IndexedDB 작업 자료와 폼 값의 중복 기준을 만들므로 제외했다. 기존 React state와 React Hook Form을 함께 갱신하는 단계적 전환도 최신 값 판정을 어렵게 하므로 각 입력 묶음을 한 번에 책임 이전한다.

## 적용과 재검토

구현자는 [React Hook Form 사용 지침](../../../dev/personal-notes-app/react-hook-form.md)을 따른다. 폼 연결에는 TDD를 적용하지 않고 기존 사용자 동작과 자료 규칙을 브라우저 검사 및 기존 테스트로 비교한다. 직접 입력이 아닌 새로운 상태를 폼으로 옮기거나, 네이티브 입력에 `Controller`를 도입하거나, React Hook Form 버전을 바꾸려면 책임과 의존성 근거를 다시 검토한다.
