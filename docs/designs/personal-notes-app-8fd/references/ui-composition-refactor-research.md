# 메모 앱의 기능별 의존성 연결과 화면 보존 조사

기능별 Provider가 외부 구현을 선택하고 UI는 필요한 동작만 사용하는 구성이 적합하다. 다만 Provider를 모두 페이지 안으로 옮기면 화면 이동에서 유지하던 자료가 사라질 수 있다. 정의 위치를 기능 가까이 옮기는 작업과 마운트 수명을 바꾸는 작업을 구분하고, 현재 수명을 먼저 보존하는 단계적 변경을 권한다.

이 조사는 [구조 개선 요구사항](../requirements.md#기능과-화면을-보존하는-코드-구조-개선)의 구현 및 테스트 재구성에 사용한다. 2026-11-07의 브랜치 소스와 제공된 React/Next.js UI 책임 분리 문서, 아래 공식 자료를 비교했다. 소스에서 확인한 사실과 이후 적용할 제안을 구분하며, 실행하지 않은 화면이나 성능의 개선을 입증한 것으로 보지 않는다.

## 파일별 분석 기록

아래는 `1d5efe3`의 소스에서 확인한 기능과 유지 이유다. 파일 이름은 `apps/notes`를 기준으로 한다. 같은 항목의 파일은 함께 동작하는 모듈이며 각각 본문을 확인했다. 아직 기록하지 않은 파일은 전체 분석 완료에 포함하지 않는다. 기존 주요 연결 조사와 전체 파일 분석을 구분한다.

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

앱에 남길 스키마 조합이다. 이전 입력의 `contentRevision` 검사는 현행 저장 필드가 아니므로 단순 문자열 제거 대상으로 삼지 않는다. 관련 실제 DB 검사는 별도 분석한다.

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

단위 검사는 복사 원문과 구분자, 항목 삽입 위치, 삭제 복원 및 반복 추가에서 원문 보존을 검사한다. `batch-copy-commands.test.ts`와 `batch-copy-list.test.ts`에는 현재 코드에서 검사하지 않는 revision을 언급하는 테스트 제목이 남아 있다. 6단계에서 실제 검사하는 동작에 맞춰 제목을 수정하고 단언은 유지한다. 실제 DB 검사와 편집 feature 및 E2E 전체 분석은 별도로 남아 있다.

### 저장 목록 편집과 확인 화면

확인한 파일은 `src/features/edit-batch-copy`의 `index.ts`, `model/save-changes.ts`, `save-changes.test.ts`, `batch-copy-item-actions.ts`, `copy-batch-text.ts`, `copy-batch-text.test.ts`, `use-editor.ts`, `edit-batch-copy-provider.tsx`, `use-batch-copy-action-sheet.ts`, `use-batch-copy-editing.ts`, `use-batch-copy-history-shortcuts.ts`, `use-batch-copy-pointer-reorder.ts`, `use-copy-batch-text.ts`, `use-copy-batch-text-feedback.ts`, `ui/batch-copy-history-shortcuts.tsx`, `copy-batch-text-action.tsx`, `batch-copy-action-sheet.tsx`, `batch-copy-list.tsx`다.

`src/_pages/batch-copy`의 `index.ts`, `model/use-batch-copy-action-presentation.ts`, `use-batch-copy-page.ts`, `use-mobile-batch-copy-confirmation.ts`, `ui/batch-copy-start-page.tsx`, `mobile-batch-copy-confirmation.tsx`, `mobile-batch-copy-confirmation-list.tsx`와 `src/shared/lib/pointer-reorder/index.ts`도 확인했다.

저장 명령은 성공한 목록과 삭제한 항목 ID를 반환한다. 실패하면 새 세션을 반환하지 않아 기존 목록과 이력을 유지한다. 화면의 낙관적 이동 및 삭제는 저장 실패 시 되돌아가고 다시 시도할 동작을 제공한다. 단위 검사는 삭제 및 redo 성공의 항목 ID만 검사하므로 실패 시 선택 보존은 E2E의 보호 여부를 확인한 뒤 TDD 필요성을 판단한다.

저장 목록의 포인터 이동은 패널 밖 놓기에서 삭제를 실행한다. 관리 화면은 같은 입력을 삭제로 처리하지 않는다. 모바일 확인 목록의 공통 포인터 훅은 실제 hit test와 기존 항목 ID를 기준으로 이동한다. 메모 목록에서 사용하는 추가 항목 허용 옵션은 드래그 중 새 메모 생성과 연결되므로 제거하지 않는다. 두 포인터 훅은 취소, 미리보기와 스크롤 처리가 비슷하지만 삭제 의미와 포커스 복귀 조건이 다르다. 공통화 전에 이 차이를 보호한다.

관리 화면은 컨테이너 너비와 루트 글자 크기로 메뉴와 시트를 고른다. 확인 화면은 `view=current`와 메모리 작업의 존재에 따라 표시한다. 초기화 뒤에는 빈 확인 목록을 유지하며 현재 작업이 없는 새로고침에서는 저장 목록 화면으로 바뀐다. 4단계에서 전달 전용 의존성 Props를 줄이되 페이지 선택과 각 목록의 상태 수명은 보존한다. 5단계에서는 행의 본문, 이동 핸들과 동작 메뉴를 children으로 조합할 수 있는지 확인하고 DOM 및 ref 연결을 유지한다.

### 공통 스타일과 메뉴

추가로 확인한 파일은 `src/_app/styles/tokens.css`, `globals.css`, `src/shared/ui/action-popover/index.tsx`, `use-action-popover.ts`, `src/shared/ui/reorderable-text-card/index.tsx`, `src/shared/lib/note-model-settings/index.ts`, `src/shared/lib/note-model-exploration/index.ts`다.

기본 탐색 높이, 모바일 헤더, 카드 헤더와 패널 폭은 기존 토큰을 따른다. forced-colors와 reduced-motion 규칙을 유지한다. 메뉴는 React Aria를 사용하며 dialog 안의 메뉴는 그 dialog를 Portal 대상으로 선택한다. 명령 이후 사용자가 다른 요소로 이동했다면 더보기 버튼으로 포커스를 빼앗지 않는다. 공통 재정렬 카드의 children 구성과 포인터 및 키보드 포커스 구분을 재사용한다.

모델 검사 설정과 보고 함수는 실행 횟수, seed, 축소된 행동과 관찰값을 기록한다. 6단계에서 실제 사용하는 테스트를 따라 배치할 후보이며 운영 import 유무를 확인한다. 보고서용 자료라는 이유로 삭제하거나 운영 기능의 의존성으로 옮기지 않는다.

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

환경별 진입점은 [FSD PR #924](https://github.com/feature-sliced/documentation/pull/924)의 [고정 변경 4f5ae68](https://github.com/feature-sliced/documentation/commit/4f5ae6875bb53b3b0a72ddaa527002ba8d86dd6a)에서도 구분한다. 현재 ESLint는 Pages의 `composition.ts`와 `index.ts`만 허용하므로 파일 이름만 바꾸면 검사와 호출자가 깨진다. 환경별 진입점, 소비 import와 제한 규칙을 같은 절차에서 변경해야 한다.

기존 개발 지침의 일부 예제에는 중앙 조립, 전체 저장소, revision, 과거 초안과 테스트가 남아 있다. 이 예제는 새 요구사항의 예외가 아니다. 현행 v14 스키마와 기능 가까이에서 구현을 선택하는 조건을 우선하며, 구조 개선 때문에 이전 테이블이나 버전 필드를 되살리지 않는다. 구버전 이전 코드는 현재 저장 필드와 구분해 보존한다.

서버 사용자 격리, 새 캐시 체계, 다른 브라우저 사이 동기화와 실제 휴대전화 IME 검증은 이 문서에서 확인한 사실이 아니다. 현재 계획은 설치된 브라우저 및 기존 실행 도구를 사용하고, 미확인 환경은 완료 증거에서 구분한다.
