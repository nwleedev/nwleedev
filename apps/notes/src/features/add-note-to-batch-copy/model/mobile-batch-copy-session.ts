import {
  addMobileBatchCopyEntry,
  beginMobileBatchCopy,
  duplicateMobileBatchCopyEntry,
  moveMobileBatchCopyEntry,
  removeMobileBatchCopyEntry,
  resetMobileBatchCopy,
  type MobileBatchCopyDraft,
  type MobileBatchCopyEntry,
} from "@/entities/batch-copy"
import type { Note } from "@/entities/note"

import type { MobileBatchCopyUsageWriter } from "./mobile-batch-copy-usage-writer"

type MobileBatchCopyDependencies = {
  createId(): string
  now(): string
}

export type AddMobileBatchCopyResult =
  | { draft: MobileBatchCopyDraft; status: "added" }
  | { status: "failure" }

export async function addNoteToMobileBatchCopy(
  dependencies: MobileBatchCopyDependencies & {
    writer: MobileBatchCopyUsageWriter
  },
  draft: MobileBatchCopyDraft | null,
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

  const current = draft ?? beginMobileBatchCopy({ id: dependencies.createId(), startedAt: updatedAt })

  return {
    draft: addMobileBatchCopyEntry(current, entry, updatedAt),
    status: "added",
  }
}

export function resetMobileBatchCopySession(
  draft: MobileBatchCopyDraft,
  now: () => string,
) {
  return resetMobileBatchCopy(draft, now())
}

export function moveMobileBatchCopySessionEntry(
  draft: MobileBatchCopyDraft,
  entryId: string,
  index: number,
  now: () => string,
) {
  return moveMobileBatchCopyEntry(draft, entryId, index, now())
}

export function duplicateMobileBatchCopySessionEntry(
  dependencies: MobileBatchCopyDependencies,
  draft: MobileBatchCopyDraft,
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
  draft: MobileBatchCopyDraft,
  entryId: string,
  now: () => string,
) {
  return removeMobileBatchCopyEntry(draft, entryId, now())
}
