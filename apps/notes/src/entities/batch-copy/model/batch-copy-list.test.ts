import { describe, expect, it } from "vitest"

import { BatchCopyListSchema } from "./batch-copy-list"

const firstItem = {
  addedAt: "2026-09-02T03:00:00.000Z",
  id: "batch-item-1",
  sourceNote: { contentRevision: 2, id: "note-1" },
  textSnapshot: "첫 번째 문장",
}

const list = {
  content: { items: [firstItem], separator: "\n" },
  id: "primary",
  revision: 1,
  updatedAt: "2026-09-02T03:00:00.000Z",
}

describe("일괄 복사 목록 record", () => {
  it("추가 당시 원문과 메모 revision을 포함한 목록을 받는다", () => {
    expect(BatchCopyListSchema.safeParse(list).success).toBe(true)
  })

  it("같은 항목 ID가 반복되면 목록을 받지 않는다", () => {
    expect(
      BatchCopyListSchema.safeParse({
        ...list,
        content: { ...list.content, items: [firstItem, firstItem] },
      }).success,
    ).toBe(false)
  })

  it("필수 항목이 없거나 빈 식별자가 있으면 record를 받지 않는다", () => {
    expect(
      BatchCopyListSchema.safeParse({
        content: list.content,
        id: list.id,
        revision: list.revision,
      }).success,
    ).toBe(false)
    expect(
      BatchCopyListSchema.safeParse({ ...list, id: "   " }).success,
    ).toBe(false)
  })
})
