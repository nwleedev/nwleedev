import { z } from "zod"

import { IsoDateTimeSchema } from "@/shared/lib/entity-metadata"

import {
  NoteContentReferenceSchema,
  type Note,
} from "./note"

export const NoteDraftSchema = z
  .object({
    content: z.string(),
    note: NoteContentReferenceSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()

export type NoteDraft = z.infer<typeof NoteDraftSchema>

export function isRecoverableNoteDraft(draft: NoteDraft, note: Pick<Note, "id" | "content" | "contentRevision">) {
  return (
    draft.note.id === note.id &&
    draft.note.contentRevision === note.contentRevision &&
    draft.content !== note.content
  )
}
