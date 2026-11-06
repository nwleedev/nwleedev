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

type MobileBatchCopyDependencies = {
  createId(): string
  now(): number
}

export function addNoteToMobileBatchCopy(
  dependencies: MobileBatchCopyDependencies,
  draft: MobileBatchCopyDraft | null,
  note: Note,
): MobileBatchCopyDraft {
  const updatedAt = dependencies.now()
  const entry: MobileBatchCopyEntry = {
    id: dependencies.createId(),
    sourceNote: { id: note.id },
    textSnapshot: note.content,
  }

  const current = draft ?? beginMobileBatchCopy({ id: dependencies.createId(), startedAt: updatedAt })

  return addMobileBatchCopyEntry(current, entry, updatedAt)
}

export function resetMobileBatchCopySession(
  draft: MobileBatchCopyDraft,
  now: () => number,
) {
  return resetMobileBatchCopy(draft, now())
}

export function moveMobileBatchCopySessionEntry(
  draft: MobileBatchCopyDraft,
  entryId: string,
  index: number,
  now: () => number,
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
  now: () => number,
) {
  return removeMobileBatchCopyEntry(draft, entryId, now())
}
