import { z } from "zod"

import { EntityIdSchema, IsoDateTimeSchema, RevisionSchema } from "@/shared/lib/entity-metadata"

const PreviousSourceSchema = z.object({
  id: EntityIdSchema,
  contentRevision: RevisionSchema,
}).strict()

export const NoteDraftSchema = z
  .object({
    content: z.string(),
    note: PreviousSourceSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()

export type NoteDraft = z.infer<typeof NoteDraftSchema>

export function isRecoverableNoteDraft(draft: NoteDraft, note: NoteDraft["note"] & { content: string }) {
  return (
    draft.note.id === note.id &&
    draft.note.contentRevision === note.contentRevision &&
    draft.content !== note.content
  )
}
