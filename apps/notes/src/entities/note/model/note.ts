import { z } from "zod"

import type { MobileNotePosition } from "./mobile-note-order"

import {
  EntityIdSchema,
  TimestampSchema,
  RevisionSchema,
  type Revision,
} from "@/shared/lib/entity-metadata"

export const NOTE_CANVAS_SIZE = 4096
export const NOTE_HEIGHT_MIN = 180
export const NOTE_HEIGHT_MAX = NOTE_CANVAS_SIZE - 1
export const NOTE_WIDTH_MIN = 240
export const NOTE_WIDTH_MAX = NOTE_CANVAS_SIZE - 1
export const NOTE_POSITION_ABS_MAX = Number.MAX_SAFE_INTEGER
export const NOTE_TAB_INDEX_MIN = 1000
export const NOTE_TAB_INDEX_MAX = 32767

const NoteCoordinateSchema = z
  .number()
  .finite()
  .refine((value) => Math.abs(value) <= NOTE_POSITION_ABS_MAX, {
    message: "Note position exceeds the safe numeric range",
  })

export const NoteGeometrySchema = z
  .object({
    height: z.number().finite().min(NOTE_HEIGHT_MIN).max(NOTE_HEIGHT_MAX),
    width: z.number().finite().min(NOTE_WIDTH_MIN).max(NOTE_WIDTH_MAX),
    x: NoteCoordinateSchema,
    y: NoteCoordinateSchema,
    zIndex: z.number().int().positive().safe(),
  })
  .strict()

export const NoteTabIndexSchema = z
  .number()
  .int()
  .min(NOTE_TAB_INDEX_MIN)
  .max(NOTE_TAB_INDEX_MAX)
  .safe()

export const NoteRecordSchema = z
  .object({
    content: z.string(),
    contentRevision: RevisionSchema,
    createdAt: TimestampSchema,
    geometry: NoteGeometrySchema,
    id: EntityIdSchema,
    tabIndex: NoteTabIndexSchema,
    updatedAt: TimestampSchema,
  })
  .strict()

export const NoteContentReferenceSchema = z
  .object({
    contentRevision: RevisionSchema,
    id: EntityIdSchema,
  })
  .strict()

export type NoteGeometry = z.infer<typeof NoteGeometrySchema>
export type NoteTabIndex = z.infer<typeof NoteTabIndexSchema>
export type Note = z.infer<typeof NoteRecordSchema>
export type NoteContentReference = z.infer<typeof NoteContentReferenceSchema>

export interface NoteReader {
  getAll(): Promise<readonly Note[]>
}

export interface NoteRepository extends NoteReader {
  get(noteId: string): Promise<Note | null>
  save(note: Note): Promise<Note>
  saveGeometry(original: Note, geometry: NoteGeometry, updatedAt: number): Promise<Note | null>
  saveEdit(original: Note, edited: Note): Promise<Note | null>
  moveInStack(target: Note, edge: "front" | "back", updatedAt: number): Promise<{ notes: readonly Note[]; changedIds: readonly string[] }>
  remove(note: Pick<Note, "id">): Promise<Note | null>
  openEditor(id: string): Promise<(() => Promise<void>) | null>
  deletedNote(id: string): Promise<Note | null>
  restore(note: Note, position?: MobileNotePosition): Promise<Note>
}

export type NoteRevision = {
  content?: string
  geometry?: NoteGeometry
  updatedAt: number
}

export function geometriesAreEqual(left: NoteGeometry, right: NoteGeometry) {
  return (
    left.height === right.height &&
    left.width === right.width &&
    left.x === right.x &&
    left.y === right.y &&
    left.zIndex === right.zIndex
  )
}

function incrementRevision(revision: Revision) {
  if (revision >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError("Revision cannot exceed the safe integer range")
  }

  return revision + 1
}

export function reviseNote(note: Note, change: NoteRevision): Note {
  const contentChanged =
    change.content !== undefined && change.content !== note.content
  const geometryChanged =
    change.geometry !== undefined &&
    !geometriesAreEqual(change.geometry, note.geometry)

  if (!contentChanged && !geometryChanged) {
    return note
  }

  return {
    ...note,
    ...(contentChanged ? { content: change.content } : {}),
    ...(geometryChanged ? { geometry: change.geometry } : {}),
    contentRevision: contentChanged
      ? incrementRevision(note.contentRevision)
      : note.contentRevision,
    updatedAt: change.updatedAt,
  }
}

export function parseNoteRecord(value: unknown): Note {
  return NoteRecordSchema.parse(value)
}
