# 메모 앱의 기능별 의존성 연결과 화면 보존 조사

기능별 Provider가 외부 구현을 선택하고 UI는 필요한 동작만 사용하는 구성이 적합하다. 다만 Provider를 모두 페이지 안으로 옮기면 화면 이동에서 유지하던 자료가 사라질 수 있다. 정의 위치를 기능 가까이 옮기는 작업과 마운트 수명을 바꾸는 작업을 구분하고, 현재 수명을 먼저 보존하는 단계적 변경을 권한다.

이 조사는 [구조 개선 요구사항](../requirements.md#기능과-화면을-보존하는-코드-구조-개선)의 구현 및 테스트 재구성에 사용한다. 2026-11-07의 브랜치 소스와 제공된 React/Next.js UI 책임 분리 문서, 아래 공식 자료를 비교했다. 소스에서 확인한 사실과 이후 적용할 제안을 구분하며, 실행하지 않은 화면이나 성능의 개선을 입증한 것으로 보지 않는다.

## 현재 파일 구성과 이전 위치

현재 파일 구성과 이전 위치는 다음과 같다. 뒤의 파일별 기록은 변경 전 `1d5efe3`의 동작과 유지 이유를 설명한다. 저장 스키마, 본문 CRDT 규칙, 모바일 순서와 삭제 복원 정책은 구조 개선에서 바꾸지 않았다.

### 공유 DB와 앱 조합

`src/shared/lib/indexed-db/connection.ts`는 연결 및 상태 알림 타입을 정의한다. `connection-context.ts`는 같은 DB 연결을 읽고 `composition.browser.ts`는 앱에서 Context를 제공할 때만 사용한다. 순수 타입은 `index.ts`, 브라우저 접근은 `index.browser.ts`로 구분한다. `src/_app/providers/database-provider.tsx`가 연결 생성과 종료를 맡으며 기존 `use-database.ts`를 대체한다.

`src/_app/index.server.ts`는 서버 화면 틀과 본문 이동 링크를, `index.browser.ts`는 클라이언트 Provider 및 접속 확인을 내보낸다. 각 페이지의 UI 진입점도 `index.browser.ts`로 구분한다. route에서만 앱의 두 진입점을 읽는다.

`personal-notes-provider.tsx`는 내부 페이지 이동에서 유지할 Provider의 순서를 조합한다. 저장소, Clipboard와 시계의 구현 선택은 각 slice의 `api` 모듈로 옮겼다. `src/_app/composition/batch-copy-selection.tsx`는 일괄 복사 삭제 성공을 메모 선택 해제와 연결하므로 앱 조합에 남는다. DB 이전과 버전 변경 처리는 기존 IndexedDB 코드에 유지한다.

### 메모 명령과 편집 수명

`src/_pages/notes/api/use-browser-note-data.ts`가 기존 앱의 `use-note-services.ts`를 대체한다. `model/note-commands.ts`가 단일 큐, 최신 메모 참조와 저장 명령을 관리하고 `note-changes.ts`가 창 간 메시지를 검증한다. `use-notes-data-model.ts`는 구독, 초기 조회의 늦은 완료 판정과 편집 잠금을 관리한다. `notes-data-context.ts`는 변하는 목록 상태와 같은 참조를 유지하는 명령을 구분한다.

`notes-data-provider.tsx`는 브라우저 구현을 선택하고 `test-notes-data-provider.tsx`는 같은 모델에 검사할 외부 동작을 연결한다. 테스트 전용 Provider의 호출자는 기존 Provider 및 상세 편집 검사뿐이다. UI 진입점은 `index.browser.ts`, 앱 조합은 `composition.browser.ts`다. 이전 앱 전달 컴포넌트와 메모 전용 저장 알림 타입은 제거했다.

### 일괄 복사, 설정과 보조 화면

`features/add-note-to-batch-copy`와 `features/edit-batch-copy`의 명령, 모델, UI 및 검사는 `features/batch-copy`로 합쳤다. 같은 저장 목록에 대한 단일 큐와 세션을 유지하고 모바일 임시 목록의 수명은 따로 유지한다. `api/use-browser-batch-copy.ts`와 `use-browser-mobile-batch-copy.ts`가 구현을 고른다. `model/batch-copy-provider.tsx`, `mobile-batch-copy-provider.tsx`와 `batch-copy-removals.ts`가 각각 저장 목록, 모바일 작업과 삭제 성공 알림을 관리한다. 전달만 하던 이전 Provider 두 개와 앱 연결 컴포넌트는 제거했다.

설정의 공유 상태와 Provider는 `entities/preference/model`로 옮겼고 `api/use-browser-preferences.ts`가 연결을 선택한다. 폼은 `_pages/settings`에 유지한다. 분석과 템플릿은 각 slice의 `api/use-browser-analysis.ts`, `use-browser-templates.ts`가 구현을 고르고 `composition.browser.ts`에서 앱에 필요한 Provider만 내보낸다. 분석 테스트도 `test-text-analysis-provider.tsx`를 통해 운영 모델을 실행한다. Worker는 한 분석 인스턴스에서 재사용하고 Provider 종료 시 정리한다.

### 카드, 상세 편집과 패널

`note-card.tsx`는 한 카드의 편집과 제스처를 유지한다. `model/note-card-context.ts`를 통해 `ui/note-card-header.tsx`, `note-card-body.tsx`, `note-resize-handles.tsx`가 같은 카드의 상태와 동작을 읽는다. 상태 표시등, 폼 등록, 선택 및 조합 입력 이벤트와 크기 조절 이벤트는 기존 요소에 유지한다. Command 키 구독은 `use-note-selection-keys.ts`의 기존 목록 수명에 남는다.

`ui/note-detail-layout.tsx`는 children을 사용하는 상세 화면의 틀이다. `deleted-note-detail.tsx`와 `unsaved-changes-dialog.tsx`는 각각 삭제 안내 및 복원과 미저장 이탈을 맡는다. 각 모달의 초기 포커스, 취소와 복귀 대상을 합치지 않았다. `model/batch-copy-panel-dimensions.ts`는 패널 너비의 같은 제한값을 통합한다. `batch-copy-workspace.tsx`는 실제 표시 중인 패널에만 목록 본문을 마운트한다.

### 테스트 파일과 유지한 코드

`e2e/notes.spec.ts`에는 초기 실행과 접속 주소 검사를 남겼다. 생성은 `notes-creation.spec.ts`, 저장은 `notes-autosave.spec.ts`, 모바일 편집과 이탈은 `notes-mobile-editing.spec.ts`, 보드 조작 검사는 `notes-board.spec.ts`로 구분한다. `support/note-content.ts`, `replay-sequence.ts`, `visible-box.ts`는 여러 검사에서 실제로 사용하는 원문 생성기, 축소 실패 읽기와 화면 좌표 읽기다. 키보드 속성 열기는 기존 `run-note-action.ts`에 합쳤다. 각 파일에서 초기 페이지 준비와 BrowserContext 정리, 기존 단언 및 실패 재현을 유지한다.

그 밖의 엔티티 저장 및 순수 규칙, 공통 UI, 탐색과 이탈 확인, 분석 알고리즘, 템플릿 편집 규칙, 디자인 토큰과 배포 설정은 최초 분석에서 확인한 역할을 유지한다. 이름만 맞추기 위해 이 구현들을 다시 작성하지 않는다. 변경된 호출자는 새 진입점을 사용하며 이전 위치에 호환 재수출을 남기지 않는다.

## 파일별 분석 기록

아래는 `1d5efe3`의 소스에서 확인한 기능과 유지 이유다. 파일 이름은 `apps/notes`를 기준으로 한다. 같은 항목의 파일은 함께 동작하는 모듈이며 각각 본문을 확인했다. 아직 기록하지 않은 파일은 전체 분석 완료에 포함하지 않는다. 기존 주요 연결 조사와 전체 파일 분석을 구분한다.

### 메모 본문, 배치와 삭제 이력

확인한 파일은 `src/entities/note`의 `index.ts`, `index.browser.ts`, `model/note.ts`, `note-body.ts`, `note-geometry.ts`, `note-order.ts`, `mobile-note-order.ts`, `note-removal-history.ts`와 각각의 `.test.ts`, `note-lifecycle.model.test.ts`다. 저장 구현은 `api/stored-note.ts`, `indexed-db-note-repository.ts`, `indexed-db-mobile-note-order-repository.ts`에서 확인했다.

본문 문자열과 저장된 Yjs 상태는 같은 메모 객체를 키로 하는 WeakMap으로 연결된다. 문자열이 같아도 CRDT 변경분이 다를 수 있으므로 분석 원문 식별에는 저장 상태의 해시를 사용한다. 메모를 임의로 복제하면 이 연결이 사라진다. 저장소는 배치를 바꾸거나 조회한 메모 객체에 본문 상태를 다시 연결한다.

본문 쓰기는 같은 원본과 입력에 대한 재시도에서 변경분 ID를 재사용한다. 같은 키에 다른 바이트를 쓰면 거절한다. 복원할 때 만든 식별값은 Yjs 메타데이터에 있으며 삭제 전의 본문 및 배치 쓰기를 거절하는 데 사용한다. 메모 테이블에 수정 횟수를 추가하는 방식이 아니다. 변경분 64개부터 진행하는 정리는 별도 트랜잭션이며 본문 저장 성공을 취소하지 않는다.

이미 열린 편집 화면은 메모 ID별 공유 Web Lock을 유지한다. 삭제는 잠금이 있으면 저장된 본문만 보관한다. 마지막 편집 화면이 잠금을 풀면 보관한 본문을 지운다. 초기 전체 조회에서도 잠금이 없는 삭제 자료를 정리한다. 3단계에서 연결과 명령을 분리할 때 이 수명과 복원 이후의 오래된 쓰기 거절을 보존한다. [Web Locks 설명](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)의 같은 origin 내 잠금 조건을 사용하며 다른 프로필의 동기화로 확대 해석하지 않는다.

모바일 순서는 위치 인덱스에서 ID만 읽는다. 이동 트랜잭션은 시작 시 보이던 메모의 상대 순서를 최신 값과 비교한다. 새 메모만 추가된 경우에는 기존 메모의 이동을 반영한다. 두 위치 사이에 수를 배정할 수 없으면 위치를 다시 배분한다. 삭제 취소는 남아 있는 이웃을 기준으로 삽입한다. 데스크탑 겹침 순서와 Tab 순서는 별도로 유지한다.

순수 검사는 CRDT의 중복 및 역순 수신, 부분 삭제와 이모지 교체, 배치 값 검사, 앞뒤 이동에서 원문과 Tab 순서가 보존되는지 검사한다. 삭제 이력은 최근 삭제부터 복원하고 마지막 알림이 만료되면 이전 삭제를 다시 알리지 않는다. 생성형 생명 주기 검사는 복원된 겹침 값을 바꾸는 결함도 검출한다. 실제 DB 트랜잭션과 잠금 검사는 별도로 확인해야 하므로 이 검사들만으로 저장소 전체를 검증했다고 판단하지 않는다.

### 메모 조회, 자동 저장과 편집 이력

확인한 파일은 `src/_pages/notes`의 `composition.ts`, `model/notes-data-provider.tsx`, `use-notes-data-model.ts`, `notes-data-provider.browser.test.tsx`, `save-note-content.ts`, `save-note-content.test.ts`, `note-content-save-state.ts`, `note-content-save-state.test.ts`, `note-content.model.test.ts`, `use-note-content-autosave.ts`, `use-note-card-editor.ts`, `use-note-detail-editing.ts`, `note-edit-history.ts`, `note-edit-history.test.ts`, `use-note-edit-history.ts`다.

조회 모델은 변경 명령과 창 간 알림을 한 큐에서 처리한다. 초기 조회 및 재조회에는 요청 순번을 사용해 오래된 결과를 무시한다. 쓰기 실패 후에도 큐의 다음 작업은 실행한다. 원격 삭제를 받으면 편집 화면에 보관된 본문을 전달한 뒤 목록에서 제거한다. 원격 편집을 받으면 저장소에서 메모를 다시 읽는다. 3단계에서 큐와 알림을 분리해도 명령마다 새 큐를 만들거나 알림 본문을 저장 원문처럼 사용하지 않는다.

자동 저장은 800ms 뒤 실행하고 실패하면 최대 30초 간격까지 재시도한다. 최신 입력의 저장이 끝날 때까지 대기 표시를 유지한다. 조합 입력 중에는 저장을 멈추며 원격 본문을 폼에 적용하지 않는다. 원격 본문 수신은 현재 폼이 기존 본문과 같고 수신 상태가 기존 변경분을 포함할 때만 진행한다. 선택 구간은 Yjs 상대 위치로 옮긴다. [Yjs 변경분 문서](https://docs.yjs.dev/api/document-updates)의 중복 및 순서 독립성은 이 상태를 보존할 때 활용할 수 있다.

데스크탑 편집은 blur와 종료 시 저장한다. 모바일 편집은 이탈 확인 뒤 입력을 버릴 수 있어 unmount에서 저장을 멈춘다. 두 화면 모두 pagehide와 숨김 전환에는 저장을 시도한다. 이를 같은 종료 정책으로 통합하면 버리기로 한 입력이 저장될 수 있다.

편집 이력은 연속 입력과 삭제를 묶고 붙여넣기 및 조합 입력을 별도로 기록한다. 저장 완료는 이력을 지우지 않는다. 원격 본문을 반영할 때 자신의 Undo 및 Redo 위치를 다시 계산한다. 단위 검사는 내용과 선택 구간의 복원 및 새 입력 이후 Redo 제거를 보호한다. 원격 입력이 섞인 이력의 전체 보존 여부는 실제 여러 창 검사까지 대조한다.

기존 Provider 브라우저 검사는 이전 조회가 늦게 완료되는 경우와 첫 저장 중 추가한 내용의 저장을 이미 보호한다. 상세 화면 브라우저 검사도 실패 뒤 새 입력, 사용자 조작 없는 재시도, 최신 입력 완료 전 상태 표시와 조합 중 이전 저장 완료를 검사한다. 이 사례에는 새 TDD를 중복 적용하지 않는다. 테스트 Provider로 연결을 옮겨도 실제 자동 저장 모델과 입력기를 실행해야 한다.

### 모바일 편집 상태와 이탈

확인한 파일은 `src/_pages/notes/model/use-note-detail-navigation.ts`, `ui/note-detail-page.tsx`, `note-detail-page.browser.test.tsx`, `note-status-light.tsx`다.

편집 화면은 children으로 헤더와 상태 및 본문을 구성한다. 저장 상태 변경으로 textarea의 key를 바꾸지 않는다. 삭제되면 당시 보이던 본문을 비활성화된 입력기에 남기되 복원에는 저장된 본문만 사용한다. 삭제 안내는 상태 버튼을 눌러야 열리며 너비와 높이를 제한한 dialog다. 복원 실패는 현재 화면에 남는다.

미저장 이탈 확인은 계속 편집 버튼에 처음 포커스를 준다. Escape나 계속 편집은 입력기로 포커스를 돌려준다. 나가기는 저장 예약을 멈춘 뒤 보류한 이동을 실행한다. 삭제 안내와 이탈 확인은 초기 포커스 및 취소 동작이 다르므로 5단계에서 무리하게 같은 모달 동작으로 통합하지 않는다. 현재 테스트의 DOM 조합 이벤트는 실제 휴대전화 IME 검증을 대신하지 않는다.

### 메모 선택과 화면 수명

확인한 파일은 `src/_pages/notes/model/use-note-session-state.ts`, `note-session-provider.tsx`, `note-workspace-state.ts`, `use-note-workspace.ts`, `use-note-selection-keys.ts`, `use-create-note.ts`, `use-linked-note.ts`다.

앱 수명의 선택 및 삭제 이력은 상태 Context와 명령 Context로 구분된다. 메모 선택과 일괄 복사 항목 선택은 서로 다른 값이다. 속성 저장 완료는 저장을 시작할 때의 대상 ID와 배치가 여전히 일치할 때만 대상을 갱신한다. 선택한 메모나 속성 편집 대상이 아닌 메모를 삭제해도 현재 선택과 패널은 유지한다.

키 조작은 실제 이벤트의 Command 상태와 Escape를 확인한다. Command를 누를 때 헤더 동작에 있던 포커스는 카드로 옮긴다. 새 메모는 데스크탑에서 선택하고 입력기에 포커스를 주지만 모바일에서는 목록에 추가한다. 해시로 지정한 메모는 자료를 읽은 뒤 한 번 선택하며 잘못된 인코딩은 무시한다. 3단계와 5단계에서 이 동작을 유지하고 단순 상태 전달만 하는 부분을 정리한다.

### 데스크탑 카드와 캔버스

확인한 파일은 `src/_pages/notes/index.ts`, `ui/notes-start-page.tsx`, `notes-collection.tsx`, `notes-board.tsx`, `notes-board-controls.tsx`, `note-card.tsx`, `model/use-note-card-actions.ts`, `use-note-geometry-gesture.ts`, `use-note-workspace-layout.ts`, `board-view.ts`, `board-view.test.ts`, `use-notes-board-view.ts`다.

원격 삭제 구독과 토스트는 보드에서 한 번 연결한다. 카드마다 이 훅을 실행하면 알림이 반복될 수 있다. 카드의 복사와 일괄 복사는 현재 입력을 읽고 삭제는 먼저 자동 저장 완료를 기다린다. 저장 중 이동과 크기 조절을 막는 조건, Command 조작에서 선택 표시와 버튼을 숨기는 조건을 5단계에서 보존한다. 헤더, 본문과 크기 조절을 나누더라도 같은 편집기와 제스처 상태를 사용해야 한다.

카드 이동량은 화면 배율로 나누어 저장하며 크기 변경은 반대쪽 모서리를 유지한다. Escape, 숨김, resize와 포인터 취소는 미리보기를 버린다. 캔버스 이동과 확대는 화면 상태만 바꾸고 저장 배치를 바꾸지 않는다. 이미 보이는 메모는 포커스만으로 이동하지 않으며 화면 밖이나 제어 버튼에 가려진 메모만 드러낸다. 순수 검사는 확대 기준점 유지와 포커스 메모 표시를 보호한다. 반응형 전환은 창 너비가 아닌 실제 보드 컨테이너 너비와 글자 크기를 사용한다.

### 속성 입력과 패널 전환

확인한 파일은 `src/_pages/notes/model/use-note-properties-form.ts`, `note-properties-form-provider.tsx`, `use-note-properties-sync.ts`, `use-note-properties-panel.ts`, `note-workspace-state.test.ts`, `ui/note-properties-panel.tsx`다. 일괄 복사 패널과 연결되는 `api/panel-width-storage.ts`, `model/use-batch-copy-panel.ts`, `use-batch-copy-panel-width.ts`, `use-batch-copy-workspace.ts`, `ui/batch-copy-workspace.tsx`, `batch-copy-panel-resize.tsx`도 확인했다.

속성 입력은 RHF에서 유지한다. 저장된 배치가 바뀌어도 수정 중인 필드는 덮지 않는다. blur, Enter, 패널 밖 포인터 조작과 닫기에서 입력을 적용한다. 잘못된 입력이나 저장 실패가 있으면 닫기를 완료하지 않는다. 저장 완료 전에 입력이 달라지면 현재 값을 유지한다. 전체 form을 Props로 옮기지 않고 이 입력 수명을 보존한다.

넓은 화면에서는 옆 패널을 사용하고 중간 폭에서는 모달로 전환한다. 모달에서 첫 Escape는 선택만 해제하고 다음 Escape는 패널을 닫는다. 저장 목록 추가 시 옆 패널은 열지만 모달은 자동으로 열지 않는다. 패널 너비는 localStorage에 저장하며 화면을 줄여도 선호 너비를 별도로 보존한다. 너비 제한값이 저장 도구, 훅과 UI에 반복되므로 5단계에서 같은 규칙의 상수로 통합할 대상이다.

일괄 복사 패널 본문은 현재 옆 패널과 닫힌 dialog 양쪽에 렌더될 수 있다. 5단계에서는 활성 표시 위치에서만 본문을 마운트하는 구성을 검토한다. 이때 모달에서 옆 패널로 바뀌는 동안 목록 상태와 포커스, 드래그 취소가 보존되는지 기존 브라우저 과업으로 확인한다. JSX를 named Props로 옮기거나 화면별 목록 구현을 새로 만들지 않는다.

### 모바일 목록과 삭제 시트

확인한 파일은 `src/_pages/notes/model/use-mobile-note-order.ts`, `use-mobile-note-action-sheet.ts`, `use-mobile-note-long-press.ts`, `use-mobile-batch-copy-navigation.ts`, `ui/mobile-notes-workspace.tsx`, `mobile-note-card.tsx`, `mobile-note-action-sheet.tsx`, `mobile-note-action-sheet.browser.test.tsx`다.

목록은 새 메모를 앞에 표시한다. 드래그 및 저장 중 다른 창의 순서 변경 알림은 뒤로 미루고 조작 완료 후 다시 읽는다. 저장 충돌은 최신 순서를 표시하고 재조작을 안내한다. 터치 길게 누르기는 500ms 뒤 일괄 복사에 추가하며 스크롤, 영역 이탈 및 취소 뒤의 click은 복사하지 않는다. 짧게 누르기와 키보드 click은 개별 복사다. 확인 화면으로 이동할 때는 추가 큐가 끝나는 것을 기다린다.

삭제 시트는 삭제 및 복원 완료까지 닫히지 않는다. 삭제 후 시트가 열려 있는 동안 복원할 수 있으며 데스크탑의 5초 알림과 다르다. 시트가 닫히면 기존 버튼, 복원된 버튼, 다음 또는 이전 메모, 생성 버튼 순서로 포커스를 돌린다. 브라우저 검사는 지연된 삭제와 복원 중 Escape 및 닫기 제한과 완료 뒤 포커스를 보호한다. 5단계에서 공유 시트를 재사용하면서 이 명령 순서와 본문 스크롤 초기화를 유지한다.

### 개별 복사와 삭제 알림 이력

확인한 파일은 `src/_pages/notes/model/copy-note.ts`, `copy-note.test.ts`, `copy-note.model.test.ts`, `use-note-copy-action.ts`, `use-note-removal-history.ts`다.

복사는 전달받은 원문을 그대로 쓰고 클립보드 실패 사유를 보존한다. 실패 토스트의 재시도는 당시 복사하려던 메모를 사용한다. 사용 기록을 저장하는 호출은 없다. 생성형 검사는 편집과 이동 및 실패가 섞인 복사에서 원문 손실을 검사한다. 삭제 알림 이력은 완료 시각과 모바일 이웃 위치를 메모리에 저장하며 저장소 테이블로 옮기지 않는다.

### 앱 진입과 화면 연결

확인한 파일: `app/layout.tsx`, `app/page.tsx`, `app/analysis/page.tsx`, `app/batch-copy/page.tsx`, `app/settings/page.tsx`, `app/templates/page.tsx`, `app/notes/[noteId]/page.tsx`, `src/_app/index.ts`

서버 route가 화면과 프레임을 연결한다. 최상위 Provider는 내부 이동에도 유지된다. 상세 ID는 비동기 params에서 읽고 일괄 복사는 Suspense 안에서 시작한다.

2단계의 실행 환경별 진입점 변경 대상이다. 페이지별 Provider 재생성으로 기존 상태를 초기화하지 않는다.

### 화면 프레임과 본문 이동

확인한 파일: `src/_app/ui/document-page-frame.tsx`, `notes-workspace-frame.tsx`, `task-page-frame.tsx`, `skip-link.tsx`

문서 페이지는 본문 높이에 따라 늘어나고 보드 및 작업 화면은 표시 영역 높이를 사용한다. 본문 이동 링크는 `main-content`와 명시적 Tab 순서를 연결한다.

5단계에서 같은 모양의 wrapper로 통합하지 않는다. 스크롤 주체와 모바일 탐색 표시 조건이 다르다.

### 실행 주소 확인

확인한 파일: `src/_app/model/runtime-access.ts`, `runtime-access.test.ts`, `use-runtime-access.ts`, `src/_app/ui/runtime-access-guard.tsx`

안전한 HTTPS 또는 정확한 localhost HTTP 주소만 허용한다. 서버 렌더에서는 확인 중이고 hydration 뒤 브라우저 주소를 판단한다. 5개 주소 조건을 순수 함수 검사로 보호한다.

주소 조건과 빈 확인 화면을 유지한다. 구독 대상이 변하지 않는 값을 `useSyncExternalStore`로 서버 값과 구분하므로 일반 로딩 Effect로 바꾸지 않는다.

### 앱 상태와 저장 목록

확인한 파일: `src/_app/providers/personal-notes-provider.tsx`, `batch-copy-provider.tsx`, `use-batch-copy-state.ts`

저장 목록의 추가와 편집은 하나의 큐 및 세션을 공유한다. 작업 수로 pending을 유지하며 저장 성공 후에만 삭제한 항목의 선택을 해제한다. 모바일 작업은 별도 Provider다.

4단계에서 저장 목록 책임을 feature로 옮긴다. 앱에는 메모 선택 해제와 실제 기능 조합을 남긴다. 조회 재시도와 작업 종료가 앱 수명을 넘는 경우도 확인한다.

### DB 연결과 상태 구독

확인한 파일: `src/_app/composition/use-database.ts`, `indexed-db/personal-notes-database.ts`, `src/shared/lib/indexed-db/index.browser.ts`, `src/_pages/notes/model/note-storage-monitor.ts`

DB 열기 Promise와 연결을 공유한다. 세대 번호로 닫힌 뒤 도착한 연결을 폐기한다. blocked와 versionchange를 구독하고 트랜잭션 완료까지 기다린다.

2단계에서 일반 연결 타입과 구독을 Shared로 통합한다. Pages 타입에 의존하는 DB 클래스를 수정하되 연결 세대 및 재열기는 유지한다.

### 저장소 생성과 구버전 이전

확인한 파일: `src/_app/composition/indexed-db/open-personal-notes-database.ts`, `migrate-personal-notes-database.ts`, `previous-note-draft.ts`

v14 신규 저장소와 과거 버전별 이전을 실행한다. 구버전 초안은 메모 ID와 당시 본문 버전이 맞을 때만 CRDT 변경분으로 복구한다. 이전 실패는 트랜잭션을 중단한다.

앱에 남길 스키마 조합이다. 이전 입력의 `contentRevision` 검사는 현행 저장 필드가 아니므로 단순 문자열 제거 대상으로 삼지 않는다. 실제 DB 검사의 보호 조건은 아래 DB 이전 및 종료 분석에서 구분한다.

### 기능별 구현 선택

확인한 파일: `src/_app/composition/use-analysis-services.ts`, `use-batch-copy-services.ts`, `use-mobile-batch-copy-services.ts`, `use-note-services.ts`, `use-preference-services.ts`, `use-template-services.ts`, `analysis.tsx`, `mobile-batch-copy.tsx`, `note.tsx`, `preference.tsx`, `template.tsx`

기능별 저장소와 클립보드, 시계 및 ID 생성을 고정하고 Provider에 전달한다. 분석 Worker는 cleanup에서 dispose한다.

3단계와 4단계에서 각 기능으로 구현 선택을 옮긴다. 전달만 하는 컴포넌트와 서비스 묶음은 호출자 전환 후 제거한다.

### 설정 조회와 편집

확인한 파일: `src/_pages/settings/model/interaction-preferences-provider.tsx`, `use-interaction-preferences-state.ts`, `use-interaction-preferences-form.ts`, `ui/settings-start-page.tsx`, `src/entities/preference/api/indexed-db-interaction-preferences-repository.ts`, `model/interaction-preferences-record.ts`, `model/interaction-preferences-record.test.ts`

설정을 한 번 읽어 앱에서 공유한다. 저장 중 조작을 막고 실패하면 이전 값을 보존한다. 폼은 저장 결과에 따라 체크값을 되돌린다. 과거 직접 이동 옵션 누락은 false로 해석하고 시각 누락은 거절한다.

4단계에서 저장 값과 구독을 entity로 이동하고 폼은 설정 페이지에 유지한다. 현재 구현에 없는 창 간 설정 동기화를 구조 변경으로 추가하지 않는다.

### 페이지 이탈 확인

확인한 파일: `src/features/navigation-guard/model/navigation-guard-provider.tsx`, `use-browser-navigation.ts`, `use-guard.ts`

현재 이탈 확인 함수를 등록하고 브라우저 history 위치를 추적한다. 뒤로가기를 막으면 원래 위치로 돌아간 뒤 승인된 이동을 재개한다. cleanup에서는 자신이 설치한 history 함수만 복원한다.

5단계의 모바일 편집 분리에서도 동일 등록 수명과 이동 재개를 유지한다. 안정된 callback이 외부 history 연결을 반복하지 않게 하므로 이름만 보고 제거하지 않는다.

### 탐색 메뉴와 포커스

확인한 파일: `src/widgets/application-navigation/model/use-bar-navigation.ts`, `use-navigation-drawer.ts`, `ui/mobile-navigation.tsx`, `navigation-bars.tsx`, `navigation-links.tsx`, `index.ts`

Link 이동을 이탈 확인과 연결한다. Drawer는 닫힐 때 트리거에 포커스를 돌려주고 저장 목록 수가 있을 때 관리 링크를 표시한다. 사용 기록 링크는 없다.

5단계에서 탐색 대상, aria-current, 명시적 Tab 순서, Drawer 닫기와 이탈 확인의 순서를 보존한다.

### 공통 자료 처리 도구

확인한 파일: `src/shared/lib/entity-metadata/index.ts`, `clipboard/browser-clipboard-writer.ts`, `clipboard/clipboard-writer.ts`, `clipboard/clipboard-write-failure-message.ts`, `clipboard/index.ts`, `id-generation/entity-id-generator.ts`, `id-generation/index.ts`, `grapheme/index.ts`, `join-class-names/index.ts`, `algorithm-reference/index.ts`

시각의 밀리초 절삭, 클립보드 실패 사유, UUID, grapheme 분할, 정적 클래스 조합과 알고리즘 식별자를 제공한다. 클립보드 미지원 및 권한 거절은 성공으로 처리하지 않는다.

기능별 구현 선택을 옮길 때 기존 도구를 재사용한다. 알고리즘 버전은 메모 수정 횟수가 아니다. 이름에 version이 있다는 이유로 제거하지 않는다.

### 목록 순서 변경

확인한 파일: `src/shared/lib/list-reorder/index.ts`, `session.ts`, `session.test.ts`

포인터 이동 임계값, 유효한 삽입 위치와 변경 여부를 계산한다. 취소 및 자기 위치 놓기는 저장 명령을 만들지 않는다. 네 검사는 이동 결과와 다음 조작의 재개를 관찰한다.

기존 순서 명령을 재사용한다. 화면별 별도 배열 이동 알고리즘을 만들지 않는다.

### 공통 입력과 표시

확인한 파일: `src/shared/ui/button/index.tsx`, `icon-button/index.tsx`, `checkbox/index.tsx`, `checkbox/use-id.ts`, `text-field/index.tsx`, `textarea/index.tsx`, `status-notice/index.tsx`, `page-heading/index.tsx`, `drop-indicator/index.tsx`, `service-logo/index.tsx`

입력 ref와 네이티브 속성, 접근 가능한 이름, 오류 알림, 제목과 시각 토큰을 공유한다. Checkbox 설명 ID는 입력과 연결된다. 삽입선은 실제 위치가 있을 때만 표시한다.

5단계의 공통 UI 재사용 대상이다. 기능별 동일 버튼을 다시 만들지 않는다. 스타일을 합칠 때 기존 크기와 disabled 및 focus 의미를 보존한다.

### 토스트와 동작 시트

확인한 파일: `src/shared/ui/action-toast/action-toast-provider.tsx`, `action-toast-state.ts`, `action-toast.tsx`, `index.ts`, `use-action-toast-timer.ts`, `src/shared/ui/action-sheet/index.tsx`, `use-action-sheet.ts`

토스트 한 건과 종료 시각을 앱 수명으로 유지한다. hover 및 내부 포커스는 타이머를 멈춘다. 이전 토스트의 닫기는 새 토스트를 지우지 않는다. 시트는 native dialog이며 처리 중 닫기를 막을 수 있다.

토스트 revision은 저장 버전이 아닌 알림 식별자다. 삭제 및 복원 안내를 분리해도 알림 닫기, 작업 실행, 포커스 복귀와 시트 높이 유지 동작을 구별한다.

### 분석 요청과 원문 확인

확인한 파일은 `src/_pages/analysis`의 `index.ts`, `composition.ts`, `api/analysis.worker.ts`, `api/worker-text-analyzer.ts`, `api/worker-text-analyzer.test.ts`, `model/analysis-message.ts`, `analysis-message.test.ts`, `analysis-order.ts`, `analysis-rows.ts`, `analysis-run-state.ts`, `analysis-run-state.test.ts`, `analyze-text.ts`, `analyze-text.test.ts`, `grapheme-ngrams.ts`, `normalize-lines.ts`, `normalize-lines.test.ts`, `text-analysis-provider.tsx`, `text-analysis-provider.browser.test.tsx`, `use-text-analysis-state.ts`, `ui/analysis-results.tsx`, `ui/analysis-start-page.tsx`와 `e2e/analysis.spec.ts`다.

원문은 줄바꿈 위치를 보존하면서 비교용 공백, 대소문자와 NFC 정규화를 별도로 적용한다. 같은 줄, 포함 관계, grapheme 3개 단위의 Jaccard 점수 순서로 분류하고 메모 ID 및 줄 위치로 동점을 정리한다. 화면은 원문과 줄 번호를 표시하고 두 줄을 템플릿 제안으로 전달한다. 원문 자체를 정규화된 문자열로 교체하지 않는다.

Worker는 첫 분석에서 생성된다. 응답은 요청 ID, 알고리즘 식별자, 원문 식별값과 줄 내용을 검사한다. 비정상 응답이나 Worker 오류는 대기 중인 요청을 거절하고 다음 요청에서 Worker를 다시 만든다. Provider의 요청 순번은 늦게 끝난 이전 분석이 최근 분석을 덮지 않게 한다. 페이지 재진입에서 원문이 바뀌었다면 이전 분석을 숨긴다.

4단계에서는 Worker 생성과 종료를 분석 기능으로 옮기되 앱 수명은 유지한다. 6단계에서는 테스트 Provider가 운영 모델을 계속 실행하도록 연결을 바꾼다. 단위 검사의 Worker 대역은 응답 오류와 재시도를 제어한다. 브라우저 검사는 늦은 응답, 분석 중 원문 변경과 줄 누락을 검사한다. E2E는 실제 Worker 자산의 실행과 로드 실패 후 재실행 및 분석 직후 메모 화면 이동을 검사한다. 서로 다른 실패를 잡으므로 하나의 대역 검사로 통합하지 않는다.

### 템플릿 작성, 제안과 생성문

확인한 파일은 `src/entities/template`의 `index.ts`, `index.browser.ts`, `api/indexed-db-template-repository.ts`, `model/template-record.ts`, `template-record.test.ts`, `edit-segments.ts`, `edit-segments.test.ts`, `render-template.ts`, `render-template.test.ts`다. `src/features/suggest-template`의 `index.ts`, `model/suggestion.ts`, `suggestion.test.ts`, `use-selected-source-lines.ts`, `selected-source-lines-provider.tsx`도 확인했다.

`src/_pages/templates`에서는 `index.ts`, `composition.ts`, `model/template-data-provider.tsx`, `template-workspace-context.ts`, `use-template-data-state.ts`, `use-template-workspace.ts`, `use-template-authoring.ts`, `use-template-editor.ts`, `use-template-output.ts`와 `ui/saved-templates.tsx`, `selected-source-lines-preview.tsx`, `template-authoring.tsx`, `template-editor.tsx`, `template-input-form.tsx`, `template-placeholder-fields.tsx`, `template-segment-preview.tsx`, `templates-start-page.tsx`를 확인했다. 사용자 조작 검사는 `e2e/templates.spec.ts`에서 확인했다.

제안은 두 원문의 grapheme 차이를 찾아 공통 부분을 일반 텍스트로 보존한다. 같은 두 줄이나 의미 있는 공통 문자가 없는 경우에는 수동 작성으로 안내한다. 플레이스홀더의 위치는 원문 선택 구간이며 지정 뒤에는 원문을 읽기 전용으로 둔다. 이름의 공백 및 중복 오류와 일반 텍스트로 되돌리기는 현재 RHF 입력과 함께 처리한다. 저장한 템플릿은 갱신 시각 내림차순으로 표시한다. 이 정렬은 모바일 메모의 수동 순서와 별개다.

저장 목록은 앱 수명으로 유지하지만 선택한 템플릿과 생성문은 페이지 수명이다. 다른 템플릿 선택 시 ID key가 입력 폼을 초기화한다. 생성문 복사 중 새 텍스트를 생성하면 이전 복사 완료가 새 생성문 상태를 덮지 않는다. 4단계에서 저장소 연결을 옮길 때 이 차이를 보존한다. 템플릿 작성용 메모리 `TemplateDraft`는 메모 초안 테이블이 아니므로 제거 대상이 아니다.

단위 검사는 구간 겹침과 빈 선택, 원문 복원, 이름 검사, 기본값 및 grapheme 제안을 보호한다. E2E는 실제 선택 구간과 접근 가능한 설명, 잘못된 이름의 포커스, 저장 후 재조회, 생성문과 오류 해제를 검사한다. 5단계에서 폼 구성요소를 바꾸더라도 `shouldUnregister`, 선택 구간, 읽기 전용 조건과 입력 오류 연결을 유지한다. 표시가 비슷하다는 이유만으로 분석 원문 카드와 선택 원문 카드를 새 공통 카드로 합치지 않는다.

### 저장 목록과 모바일 일괄 복사

확인한 파일은 `src/entities/batch-copy`의 `index.ts`, `index.browser.ts`, `api/indexed-db-batch-copy-repository.ts`, `model/batch-copy-list.ts`, `batch-copy-list.test.ts`, `batch-copy-commands.ts`, `batch-copy-commands.test.ts`, `batch-copy-history.ts`, `batch-copy-history.test.ts`, `mobile-batch-copy-draft.ts`, `mobile-batch-copy-draft.test.ts`다.

`src/features/add-note-to-batch-copy`에서는 `index.ts`, `index.browser.ts`, `api/indexed-db-batch-copy-item-writer.ts`, `model/add-note.ts`, `add-note.test.ts`, `batch-copy-item-writer.ts`, `copy-mobile-batch-text.ts`, `copy-mobile-batch-text.test.ts`, `mobile-batch-copy-session.ts`, `mobile-batch-copy-session.test.ts`, `use-add-note.ts`, `use-mobile-batch-copy-state.ts`, `add-note-to-batch-copy-provider.tsx`, `mobile-batch-copy-provider.tsx`를 확인했다.

저장 목록은 `batches`의 `primary` 레코드이며 구분자와 추가 당시 원문을 보존한다. 항목 추가는 같은 트랜잭션에서 최신 목록을 읽고 추가한다. 목록 전체 저장과 추가는 서로 다른 API이므로 feature 통합 때 하나를 지워 대체하지 않는다. 저장 목록의 삭제 이력은 앱 메모리에서 유지되며 추가와 순서 변경은 redo만 비운다.

모바일 작업은 별도 메모리 자료이며 반복 추가마다 항목 ID를 새로 만든다. 현재 메모가 바뀌어도 이미 담은 원문은 그대로다. 추가와 편집은 한 큐에서 실행하고 확인 화면으로 이동하기 전에 flush로 대기 중인 추가를 마친다. 복사 실패 사유는 클립보드 구현에서 받은 값을 보존한다. 이 작업을 저장 목록에 통합하거나 새 DB 테이블로 옮기지 않는다.

단위 검사는 복사 원문과 구분자, 항목 삽입 위치, 삭제 복원 및 반복 추가에서 원문 보존을 검사한다. `batch-copy-commands.test.ts`와 `batch-copy-list.test.ts`에는 현재 코드에서 검사하지 않는 revision을 언급하는 테스트 제목이 남아 있다. 6단계에서 실제 검사하는 동작에 맞춰 제목을 수정하고 단언은 유지한다. 실제 DB, 편집 feature와 E2E의 보호 조건은 아래 분석에서 구분한다.

### 저장 목록 편집과 확인 화면

확인한 파일은 `src/features/edit-batch-copy`의 `index.ts`, `model/save-changes.ts`, `save-changes.test.ts`, `batch-copy-item-actions.ts`, `copy-batch-text.ts`, `copy-batch-text.test.ts`, `use-editor.ts`, `edit-batch-copy-provider.tsx`, `use-batch-copy-action-sheet.ts`, `use-batch-copy-editing.ts`, `use-batch-copy-history-shortcuts.ts`, `use-batch-copy-pointer-reorder.ts`, `use-copy-batch-text.ts`, `use-copy-batch-text-feedback.ts`, `ui/batch-copy-history-shortcuts.tsx`, `copy-batch-text-action.tsx`, `batch-copy-action-sheet.tsx`, `batch-copy-list.tsx`다.

`src/_pages/batch-copy`의 `index.ts`, `model/use-batch-copy-action-presentation.ts`, `use-batch-copy-page.ts`, `use-mobile-batch-copy-confirmation.ts`, `ui/batch-copy-start-page.tsx`, `mobile-batch-copy-confirmation.tsx`, `mobile-batch-copy-confirmation-list.tsx`와 `src/shared/lib/pointer-reorder/index.ts`도 확인했다.

저장 명령은 성공한 목록과 삭제한 항목 ID를 반환한다. 실패하면 새 세션을 반환하지 않아 기존 목록과 이력을 유지한다. 화면의 낙관적 이동 및 삭제는 저장 실패 시 되돌아가고 다시 시도할 동작을 제공한다. 단위 검사는 삭제 및 redo 성공의 항목 ID만 검사한다. 실패 시 선택 보존의 누락은 아래 생성형 검사 분석과 4단계 테스트 보완 대상으로 기록한다.

저장 목록의 포인터 이동은 패널 밖 놓기에서 삭제를 실행한다. 관리 화면은 같은 입력을 삭제로 처리하지 않는다. 모바일 확인 목록의 공통 포인터 훅은 실제 hit test와 기존 항목 ID를 기준으로 이동한다. 메모 목록에서 사용하는 추가 항목 허용 옵션은 드래그 중 새 메모 생성과 연결되므로 제거하지 않는다. 두 포인터 훅은 취소, 미리보기와 스크롤 처리가 비슷하지만 삭제 의미와 포커스 복귀 조건이 다르다. 공통화 전에 이 차이를 보호한다.

관리 화면은 컨테이너 너비와 루트 글자 크기로 메뉴와 시트를 고른다. 확인 화면은 `view=current`와 메모리 작업의 존재에 따라 표시한다. 초기화 뒤에는 빈 확인 목록을 유지하며 현재 작업이 없는 새로고침에서는 저장 목록 화면으로 바뀐다. 4단계에서 전달 전용 의존성 Props를 줄이되 페이지 선택과 각 목록의 상태 수명은 보존한다. 5단계에서는 행의 본문, 이동 핸들과 동작 메뉴를 children으로 조합할 수 있는지 확인하고 DOM 및 ref 연결을 유지한다.

### 공통 스타일과 메뉴

추가로 확인한 파일은 `src/_app/styles/tokens.css`, `globals.css`, `src/shared/ui/action-popover/index.tsx`, `use-action-popover.ts`, `src/shared/ui/reorderable-text-card/index.tsx`, `src/shared/lib/note-model-settings/index.ts`, `src/shared/lib/note-model-exploration/index.ts`다.

기본 탐색 높이, 모바일 헤더, 카드 헤더와 패널 폭은 기존 토큰을 따른다. forced-colors와 reduced-motion 규칙을 유지한다. 메뉴는 React Aria를 사용하며 dialog 안의 메뉴는 그 dialog를 Portal 대상으로 선택한다. 명령 이후 사용자가 다른 요소로 이동했다면 더보기 버튼으로 포커스를 빼앗지 않는다. 공통 재정렬 카드의 children 구성과 포인터 및 키보드 포커스 구분을 재사용한다.

모델 검사 설정과 보고 함수는 실행 횟수, seed, 축소된 행동과 관찰값을 기록한다. 6단계에서 실제 사용하는 테스트를 따라 배치할 후보이며 운영 import 유무를 확인한다. 보고서용 자료라는 이유로 삭제하거나 운영 기능의 의존성으로 옮기지 않는다.

### DB 이전, 종료와 삭제 이후 쓰기 검사

확인한 파일은 `src/_app/composition/indexed-db/previous-note-draft.test.ts`, `personal-notes-database.indexeddb.test.ts`, `note-storage.model.indexeddb.test.ts`다. 실제 IndexedDB를 열어 이전 자료와 새 연결의 조회 결과를 비교한다. 구버전 초안의 ID와 본문 버전 판정은 이전 자료 복구에만 필요하다. 현재 초안 테이블을 요구하는 검사가 아니다.

이전 검사는 CRDT 본문, 수동 순서, 정수 시각과 일괄 복사 원문을 보존하면서 이전 테이블 및 수정 횟수 필드를 제거하는지 확인한다. 잘못된 구버전 초안 때문에 이전이 중단되면 기존 자료를 유지하고, 자료를 수정한 뒤 다시 열면 한 번만 복구한다. 연결 종료와 versionchange, blocked 및 진행 중 열기 요청의 무효화도 검사한다. 2단계의 DB Provider 이동에서 같은 검사를 유지한다.

삭제 검사는 삭제 직전 저장된 본문만 복원하고, 삭제 전 편집기가 뒤늦게 보낸 본문 및 배치 변경을 복원 후에도 거절하는지 확인한다. 복원 중복 요청은 같은 메모를 만들며 이후 새 편집을 덮지 않는다. 두 모바일 편집 화면 중 하나가 떠나면 복원 자료가 남고 마지막 화면이 떠나면 정리된다. 따라서 3단계에서 이 결과를 검사하는 테스트를 다시 만들 필요가 없다.

변경분의 중복 저장, 동일 키의 다른 바이트 거절, 변경분 정리 중 추가 입력 보존과 트랜잭션 중단 시 복구도 검사한다. 새 메모 추가와 기존 메모 이동은 두 실행 순서 모두 관찰한다. 단위 검사와 실제 DB 검사는 실패 조건이 다르므로 이름이 비슷하다는 이유로 합치지 않는다. [IndexedDB 트랜잭션 설명](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)에서 설명하는 중단과 완료를 구별해 실제 저장 결과를 읽는다.

### 메모 E2E와 실제 저장 관찰

확인한 파일은 `e2e/notes.spec.ts`, `notes-model.spec.ts`와 `e2e/support`의 `create-note-through-ui.ts`, `delay-write-completion.ts`, `pointer-capture.ts`, `read-stored-note.ts`, `run-note-action.ts`, `select-text-range.ts`다.

메모 E2E는 자동 저장 시간, 이탈 중 입력 폐기, 이미 요청한 저장의 늦은 완료, 브라우저 뒤로 및 앞으로 이동 취소와 편집 이력 초기화를 구별한다. 내부 페이지 이동을 취소할 때 주소와 입력을 유지하고 승인하면 원래 목적지로 이동하는지 확인한다. 여러 창 검사는 동시 본문 병합, 선택 범위 유지, 자기 입력만 Undo하는 결과와 삭제한 창이 닫힌 뒤의 모바일 복원을 검사한다. 삭제 안내는 글자 확대에서도 화면 안에 들어오며 닫기와 Escape 이후 상태 버튼으로 포커스가 돌아가는지 확인한다.

생성형 검사는 화면과 저장소를 독립적인 예상 모델과 비교한다. 일부러 저장을 누락하거나 포인터 종료 처리를 막는 시나리오는 실패 탐지, 축소와 재현을 확인한다. 정상 실행에서도 같은 최소 행동을 다시 수행한다. 합성 pagehide 및 visibility 이벤트 검사는 실제 운영체제 종료를 확인한 증거와 구분한다.

`read-stored-note.ts`는 실제 저장 본문과 변경분을 합쳐 읽는다. `delay-write-completion.ts`는 실제 쓰기를 완료한 뒤 완료 통지만 늦춘다. 저장 없이 성공값을 돌려주는 대역으로 교체하면 늦은 완료와 이탈의 검증 목적을 잃는다. 포인터 도구는 실제 capture를 해제하며 UI 생성 도구는 화면의 생성 및 편집을 실행한다.

6단계에서는 본문 저장, 모바일 이탈과 보드 조작별로 기존 검사를 나누고 공유되는 실제 행동만 도우미로 옮긴다. 캔버스 이동 후 저장 좌표 불변, 선택 해제, 패널 전환과 삭제 토스트 수명은 해당 행동의 검사를 따라 이동한다. `notes-model.spec.ts`의 명시적 저장을 언급하는 제목은 현재 자동 저장 과업에 맞춰 고치며 검증문은 유지한다.

### 일괄 복사 E2E의 포커스와 상태 수명

확인한 파일은 `e2e/batch-copy.spec.ts`다. 저장 목록과 모바일 현재 작업을 구별하며 화면 왕복에서는 현재 작업을 유지하고 새로고침에서는 비운다. 설정을 끈 경우 저장 목록과 모바일에는 이동 버튼이 없지만 데스크탑 패널의 이동 메뉴는 유지한다. 저장 목록과 패널의 메뉴 순서도 서로 다르다.

패널 검사는 선택, 방향키 이동, 포인터 이동 취소 및 패널 밖 삭제를 구별한다. 복원한 항목의 선택은 해제되고 모달에서는 첫 Escape가 선택을 해제한 뒤 다음 Escape가 모달을 닫는다. 패널 너비 저장 거절 시 현재 크기 조절은 동작하며 재진입에서는 기본 너비를 사용한다.

이동 저장을 기다리는 동안 사용자가 다른 메모에 입력했다면 늦은 완료 뒤에도 해당 입력의 포커스를 유지한다. 메뉴의 누름 도중에는 실행하지 않고 놓은 뒤 한 번 이동 또는 삭제한다. 4단계의 상태 이전과 5단계의 본문 마운트 정리에서 이 검사를 유지한다. 패널 초기화 실패 검사는 기존 항목 보존과 재시도 성공을 확인하지만 모든 삭제 실패 시 선택 보존을 대신 입증하지는 않는다.

메뉴의 첫 표시 위치, 긴 원문의 자동 스크롤, 삽입선과 화면 확대 검사는 화면 배치 및 조작을 관찰한다. 일부 CSS 선택자는 삽입선의 좌표 관찰에 쓰인다. [Playwright의 사용자 동작 검사 권고](https://playwright.dev/docs/best-practices)에 따라 이 선택자를 새 행동 도우미의 기본 탐색 방식으로 확장하지 않는다. 화면 크기가 바뀌어도 상태를 보존할지는 [React의 상태 유지 조건](https://react.dev/learn/preserving-and-resetting-state)과 실제 마운트 위치를 함께 확인한다.

### 실행 설정, 진입점과 자산

확인한 파일은 패키지 루트의 `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `vitest.browser.config.ts`, `playwright.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `open-next.config.ts`, `wrangler.jsonc`, `test-app-revision.ts`, `README.md`, `DESIGN.md`다.

단위, 브라우저 컴포넌트와 운영 빌드 E2E의 실행 대상이 분리돼 있다. E2E는 세 브라우저 외에 클립보드와 터치 프로젝트를 구별한다. 단위 명령의 `--passWithNoTests`만으로 수집 성공을 판단하지 않고 실제 수집 건수를 보존한다. ESLint의 FSD 진입점 허용 목록과 import를 환경별 파일 이동 때 함께 수정해야 한다. Strict Mode, Webpack Worker와 현재 배포 설정은 유지하며 구조 변경을 배포로 연결하지 않는다.

`README.md`는 브라우저 저장과 실행 환경을 설명한다. `DESIGN.md`에는 현재 자동 저장과 맞지 않는 모바일 명시적 저장, 초안 및 사용 기록 설명이 남아 있다. 이 문구를 최신 요구사항보다 우선해 기능을 되살리지 않는다.

추가로 확인한 파일은 `src/shared/ui/icons/index.tsx`, `src/entities/preference/index.ts`, `index.browser.ts`, `src/features/navigation-guard/index.ts`, `src/_pages/settings/index.ts`, `composition.ts`다. 아이콘은 SVG 속성을 전달하며 장식용 표시를 유지한다. 설정 저장소의 브라우저 진입점과 이탈 확인의 Provider와 이를 읽는 훅은 실제 import 전환 대상이다. 글꼴의 `FONTLOG.txt`와 `OFL.txt`는 자산 설명 및 이용 조건이며 앱 실행 소스와 구별한다. 글꼴과 로고 바이너리는 구조 변경 대상이 아니다.

### 클립보드, 탐색과 터치 검사

확인한 파일은 `e2e/clipboard-permissions.spec.ts`, `mobile-navigation.spec.ts`, `touch-interactions.spec.ts`다. 클립보드 검사는 Chromium 권한 설정과 실제 읽기를 사용한다. 템플릿의 일반 쓰기 실패 및 늦은 완료 검사만 외부 Clipboard 호출을 대체한다. 이를 실제 클립보드 검사의 통과 근거와 구분한다. 토스트는 내부 이동, 화면 폭 변경과 교체 뒤에도 위치 및 남은 시간을 유지하며 내부 포커스와 hover 동안 사라지지 않아야 한다.

탐색 검사는 사용 기록 주소의 404, Drawer 닫기 후 포커스 복귀, 긴 보조 페이지의 문서 스크롤과 짧은 페이지의 불필요한 스크롤 방지를 보호한다. 모바일 목록의 새 메모 버튼과 확인 링크, 편집 화면의 Undo 및 Redo는 스크롤과 글자 확대에서도 접근할 수 있어야 한다. 화면 높이 변경은 실제 모바일 주소창이나 화면 키보드를 검증한 것으로 해석하지 않는다.

터치 검사는 CDP의 실제 touch 이벤트로 짧은 복사와 500ms 길게 누르기, 이동 허용량, 취소 및 capture 해제를 구별한다. 모바일 재정렬은 브라우저를 같은 프로필로 다시 실행한 뒤에도 남으며 본문, 데스크탑 배치와 Tab 순서는 유지된다. 드래그 중 다른 창의 생성은 새 메모를 맨 앞에 두면서 이동을 반영한다. 서로 다른 재정렬의 충돌은 최신 목록으로 돌아와 다시 조작할 수 있는지 검사한다.

삭제 시트는 확인, 실패 및 복원 단계에서 높이를 유지한다. 모바일 시트 복원은 5초 뒤에도 가능하며 데스크탑 토스트의 기한과 다르다. 저장 실패를 주입한 뒤 같은 시트에서 다시 시도해 원문과 배치를 복구하는 검사도 유지한다. 확인 목록의 초기화나 마지막 항목 삭제는 메모 원문 또는 저장 목록을 지우지 않는다.

### 배치, 겹침, 삭제와 선택의 생성형 검사

확인한 파일은 `e2e/notes-geometry-model.spec.ts`, `notes-order-model.spec.ts`, `notes-removal-model.spec.ts`, `notes-selection-model.spec.ts`다. 각 파일은 정상 행동과 결함 주입, 실패 행동 축소 및 seed 재현을 구별한다. 실행마다 BrowserContext를 새로 만들고 종료한다. 공통되는 ID 추출과 화면 좌표 읽기는 6단계의 도우미 통합 후보지만 예상 모델은 운영 알고리즘과 합치지 않는다.

배치 검사는 여덟 방향 크기 조절의 반대편 변, 확대 후 이동량과 저장 원문의 불변을 확인한다. 예상 이동량은 브라우저가 전달한 포인터 좌표를 관찰해 계산한다. 겹침 검사는 저장 순서와 화면 z-index뿐 아니라 겹치는 지점에서 맨 위 메모가 실제 입력을 받는지도 확인한다. Tab 순서와 본문 식별값은 바뀌지 않는다.

삭제 검사는 복원한 원문과 배치, 다음 또는 이전 메모로의 포커스 이동과 절대 만료 시각을 확인한다. 내부 페이지 왕복은 삭제 이력을 유지하고 새로고침은 이력을 지운다. 선택 검사는 선택한 메모, 현재 포커스와 속성 패널의 편집 대상을 서로 구별한다. 다른 메모를 선택하거나 선택을 해제해도 기존 속성 입력을 임의로 초기화하지 않는다.

일괄 복사 삭제 실패 후 선택 보존을 직접 관찰하는 검사는 현재 E2E에 없다. `save-changes.test.ts`는 삭제 성공과 redo 성공의 응답 ID만 검사한다. 4단계에서 삭제 후처리를 이동하기 전에 기존 `batch-copy.spec.ts`에 실제 저장 실패 후 선택 유지와 재시도 성공을 확인하는 사례를 보완할 필요가 있다. 별도 가짜 세션이나 테스트 전용 운영 분기를 만들지 않고 실제 DB 쓰기 실패만 제어한다.

### 공통 모듈 설명과 외부 설정

확인한 공통 문서는 `src/shared/lib` 아래 `algorithm-reference`, `clipboard`, `entity-metadata`, `grapheme`, `id-generation`, `indexed-db`, `join-class-names`의 `README.md`다. 알고리즘 식별, 외부 클립보드 실패, 문자소 분리, ID 발급과 정적 클래스 조합의 역할을 구별한다. IndexedDB 문서는 개별 request의 성공과 트랜잭션 완료를 구별하고 저장 중 네트워크 또는 Worker 대기를 하지 않도록 설명한다.

`entity-metadata/README.md`에는 정수 시각과 밀리초 변환 설명이 빠져 있다. ISO와 revision은 구버전 판독용으로 남아 있으므로 현행 저장 필드인 것처럼 설명하지 않도록 수정할 대상이다. `src/shared/ui/icons/heroicons-LICENSE.txt`와 글꼴 이용 조건은 자산과 함께 유지한다. `public/fonts/pretendard/PretendardVariable.woff2`, `public/magpie.png`는 실행 소스가 아닌 바이너리 자산이며 기존 연결을 보존한다.

저장소 루트 `package.json`은 notes 검사와 빌드 명령을 패키지로 전달한다. `pnpm-workspace.yaml`은 앱 패키지와 빌드 허용 목록 및 workspace 순환 방지를 설정한다. notes의 실행 및 검사 설정은 패키지 내부에 있으며 다른 앱 소스를 가져오지 않는다. 이 구조 개선에 새 실행기나 workspace 패키지는 필요하지 않다.

## 적용할 원칙과 적용하지 않을 예제

제공된 문서는 UI 입력, 외부 동작, 구현 선택과 실행 수명을 구분한다. 운영 Provider에는 구현 함수를 Props로 전달하지 않고 기능별로 연결하며, 테스트는 동일 Context의 별도 Provider에서 구현을 선택한다. UI가 직접 쓰는 ID, 표시 값과 이벤트까지 없애거나 모든 외부 호출마다 Context를 만들라는 뜻은 아니다.

[React Context 안내](https://react.dev/learn/passing-data-deeply-with-context)는 Context 이전에 Props와 children 합성을 검토하도록 한다. 이 앱에서는 표시용 버튼과 입력은 기존 Props를 유지하고, 여러 소비자가 함께 쓰는 저장 및 구독만 기능별 훅으로 제공하는 근거가 된다. 함수 하나를 다른 함수로 감싸 전달하거나 객체 이름만 바꾸는 것으로 의존성 범위가 줄지는 않는다.

[Next.js 16.3.3의 use client 문서](https://github.com/vercel/next.js/blob/v16.3.3/docs/01-app/03-api-reference/01-directives/use-client.mdx)는 서버에서 브라우저로 연결되는 진입점과 직렬화 가능한 Props를 구분한다. 현재 앱의 IndexedDB 조회를 Server Component로 옮길 수는 없다. 서버 route는 화면을 연결하고 브라우저 기능은 Client Component에서 실행하는 구성을 유지한다.

현재 [패키지](../../../../apps/notes/package.json)는 React 19.2.8, Next.js 16.3.3, React Hook Form 7.86.0, Vitest 4.1.11과 Playwright 1.64.1을 사용한다. 웹의 최신 문서 표시는 React 19.3과 Next.js 16.4.5로 더 앞서 있으므로 새 API의 도입 근거로 삼지 않는다. 설치된 Next.js 태그에서도 확인한 기존 실행 환경 구분을 적용한다. 의존성 추가나 버전 변경은 이 구조 개선의 전제가 아니다.

현재 [Next.js 설정](../../../../apps/notes/next.config.ts)에는 Strict Mode가 켜져 있고 Cache Components 설정은 없다. 인증과 사용자별 서버 데이터가 없는 앱에 첨부 문서의 로그인, DB 조회, 캐시 예제를 옮기지 않는다. [Next.js 데이터 보안 지침](https://nextjs.org/docs/app/guides/data-security)의 인증 및 인가 확인은 서버 기능을 시작할 때 적용한다. 현재는 브라우저 자료의 스키마 검사, 일반 텍스트 렌더링과 실행 환경 분리가 대상이다.

## 실제 연결에서 확인한 문제와 유지할 부분

### 앱 전체의 연결과 기능별 구현이 함께 있다

[PersonalNotesProvider](../../../../apps/notes/src/_app/providers/personal-notes-provider.tsx)는 DB를 만들고 설정, 템플릿, 메모 세션, 모바일 일괄 복사, 저장 목록, 분석과 메모 Provider를 중첩한다. 이 배치에는 앱 내부 이동 동안 일괄 복사 이력과 토스트를 유지할 이유가 있다.

반면 `_app/composition/note.tsx`는 `use-note-services.ts`가 만든 repository, clipboard, 시계, ID 생성과 순서 함수를 `NotesDataProvider`로 전달한다. 분석, 템플릿과 설정도 같은 방식이다. Provider가 받은 구현을 내부 훅으로 다시 넘겨 소비하므로 테스트에서도 화면 과업에 필요하지 않은 전체 의존성을 준비한다.

**제안:** 외부 구현 선택은 해당 기능의 브라우저 모듈로 이동한다. 기존 Provider의 마운트 위치는 우선 유지하고 `_app`에는 앱 공통 연결 및 기능 사이의 실제 조합만 남긴다. 정의가 기능 가까이에 있다는 이유로 분석 결과나 선택 상태를 페이지 이탈 때 지우지 않는다.

### DB 공유는 기능별 repository 공유와 다르다

[PersonalNotesDatabase](../../../../apps/notes/src/_app/composition/indexed-db/personal-notes-database.ts)는 하나의 열기 Promise, 연결 세대, blocked 및 versionchange 알림과 닫기를 관리한다. 현재는 알림 타입을 Pages 계층에서 가져온다. [useDatabase](../../../../apps/notes/src/_app/composition/use-database.ts)는 이 객체를 앱 수명에 맞춰 유지한다.

**제안:** DB 스키마와 여러 entity의 이전을 조합하는 코드는 `_app/composition/indexed-db`에 남긴다. 범용 연결 타입과 연결 상태 구독 타입만 `shared/lib/indexed-db`로 옮긴다. 앱의 DB Provider가 이 연결을 한 번 제공하고, 기능별 브라우저 조립부가 연결을 받아 자기 repository를 만든다. 화면 컴포넌트에는 연결이나 repository 전체를 노출하지 않는다.

하위 계층에서 `_app`을 import하거나, 메모 스키마까지 Shared로 옮기는 방식은 배제한다. 연결을 제공하는 내부 Context 진입점은 앱 조립 및 테스트만 사용하도록 import 규칙으로 제한한다. UI용 진입점은 원시 Context를 다시 내보내지 않는다. 이는 모든 서비스를 조회하는 전역 저장소를 만드는 제안이 아니다.

### 기능별 상태와 명령은 수명이 다르다

[useNotesDataModel](../../../../apps/notes/src/_pages/notes/model/use-notes-data-model.ts)은 목록 로딩, 변경 직렬화, 창 간 알림, 삭제 알림 구독, 모바일 편집의 복원 기회와 저장 명령을 함께 처리한다. 여기서 반환한 넓은 값을 모든 소비자가 읽는다. 현재 메모 세션은 상태와 명령 Context를 이미 구분하므로 그 구분을 재사용할 수 있다.

**제안:** 메모 읽기 상태, 편집 저장, 배치, 순서, 삭제 및 복원에 필요한 소비 훅을 나누되 쓰기 순서와 하나의 편집 수명을 공유하는 동작까지 잘게 나누지 않는다. 훅 이름만 나누고 같은 큰 Context를 읽으면 재렌더링 범위는 줄지 않는다는 점을 구별한다. 별도 state 복사나 Effect 동기화 대신 실제 구독의 변경 범위를 기준으로 분리한다.

재렌더링을 줄인다는 이유로 WeakMap에 연결된 메모의 CRDT 기준 상태를 값 복사로 잃거나 저장 큐를 두 개로 나누면 안 된다. `entities/note/model/note-body.ts`와 편집기의 현재 본문 연결은 기능상 같은 객체와 변경분을 이어가는지 확인해야 한다.

### 카드와 편집 화면은 이미 일부 합성을 사용한다

[NoteCard](../../../../apps/notes/src/_pages/notes/ui/note-card.tsx)는 자동 저장, 이동 및 크기 조절, 보조 키, 메뉴와 표시를 함께 연결한다. [NotesBoard](../../../../apps/notes/src/_pages/notes/ui/notes-board.tsx)는 여러 동작을 카드로 넘긴다. Props가 많다는 사실만으로 모두 잘못된 것은 아니다. 카드가 실제로 쓰는 배율과 좌표, 이벤트와 하위 훅에 전달만 하는 저장 함수를 구별해야 한다.

[NoteDetailPage](../../../../apps/notes/src/_pages/notes/ui/note-detail-page.tsx)의 `EditorPage`, `EditorHeader`, `EditorActions`, `EditorStatus`는 이미 모듈 수준의 children 합성이다. 저장 상태와 삭제 상태를 같은 배치에 놓는다. 따라서 공통 프레임을 새로 만들기보다 기존 부분의 책임을 선명하게 나누는 편이 안전하다.

**제안:** 데스크탑 카드의 본문, 헤더와 크기 조절 부분은 카드 하나의 편집 및 제스처 수명을 공유한다. 모바일은 편집, 삭제 상태와 안내 모달을 분리하되 기존 DOM 순서와 스타일을 유지한다. 두 화면의 본문 입력 의미는 공유할 수 있지만 헤더, 내비게이션, Undo/Redo와 제스처 UI를 하나의 옵션 많은 컴포넌트로 합치지 않는다.

[React의 상태 보존 원칙](https://react.dev/learn/preserving-and-resetting-state)에 따라 타입, key와 트리 위치 변경은 폼 초기화로 이어질 수 있다. 저장 상태를 key로 사용하거나 렌더마다 컴포넌트를 만들면 커서와 작성 중 내용이 사라질 수 있다. 카드의 key는 기존 메모 ID를 유지하고 표시등 변화가 입력기를 재마운트하지 않게 한다.

### 일괄 복사는 같은 자료와 다른 작업을 구분해야 한다

`_app/providers/use-batch-copy-state.ts`는 저장 목록의 추가와 편집을 같은 세션 및 큐에서 처리한다. 하지만 구현은 `features/add-note-to-batch-copy`와 `features/edit-batch-copy`에 나뉘어 앱에서 결합한다. 모바일 임시 작업은 저장 목록과 별도로 유지한다.

**제안:** 두 feature를 `features/batch-copy`의 추가, 저장 목록 편집, 모바일 작업 모듈로 통합한다. 하나의 작업 단위인 저장 목록의 큐와 이력을 기능 안에 두려는 목적이며 모든 상태를 한 Context로 합치려는 것은 아니다. 모바일 작업은 별도의 상태와 수명을 유지한다.

항목 삭제 후 메모 작업 공간의 선택을 해제하는 동작은 기능 간 조합이다. 새 feature가 Pages의 메모 세션을 import하게 하지 않는다. 앱 조합부가 완료된 삭제 결과를 받아 선택 해제를 실행하도록 하고, 전달만 하는 callback 사슬은 남기지 않는다. 구독 방식이 필요하면 일괄 복사 완료 이벤트에만 한정하며 범용 event bus는 만들지 않는다.

## 운영 구현과 테스트 구현의 연결 예

다음은 제안하는 메모 편집 연결의 형태다. 실제 함수와 파일은 플랜의 해당 단계에서 기존 명령을 옮기며 정한다. 예제 때문에 같은 작업을 하는 저장 함수를 하나 더 만들지 않는다.

```tsx
export function NoteEditingProvider({ children }: PropsWithChildren) {
  const editing = useBrowserNoteEditing()
  return <NoteEditingContext value={editing}>{children}</NoteEditingContext>
}

export function NoteBody({ note }: { note: Note }) {
  const saveContent = useSaveNoteContent()
  const editor = useNoteCardEditor({ note, onSave: saveContent })
  return (
    <textarea
      aria-label="메모 내용"
      defaultValue={note.content}
      onCompositionStart={editor.autosave.pause}
      onCompositionEnd={editor.autosave.resume}
      {...editor.registration}
    />
  )
}
```

이 예제는 현재 훅의 `registration`과 조합 입력 연결을 사용한다. 전체 카드 구현을 대체하는 코드는 아니며 실제 분리에서는 기존 스타일, beforeinput, 선택과 ref 연결도 보존한다. `NoteBody`는 표시 데이터인 note를 사용하고 편집 기능은 훅으로 얻는다. `useSaveNoteContent`가 모든 기능을 담은 값을 외부로 반환해서는 안 된다.

테스트 Provider는 같은 Context에 제어 가능한 저장 동작을 연결한다. 테스트마다 렌더 전에 구성하고 정적 컴포넌트 타입을 사용한다. 운영 Provider에 `save`, `repository`, `isTest` Props를 추가하는 방식과 구분한다.

모델 자체를 검사할 때는 기존 `useNotesDataModel`을 실행하고 호출하는 외부 함수만 바꾼다. 모델이 계산할 상태와 명령을 테스트의 완성된 정답으로 공급해 검증 대상을 건너뛰지 않는다. 표시만 담당하는 UI 검사와 명령 및 저장을 포함하는 검사를 구분한다.

## 테스트 구조 개선

### 현재 계층을 유지하며 준비 코드를 줄인다

[단위 설정](../../../../apps/notes/vitest.config.ts)은 일반 `*.test.ts`와 모델 테스트를 실행한다. [Browser Mode 설정](../../../../apps/notes/vitest.browser.config.ts)은 `*.browser.test.tsx`와 `*.indexeddb.test.ts`를 Chromium, Firefox, WebKit에서 실행한다. 운영 빌드의 사용자 과업은 `e2e/`가 맡는다. 이 분리는 유지한다.

[모바일 편집 검사](../../../../apps/notes/src/_pages/notes/ui/note-detail-page.browser.test.tsx)는 실제 입력 UI와 메모리 repository 대역을 함께 사용한다. 실패 후 추가 입력 및 재시도의 기능 검사이며 실제 DB 내구성 검사는 아니다. [분석 Provider 검사](../../../../apps/notes/src/_pages/analysis/model/text-analysis-provider.browser.test.tsx)는 제어 가능한 응답과 상태 관찰 UI로 오래된 결과를 확인한다. 실제 Worker URL 검사는 별도로 남겨야 한다.

같은 slice 안의 테스트 Provider 및 비동기 제어만 재사용한다. 파일마다 쓰지 않는 repository 메서드를 채우는 준비는 필요한 함수로 줄인다. `e2e/support/read-stored-note.ts`는 화면과 별도로 실제 저장 본문을 읽으므로 유지한다. 테스트 이름이나 컴포넌트 폴더 수에 맞추어 같은 결과의 테스트를 복제하지 않는다.

### 격리와 실제 관찰을 보존한다

[Playwright 격리 문서](https://playwright.dev/docs/browser-contexts)는 테스트마다 새 BrowserContext를 쓰는 이유를 상태 오염 방지로 설명한다. 반면 같은 프로필의 여러 탭은 한 Context에 페이지를 여러 개 열어야 한다. 별도 Context의 두 페이지로 로컬 동기화를 검사하면 공유 IndexedDB를 검증하지 못한다.

[Vitest Browser Mode](https://vitest.dev/guide/browser/component-testing)는 실제 브라우저에서 컴포넌트를 실행한다. 그 안에서 바꾼 저장소나 Worker까지 실제 구현이 되는 것은 아니다. 각 테스트가 실제로 사용하는 계층을 구분하고 root, timer, 구독, Worker, DB 연결과 Web Lock을 정리한다. 모든 테스트에 범용 fixture 묶음이나 새 실행기를 추가하지 않는다.

공개 애플리케이션의 [Kubeflow 변경 e27593f](https://github.com/kubeflow/pipelines/commit/e27593f828a3189a48e50b5b4190cb8d31ed142e)는 모의 호출 대기와 반복 스냅샷 대신 화면 결과를 확인하는 방향을 보여준다. 이 저장소에서는 다음 차이를 적용한다.

```ts
await expect.poll(() => writer.save.mock.calls.length).toBe(1)
```

이 검사는 저장 함수 호출만 알린다. 자동 저장의 목적에는 아래와 같이 현재 입력과 저장 결과가 함께 필요하다.

```ts
await expect(editor).toHaveValue(enteredText)
await expect.poll(() => readStoredText(noteId)).toBe(enteredText)
```

이는 E2E 관찰 예시이며 새 읽기 도우미를 만들라는 뜻은 아니다. 기존 저장 읽기 도우미를 사용하고, blur나 이동이 자동 저장 실패를 대신 해결하기 전에 저장 결과를 관찰한다.

### 필요한 TDD와 구조 정리를 구분한다

파일 이동, Props 정리, Provider 배치와 스타일 유지에는 새 TDD를 일괄 적용하지 않는다. 기존 검사의 import 및 테스트 Provider를 바꾸고 같은 사용자 결과를 검사한다. 저장 큐, 늦은 응답 무시나 삭제 이후 저장 거절의 책임을 추출하면서 기존 검사가 보호하지 못하는 조합이 확인될 때만 해당 명령의 실패 사례를 먼저 작성한다.

React 트리 모양, 훅 호출 수, Context 이름을 검사하지 않는다. 브라우저에 필요한 UI 동작을 모의 객체로 복제하지 않는다. 동일 실패를 이미 검사하면 새 fixture와 테스트를 추가하지 않는다. 테스트 삭제는 대체 검사가 동일 행동과 실패를 실제로 잡는 증거가 있을 때만 검토한다.

## 대안과 적용 한계

모든 외부 함수를 Props로 전달하면 서명은 명시적이지만 현재 앱처럼 여러 화면에서 같은 작업을 이어갈 때 중간 전달과 테스트 준비가 커진다. 모든 서비스를 하나의 Context로 바꾸면 그 문제는 가려지고 소비 범위가 커진다. 기능별 연결은 이 둘 사이에서 호출자가 사용하는 동작을 드러내는 선택이다.

[Webiny PR #5387](https://github.com/webiny/webiny-js/pull/5387)과 [병합 573e347](https://github.com/webiny/webiny-js/commit/573e347c7ab5f027b9c367dd133b2469b9d97e1e)은 넓은 request context에서 필요한 기능을 찾던 구성을 직접 필요한 동작을 받도록 바꿨다. 해당 프로젝트의 DI 등록 체계까지 도입하지 않고 의존 범위를 줄이는 근거만 적용한다.

환경별 진입점은 [FSD PR #924](https://github.com/feature-sliced/documentation/pull/924)의 [고정 변경 4f5ae68](https://github.com/feature-sliced/documentation/commit/4f5ae6875bb53b3b0a72ddaa527002ba8d86dd6a)에서도 구분한다. 구조 개선 전 ESLint는 Pages의 `composition.ts`와 `index.ts`만 허용했다. 파일 이름만 바꾸면 검사와 호출자가 깨지므로 허용 규칙도 함께 바꿔야 한다. 환경별 진입점, 호출자의 import와 제한 규칙을 같은 절차에서 변경해야 한다.

기존 개발 지침의 일부 예제에는 중앙 조립, 전체 저장소, revision, 과거 초안과 테스트가 남아 있다. 이 예제는 새 요구사항의 예외가 아니다. 현행 v14 스키마와 기능 가까이에서 구현을 선택하는 조건을 우선하며, 구조 개선 때문에 이전 테이블이나 버전 필드를 되살리지 않는다. 구버전 이전 코드는 현재 저장 필드와 구분해 보존한다.

서버 사용자 격리, 새 캐시 체계, 다른 브라우저 사이 동기화와 실제 휴대전화 IME 검증은 이 문서에서 확인한 사실이 아니다. 현재 계획은 설치된 브라우저 및 기존 실행 도구를 사용하고, 미확인 환경은 완료 증거에서 구분한다.
