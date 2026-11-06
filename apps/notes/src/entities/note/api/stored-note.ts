import { z } from "zod"

import { EntityIdSchema, toTimestamp } from "@/shared/lib/entity-metadata"
import { readRequest } from "@/shared/lib/indexed-db/index.browser"

import { NoteRecordSchema, type Note } from "../model/note"
import { NoteBody } from "../model/note-body"

export const NOTE_STORE_NAME = "notes"
export const NOTE_POSITION_INDEX = "position"
export const StoredNoteSchema = NoteRecordSchema.omit({ content: true }).extend({
  body: z.instanceof(Uint8Array),
  createdAt: z.int(),
  updatedAt: z.int(),
  position: z.number().finite(),
})

export const NoteFields = NoteRecordSchema.strip()

const UpdateSchema = z.object({
  id: EntityIdSchema,
  noteId: EntityIdSchema,
  payload: z.instanceof(Uint8Array),
})

export function storeNote(note: Note, position: number, restored = false) {
  const { content, ...fields } = note
  const body = restored ? NoteBody.restore(content) : NoteBody.fromText(content)
  return {
    ...fields,
    body: body.snapshot(),
    position,
    createdAt: toTimestamp(note.createdAt),
    updatedAt: toTimestamp(note.updatedAt),
  }
}

export function storeGeometry(record: z.infer<typeof StoredNoteSchema>, note: Note) {
  return { ...record, geometry: note.geometry, updatedAt: toTimestamp(note.updatedAt) }
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
