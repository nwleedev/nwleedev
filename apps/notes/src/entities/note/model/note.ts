import { z } from "zod"

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  RevisionSchema,
  type EntityId,
  type Revision,
} from "@/shared/lib/entity-metadata"

export const NoteGeometrySchema = z
  .object({
    height: z.number().positive(),
    width: z.number().positive(),
    x: z.number(),
    y: z.number(),
    zIndex: z.number().int().nonnegative().safe(),
  })
  .strict()

export const NoteRecordSchema = z
  .object({
    content: z.string(),
    contentRevision: RevisionSchema,
    createdAt: IsoDateTimeSchema,
    geometry: NoteGeometrySchema,
    id: EntityIdSchema,
    revision: RevisionSchema,
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
export type Note = z.infer<typeof NoteRecordSchema>
export type NoteReference = z.infer<typeof NoteReferenceSchema>
export type NoteContentReference = z.infer<typeof NoteContentReferenceSchema>

export interface NoteRepository {
  getAll(): Promise<readonly Note[]>
  save(note: Note): Promise<Note>
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
