# 홈페이지 Engineering Contribution 선정

인공지능팩토리 경력에는 **Data & Monitoring, Async State & Realtime, Browser Runtime & Realtime Data, Reliability & Delivery** 네 기여를 소개한다. 각 기여는 문제 해결 절차 전체가 아니라 판단, 확인된 변화, 수치의 조건과 기술 맥락만 보여준다.

이 결정은 [Experience 요구사항](../requirements.md#experience)과 [개발자 소개에서 앞세울 가치](developer-positioning.md)를 같은 페이지에서 뒷받침하기 위한 기준이다. 별도의 사례 목록과 상세 페이지는 만들지 않는다.

## 비교한 구성과 선택 이유

기존 구성의 작업별 이력, 장시간 문서 생성, 화면 정지 해결과 대시보드 개선을 유지하는 방식과, 회사별 Engineering Contribution으로 다시 편집하는 방식을 비교했다.

작업별 이력 구성은 사용자에게 보여줄 정보 단위를 정한 경험을 설명하지만, 첫 소개에서 앞세우기로 한 운영 문제와 기술적 판단을 직접 보여주는 근거는 다른 항목보다 약하다. 대신 E2E 검증과 인증 상태 문제를 Reliability & Delivery로 포함하면 구현 이후 실제 사용 흐름을 확인하는 역량까지 이어진다.

- Data & Monitoring은 조회 구조 개선, 데이터 전송량 감소와 표시값 교정을 함께 보여준다.
- Async State & Realtime은 장시간 작업에서 이벤트와 서버 상태 확인의 역할을 구분한 판단을 보여준다.
- Browser Runtime & Realtime Data는 대용량 응답 처리 위치와 REST 및 실시간 데이터 병합을 보여준다.
- Reliability & Delivery는 70개 이상의 실행 가능한 E2E 시나리오와 인증 상태 문제 발견을 보여준다.

작업별 이력 구성 경험은 홈페이지의 필수 Contribution에서는 제외하지만, 장시간 작업과 다른 경험의 정보 구성 근거로 사용할 수 있다. 기존 상세 분석은 [경험의 편집 근거](../references/featured-case-copy.md)에 남긴다.

## 화면에 표시할 정보

각 기여에는 제목, 한 문장 설명, 확인된 수치 또는 결과, 기술 정보와 필요한 경우에만 짧은 보충 설명을 둔다. 모든 항목을 같은 크기와 같은 카드 모양으로 만들지 않는다.

회사 화면은 사용하지 않는다. 기술 관계를 글보다 도식으로 보는 편이 분명할 때에만 다음과 같은 단순한 관계를 검토한다.

- `Browser → Next.js API → Prometheus`
- `Event → Server state check → UI update`
- `API → SharedWorker → Main Thread`

긴 상태도, 추정한 시스템 구성과 네 경험에 반복되는 도식은 추가하지 않는다. 상세한 해결 과정은 블로그에서 관리한다.

크러스트유니버스 및 Quarkonix 경력은 상태 일관성, 로딩 성능과 WebSocket 연결 문제를 압축해서 제공한다. 확인된 수치가 없는 항목에는 성과 수치를 만들지 않는다.
