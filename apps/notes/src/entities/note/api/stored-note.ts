import { z } from "zod"

import { NoteRecordSchema } from "../model/note"

export const NOTE_STORE_NAME = "notes"
export const NOTE_POSITION_INDEX = "position"
export const StoredNoteSchema = NoteRecordSchema.extend({ position: z.number().finite() })

const NoteFields = NoteRecordSchema.strip()

export function readNote(value: unknown) {
  return NoteFields.parse(value)
}
