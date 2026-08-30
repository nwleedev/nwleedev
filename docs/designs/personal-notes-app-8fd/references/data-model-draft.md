# 개인 메모 데이터 구조 조사 초안

## 결론

로컬 모드와 계정 모드는 같은 논리 객체를 사용하고 저장 방식만 어댑터에서 바꾸는 구성이 적합하다. 메모 원문과 공간 좌표를 기준 정보로 두고, 분석용 줄과 정규화 문자열은 요청할 때 만드는 파생 정보로 다뤄야 한다. 누적 텍스트는 나중의 메모 편집에 따라 뜻하지 않게 바뀌지 않도록 누적 시점의 텍스트 스냅샷을 보관하는 방안을 우선 검토한다.

계정 동기화에 대비해 각 동기화 대상에는 안정적인 ID, revision, 수정 시각과 삭제 표시가 필요하다. 그러나 충돌 해결, 삭제 보존 기간과 계정별 보관 범위가 정해지지 않았으므로 이 초안은 데이터베이스 스키마가 아니다. 아래 TypeScript 형태는 논리 객체와 쟁점을 검토하기 위한 예시이며 승인된 API나 구현이 아니다.

이 문서는 [개인 메모 애플리케이션 요구사항](../requirements.md)의 공간형 메모, 누적과 실행 취소, 사용 빈도, 줄 단위 겹침, 템플릿 및 계정 동기화에 필요한 값을 조사한 참고 자료다. 도메인 설계 담당자와 데이터 설계 담당자가 객체 책임을 검토하고 결정 책임자가 보관 및 동기화 규칙을 승인할 때 사용한다. 공식 문서와 표준은 2026년 8월 30일에 검토했다.

## 조사 근거

[Indexed Database API 3.0 표준](https://www.w3.org/TR/IndexedDB/)은 키로 식별하는 구조화된 값, 인덱스와 트랜잭션을 정의한다. 따라서 로컬 모드에서 메모, 누적 상태, 사용 횟수와 템플릿을 별도 object store에 두면서 하나의 사용자 동작에 필요한 변경을 트랜잭션으로 묶을 수 있다.

[TypeScript의 interface 문서](https://www.typescriptlang.org/docs/handbook/interfaces.html)는 객체 형태를 이름 붙여 검사하는 방법을 설명하고, [타입 호환성 문서](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)는 구조적 타입 체계의 호환 규칙을 설명한다. 아래 예시는 IndexedDB나 서버 API의 DTO를 UI에 퍼뜨리지 않고 도메인 객체와 저장 포트의 형태를 먼저 논의하기 위해 interface와 판별 가능한 union을 사용한다.

[UUID RFC 9562](https://www.rfc-editor.org/rfc/rfc9562.html)는 중앙 등록 없이 UUID를 생성하는 방법과 시간 순서를 반영하는 UUIDv7을 표준화한다. 여러 기기나 오프라인 상태에서 엔티티를 만들 수 있는 계정 모드에는 클라이언트에서도 충돌 가능성이 낮은 ID를 만들 수 있다는 장점이 있다. UUIDv7을 실제로 선택할지는 데이터베이스와 ID를 생성 시각 순서로 조회할 필요를 정한 뒤 결정해야 한다.

[HTTP Semantics의 If-Match 규칙](https://httpwg.org/specs/rfc9110.html#field.if-match)은 클라이언트가 알고 있는 표현과 서버의 현재 표현이 일치할 때만 변경을 적용해 갱신 손실을 방지한다. 이 근거에 따라 동기화 객체에는 단순 수정 시각과 별도로 서버가 검증할 revision 또는 ETag가 필요하다.

[PostgreSQL 제약조건 문서](https://www.postgresql.org/docs/current/ddl-constraints.html)는 primary key, unique와 foreign key가 데이터 관계를 검사하는 방식을 설명한다. [PostgreSQL JSON 타입 문서](https://www.postgresql.org/docs/current/datatype-json.html)는 `jsonb`의 처리 및 인덱싱 장점과 일반 관계형 열의 무결성 규칙 차이를 설명한다. 이는 PostgreSQL 선정 근거가 아니라, 계정 데이터베이스에서 엔티티 식별자와 관계를 명시적 열로 두고 형태가 달라지는 분석 세부사항만 JSON 계열 값으로 둘지 비교해야 한다는 근거다.

## 공통 식별자와 실행 모드별 제공 항목

실행 모드는 저장 엔티티가 아니라 composition root가 읽는 구성이다. UI에는 환경변수 원문 대신 기능 목록만 전달한다.

```ts
type EntityId = string;
type IsoDateTime = string;
type Revision = string;

interface NoteRef {
  id: EntityId;
  revision: Revision;
}

interface AlgorithmRef {
  type: string;
  version: string;
}

type AppCapabilities =
  | {
      runtimeMode: "local";
      account: false;
      remoteSync: false;
      serverAnalysis: false;
    }
  | {
      runtimeMode: "account";
      account: true;
      remoteSync: true;
      serverAnalysis: boolean;
    };
```

`AppCapabilities`는 UI에 표시할 항목과 어댑터 구성을 일치시키기 위한 예시다. 서버 권한을 나타내지 않으며 계정 모드의 인증과 메모 접근 검사를 대신할 수 없다. `serverAnalysis`가 거짓이어도 브라우저 분석기는 제공할 수 있다.

`NoteRef`처럼 같은 대상을 식별하고 버전을 확인하는 속성은 하나의 값으로 함께 전달한다. `note.id`와 `note.revision`, `algorithm.type`과 `algorithm.version`으로 접근하면 `noteId`, `noteRevision`, `algorithmType`, `algorithmVersion`의 접두어 반복을 줄이고 서로 다른 대상의 값을 잘못 조합할 가능성도 낮출 수 있다. 다만 route parameter가 이미 특정 메모를 가리키거나 속성 하나만 필요한 함수까지 중첩 객체를 강제하지 않는다. 묶음은 같은 불변 조건과 수명으로 이동하는 값에만 사용한다.

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
  deletedAt?: IsoDateTime;
}

interface ViewportState {
  boardId: EntityId;
  offsetX: number;
  offsetY: number;
  zoom: number;
  updatedAt: IsoDateTime;
}
```

`Note.content`가 사용자가 입력한 원문이다. 줄별 객체를 기준 데이터로 저장하면 한 번의 붙여넣기와 편집이 여러 엔티티 변경으로 갈라지고 원문의 줄바꿈을 복원하기 어려워진다. 분석용 줄은 원문에서 파생한다. URL이나 링크처럼 보이는 문자열도 `Note.content`에 일반 텍스트로 보관한다. 별도 링크 기능을 제공하지 않는 초기 범위를 반영해 이 초안에는 링크 객체, 미리보기 정보나 추출한 메타데이터를 추가하지 않는다.

`NoteGeometry`는 화면 픽셀이 아니라 작업 공간 좌표로 해석하는 방안을 제안한다. 그래야 zoom을 바꿔도 메모의 논리 위치와 크기가 바뀌지 않는다. 최소 크기, 최대 크기, 좌표 범위와 z-index 재정렬 규칙은 화면 동작 결정 뒤 정해야 한다.

모바일 기기와 화면 너비가 작은 환경의 목록은 별도 메모 엔티티가 아니라 같은 `Note` 객체를 다른 형태로 표시한다. 목록으로 전환할 때 `Note.geometry`를 수정하지 않는 방안을 제안한다. 목록 정렬을 위한 값을 따로 보관할지는 목록 정렬 규칙이 정해진 뒤 결정해야 한다.

`ViewportState`는 기본적으로 기기 로컬에 둔다. 여러 기기에서 같은 보드를 열 때 마지막 pan과 zoom까지 동기화할지는 사용자 기대를 확인한 뒤 결정해야 한다.

## 누적 텍스트와 실행 취소

누적 목록의 배열 순서가 최종 결합 순서다. 각 항목에는 원본 메모를 찾을 참조와 누적 당시의 텍스트를 함께 둔다.

```ts
interface AccumulatedTextItem {
  id: EntityId;
  sourceNote: NoteRef;
  textSnapshot: string;
  addedAt: IsoDateTime;
}

interface AccumulatorContent {
  items: readonly AccumulatedTextItem[];
  separator: string;
}

interface AccumulatorState {
  id: EntityId;
  content: AccumulatorContent;
  updatedAt: IsoDateTime;
  revision: Revision;
}

interface HistoryState<T> {
  past: readonly T[];
  present: T;
  future: readonly T[];
}

type AccumulatorHistory = HistoryState<AccumulatorContent>;
```

`textSnapshot`을 두면 메모를 편집하거나 삭제해도 이미 누적한 결과가 갑자기 바뀌지 않는다. 반대로 누적 결과가 항상 최신 메모 내용을 따라야 한다면 스냅샷 대신 참조를 해석해야 한다. 어느 동작이 맞는지는 결정 책임자의 승인이 필요하다.

[Redux의 실행 취소 이력 설명](https://redux.js.org/usage/implementing-undo-history)은 상태를 `past`, `present`, `future`로 나누고, 실행 취소 뒤 새 변경을 하면 `future`를 비우는 일반 모델을 설명한다. 제거 전 `AccumulatorContent`를 `past`에 두면 항목과 원래 순서를 함께 복원할 수 있다. 서버가 발급한 revision과 수정 시각은 과거 값으로 되돌리지 않고, 복원된 content를 새 변경으로 저장한다. 전체 텍스트를 매번 복제할지, 명령과 역연산만 저장할지는 예상 항목 수와 메모리 측정 뒤 정한다.

현재 요구사항은 제거한 항목을 실행 취소하고 다시 실행할 수 있어야 한다고 정한다. 순서 변경, 추가, 구분자 변경까지 같은 이력에 넣을지, 페이지 이동이나 브라우저 종료 뒤에도 이력을 보관할지는 아직 정해지지 않았다.

## 사용 빈도

합계는 별도 필드로 저장하지 않고 두 횟수에서 계산하는 편이 불일치 가능성을 줄인다. 메모 내용이 바뀌기 전후를 같은 텍스트로 셀지 결정할 수 있도록 revision과 스냅샷을 함께 둔 예시다.

```ts
interface TextUsageAggregate {
  id: EntityId;
  note: NoteRef;
  textSnapshot: string;
  ordinaryCopyCount: number;
  accumulationCount: number;
  updatedAt: IsoDateTime;
}
```

클립보드 쓰기에 실패한 일반 클릭을 사용으로 셀지, 누적 뒤 제거한 항목의 누적 횟수를 유지할지와 같은 원문을 가진 서로 다른 메모를 합산할지는 사용 횟수 집계 규칙으로 정해야 한다. 이 결정 전에는 집계 키와 서버의 atomic increment 방식을 확정할 수 없다.

시간대별 사용 추이나 감사 기록이 요구되지 않는 초기 범위에서는 모든 클릭 이벤트를 영구 저장하기보다 집계 객체를 갱신하는 편이 데이터 양과 개인정보 노출을 줄인다. 나중에 시계열 분석이 승인되면 별도 이벤트 모델과 보존 기간을 설계해야 한다.

## 줄 단위 겹침 분석

분석 입력은 `Note.content`에서 그때그때 파생하고 원문과 비교용 문자열을 구분한다. 분석 결과가 오래된 메모를 가리키는지 판단할 수 있도록 note revision을 참조한다.

```ts
interface AnalysisLineRef {
  note: NoteRef;
  lineIndex: number;
}

interface AnalysisLine extends AnalysisLineRef {
  rawText: string;
  normalizedText: string;
}

type OverlapKind = "exact" | "containment" | "lexical";

interface OverlapPair {
  left: AnalysisLineRef;
  right: AnalysisLineRef;
  kind: OverlapKind;
  score: number;
  algorithm: AlgorithmRef;
}

type AnalysisStatus = "running" | "completed" | "cancelled" | "failed";

interface AnalysisRun {
  id: EntityId;
  boardId: EntityId;
  requestedAt: IsoDateTime;
  completedAt?: IsoDateTime;
  status: AnalysisStatus;
  inputNotes: readonly NoteRef[];
  results: readonly OverlapPair[];
}
```

[Unicode Normalization Forms](https://unicode.org/reports/tr15/)는 시각적으로 같은 문자열이 서로 다른 코드 포인트 배열을 가질 수 있으며 정규화 형식으로 동등한 표현을 만들 수 있음을 정의한다. `normalizedText`는 분석 실행 중 만든 값이며 원문을 덮어쓰지 않는다. 대소문자, 앞뒤 공백, 빈 줄과 문장부호 처리 규칙은 별도 결정이 필요하다.

`lineIndex`는 분석한 스냅샷 안의 0부터 시작하는 줄 위치다. 메모 편집 뒤에는 위치가 달라질 수 있으므로 `note.revision`이 현재 revision과 다르면 결과를 오래된 것으로 표시하거나 다시 분석해야 한다.

`score`의 범위와 의미는 `kind`마다 다를 수 있으므로 알고리즘 이름과 버전을 함께 둔다. 분석 결과를 영구 저장할 필요가 없다면 `AnalysisRun`은 메모리에서만 유지할 수 있다. 계정 모드에서 결과를 공유하거나 비교 이력을 보여주기로 승인되면 서버 저장 범위와 삭제 규칙을 다시 정해야 한다.

## 템플릿과 일회성 결과

플레이스홀더를 특수 구분자가 들어간 문자열 하나로 저장하면 사용자가 같은 문자를 원문에 입력했을 때 구분하기 어렵다. literal과 placeholder를 구분하는 union으로 저장하는 방안을 제안한다.

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
  sourceLines: readonly AnalysisLineRef[];
  proposedSegments: readonly TemplateSegment[];
  algorithm: AlgorithmRef;
}

type TemplateInputValues = Readonly<Record<string, string>>;
```

일회성 결과는 `TextTemplate.segments`와 `TemplateInputValues`로 계산하며, 사용자가 별도로 저장하지 않는 한 엔티티로 만들 필요가 없다. placeholder의 key 중복, 빈 값 허용, 필수값, 입력 순서와 형식 검사는 UI 결정과 함께 정해야 한다.

템플릿 제안은 분석 결과를 근거로 하지만 사용자가 승인하기 전에는 `TextTemplate`이 아니다. 분석 실행을 저장하지 않아도 제안 근거를 설명할 수 있도록 원본 줄 참조와 알고리즘 버전을 포함한다. 이 구분은 잘못된 자동 제안이 저장된 템플릿처럼 보이는 일을 막는다.

## 상호작용 설정

요구사항은 별도 설정 화면과 대체 누적 조작을 요구하지만 정확한 선택지는 아직 정하지 않았다. 다음 형태는 조사 문서의 화면 제안과 데이터 쟁점을 연결하는 예시다.

```ts
type AccumulationTrigger =
  | "meta-click"
  | "visible-button"
  | "accumulation-mode";

interface InteractionPreferences {
  accumulationTrigger: AccumulationTrigger;
  showCopySuccessNotice: boolean;
  updatedAt: IsoDateTime;
}
```

선택지 이름과 기본값은 [화면 구성과 공간형 메모 상호작용 조사](interface-layout-research.md)의 제안을 검토한 뒤 승인해야 한다. 운영체제 감지 결과를 저장하기보다 사용자가 고른 동작을 저장하고, 지원되지 않는 선택지는 UI에서 설명하는 편이 예측 가능하다. modifier key와 브라우저 충돌은 기기마다 다를 수 있으므로 이 설정은 기본적으로 기기에 보관하고 계정 동기화 여부를 별도로 결정한다.

## 로컬 저장소와 계정 데이터베이스 구조

### 로컬 모드 제안

IndexedDB object store를 `boards`, `notes`, `accumulators`, `usage`, `templates`, `preferences`로 나누고, 사용자 동작 하나가 여러 store를 바꾸면 하나의 transaction에 묶는다. `analysisLines`는 원문에서 파생하므로 기본 저장 대상에서 제외한다. `analysisRuns`도 결과 이력이 승인되기 전에는 일시 상태로 둔다.

브라우저 저장 공간은 사용자가 지우거나 저장소 압박으로 정리될 수 있다. [StorageManager.persist 문서](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)는 영구 저장 요청이 boolean으로 승인 여부를 돌려주며 브라우저가 결정을 내린다고 설명한다. 따라서 로컬 백업과 내보내기 동작을 별도 요구사항으로 정하지 않으면 영구 보관을 보장할 수 없다.

### 계정 모드 제안

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

interface TextOverlapAnalyzer {
  analyze(notes: readonly Note[]): Promise<AnalysisRun>;
  cancel(runId: EntityId): Promise<void>;
}

interface AppDependencies {
  notes: NoteRepository;
  overlapAnalyzer: TextOverlapAnalyzer;
}
```

실제 메서드와 오류 타입은 use case가 정해진 뒤 다듬어야 한다. 이 예시는 로컬과 계정 구현이 같은 책임을 제공해야 한다는 점만 보여준다.

## 결정이 필요한 사항

- 누적 항목이 클릭 당시 텍스트를 유지할지, 원본 메모의 최신 내용을 따라갈지
- 메모 수정 전후 사용 횟수와 같은 내용의 서로 다른 메모를 어떤 단위로 합칠지
- 클립보드 쓰기 실패와 나중에 제거한 누적 항목을 사용 횟수에 포함할지
- 실행 취소 이력에 제거 외의 동작을 포함할지와 이력의 최대 크기 및 보존 기간
- 빈 줄, 공백, 대소문자, 문장부호와 유니코드 정규화 규칙
- 분석 결과와 템플릿 제안을 저장할지, 저장한다면 언제 오래된 것으로 처리할지
- viewport를 기기별로 둘지 계정과 함께 동기화할지
- 계정 모드의 충돌 해결, tombstone 보존, 완전 삭제와 오프라인 동작
- 로컬 데이터의 내보내기, 가져오기와 저장소 정리 위험을 초기 범위에 포함할지
