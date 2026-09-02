import { describe, expect, it } from "vitest"

import {
  addMobileBatchCopyItem,
  beginMobileBatchCopy,
  confirmMobileBatchCopy,
  moveMobileBatchCopyItem,
  removeMobileBatchCopyItem,
  resetMobileBatchCopy,
} from "./mobile-batch-copy-session"

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

const thirdItem = {
  addedAt: "2026-09-02T03:02:00.000Z",
  id: "batch-item-3",
  sourceNote: { contentRevision: 1, id: "note-2" },
  textSnapshot: "세 번째 문장",
}

describe("모바일 일괄 복사 작업", () => {
  it("같은 메모를 반복해서 눌러도 원문 스냅샷과 클릭 순서를 모두 보존한다", () => {
    const first = addMobileBatchCopyItem(beginMobileBatchCopy(), firstItem)
    const second = addMobileBatchCopyItem(first, secondItem)

    expect(second).toEqual({
      clickCount: 2,
      items: [firstItem, secondItem],
      phase: "collecting",
    })
  })

  it("초기화하면 일괄 복사 상태를 유지하면서 항목과 클릭 횟수를 비운다", () => {
    const session = addMobileBatchCopyItem(
      addMobileBatchCopyItem(beginMobileBatchCopy(), firstItem),
      secondItem,
    )

    expect(resetMobileBatchCopy(session)).toEqual({
      clickCount: 0,
      items: [],
      phase: "collecting",
    })
  })

  it("다음 단계로 이동해도 수집 순서와 클릭 횟수를 유지한다", () => {
    const session = addMobileBatchCopyItem(
      addMobileBatchCopyItem(beginMobileBatchCopy(), firstItem),
      secondItem,
    )

    expect(confirmMobileBatchCopy(session)).toEqual({
      clickCount: 2,
      items: [firstItem, secondItem],
      phase: "confirming",
    })
  })

  it("확인 단계에서 순서를 바꿔도 원문과 수집 단계 클릭 횟수를 유지한다", () => {
    const collected = addMobileBatchCopyItem(
      addMobileBatchCopyItem(
        addMobileBatchCopyItem(beginMobileBatchCopy(), firstItem),
        secondItem,
      ),
      thirdItem,
    )
    const confirming = confirmMobileBatchCopy(collected)

    expect(moveMobileBatchCopyItem(confirming, thirdItem.id, 0)).toEqual({
      clickCount: 3,
      items: [thirdItem, firstItem, secondItem],
      phase: "confirming",
    })
  })

  it("확인 단계에서 한 항목을 삭제해도 원본 클릭 횟수는 바꾸지 않는다", () => {
    const collected = addMobileBatchCopyItem(
      addMobileBatchCopyItem(beginMobileBatchCopy(), firstItem),
      secondItem,
    )
    const confirming = confirmMobileBatchCopy(collected)

    expect(removeMobileBatchCopyItem(confirming, firstItem.id)).toEqual({
      clickCount: 2,
      items: [secondItem],
      phase: "confirming",
    })
  })

  it("없는 항목을 옮기거나 삭제하면 작업 사본을 바꾸지 않는다", () => {
    const collected = addMobileBatchCopyItem(beginMobileBatchCopy(), firstItem)
    const confirming = confirmMobileBatchCopy(collected)

    expect(moveMobileBatchCopyItem(confirming, "missing", 0)).toBe(confirming)
    expect(removeMobileBatchCopyItem(confirming, "missing")).toBe(confirming)
  })
})
