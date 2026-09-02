# 개인 메모 입력의 React Hook Form 사용 지침

사용자가 `input`, `textarea`, `select`와 checkbox에서 직접 바꾸는 현재 값과 그 입력의 dirty, touched, validation 및 submit 상태는 React Hook Form이 맡는다. 자동 저장 요청, IndexedDB 자료, Clipboard 쓰기의 성공 여부와 오류, 포인터 제스처와 일괄 복사 작업처럼 폼 요소의 값이 아닌 상태는 기존 application 및 domain 모듈이 맡는다. 이 구분은 `apps/notes/`의 새 입력과 기존 입력 변경에 모두 적용하는 `current` 지침이다.

현재 패키지는 React Hook Form 7.86.0, React 19.2.8과 Next.js 16.3.3을 사용한다. React Hook Form을 가져오는 모듈은 Client Component 안에 두고 server 전용 모듈이나 server에서 함께 읽는 public API로 다시 내보내지 않는다. 7.86.0은 `react-server` export 조건에서 존재하지 않는 파일을 가리키는 [공식 이슈 #13681](https://github.com/react-hook-form/react-hook-form/issues/13681)이 확인된 버전이다. 현재 빌드가 통과하더라도 Client와 server module graph를 섞지 않으며, 버전을 바꿀 때에는 해결 여부와 Next.js 빌드를 다시 확인한다.

## 상태 책임

React Hook Form은 다음 입력을 맡는다.

- 넓은 화면과 메모 상세 화면의 메모 본문
- 템플릿 원문, 템플릿 이름, 플레이스홀더 이름과 템플릿 치환값
- 속성 패널의 X, Y, 너비와 높이
- 일괄 복사 보조 키 설정 checkbox
- 위 입력의 현재 값, 기본값, dirty, touched, 입력 오류와 제출 중 상태

다음 상태는 React Hook Form으로 옮기지 않는다.

- 메모 식별자, revision, 저장이 끝난 메모와 IndexedDB record
- 자동 저장 timer, 진행, 실패, 재시도, 직렬화한 비동기 명령과 마지막 저장 성공 여부
- 메모 선택, 오른쪽 패널 우선순위, pointer capture, drag 및 resize 미리보기
- 일괄 복사 단계, 항목 순서, 중복 항목, 원문 snapshot, 작업 ID와 저장 시각
- Clipboard 성공 및 실패, 텍스트 분석 작업과 Worker 상태

같은 편집값을 `useState`, Context 또는 domain draft에 매 입력마다 함께 쓰지 않는다. 폼 밖의 명령이 현재 값이 필요하면 이벤트가 실행되는 시점에 `getValues`로 읽는다. 저장 명령에는 읽은 값을 복사해 전달하고, 비동기 작업이 끝날 때 다시 `getValues`와 비교해 뒤이어 입력한 값을 덮지 않는다.

## 폼 수명

화면 전체를 하나의 폼으로 만들지 않고 사용자 과업별로 수명을 정한다.

- 넓은 화면에서는 메모 카드 하나가 본문 폼 하나를 가진다. 보드 전체에 `FormProvider`를 두지 않는다.
- 모바일 상세 화면은 현재 메모 하나의 폼을 가진다. 저장, 변경사항 버리기와 복구 초안 반영이 같은 폼의 `reset` 규칙을 사용한다.
- 템플릿 편집기는 원문, 제목과 현재 플레이스홀더 이름을 한 폼에서 관리한다. 플레이스홀더의 시작 및 끝 위치와 순서는 template domain draft에 남기되 이름을 중복 저장하지 않는다.
- 속성 패널 폼은 패널 표시가 바뀌어도 대상 메모의 작성 중 값을 조용히 잃지 않아야 한다. 다른 메모를 대상으로 삼을 때에만 명시한 교체 규칙을 적용한다.
- 설정 화면은 저장된 설정값을 기본값으로 쓰는 지역 폼을 가진다.

`FormProvider`는 같은 폼이 깊은 하위 입력까지 이어져 명시적 전달이 오히려 책임을 흐릴 때만 사용한다. 중첩하지 않고, application service나 다른 화면의 상태를 provider 값에 넣지 않는다. 현재 구성요소처럼 필요한 `register`, `control` 또는 오류만 한두 단계 전달할 수 있으면 명시적 props를 유지한다.

## 입력 연결

네이티브 입력과 `shared/ui`가 실제 네이티브 요소로 전달하는 입력은 `register`를 기본으로 연결한다. `Controller` 또는 `useController`는 값과 이벤트 이름을 바꾸어 연결해야 하는 합성 제어처럼 비제어 등록을 사용할 수 없는 경우에만 검토한다. 단순 입력을 같은 모양으로 감싸기 위해 일괄 적용하지 않는다.

```tsx
type NoteContentFields = {
  content: string
}

const { getValues, register } = useForm<NoteContentFields>({
  defaultValues: { content: note.content },
})

<Textarea {...register("content")} />
```

다음처럼 React Hook Form 값과 React state를 입력마다 동기화하지 않는다.

```tsx
const [content, setContent] = useState(note.content)
const { register, setValue } = useForm<NoteContentFields>()

function changeContent(value: string) {
  setContent(value)
  setValue("content", value)
}
```

`defaultValues`에는 모든 등록 입력의 정의된 값을 제공한다. 텍스트는 빈 문자열, checkbox는 boolean처럼 브라우저 입력과 schema가 공유하는 표현을 사용하고 `undefined`로 제어 여부가 바뀌게 하지 않는다. 비활성화한 입력값을 제출 자료에 유지해야 하면 `disabled` 대신 `readOnly` 또는 적절한 `fieldset` 동작을 선택한다.

## 읽기와 구독

자동 저장 timer, `blur`, `pagehide`, 보조 키 복사와 패널 바깥 click처럼 실행 시점의 값만 필요하면 `getValues`를 사용한다. `getValues`는 화면을 갱신하는 구독이 아니므로 렌더링에 필요한 값에는 사용하지 않는다.

입력에 따라 미리보기나 글자 수가 즉시 바뀌어야 하면 그 표시와 가장 가까운 구성요소에서 구체적인 이름으로 `useWatch`를 사용한다. 인자 없는 `watch()`로 폼 전체를 화면 root에서 구독하지 않는다. `useWatch` 구독이 만들어지기 전에 `setValue`한 값은 그 구독이 받지 못할 수 있으므로 초기값과 호출 순서를 확인한다. 현재 폼이 작다는 이유만으로 구독을 쪼개거나 합치지 않고 React Profiler에서 실제로 함께 다시 렌더링된 구성요소만 최적화한다.

## 외부 자료와 기본값 교체

`defaultValues`는 폼 수명 동안 cache된다. 메모 ID나 외부 revision이 바뀌었다는 이유로 새 객체를 넘겨 현재 입력이 자동으로 바뀔 것으로 기대하지 않는다. 자료를 폼에 반영할 때에는 다음 순서를 명시한다.

1. 같은 편집 대상에서 저장 성공이 도착하면 현재 폼 값이 저장 요청값과 같은지 확인한다.
2. 같으면 `reset` 또는 `resetField`로 저장값을 새 기본값으로 확정해 dirty 상태를 정리한다.
3. 다르면 저장 중에 생긴 최신 입력을 유지하고 다음 저장 대상으로 남긴다.
4. 다른 대상이나 외부 revision으로 교체할 때 dirty 값을 유지할지, 버릴지 또는 사용자에게 선택받을지를 그 화면의 요구사항으로 결정한다.

`values` 옵션은 외부 자료 변화마다 폼을 반응형으로 덮는 동작이 필요한 경우에만 사용한다. 메모 편집처럼 입력 보존이 우선인 화면에는 명시적 `reset` 시점을 둔다. `reset`은 `useForm` 구독이 준비된 뒤 실행하고, 일부 상태를 유지하는 옵션은 왜 유지하는지 사용자 동작으로 설명할 수 있을 때만 사용한다.

## 검증과 오류 수명

입력 오류와 저장 오류를 같은 상태로 합치지 않는다. 사용자가 고칠 값은 field 오류로, 여러 field에 공통인 제출 조건은 form root 오류로, IndexedDB 또는 Clipboard 실패는 기존 application 오류로 보존한다. `handleSubmit`의 비동기 callback에서 발생한 예외는 자동으로 삼켜지지 않으므로 저장 계층이 돌려준 성공 및 실패를 명시적으로 처리한다.

교차 field 오류를 `setError`로 만들었으면 한 field만 `clearErrors`하지 않는다. 현재 폼 값 전체로 교차 field 규칙을 다시 계산하고, 그 규칙이 만든 모든 수동 오류를 지운 뒤 현재도 잘못된 field에만 다시 설정한다. 수동 오류는 등록 규칙이 다시 통과해도 자동으로 사라진다고 가정하지 않는다. `clearErrors`는 현재 값이 규칙을 통과하는지 다시 계산하지 않으므로 검증과 오류 제거를 하나의 함수가 책임진다.

```tsx
function synchronizeLabelErrors(labels: Record<string, string>) {
  const issues = findLabelIssues(labels)
  clearErrors("labels")

  for (const issue of issues) {
    setError(`labels.${issue.key}`, { message: issue.message })
  }

  return issues
}
```

조건부 입력이 사라질 때 값을 버려야 하는지 먼저 정한 뒤 `shouldUnregister`를 선택한다. `useFieldArray`는 사용자가 직접 편집하는 동적 입력 행에만 사용하고, 렌더링 key는 배열 index가 아니라 `field.id`를 쓴다. 순서가 있는 일괄 복사 작업을 폼 입력 배열로 바꾸지 않는다.

오류가 있는 입력에는 label, `aria-invalid`와 오류 설명의 `aria-describedby` 연결을 유지한다. 자동 오류 포커스가 필요한 입력은 `register`가 제공한 ref가 실제 요소에 도달해야 한다. 포커스 순서는 등록 순서에 우연히 맡기지 않고 화면의 읽기 및 키보드 순서와 함께 검증한다.

## Zod와 추가 의존성

현재 패키지에는 `@hookform/resolvers`가 없다. 이 지침만으로 새 의존성을 추가하지 않는다. 즉시 확인할 입력 규칙은 `register`의 검증 함수나 폼 단위 검증으로 처리하고, IndexedDB record 및 application command처럼 신뢰할 수 없는 자료가 들어오는 지점에서는 기존 Zod schema를 유지한다.

resolver 도입이 실제 중복을 줄이는 변경으로 승인되면 그 package의 버전, 전이 의존성, React Hook Form 및 Zod 호환성을 먼저 조사한다. transform을 쓰는 schema라면 폼 값에는 `z.input`, 검증 뒤 use case에는 `z.output`을 사용해 입력 표현과 domain 자료를 섞지 않는다.

## 검증

React Hook Form API 이름만 찾는 ESLint 규칙으로 책임 구분을 완료했다고 판정하지 않는다. 현재 ESLint는 hook 호출 규칙, Client 및 server import 방향과 FSD public API를 검사할 수 있지만 폼 수명, `reset` 조건, 수동 오류 동기화와 `Controller`의 필요성은 판정하지 못한다.

변경한 화면마다 다음을 확인한다.

- 직접 입력값의 기준이 React Hook Form 한 곳인지 코드 검토
- 저장 중 추가 입력, `blur`, `pagehide`, 화면 이탈, 변경사항 버리기와 저장 실패에서 최신 입력 보존
- 외부 revision 또는 대상 교체 뒤 `reset`이 만든 값과 dirty 상태
- 오류를 고친 직후 현재 값과 오류 표시가 일치하고 첫 오류에 포커스가 도달하는지 실제 브라우저 확인
- 메모 자동 저장, 템플릿 저장, 속성 적용과 설정 저장 뒤 기존 IndexedDB 자료가 유지되는지 동작 검사
- 대표 메모 수와 원문 길이에서 입력 한 번에 함께 다시 렌더링되는 구성요소가 이전보다 늘지 않았는지 React Profiler로 측정

테스트는 `useForm`, `register` 또는 `getValues`가 호출됐는지 검사하지 않는다. 사용자가 입력한 값, 저장된 자료, 오류 수정, 포커스와 다시 방문했을 때 보이는 값을 검사한다. 폼 연결 자체에는 TDD를 적용하지 않으며, 기존 순수 domain 규칙의 TDD 분류를 바꾸지 않는다.

## 근거

- React Hook Form 문서 고정 revision `e739aea`: [useForm](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/useform.mdx), [register](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/useform/register.mdx), [getValues](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/useform/getvalues.mdx), [useWatch](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/usewatch.mdx), [reset](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/useform/reset.mdx), [setError](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/useform/seterror.mdx), [clearErrors](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/useform/clearerrors.mdx), [Controller](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/usecontroller/controller.mdx), [FormProvider](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/formprovider.mdx), [useFieldArray](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/usefieldarray.mdx)
- React Hook Form 7.86.0 source tag의 [package metadata](https://github.com/react-hook-form/react-hook-form/blob/33860b43d5c52f39b7280a012b5876e6ad3e905c/package.json)와 [공식 release](https://github.com/react-hook-form/react-hook-form/releases/tag/v7.86.0)
- 오픈소스 애플리케이션의 고정 source: [Dub의 네이티브 입력 및 field array](https://github.com/dubinc/dub/blob/4989f63d074720902289dfeb8d6379fc33467aa5/apps/web/ui/workspaces/invite-teammates-form.tsx), [Dub의 합성 선택 제어](https://github.com/dubinc/dub/blob/4989f63d074720902289dfeb8d6379fc33467aa5/apps/web/ui/submitted-leads/form-fields/select-field.tsx), [Formbricks의 저장 뒤 기본값 교체](https://github.com/formbricks/formbricks/blob/92a8bb6eade7a603443e17282e5ac72c6fb14f41/apps/web/modules/workspaces/settings/general/components/edit-workspace-name-form.tsx), [OpenStatus의 제출 오류 연결](https://github.com/openstatusHQ/openstatus/blob/55bd69843b879148439fc713abb47b5477401486/apps/status-page/src/components/forms/form-email.tsx), [Documenso의 외부 자료 및 합성 제어](https://github.com/documenso/documenso/blob/3ec877a68bc423373220f9ee2fda3d93ba368680/apps/remix/app/components/forms/profile.tsx)

오픈소스 애플리케이션은 API가 실제 작업에서 쓰이는 방식을 확인하는 보조 근거다. 조사한 프로젝트의 범용 wrapper, `any` type, 전체 `watch()`와 render prop 구조는 이 저장소의 구성요소 지침과 다르므로 가져오지 않는다.
