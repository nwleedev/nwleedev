import { z } from "zod"

import { IsoDateTimeSchema } from "@/shared/lib/entity-metadata"

import {
  NoteContentReferenceSchema,
  type Note,
  type NoteContentReference,
} from "./note"

export const NoteDraftSchema = z
  .object({
    content: z.string(),
    note: NoteContentReferenceSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()

export type NoteDraft = z.infer<typeof NoteDraftSchema>

export interface NoteDraftRepository {
  get(note: NoteContentReference): Promise<NoteDraft | null>
  remove(note: NoteContentReference): Promise<void>
  save(draft: NoteDraft): Promise<NoteDraft>
}

export function isRecoverableNoteDraft(draft: NoteDraft, note: Note) {
  return (
    draft.note.id === note.id &&
    draft.note.contentRevision === note.contentRevision &&
    draft.content !== note.content
  )
}

export function parseNoteDraft(value: unknown): NoteDraft {
  return NoteDraftSchema.parse(value)
}
