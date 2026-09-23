import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { TextUsageRecordSchema } from "./text-usage-record"

describe("TextUsageRecordSchema", () => {
  it("생성한 개별 복사와 일괄 복사 횟수를 별도로 보존한다", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.string(),
        fc.nat(),
        fc.nat(),
        fc.nat(),
        (id, noteId, snapshot, revision, batchCopy, individualCopy) => {
          const record = {
            counts: { batchCopy, individualCopy },
            id,
            note: { contentRevision: revision, id: noteId },
            textSnapshot: snapshot,
            updatedAt: new Date().toISOString(),
          }

          expect(TextUsageRecordSchema.parse(record)).toEqual(record)
        },
      ),
    )
  })

  it("음수 횟수를 저장 자료로 받아들이지 않는다", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.string(),
        fc.integer({ max: -1 }),
        (id, noteId, snapshot, invalidCount) => {
          const record = {
            counts: { batchCopy: 0, individualCopy: invalidCount },
            id,
            note: { contentRevision: 0, id: noteId },
            textSnapshot: snapshot,
            updatedAt: new Date().toISOString(),
          }

          expect(TextUsageRecordSchema.safeParse(record).success).toBe(false)
        },
      ),
    )
  })
})
