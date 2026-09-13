# 기존 테스트의 목적과 모델 기반 탐색의 출발점

기존 테스트는 메모와 초안의 보존, 저장 및 복사 실패 처리, 분석 결과의 정확성, 오래된 응답 배제와 실제 화면 조작을 서로 다른 실행 환경에서 확인한다. 모델 기반 탐색은 이 테스트들을 대체하는 작업이 아니라, 확인 중인 규칙에 행동과 입력의 조합을 추가하는 작업이다. 첫 적용 대상의 선정 근거는 [U12](../plan.md#u12-모델-기반-탐색과-실패-재현)에 있으며 일괄 복사 목록은 요구사항 확인 전까지 보류한다.

이 자료는 테스트를 추가하거나 모델을 작성할 때 기존 검증 목적을 판단하기 위한 저장소 조사다. 2026-09-13의 테스트 소스, 실행 설정과 검증문을 읽었다. 테스트 작성 당시의 의도를 추정하지 않고 현재 준비 자료, 실행과 비교 결과로 목적을 설명한다. 실행 성공 여부나 요구사항 전체의 충족 여부를 판정한 자료는 아니다.

## 실행 환경별로 얻는 증거

[일반 Vitest 설정](../../../../apps/notes/vitest.config.ts)은 `src/`의 테스트를 수집하되 `.browser.test`와 `.indexeddb.test`를 제외한다. 순수 함수뿐 아니라 저장소, Clipboard와 Worker를 대역으로 바꾼 명령 검사도 여기에 포함된다. 테스트 파일명에 저장이라는 말이 있어도 스키마 파싱만 검사한다면 실제 저장 증거는 아니다.

[Browser Mode 설정](../../../../apps/notes/vitest.browser.config.ts)은 Chromium, Firefox와 WebKit에서 운영 모듈을 실행한다. 실제 IndexedDB 검사는 저장소 API를 사용하지만 두 provider 검사는 저장소 또는 분석기를 대역으로 바꾼다. 브라우저 실행 자체는 모든 외부 기능이 실제 구현이라는 뜻이 아니다. [Vitest Browser Mode 문서](https://vitest.dev/guide/browser/)의 실제 브라우저 실행과 저장소 안의 대역 사용 여부를 함께 구분해야 한다.

[Playwright 설정](../../../../apps/notes/playwright.config.ts)은 Next.js 운영 서버에서 과업별 E2E를 실행한다. 일반 화면 과업은 세 데스크톱 브라우저, Clipboard 권한은 별도 Chromium 프로젝트, touch 과업은 폭 320px의 Chromium 모바일 에뮬레이션에서 실행하도록 구성되어 있다. 물리 모바일 기기와 운영체제 조작 전체를 검사하는 구성은 아니다.

## 메모 자료와 변경 구분

[note.test.ts](../../../../apps/notes/src/entities/note/model/note.test.ts)는 원문이 바뀔 때만 `contentRevision`을 증가시키고 위치만 바뀌면 유지하는지 확인한다. 두 변경이 함께 일어나도 한 번만 증가하고 변경이 없으면 원래 값을 반환하는지도 비교한다. 같은 파일의 스키마 검사는 필수 자료, ID, revision과 `tabIndex`의 유효 범위를 확인한다.

[note-draft.test.ts](../../../../apps/notes/src/entities/note/model/note-draft.test.ts)는 초안의 메모 ID와 기준 `contentRevision`이 같고 원문이 다를 때 복구 대상으로 판정하는지 확인한다. 다른 메모, 오래된 기준 revision과 같은 원문을 복구 대상으로 삼지 않는 것이 목적이다. 실제 새로고침 뒤 복구 UI를 검사하지는 않는다.

[note-order.test.ts](../../../../apps/notes/src/entities/note/model/note-order.test.ts)는 Tab 순서 정규화와 할당 한도, 겹침 순서 변경에서 다른 메모들의 상대 순서 및 `tabIndex`와 `contentRevision` 보존을 확인한다. [note-geometry.test.ts](../../../../apps/notes/src/entities/note/model/note-geometry.test.ts)는 숫자 해석, 허용 좌표와 크기, 크기 보정과 새 메모 배치 후보를 비교한다. 일반 좌표 허용과 새 메모 배치 후보 탐색은 다른 규칙이며, 이 함수 검사만으로 실제 드래그를 증명하지 않는다.

## 자동 저장과 초안 복구

[note-content-save-state.test.ts](../../../../apps/notes/src/_pages/notes/model/note-content-save-state.test.ts)는 A를 저장하는 동안 B를 입력했을 때 다음 저장 요청에 B가 남는지 확인한다. 실패한 원문의 재시도, 변경 없는 입력의 저장 생략과 원래 원문으로 돌아간 복구 초안의 정리 요청도 다룬다. 저장 요청을 만드는 상태 규칙이 대상이다.

[save-note-content.test.ts](../../../../apps/notes/src/_pages/notes/model/save-note-content.test.ts)는 메모리 저장소와 고정 시각을 사용한다. 정상 저장의 revision 변경 및 초안 제거, 초안 저장 실패 시 기준 메모 보존, 메모 저장 실패 시 초안 보존, 오래된 초안 정리와 정리 실패 후 재시도 가능성을 확인한다. 실제 IndexedDB transaction의 완료나 중단에 관한 증거는 아니다.

[notes-data-provider.browser.test.tsx](../../../../apps/notes/src/_pages/notes/model/notes-data-provider.browser.test.tsx)는 실제 provider와 자동 저장 hook을 테스트용 편집 화면에 연결한다. 지연시킨 저장 중 재입력한 최신 원문이 화면에 남고, 재시도 후 늦은 초기 읽기가 최신 결과를 덮어쓰지 않으며, blocked 알림 뒤 읽기가 완료되면 복구되는지 확인한다. 저장소와 상태 알림은 대역이므로 실제 DB upgrade를 재현하는 검사가 아니다.

## 삭제 복원과 작업 대상

[note-removal-history.test.ts](../../../../apps/notes/src/entities/note/model/note-removal-history.test.ts)는 최근 삭제부터 원래 메모 전체를 복원하는 LIFO 규칙, 빈 이력, 알림 해제 및 만료, 일부 복원 뒤 남은 이력을 확인한다. 전달한 시각으로 만료를 계산하므로 실제 알림 타이머와 화면 이동은 별도 증거가 필요하다.

[note-workspace-state.test.ts](../../../../apps/notes/src/_pages/notes/model/note-workspace-state.test.ts)의 메모 관련 사례는 선택과 속성 편집 대상의 독립성, 대상 삭제 후 정리와 늦게 끝난 속성 저장이 다른 대상을 덮어쓰지 않는지 확인한다. 키보드와 포인터 입력에 따른 포커스 요청 값도 비교하지만 실제 브라우저 포커스 이동을 검사하지는 않는다. 일괄 복사 패널과 함께 동작하는 사례의 요구사항 판정은 보류한다.

## 개별 복사, 집계와 접속 조건

[copy-note.test.ts](../../../../apps/notes/src/_pages/notes/model/copy-note.test.ts)는 Clipboard와 사용 기록 대역으로 복사 원문 및 메모 revision 전달을 확인한다. Clipboard 실패 시 사용 기록을 요청하지 않고, 복사 후 기록 실패는 이미 복사한 텍스트를 되돌리지 않는 부분 성공을 확인한다. 실제 권한과 운영체제 Clipboard 결과는 이 테스트의 대상이 아니다.

[text-usage-record.test.ts](../../../../apps/notes/src/entities/usage/model/text-usage-record.test.ts)는 개별 및 일괄 복사 횟수를 구분한 레코드의 스키마 통과와 음수 거부를 검사한다. [usage-projection.test.ts](../../../../apps/notes/src/_pages/usage/model/usage-projection.test.ts)는 합계와 같은 원문이라도 메모 ID 또는 revision이 다른 기록을 별도 행으로 유지하는지 비교한다. 이는 복사 동작이 실제로 횟수를 저장했다는 증거가 아니며, 일괄 복사 횟수의 증가 시점에 대한 요구사항 확정과도 별개다.

[runtime-access.test.ts](../../../../apps/notes/src/_app/model/runtime-access.test.ts)는 URL과 secure-context 값의 조합으로 접속 허용 결과를 비교한다. 실제 배포 인증서나 HTTPS 제공 상태를 검사하지 않는다.

## 분석 알고리즘과 오래된 응답

[normalize-lines.test.ts](../../../../apps/notes/src/_pages/analysis/model/normalize-lines.test.ts)는 줄바꿈, Unicode 정규화, 공백과 대소문자를 처리하면서 원문과 원래 줄 번호를 보존하는지 확인한다. [analyze-text.test.ts](../../../../apps/notes/src/_pages/analysis/model/analyze-text.test.ts)는 grapheme 단위 처리, 줄 쌍 수, 정확한 반복 및 포함 관계, 3-gram 점수와 동점 순서를 비교한다. 이 두 파일은 주로 입력과 계산 결과의 관계를 확인하므로 모두 상태 모델로 옮길 이유는 없다.

[analysis-message.test.ts](../../../../apps/notes/src/_pages/analysis/model/analysis-message.test.ts)는 메시지 형태, 중복 ID, 원본 줄 참조, 관계 종류와 점수, 쌍의 방향 및 중복을 검사한다. [analysis-run-state.test.ts](../../../../apps/notes/src/_pages/analysis/model/analysis-run-state.test.ts)는 요청의 메모 집합, `contentRevision`과 알고리즘 버전이 현재 입력에 맞는지, 응답의 원문과 줄 번호가 실제 요청에 속하는지 확인한다.

[worker-text-analyzer.test.ts](../../../../apps/notes/src/_pages/analysis/api/worker-text-analyzer.test.ts)는 제어 가능한 Worker 대역으로 잘못된 응답, 오류, 메시지 전송 실패, 재시도와 종료 시 대기 중 요청의 실패 처리를 확인한다. 실제 Worker 파일 로드, MIME type과 실행 성능을 확인하는 검사는 아니다.

[text-analysis-provider.browser.test.tsx](../../../../apps/notes/src/_pages/analysis/model/text-analysis-provider.browser.test.tsx)는 테스트용 화면에서 응답 완료 순서를 직접 바꾼다. 두 번째 요청 뒤 첫 응답이 늦게 도착해도 최신 결과를 유지하고, 분석 중 원문 revision이 바뀌면 오래된 결과로 표시하며, 원본 줄이 없는 응답은 실패로 처리하는지 확인한다. 분석기와 메모 읽기는 대역이다.

## 템플릿 편집과 생성

[edit-segments.test.ts](../../../../apps/notes/src/entities/template/model/edit-segments.test.ts)는 선택 영역을 입력값으로 바꿀 때 순서를 유지하고 빈 선택, 겹침과 원문 밖 선택을 거부하는지 확인한다. 원래 텍스트로 복원하거나 이름만 바꿀 때 선택했던 원문이 보존되는지도 비교한다. [render-template.test.ts](../../../../apps/notes/src/entities/template/model/render-template.test.ts)는 segment 순서대로 치환하고 값이 없으면 기록한 기본 원문을 사용하는지 확인한다.

[template-record.test.ts](../../../../apps/notes/src/entities/template/model/template-record.test.ts)는 제목 공백 정리, 빈 제목, 중복 key 및 비어 있거나 겹치는 입력값 이름을 검사한다. [suggest-template.test.ts](../../../../apps/notes/src/features/suggest-template/model/suggest-template.test.ts)는 공통 텍스트 보존, 분리된 차이와 삽입된 텍스트의 입력값 변환, grapheme 보존과 제안하지 않을 조건을 비교한다. 스키마 파싱과 제안 결과는 실제 저장이나 브라우저 텍스트 선택의 증거가 아니다.

## 실제 저장소와 운영 화면

[personal-notes-database.indexeddb.test.ts](../../../../apps/notes/src/_app/composition/indexed-db/personal-notes-database.indexeddb.test.ts)는 실제 IndexedDB와 운영 repository를 사용한다. 연결을 닫고 다시 열어 메모, 초안, 템플릿과 사용 기록의 지정한 필드를 읽으며, 이전 schema 자료의 변환과 메모 크기 및 순서 보정을 비교한다. upgrade가 막힌 경우, 버전 변경 시 연결 종료와 닫힌 뒤 늦게 끝나는 연결 요청도 다룬다. 레코드의 모든 필드를 완전 비교하는 것은 아니며 일괄 복사 관련 저장 및 rollback 사례의 요구사항 판정은 보류한다.

[notes.spec.ts](../../../../apps/notes/e2e/notes.spec.ts)는 운영 화면에서 편집 후 새로고침 보존, Tab 이동과 속성 저장, 메모 이동 및 크기 조절과 캔버스 시점 이동의 구분, 선택 해제, 삭제 복원과 알림 만료를 확인한다. 모바일 상세에서는 저장, 계속 편집, 변경사항 버리기와 내부 이동 확인을 다룬다. 저장 완료 지연이나 누락된 키 해제는 주입한 이벤트와 제어한 시각으로 만든 사례다. hydration 검사는 console 및 page error를 수집하지만 알려진 prefetch 오류를 제외하므로 모든 오류가 없다는 검사로 설명하지 않는다.

[analysis.spec.ts](../../../../apps/notes/e2e/analysis.spec.ts)는 버튼을 누르기 전후의 Worker 생성 여부, 자산 URL 및 JavaScript MIME type, 자산 로드 실패 후 재시도와 분석 중 다른 화면으로 이동 가능한지를 확인한다. 첫 성공 사례의 입력은 비어 있으므로 그 사례가 실제 후보 목록 표시를 증명하지는 않는다. 많은 줄을 넣는 사례도 정량 성능 기준을 측정하지 않는다.

[templates.spec.ts](../../../../apps/notes/e2e/templates.spec.ts)는 입력값 복원 버튼의 설명, 제목 및 입력값 이름 오류와 수정 후 재제출, 저장한 템플릿의 새로고침 보존과 생성 결과의 일회성을 확인한다. [선택 준비 함수](../../../../apps/notes/e2e/support/select-text-range.ts)는 `setSelectionRange`를 호출하므로 마우스나 touch로 텍스트를 선택하는 모든 과정을 검사한 것은 아니다.

[clipboard-permissions.spec.ts](../../../../apps/notes/e2e/clipboard-permissions.spec.ts)는 Chromium 권한 허용 및 거절에서 실제 Clipboard와 화면 결과를 확인한다. API 부재, 쓰기 실패와 늦은 복사 완료는 대역으로 재현하는 별도 사례다. 대역이 sessionStorage에 기록한 값은 운영체제 Clipboard 증거로 계산하지 않는다. 개별 복사와 일괄 복사 횟수를 함께 확인하는 사례에서 일괄 복사에 대한 판정은 보류한다.

[touch-interactions.spec.ts](../../../../apps/notes/e2e/touch-interactions.spec.ts)는 CDP touch 입력과 제어한 시각으로 길게 누르기 복사, 이동 및 취소와 pointer capture 상실 시 중단을 확인한다. 성공 사례는 Clipboard를 읽고 취소 사례는 알림 부재 및 화면 유지 등을 비교한다. 일괄 복사 확인 항목을 끄는 부분은 요구사항 확인 전까지 모델의 정답으로 채택하지 않는다.

## 일괄 복사 보류 범위

저장 목록과 모바일 작업 초안의 동작을 새 모델로 확정하거나 테스트에 맞춰 요구사항을 고치지 않는다. [batch-copy 도메인 검사](../../../../apps/notes/src/entities/batch-copy/model/), [목록 편집 명령 검사](../../../../apps/notes/src/features/edit-batch-copy/model/), [항목 추가 및 모바일 작업 검사](../../../../apps/notes/src/features/add-note-to-batch-copy/model/)와 [batch-copy.spec.ts](../../../../apps/notes/e2e/batch-copy.spec.ts)는 요구사항 확인 후 별도로 다룬다.

[interaction-preferences-record.test.ts](../../../../apps/notes/src/entities/preference/model/interaction-preferences-record.test.ts)의 일괄 복사 단축키 설정도 현재는 필수 시각과 설정값의 스키마 검사라는 사실만 기록한다. 앞에서 언급한 저장소, 집계, 패널, Clipboard와 touch의 혼합 사례 역시 일괄 복사 동작의 승인 근거로 사용하지 않는다. 기존 테스트는 삭제하거나 약화하지 않는다.

## 제안서를 적용하기 위해 남은 일

위 목적을 [요구사항](../requirements.md)의 기대 결과와 연결하고 현재 테스트의 예상값이 승인된 규칙인지 구분해야 한다. 소스를 읽었다는 사실만으로 정답이 확정되지는 않는다. U12의 첫 대상인 수동 플레이스홀더 편집은 [템플릿 편집 결정](../decisions/template-suggestion.md#승인된-결정과-이유)에 지정, 이름 변경, 복원과 잘못된 선택 거부가 명시되어 있다. 자동 저장 및 초안 복구, 삭제 복원과 분석 응답 수락도 상태 변화가 드러나지만 첫 모델에는 포함하지 않는다.

선정된 대상에서는 상태, 행동, 실행 전제, 허용된 실패와 보존할 값을 단순 모델로 정의한다. 기존 테스트의 고정 사례는 유지하고 입력 및 행동 순서를 생성하는 검사를 추가한다. [fast-check 모델 기반 테스트](https://fast-check.dev/docs/advanced/model-based-testing/)의 `check`와 `run`은 행동 가능 여부와 실행 및 판정을 나눈다. 비정상 시도를 정상 행동의 전제조건으로 모두 건너뛰지 않도록 별도 명령으로 표현해야 한다.

그다음 실제 도메인 함수를 호출하는 Adapter, 후보마다 새로 만드는 초기 상태, 실패 순서 축소, 재현 자료와 실행 설정을 연결한다. 시간과 응답 순서의 제어 방법은 대상 선택 후 정하며, 첫 PoC에서 임의의 비동기 실행 순서 전체를 탐색한다고 약속하지 않는다. 세부 작업과 완료 증거는 [U12](../plan.md#u12-모델-기반-탐색과-실패-재현), 버전과 재현 한계는 [기술 조사](model-based-testing-research.md)에서 관리한다.

실제 API와 화면 증거는 유지한다. [Playwright 권장사항](https://playwright.dev/docs/best-practices)의 “Test user-visible behavior”처럼 사용자 결과를 확인하는 E2E와 모델의 순수 규칙 검사는 역할이 다르다. 생성 모델의 통과만으로 실제 저장소, Clipboard, Worker 자산과 입력 조작이 통과했다고 보고하지 않는다.
