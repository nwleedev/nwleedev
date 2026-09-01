# 개인 메모 데이터 구조 조사 초안

## 결론

현재 로컬 애플리케이션은 메모 원문과 공간 좌표를 기준 정보로 두고, 분석용 줄과 정규화 문자열은 요청할 때 만드는 파생 정보로 다룬다. [로컬 저장과 실행 중 상태 결정](../decisions/local-storage-and-ephemeral-state.md)에 따라 전체 revision과 텍스트 전용 content revision을 구분한다. [일괄 복사 순서와 제거 복구 결정](../decisions/accumulator-ordering-and-recovery.md)에 따라 항목 추가 당시 원문 스냅샷을 저장하고 제거 이력은 애플리케이션 실행 중 메모리에 둔다. 선택한 메모, 활성 오른쪽 패널, 속성 입력 초안과 모바일 일괄 복사 확인 작업도 저장 엔티티와 분리한 실행 중 상태로 검토한다. 최우선 계정 및 동기화 백로그를 시작하면 이 논리 객체를 유지하면서 저장 방식만 원격 어댑터로 바꿀 수 있는지 다시 검증한다.

안정적인 ID와 revision은 로컬 분석 결과가 어떤 메모 상태를 대상으로 했는지 식별하는 데에도 필요하다. 계정 동기화에 필요한 삭제 표시, 충돌 해결, 삭제 보존 기간과 계정별 보관 범위는 최우선 백로그에서 다룬다. 이 초안은 데이터베이스 스키마가 아니며, 아래 TypeScript 형태는 논리 객체와 쟁점을 검토하기 위한 예시일 뿐 승인된 API나 구현이 아니다.

이 문서는 [개인 메모 애플리케이션 요구사항](../requirements.md)의 공간형 메모, 일괄 복사와 실행 취소, 사용 빈도, 줄 단위 텍스트 분석과 템플릿에 필요한 값을 조사하고, 최우선 계정 및 동기화 백로그의 추가 쟁점을 구분한 참고 자료다. 도메인 설계 담당자와 데이터 설계 담당자가 객체 책임을 검토하고 결정 책임자가 보관 및 동기화 규칙을 승인할 때 사용한다. 공식 문서와 표준은 2026년 8월 30일에 처음 검토하고 모바일 확인 작업 변경에 맞춰 2026년 9월 2일에 다시 확인했다.

## 조사 근거

[Indexed Database API 3.0 표준](https://www.w3.org/TR/IndexedDB/)은 키로 식별하는 구조화된 값, 인덱스와 트랜잭션을 정의한다. 따라서 로컬 모드에서 메모, 일괄 복사 상태, 사용 횟수와 템플릿을 별도 object store에 두면서 하나의 사용자 동작에 필요한 변경을 트랜잭션으로 묶을 수 있다.

[TypeScript의 interface 문서](https://www.typescriptlang.org/docs/handbook/interfaces.html)는 객체 형태를 이름 붙여 검사하는 방법을 설명하고, [타입 호환성 문서](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)는 구조적 타입 체계의 호환 규칙을 설명한다. 아래 예시는 IndexedDB나 서버 API의 DTO를 UI에 퍼뜨리지 않고 도메인 객체와 저장 포트의 형태를 먼저 논의하기 위해 interface와 판별 가능한 union을 사용한다.

[UUID RFC 9562](https://www.rfc-editor.org/rfc/rfc9562.html)는 중앙 등록 없이 UUID를 생성하는 방법과 시간 순서를 반영하는 UUIDv7을 표준화한다. 여러 기기나 오프라인 상태에서 엔티티를 만들 수 있는 계정 모드에는 클라이언트에서도 충돌 가능성이 낮은 ID를 만들 수 있다는 장점이 있다. UUIDv7을 실제로 선택할지는 데이터베이스와 ID를 생성 시각 순서로 조회할 필요를 정한 뒤 결정해야 한다.

[HTTP Semantics의 If-Match 규칙](https://httpwg.org/specs/rfc9110.html#field.if-match)은 클라이언트가 알고 있는 표현과 서버의 현재 표현이 일치할 때만 변경을 적용해 갱신 손실을 방지한다. 이 근거에 따라 동기화 객체에는 단순 수정 시각과 별도로 서버가 검증할 revision 또는 ETag가 필요하다.

[PostgreSQL 제약조건 문서](https://www.postgresql.org/docs/current/ddl-constraints.html)는 primary key, unique와 foreign key가 데이터 관계를 검사하는 방식을 설명한다. [PostgreSQL JSON 타입 문서](https://www.postgresql.org/docs/current/datatype-json.html)는 `jsonb`의 처리 및 인덱싱 장점과 일반 관계형 열의 무결성 규칙 차이를 설명한다. 이는 PostgreSQL 선정 근거가 아니라, 계정 데이터베이스에서 엔티티 식별자와 관계를 명시적 열로 두고 형태가 달라지는 분석 세부사항만 JSON 계열 값으로 둘지 비교해야 한다는 근거다.

## 공통 식별자와 제공 항목

실행 모드는 저장 엔티티가 아니라 composition root가 읽는 구성이다. UI에는 환경변수 원문 대신 기능 목록만 전달한다.

```ts
type EntityId = string;
type IsoDateTime = string;
type Revision = number;

interface NoteRef {
  id: EntityId;
  revision: Revision;
}

interface NoteContentRef {
  id: EntityId;
  contentRevision: Revision;
}

interface AlgorithmRef {
  type: string;
  version: string;
}
```

현재 로컬 애플리케이션은 실행 모드나 기능 목록 객체를 데이터 모델에 두지 않는다. 계정 및 동기화 백로그를 시작할 때 UI에 표시할 항목과 원격 구현 구성을 일치시키는 별도 실행 설정을 검토하되, 설정 이름과 허용 값은 이 데이터 예시에 기록하지 않는다. 실행 설정은 서버 권한을 나타내지 않으며 인증과 메모 접근 검사를 대신할 수 없다.

`NoteRef`처럼 같은 대상을 식별하고 버전을 확인하는 속성은 하나의 값으로 함께 전달한다. `note.id`와 `note.revision`, `algorithm.type`과 `algorithm.version`으로 접근하면 `noteId`, `noteRevision`, `algorithmType`, `algorithmVersion`의 접두어 반복을 줄이고 서로 다른 대상의 값을 잘못 조합할 가능성도 낮출 수 있다. 다만 라우트 매개변수가 이미 특정 메모를 가리키거나 속성 하나만 필요한 함수까지 중첩 객체를 강제하지 않는다. 묶음은 같은 불변 조건과 수명으로 이동하는 값에만 사용한다.

U2의 로컬 구현에서는 `Revision`을 0부터 단조 증가하는 JavaScript 안전 정수로 확정했다. 로컬 저장과 Worker 메시지가 같은 수치 비교 규칙을 사용하고, 문자열 정렬이나 암묵적 변환 없이 오래된 자료를 판별하기 위한 선택이다. 계정 및 동기화 백로그에서 서버 ETag나 분산 revision을 도입하면 외부 표현과 로컬 수치 revision을 같은 타입으로 합치지 않고 연결 지점의 변환 책임을 다시 정한다.

## 메모와 공간 배치

메모 내용과 배치는 함께 수정될 수 있지만, 사용자가 보고 편집하는 기준 객체는 하나의 `Note`다. 화면의 pan과 zoom은 기기별 작업 위치이므로 계정 동기화 대상인 메모 좌표와 분리하는 방안을 제안한다.

```ts
interface Board {
  id: EntityId;
  title: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  revision: Revision;
  deletedAt?: IsoDateTime;
}

interface NoteGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

interface Note {
  id: EntityId;
  boardId: EntityId;
  content: string;
  geometry: NoteGeometry;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  revision: Revision;
  contentRevision: Revision;
  deletedAt?: IsoDateTime;
}

interface ViewportState {
  boardId: EntityId;
  offsetX: number;
  offsetY: number;
  zoom: number;
  updatedAt: IsoDateTime;
}

interface NoteGeometryFields {
  x: string;
  y: string;
  width: string;
  height: string;
}

interface NoteGeometryDraft {
  note: NoteRef;
  fields: NoteGeometryFields;
}

type RightPanel = "note-properties" | "batch-copy";

interface NoteWorkspaceSession {
  selectedNoteId?: EntityId;
  geometryDraft?: NoteGeometryDraft;
  activeRightPanel?: RightPanel;
}

interface RemovedNoteSnapshot {
  note: Note;
  removedAt: IsoDateTime;
}
```

`Note.content`가 사용자가 입력한 원문이다. 줄별 객체를 기준 데이터로 저장하면 한 번의 붙여넣기와 편집이 여러 엔티티 변경으로 갈라지고 원문의 줄바꿈을 복원하기 어려워진다. 분석용 줄은 원문에서 파생한다. URL이나 링크처럼 보이는 문자열도 `Note.content`에 일반 텍스트로 보관한다. 별도 링크 기능을 제공하지 않는 초기 범위를 반영해 이 초안에는 링크 객체, 미리보기 정보나 추출한 메타데이터를 추가하지 않는다.

`NoteGeometry`는 화면 픽셀이 아니라 작업 공간 좌표로 해석한다. 그래야 zoom을 바꿔도 메모의 논리 위치와 크기가 바뀌지 않는다. `revision`은 원문과 geometry를 포함한 저장 변경에 증가하고, `contentRevision`은 원문이 달라질 때만 증가한다. 이 구분은 위치, 크기와 겹침 순서만 바꿨을 때 사용 빈도와 분석 결과를 유지한다.

`zIndex`는 한 보드 안의 전체 겹침 순서를 나타낸다. 맨 앞으로 보내기는 대상 메모를 모든 메모 위에, 맨 뒤로 보내기는 모든 메모 아래에 놓고 나머지 메모의 상대 순서는 유지해야 한다. 여러 `zIndex`를 바꾸는 경우 `notes` store의 한 transaction으로 완료한다. 키보드 Tab 순서는 높은 `zIndex`부터 낮은 `zIndex` 순으로 같은 전체 순서를 사용하고 양의 `tabindex` 값으로 별도 순서를 만들지 않는다. 연속 정수로 다시 번호를 매길지, 간격을 둔 순서를 사용하다가 필요할 때 정리할지와 오래된 동률 자료의 보조 정렬 기준은 구현 전에 결정해야 한다. 이 규칙을 정하지 않은 채 현재 최댓값 또는 최솟값만 계속 더하지 않는다.

오른쪽 속성 패널에서 새로 적용하는 X, Y, 너비와 높이는 유한한 수이고 `0`보다 크며 애플리케이션이 한 곳에서 관리하는 해당 상한 이하여야 한다. 정확한 상한은 실제 화면과 보드 조작 성능을 검증한 뒤 승인한다. HTML 입력 제약과 폼 schema는 같은 규칙을 사용하되 application command가 저장 전에 다시 검사한다. 기존 `0` 좌표 record는 새 입력 검증 때문에 읽지 못하게 만들지 않고 migration 여부를 별도로 결정한다. 작은 화면 목록의 최대 세로 길이는 화면 표현 token이며 `Note.geometry.height`를 바꾸지 않는다.

메모 작업 영역의 너비가 작은 환경의 목록은 별도 메모 엔티티가 아니라 같은 `Note` 객체를 다른 형태로 표시한다. [공간형 보드와 작은 화면 목록 결정](../decisions/responsive-note-presentation.md)에 따라 작업 영역의 inline size가 `48rem` 미만이면 생성 순서로 표시하고, 목록으로 전환할 때 `Note.geometry`를 수정하지 않는다.

`ViewportState`는 기본적으로 기기 로컬에 둔다. 여러 기기에서 같은 보드를 열 때 마지막 pan과 zoom까지 동기화할지는 사용자 기대를 확인한 뒤 결정해야 한다.

`NoteWorkspaceSession.selectedNoteId`는 오른쪽 속성 패널의 대상을 식별할 뿐 메모 자체의 영구 속성이 아니다. `activeRightPanel`은 메모 속성 패널과 일괄 복사 패널 가운데 마지막으로 활성화한 패널을 나타낸다. 메모 선택은 `note-properties`를, 일괄 복사 동작은 `batch-copy`를 활성화하지만 패널 전환만으로 선택, 입력 초안이나 일괄 복사 항목을 지우지 않는다. 선택과 활성 패널이 바뀌거나 route를 벗어나면 유지할 범위는 화면 조작 결정에 따르고, IndexedDB `notes` record에 이 상태를 추가하지 않는다.

속성 입력은 사용자가 `-`나 빈 문자열처럼 아직 완성되지 않은 값을 입력할 수 있으므로 저장용 `NoteGeometry`와 별도 문자열 초안으로 둔다. `blur`, 패널 밖 클릭과 `Enter`는 같은 검증 및 적용 동작을 사용하며 유효하고 실제로 달라진 값만 `Note.geometry`에 반영한다. geometry 변경은 전체 revision만 증가시키고 content revision은 유지한다.

`RemovedNoteSnapshot`은 취소 알림이 유효한 동안 메모를 원래 위치, 크기와 겹침 순서로 복원하는 데 필요한 최소 예시다. 여러 제거를 배열로 보관할지 마지막 제거 하나만 유지할지, 새로고침 뒤에도 복원할지는 정해지지 않았으므로 이 예시를 승인된 저장 record로 사용하지 않는다.

## 일괄 복사 목록과 실행 취소

일괄 복사 목록의 배열 순서가 최종 결합 순서다. 각 항목에는 원본 메모를 찾을 참조와 항목을 추가한 당시의 텍스트를 함께 둔다. 사용자 화면에서는 `일괄 복사`를 사용하고, 기존 IndexedDB 이름을 바꾸는 migration 전까지 저장 구현에서만 `accumulators`를 이전 이름으로 인식한다.

```ts
interface BatchCopyItem {
  id: EntityId;
  sourceNote: NoteContentRef;
  textSnapshot: string;
  addedAt: IsoDateTime;
}

interface BatchCopyContent {
  items: readonly BatchCopyItem[];
  separator: string;
}

interface BatchCopyState {
  id: EntityId;
  content: BatchCopyContent;
  updatedAt: IsoDateTime;
  revision: Revision;
}

interface RemovedBatchCopyItem {
  item: BatchCopyItem;
  previousIndex: number;
}

interface BatchCopyRemovalHistory {
  undo: readonly RemovedBatchCopyItem[];
  redo: readonly RemovedBatchCopyItem[];
}
```

`textSnapshot`을 두면 메모를 편집하거나 삭제해도 이미 선택한 결과가 바뀌지 않는다. 같은 텍스트를 다시 추가해도 고유 ID가 다른 항목을 새로 만들 수 있다. `BatchCopyContent.separator`의 기본값은 줄바꿈이다.

[Redux의 실행 취소 이력 설명](https://redux.js.org/usage/implementing-undo-history)은 과거, 현재와 다시 실행할 상태를 구분하고 실행 취소 뒤 새 변경이 들어오면 다시 실행 목록을 비우는 모델을 설명한다. 현재 요구는 제거만 되돌리므로 전체 목록을 복제하지 않고 제거된 항목과 이전 index를 기록한다. 복원은 현재 내용에 대한 새 변경이며 저장 revision과 수정 시각을 과거 값으로 되돌리지 않는다.

제거 이력은 애플리케이션 실행 동안 메모리에 두어 라우트 이동 뒤에도 유지하고 새로고침하면 지운다. 실행 취소 뒤 추가, 재정렬 또는 제거가 성공하면 `redo`를 비운다. 추가와 순서 변경 자체는 undo 대상이 아니다.

후속 모바일 요구는 길게 누르기 항목 추가를 폐기하고 화면 헤더 아이콘으로 시작하는 일괄 복사 상태를 도입했다. 같은 메모를 반복해서 누르면 별도 항목과 클릭 횟수를 늘리고 `초기화`로 현재 작업을 비우는 결과는 확정됐다. `다음`은 별도 일괄 복사 확인 페이지로 이동한다. 확인 페이지의 재정렬, 복제와 삭제는 이 작업 사본만 바꾸며 원본 메모나 사용 횟수를 바꾸지 않는다. 다만 기존 저장 목록과의 결합, 헤더 뒤로가기, 확인 페이지 이탈과 새로고침 뒤 수명은 정해지지 않았으므로 아직 IndexedDB record에 넣지 않는다.

일괄 복사 상태의 현재 작업이 저장 목록과 분리된 임시 작업으로 승인되는 경우 다음과 같은 실행 중 객체를 검토할 수 있다. 이 예시는 자료 수명 결정이 아니며 `다음`의 저장 결과를 승인하기 전 구현하지 않는다.

```ts
interface MobileBatchCopyEntry {
  id: EntityId;
  sourceNote: NoteContentRef;
  textSnapshot: string;
}

type MobileBatchCopyStep = "collecting" | "confirming";

interface MobileBatchCopySession {
  step: MobileBatchCopyStep;
  entries: readonly MobileBatchCopyEntry[];
  clickCount: number;
  startedAt: IsoDateTime;
}
```

`collecting` 단계에서는 `clickCount`가 `entries.length`와 같아야 한다. 같은 메모를 반복해서 눌러도 각 클릭 당시의 content revision과 원문 스냅샷을 고유 ID의 entry로 남긴다. `초기화`는 두 값을 함께 비우고 `collecting` 단계를 유지한다. `다음`은 Clipboard 쓰기 없이 `confirming` 단계로 바꾸고 별도 확인 페이지로 이동한다.

`confirming` 단계에서 재정렬은 `entries` 순서만 바꾼다. 복제는 같은 `sourceNote`와 `textSnapshot`을 가지되 새 ID를 가진 entry를 만들고, 삭제는 대상 ID의 entry 하나만 제거한다. 이 세 동작은 `clickCount`를 바꾸지 않는다. 따라서 확인 단계부터 `clickCount`와 `entries.length`는 달라질 수 있다. 복제한 entry의 삽입 위치, 확인 작업과 저장된 `BatchCopyState`의 결합 방식 및 확인 페이지 이탈 뒤 수명은 별도 결정이 필요하다.

## 사용 빈도

합계는 별도 필드로 저장하지 않고 두 횟수에서 계산해 불일치 가능성을 줄인다. [텍스트 사용 빈도 집계 결정](../decisions/usage-counting.md)에 따라 메모 ID, 텍스트 전용 revision과 실행 당시 원문 스냅샷을 집계 단위로 사용한다.

```ts
interface UsageCounts {
  individualCopy: number;
  batchCopy: number;
}

interface TextUsageAggregate {
  id: EntityId;
  note: NoteContentRef;
  textSnapshot: string;
  counts: UsageCounts;
  updatedAt: IsoDateTime;
}
```

개별 복사는 넓은 화면의 `Command+클릭` 또는 모바일 목록의 길게 누르기로 Clipboard 쓰기와 횟수 저장이 완료된 경우에만 집계한다. Clipboard 쓰기는 성공했지만 횟수 저장이 실패하면 복사 성공을 되돌리지 않고 빈도 기록 실패를 별도로 알린다. 저장된 일괄 복사 항목 추가와 해당 횟수 증가는 `BatchCopyItemWriter`의 한 동작이 같은 IndexedDB transaction으로 완료하며, 제거, 순서 변경, 실행 취소와 다시 실행은 횟수를 바꾸지 않는다. 같은 텍스트를 다시 추가하면 성공한 횟수만큼 증가하고, 서로 다른 메모의 같은 원문은 합치지 않는다. 모바일 작업 초안의 `clickCount`와 확인 단계의 재정렬, 복제 및 삭제는 사용 빈도가 아니다. 확인 작업의 저장 목록 반영 방식이 정해지면 실제로 저장한 항목과 해당 횟수를 같은 transaction에 반영한다.

시간대별 사용 추이나 감사 기록이 요구되지 않는 초기 범위에서는 모든 클릭 이벤트를 영구 저장하기보다 집계 객체를 갱신하는 편이 데이터 양과 개인정보 노출을 줄인다. 나중에 시계열 분석이 승인되면 별도 이벤트 모델과 보존 기간을 설계해야 한다.

## 줄 단위 텍스트 분석

분석 입력은 `Note.content`에서 요청할 때 파생하고 원문과 비교용 문자열을 구분한다. 분석 결과가 오래된 메모를 가리키는지 판단할 수 있도록 텍스트 전용 revision을 참조한다.

```ts
interface AnalysisLineRef {
  note: NoteContentRef;
  lineIndex: number;
}

interface AnalysisLine extends AnalysisLineRef {
  rawText: string;
  normalizedText: string;
}

type AnalysisRelation = "exact" | "containment" | "surface";

interface AnalysisPair {
  left: AnalysisLineRef;
  right: AnalysisLineRef;
  relation: AnalysisRelation;
  score: number | null;
  algorithm: AlgorithmRef;
}

type AnalysisStatus = "running" | "completed" | "failed";

interface AnalysisRun {
  id: EntityId;
  boardId: EntityId;
  requestedAt: IsoDateTime;
  completedAt?: IsoDateTime;
  status: AnalysisStatus;
  inputNotes: readonly NoteContentRef[];
  results: readonly AnalysisPair[];
}
```

[Unicode Normalization Forms](https://unicode.org/reports/tr15/)는 시각적으로 같은 문자열이 서로 다른 코드 포인트 배열을 가질 수 있으며 정규화 형식으로 동등한 표현을 만들 수 있음을 정의한다. `normalizedText`는 분석 실행 중 만든 값이며 원문을 덮어쓰지 않는다. [줄 단위 텍스트 분석 결정](../decisions/text-analysis.md)에 따라 CRLF, LF와 CR을 줄바꿈으로 인식하고, 앞뒤 공백 제거, 내부 공백 정리, NFC 정규화와 locale 비의존 소문자 변환을 적용한다. 문장부호는 유지하고 정리한 결과가 빈 줄이면 제외한다.

`lineIndex`는 분석한 스냅샷 안의 0부터 시작하는 줄 위치다. 메모 편집 뒤에는 위치가 달라질 수 있으므로 `note.contentRevision`이 현재 content revision과 다르면 결과를 오래된 것으로 표시하거나 다시 분석해야 한다. 위치와 크기만 바뀌면 분석 결과를 폐기하지 않는다.

정확한 반복과 포함 관계를 먼저 분류한 뒤, 나머지 3 grapheme 이상인 줄은 extended grapheme 3-gram 집합의 Jaccard 점수를 계산한다. 정확한 반복과 포함 관계의 `score`는 `null`이고 문자열 근접 후보만 0보다 큰 계산값을 가진다. 이 후보는 점수 내림차순으로 보여주되 고정 합격 임계값이나 의미가 같다는 판정으로 사용하지 않는다. `score`의 의미를 재현할 수 있도록 알고리즘 이름과 버전을 함께 둔다. `AnalysisRun`은 현재 애플리케이션 실행의 메모리에서만 유지한다. 최우선 계정 및 동기화 백로그에서 결과 공유나 비교 이력을 승인하면 서버 저장 범위와 삭제 규칙을 다시 정해야 한다.

## 템플릿과 일회성 결과

플레이스홀더를 특수 구분자가 들어간 문자열 하나로 저장하면 사용자가 같은 문자를 원문에 입력했을 때 구분하기 어렵다. 일반 텍스트와 플레이스홀더를 판별 가능한 union으로 저장한다.

```ts
interface LiteralSegment {
  kind: "literal";
  value: string;
}

interface PlaceholderSegment {
  kind: "placeholder";
  key: string;
  label: string;
  defaultValue?: string;
}

type TemplateSegment = LiteralSegment | PlaceholderSegment;

interface TextTemplate {
  id: EntityId;
  title: string;
  segments: readonly TemplateSegment[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  revision: Revision;
  deletedAt?: IsoDateTime;
}

interface TemplateSuggestion {
  sourceLines: readonly [AnalysisLineRef, AnalysisLineRef];
  proposedSegments: readonly TemplateSegment[];
  algorithm: AlgorithmRef;
}

type TemplateInputValues = Readonly<Record<string, string>>;
```

일회성 결과는 `TextTemplate.segments`와 `TemplateInputValues`로 계산하며, 사용자가 별도로 저장하지 않는 한 엔티티로 만들 필요가 없다. 플레이스홀더 key의 중복을 허용하지 않고 segment 순서로 입력 UI를 만든다. 빈 값 허용과 필수값 표현은 템플릿 작성 화면의 오류 표시를 정할 때 확정한다.

템플릿 제안은 [템플릿 제안 생성 결정](../decisions/template-suggestion.md)에 따라 분석 결과 한 행의 두 원문 줄을 고정된 선택 쌍으로 전달받아 grapheme 단위로 비교한다. 공통 구간은 일반 텍스트로, 붙어 있는 차이 구간은 순서형 플레이스홀더로 제안한다. 의미를 추론한 이름을 만들지 않으며 공통 일반 텍스트가 없거나 두 줄이 같으면 제안하지 않고 수동 작성 동작을 보여준다. 사용자가 명시적으로 저장하기 전에는 `TextTemplate`이 아니다.

## 상호작용 설정

요구사항은 별도 설정 화면에서 넓은 화면의 `Command+Option+클릭` 일괄 복사 추가를 켜거나 끌 수 있게 한다. [일괄 복사 실행 동작 결정](../decisions/accumulation-activation.md)에 따라 preference 이름은 이전 `Command+클릭` 구현이 아니라 기능의 목적을 나타낸다.

```ts
interface InteractionPreferences {
  batchCopyShortcutEnabled: boolean;
  updatedAt: IsoDateTime;
}
```

운영체제 감지값을 저장하지 않고 사용자가 고른 동작을 저장한다. 다른 보조 키 조합을 자동 대체값으로 저장하지 않는다. 보조 키와 브라우저 충돌은 기기마다 다를 수 있으므로 이 설정은 기본적으로 기기에 보관한다. 계정 동기화 여부는 최우선 백로그에서 별도로 결정한다.

현재 저장 구현의 `metaClickEnabled`는 `Command+클릭`을 일괄 복사에 사용하던 의미를 담고 있어 새 조합의 설정으로 그대로 읽으면 안 된다. `batchCopyShortcutEnabled`, `UsageCounts`와 `BatchCopy...` 이름을 적용할 때에는 기존 `preferences`, `usage`와 `accumulators` record를 유지하는 IndexedDB schema migration을 함께 설계한다. 이름 변경만으로 object store를 비우거나 기존 횟수를 잃지 않는다.

## 로컬 저장 구조와 최우선 계정 데이터베이스 백로그

### 로컬 저장 구성

IndexedDB object store를 `boards`, `notes`, `accumulators`, `usage`, `templates`, `preferences`로 나누고, 사용자 동작 하나가 여러 store를 바꾸면 하나의 transaction에 묶는다. `notes`는 전체 revision과 content revision을 함께 저장한다. 분석용 줄은 원문에서 파생하므로 기본 저장 대상에서 제외하고, 분석 실행과 결과, 일괄 복사 항목 제거 이력, 메모 선택, 속성 입력 초안, 모바일 일괄 복사 작업, 저장 전 템플릿 제안과 일회성 출력은 실행 중 메모리에 둔다. 메모 제거 취소 자료의 정확한 보관 위치는 알림과 새로고침 수명을 승인한 뒤 정한다.

브라우저 저장 공간은 사용자가 지우거나 저장소 압박으로 정리될 수 있다. [StorageManager.persist 문서](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)는 영구 저장 요청이 boolean으로 승인 여부를 돌려주며 브라우저가 결정을 내린다고 설명한다. 현재 범위에는 내보내기, 가져오기와 브라우저가 지운 자료의 복구가 없으므로 IndexedDB를 백업이나 영구 보관으로 표현하지 않는다. HTTP와 HTTPS를 포함해 origin이 다르면 저장 자료를 공유하지 않는다는 점도 실행 안내에 반영해야 한다.

### 최우선 백로그: 계정 데이터베이스 제안

계정 데이터베이스에서는 board, note, accumulator item, usage aggregate와 template을 서로 참조하는 엔티티로 두고 account ID는 서버 저장 계층에서 결합한다. 엔티티 ID, account ID, revision과 foreign key는 명시적 열로 검증하고, 템플릿 segment나 알고리즘별 분석 세부처럼 형태가 실제로 달라지는 값만 JSON 계열 저장을 검토한다.

삭제는 즉시 행을 없애기보다 `deletedAt`과 revision이 있는 tombstone을 먼저 동기화하는 방안을 검토한다. [Apache CouchDB의 문서 삭제 API](https://docs.couchdb.org/en/stable/api/document/common.html#delete--db-docid)는 삭제도 새 revision으로 표현해 복제 대상이 되는 사례를 보여준다. tombstone 보존 기간과 계정 완전 삭제 요청의 처리 방식은 별도 승인이 필요하다.

계정 모드가 브라우저 캐시도 사용한다면 서버 객체와 로컬 객체 가운데 어느 쪽이 기준인지, 오프라인 변경을 어떤 순서로 전송할지와 충돌 UI를 정해야 한다. 단순한 최신 시각 우선 덮어쓰기는 기기 시계 차이와 동시 편집에서 변경을 잃을 수 있으므로 승인된 정책 없이 적용하지 않는다.

## 저장 포트 형태 제안

도메인 use case가 IndexedDB나 HTTP 응답 형식을 직접 알지 않도록 최소 포트를 주입한다.

```ts
interface NoteRepository {
  getByBoard(boardId: EntityId): Promise<readonly Note[]>;
  save(note: Note): Promise<Note>;
  remove(note: NoteRef): Promise<void>;
}

interface TextAnalyzer {
  analyze(notes: readonly Note[]): Promise<AnalysisRun>;
}

interface AppDependencies {
  notes: NoteRepository;
  textAnalyzer: TextAnalyzer;
}
```

실제 메서드와 오류 타입은 use case가 정해진 뒤 다듬어야 한다. 현재는 로컬 구현에 필요한 책임만 확정하고, 최우선 계정 및 동기화 백로그에서 원격 구현이 같은 책임을 제공할 수 있는지 다시 검증한다.

## 현재 범위의 결정 기록

- [로컬 저장과 실행 중 상태 결정](../decisions/local-storage-and-ephemeral-state.md)
- [일괄 복사 순서와 제거 복구 결정](../decisions/accumulator-ordering-and-recovery.md)
- [텍스트 사용 빈도 집계 결정](../decisions/usage-counting.md)
- [줄 단위 텍스트 분석 결정](../decisions/text-analysis.md)
- [템플릿 제안 생성 결정](../decisions/template-suggestion.md)
- [일괄 복사 실행 동작 결정](../decisions/accumulation-activation.md)
- [메모 선택과 오른쪽 속성 패널 결정](../decisions/note-selection-and-properties.md)
- [메모 제거와 취소 알림 결정](../decisions/note-removal-recovery.md)

### 최우선 계정 및 동기화 백로그에서 결정할 사항

- viewport를 기기별로 둘지 계정과 함께 동기화할지
- 계정 실행 형태의 충돌 해결, tombstone 보존, 완전 삭제와 오프라인 동작
