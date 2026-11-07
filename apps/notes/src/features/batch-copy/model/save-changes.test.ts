import { assert, describe, expect, it } from "vitest"

import {
  createBatchCopySession,
  removeFromBatchCopySession,
  undoBatchCopyItemRemoval,
  type BatchCopyList,
  type BatchCopyRepository,
} from "@/entities/batch-copy"

import {
  redoBatchCopyItemRemoval,
  removeBatchCopyItem,
} from "./save-changes"

const firstItem = {
  addedAt: Date.parse("2026-09-02T03:00:00.000Z"),
  id: "batch-item-1",
  sourceNote: { id: "note-1" },
  textSnapshot: "첫 번째 문장",
}

const secondItem = {
  addedAt: Date.parse("2026-09-02T03:01:00.000Z"),
  id: "batch-item-2",
  sourceNote: { id: "note-2" },
  textSnapshot: "두 번째 문장",
}

const list: BatchCopyList = {
  content: { items: [firstItem, secondItem], separator: "\n" },
  id: "primary",
  updatedAt: secondItem.addedAt,
}

const repository: BatchCopyRepository = {
  get: async () => list,
  save: async (nextList) => nextList,
}

describe("일괄 복사 항목 다시 실행", () => {
  it("직접 제거된 항목 ID를 저장 응답에 포함해 모든 화면의 선택을 정리한다", async () => {
    const execution = await removeBatchCopyItem(
      { now: () => Date.parse("2026-09-02T04:00:00.000Z"), repository },
      createBatchCopySession(list),
      firstItem.id,
    )

    expect(execution.result).toEqual({
      removedItemId: firstItem.id,
      status: "saved",
    })
  })

  it("다시 제거된 항목 ID를 저장 응답에 포함해 선택 상태를 정리한다", async () => {
    const removed = removeFromBatchCopySession(
      createBatchCopySession(list),
      firstItem.id,
      Date.parse("2026-09-02T04:00:00.000Z"),
    )
    assert(removed)
    const restored = undoBatchCopyItemRemoval(
      removed,
      Date.parse("2026-09-02T05:00:00.000Z"),
    )
    assert(restored)

    const execution = await redoBatchCopyItemRemoval(
      { now: () => Date.parse("2026-09-02T06:00:00.000Z"), repository },
      restored,
    )

    expect(execution.result).toEqual({
      removedItemId: firstItem.id,
      status: "saved",
    })
  })
})
