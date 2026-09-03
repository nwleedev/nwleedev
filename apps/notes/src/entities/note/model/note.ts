import { z } from "zod"

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  RevisionSchema,
  type EntityId,
  type Revision,
} from "@/shared/lib/entity-metadata"

export const NOTE_CANVAS_SIZE = 4096
export const NOTE_HEIGHT_MIN = 180
export const NOTE_HEIGHT_MAX = NOTE_CANVAS_SIZE - 1
export const NOTE_WIDTH_MIN = 240
export const NOTE_WIDTH_MAX = NOTE_CANVAS_SIZE - 1
export const NOTE_TAB_INDEX_MIN = 1000
export const NOTE_TAB_INDEX_MAX = 32767

export const NoteGeometrySchema = z
  .object({
    height: z.number().finite().min(NOTE_HEIGHT_MIN).max(NOTE_HEIGHT_MAX),
    width: z.number().finite().min(NOTE_WIDTH_MIN).max(NOTE_WIDTH_MAX),
    x: z.number().finite().min(1),
    y: z.number().finite().min(1),
    zIndex: z.number().int().positive().safe(),
  })
  .strict()
  .superRefine((geometry, context) => {
    if (geometry.x > NOTE_CANVAS_SIZE - geometry.width) {
      context.addIssue({
        code: "custom",
        message: "Note must remain inside the canvas width",
        path: ["x"],
      })
    }

    if (geometry.y > NOTE_CANVAS_SIZE - geometry.height) {
      context.addIssue({
        code: "custom",
        message: "Note must remain inside the canvas height",
        path: ["y"],
      })
    }
  })

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
    createdAt: IsoDateTimeSchema,
    geometry: NoteGeometrySchema,
    id: EntityIdSchema,
    revision: RevisionSchema,
    tabIndex: NoteTabIndexSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()

export const NoteReferenceSchema = z
  .object({
    id: EntityIdSchema,
    revision: RevisionSchema,
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
export type NoteReference = z.infer<typeof NoteReferenceSchema>
export type NoteContentReference = z.infer<typeof NoteContentReferenceSchema>

export interface NoteReader {
  getAll(): Promise<readonly Note[]>
}

export interface NoteRepository extends NoteReader {
  save(note: Note): Promise<Note>
  saveAll(notes: readonly Note[]): Promise<readonly Note[]>
  remove(note: NoteReference): Promise<void>
}

export type NoteRevision = {
  content?: string
  geometry?: NoteGeometry
  updatedAt: string
}

function geometriesAreEqual(left: NoteGeometry, right: NoteGeometry) {
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
    revision: incrementRevision(note.revision),
    updatedAt: change.updatedAt,
  }
}

export function parseNoteRecord(value: unknown): Note {
  return NoteRecordSchema.parse(value)
}

export function createNoteReference(note: Note): {
  id: EntityId
  revision: Revision
} {
  return { id: note.id, revision: note.revision }
}
