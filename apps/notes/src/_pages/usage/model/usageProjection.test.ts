import { describe, expect, it } from "vitest"

import type { TextUsage } from "@/entities/usage"

import { projectUsageRows } from "./usageProjection"

const records: readonly TextUsage[] = [
  {
    counts: { accumulation: 3, ordinaryCopy: 2 },
    id: "usage-current",
    note: { contentRevision: 2, id: "note-one" },
    textSnapshot: "반복해서 쓰는 문장",
    updatedAt: "2026-09-01T02:00:00.000Z",
  },
  {
    counts: { accumulation: 1, ordinaryCopy: 4 },
    id: "usage-previous",
    note: { contentRevision: 1, id: "note-one" },
    textSnapshot: "이전 문장",
    updatedAt: "2026-09-01T01:00:00.000Z",
  },
  {
    counts: { accumulation: 2, ordinaryCopy: 1 },
    id: "usage-other-note",
    note: { contentRevision: 2, id: "note-two" },
    textSnapshot: "반복해서 쓰는 문장",
    updatedAt: "2026-09-01T03:00:00.000Z",
  },
]

describe("projectUsageRows", () => {
  it("calculates the total from the two stored counts", () => {
    const [row] = projectUsageRows(records)

    expect(row.counts).toEqual({
      accumulation: 3,
      ordinaryCopy: 2,
      total: 5,
    })
  })

  it("projects each note revision and snapshot without merging equal text", () => {
    const rows = projectUsageRows(records)

    expect(rows).toHaveLength(3)
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          counts: { accumulation: 3, ordinaryCopy: 2, total: 5 },
          note: { contentRevision: 2, id: "note-one" },
          textSnapshot: "반복해서 쓰는 문장",
        }),
        expect.objectContaining({
          counts: { accumulation: 1, ordinaryCopy: 4, total: 5 },
          note: { contentRevision: 1, id: "note-one" },
          textSnapshot: "이전 문장",
        }),
        expect.objectContaining({
          counts: { accumulation: 2, ordinaryCopy: 1, total: 3 },
          note: { contentRevision: 2, id: "note-two" },
          textSnapshot: "반복해서 쓰는 문장",
        }),
      ]),
    )
  })
})
