import { describe, expect, it } from "vitest"

import { TemplateRecordSchema } from "./templateRecord"

const templateRecord = {
  createdAt: "2026-08-31T01:00:00.000Z",
  id: "template-1",
  revision: 0,
  segments: [
    { kind: "literal", value: "안녕하세요, " },
    { key: "name", kind: "placeholder", label: "이름" },
  ],
  title: "인사",
  updatedAt: "2026-08-31T01:00:00.000Z",
}

describe("TemplateRecordSchema", () => {
  it("accepts literal and placeholder segments", () => {
    expect(TemplateRecordSchema.safeParse(templateRecord).success).toBe(true)
  })

  it("rejects duplicate placeholder keys", () => {
    const placeholder = templateRecord.segments[1]

    expect(
      TemplateRecordSchema.safeParse({
        ...templateRecord,
        segments: [...templateRecord.segments, placeholder],
      }).success,
    ).toBe(false)
  })
})
