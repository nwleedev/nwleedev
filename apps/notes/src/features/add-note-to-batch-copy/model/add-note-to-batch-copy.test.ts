import { describe, expect, it } from "vitest"

import type { BatchCopyItem } from "@/entities/batch-copy"
import type { Note } from "@/entities/note"

import { addNoteToBatchCopy } from "./add-note-to-batch-copy"
import type { BatchCopyItemWriter } from "./batch-copy-item-writer"

const note: Note = {
  content: "일괄 복사할 메모 원문",
  contentRevision: 2,
  createdAt: "2026-09-01T01:00:00.000Z",
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: "note-batch-copy",
  revision: 4,
  tabIndex: 1000,
  updatedAt: "2026-09-01T02:00:00.000Z",
}

class InMemoryBatchCopyItemWriter implements BatchCopyItemWriter {
  readonly items: BatchCopyItem[] = []

  constructor(private readonly failure: Error | null = null) {}

  async addAndRecordUsage(item: BatchCopyItem) {
    if (this.failure !== null) {
      throw this.failure
    }

    this.items.push(item)
    return {
      content: { items: [...this.items], separator: "\n" },
      id: "primary",
      revision: this.items.length - 1,
      updatedAt: item.addedAt,
    }
  }
}

const commandDependencies = {
  createId: () => "batch-copy-item",
  now: () => "2026-09-01T03:00:00.000Z",
}

describe("일괄 복사 항목 추가", () => {
  it("stores the current text snapshot and returns the added item", async () => {
    const writer = new InMemoryBatchCopyItemWriter()
    const expectedItem = {
      addedAt: commandDependencies.now(),
      id: commandDependencies.createId(),
      sourceNote: {
        contentRevision: note.contentRevision,
        id: note.id,
      },
      textSnapshot: note.content,
    }

    const result = await addNoteToBatchCopy(
      { ...commandDependencies, writer },
      note,
    )

    expect(result).toEqual({
      list: {
        content: { items: [expectedItem], separator: "\n" },
        id: "primary",
        revision: 0,
        updatedAt: expectedItem.addedAt,
      },
      item: expectedItem,
      status: "added",
    })
    expect(writer.items).toEqual([expectedItem])
  })

  it("reports failure without an added item when the transaction fails", async () => {
    const writer = new InMemoryBatchCopyItemWriter(
      new Error("transaction aborted"),
    )

    const result = await addNoteToBatchCopy(
      { ...commandDependencies, writer },
      note,
    )

    expect(result).toEqual({ status: "failure" })
    expect(writer.items).toEqual([])
  })
})
