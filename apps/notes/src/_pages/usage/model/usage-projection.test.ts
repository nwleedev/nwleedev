import { describe, expect, it } from "vitest"

import type { TextUsage } from "@/entities/usage"

import { projectUsageRows } from "./usage-projection"

const records: readonly TextUsage[] = [
  {
    counts: { batchCopy: 3, individualCopy: 2 },
    id: "usage-current",
    note: { contentRevision: 2, id: "note-one" },
    textSnapshot: "반복해서 쓰는 문장",
    updatedAt: "2026-09-01T02:00:00.000Z",
  },
  {
    counts: { batchCopy: 1, individualCopy: 4 },
    id: "usage-previous",
    note: { contentRevision: 1, id: "note-one" },
    textSnapshot: "이전 문장",
    updatedAt: "2026-09-01T01:00:00.000Z",
  },
  {
    counts: { batchCopy: 2, individualCopy: 1 },
    id: "usage-other-note",
    note: { contentRevision: 2, id: "note-two" },
    textSnapshot: "반복해서 쓰는 문장",
    updatedAt: "2026-09-01T03:00:00.000Z",
  },
]

describe("사용 빈도 표시", () => {
  it("저장된 두 횟수로 합계를 계산한다", () => {
    const [row] = projectUsageRows(records)

    expect(row.counts).toEqual({
      batchCopy: 3,
      individualCopy: 2,
      total: 5,
    })
  })

  it("같은 원문도 메모와 원문 revision이 다르면 합치지 않는다", () => {
    const rows = projectUsageRows(records)

    expect(rows).toHaveLength(3)
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          counts: { batchCopy: 3, individualCopy: 2, total: 5 },
          note: { contentRevision: 2, id: "note-one" },
          textSnapshot: "반복해서 쓰는 문장",
        }),
        expect.objectContaining({
          counts: { batchCopy: 1, individualCopy: 4, total: 5 },
          note: { contentRevision: 1, id: "note-one" },
          textSnapshot: "이전 문장",
        }),
        expect.objectContaining({
          counts: { batchCopy: 2, individualCopy: 1, total: 3 },
          note: { contentRevision: 2, id: "note-two" },
          textSnapshot: "반복해서 쓰는 문장",
        }),
      ]),
    )
  })
})
