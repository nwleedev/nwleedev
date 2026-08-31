import { describe, expect, it } from "vitest"

import type { AccumulatedTextItem, Accumulator } from "./accumulatorRecord"
import {
  combineAccumulatorText,
  moveAccumulatorItem,
  removeAccumulatorItem,
} from "./accumulatorCommands"

const updatedAt = "2026-09-01T05:00:00.000Z"

function createItem(id: string, textSnapshot: string): AccumulatedTextItem {
  return {
    addedAt: "2026-09-01T01:00:00.000Z",
    id,
    sourceNote: { contentRevision: 0, id: `note-${id}` },
    textSnapshot,
  }
}

const firstItem = createItem("item-a", "같은 문장")
const secondItem = createItem("item-b", "다른 문장")
const thirdItem = createItem("item-c", "같은 문장")

const accumulator: Accumulator = {
  content: {
    items: [firstItem, secondItem, thirdItem],
    separator: "\n",
  },
  id: "primary",
  revision: 4,
  updatedAt: "2026-09-01T04:00:00.000Z",
}

describe("editing accumulated text", () => {
  it("combines duplicate snapshots in their current item order", () => {
    expect(combineAccumulatorText(accumulator)).toBe(
      "같은 문장\n다른 문장\n같은 문장",
    )
  })

  it("moves one identifier without merging equal snapshots", () => {
    const moved = moveAccumulatorItem(
      accumulator,
      secondItem.id,
      0,
      updatedAt,
    )

    expect(moved?.content.items.map(({ id }) => id)).toEqual([
      "item-b",
      "item-a",
      "item-c",
    ])
    expect(moved).toMatchObject({ revision: 5, updatedAt })
  })

  it("removes only the requested identifier and reports its prior index", () => {
    const removed = removeAccumulatorItem(
      accumulator,
      thirdItem.id,
      updatedAt,
    )

    expect(removed).toMatchObject({
      accumulator: {
        content: { items: [{ id: "item-a" }, { id: "item-b" }] },
        revision: 5,
        updatedAt,
      },
      index: 2,
      item: { id: "item-c", textSnapshot: "같은 문장" },
    })
  })
})
