import { describe, expect, it } from "vitest"

import type { AccumulatedTextItem } from "@/entities/accumulator"
import type { Note } from "@/entities/note"

import type { AccumulationWriter } from "./AccumulationWriter"
import { accumulateNote } from "./accumulateNote"

const note: Note = {
  content: "누적할 메모 원문",
  contentRevision: 2,
  createdAt: "2026-09-01T01:00:00.000Z",
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: "note-accumulate",
  revision: 4,
  updatedAt: "2026-09-01T02:00:00.000Z",
}

class InMemoryAccumulationWriter implements AccumulationWriter {
  readonly items: AccumulatedTextItem[] = []

  constructor(private readonly failure: Error | null = null) {}

  async addAndRecordUsage(item: AccumulatedTextItem) {
    if (this.failure !== null) {
      throw this.failure
    }

    this.items.push(item)
  }
}

const commandDependencies = {
  createId: () => "accumulated-item",
  now: () => "2026-09-01T03:00:00.000Z",
}

describe("accumulating a note", () => {
  it("stores the current text snapshot and returns the added item", async () => {
    const writer = new InMemoryAccumulationWriter()
    const expectedItem = {
      addedAt: commandDependencies.now(),
      id: commandDependencies.createId(),
      sourceNote: {
        contentRevision: note.contentRevision,
        id: note.id,
      },
      textSnapshot: note.content,
    }

    const result = await accumulateNote(
      { ...commandDependencies, writer },
      note,
    )

    expect(result).toEqual({
      item: expectedItem,
      status: "accumulated",
    })
    expect(writer.items).toEqual([expectedItem])
  })

  it("reports failure without an added item when the transaction fails", async () => {
    const writer = new InMemoryAccumulationWriter(
      new Error("transaction aborted"),
    )

    const result = await accumulateNote(
      { ...commandDependencies, writer },
      note,
    )

    expect(result).toEqual({ status: "failure" })
    expect(writer.items).toEqual([])
  })
})
