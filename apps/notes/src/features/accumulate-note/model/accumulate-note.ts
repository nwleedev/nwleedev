import type {
  AccumulatedTextItem,
  Accumulator,
} from "@/entities/accumulator"
import type { Note } from "@/entities/note"

import type { AccumulationWriter } from "./accumulation-writer"

type AccumulateNoteDependencies = {
  createId(): string
  now(): string
  writer: AccumulationWriter
}

export type AccumulateNoteResult =
  | {
      accumulator: Accumulator
      item: AccumulatedTextItem
      status: "accumulated"
    }
  | { status: "failure" }

export async function accumulateNote(
  dependencies: AccumulateNoteDependencies,
  note: Note,
): Promise<AccumulateNoteResult> {
  const item: AccumulatedTextItem = {
    addedAt: dependencies.now(),
    id: dependencies.createId(),
    sourceNote: {
      contentRevision: note.contentRevision,
      id: note.id,
    },
    textSnapshot: note.content,
  }

  try {
    const accumulator = await dependencies.writer.addAndRecordUsage(item)
    return { accumulator, item, status: "accumulated" }
  } catch {
    return { status: "failure" }
  }
}
