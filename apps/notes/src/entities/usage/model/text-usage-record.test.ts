import { describe, expect, it } from "vitest"

import { TextUsageRecordSchema } from "./text-usage-record"

const usageRecord = {
  counts: { batchCopy: 2, individualCopy: 3 },
  id: "usage-1",
  note: { contentRevision: 2, id: "note-1" },
  textSnapshot: "사용한 문장",
  updatedAt: "2026-08-31T01:00:00.000Z",
}

describe("TextUsageRecordSchema", () => {
  it("개별 복사와 일괄 복사 횟수를 서로 독립적으로 저장한다", () => {
    expect(TextUsageRecordSchema.safeParse(usageRecord).success).toBe(true)
  })

  it("rejects a negative count", () => {
    expect(
      TextUsageRecordSchema.safeParse({
        ...usageRecord,
        counts: { ...usageRecord.counts, individualCopy: -1 },
      }).success,
    ).toBe(false)
  })
})
