import { describe, expect, it } from "vitest"

import {
  advanceReorderPointerSession,
  createReorderPointerSession,
  finishReorderPointerSession,
  restoreReorderSnapshot,
} from "./reorder-pointer-session"

function itemIds(count: number) {
  return Array.from({ length: count }, () => crypto.randomUUID())
}

function beginSession(ids: readonly string[], sourceIndex: number) {
  const itemId = ids[sourceIndex]

  if (itemId === undefined) {
    throw new Error("Reorder source is missing")
  }

  return createReorderPointerSession({
    focusItemId: itemId,
    itemId,
    itemIds: ids,
    pointerId: 7,
    selectedItemId: itemId,
    startX: 24,
    startY: 40,
    threshold: 5,
  })
}

describe("일괄 복사 pointer 재정렬", () => {
  it("임계값 전에 끝나면 순서 명령을 만들지 않는다", () => {
    const ids = itemIds(4)
    const session = advanceReorderPointerSession(beginSession(ids, 1), {
      clientX: 26,
      clientY: 42,
      targetIndex: 3,
    })

    expect(finishReorderPointerSession(session)).toMatchObject({
      command: null,
      itemIds: ids,
    })
  })

  it("임계값을 넘겨 유효한 위치에 놓으면 ID 기반 이동 명령과 순서를 만든다", () => {
    const ids = itemIds(4)
    const session = advanceReorderPointerSession(beginSession(ids, 0), {
      clientX: 24,
      clientY: 80,
      targetIndex: 3,
    })
    const completed = finishReorderPointerSession(session)

    expect(completed.command).toEqual({ itemId: ids[0], targetIndex: 3 })
    expect(completed.itemIds).toEqual([ids[1], ids[2], ids[3], ids[0]])
  })

  it("자기 위치에 놓으면 저장할 순서 명령을 만들지 않는다", () => {
    const ids = itemIds(4)
    const session = advanceReorderPointerSession(beginSession(ids, 2), {
      clientX: 60,
      clientY: 40,
      targetIndex: 2,
    })

    expect(finishReorderPointerSession(session)).toMatchObject({
      command: null,
      itemIds: ids,
    })
  })

  it("저장 실패 뒤 원래 순서, 선택과 포커스를 복원하고 새 이동을 시작한다", () => {
    const ids = itemIds(4)
    const moved = advanceReorderPointerSession(beginSession(ids, 3), {
      clientX: 24,
      clientY: 0,
      targetIndex: 0,
    })
    const completed = finishReorderPointerSession(moved)
    const restored = restoreReorderSnapshot(completed.snapshot)

    expect(restored).toEqual({
      focusItemId: ids[3],
      itemIds: ids,
      selectedItemId: ids[3],
    })

    const restarted = beginSession(restored.itemIds, 3)
    expect(finishReorderPointerSession(restarted).itemIds).toEqual(ids)
  })
})
