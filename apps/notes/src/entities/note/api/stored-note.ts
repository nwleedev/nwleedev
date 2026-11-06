import { z } from "zod"

import { EntityIdSchema } from "@/shared/lib/entity-metadata"
import { readRequest } from "@/shared/lib/indexed-db"

import { NoteRecordSchema, type Note } from "../model/note"
import { NoteBody } from "../model/note-body"

export const NOTE_STORE_NAME = "notes"
export const NOTE_POSITION_INDEX = "position"
export const StoredNoteSchema = NoteRecordSchema.omit({ content: true }).extend({
  body: z.instanceof(Uint8Array),
  position: z.number().finite(),
})

export const NoteFields = NoteRecordSchema.strip()

const UpdateSchema = z.object({
  id: EntityIdSchema,
  noteId: EntityIdSchema,
  payload: z.instanceof(Uint8Array),
})

export function storeNote(note: Note, position: number, previous?: z.infer<typeof StoredNoteSchema>) {
  const { content, ...fields } = note
  let body: Uint8Array | undefined = previous?.body
  if (body === undefined) {
    body = NoteBody.fromText(content).snapshot()
  } else if (previous && note.contentRevision > previous.contentRevision) {
    const edited = new NoteBody(body)
    edited.updateText(content)
    body = edited.snapshot()
  }
  return { ...fields, body, position }
}

export async function readStoredBody(record: z.infer<typeof StoredNoteSchema>, updates: IDBObjectStore) {
  const changes: unknown[] = await readRequest(updates.index("noteId").getAll(record.id))
  const body = new NoteBody(record.body)
  const keys: string[][] = []
  for (const value of changes) {
    const change = UpdateSchema.parse(value)
    body.receive(change.payload)
    keys.push([change.id, change.noteId])
  }
  return { body, keys }
}
