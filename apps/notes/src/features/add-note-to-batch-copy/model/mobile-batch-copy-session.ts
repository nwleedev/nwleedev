import {
  addMobileBatchCopyEntry,
  beginMobileBatchCopy,
  confirmMobileBatchCopy,
  duplicateMobileBatchCopyEntry,
  moveMobileBatchCopyEntry,
  removeMobileBatchCopyEntry,
  resumeMobileBatchCopyCollection,
  resetMobileBatchCopy,
  type CollectingMobileBatchCopyDraft,
  type ConfirmingMobileBatchCopyDraft,
  type MobileBatchCopyEntry,
} from "@/entities/batch-copy"
import type { Note } from "@/entities/note"

import type { MobileBatchCopyUsageWriter } from "./mobile-batch-copy-usage-writer"

type MobileBatchCopyDependencies = {
  createId(): string
  now(): string
}

export type AddMobileBatchCopyResult =
  | { draft: CollectingMobileBatchCopyDraft; status: "added" }
  | { status: "failure" }

export function startMobileBatchCopy(
  dependencies: MobileBatchCopyDependencies,
): CollectingMobileBatchCopyDraft {
  const startedAt = dependencies.now()

  return beginMobileBatchCopy({
    id: dependencies.createId(),
    startedAt,
  })
}

export async function addNoteToMobileBatchCopy(
  dependencies: MobileBatchCopyDependencies & {
    writer: MobileBatchCopyUsageWriter
  },
  draft: CollectingMobileBatchCopyDraft,
  note: Note,
): Promise<AddMobileBatchCopyResult> {
  const updatedAt = dependencies.now()
  const entry: MobileBatchCopyEntry = {
    id: dependencies.createId(),
    sourceNote: {
      contentRevision: note.contentRevision,
      id: note.id,
    },
    textSnapshot: note.content,
  }

  try {
    await dependencies.writer.record(note, updatedAt)
  } catch {
    return { status: "failure" }
  }

  return {
    draft: addMobileBatchCopyEntry(draft, entry, updatedAt),
    status: "added",
  }
}

export function resetMobileBatchCopySession(
  draft: CollectingMobileBatchCopyDraft,
  now: () => string,
) {
  return resetMobileBatchCopy(draft, now())
}

export function confirmMobileBatchCopySession(
  draft: CollectingMobileBatchCopyDraft,
  now: () => string,
) {
  return confirmMobileBatchCopy(draft, now())
}

export function moveMobileBatchCopySessionEntry(
  draft: ConfirmingMobileBatchCopyDraft,
  entryId: string,
  index: number,
  now: () => string,
) {
  return moveMobileBatchCopyEntry(draft, entryId, index, now())
}

export function duplicateMobileBatchCopySessionEntry(
  dependencies: MobileBatchCopyDependencies,
  draft: ConfirmingMobileBatchCopyDraft,
  entryId: string,
) {
  return duplicateMobileBatchCopyEntry(
    draft,
    entryId,
    dependencies.createId(),
    dependencies.now(),
  )
}

export function removeMobileBatchCopySessionEntry(
  draft: ConfirmingMobileBatchCopyDraft,
  entryId: string,
  now: () => string,
) {
  return removeMobileBatchCopyEntry(draft, entryId, now())
}

export function resumeMobileBatchCopySession(
  draft: ConfirmingMobileBatchCopyDraft,
  now: () => string,
) {
  return resumeMobileBatchCopyCollection(draft, now())
}
