import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import type { TextUsage } from "@/entities/usage"

import { projectUsageRows } from "./usage-projection"

const usageRecord = fc.record({
  batchCopy: fc.nat({ max: 1_000 }),
  individualCopy: fc.nat({ max: 1_000 }),
  noteId: fc.uuid(),
  revision: fc.nat(),
  snapshot: fc.string(),
  usageId: fc.uuid(),
})

describe("사용 빈도 표시", () => {
  it("각 원문 기록을 합치지 않고 생성한 두 횟수의 합계를 표시한다", () => {
    fc.assert(
      fc.property(
        fc.array(usageRecord, { maxLength: 12, minLength: 1 }),
        (inputs) => {
          const records: TextUsage[] = inputs.map((input) => ({
            counts: {
              batchCopy: input.batchCopy,
              individualCopy: input.individualCopy,
            },
            id: input.usageId,
            note: {
              contentRevision: input.revision,
              id: input.noteId,
            },
            textSnapshot: input.snapshot,
            updatedAt: new Date().toISOString(),
          }))
          const rows = projectUsageRows(records)

          expect(rows).toHaveLength(inputs.length)
          for (const [index, row] of rows.entries()) {
            const input = inputs[index]
            expect(row).toEqual({
              counts: {
                batchCopy: input.batchCopy,
                individualCopy: input.individualCopy,
                total: input.batchCopy + input.individualCopy,
              },
              id: input.usageId,
              note: {
                contentRevision: input.revision,
                id: input.noteId,
              },
              textSnapshot: input.snapshot,
            })
          }
        },
      ),
    )
  })

  it("같은 원문의 이전 버전과 새 버전을 별도 행으로 유지한다", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string(),
        fc.nat({ max: Number.MAX_SAFE_INTEGER - 1 }),
        fc.nat({ max: 1_000 }),
        (noteId, snapshot, revision, previousCount) => {
          const records: TextUsage[] = [revision, revision + 1].map(
            (contentRevision, index) => ({
              counts: {
                batchCopy: 0,
                individualCopy: previousCount + index,
              },
              id: crypto.randomUUID(),
              note: { contentRevision, id: noteId },
              textSnapshot: snapshot,
              updatedAt: new Date().toISOString(),
            }),
          )
          const rows = projectUsageRows(records)

          expect(rows).toHaveLength(records.length)
          expect(rows.map((row) => row.note.contentRevision)).toEqual([
            revision,
            revision + 1,
          ])
          expect(rows.map((row) => row.counts.total)).toEqual([
            previousCount,
            previousCount + 1,
          ])
        },
      ),
    )
  })
})
