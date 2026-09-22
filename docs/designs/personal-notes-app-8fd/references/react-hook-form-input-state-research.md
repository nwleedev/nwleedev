# React Hook Form 입력 상태 조사

사용자가 직접 편집하는 폼 요소의 현재 값과 입력 상태는 React Hook Form이 맡고, 저장 및 복구 작업과 제스처 상태는 application 및 domain 상태에 남기는 구분이 현재 애플리케이션에 가장 적합하다. React Hook Form을 일부 제출 화면에만 쓰던 기존 계획은 직접 입력 전체를 같은 원칙으로 관리하려는 승인된 요구사항과 맞지 않아 갱신해야 한다.

## 조사 대상과 기준

2026년 9월 3일 기준 설치된 React Hook Form은 7.86.0이다. 공식 문서는 2026년 8월 30일 revision `e739aea`, 공식 source는 7.86.0 tag가 가리키는 commit `33860b4`로 고정해 확인했다. 오픈소스 애플리케이션은 조사 당시 기본 브랜치의 고정 commit에서 실제 통합 방식을 확인했으며, 코드의 인기도나 작성 형태를 규범으로 간주하지 않았다.

검토한 현재 입력은 넓은 화면과 모바일 상세의 메모 본문, 템플릿 원문 및 이름, 플레이스홀더 이름과 치환값, 메모의 X, Y, 너비 및 높이, 일괄 복사 보조 키 설정이다. 모바일 일괄 복사 항목은 편집 가능한 폼 요소가 아니라 중복과 순서, 원문 snapshot, 작업 단계 및 IndexedDB 복구를 가진 application 작업이므로 별도로 검토했다.

## 공식 자료에서 확인한 사실

- [useForm](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/useform.mdx)은 `defaultValues`가 cache되며 `undefined`를 기본값으로 쓰지 않도록 안내한다. 외부 자료를 반영할 때에는 `reset` 또는 의도적으로 반응하는 `values`의 차이를 선택해야 한다.
- [getValues](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/useform/getvalues.mdx)는 구독이나 다시 렌더링 없이 현재 값을 읽는다. 자동 저장, Clipboard와 이탈 처리처럼 이벤트 당시 값이 필요한 경우에 맞고 반응형 표시에 맞지 않는다.
- [useWatch](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/usewatch.mdx)는 hook을 호출한 구성요소 수준으로 다시 렌더링을 격리한다. 구독보다 앞선 값 변경을 놓칠 수 있고 반환값은 effect dependency가 아니라 렌더링에 맞춰져 있다.
- [Controller](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/usecontroller/controller.mdx)는 네이티브 비제어 입력이 아니라 React Select, Ant Design과 MUI 같은 외부 제어형 입력을 연결하는 wrapper다. 단순히 외부에서 값을 바꾼다는 이유만으로 필요하지 않다.
- [FormProvider](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/formprovider.mdx)는 깊은 하위 트리에 한 폼의 method를 전달하며 중첩 provider를 피하도록 한다. 애플리케이션 전역 상태나 service를 찾는 수단이 아니다.
- [setError](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/useform/seterror.mdx)와 [clearErrors](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/useform/clearerrors.mdx)에 따르면 수동 오류는 field 등록 규칙과 다른 수명을 가질 수 있고, 오류를 지우는 동작은 검증을 다시 실행하지 않는다. 교차 field 오류는 현재 값 전체로 다시 계산해야 한다.
- [useFieldArray](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/usefieldarray.mdx)는 등록된 동적 입력 행을 관리하고 `field.id`를 React key로 사용하도록 한다. 사용자 조작으로 생긴 모든 순서 배열을 폼으로 옮기라는 API가 아니다.
- 7.86.0의 [공식 package metadata](https://github.com/react-hook-form/react-hook-form/blob/33860b43d5c52f39b7280a012b5876e6ad3e905c/package.json)는 React 19를 peer dependency 조건에 포함한다. 다만 [공식 이슈 #13681](https://github.com/react-hook-form/react-hook-form/issues/13681)은 같은 버전의 `react-server` export가 존재하지 않는 파일을 가리키는 Next.js 빌드 문제를 기록한다.

## 오픈소스 애플리케이션 교차검증

[Dub의 초대 폼](https://github.com/dubinc/dub/blob/4989f63d074720902289dfeb8d6379fc33467aa5/apps/web/ui/workspaces/invite-teammates-form.tsx)은 네이티브 입력을 `register`하고 동적 입력 행에는 `useFieldArray`와 `field.id`를 사용한다. 같은 commit의 [합성 선택 제어](https://github.com/dubinc/dub/blob/4989f63d074720902289dfeb8d6379fc33467aa5/apps/web/ui/submitted-leads/form-fields/select-field.tsx)는 값 객체와 원시값을 바꿔 연결해야 하는 Combobox에 `Controller`를 사용한다. 이 차이는 현재 `shared/ui`의 네이티브 입력에는 `register`를 우선하고 합성 제어에만 adapter를 검토해야 한다는 판단을 뒷받침한다.

[Formbricks의 workspace 이름 폼](https://github.com/formbricks/formbricks/blob/92a8bb6eade7a603443e17282e5ac72c6fb14f41/apps/web/modules/workspaces/settings/general/components/edit-workspace-name-form.tsx)은 저장 성공 뒤 `resetField`의 새 `defaultValue`로 저장값을 dirty 비교의 기준으로 확정한다. 이 사례는 자동 저장이 끝났다는 사실만으로 최신 입력을 덮는 근거가 아니라, 저장 요청값과 현재 입력이 같을 때 기준값을 갱신해야 한다는 비교 대상으로 사용한다.

[OpenStatus의 email 폼](https://github.com/openstatusHQ/openstatus/blob/55bd69843b879148439fc713abb47b5477401486/apps/status-page/src/components/forms/form-email.tsx)은 제출이 실패한 이유를 오류가 생긴 field에 `setError`로 연결한다. 저장 및 Clipboard 오류까지 field 오류로 바꿀 필요는 없지만, 사용자가 고칠 입력 오류를 일반 저장 실패로 잃지 않아야 한다는 근거가 된다.

[Documenso의 profile 폼](https://github.com/documenso/documenso/blob/3ec877a68bc423373220f9ee2fda3d93ba368680/apps/remix/app/components/forms/profile.tsx)은 외부 자료에 `values`를 사용하고 SignaturePad 같은 합성 제어에 `Controller`를 사용한다. 외부 자료가 바뀌면 즉시 폼을 덮는 `values`는 편집 중 원문을 보존해야 하는 메모와 속성 입력에 그대로 적용하지 않는다.

오픈소스 코드에 있는 모든 입력용 `Controller` wrapper, JSX render prop, `Control<any>`, 넓은 `watch()`와 별도 transition 상태는 이 저장소의 타입, JSX 및 상태 책임 지침과 맞지 않으므로 채택하지 않는다.

## 대안 평가

사용자가 일으킨 모든 상태를 React Hook Form에 넣는 방안은 제외한다. 모바일 일괄 복사는 같은 메모를 여러 번 추가하고 클릭 순서와 원문 snapshot을 보존하며 transaction 성공 뒤에만 작업을 게시한다. 이를 `useFieldArray`로 옮기면 React Hook Form과 IndexedDB 중 어느 쪽이 최신인지 정하는 동기화 책임만 늘어난다.

보드 전체를 한 폼으로 만드는 방안도 제외한다. 메모마다 독립적인 자동 저장 및 revision이 있고, 한 메모의 입력 구독이 다른 메모와 보드 전체의 렌더링 수명에 연결될 이유가 없다. 메모별 지역 폼은 현재 저장 단위와 일치한다.

입력값을 기존 React state와 React Hook Form에 함께 저장하는 과도기 구조는 허용하지 않는다. 자동 저장에 필요한 최신 값은 `getValues`로 읽을 수 있으며, 중복 상태는 저장 응답과 뒤이은 입력이 경합할 때 어느 값이 기준인지 흐린다.

## 적용 결론

- React Hook Form은 사용자가 직접 편집하는 네이티브 폼 요소의 현재 값과 입력 상태를 맡는다.
- 화면이나 메모 단위의 지역 폼을 사용하고 보드 또는 애플리케이션 전역 `FormProvider`를 만들지 않는다.
- 단순 입력은 `register`, 이벤트 당시 읽기는 `getValues`, 가까운 반응형 표시는 구체적인 field의 `useWatch`를 사용한다.
- 외부 저장값을 반영할 때에는 `reset` 시점과 dirty 값 보존 조건을 화면별로 정한다.
- template placeholder 이름처럼 교차 field 오류가 있는 값은 한 폼을 기준으로 전부 다시 계산한다.
- 자동 저장, IndexedDB, Clipboard, 제스처, 일괄 복사와 분석 상태는 기존 application 및 domain 책임을 유지한다.
- 이번 책임 이동은 폼 연결 구조 자체를 검사하는 TDD 대상이 아니다. 기존 순수 상태 전이 테스트를 보존하고 사용자 입력, 저장, 오류 수정과 다시 방문했을 때 보이는 값을 브라우저에서 비교한다.

세부 구현 규칙과 검사 방법은 [React Hook Form 사용 지침](../../../dev/personal-notes-app/react-hook-form.md)이 관리한다.
