import type { NoteContentReference } from "@/entities/note/@x/batch-copy"
import { EntityIdSchema } from "@/shared/lib/entity-metadata"

export type MobileBatchCopyEntry = {
  id: string
  sourceNote: NoteContentReference
  textSnapshot: string
}

export type MobileBatchCopyDraft = {
  clickCount: number
  entries: MobileBatchCopyEntry[]
  id: string
  startedAt: string
  step: "collecting" | "confirming"
  updatedAt: string
}

export type CollectingMobileBatchCopyDraft = MobileBatchCopyDraft & {
  step: "collecting"
}

export type ConfirmingMobileBatchCopyDraft = MobileBatchCopyDraft & {
  step: "confirming"
}

export function beginMobileBatchCopy(input: {
  id: string
  startedAt: string
}): CollectingMobileBatchCopyDraft {
  return {
    clickCount: 0,
    entries: [],
    id: input.id,
    startedAt: input.startedAt,
    step: "collecting",
    updatedAt: input.startedAt,
  }
}

export function addMobileBatchCopyEntry(
  draft: CollectingMobileBatchCopyDraft,
  entry: MobileBatchCopyEntry,
  updatedAt: string,
): CollectingMobileBatchCopyDraft {
  return {
    ...draft,
    clickCount: draft.clickCount + 1,
    entries: [...draft.entries, entry],
    updatedAt,
  }
}

export function resetMobileBatchCopy(
  draft: CollectingMobileBatchCopyDraft,
  updatedAt: string,
): CollectingMobileBatchCopyDraft {
  if (draft.entries.length === 0 && draft.clickCount === 0) {
    return draft
  }

  return { ...draft, clickCount: 0, entries: [], updatedAt }
}

export function confirmMobileBatchCopy(
  draft: CollectingMobileBatchCopyDraft,
  updatedAt: string,
): ConfirmingMobileBatchCopyDraft {
  return { ...draft, step: "confirming", updatedAt }
}

export function resumeMobileBatchCopyCollection(
  draft: ConfirmingMobileBatchCopyDraft,
  updatedAt: string,
): CollectingMobileBatchCopyDraft {
  return { ...draft, step: "collecting", updatedAt }
}

export function moveMobileBatchCopyEntry(
  draft: ConfirmingMobileBatchCopyDraft,
  entryId: string,
  requestedIndex: number,
  updatedAt: string,
): ConfirmingMobileBatchCopyDraft {
  const currentIndex = draft.entries.findIndex(({ id }) => id === entryId)

  if (currentIndex < 0 || draft.entries.length < 2) {
    return draft
  }

  const lastIndex = draft.entries.length - 1
  const nextIndex = Math.max(0, Math.min(requestedIndex, lastIndex))

  if (currentIndex === nextIndex) {
    return draft
  }

  const entries = [...draft.entries]
  const [entry] = entries.splice(currentIndex, 1)

  if (entry === undefined) {
    return draft
  }

  entries.splice(nextIndex, 0, entry)
  return { ...draft, entries, updatedAt }
}

export function duplicateMobileBatchCopyEntry(
  draft: ConfirmingMobileBatchCopyDraft,
  entryId: string,
  duplicateId: string,
  updatedAt: string,
): ConfirmingMobileBatchCopyDraft {
  const entryIndex = draft.entries.findIndex(({ id }) => id === entryId)
  const duplicateIdIsValid = EntityIdSchema.safeParse(duplicateId).success
  const duplicateExists = draft.entries.some(({ id }) => id === duplicateId)

  if (entryIndex < 0 || !duplicateIdIsValid || duplicateExists) {
    return draft
  }

  const source = draft.entries[entryIndex]

  if (source === undefined) {
    return draft
  }

  const entries = [...draft.entries]
  entries.splice(entryIndex + 1, 0, { ...source, id: duplicateId })
  return { ...draft, entries, updatedAt }
}

export function removeMobileBatchCopyEntry(
  draft: ConfirmingMobileBatchCopyDraft,
  entryId: string,
  updatedAt: string,
): ConfirmingMobileBatchCopyDraft {
  const entries = draft.entries.filter(({ id }) => id !== entryId)

  if (entries.length === draft.entries.length) {
    return draft
  }

  return { ...draft, entries, updatedAt }
}
