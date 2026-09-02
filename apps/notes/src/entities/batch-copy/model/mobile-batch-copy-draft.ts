import { z } from "zod"

import type { NoteContentReference } from "@/entities/note/@x/batch-copy"
import {
  EntityIdSchema,
  IsoDateTimeSchema,
  RevisionSchema,
} from "@/shared/lib/entity-metadata"

const BatchCopySourceNoteSchema: z.ZodType<NoteContentReference> = z
  .object({
    contentRevision: RevisionSchema,
    id: EntityIdSchema,
  })
  .strict()

export const MobileBatchCopyEntrySchema = z
  .object({
    id: EntityIdSchema,
    sourceNote: BatchCopySourceNoteSchema,
    textSnapshot: z.string(),
  })
  .strict()

export const MobileBatchCopyDraftSchema = z
  .object({
    clickCount: z.number().int().nonnegative().safe(),
    entries: z.array(MobileBatchCopyEntrySchema),
    id: EntityIdSchema,
    startedAt: IsoDateTimeSchema,
    step: z.enum(["collecting", "confirming"]),
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((draft, context) => {
    const identifiers = new Set(draft.entries.map(({ id }) => id))

    if (identifiers.size !== draft.entries.length) {
      context.addIssue({
        code: "custom",
        message: "Mobile batch copy entry identifiers must be unique",
        path: ["entries"],
      })
    }

    if (
      draft.step === "collecting" &&
      draft.clickCount !== draft.entries.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Collecting entries must match the click count",
        path: ["clickCount"],
      })
    }
  })

export type MobileBatchCopyEntry = z.infer<
  typeof MobileBatchCopyEntrySchema
>
export type MobileBatchCopyDraft = z.infer<
  typeof MobileBatchCopyDraftSchema
>
export type CollectingMobileBatchCopyDraft = MobileBatchCopyDraft & {
  step: "collecting"
}
export type ConfirmingMobileBatchCopyDraft = MobileBatchCopyDraft & {
  step: "confirming"
}

export interface MobileBatchCopyDraftRepository {
  get(): Promise<MobileBatchCopyDraft | null>
  remove(): Promise<void>
  save(draft: MobileBatchCopyDraft): Promise<MobileBatchCopyDraft>
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

export function parseMobileBatchCopyDraft(
  value: unknown,
): MobileBatchCopyDraft {
  return MobileBatchCopyDraftSchema.parse(value)
}
