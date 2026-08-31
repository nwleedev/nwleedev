import { describe, expect, it } from "vitest"

import type { AccumulatedTextItem, Accumulator } from "./accumulatorRecord"
import {
  applyAccumulation,
  createAccumulatorSession,
  redoAccumulatorRemoval,
  removeFromAccumulatorSession,
  reorderAccumulatorSession,
  undoAccumulatorRemoval,
  type AccumulatorSession,
} from "./accumulatorHistory"

const timestamp = "2026-09-01T06:00:00.000Z"

function createItem(id: string): AccumulatedTextItem {
  return {
    addedAt: "2026-09-01T01:00:00.000Z",
    id,
    sourceNote: { contentRevision: 0, id: `note-${id}` },
    textSnapshot: `text-${id}`,
  }
}

const items = [createItem("a"), createItem("b"), createItem("c")]
const accumulator: Accumulator = {
  content: { items, separator: "\n" },
  id: "primary",
  revision: 1,
  updatedAt: "2026-09-01T05:00:00.000Z",
}

function requireSession(session: AccumulatorSession | null) {
  if (session === null) {
    throw new Error("Expected an accumulator session transition")
  }

  return session
}

function itemOrder(session: AccumulatorSession) {
  return session.accumulator.content.items.map(({ id }) => id)
}

describe("recovering removed accumulated text", () => {
  it.each([
    ["first", "a", ["b", "c"]],
    ["middle", "b", ["a", "c"]],
    ["last", "c", ["a", "b"]],
  ])("restores a removed %s item to its prior position", (_, id, removedOrder) => {
    const initial = createAccumulatorSession(accumulator)
    const removed = requireSession(
      removeFromAccumulatorSession(initial, id, timestamp),
    )
    const restored = requireSession(undoAccumulatorRemoval(removed, timestamp))

    expect(itemOrder(removed)).toEqual(removedOrder)
    expect(itemOrder(restored)).toEqual(["a", "b", "c"])
  })

  it("removes the same item again and restores it again after redo", () => {
    const initial = createAccumulatorSession(accumulator)
    const removed = requireSession(
      removeFromAccumulatorSession(initial, "b", timestamp),
    )
    const restored = requireSession(undoAccumulatorRemoval(removed, timestamp))
    const redone = requireSession(redoAccumulatorRemoval(restored, timestamp))
    const restoredAgain = requireSession(
      undoAccumulatorRemoval(redone, timestamp),
    )

    expect(itemOrder(redone)).toEqual(["a", "c"])
    expect(itemOrder(restoredAgain)).toEqual(["a", "b", "c"])
  })

  it("clears redo after a successful reorder", () => {
    const initial = createAccumulatorSession(accumulator)
    const removed = requireSession(
      removeFromAccumulatorSession(initial, "b", timestamp),
    )
    const restored = requireSession(undoAccumulatorRemoval(removed, timestamp))
    const reordered = requireSession(
      reorderAccumulatorSession(restored, "c", 0, timestamp),
    )

    expect(itemOrder(reordered)).toEqual(["c", "a", "b"])
    expect(redoAccumulatorRemoval(reordered, timestamp)).toBeNull()
  })

  it("clears redo after another accumulation while preserving duplicates", () => {
    const initial = createAccumulatorSession(accumulator)
    const removed = requireSession(
      removeFromAccumulatorSession(initial, "b", timestamp),
    )
    const restored = requireSession(undoAccumulatorRemoval(removed, timestamp))
    const duplicate = createItem("d")
    const persistedAccumulator: Accumulator = {
      ...restored.accumulator,
      content: {
        ...restored.accumulator.content,
        items: [...restored.accumulator.content.items, duplicate],
      },
      revision: restored.accumulator.revision + 1,
      updatedAt: timestamp,
    }
    const accumulated = applyAccumulation(
      restored,
      persistedAccumulator,
      duplicate,
      null,
    )

    expect(itemOrder(accumulated)).toEqual(["a", "b", "c", "d"])
    expect(redoAccumulatorRemoval(accumulated, timestamp)).toBeNull()
  })

  it("restores and removes the mobile note selection with its item", () => {
    const baseAccumulator: Accumulator = {
      ...accumulator,
      content: { ...accumulator.content, items: [items[0], items[2]] },
    }
    const initial = createAccumulatorSession(baseAccumulator)
    const selected = applyAccumulation(
      initial,
      accumulator,
      items[1],
      "note-b",
    )
    const removed = requireSession(
      removeFromAccumulatorSession(selected, "b", timestamp),
    )
    const restored = requireSession(undoAccumulatorRemoval(removed, timestamp))
    const redone = requireSession(redoAccumulatorRemoval(restored, timestamp))

    expect(selected.selectedItemByNote).toEqual({ "note-b": "b" })
    expect(removed.selectedItemByNote).toEqual({})
    expect(restored.selectedItemByNote).toEqual({ "note-b": "b" })
    expect(redone.selectedItemByNote).toEqual({})
  })
})
