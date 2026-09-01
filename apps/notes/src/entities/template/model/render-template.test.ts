import { describe, expect, it } from "vitest"

import { renderTemplate } from "./render-template"

describe("renderTemplate", () => {
  const segments = [
    { kind: "literal" as const, value: "안녕하세요, " },
    {
      defaultValue: "고객",
      key: "name",
      kind: "placeholder" as const,
      label: "이름",
    },
    { kind: "literal" as const, value: "님. 주문 " },
    {
      key: "order",
      kind: "placeholder" as const,
      label: "주문 번호",
    },
    { kind: "literal" as const, value: "을 확인했습니다." },
  ]

  it("replaces placeholders in segment order", () => {
    expect(
      renderTemplate(segments, { name: "민지", order: "A-123" }),
    ).toBe("안녕하세요, 민지님. 주문 A-123을 확인했습니다.")
  })

  it("uses the recorded source text when a value is absent", () => {
    expect(renderTemplate(segments, { order: "B-456" })).toBe(
      "안녕하세요, 고객님. 주문 B-456을 확인했습니다.",
    )
  })
})
