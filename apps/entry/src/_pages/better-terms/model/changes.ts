export interface ChangeSection {
  id: string;
  reportId: string;
  before: readonly [startLine: number, endLine: number];
  after: readonly [startLine: number, endLine: number];
  reason: string;
}

export const reports = [
  { id: "performance", title: "브라우저 렌더링과 웹 성능 지표" },
  { id: "accessibility", title: "웹 접근성과 키보드 상호작용: 초점 이동이 실제 이용을 결정한다" },
  { id: "responsive", title: "반응형 레이아웃과 CSS 컨테이너 쿼리" },
  { id: "cache", title: "클라이언트 데이터 갱신과 캐시" },
  { id: "security", title: "웹 프론트엔드의 보안 모델과 사용자 입력" },
] as const;

export const changeSections = [
  {
    id: "performance-lcp",
    reportId: "performance",
    before: [3, 3],
    after: [3, 3],
    reason: "LCP가 일찍 측정되어도 페이지의 다른 요소가 표시되거나 조작 가능한지는 알 수 없다는 뜻을 밝혔습니다.",
  },
  {
    id: "performance-threshold",
    reportId: "performance",
    before: [5, 5],
    after: [5, 5],
    reason: "권장 기준은 방문 값의 75번째 백분위수로 평가하며 매 방문의 표시 시간을 약속하지 않는다는 점을 밝혔습니다.",
  },
  {
    id: "accessibility-focus",
    reportId: "accessibility",
    before: [9, 9],
    after: [9, 9],
    reason: "초점 표시의 존재, 면적과 대비를 판단하는 기준이 서로 다르다는 점을 구별했습니다.",
  },
  {
    id: "accessibility-navigation",
    reportId: "accessibility",
    before: [11, 11],
    after: [11, 11],
    reason: "초점만 받아도 화면이 바뀔 때 키보드 탐색에 생기는 문제를 직접 적었습니다.",
  },
  {
    id: "responsive-context",
    reportId: "responsive",
    before: [15, 15],
    after: [15, 15],
    reason: "뷰포트, 사용자 설정과 구성 요소가 받은 공간을 구별했습니다.",
  },
  {
    id: "responsive-media",
    reportId: "responsive",
    before: [17, 17],
    after: [17, 17],
    reason: "미디어 쿼리가 문서 전체에 같은 배치 규칙을 적용할 때 유용하다는 점을 명시했습니다.",
  },
  {
    id: "cache-optimistic",
    reportId: "cache",
    before: [21, 21],
    after: [21, 21],
    reason: "진행 중인 재조회가 임시 값을 덮어쓰지 않도록 취소하는 행동을 명시했습니다.",
  },
  {
    id: "cache-outcome",
    reportId: "cache",
    before: [23, 23],
    after: [23, 23],
    reason: "연결이나 요청이 실패했을 때 보여 줄 값에 따라 화면의 최신성과 응답 속도가 달라진다는 뜻을 밝혔습니다.",
  },
  {
    id: "security-context",
    reportId: "security",
    before: [27, 27],
    after: [27, 27],
    reason: "DOM의 텍스트와 HTML 조각은 해석 방식과 필요한 보호 조치가 다르다는 점을 밝혔습니다.",
  },
  {
    id: "security-controls",
    reportId: "security",
    before: [29, 29],
    after: [29, 29],
    reason: "CSP와 Trusted Types만으로 출력 문맥에 맞는 인코딩이나 HTML 정화를 대신할 수 없다는 한계를 명시했습니다.",
  },
] as const satisfies readonly ChangeSection[];
