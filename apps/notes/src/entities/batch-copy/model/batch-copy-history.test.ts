import { describe, expect, it } from "vitest"

import type { BatchCopyList } from "./batch-copy-list"
import {
  applyBatchCopyItem,
  createBatchCopySession,
  redoBatchCopyItemRemoval,
  removeFromBatchCopySession,
  reorderBatchCopySession,
  undoBatchCopyItemRemoval,
} from "./batch-copy-history"

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

describe("일괄 복사 항목 제거 이력", () => {
  it("제거, 실행 취소와 다시 실행에서 같은 항목과 위치를 보존한다", () => {
    const session = createBatchCopySession(list)
    const removed = removeFromBatchCopySession(
      session,
      firstItem.id,
      "2026-09-02T04:00:00.000Z",
    )
    const undone = removed
      ? undoBatchCopyItemRemoval(removed, "2026-09-02T05:00:00.000Z")
      : null
    const redone = undone
      ? redoBatchCopyItemRemoval(undone, "2026-09-02T06:00:00.000Z")
      : null

    expect(removed?.list.content.items).toEqual([secondItem])
    expect(undone?.list.content.items).toEqual([firstItem, secondItem])
    expect(redone?.list.content.items).toEqual([secondItem])
  })

  it("실행 취소 뒤 새 변경이 들어오면 다시 실행 이력을 비운다", () => {
    const removed = removeFromBatchCopySession(
      createBatchCopySession(list),
      firstItem.id,
      "2026-09-02T04:00:00.000Z",
    )
    const undone = removed
      ? undoBatchCopyItemRemoval(removed, "2026-09-02T05:00:00.000Z")
      : null
    const reordered = undone
      ? reorderBatchCopySession(
          undone,
          secondItem.id,
          0,
          "2026-09-02T06:00:00.000Z",
        )
      : null

    expect(reordered?.history.redo).toEqual([])
  })

  it("새 항목을 반영해도 기존 제거 이력을 유지한다", () => {
    const removed = removeFromBatchCopySession(
      createBatchCopySession(list),
      firstItem.id,
      "2026-09-02T04:00:00.000Z",
    )
    const added = removed
      ? applyBatchCopyItem(removed, {
          ...removed.list,
          content: {
            ...removed.list.content,
            items: [
              ...removed.list.content.items,
              { ...firstItem, id: "batch-item-3" },
            ],
          },
        })
      : null

    expect(added?.history.undo).toHaveLength(1)
    expect(added?.history.redo).toEqual([])
  })
})
