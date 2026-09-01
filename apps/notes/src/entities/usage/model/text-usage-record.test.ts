import { describe, expect, it } from "vitest"

import { TextUsageRecordSchema } from "./text-usage-record"

const usageRecord = {
  counts: { accumulation: 2, ordinaryCopy: 3 },
  id: "usage-1",
  note: { contentRevision: 2, id: "note-1" },
  textSnapshot: "사용한 문장",
  updatedAt: "2026-08-31T01:00:00.000Z",
}

describe("TextUsageRecordSchema", () => {
  it("accepts independent copy and accumulation counts", () => {
    expect(TextUsageRecordSchema.safeParse(usageRecord).success).toBe(true)
  })

  it("rejects a negative count", () => {
    expect(
      TextUsageRecordSchema.safeParse({
        ...usageRecord,
        counts: { ...usageRecord.counts, ordinaryCopy: -1 },
      }).success,
    ).toBe(false)
  })
})
