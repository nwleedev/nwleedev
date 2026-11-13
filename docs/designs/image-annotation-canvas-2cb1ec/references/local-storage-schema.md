# 로컬 프로젝트 저장 스키마

프로젝트, 원본 이미지, 이미지 배치와 메모는 별도의 IndexedDB object store에 저장한다. 아래 PostgreSQL DDL은 필드와 관계를 표현한 설계 예시다. IndexedDB에서는 기본 키와 인덱스를 정의하고, 외래 키와 값 제약은 저장 코드가 트랜잭션 안에서 검사한다. 원본의 `bytea`는 IndexedDB의 `Blob`에 대응한다. [IndexedDB 표준](https://www.w3.org/TR/IndexedDB-3/#key-path-construct), [PostgreSQL 제약 조건](https://www.postgresql.org/docs/current/ddl-constraints.html)

```sql
CREATE TABLE projects (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  updated_at timestamptz NOT NULL,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0)
);

CREATE TABLE assets (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  id uuid NOT NULL,
  mime_type text NOT NULL,
  original_width integer NOT NULL CHECK (original_width > 0),
  original_height integer NOT NULL CHECK (original_height > 0),
  original_bytes bytea NOT NULL,
  PRIMARY KEY (project_id, id)
);

CREATE TABLE placements (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL,
  x double precision NOT NULL,
  y double precision NOT NULL,
  width double precision NOT NULL CHECK (width > 0),
  height double precision NOT NULL CHECK (height > 0),
  z_index integer NOT NULL,
  quality smallint NOT NULL DEFAULT 100 CHECK (quality BETWEEN 0 AND 100),
  FOREIGN KEY (project_id, asset_id) REFERENCES assets(project_id, id)
);

CREATE INDEX placements_by_project_order ON placements (project_id, z_index);
CREATE INDEX placements_by_asset ON placements (project_id, asset_id);

CREATE TABLE memos (
  id uuid PRIMARY KEY,
  placement_id uuid NOT NULL UNIQUE REFERENCES placements(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('top', 'right', 'bottom', 'left')),
  width double precision NOT NULL CHECK (width > 0),
  height double precision NOT NULL CHECK (height > 0)
);

CREATE TABLE memo_updates (
  memo_id uuid NOT NULL REFERENCES memos(id) ON DELETE CASCADE,
  update_id uuid NOT NULL,
  payload bytea NOT NULL,
  PRIMARY KEY (memo_id, update_id)
);
```

DDL은 배치당 메모 하나를 가정한다. `memo_updates`는 동시 입력을 병합하는 설계 후보다. 변경분의 바이너리 형식과 본문 복원 및 변경분 정리 방식은 동시 편집 도구를 결정할 때 확정한다. [Yjs 변경분 형식](https://docs.yjs.dev/api/document-updates)

## 필드와 인덱스 변경 기준

- 필드를 추가할 때는 값을 쓰고 읽는 동작, 다시 열었을 때 복원해야 하는 이유와 값을 저장할 레코드를 명시한다. 원본 대비 배율은 배치 너비와 원본 너비로 계산한다. 선택 상태와 드래그 미리보기는 편집 화면에서 관리한다.
- 인덱스는 조회 조건과 정렬 순서에 맞춰 정의한다. 배치는 프로젝트와 겹침 순서로 조회하고, 원본을 정리하기 전에는 프로젝트와 원본 식별자로 남은 배치를 찾는다.
- 스키마를 배포한 뒤 필드나 키를 바꿀 때는 기존 레코드의 변환 방식과 실패 시 처리 방법을 정한다. 새 버전에서 이전 프로젝트를 열어 원본, 배치와 메모를 복원할 수 있는지 확인한다. [IndexedDB 업그레이드 트랜잭션](https://www.w3.org/TR/IndexedDB-3/#upgrade-transaction-construct)

## 저장 시 검사할 관계와 값

- 배치는 같은 프로젝트의 원본을 참조한다. 좌표와 크기는 유한한 숫자이며 배치 크기는 원본 비율을 유지하고 원본보다 커질 수 없다.
- 메모는 존재하는 배치에 연결한다. 배치를 삭제하면 메모와 변경분도 함께 정리한다. 다른 배치가 참조하는 원본은 보존한다.
- 편집 값과 프로젝트의 `revision`을 함께 커밋한다. 같은 위치나 크기의 동시 수정은 마지막 커밋의 값을 표시한다.
