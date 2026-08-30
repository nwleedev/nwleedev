# 개인 메모 애플리케이션 기술 안티패턴

현재 로컬 애플리케이션은 브라우저 구현을 한 조립 지점에서 연결하고, 사용자 입력과 저장소 사이의 모든 경계를 런타임에 검증해야 한다. 페이지 전체를 Client Component로 만드는 방식, React 내부 상태를 `useEffect`로 맞추는 방식, 범용 Service Locator, 역할이 드러나지 않는 port와 adapter 이름, 서버 및 브라우저 코드를 함께 내보내는 FSD public API, 수명과 버전이 없는 worker 메시지와 IndexedDB를 영구 보관소로 간주하는 방식은 채택하지 않는다. 테스트의 선후 관계와 완료 증거는 [개인 메모 애플리케이션 테스트 전략](testing-strategy.md)을 따른다. 두 cache를 같은 데이터의 원본으로 쓰는 방식과 PostgreSQL 제약을 생략하는 방식은 최우선 계정 및 동기화 백로그를 시작할 때 적용할 금지 사항이다. 라이브러리 제공 백로그를 시작할 때에는 React를 중복으로 포함하거나 클라이언트 및 서버 진입점을 하나로 합치는 방식도 피해야 한다.

이 문서의 상태는 `proposed`다. 구현자와 리뷰어가 개인 메모 애플리케이션의 기술 구조를 선택할 때 사용하는 제안 지침이며, 승인된 기술 스택이나 현재 구현을 설명하지 않는다. 다만 [애플리케이션 패키지 위치와 FSD 구조 결정](../../designs/personal-notes-app-8fd/decisions/application-package-and-fsd.md)이 확정한 `apps/notes/` 배치, FSD 계층 규칙과 ESLint 검사 방식은 현재 적용할 결정이다.

## 적용 범위와 현재 근거

[요구사항](../../designs/personal-notes-app-8fd/requirements.md)은 현재 별도의 백엔드와 데이터베이스 없이 동작하는 로컬 애플리케이션을 완성하고, 계정 및 동기화를 모든 백로그 가운데 가장 먼저 진행하도록 정한다. 로컬 모드는 정적 HTML과 같은 뜻이 아니며 현재 과업에 필요하면 Next.js Server Actions와 Route Handlers를 사용할 수 있다. 라이브러리 패키지와 포트폴리오 라우트 연결은 그보다 뒤의 백로그다.

[로컬 실행 구조와 계정 및 라이브러리 백로그 조사](../../designs/personal-notes-app-8fd/references/runtime-modes-and-architecture.md)는 현재 독립 실행 단계에 적용할 책임별 interface와 조립 지점을 제안하고, 서버 저장소 교체와 패키지 진입점 분리는 각각의 백로그 조사로 남긴다. [데이터 구조 초안](../../designs/personal-notes-app-8fd/references/data-model-draft.md)은 메모의 전체 revision과 content revision, 사용 횟수, 줄 단위 분석과 알고리즘 version을 구분한다.

[애플리케이션 패키지 위치와 FSD 구조 결정](../../designs/personal-notes-app-8fd/decisions/application-package-and-fsd.md)은 독립 실행 패키지를 `apps/notes/`에 두고, Next.js 라우트는 패키지 루트의 `app/`, FSD 코드는 `src/` 아래의 `_app`, `_pages`와 필요한 하위 계층에 두도록 정한다. 모든 계층을 미리 만들거나 라이브러리 패키지를 함께 구현하는 방식은 승인하지 않았다.

기준선 커밋에는 패키지 매니페스트, 잠금 파일, TypeScript 설정, Next.js 설정, 애플리케이션 소스와 테스트가 없다. 따라서 아래 규칙은 도달 가능한 실패를 미리 제한하는 제안이며 U1에서 정확한 버전과 잠금 파일을 추가한 뒤 실제 준수 여부를 검사한다.

조사는 당시 최신 안정 릴리스인 Next.js 16.3.3, React 19.2.8, TypeScript 7.0.2, React Hook Form 7.87.0, Zod 4.5.4와 TanStack Query 5.102.8을 기준으로 했다. PostgreSQL은 현재 문서인 18을 확인했다. FSD는 설치 패키지가 아니라 구조화 방법이므로 2026년 8월 29일 문서 revision `a6b69ae`를 고정해 확인했다. 이 버전과 revision은 채택 권고가 아니라 조사 범위다. 특히 Next.js 캐시와 렌더링 모델, TanStack Query의 hydration 동작은 버전 사이에서 달라질 수 있으므로 설치 버전이 다르면 이 문서의 해당 절을 다시 검증해야 한다.

이 문서에서 Advanced Server Side Rendering은 별도 제품이나 API 이름이 아니라 App Router의 Server Components, streaming, Suspense, Cache Components와 hydration을 함께 사용하는 렌더링 구성을 뜻한다. Web API는 Clipboard, Worker, SharedWorker, IndexedDB, Storage와 HTTP 조건부 요청처럼 이 애플리케이션이 직접 사용하는 브라우저 및 HTTP API로 한정한다.

## 구현을 시작하기 전에 확정할 사항

다음 항목이 확정되지 않으면 관련 모듈 구현을 시작하지 않는다.

- Next.js와 React의 정확한 버전 및 현재 독립 실행 배포로 선택한 App Router 정적 내보내기의 호환성
- 작업 단위에서 실제로 만들 FSD layer와 slice 및 확정된 ESLint 규칙
- 현재 독립 실행 배포의 정적 결과물을 제공할 HTTPS 호스팅과 localhost HTTP 서버의 구현 및 실행 방식
- 이후 작업에서 Server Actions나 Route Handlers가 필요해질 때 정적 내보내기를 중단하고 Node.js 배포로 바꾸는 결정 절차
- Clipboard, IndexedDB, Dedicated Worker와 필요한 Intl API를 제공하는 지원 브라우저 및 최소 버전
- IndexedDB schema version, 업그레이드 중 다른 탭을 닫도록 안내하는 UI, 내보내기와 복구 정책
- React Hook Form과 Zod를 연결하는 방식을 직접 작성할지 검토된 resolver를 추가할지 여부

최우선 계정 및 동기화 백로그를 시작하기 전에는 다음 항목을 별도로 확정해야 한다. 이 항목은 현재 로컬 애플리케이션 구현의 선행 조건이 아니다.

- `cacheComponents` 설정 여부
- TanStack Query를 채택할지 여부, 적용할 원격 데이터, 정확한 버전, query key와 Next.js cache 사이의 책임
- 로컬과 계정 실행 형태의 빌드 결과물을 나눌지 여부
- 로그인, 계정과 메모 단위의 권한 검사 방식
- 메모 충돌 정책, HTTP ETag와 메모 revision을 연결하는 방식
- PostgreSQL의 정확한 버전, 연결 방식, migration 도구와 transaction 재시도 책임

라이브러리 패키지와 포트폴리오 연결 백로그를 시작하기 전에는 다음 항목을 별도로 확정해야 한다. 이 항목은 현재 독립 실행 구현의 선행 조건이 아니다.

- 패키지 관리자와 workspace 사용 여부, 독립 실행 호스트 및 포트폴리오 호스트가 공유할 패키지 위치
- 라이브러리를 호스트가 변환하는 소스 패키지로 제공할지 ESM 및 타입 선언을 포함한 산출물로 제공할지, 선택한 빌드 도구와 공개 subpath
- 포트폴리오 호스트가 연결할 단일 라우트 또는 하위 라우트 구조, 모듈이 받을 라우트 접두어와 탐색 interface
- React, React DOM 및 Next.js의 peer dependency 범위, CSS와 Worker asset 제공 방식

TanStack Query, `@hookform/resolvers`, IndexedDB wrapper, DI container, PostgreSQL client, ORM과 추가 React hooks lint 설정은 이 조사에서 채택하지 않았다. FSD 검사는 `@boundaries/eslint-plugin` 7.2.0과 `eslint-import-resolver-typescript` 4.4.5를 ESLint flat config에 연결하는 방식으로 확정했다. 그 밖의 의존성이나 설정을 추가하려면 목적, 정확한 버전, peer dependency, 전이 의존성, 라이선스, 유지보수 상태와 플랫폼 API 또는 내부 구현을 별도로 비교해야 한다.

## 서버와 브라우저 실행 책임을 한 컴포넌트에 섞지 않는다

### 막으려는 실패

페이지나 layout 최상단에 `'use client'`를 선언하면 그 모듈 그래프가 클라이언트 번들에 포함된다. 서버 전용 저장소 접근과 서버에서 미리 만든 정적 화면의 이점을 잃고, 브라우저 API를 초기 렌더링에서 읽으면 서버 HTML과 첫 클라이언트 렌더링이 달라져 hydration 오류가 발생한다. React는 이 불일치를 버그로 다루며, 일부 오류에서는 event handler가 잘못된 element에 연결될 수 있다고 설명한다.

Cal.com은 root layout에서 `visibility`의 기본값이 서버와 클라이언트 사이에서 달라 발생한 hydration 오류를 수정했다. 변경 이유와 화면 증거는 [PR #20312](https://github.com/calcom/cal.diy/pull/20312), 병합 결과는 [0eb4e6c](https://github.com/calcom/cal.diy/commit/0eb4e6c7d439ef55e6da89d26be452325670ef8f)에서 확인했다.

### 적용 규칙

- `page.tsx`와 `layout.tsx`는 브라우저 상호작용이 직접 필요하지 않으면 Server Component로 유지한다.
- `'use client'`는 메모 보드, clipboard 알림, drag interaction과 폼처럼 실제 브라우저 상태가 필요한 가장 가까운 진입 파일에 둔다.
- `window`, `document`, `navigator`, IndexedDB와 Worker 생성은 렌더링 중에 실행하지 않는다. event handler, effect 또는 브라우저 어댑터에서 실행한다.
- Server Component에서 Client Component로 함수, repository, 데이터베이스 row 또는 class instance를 넘기지 않는다. 필요한 최소 DTO와 primitive만 직렬화한다.
- `suppressHydrationWarning`은 시간 표시처럼 차이를 피할 수 없는 한 element에만 예외적으로 사용한다. 브라우저 API 접근이나 데이터 불일치를 숨기는 용도로 사용하지 않는다.
- `cacheComponents`를 켠 계정 동기화 모드에서는 request 시점의 사용자 정보나 cache하지 않은 조회를 가장 가까운 `<Suspense>` 안으로 옮긴다. 정적 탐색 영역과 보드 바탕 화면까지 느린 조회 하나에 묶지 않는다.
- 서로 의존하지 않는 서버 조회를 연속 `await`로 시작하지 않는다. 먼저 Promise를 만들고 함께 기다리거나 각 조회 component를 별도 `<Suspense>`로 나눈다.
- fallback은 실제 panel과 비슷한 공간을 차지하게 만들어 streaming 완료 때 메모 보드가 이동하지 않게 한다.

안티패턴:

```tsx
'use client'

export default function NotesPage() {
  const width = window.innerWidth
  const mode = process.env.APP_MODE

  return <NoteBoard width={width} mode={mode} />
}
```

권장 패턴:

```tsx
export default function NotesPage() {
  return <NoteBoard initialViewport={{ x: 0, y: 0, zoom: 1 }} />
}
```

```tsx
'use client'

export function NoteBoard({ initialViewport }: NoteBoardProps) {
  const viewport = useSyncExternalStore(
    subscribeBrowserViewport,
    readBrowserViewport,
    () => initialViewport,
  )

  return <NoteCanvas viewport={viewport} />
}
```

권장 패턴은 `useSyncExternalStore`의 server snapshot으로 서버와 첫 클라이언트 렌더링에 같은 직렬화 가능한 값을 사용하고, 브라우저 viewport 구독 결과는 hydration 이후에 반영한다. `readBrowserViewport`는 viewport가 바뀌지 않았다면 이전의 immutable snapshot을 반환해야 한다. 메모 보드 전체가 상호작용 중심이라 Client Component여야 할 수 있지만, 주변 navigation과 정적 설명까지 같은 client 경계로 끌어올릴 이유는 없다.

### 검증

리뷰어는 `'use client'` 파일마다 브라우저 상호작용이 필요한 가장 가까운 경계인지 확인한다. TypeScript와 lint는 서버 HTML과 브라우저 HTML이 같은지 판단하지 못한다. 개발 환경의 hydration 경고, 느린 네트워크에서의 첫 화면, 프로덕션 build의 client bundle 구성과 실제 브라우저 렌더링을 검사한다. cache하지 않은 조회 하나가 전체 경로를 막는지도 Next.js 개발 overlay와 streaming 응답으로 확인한다. 현재 선택한 정적 배포에는 필요하지 않은 서버 기능과 계정 UI가 포함되지 않는지 확인한다. 최우선 계정 및 동기화 백로그에서는 계정 빌드를 추가해 공통 화면과 실행 환경 분리를 별도로 확인한다.

## React 내부 상태 흐름을 useEffect로 조정하지 않는다

### 막으려는 실패

props나 state에서 계산할 수 있는 값을 effect에서 다시 state로 저장하면 이전 값으로 한 번 렌더링한 뒤 다시 렌더링한다. 클릭 때문에 실행해야 하는 복사나 저장을 effect로 옮기면 component가 다시 mount될 때 같은 작업이 반복될 수 있다. 외부 구독에 cleanup이 없거나 dependency를 임의로 빼면 listener 누수와 오래된 값의 사용으로 이어진다.

React 19.2 문서는 effect를 외부 시스템과 React를 동기화하는 탈출구로 정의하고, 렌더링용 계산과 사용자 event 처리는 effect가 필요하지 않다고 설명한다. Sentry는 `AutofixProgressBar`의 `useState`와 `useEffect`로 만든 파생 상태를 `useMemo`로 바꾸어 불필요한 effect와 lint 위반을 제거했다. 변경 이유는 [PR #115146](https://github.com/getsentry/sentry/pull/115146), 병합 결과는 [38a5ba3](https://github.com/getsentry/sentry/commit/38a5ba35c43bffdf3ebdecff65a224645ae3153a)에서 확인했다.

### 적용 규칙

- 메모의 줄 목록, 전체 사용 횟수, 선택된 메모와 template preview처럼 현재 props와 state에서 얻을 수 있는 값은 렌더링 중 계산한다. 계산 비용을 측정한 뒤에만 `useMemo`를 사용한다.
- 일반 클릭 복사, 누적 복사, 제거, undo, redo와 분석 요청은 해당 event handler가 command를 직접 호출한다. 이 작업을 state 변화 감지 effect로 우회하지 않는다.
- 최우선 계정 및 동기화 백로그에서 원격 데이터는 Server Component, Route Handler와 승인된 query 도구가 맡는다. loading, 취소, race와 cache 정책을 직접 다시 구현하는 `useEffect` fetch를 기본값으로 삼지 않는다.
- effect는 Worker 또는 SharedWorker 연결, browser event, `ResizeObserver`와 외부 store 구독처럼 React 밖의 시스템과 component 수명을 맞출 때 사용한다.
- setup이 listener, timer, observer 또는 connection을 만들면 cleanup이 같은 대상을 해제한다. 개발 환경의 setup, cleanup, setup 순서에서도 사용자가 구분할 수 있는 중복 결과가 없어야 한다.
- dependency 경고를 주석으로 끄거나 빈 배열로 고정하지 않는다. effect가 정말 필요한지 다시 확인한 뒤 모든 reactive dependency를 포함하거나, event handler와 안정된 adapter API로 책임을 옮긴다.
- 화면이 보였다는 이유만으로 비멱등 mutation을 실행하지 않는다. 초기 진입 작업이 필요하면 route 처리 단계와 서버의 idempotency 규칙을 먼저 설계한다.

안티패턴:

```tsx
function NoteLines({ text }: { text: string }) {
  const [lines, setLines] = useState<string[]>([])

  useEffect(() => {
    setLines(splitAnalysisLines(text))
  }, [text])

  return <LineList lines={lines} />
}
```

권장 패턴:

```tsx
function NoteLines({ text }: { text: string }) {
  const lines = splitAnalysisLines(text)
  return <LineList lines={lines} />
}
```

외부 시스템의 수명을 component에 맞추는 effect는 필요하다.

```tsx
function useAnalysisEvents(worker: Worker, accept: (value: unknown) => void) {
  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => accept(event.data)
    worker.addEventListener('message', receive)

    return () => worker.removeEventListener('message', receive)
  }, [accept, worker])
}
```

### 검증

설치할 React hooks lint 버전을 확정한 뒤 `exhaustive-deps`와 `set-state-in-effect`의 판별력을 저장소의 무시된 임시 입력에서 한 번 확인한다. 전자는 stale closure를 만드는 누락 dependency를 찾고, 후자는 effect 안의 동기적 state 변경을 찾을 수 있다. 두 규칙 모두 effect가 업무상 맞는 위치인지, 외부 작업이 멱등인지 또는 cleanup이 실제 자원을 모두 해제하는지는 결정하지 못한다. 리뷰어는 effect마다 동기화 대상, setup, cleanup과 재실행 조건을 확인하고 Strict Mode, 빠른 mount 및 unmount와 browser listener 수로 결과를 검사한다.

## Web API 실패를 정상 상태로 다룬다

### 막으려는 실패

clipboard와 storage 같은 Web API는 존재 여부, secure context, 사용자 활성화, 권한과 용량에 따라 실패할 수 있다. API가 있다는 이유로 작업 성공을 먼저 표시하면 실제 clipboard에는 값이 없는데 사용 횟수만 증가하거나, 저장에 실패했는데 메모가 보존되었다고 오인하게 된다.

Clipboard API 초안은 비동기 clipboard 접근을 permission으로 제어되는 powerful feature로 정의한다. Secure Contexts는 `isSecureContext`로 환경을 확인할 수 있다고 정한다. Actual Budget도 브라우저가 로컬 데이터를 삭제할 가능성을 줄이기 위해 persistence 요청을 추가했지만, 완전한 보존을 보장한다고 설명하지 않았다. 근거는 [PR #8667](https://github.com/actualbudget/actual/pull/8667)과 [4dedf88](https://github.com/actualbudget/actual/commit/4dedf88e58a5c92478ac1d8eb909d216b242a59f)이다.

### 적용 규칙

- clipboard 성공 알림과 사용 횟수 증가는 `writeText`가 완료된 뒤 기록한다.
- 권한 거절, 비보안 환경, API 미지원과 알 수 없는 실패를 구분 가능한 결과로 adapter에서 반환한다.
- 컴포넌트가 `navigator.clipboard`나 permission API를 직접 호출하지 않게 하고, `ClipboardPort` 구현이 브라우저 차이를 처리한다.
- 현재 로컬 애플리케이션에는 계정 동기화 동작을 navigation과 command에 만들지 않는다. 최우선 계정 및 동기화 백로그에서 사용할 수 있는 동작을 조립 지점의 capability로 계산한다.
- 실행 형태를 나누는 환경변수는 최우선 계정 및 동기화 백로그의 composition root에서 한 번 검증한다. component는 환경변수 원문이 아니라 검증된 capability와 port를 받는다.
- `NEXT_PUBLIC_` 값은 build 시점에 브라우저 bundle에 포함되고 build 뒤에는 바뀌지 않는다. 최우선 계정 및 동기화 백로그에서 비밀값, runtime authorization 또는 배포 후 바뀌어야 하는 동기화 허용 여부에 사용하지 않는다.
- 현재 선택한 정적 내보내기 결과물은 HTTPS URL 또는 `location.hostname`이 정확히 `localhost`인 HTTP URL에서만 제공한다. 이후 Next.js 서버 배포로 바뀌어도 같은 URL 조건을 적용한다. `file://` URL, loopback IP를 포함한 다른 호스트의 HTTP URL과 원격 HTTP URL은 지원 대상으로 간주하지 않는다.
- 접속 프로토콜과 호스트 이름을 환경변수로 판정하지 않는다. 실행 시점의 `location.protocol`, `location.hostname`과 `isSecureContext`를 검사하고, 지원하지 않는 주소로 접속했을 때 필요한 주소 형식을 알리는 UI를 제공한다.
- Web API의 rejection을 빈 catch로 삼키지 않는다. 사용자에게 다음 행동이 있는 알림을 제공하고, 실패한 작업의 상태 변경은 되돌린다.

안티패턴:

```ts
function copyNote(note: Note) {
  navigator.clipboard.writeText(note.text)
  usage.increment(note.id, 'direct')
  toast.success('복사했습니다')
}
```

권장 패턴:

```ts
async function copyNote(note: Note, ports: CopyNotePorts): Promise<CopyResult> {
  const clipboard = await ports.clipboard.writeText(note.text)

  if (!clipboard.ok) {
    return { copied: false, clipboard }
  }

  const usage = await ports.usage.record({ noteId: note.id, kind: 'direct' })
  return { copied: true, usage }
}
```

clipboard 쓰기와 사용 횟수 저장은 하나의 원자적 transaction으로 묶을 수 없다. 쓰기는 성공했지만 횟수 저장이 실패한 경우 `copied: true`를 유지하고 통계 기록 실패를 알리거나 재시도 queue에 넣어야 한다.

### 검증

lint는 권한 요청의 결과와 UI 문구가 일치하는지 판단하지 못한다. 같은 독립 실행용 결과물을 HTTPS와 호스트 이름이 `localhost`인 HTTP에서 각각 제공해 클립보드 쓰기를 확인한다. `file://`와 다른 호스트의 HTTP에서는 지원하지 않는 주소 안내를 확인한다. 각 지원 주소에서 허용, 거절, API 미지원과 write rejection을 재현하고, 실패한 경우 사용 횟수가 늘지 않는지 확인한다. 지원 브라우저가 확정되기 전에는 capability별 expected behavior를 `needs human input`으로 둔다.

## 최우선 계정 및 동기화 백로그: Cache Components와 변경 직후 일관성을 구분한다

### 막으려는 실패

사용자별 메모 목록을 계정 식별자 없이 cache하거나, 변경 뒤 `revalidateTag(..., 'max')`만 호출하면서 즉시 갱신될 것으로 기대하면 다른 사용자의 메모가 섞이거나 방금 만든 메모가 이전 목록에 가려질 수 있다. Next.js 16의 Cache Components 문서는 `revalidateTag`를 stale-while-revalidate로, `updateTag`를 Server Action 안에서 즉시 만료시키는 read-your-own-writes 용도로 구분한다.

Cal.com은 Next.js 16.2.x에서 `revalidateTag`의 동작이 바뀐 뒤 팀 생성, 삭제와 초대 직후 이전 목록이 보이는 문제를 겪었다. [PR #28892](https://github.com/calcom/cal.diy/pull/28892)는 14개 mutation 흐름의 공통 무효화를 `updateTag`로 바꿨고, 병합 결과는 [f4edb69](https://github.com/calcom/cal.diy/commit/f4edb696c0329153cedcdb71521b89dbe97d80e3)이다.

### 적용 규칙

- 로컬 모드에서 사용자가 바꾸는 메모는 Next.js server cache 대상이 아니다. IndexedDB와 현재 클라이언트 상태가 원본이다.
- 계정 동기화 모드에서 cache할 때 계정 식별자와 권한 범위를 cache key 및 tag에 포함한다.
- 사용자가 변경 직후 자신의 메모를 봐야 하면 Server Action에서 `updateTag`를 사용한다.
- 약간 오래된 값을 먼저 보여도 되는 읽기 중심 자료에는 `revalidateTag(tag, 'max')`를 사용할 수 있다.
- `revalidatePath`는 tag를 정할 수 없고 해당 경로의 모든 cached data를 무효화해야 할 때만 사용한다.
- cache key, tag 생성과 변경 뒤 무효화 책임은 같은 feature 모듈이 맡는다. 문자열을 여러 처리 함수에서 직접 조립하지 않는다.
- cache는 데이터베이스 제약, authorization, 메모 revision 또는 sync conflict 검사를 대신하지 않는다.

안티패턴:

```ts
export async function listNotes() {
  'use cache'
  cacheLife('hours')
  return database.notes.findMany()
}

export async function createNoteAction(input: CreateNoteInput) {
  'use server'
  await database.notes.create(input)
  revalidateTag('notes', 'max')
}
```

권장 패턴:

```ts
function notesTag(accountId: string) {
  return `notes:${accountId}`
}

async function listNotesForAccount(accountId: string) {
  'use cache'
  cacheTag(notesTag(accountId))
  return noteQueries.listForAccount(accountId)
}

export async function createNoteAction(raw: unknown) {
  'use server'

  const actor = await requireActor()
  const parsed = createNoteSchema.safeParse(raw)

  if (!parsed.success) {
    return invalidInput(parsed.error)
  }

  const note = await createNote({ actor, input: parsed.data })

  updateTag(notesTag(actor.accountId))
  return toNoteDto(note)
}
```

권장 패턴은 계정을 cache 범위에 포함하고, 변경 후 같은 범위를 즉시 만료시킨다. 인증 없이 누구나 읽는 콘텐츠처럼 stale-while-revalidate가 의도된 경우에는 `revalidateTag`가 더 적합하다.

### 검증

lint는 tag와 query가 같은 계정에 한정되는지, stale 값을 허용하는지 판단할 수 없다. 두 계정으로 같은 URL을 읽어 메모가 섞이지 않는지 확인하고, 메모 생성, 수정, 삭제 직후 현재 사용자와 새 탭에서 올바른 목록이 보이는지 통합 검사한다. Next.js 버전을 변경하거나 `cacheComponents`를 켜고 끌 때 이 절의 공식 문서를 다시 확인한다.

## 최우선 계정 및 동기화 백로그: TanStack Query hydration을 두 번째 원본으로 만들지 않는다

### 막으려는 실패

서버에서 prefetch만 하고 `HydrationBoundary`를 생략하거나 서버와 브라우저가 다른 query key, cursor 또는 입력값을 사용하면 브라우저가 같은 데이터를 다시 요청하거나 다른 결과로 hydration한다. 서버의 module 전역 `QueryClient`는 사용자 사이에 cache를 공유할 수 있고, 브라우저에서 render마다 새 client를 만들면 Suspense 이후 prefetched cache를 잃는다. Next.js cache, Server Component 결과와 Query cache가 같은 데이터의 갱신을 각각 맡으면 한 화면 안에서도 값이 달라질 수 있다.

OpenStatus의 data table 예제는 boundary가 없어 SSR prefetch가 브라우저 cache로 전달되지 않고, `new Date()`로 만든 cursor가 서버와 브라우저에서 달라지는 문제를 수정했다. [PR #44](https://github.com/openstatusHQ/data-table-filters/pull/44)는 `HydrationBoundary`, 안정된 cursor와 0보다 큰 `staleTime`을 함께 적용했으며, 병합 결과는 [4bb3cdb](https://github.com/openstatusHQ/data-table-filters/commit/4bb3cdb1cf93c0370435c6dcb0edc9ce5e7f225b)이다.

### 적용 규칙

- TanStack Query를 채택해도 PostgreSQL, 동기화 API와 IndexedDB가 저장된 데이터의 원본이다. Query cache는 재구성할 수 있는 원격 데이터의 읽기 결과이며 undo history, clipboard 누적 목록 또는 저장 완료 증거가 아니다.
- 현재 로컬 배포는 서버 prefetch와 hydration을 사용하지 않는다. IndexedDB 자료를 Query cache에도 넣으려면 두 상태 사이의 무효화 책임이 생기므로 별도 채택 근거가 필요하다. 로컬 모드라는 이름만으로 Next.js 서버 기능을 금지하지 않는다.
- 서버의 `QueryClient`는 request 또는 prefetch Server Component마다 새로 만든다. 하나를 공유해야 한다면 React `cache`처럼 request 범위를 보장하는 수단과 중복 직렬화 비용을 함께 검증한다.
- 브라우저의 `QueryClient`는 provider 수명 동안 재사용한다. 첫 render가 Suspense로 중단되었을 때 버려지는 초기화 형태를 피하고, provider 아래의 경계를 확인한다.
- `HydrationBoundary`는 prefetch한 query를 읽는 가장 가까운 Client Component subtree를 감싼다. 여러 boundary를 사용할 수 있지만, 관련 없는 전체 cache를 boundary마다 반복해서 `dehydrate`하지 않는다.
- 서버 prefetch와 `useQuery`는 같은 query key, page parameter와 직렬화된 입력 의미를 사용한다. 시간, 무작위 값이나 server-only 기본값을 양쪽에서 따로 만들지 않는다.
- prefetched query에는 요구사항에 맞는 0보다 큰 `staleTime`을 검토하여 hydration 직후의 무의미한 refetch를 막는다. 오래된 데이터 허용 시간을 측정하지 않고 `Infinity`로 고정하지 않는다.
- 동일한 자료를 Server Component JSX와 hydrated Client Component에서 동시에 렌더링하지 않는다. 브라우저 refetch가 Server Component 결과를 갱신하지 못해 두 표현이 달라질 수 있다.
- Server Action을 client `queryFn`으로 사용하지 않는다. TanStack Query 5.102.8 공식 지침은 Server Action의 직렬 실행과 인자 전달 방식이 query의 병렬 fetch 및 refetch와 충돌할 수 있다고 경고한다. 브라우저 query는 Route Handler 또는 승인된 RPC 경계를 사용한다.
- 독립적인 prefetch는 route 또는 Suspense 단위에서 병렬로 시작한다. 중첩 Server Component를 순서대로 `await`하여 request waterfall을 만들지 않는다.
- `Date`, `Map`이나 사용자 정의 class처럼 JSON으로 그대로 보존되지 않는 자료를 dehydrate하려면 직렬화 및 역직렬화 방식을 정하고 Zod로 복원 결과를 검사한다.

안티패턴:

```tsx
const queryClient = new QueryClient()

export default async function NotesPage() {
  await queryClient.prefetchQuery({
    queryKey: ['notes', Date.now()],
    queryFn: listNotesForCurrentRequest,
  })

  return <SyncedNotes />
}
```

권장 패턴:

```tsx
export default async function NotesPage() {
  const actor = await requireActor()
  const queryClient = new QueryClient()
  const queryKey = ['notes', { accountId: actor.accountId }] as const

  await queryClient.prefetchQuery({
    queryKey,
    queryFn: () => listNotesForActor(actor),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SyncedNotes accountId={actor.accountId} />
    </HydrationBoundary>
  )
}
```

`SyncedNotes`는 같은 query key를 사용하되 브라우저에서 호출 가능한 Route Handler를 `queryFn`으로 사용한다. 서버가 검사한 actor를 client 식별자만으로 신뢰하지 않고 Route Handler에서 다시 인증하고 권한을 확인한다.

### 검증

정적 검사는 module 전역 `QueryClient`와 server-only import 일부를 찾을 수 있지만 query key의 의미, cache 소유권과 stale 허용 시간은 판단하지 못한다. 계정 두 개의 동시 요청으로 cache 격리를 확인하고, server prefetch 횟수, hydration 직후 browser 요청 수, query key와 cursor 일치, navigation 뒤 오래된 화면의 점멸을 검사한다. 같은 자료를 Server Component와 Client Component가 함께 렌더링하지 않는지도 리뷰한다. TanStack Query 또는 Next.js 버전을 바꾸면 fixed revision 공식 지침과 migration 문서를 다시 확인한다.

## 최우선 계정 및 동기화 백로그: Server Action과 Route Handler를 내부 함수처럼 믿지 않는다

### 막으려는 실패

Server Action은 UI에 연결된 함수처럼 보이지만 직접 POST 요청으로 도달할 수 있다. page에서 로그인 여부를 검사해도 action의 권한이 자동으로 이어지지 않는다. TypeScript annotation과 클라이언트 폼 검증만 적용하면 변조된 요청, 다른 계정의 메모 id와 예상하지 못한 FormData가 데이터베이스까지 도달한다.

Next.js 16.3.3 보안 지침은 export된 Server Action을 직접 요청할 수 있는 진입점으로 다루고, action 안에서 authentication, 자원별 authorization과 클라이언트 입력 검증을 다시 수행하도록 요구한다. 같은 지침은 새 프로젝트에서 server-only Data Access Layer가 authorization과 최소 DTO 반환을 맡도록 권고한다.

### 적용 규칙

- Server Action과 Route Handler는 모두 외부 입력 경계다. 각 진입점에서 actor를 확인하고 Zod로 입력을 parse한 뒤 use case를 호출한다.
- 로그인 여부만 확인하지 않고 `accountId`와 `noteId`의 관계를 변경 query 또는 use case에서 검사한다.
- 처리 함수는 raw database row, 환경변수, stack trace 또는 driver error를 반환하지 않는다. UI에 필요한 최소 DTO와 안정된 error code만 반환한다.
- 같은 UI 변경에 Server Action과 Route Handler를 함께 만들지 않는다. same-origin 폼과 React UI만 사용하면 Server Action을, 명시적인 HTTP client, worker, 외부 연동 또는 인증 없이 호출할 API가 필요하면 Route Handler를 선택한다.
- 두 진입 방식이 모두 필요하면 validation 이후의 use case를 공유한다. 처리 함수끼리 호출하거나 데이터베이스 코드를 복사하지 않는다.
- App Router를 선택하면 같은 기능에 Pages Router API Routes를 함께 두지 않는다. Next.js 공식 문서는 Route Handler를 App Router의 API Routes 대응 기능으로 설명한다.

안티패턴:

```ts
'use server'

export async function updateNote(noteId: string, text: string) {
  return database.note.update({
    where: { id: noteId },
    data: { text },
  })
}
```

권장 패턴:

```ts
'use server'

export async function updateNoteAction(raw: unknown): Promise<ActionResult<NoteDto>> {
  const actor = await requireActor()
  const parsed = updateNoteSchema.safeParse(raw)

  if (!parsed.success) {
    return invalidInput(parsed.error)
  }

  const result = await updateNoteUseCase({ actor, input: parsed.data })
  return toActionResult(result)
}
```

```ts
export async function PATCH(request: Request) {
  const actor = await requireActor(request)
  const parsed = updateNoteSchema.safeParse(await request.json())

  if (!parsed.success) {
    return Response.json(toValidationError(parsed.error), { status: 400 })
  }

  return toHttpResponse(await updateNoteUseCase({ actor, input: parsed.data }))
}
```

### 검증

허용 가능한 정적 검사 후보는 server-only database module을 클라이언트 코드에서 import하지 못하게 하는 규칙이다. 그러나 함수 안에서 메모별 authorization을 올바르게 했는지는 lint로 확인할 수 없다. 각 변경 요청에 미인증, 다른 계정의 메모 id, 잘못된 입력, 없는 revision과 성공 경로를 검사한다. Route Handler에는 HTTP status와 response shape도 확인한다. action body size와 allowed origin 설정은 배포 구조를 확정한 뒤 별도로 검토한다.

## TypeScript 타입과 Zod 검증의 책임을 섞지 않는다

### 막으려는 실패

TypeScript 타입은 compile 뒤 제거되므로 `raw as NoteInput`은 실행 중인 값을 검증하지 않는다. 반대로 하나의 Zod schema를 폼 입력, domain entity, database row와 API 응답에 그대로 사용하면 trim, coercion과 transform 때문에 입력 타입과 출력 타입이 달라진 사실을 놓치거나, persistence에서만 필요한 제약이 UI까지 새어 나온다.

Cal.com은 analytics 설정에 형식 검증이 없어 잘못된 ID와 URL이 저장되고 render될 수 있었고, [PR #26976](https://github.com/calcom/cal.diy/pull/26976)에서 provider별 Zod 검증과 회귀 검사를 추가했다. 병합 결과는 [c43c48b](https://github.com/calcom/cal.diy/commit/c43c48b1a8338f6f06ed074d1306bf4855e95c67)이다. 이 변경은 기존 빈 문자열 호환성과 실제 provider 형식의 과도한 제한 가능성도 별도 검토 대상으로 남겼다.

### 적용 규칙

- 브라우저 입력, FormData, URL parameter, worker message, IndexedDB record와 HTTP body처럼 신뢰 경계를 지나는 값은 `unknown`으로 받고 Zod로 parse한다.
- schema transform을 사용하면 `z.input<typeof schema>`와 `z.output<typeof schema>`를 구분한다. React Hook Form의 field type에는 사용자 입력 형태를, use case에는 parse된 출력 형태를 사용한다.
- form의 즉시 feedback과 server의 보안 검증은 목적이 다르다. client에서 검증했더라도 Server Action 또는 Route Handler에서 같은 의미의 server schema를 다시 적용한다.
- Zod 검증은 database 제약을 대신하지 않는다. `NOT NULL`, `CHECK`, `UNIQUE`와 foreign key로 영구 데이터의 불변 조건을 다시 보장한다.
- domain schema를 모든 계층의 만능 schema로 만들지 않는다. 외부 입력 schema, domain command와 persistence record가 실제로 다른 제약을 가지면 명시적으로 변환한다.
- `parse`가 던지는 오류를 framework error로 노출하지 않는다. 사용자가 고칠 수 있는 입력 오류에는 `safeParse` 결과를 안정된 error shape로 변환한다. 이미 예외 기반 transaction 흐름 안이라면 `parse`를 사용할 수 있다.

안티패턴:

```ts
type UpdateNoteInput = {
  noteId: string
  revision: number
  text: string
}

function readUpdate(raw: unknown): UpdateNoteInput {
  return raw as UpdateNoteInput
}
```

권장 패턴:

```ts
const updateNoteSchema = z.object({
  note: z.object({
    id: z.uuid(),
    revision: z.number().int().nonnegative(),
  }),
  text: z.string().max(MAX_NOTE_LENGTH).transform((value) => value.trimEnd()),
})

type UpdateNoteForm = z.input<typeof updateNoteSchema>
type UpdateNoteCommand = z.output<typeof updateNoteSchema>
```

`note.id`, `note.revision`처럼 같은 대상의 속성을 묶으면 `noteId`, `noteRevision`의 접두어 반복을 줄이면서 메시지의 책임도 드러난다. 다만 HTTP route parameter처럼 이미 note 자원 아래에 있는 값까지 중첩해 wire format을 불필요하게 복잡하게 만들지는 않는다.

### 검증

TypeScript 설정 후보는 `strict`, `noUncheckedIndexedAccess`와 `exactOptionalPropertyTypes`다. 설정을 추가하기 전에 설치된 TypeScript 버전과 Next.js 생성 설정의 호환성을 확인하고, 저장소의 무시된 임시 입력에서 실제 오류를 한 번 검증한다. type check는 runtime 입력을 확인하지 못하므로 schema의 성공, 누락, 범위 초과, 알 수 없는 필드, transform과 비동기 refinement를 검사한다. database migration 리뷰는 같은 불변 조건이 database에도 있는지 확인한다.

## React Hook Form을 애플리케이션 상태 저장소로 만들지 않는다

### 막으려는 실패

폼 전체를 `watch()`하고 모든 keystroke마다 메모 보드나 dialog root를 다시 렌더링하면 메모 수와 입력 길이가 늘수록 편집 반응이 느려진다. 서버 값이 도착할 때마다 `defaultValues` 객체를 바꾸면서 자동으로 폼이 갱신될 것으로 기대하면 값이 바뀌지 않거나 사용자가 입력 중인 dirty value를 덮을 수 있다. React Hook Form 7.87.0 문서는 `defaultValues`가 cache된다고 설명하고, `watch()`가 폼 root를 다시 렌더링하며, 큰 폼에서는 `useWatch`로 구독 범위를 줄이도록 안내한다.

### 적용 규칙

- React Hook Form은 메모 생성, 설정과 template 입력 dialog처럼 제출 단위가 있는 폼에 사용한다. 자유 배치 보드, clipboard 누적 목록, undo history와 worker 분석 상태를 폼 상태에 넣지 않는다.
- 폼 root에서 인자 없는 `watch()`를 호출하지 않는다. 한 field나 계산값이 필요한 가장 가까운 component에서 `useWatch({ name, control })`를 사용한다.
- 모든 keystroke에 검증이 필요하지 않으면 `mode: 'onChange'`를 기본값으로 선택하지 않는다. 오류 표시 시점과 성능을 함께 결정한다.
- `defaultValues`는 form 수명 동안의 기준값이다. 다른 메모로 전환하거나 server data를 다시 받으면 `reset` 또는 `values`를 사용하고 dirty value 보존 정책을 명시한다.
- `undefined`를 input 기본값으로 넘기지 않는다. 입력 전 값이 없음을 빈 문자열, null 허용 schema 또는 별도 state 중 하나로 모델링한다.
- form error 객체와 provider value를 render마다 새로 만들지 않는다.

안티패턴:

```tsx
function TemplateForm() {
  const { register, watch } = useForm<TemplateFormValues>()
  const values = watch()

  return <TemplatePreview values={values} register={register} />
}
```

권장 패턴:

```tsx
import type { Control } from 'react-hook-form'

function TemplateForm() {
  const form = useForm<TemplateFormValues>({
    defaultValues: { title: '', variables: [] },
  })

  return (
    <FormProvider {...form}>
      <TemplateFields />
      <TemplatePreviewField control={form.control} />
    </FormProvider>
  )
}

function TemplatePreviewField({ control }: { control: Control<TemplateFormValues> }) {
  const variables = useWatch({ control, name: 'variables' })
  return <TemplatePreview variables={variables} />
}
```

`FormProvider`는 form method 전달을 줄이는 도구이지 domain service나 애플리케이션 전역 상태를 넣는 저장소가 아니다. field가 적고 계산 비용이 낮은 dialog에서는 `watch()`의 단순성이 더 중요할 수 있으므로 profiler 근거 없이 모든 구독을 잘게 나누지 않는다.

### 검증

RHF API 사용 형태를 금지하는 lint를 새로 추가하지 않는다. 현재 저장소에 lint 체계가 없고, `watch()`가 문제인지 여부는 form 크기와 render 비용에 달려 있다. React Profiler로 입력 한 번에 다시 render되는 component와 commit 시간을 확인하고, 초기 data 재수신 중 dirty value 보존, field 전환과 submit 결과를 browser에서 검사한다.

## 최우선 계정 및 동기화 백로그: useMutation 하나의 상태를 모든 변경 작업의 상태로 쓰지 않는다

### 막으려는 실패

하나의 `useMutation`에서 얻은 `isPending`을 메모 목록 전체에 적용하면 한 메모의 저장이 다른 모든 메모를 비활성화한다. 연속 `mutate` 호출의 완료 순서는 호출 순서와 다를 수 있고, 호출할 때 넘긴 callback은 마지막 호출에만 실행되거나 component unmount 뒤 실행되지 않을 수 있다. `useMutationState`를 filter 없이 읽으면 MutationCache의 다른 기능과 이미 끝난 작업까지 섞이며, 반환값이 단일 상태라고 오인하기 쉽다.

Neondeck은 한 pull request의 review 시작 작업이 panel 전체 버튼을 비활성화하던 문제를 수정했다. [PR #315](https://github.com/pandemicsyn/neondeck/pull/315)은 작업 종류별 `mutationKey`와 `useMutationState` filter로 pending 변수를 읽어 각 row에만 진행 상태를 적용했고 동시 실행 회귀 검사를 추가했다. 병합 결과는 [bedbb8c](https://github.com/pandemicsyn/neondeck/commit/bedbb8c804094fef1cd91fadb10cb529a2f942a5)이다.

### 적용 규칙

- `useMutation`은 계정 동기화 모드의 create, update, delete와 명시적인 서버 side effect에 사용한다. 원격 조회, React 내부 상태, IndexedDB의 원본 상태나 undo history를 mutation cache로 표현하지 않는다.
- 일반 클릭 복사, 누적 복사와 메모 저장은 사용자 event handler에서 mutation 또는 주입된 command를 호출한다. `useEffect`가 mount나 state 변화를 감지해 비멱등 mutation을 시작하지 않는다.
- query 무효화, cache 반영과 모든 호출에 필요한 오류 기록은 `useMutation` options에 둔다. `mutate` 호출별 callback은 component가 살아 있을 때만 필요한 navigation이나 focus 같은 UI 후속 동작으로 제한한다.
- 한 mutation hook의 `data`, `error`와 `isPending`은 최근 관찰 작업을 나타낸다. 동시에 실행되는 메모별 상태가 필요하면 안정된 `mutationKey`를 정의하고 `useMutationState`에서 key, status와 필요할 때 predicate를 함께 filter한다.
- `useMutationState`는 배열을 반환하며 각 `mutate` 호출은 `gcTime` 동안 별도 cache entry를 만든다. 단일 항목을 가정하지 말고 `variables`의 note id와 `submittedAt`으로 UI 항목을 식별한다.
- 같은 note의 변경을 직렬화해야 하면 `scope.id`를 검토할 수 있지만 이것이 PostgreSQL revision 검사나 idempotency key를 대신하지 않는다. 다른 tab과 장치는 같은 browser MutationCache를 공유하지 않는다.
- optimistic update는 실패했을 때 되돌릴 snapshot 또는 refetch 경로가 있을 때만 사용한다. 여러 query에 같은 note가 있다면 모든 관련 key와 동시 mutation의 병합 순서를 정한다.
- 직접 복사 횟수와 누적 복사 횟수는 서버의 원자적 증가 결과를 반영한다. mutation 완료 순서로 전체 횟수를 직접 계산하거나 마지막 response가 항상 최신이라고 가정하지 않는다.

안티패턴:

```tsx
function NotesList({ notes }: { notes: Note[] }) {
  const save = useMutation({ mutationFn: updateNote })

  return notes.map((note) => (
    <NoteCard
      disabled={save.isPending}
      key={note.id}
      note={note}
      onSave={(text) => save.mutate({ note: { id: note.id }, text })}
    />
  ))
}
```

권장 패턴:

```tsx
const updateNoteMutationKey = ['notes', 'update'] as const

function NotesList({ notes }: { notes: Note[] }) {
  const queryClient = useQueryClient()
  const save = useMutation({
    mutationKey: updateNoteMutationKey,
    mutationFn: updateNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  })
  const pendingNoteIds = useMutationState({
    filters: { mutationKey: updateNoteMutationKey, status: 'pending' },
    select: (mutation) => {
      const parsed = updateNoteVariablesSchema.safeParse(mutation.state.variables)
      return parsed.success ? parsed.data.note.id : null
    },
  })
  const pending = new Set(pendingNoteIds.filter((id) => id !== null))

  return notes.map((note) => (
    <NoteCard
      disabled={pending.has(note.id)}
      key={note.id}
      note={note}
      onSave={(text) => save.mutate({ note: { id: note.id }, text })}
    />
  ))
}
```

실제 구현에서는 mutation variable을 Zod로 검사한 타입으로 고정하고 query key factory를 공유한다. `useMutationState`의 반환 타입을 임의 generic assertion으로 좁히더라도 runtime cache entry가 검증되는 것은 아니다.

### 검증

TanStack Query ESLint 규칙은 query client 안정성이나 options 형태 일부를 검사할 수 있지만 mutation key의 업무 의미, 대상별 pending 표시와 rollback 정확성은 판단하지 못한다. 같은 note와 서로 다른 note에 변경을 병렬로 보내 버튼 상태, 완료 순서, cache 무효화, 실패 후 복원과 최종 revision을 검사한다. component를 작업 도중 unmount해 호출별 callback에 중요한 일관성 처리가 남아 있지 않은지도 확인한다.

## Props Drilling을 범용 Service Locator로 바꾸지 않는다

### 막으려는 실패

여러 단계를 통과하는 props가 불편하다는 이유로 모든 service를 `Map<string, unknown>` 형태의 Context에 넣고 component가 `resolve<T>()`로 찾게 하면 실제 의존성이 signature에서 사라진다. 문자열 key 오류는 runtime까지 드러나지 않고, TypeScript interface는 runtime에 남지 않으므로 interface 자체를 token으로 사용할 수도 없다. 큰 Context value가 매 render마다 새로 만들어지면 모든 consumer가 다시 render된다.

Webiny는 CMS background task가 request context의 `BulkActionContext` service-locator bag에서 use case를 찾던 구조를 제거하고 필요한 `TasksCrud`, `ListTasksUseCase`, `TriggerTaskUseCase` 등을 직접 주입했다. 변경 이유는 [PR #5387](https://github.com/webiny/webiny-js/pull/5387), 고정된 병합 commit은 [573e347](https://github.com/webiny/webiny-js/commit/573e347c7ab5f027b9c367dd133b2469b9d97e1e)이다.

### 적용 규칙

- domain 함수와 use case는 필요한 port를 parameter 또는 constructor로 받는다. 구현을 찾기 위해 전역 registry를 호출하지 않는다.
- local과 sync 어댑터 선택, 환경 설정 해석과 객체 생성은 모드별 composition root 한 곳에서 수행한다.
- 한두 단계 전달이 명확한 UI data와 callback은 props로 유지한다. `children` composition으로 중간 component가 알 필요 없는 props를 제거할 수 있는지 먼저 확인한다.
- 많은 하위 component가 공유하는 안정된 feature dependency만 좁은 React Context로 제공한다. Context는 구체적인 `NoteCommands`처럼 타입이 드러나는 값을 제공하고 `resolve`, `getService` 또는 문자열 token API를 노출하지 않는다.
- presentational component에는 service 대신 값과 event callback을 전달한다. Context 접근은 feature 경계와 container component에 제한한다.
- Context provider value는 composition root에서 한 번 만들거나 `useMemo`로 안정화한다. 사용 빈도가 다른 state와 command를 하나의 큰 Context에 합치지 않는다.

안티패턴:

```tsx
type Services = {
  resolve<T>(key: string): T
}

const ServicesContext = createContext<Services | null>(null)

function NoteCard({ note }: NoteCardProps) {
  const services = useContext(ServicesContext)
  const clipboard = services?.resolve<ClipboardPort>('clipboard')

  return <button onClick={() => clipboard?.writeText(note.text)}>{note.text}</button>
}
```

권장 패턴:

```ts
function createCopyNote(ports: CopyNotePorts) {
  return (note: Note) => copyNote(note, ports)
}
```

```tsx
type NoteCommands = {
  copy(note: Note): Promise<CopyResult>
  accumulate(note: Note): Promise<void>
}

const NoteCommandsContext = createContext<NoteCommands | null>(null)

function NoteCardContainer({ note }: NoteCardProps) {
  const commands = useNoteCommands()
  return <NoteCard note={note} onCopy={() => commands.copy(note)} />
}
```

이 Context도 ambient dependency이므로 무제한으로 사용하면 locator와 비슷한 문제가 생긴다. 차이는 generic lookup을 제공하지 않고 feature 범위, 값의 타입과 생성 지점을 고정한다는 데 있다. 재사용 가능한 domain code와 일반 component는 React Context를 알지 않아야 한다.

### 검증

경로가 확정되면 generic locator import를 composition root 밖에서 막는 정적 규칙을 검토할 수 있다.

```js
{
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{
        name: '@/composition/service-locator',
        message: 'Inject a typed feature dependency at the composition root.',
      }],
    }],
  },
}
```

현재는 해당 module과 lint 설정이 없으므로 이 설정을 추가하지 않는다. 정적 검사는 Context 범위가 적절한지, props가 실제로 과도한지 또는 provider value 변경이 필요한지 판단하지 못한다. 리뷰어는 dependency를 component signature, factory 또는 좁은 provider type에서 찾을 수 있는지 확인하고 React Profiler로 Context 변경의 영향을 측정한다.

## Port와 adapter 이름으로 책임을 숨기지 않는다

### 막으려는 실패

`INotePort`, `NoteAdapter`, `DataService`처럼 구조상의 분류만 적은 이름은 어떤 대화를 지원하고 어느 외부 기술을 변환하는지 알려주지 않는다. port에 `Local` 또는 `Postgres`를 넣으면 내부 use case가 실행 모드나 저장 기술을 알게 되고, adapter에 기술 이름이 없으면 어떤 구현이 browser bundle 또는 server graph에 들어가는지 import만 보고 구분하기 어렵다.

Alistair Cockburn의 원문은 port를 목적이 있는 대화로, adapter를 그 대화와 외부 기술 사이의 변환으로 설명한다. 같은 port에 SQL, flat file과 in-memory adapter가 연결될 수 있다는 예시는 port 이름이 구현 기술과 독립적이어야 하는 이유를 보여준다. Webiny도 범용 `BulkActionContext`에서 use case를 찾던 구조를 제거하고 `TasksCrud`, `ListTasksUseCase`와 `TriggerTaskUseCase`처럼 필요한 역할을 직접 주입했다. 근거는 [PR #5387](https://github.com/webiny/webiny-js/pull/5387)과 병합 결과 [573e347](https://github.com/webiny/webiny-js/commit/573e347c7ab5f027b9c367dd133b2469b9d97e1e)이다.

### 적용 규칙

- port 이름은 use case가 외부에 요구하는 목적과 동작을 나타낸다. 읽기와 쓰기 책임이 다르면 `NoteReader`, `NoteWriter`, `UsageRecorder`와 `ClipboardWriter`처럼 필요한 capability를 드러낸다.
- `Port`, `Service`, `Manager`, `Handler` 또는 `Adapter`만으로 의미를 채우지 않는다. `NoteRepositoryPort`처럼 역할이 이미 분명하고 팀이 승인한 규칙은 사용할 수 있지만 suffix가 빠진 목적을 대신해서는 안 된다.
- port는 이를 사용하는 application 또는 domain 쪽에 두고 브라우저나 데이터베이스 타입을 노출하지 않는다. `IDBRequest`, SQL row, `Response`와 React type은 adapter 경계에서 domain 값으로 변환한다.
- adapter 이름은 연결하는 기술과 맡은 역할을 함께 나타낸다. `IndexedDbNoteRepository`, `PostgresNoteRepository`, `BrowserClipboardWriter`와 `WorkerTextAnalyzer`처럼 import만으로 runtime 의존성을 추적할 수 있게 한다.
- `LocalNotePort`와 `SyncNotePort`를 따로 만들어 UI를 모드에 결합하지 않는다. 같은 port를 구현하는 local 및 sync adapter를 composition root에서 선택하고, 실제 capability 차이는 별도 port와 capability 값으로 표현한다.
- 한 구현이 읽기와 쓰기를 모두 제공하더라도 use case에는 필요한 좁은 port만 전달한다. class 이름과 interface 이름을 일대일로 맞추기 위해 불필요한 큰 interface를 만들지 않는다.
- `inbound`, `outbound`, `driving`과 `driven`은 방향을 팀이 일관되게 이해할 때만 폴더 보조 이름으로 사용한다. 업무 목적을 나타내는 type 이름을 이 용어로 대체하지 않는다.

안티패턴:

```ts
interface INotePort {
  load(): Promise<Note[]>
  save(note: Note): Promise<void>
}

class NoteAdapter implements INotePort {
  // implementation omitted
}
```

권장 패턴:

```ts
interface NoteReader {
  list(): Promise<Note[]>
}

interface NoteWriter {
  save(note: Note): Promise<SaveNoteResult>
}

class IndexedDbNoteRepository implements NoteReader, NoteWriter {
  // implementation omitted
}
```

코드 예시는 이름과 책임 분할만 보여준다. 실제 method와 result type은 승인된 데이터 및 충돌 정책에서 정한다.

### 검증

lint는 `Adapter` suffix를 찾을 수 있지만 이름이 직관적인지 또는 port가 너무 큰지는 정확히 판정하지 못한다. 이름 금지 규칙을 만들지 않는다. 리뷰어는 각 port에서 이를 요구하는 use case, 대화의 목적, domain type과 둘 이상의 가능한 adapter를 추적한다. adapter 이름으로 runtime과 기술을 알아볼 수 있는지, local 및 sync 조립 지점이 같은 port를 사용하는지도 확인한다.

## FSD 계층과 public API가 Next.js 실행 환경을 섞게 하지 않는다

`apps/notes/` 패키지, 아래 적용 규칙의 FSD 계층 배치와 ESLint 검사 방식은 `current`다. 환경별 public API 추가 여부는 실제 실행 환경을 확인하기 전까지 `proposed`다.

### 막으려는 실패

FSD의 모든 layer를 소스가 생기기 전에 만들면 하나의 개인 메모 기능이 여러 빈 폴더와 재수출 파일로 흩어진다. Next.js route용 `app` 및 `pages`와 같은 이름을 FSD layer에도 쓰면 import와 파일 탐색이 모호해진다. 더 위험한 경우는 하나의 `index.ts`가 Client Component, IndexedDB adapter, PostgreSQL query와 Server Action을 함께 재수출하여 Client Component의 import가 server-only module을 browser graph로 끌어들이는 것이다.

FSD 공식 문서는 모든 layer를 사용할 필요가 없고 모든 상호작용을 feature로 만들 필요도 없다고 설명한다. Next.js 가이드는 route 디렉터리와 충돌하지 않게 FSD layer를 `_app`과 `_pages`로 부르고, server-only export가 일반 `index.ts`를 통해 client graph에 들어갈 때 `index.server.ts`를 추가하라고 안내한다. 이 환경별 public API 지침은 [PR #924](https://github.com/feature-sliced/documentation/pull/924)와 병합 결과 [4f5ae68](https://github.com/feature-sliced/documentation/commit/4f5ae6875bb53b3b0a72ddaa527002ba8d86dd6a)에서 추가됐다. layer 접두어 지침은 [PR #927](https://github.com/feature-sliced/documentation/pull/927)과 [4c6bf39](https://github.com/feature-sliced/documentation/commit/4c6bf392db230c710e8183f423108ca503f0053a)에서 확인했다.

### index.server.ts와 index.client.ts에 대한 판정

`index.server.ts`와 `index.client.ts`는 현재 Next.js가 import 환경에 따라 자동 선택하는 file convention이 아니다. Next.js 16.3.3의 공식 경계는 `'use client'`, module import graph, `server-only`와 `client-only` 표시로 정해진다. 따라서 `@/features/notes`를 import했을 때 두 파일 중 하나가 자동 선택된다고 가정하면 안 된다. 환경별 파일은 `@/features/notes/index.server` 또는 합의한 alias처럼 명시적으로 import해야 한다.

현재 FSD 고정 revision은 문제 발생 시 일반 `index.ts`에 `index.server.ts`를 추가하는 방안만 구체적으로 명시한다. `index.client.ts`를 대칭으로 반드시 만들라는 규칙은 확인되지 않았다. 그러므로 두 파일로 `index.ts`를 무조건 대체하지 않는다.

- 두 환경에서 안전한 type, DTO, 순수 schema와 domain 함수가 있으면 일반 `index.ts`가 그 최소 public API를 내보낸다.
- server-only export가 있으면 `index.server.ts`가 명시적인 server 진입점이 된다. 그 아래 데이터 접근 module에도 `import 'server-only'`를 두어 잘못된 client import가 build에서 실패하게 한다.
- 여러 Client Component와 browser adapter를 하나의 명시적 진입점으로 제공할 필요가 있을 때만 `index.client.ts`를 프로젝트 규칙으로 검토한다. UI 진입점은 `'use client'`로 client module graph를 선언하고, `window`나 IndexedDB를 module 평가 시점에 사용하는 저수준 module은 `client-only` 표시를 검토한다.
- `index.client.ts`를 Server Component가 Client Component reference로 import하는 경우는 가능하지만, server-only 값과 browser-only adapter를 같은 진입점에서 함께 내보내지 않는다.
- TypeScript의 `moduleSuffixes`로 자동 선택을 흉내 내려면 server와 browser가 서로 다른 resolution 설정을 사용해야 한다. 현재 단일 Next.js 프로젝트 설정과의 일치가 검증되지 않았으므로 이 방식을 제안하지 않는다.

### 적용 규칙

- 독립 실행 package는 `apps/notes/`에 두고 `apps/notes/package.json`이 의존성과 실행 명령을 관리한다. package manager, workspace 선언과 잠금 파일 형식은 구현을 시작할 때 별도로 정한다.
- Next.js의 `apps/notes/app/`은 route와 framework file을 얇게 연결하고, FSD 코드는 `apps/notes/src/`에 둔다. FSD의 App과 Pages 계층은 `_app`과 `_pages`로 구분한다.
- 모든 layer를 먼저 만들지 않는다. 화면 한 곳에서만 쓰는 조합은 그 화면의 `_pages` slice에 두고, 여러 화면에서 실제로 재사용하는 사용자 동작만 `features`로 옮긴다. 현재 `widgets`와 폐기된 `processes`는 만들지 않는다.
- slice는 `notes`, `templates`, `usage`처럼 독자가 찾는 업무 용어로 나눈다. `components`, `hooks`와 `types`처럼 파일 종류만 나타내는 이름으로 slice나 shared library를 만들지 않는다.
- 같은 layer의 slice끼리 임의로 import하지 않고 상위 layer에서 조합한다. 다른 slice는 public API로만 접근하며 같은 slice 내부에서는 public API를 역으로 import하지 않고 상대 경로를 사용한다.
- Entities slice 사이의 자료 관계를 type으로 직접 표현해야 할 때에만 `@x` public API를 사용한다. 그 밖의 같은 layer import를 예외로 만들지 않는다.
- `export *`로 내부 전체를 public API에 노출하지 않는다. export 목록을 명시하고 server, client와 공통 module을 서로 재수출하지 않는다.
- FSD는 frontend 구조화 방법이다. PostgreSQL schema, migration, background job과 큰 API 구현을 frontend layer 규칙에 억지로 넣지 않는다.
- 현재 local composition root는 `apps/notes/src/_app/composition/`에 두고 아래 계층의 공개 브라우저 진입점만 가져온다. 아래 계층은 `_app`을 가져오지 않으며, 정적 build가 `index.server.ts`에 도달하면 실패로 처리한다. 최우선 계정 및 동기화 백로그에서는 sync server graph가 browser adapter를 직접 import하지 않는지도 확인한다.

안티패턴:

```ts
export * from './ui/note-board'
export * from './browser/indexed-db-note-repository'
export * from './server/postgres-note-repository'
export * from './server/note-actions'
```

권장 패턴:

```ts
// index.ts
export { noteSchema } from './model/note-schema'
export type { Note, NoteRevision } from './model/note'
```

```ts
// index.server.ts
import 'server-only'

export { PostgresNoteRepository } from './server/postgres-note-repository'
export { updateNoteAction } from './server/note-actions'
```

```ts
// index.client.ts
'use client'

export { NoteBoard } from './ui/note-board'
export { NotesProvider } from './ui/notes-provider'
```

환경별 파일명은 import 의도를 드러내지만 단독으로 잘못된 import를 막지 않는다. directive, `server-only` 또는 `client-only`, import 규칙과 모드별 build 검사가 함께 필요하다.

### 검증

U1의 의존성 조사는 FSD 팀의 legacy ESLint config, 별도 실행 도구인 Steiger, FSD 전용 ESLint 플러그인, `@boundaries/eslint-plugin`과 내부 검사 스크립트를 비교했다. 현재 ESLint flat config, TypeScript alias와 저장소 고유 계층을 함께 구성할 수 있는 `@boundaries/eslint-plugin` 7.2.0 및 `eslint-import-resolver-typescript` 4.4.5를 사용한다. `boundaries/dependencies`를 기본 거부 방식으로 구성해 layer 역방향 import, 허용된 Entities `@x` 외의 같은 layer import, public API 우회와 server 및 client 진입점 교차 import를 검사한다. ESLint core 규칙은 `export *`를 거부한다.

설정 판별만을 위한 fixture나 별도 검사 스크립트는 커밋하지 않는다. 저장소의 무시된 임시 입력에서 정상 import, 정적 및 동적 위반 import를 한 번 구분한 뒤 실제 소스의 lint를 반복 검증 명령으로 사용한다. Next.js의 현재 독립 실행 빌드로 환경 오염 오류와 client bundle을 확인하고, 현재 정적 결과물에 PostgreSQL client, 사용하지 않는 Server Actions와 비밀 환경변수 접근 코드가 없는지 검사한다. 파일명이 맞는지만으로 통과시키지 않는다.

## 백로그: 라이브러리 빌드에서 호스트와 실행 환경을 다시 묶지 않는다

이 절은 라이브러리 패키지와 포트폴리오 라우트 연결 백로그를 시작할 때 적용한다. 현재 독립 실행 애플리케이션 구현의 선행 조건이나 완료 기준이 아니다.

### 막으려는 실패

독립 실행 Next.js 애플리케이션 전체를 하나의 구성요소 라이브러리처럼 묶으면 라우트, root layout, 환경변수와 서버 코드가 패키지 호스트에게 새어 나온다. 반대로 공통 root entry가 Client Component, IndexedDB adapter, PostgreSQL query와 Server Action을 모두 다시 내보내면 포트폴리오 호스트가 클라이언트 진입점 하나를 가져왔는데도 서버 모듈을 해석하거나 비밀 환경변수 접근을 브라우저 graph에 포함할 수 있다.

라이브러리 bundle 안에 React를 포함하면 호스트의 React와 서로 다른 사본이 생길 수 있다. React 공식 문서는 애플리케이션 코드와 React DOM이 서로 다른 React export를 해석할 때 Hook 호출이 실패할 수 있으며, 라이브러리가 React를 일반 dependency로 잘못 선언한 경우를 원인으로 든다.

Client Component 소스에 `'use client'`가 있어도 번들러가 배포 진입점에서 지시문을 제거하면 Next.js 호스트는 그 component를 Server Component처럼 해석한다. Vercel Analytics는 사용하는 애플리케이션이 App Router에서 별도 client wrapper를 만들지 않도록 빌드 뒤 React 진입점 맨 앞에 지시문을 넣었다. 변경 이유는 [PR #37](https://github.com/vercel/analytics/pull/37), 병합 결과는 [554bb2c](https://github.com/vercel/analytics/commit/554bb2c6e0ee6e30cf6f576ccd820cbcc8a37af3)에서 확인했다.

### 적용 규칙

- 독립 실행용 `app/` 라우트와 root layout은 호스트 연결 코드로 유지하고, 재사용할 use case, UI 및 환경별 조립 진입점을 라이브러리 패키지로 분리한다. [Next.js의 `output` 문서](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)에 따른 `standalone`은 서버 배포 산출물이므로 라이브러리 빌드로 취급하지 않는다.
- 포트폴리오 호스트가 원하는 `app/<segment>/page.tsx`에서 라이브러리 진입점을 가져온다. 패키지 설치만으로 라우트가 자동 등록된다고 가정하거나 패키지 안에 `/notes` 같은 절대 라우트를 고정하지 않는다.
- `package.json`의 `exports`에는 호스트가 사용할 subpath만 명시한다. `./client`, `./server`, `./shared`와 style 진입점처럼 실행 환경과 역할을 import 경로에서 구분하고 private 소스 deep import를 허용하지 않는다.
- 일반 root entry는 클라이언트와 서버 모듈을 함께 다시 내보내지 않는다. 환경 중립 type과 순수 함수만 제공할 근거가 없다면 root entry를 생략한다.
- 클라이언트 진입점은 배포된 JavaScript의 첫 지시문으로 `'use client'`를 보존한다. 소스 파일만 확인하지 않고 빌드 산출물을 검사한다.
- 서버 진입점과 database access module은 `server-only` 표시와 환경별 import 제한을 함께 적용한다. 파일 suffix만으로 Next.js가 환경을 자동 선택한다고 가정하지 않는다.
- React와 React DOM은 승인된 호환 범위의 peer dependency로 검토하고 라이브러리 bundle에서 external 처리한다. 패키지 자체가 Next.js API를 공개 진입점에서 사용한다면 Next.js의 peer 호환 범위도 명시한다.
- 라이브러리 모듈을 import하는 순간 `process.env`, `window`, IndexedDB 또는 Worker를 읽지 않는다. 호스트 composition root가 검증한 실행 모드, 라우트와 어댑터를 명시적으로 전달하고 브라우저 API는 클라이언트 event 또는 lifecycle 안에서 시작한다.
- component style은 호스트의 `html`, `body`, reset과 포트폴리오 라우트를 바꾸지 않도록 범위를 제한한다. 별도 stylesheet를 내보내면 `exports`에 공개하고 호스트가 정해진 위치에서 한 번 가져오게 한다.
- Worker 소스와 asset은 패키지 archive에 포함되는 이름과 호스트 빌드가 해석할 URL을 검증한다. 소스 workspace에서만 우연히 찾을 수 있는 상대 경로를 배포 규칙으로 삼지 않는다.
- workspace 소스 패키지와 미리 compile한 ESM 패키지 가운데 어느 쪽을 쓰더라도 독립 실행 호스트와 포트폴리오 호스트가 같은 공개 진입점을 사용하게 한다. 두 호스트를 위해 내부 소스를 복제하지 않는다.

안티패턴:

```ts
// package root entry
export * from './client/note-board'
export * from './browser/indexed-db-note-repository'
export * from './server/postgres-note-repository'
export * from './server/note-actions'
```

```tsx
// portfolio host
import NotesPage from '@portfolio/personal-notes/internal/app/page'

export default NotesPage
```

권장 패턴:

```tsx
// client entry emitted by the library build
'use client'

export { PersonalNotesApplication } from './ui/personal-notes-application'
export { PersonalNotesProvider } from './ui/personal-notes-provider'
```

```ts
// server entry emitted separately
import 'server-only'

export { createAccountNotesDependencies } from './server/create-account-notes-dependencies'
```

```json
{
  "exports": {
    "./client": {
      "types": "./dist/client.d.ts",
      "import": "./dist/client.js"
    },
    "./server": {
      "types": "./dist/server.d.ts",
      "import": "./dist/server.js"
    },
    "./shared": {
      "types": "./dist/shared.d.ts",
      "import": "./dist/shared.js"
    },
    "./styles.css": "./dist/styles.css"
  }
}
```

```tsx
// route owned by the portfolio host
import { PersonalNotesApplication } from '@portfolio/personal-notes/client'

export default function Page() {
  return <PersonalNotesApplication />
}
```

예시는 실행 환경과 호스트 라우트의 책임 구분만 보여준다. 패키지 이름, component props, 공개 subpath, 서버 어댑터와 style 진입점은 실행 구조 결정 뒤 확정한다.

### 검증

공개 subpath가 확정되면 `no-restricted-imports`나 패키지 경계 검사로 private deep import와 클라이언트에서 서버 진입점을 가져오는 코드를 막을 수 있다. 정적 검사는 빌드 도구가 지시문을 제거했는지, dependency tree에 React가 두 개 있는지, CSS가 다른 라우트에 영향을 주는지 또는 Worker asset URL이 유효한지 판단하지 못한다.

패키지 관리자와 저장소 명령을 정한 뒤 다음 증거를 함께 확인한다.

- 라이브러리 빌드 산출물의 각 진입점, 타입 선언, 지시문, CSS와 Worker 파일 목록
- 패키지 archive만 설치한 깨끗한 Next.js 호스트의 production build
- 승인된 실행 모드별 독립 실행 빌드와 포트폴리오 라우트 빌드의 성공
- 저장소의 무시된 임시 입력에서 클라이언트가 서버 진입점을 가져오고 서버가 브라우저 어댑터를 가져오는 경우의 빌드 실패
- 패키지 관리자 dependency tree에서 호스트와 라이브러리가 공유하는 React 사본이 하나라는 결과
- 서로 다른 라우트 접두어에서 탐색, 새로고침, style과 Worker 동작이 유지되는 실제 브라우저 결과
- 로컬 호스트의 클라이언트 bundle과 archive에 계정 서버 코드, PostgreSQL client와 비밀 환경변수 접근이 없다는 검사

라이브러리 백로그를 시작하면 실제 package 명령으로 위 검사를 실행한다. 검사 도구의 판별만을 위한 fixture나 별도 script를 커밋하지 않고, 반복해서 보존해야 하는 사용자 동작이나 package 호환성 사례만 테스트로 남긴다.

## Worker를 원본 저장소나 순서가 보장된 함수처럼 다루지 않는다

### 막으려는 실패

component render마다 Worker를 만들거나 메모별 Worker를 하나씩 만들면 시작 비용과 memory가 늘고 cleanup이 누락된다. request ID와 note content revision이 없는 메시지는 오래 걸린 이전 분석 결과가 최신 편집 결과를 덮게 한다. 현재 요구 없이 SharedWorker를 선택하면 여러 탭의 수명과 조정 실패만 추가된다.

HTML Living Standard는 worker가 시작 비용과 instance별 memory 비용이 큰 장기 실행 객체이며 대량 생성 용도가 아니라고 설명한다. Actual Budget은 탭마다 별도 Worker와 IndexedDB backend를 실행해 sync 충돌이 생기던 구조를 SharedWorker message router와 leader/follower 구조로 바꿨다. leader 종료, heartbeat, 임시 Worker와 failover까지 다룬 이유는 [PR #7172](https://github.com/actualbudget/actual/pull/7172), 병합 결과는 [4f7c3c5](https://github.com/actualbudget/actual/commit/4f7c3c51a58fc4e70b8d2d79bf80397d3235392b)에서 확인했다.

### 적용 규칙

- 줄 단위 텍스트 분석은 명시적 사용자 요청 후 실행하고, 분석 책임의 조립 지점에서 지연 생성한 Dedicated Worker 하나를 재사용한다.
- SharedWorker는 여러 탭의 분석 queue나 IndexedDB 접근을 조정해야 한다는 요구가 생길 때 별도 결정으로 검토한다. 현재 구현에 fallback이나 조건부 분기를 미리 넣지 않는다.
- request와 response는 discriminated union으로 정의하고 `requestId`, note ID와 content revision, algorithm type과 version을 포함한다.
- response의 note content revision이 현재 값과 다르면 결과를 폐기한다. 사용자 취소는 실제 분석 시간이 사용 흐름을 방해한다는 측정 결과와 요구가 생긴 뒤 별도 message 규칙으로 검토한다.
- 큰 binary payload를 반복 전송할 때만 transferable을 검토한다. transfer 뒤 원본 buffer를 다시 사용할 수 없다는 조건을 반영한다. 일반 문자열 목록에는 불필요한 최적화를 적용하지 않는다.
- Dedicated Worker는 분석 영역의 수명이 끝날 때 listener를 제거하고 `terminate`한다.

안티패턴:

```tsx
function AnalysisPanel({ notes }: AnalysisPanelProps) {
  const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url))
  worker.postMessage(notes)
  worker.onmessage = ({ data }) => saveAnalysis(data)

  return <AnalysisResult />
}
```

권장 패턴:

```ts
type AnalysisRequest = {
  type: 'analyze-text'
  requestId: string
  note: {
    id: string
    contentRevision: number
    lines: string[]
  }
  algorithm: {
    type: 'surface'
    version: string
  }
}

type AnalysisResponse = {
  type: 'analysis-result'
  requestId: string
  note: {
    id: string
    contentRevision: number
  }
  result: TextAnalysisResult
}
```

```ts
async function acceptAnalysis(response: AnalysisResponse, notes: NoteReader) {
  const current = await notes.get(response.note.id)

  if (!current || current.contentRevision !== response.note.contentRevision) {
    return { accepted: false, reason: 'stale-note' } as const
  }

  return { accepted: true, result: response.result } as const
}
```

### 검증

TypeScript는 union의 exhaustiveness와 message shape를 확인하지만 도착 순서와 browser lifecycle은 보장하지 못한다. Worker 경계에서 Zod 또는 명시적 validator로 message를 검사한다. 오래된 response를 수락하거나 폐기하는 순수 상태는 TDD로 개발하고, 실제 브라우저에서는 빠른 연속 수정, Worker 실행 오류와 production 정적 결과물의 asset URL, MIME type 및 message 왕복을 확인한다. 분석 크기별 main thread long task, Worker 시작 시간과 message 복사 비용도 측정한다.

## IndexedDB transaction과 저장 내구성을 과신하지 않는다

### 막으려는 실패

readwrite transaction을 만든 뒤 network, worker 분석 또는 일반 Promise를 기다리면 event loop로 제어가 돌아간 동안 transaction이 inactive가 되거나 자동 commit될 수 있다. 다른 탭이 이전 database connection을 유지한 상태에서 schema version을 올리면 upgrade가 blocked 상태로 남는다. 저장 성공을 백업 완료로 표시하면 browser eviction, site data 삭제와 손상에서 메모를 복구할 수 없다.

IndexedDB 3.0은 transaction이 event dispatch 밖에서 inactive가 되고 짧게 유지되어야 한다고 정한다. upgrade transaction은 다른 connection이 모두 닫혀야 시작한다. Actual Budget의 persistence 요청 변경은 eviction 가능성을 낮추는 보완 사례이며 보존 보장은 아니다.

### 적용 규칙

- worker 계산, network 요청과 Zod 변환은 readwrite transaction을 열기 전에 끝낸다.
- transaction을 연 뒤 필요한 IndexedDB request를 같은 task에서 enqueue하고 `complete` 또는 `abort`를 기다린다.
- 여러 object store를 함께 바꿔야 하는 불변 조건만 한 transaction으로 묶는다. UI 대기나 분석 전체를 transaction 안에 두지 않는다.
- connection에 `versionchange` handler를 두어 현재 connection을 닫고 새로고침 또는 재시도를 안내한다. open request의 `blocked` 상태는 별도 UI로 알린다.
- database name과 record key에 애플리케이션과 schema 범위를 포함한다. 최우선 계정 및 동기화 백로그에서 local profile을 도입하면 계정 전환만으로 local 데이터가 섞이지 않게 범위를 추가한다.
- `navigator.storage.persist()`는 결과를 확인하고 거절 가능성을 처리한다. persistence가 승인되어도 export와 import를 대체하지 않으며, 최우선 계정 및 동기화 백로그에서는 서버 동기화 정책도 대신하지 않는다.
- quota, transaction abort와 schema migration 실패를 사용자에게 알리고, commit 전 UI를 영구 저장 완료로 표시하지 않는다.

안티패턴:

```ts
async function saveRequestedAnalysis(db: IDBDatabase, note: Note) {
  const transaction = db.transaction('notes', 'readwrite')
  const analysis = await analyzer.analyze(note.text)

  transaction.objectStore('notes').put({ note, analysis })
}
```

권장 패턴:

```ts
async function saveRequestedAnalysis(db: IDBDatabase, note: Note) {
  const analysis = await analyzer.analyze(note.text)
  const record = noteRecordSchema.parse({ note, analysis })
  const transaction = db.transaction(['notes', 'analysis'], 'readwrite')

  transaction.objectStore('notes').put(record.note)
  transaction.objectStore('analysis').put(record.analysis)

  await transactionDone(transaction)
}
```

```ts
function observeDatabaseOpen(request: IDBOpenDBRequest) {
  request.onblocked = () => showDatabaseUpgradeBlocked()
  request.onsuccess = () => {
    request.result.onversionchange = () => request.result.close()
  }
}
```

### 검증

lint는 transaction이 event loop에서 언제 inactive가 되는지 판단하지 못한다. 지원 대상의 실제 browser에서 기존 schema upgrade, 두 탭이 열린 상태, quota 부족, abort와 page 종료를 검사한다. 테스트용 IndexedDB 구현을 나중에 선택하더라도 실제 browser 검사를 대체하지 않는다. export한 데이터로 새 profile에서 복원할 수 있는지는 별도 복구 흐름으로 검증한다.

## 최우선 계정 및 동기화 백로그: PostgreSQL을 JSON 저장소나 단일 사용자 저장소처럼 사용하지 않는다

### 막으려는 실패

Zod가 검증한다는 이유로 메모 식별자, revision과 사용 횟수를 하나의 `jsonb`에 넣고 데이터베이스 제약을 생략하면 다른 쓰기 코드나 migration이 잘못된 값을 저장할 수 있다. 현재 값을 읽고 JavaScript에서 1을 더한 뒤 update하면 두 요청이 같은 값을 읽어 한 번의 복사가 사라질 수 있다. 마지막 저장이 무조건 이기는 방식은 여러 탭이나 장치에서 메모 수정 내용을 조용히 덮어쓴다.

PostgreSQL 18 문서는 Read Committed가 기본이며 같은 transaction의 두 SELECT도 다른 snapshot을 볼 수 있다고 설명한다. unique, foreign key와 check constraints는 모든 쓰기 경로에 불변 조건을 적용한다. Cal.com은 stale calendar cache를 사용하는 두 동시 booking이 같은 시간대를 차지하는 race를 병렬 browser context로 재현했다. 사례는 [PR #22170](https://github.com/calcom/cal.diy/pull/22170)과 [179a547](https://github.com/calcom/cal.diy/commit/179a547bd08d05f487cd2117de51a1db3b373283)이다.

### 적용 규칙

- note id, account id, revision, text, position, size, 직접 복사 횟수와 누적 복사 횟수처럼 query와 무결성에 필요한 값은 typed column으로 둔다.
- 확장 가능한 분석 결과나 알고리즘별 부가 payload에만 `jsonb`를 검토한다. `jsonb` 내부 구조도 application schema로 검증하고 algorithm version을 함께 저장한다.
- primary key, account foreign key, `NOT NULL`, nonnegative count `CHECK`와 필요한 `UNIQUE`를 database에 둔다.
- 사용 횟수는 `SET direct_copy_count = direct_copy_count + 1`처럼 한 SQL statement에서 원자적으로 증가시킨다. 합계는 직접 횟수와 누적 횟수에서 계산하고 별도 중복 column으로 저장하지 않는다.
- 메모 수정은 `WHERE id = $id AND account_id = $accountId AND revision = $expectedRevision` 조건으로 update하고 revision을 같은 statement에서 증가시킨다. 영향받은 row가 없으면 충돌 또는 권한 오류를 구분 가능한 use case 결과로 처리한다.
- HTTP Route Handler를 사용하면 note revision을 strong ETag로 표현하고 `If-Match` 실패에 412를 반환하는 방식을 검토한다. Server Action도 같은 domain revision 검사를 공유한다.
- Serializable 또는 Repeatable Read가 필요하면 serialization failure 전체 transaction 재시도 책임과 최대 횟수를 정한다. isolation level을 높였다는 이유로 재시도를 생략하지 않는다.
- network 요청, clipboard 작업과 worker 계산을 database transaction 안에서 기다리지 않는다. 무결성에 필요한 database 작업만 transaction에 포함한다.

안티패턴:

```ts
const usage = await queries.getUsage(noteId)

await commands.updateUsage(noteId, {
  directCopyCount: usage.directCopyCount + 1,
  totalCopyCount: usage.totalCopyCount + 1,
})
```

권장 패턴:

```sql
UPDATE note_usage
SET direct_copy_count = direct_copy_count + 1
WHERE account_id = $1 AND note_id = $2
RETURNING direct_copy_count, accumulated_copy_count;
```

```sql
UPDATE notes
SET text = $1,
    revision = revision + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $2
  AND account_id = $3
  AND revision = $4
RETURNING id, revision, text, updated_at;
```

권장 패턴은 count 증가와 revision 검사를 database가 한 statement로 판정하게 하므로 application의 read-modify-write 창을 없앤다. 여러 row의 불변 조건이 필요하면 transaction과 적절한 lock 또는 isolation을 별도로 설계해야 한다.

### 검증

schema와 migration 리뷰에서 column type, nullability, foreign key, check와 unique 제약을 확인한다. 같은 note에 병렬 직접 복사와 누적 복사를 보내 최종 횟수가 요청 수와 같은지 검사한다. 같은 revision으로 두 수정 요청을 보내 하나만 성공하고 다른 하나가 명시적 충돌 결과를 받는지 확인한다. lint와 단일 요청 테스트는 이 race를 검출하지 못한다.

## 검사 기준선 제안

기술 스택과 도구가 승인된 뒤 [테스트 전략](testing-strategy.md)이 정한 모듈별 검증 방식과 [테스트 안티패턴 지침](test-anti-patterns.md)이 정한 assertion 및 selector 기준을 사용해 다음 순서로 가장 싼 검사부터 구성한다. 현재는 실행할 명령이 없으므로 명령 이름을 추정하지 않는다.

- TypeScript compile: `strict`, 외부 입력의 `unknown`, worker message union과 client module의 server-only import 방향
- Zod schema 검사: form input과 output, worker message와 IndexedDB record
- 정적 분석: hooks dependency, effect 안의 동기 state 변경, FSD layer 및 public API 우회, client module의 server-only import와 composition root 밖의 generic locator import
- TDD 단위 검사: 승인된 schema 경계, command 및 이력, 사용 빈도 규칙, 분석 알고리즘, 템플릿 생성과 오래된 Worker response 폐기
- 외부 동작 기준 브라우저 검사: IndexedDB transaction, upgrade, `blocked`, `versionchange`, quota와 새로고침 보존
- 실제 browser 검사: Strict Mode의 effect cleanup, clipboard 권한, Dedicated Worker lifecycle 및 form render 비용
- 접속 주소별 build와 browser 검사: 로컬 UI에 계정 기능이 없고 같은 독립 실행용 결과물이 HTTPS와 localhost HTTP에서 동작하는지 확인

최우선 계정 및 동기화 백로그를 시작하면 다음 검사를 추가한다.

- Zod schema 검사: Server Action, Route Handler와 mutation variable
- 단위 검사: cache tag와 query key 생성 및 revision conflict 결과
- database 통합 검사: constraint, atomic count, 병렬 update와 transaction 재시도
- 실제 browser 검사: 계정별 cache 격리, hydration 직후 요청 수, mutation별 pending 상태와 동기화 충돌
- 실행 형태별 build와 browser 검사: 로컬 UI에 계정 기능이 없고 계정 실행 형태가 공통 화면을 사용하는지 확인

라이브러리 제공 백로그를 시작하면 다음 검사를 추가한다.

- 제공 형태별 build와 browser 검사: 독립 실행 host와 portfolio host가 같은 library entry를 조립하는지 확인
- package 검사: 공개 entry와 declaration의 일치, `'use client'` 보존, React 단일 사본, CSS 범위와 Worker asset

정적 규칙을 추가할 때에는 위반 예시와 정상 예시가 실제로 구분되는지 먼저 검사한다. 인증, authorization, cache freshness, transaction lifetime, browser 권한, 사용자 경험과 성능은 lint로 판정하지 않는다.

## 출처와 고정 사례

공식 자료는 2026년 8월 30일에 다시 확인했다.

- [Next.js v16.3.3 release](https://github.com/vercel/next.js/releases/tag/v16.3.3)와 해당 release의 [Project Structure](https://github.com/vercel/next.js/blob/a9a1cb7859f178f830ad3773b303130c21b19586/docs/01-app/01-getting-started/02-project-structure.mdx), [Server and Client Components](https://github.com/vercel/next.js/blob/a9a1cb7859f178f830ad3773b303130c21b19586/docs/01-app/01-getting-started/05-server-and-client-components.mdx), [CSS](https://github.com/vercel/next.js/blob/a9a1cb7859f178f830ad3773b303130c21b19586/docs/01-app/01-getting-started/11-css.mdx), [Server and Client Boundary](https://github.com/vercel/next.js/blob/a9a1cb7859f178f830ad3773b303130c21b19586/docs/01-app/02-guides/server-and-client-boundary.mdx), [Fetching Data](https://github.com/vercel/next.js/blob/a9a1cb7859f178f830ad3773b303130c21b19586/docs/01-app/01-getting-started/06-fetching-data.mdx), [Caching](https://github.com/vercel/next.js/blob/a9a1cb7859f178f830ad3773b303130c21b19586/docs/01-app/01-getting-started/08-caching.mdx), [Revalidating](https://github.com/vercel/next.js/blob/a9a1cb7859f178f830ad3773b303130c21b19586/docs/01-app/01-getting-started/09-revalidating.mdx), [Route Handlers](https://github.com/vercel/next.js/blob/a9a1cb7859f178f830ad3773b303130c21b19586/docs/01-app/01-getting-started/15-route-handlers.mdx), [`transpilePackages`](https://github.com/vercel/next.js/blob/a9a1cb7859f178f830ad3773b303130c21b19586/docs/01-app/03-api-reference/05-config/01-next-config-js/transpilePackages.mdx), [Data Security](https://github.com/vercel/next.js/blob/a9a1cb7859f178f830ad3773b303130c21b19586/docs/01-app/02-guides/data-security.mdx), [Environment Variables](https://github.com/vercel/next.js/blob/a9a1cb7859f178f830ad3773b303130c21b19586/docs/01-app/02-guides/environment-variables.mdx)
- React 19.2 [hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot), [useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore), [useEffect](https://react.dev/reference/react/useEffect), [Effect가 필요하지 않을 수 있는 경우](https://react.dev/learn/you-might-not-need-an-effect), [`exhaustive-deps`](https://react.dev/reference/eslint-plugin-react-hooks/lints/exhaustive-deps), [`set-state-in-effect`](https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect), [useContext](https://react.dev/reference/react/useContext), [Context 사용 전 고려 사항](https://react.dev/learn/passing-data-deeply-with-context#before-you-use-context), [중복 React 경고](https://react.dev/warnings/invalid-hook-call-warning#duplicate-react)
- Node.js 26.8.1 [package entry point와 `exports`](https://nodejs.org/api/packages.html#package-entry-points), npm [peer dependency](https://docs.npmjs.com/files/package.json/#peerdependencies)와 TypeScript 7.0.2 [package `exports` resolution](https://www.typescriptlang.org/docs/handbook/modules/reference#packagejson-exports). Node.js와 npm 문서는 package 형식 조사 기준이며 runtime 채택 버전이 아니다.
- [TypeScript의 erased types](https://www.typescriptlang.org/docs/handbook/typescript-from-scratch.html#erased-types), [strict](https://www.typescriptlang.org/tsconfig/strict.html), [noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html), [exactOptionalPropertyTypes](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html), [moduleSuffixes](https://www.typescriptlang.org/tsconfig/moduleSuffixes.html)
- React Hook Form 문서 고정 revision `e739aea`: [useForm](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/useform.mdx), [watch](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/useform/watch.mdx), [useWatch](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/usewatch.mdx), [formState](https://github.com/react-hook-form/documentation/blob/e739aea29ff1f13a272b3aae99e9af257e218e6a/src/content/docs/useform/formstate.mdx)
- [Zod 4 Basic usage](https://zod.dev/basics)와 [Zod 4 schema API](https://zod.dev/api)
- TanStack Query 5.102.8 [release](https://github.com/TanStack/query/releases/tag/release-2026-08-27-1607)와 고정 revision `2969edf`: [Advanced Server Rendering](https://github.com/TanStack/query/blob/2969edf32f7e0c48e2a108d84712d6e01edfde21/docs/framework/react/guides/advanced-ssr.md), [Mutations](https://github.com/TanStack/query/blob/2969edf32f7e0c48e2a108d84712d6e01edfde21/docs/framework/react/guides/mutations.md), [Optimistic Updates](https://github.com/TanStack/query/blob/2969edf32f7e0c48e2a108d84712d6e01edfde21/docs/framework/react/guides/optimistic-updates.md), [useMutation](https://github.com/TanStack/query/blob/2969edf32f7e0c48e2a108d84712d6e01edfde21/docs/framework/react/reference/useMutation.md), [useMutationState](https://github.com/TanStack/query/blob/2969edf32f7e0c48e2a108d84712d6e01edfde21/docs/framework/react/reference/useMutationState.md)
- FSD 문서 고정 revision `a6b69ae`: [Layers](https://github.com/feature-sliced/documentation/blob/a6b69ae21d571d64b0387ff261b95477165030b2/src/content/docs/docs/reference/layers.mdx), [Public API](https://github.com/feature-sliced/documentation/blob/a6b69ae21d571d64b0387ff261b95477165030b2/src/content/docs/docs/reference/public-api.mdx), [Next.js와 함께 사용하기](https://github.com/feature-sliced/documentation/blob/a6b69ae21d571d64b0387ff261b95477165030b2/src/content/docs/docs/guides/tech/with-nextjs.mdx)
- JS Boundaries 7 계열의 [element 분류](https://www.jsboundaries.dev/docs/classification/elements/), [의존성 규칙](https://www.jsboundaries.dev/docs/rules/dependencies/), [selector](https://www.jsboundaries.dev/docs/selectors/)와 [설정](https://www.jsboundaries.dev/docs/settings/), 그리고 `@boundaries/eslint-plugin` 7.2.0의 [공식 저장소](https://github.com/javierbrea/eslint-plugin-boundaries)
- WHATWG [HTML Web Workers](https://html.spec.whatwg.org/multipage/workers.html), [structured clone과 transferable](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializewithtransfer), [Storage Standard](https://storage.spec.whatwg.org/)
- W3C [Indexed Database API 3.0](https://w3c.github.io/IndexedDB/), [Clipboard API and events](https://www.w3.org/TR/clipboard-apis/), [Secure Contexts](https://www.w3.org/TR/secure-contexts/)
- IETF [RFC 9110 If-Match](https://httpwg.org/specs/rfc9110.html#field.if-match)
- PostgreSQL 18 [constraints](https://www.postgresql.org/docs/18/ddl-constraints.html), [JSON types](https://www.postgresql.org/docs/18/datatype-json.html), [transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html), [INSERT ON CONFLICT](https://www.postgresql.org/docs/18/sql-insert.html)
- Alistair Cockburn, [Hexagonal Architecture 원문](https://alistair.cockburn.us/hexagonal-architecture)
- Martin Fowler, [Dependency Injection과 Service Locator 비교](https://martinfowler.com/articles/injection.html)

오픈소스 애플리케이션의 실패와 변경 이유는 다음 병합 commit에서 확인했다.

- Cal.com hydration 오류: [PR #20312](https://github.com/calcom/cal.diy/pull/20312), [0eb4e6c](https://github.com/calcom/cal.diy/commit/0eb4e6c7d439ef55e6da89d26be452325670ef8f)
- Cal.com cache read-your-own-writes 회복: [PR #28892](https://github.com/calcom/cal.diy/pull/28892), [f4edb69](https://github.com/calcom/cal.diy/commit/f4edb696c0329153cedcdb71521b89dbe97d80e3)
- Cal.com Zod 입력 형식 검증: [PR #26976](https://github.com/calcom/cal.diy/pull/26976), [c43c48b](https://github.com/calcom/cal.diy/commit/c43c48b1a8338f6f06ed074d1306bf4855e95c67)
- Cal.com 동시 booking race 재현: [PR #22170](https://github.com/calcom/cal.diy/pull/22170), [179a547](https://github.com/calcom/cal.diy/commit/179a547bd08d05f487cd2117de51a1db3b373283)
- Sentry 파생 상태 effect 제거: [PR #115146](https://github.com/getsentry/sentry/pull/115146), [38a5ba3](https://github.com/getsentry/sentry/commit/38a5ba35c43bffdf3ebdecff65a224645ae3153a)
- OpenStatus SSR query hydration 보완: [PR #44](https://github.com/openstatusHQ/data-table-filters/pull/44), [4bb3cdb](https://github.com/openstatusHQ/data-table-filters/commit/4bb3cdb1cf93c0370435c6dcb0edc9ce5e7f225b)
- Neondeck mutation별 진행 상태 분리: [PR #315](https://github.com/pandemicsyn/neondeck/pull/315), [bedbb8c](https://github.com/pandemicsyn/neondeck/commit/bedbb8c804094fef1cd91fadb10cb529a2f942a5)
- Webiny Service Locator 제거와 직접 DI: [PR #5387](https://github.com/webiny/webiny-js/pull/5387), [573e347](https://github.com/webiny/webiny-js/commit/573e347c7ab5f027b9c367dd133b2469b9d97e1e)
- FSD 환경별 public API 지침: [PR #924](https://github.com/feature-sliced/documentation/pull/924), [4f5ae68](https://github.com/feature-sliced/documentation/commit/4f5ae6875bb53b3b0a72ddaa527002ba8d86dd6a)
- FSD Next.js layer 이름 구분: [PR #927](https://github.com/feature-sliced/documentation/pull/927), [4c6bf39](https://github.com/feature-sliced/documentation/commit/4c6bf392db230c710e8183f423108ca503f0053a)
- Vercel Analytics client entry directive 보존: [PR #37](https://github.com/vercel/analytics/pull/37), [554bb2c](https://github.com/vercel/analytics/commit/554bb2c6e0ee6e30cf6f576ccd820cbcc8a37af3)
- Actual Budget SharedWorker 탭 조정: [PR #7172](https://github.com/actualbudget/actual/pull/7172), [4f7c3c5](https://github.com/actualbudget/actual/commit/4f7c3c51a58fc4e70b8d2d79bf80397d3235392b)
- Actual Budget persistent storage 요청: [PR #8667](https://github.com/actualbudget/actual/pull/8667), [4dedf88](https://github.com/actualbudget/actual/commit/4dedf88e58a5c92478ac1d8eb909d216b242a59f)
