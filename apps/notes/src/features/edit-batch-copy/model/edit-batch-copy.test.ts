import { assert, describe, expect, it } from "vitest"

import {
  createBatchCopySession,
  removeFromBatchCopySession,
  undoBatchCopyItemRemoval,
  type BatchCopyList,
  type BatchCopyRepository,
} from "@/entities/batch-copy"

import { redoBatchCopyItemRemoval } from "./edit-batch-copy"

const firstItem = {
  addedAt: "2026-09-02T03:00:00.000Z",
  id: "batch-item-1",
  sourceNote: { contentRevision: 2, id: "note-1" },
  textSnapshot: "첫 번째 문장",
}

const secondItem = {
  addedAt: "2026-09-02T03:01:00.000Z",
  id: "batch-item-2",
  sourceNote: { contentRevision: 1, id: "note-2" },
  textSnapshot: "두 번째 문장",
}

const list: BatchCopyList = {
  content: { items: [firstItem, secondItem], separator: "\n" },
  id: "primary",
  revision: 1,
  updatedAt: secondItem.addedAt,
}

const repository: BatchCopyRepository = {
  get: async () => list,
  save: async (nextList) => nextList,
}

describe("일괄 복사 항목 다시 실행", () => {
  it("다시 제거된 항목을 작업 결과로 알려 선택 상태를 정리할 수 있게 한다", async () => {
    const removed = removeFromBatchCopySession(
      createBatchCopySession(list),
      firstItem.id,
      "2026-09-02T04:00:00.000Z",
    )
    assert(removed)
    const restored = undoBatchCopyItemRemoval(
      removed,
      "2026-09-02T05:00:00.000Z",
    )
    assert(restored)

    const execution = await redoBatchCopyItemRemoval(
      { now: () => "2026-09-02T06:00:00.000Z", repository },
      restored,
    )

    expect(execution.result).toEqual({
      removedItemId: firstItem.id,
      status: "saved",
    })
  })
})
