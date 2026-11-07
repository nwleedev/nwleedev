import { describe, expect, it } from "vitest"

import type { BatchCopyList } from "./batch-copy-list"
import {
  combineBatchCopyText,
  duplicateBatchCopyItem,
  itemIndexForInsertionSlot,
  moveBatchCopyItem,
  removeBatchCopyItem,
  restoreBatchCopyItem,
} from "./batch-copy-commands"

const firstItem = {
  addedAt: Date.parse("2026-09-02T03:00:00.000Z"),
  id: "batch-item-1",
  sourceNote: { id: "note-1" },
  textSnapshot: "첫 번째 문장",
}

const secondItem = {
  addedAt: Date.parse("2026-09-02T03:01:00.000Z"),
  id: "batch-item-2",
  sourceNote: { id: "note-1" },
  textSnapshot: "두 번째 문장",
}

const list: BatchCopyList = {
  content: { items: [firstItem, secondItem], separator: "\n---\n" },
  id: "primary",
  updatedAt: secondItem.addedAt,
}

describe("일괄 복사 목록 편집", () => {
  it("저장된 순서와 구분자로 최종 Clipboard 원문을 만든다", () => {
    expect(combineBatchCopyText(list)).toBe("첫 번째 문장\n---\n두 번째 문장")
  })

  it("항목 이동은 순서를 바꾸고 원문 스냅샷을 유지한다", () => {
    const moved = moveBatchCopyItem(
      list,
      secondItem.id,
      0,
      Date.parse("2026-09-02T04:00:00.000Z"),
    )

    expect(moved?.content.items).toEqual([secondItem, firstItem])
  })

  it("항목 복제는 새 ID로 대상 바로 뒤에 원문 스냅샷을 추가한다", () => {
    const duplicateId = crypto.randomUUID()
    const duplicated = duplicateBatchCopyItem(
      list,
      firstItem.id,
      duplicateId,
      Date.parse("2026-09-02T04:00:00.000Z"),
    )

    expect(duplicated?.content.items).toEqual([
      firstItem,
      { ...firstItem, id: duplicateId },
      secondItem,
    ])
  })

  it("제거한 항목과 위치를 보존해 같은 자리에 복원한다", () => {
    const removal = removeBatchCopyItem(
      list,
      firstItem.id,
      Date.parse("2026-09-02T04:00:00.000Z"),
    )
    const restored = removal
      ? restoreBatchCopyItem(
          removal.list,
          removal.item,
          removal.index,
          Date.parse("2026-09-02T05:00:00.000Z"),
        )
      : null

    expect(restored?.content.items).toEqual([firstItem, secondItem])
  })

  it("첫 항목의 마지막 삽입 위치를 마지막 index로 바꾼다", () => {
    expect(itemIndexForInsertionSlot(0, 3, 3)).toBe(2)
  })

  it("마지막 항목의 첫 삽입 위치를 첫 index로 바꾼다", () => {
    expect(itemIndexForInsertionSlot(2, 0, 3)).toBe(0)
  })

  it("현재 항목 양옆의 같은 위치는 변경하지 않는다", () => {
    expect(itemIndexForInsertionSlot(1, 1, 3)).toBeNull()
    expect(itemIndexForInsertionSlot(1, 2, 3)).toBeNull()
  })

  it("목록 밖의 항목과 삽입 위치는 거부한다", () => {
    expect(itemIndexForInsertionSlot(-1, 0, 3)).toBeNull()
    expect(itemIndexForInsertionSlot(0, 4, 3)).toBeNull()
  })
})
