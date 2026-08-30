import { describe, expect, it } from "vitest"

import { AccumulatorRecordSchema } from "./accumulatorRecord"

const accumulatorRecord = {
  content: {
    items: [
      {
        addedAt: "2026-08-31T01:00:00.000Z",
        id: "item-1",
        sourceNote: { contentRevision: 2, id: "note-1" },
        textSnapshot: "누적한 문장",
      },
    ],
    separator: "\n",
  },
  id: "accumulator-1",
  revision: 1,
  updatedAt: "2026-08-31T01:00:00.000Z",
}

describe("AccumulatorRecordSchema", () => {
  it("accepts a record with a text snapshot", () => {
    expect(AccumulatorRecordSchema.safeParse(accumulatorRecord).success).toBe(
      true,
    )
  })

  it("rejects duplicate item identifiers", () => {
    const [item] = accumulatorRecord.content.items

    expect(
      AccumulatorRecordSchema.safeParse({
        ...accumulatorRecord,
        content: { ...accumulatorRecord.content, items: [item, item] },
      }).success,
    ).toBe(false)
  })
})
