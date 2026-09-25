import type {
  BatchCopyItem,
  BatchCopyList,
} from "@/entities/batch-copy"
import type { Note } from "@/entities/note"

import type { BatchCopyItemWriter } from "./batch-copy-item-writer"

type AddNoteToBatchCopyDependencies = {
  createId(): string
  now(): string
  writer: BatchCopyItemWriter
}

export type AddNoteToBatchCopyResult =
  | {
      item: BatchCopyItem
      list: BatchCopyList
      status: "added"
    }
  | { status: "failure" }

export async function addNoteToBatchCopy(
  dependencies: AddNoteToBatchCopyDependencies,
  note: Note,
): Promise<AddNoteToBatchCopyResult> {
  const item: BatchCopyItem = {
    addedAt: dependencies.now(),
    id: dependencies.createId(),
    sourceNote: {
      contentRevision: note.contentRevision,
      id: note.id,
    },
    textSnapshot: note.content,
  }

  try {
    const list = await dependencies.writer.addAndRecordUsage(item)
    return { item, list, status: "added" }
  } catch {
    return { status: "failure" }
  }
}
