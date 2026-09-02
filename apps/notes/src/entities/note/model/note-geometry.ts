import { z } from "zod"

import {
  NOTE_CANVAS_SIZE,
  NOTE_HEIGHT_MAX,
  NOTE_HEIGHT_MIN,
  NOTE_WIDTH_MAX,
  NOTE_WIDTH_MIN,
  NoteGeometrySchema,
  type NoteGeometry,
} from "./note"

const DraftNumberSchema = z
  .string()
  .trim()
  .min(1)
  .transform(Number)
  .pipe(z.number().finite())

export const NoteGeometryDraftSchema = z
  .object({
    height: DraftNumberSchema,
    width: DraftNumberSchema,
    x: DraftNumberSchema,
    y: DraftNumberSchema,
  })
  .strict()
  .superRefine((geometry, context) => {
    if (geometry.width < NOTE_WIDTH_MIN || geometry.width > NOTE_WIDTH_MAX) {
      context.addIssue({
        code: "custom",
        message: "Width is outside the supported range",
        path: ["width"],
      })
    }

    if (geometry.height < NOTE_HEIGHT_MIN || geometry.height > NOTE_HEIGHT_MAX) {
      context.addIssue({
        code: "custom",
        message: "Height is outside the supported range",
        path: ["height"],
      })
    }

    if (geometry.x < 1 || geometry.x > NOTE_CANVAS_SIZE - geometry.width) {
      context.addIssue({
        code: "custom",
        message: "Horizontal position is outside the canvas",
        path: ["x"],
      })
    }

    if (geometry.y < 1 || geometry.y > NOTE_CANVAS_SIZE - geometry.height) {
      context.addIssue({
        code: "custom",
        message: "Vertical position is outside the canvas",
        path: ["y"],
      })
    }
  })

export type NoteGeometryDraft = {
  height: string
  width: string
  x: string
  y: string
}

export type NoteGeometryDraftField = keyof NoteGeometryDraft

export type NoteGeometryDraftResult =
  | { fields: readonly NoteGeometryDraftField[]; status: "invalid" }
  | { geometry: NoteGeometry; status: "valid" }

const noteGeometryDraftFields: readonly NoteGeometryDraftField[] = [
  "height",
  "width",
  "x",
  "y",
]

function isNoteGeometryDraftField(
  value: PropertyKey,
): value is NoteGeometryDraftField {
  return noteGeometryDraftFields.includes(value as NoteGeometryDraftField)
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

export function readNoteGeometryDraft(
  draft: NoteGeometryDraft,
  zIndex: number,
): NoteGeometryDraftResult {
  const parsedDraft = NoteGeometryDraftSchema.safeParse(draft)

  if (!parsedDraft.success) {
    const fields = parsedDraft.error.issues.flatMap((issue) => {
      const [field] = issue.path
      return isNoteGeometryDraftField(field) ? [field] : []
    })

    return { fields: [...new Set(fields)], status: "invalid" }
  }

  const geometry = NoteGeometrySchema.safeParse({ ...parsedDraft.data, zIndex })

  if (!geometry.success) {
    return { fields: [], status: "invalid" }
  }

  return { geometry: geometry.data, status: "valid" }
}

export function fitNoteGeometryToCanvas(
  geometry: NoteGeometry,
): NoteGeometry {
  const values = [
    geometry.height,
    geometry.width,
    geometry.x,
    geometry.y,
    geometry.zIndex,
  ]

  if (!values.every(Number.isFinite)) {
    throw new TypeError("Note geometry must contain finite numbers")
  }

  const width = clamp(geometry.width, NOTE_WIDTH_MIN, NOTE_WIDTH_MAX)
  const height = clamp(geometry.height, NOTE_HEIGHT_MIN, NOTE_HEIGHT_MAX)

  return {
    height,
    width,
    x: clamp(geometry.x, 1, NOTE_CANVAS_SIZE - width),
    y: clamp(geometry.y, 1, NOTE_CANVAS_SIZE - height),
    zIndex: geometry.zIndex,
  }
}
