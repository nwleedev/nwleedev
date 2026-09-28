export interface ChangeSection {
  id: string;
  before: readonly [startLine: number, endLine: number];
  after: readonly [startLine: number, endLine: number];
  reason: string;
}

export const changeSections = [
  {
    id: "change-1",
    before: [1, 1],
    after: [1, 1],
    reason: "제목에서 React와 Spring Boot, 독자가 얻을 내용을 바로 알 수 있게 했습니다.",
  },
  {
    id: "change-2",
    before: [5, 5],
    after: [5, 7],
    reason: "초안 생성, 기대 동작 판단, 채택 전 확인을 나누고 각 판단의 대상을 분명히 했습니다.",
  },
  {
    id: "change-3",
    before: [10, 11],
    after: [12, 13],
    reason: "자료의 권고와 보고서에서 적용한 판단을 구분하고, 확인할 행동을 직접 적었습니다.",
  },
  {
    id: "change-4",
    before: [15, 17],
    after: [17, 19],
    reason: "기대 동작의 근거, 실패 사례 선택 기준과 테스트 수준을 구체적으로 적었습니다.",
  },
  {
    id: "change-5",
    before: [21, 21],
    after: [23, 23],
    reason: "AI에 제공할 코드와 설정, 기대 동작 및 모의 처리 대상을 구분했습니다.",
  },
  {
    id: "change-6",
    before: [25, 27],
    after: [27, 29],
    reason: "각 단계에서 누가 무엇을 정하고 어떤 동작을 확인하는지 표 셀에 명시했습니다.",
  },
  {
    id: "change-7",
    before: [32, 32],
    after: [34, 34],
    reason: "예시 요청을 실제 검사할 동작에 맞춰 바꾸도록 안내했습니다.",
  },
  {
    id: "change-8",
    before: [34, 34],
    after: [36, 36],
    reason: "요청문의 자리표시자와 예상 응답을 확인할 동작에 맞게 바꿨습니다.",
  },
  {
    id: "change-9",
    before: [40, 40],
    after: [42, 42],
    reason: "모호한 사례를 실제 규칙을 확인할 경계값 사례로 적었습니다.",
  },
  {
    id: "change-10",
    before: [42, 42],
    after: [44, 44],
    reason: "막연한 화면 간 이동 표현을 탐색과 복원이라는 실제 행동으로 바꿨습니다.",
  },
  {
    id: "change-11",
    before: [46, 46],
    after: [48, 48],
    reason: "저장소에서 확인한 도구와 파일을 간결하게 설명하고 권고의 한계를 밝혔습니다.",
  },
  {
    id: "change-12",
    before: [53, 55],
    after: [55, 57],
    reason: "Spring 테스트 표에서 요청 매핑, 엔티티 매핑과 저장된 값처럼 검사할 대상을 적었습니다.",
  },
  {
    id: "change-13",
    before: [57, 57],
    after: [59, 59],
    reason: "테스트 도구별 확인 대상과 인증 요청의 허용 및 거부 조건을 분명히 했습니다.",
  },
  {
    id: "change-14",
    before: [59, 59],
    after: [61, 61],
    reason: "매개변수 입력을 선택하는 기준을 서로 다른 조건과 동작으로 설명했습니다.",
  },
  {
    id: "change-15",
    before: [63, 64],
    after: [65, 66],
    reason: "테스트 채택 기준에서 단정을 덜고 확인할 응답과 값의 근거를 적었습니다.",
  },
  {
    id: "change-16",
    before: [66, 66],
    after: [68, 68],
    reason: "단언이 확인해야 할 대상을 반환값과 화면 변화로 명시했습니다.",
  },
  {
    id: "change-17",
    before: [71, 71],
    after: [73, 73],
    reason: "마지막 절의 제목에서 확인한 자료와 평가하지 않은 대상을 함께 예고했습니다.",
  },
  {
    id: "change-18",
    before: [73, 73],
    after: [75, 75],
    reason: "조사에서 실제로 확인한 자료와 검증하지 않은 사항을 분리했습니다.",
  },
] as const satisfies readonly ChangeSection[];
