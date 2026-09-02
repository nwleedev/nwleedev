import { describe, expect, it } from "vitest"

import type { BatchCopyList } from "./batch-copy-list"
import {
  combineBatchCopyText,
  moveBatchCopyItem,
  removeBatchCopyItem,
  restoreBatchCopyItem,
} from "./batch-copy-commands"

const firstItem = {
  addedAt: "2026-09-02T03:00:00.000Z",
  id: "batch-item-1",
  sourceNote: { contentRevision: 2, id: "note-1" },
  textSnapshot: "첫 번째 문장",
}

const secondItem = {
  addedAt: "2026-09-02T03:01:00.000Z",
  id: "batch-item-2",
  sourceNote: { contentRevision: 4, id: "note-1" },
  textSnapshot: "두 번째 문장",
}

const list: BatchCopyList = {
  content: { items: [firstItem, secondItem], separator: "\n---\n" },
  id: "primary",
  revision: 2,
  updatedAt: secondItem.addedAt,
}

describe("일괄 복사 목록 편집", () => {
  it("저장된 순서와 구분자로 최종 Clipboard 원문을 만든다", () => {
    expect(combineBatchCopyText(list)).toBe("첫 번째 문장\n---\n두 번째 문장")
  })

  it("항목 이동은 목록 revision을 올리고 원문 스냅샷을 유지한다", () => {
    const moved = moveBatchCopyItem(
      list,
      secondItem.id,
      0,
      "2026-09-02T04:00:00.000Z",
    )

    expect(moved?.content.items).toEqual([secondItem, firstItem])
    expect(moved?.revision).toBe(3)
  })

  it("제거한 항목과 위치를 보존해 같은 자리에 복원한다", () => {
    const removal = removeBatchCopyItem(
      list,
      firstItem.id,
      "2026-09-02T04:00:00.000Z",
    )
    const restored = removal
      ? restoreBatchCopyItem(
          removal.list,
          removal.item,
          removal.index,
          "2026-09-02T05:00:00.000Z",
        )
      : null

    expect(restored?.content.items).toEqual([firstItem, secondItem])
    expect(restored?.revision).toBe(4)
  })
})
