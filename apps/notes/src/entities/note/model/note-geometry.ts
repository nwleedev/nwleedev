import { z } from "zod"

import {
  NOTE_CANVAS_SIZE,
  NOTE_HEIGHT_MAX,
  NOTE_HEIGHT_MIN,
  NOTE_POSITION_ABS_MAX,
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

    if (Math.abs(geometry.x) > NOTE_POSITION_ABS_MAX) {
      context.addIssue({
        code: "custom",
        message: "Horizontal position exceeds the safe numeric range",
        path: ["x"],
      })
    }

    if (Math.abs(geometry.y) > NOTE_POSITION_ABS_MAX) {
      context.addIssue({
        code: "custom",
        message: "Vertical position exceeds the safe numeric range",
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

export function createNoteGeometryDraft(
  geometry: NoteGeometry,
): NoteGeometryDraft {
  return {
    height: String(geometry.height),
    width: String(geometry.width),
    x: String(geometry.x),
    y: String(geometry.y),
  }
}

function isNoteGeometryDraftField(
  value: PropertyKey,
): value is NoteGeometryDraftField {
  return noteGeometryDraftFields.includes(value as NoteGeometryDraftField)
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

const newNoteHeight = 240
const newNoteWidth = 320
const newNoteGap = 32

function placementPositions(size: number) {
  const positions: number[] = []

  for (
    let position = newNoteGap;
    position + size <= NOTE_CANVAS_SIZE;
    position += size + newNoteGap
  ) {
    positions.push(position)
  }

  return positions
}

function overlapsWithGap(
  candidate: NoteGeometry,
  existing: NoteGeometry,
) {
  const separatedHorizontally =
    candidate.x + candidate.width + newNoteGap <= existing.x ||
    existing.x + existing.width + newNoteGap <= candidate.x
  const separatedVertically =
    candidate.y + candidate.height + newNoteGap <= existing.y ||
    existing.y + existing.height + newNoteGap <= candidate.y

  return !separatedHorizontally && !separatedVertically
}

export function findNewNoteGeometry(
  existingGeometry: readonly NoteGeometry[],
): NoteGeometry {
  const xPositions = placementPositions(newNoteWidth)
  const yPositions = placementPositions(newNoteHeight)
  const placementCount = xPositions.length * yPositions.length
  const firstPlacement = existingGeometry.length % placementCount
  const zIndex =
    existingGeometry.reduce(
      (highest, geometry) => Math.max(highest, geometry.zIndex),
      0,
    ) + 1

  for (let offset = 0; offset < placementCount; offset += 1) {
    const placement = (firstPlacement + offset) % placementCount
    const column = placement % xPositions.length
    const row = Math.floor(placement / xPositions.length)
    const candidate: NoteGeometry = {
      height: newNoteHeight,
      width: newNoteWidth,
      x: xPositions[column],
      y: yPositions[row],
      zIndex,
    }
    const occupied = existingGeometry.some((geometry) =>
      overlapsWithGap(candidate, geometry),
    )

    if (!occupied) {
      return candidate
    }
  }

  const column = firstPlacement % xPositions.length
  const row = Math.floor(firstPlacement / xPositions.length)

  return {
    height: newNoteHeight,
    width: newNoteWidth,
    x: xPositions[column],
    y: yPositions[row],
    zIndex,
  }
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

  if (
    !values.every(Number.isFinite) ||
    Math.abs(geometry.x) > NOTE_POSITION_ABS_MAX ||
    Math.abs(geometry.y) > NOTE_POSITION_ABS_MAX
  ) {
    throw new TypeError(
      "Note geometry must contain finite, safely representable numbers",
    )
  }

  const width = clamp(geometry.width, NOTE_WIDTH_MIN, NOTE_WIDTH_MAX)
  const height = clamp(geometry.height, NOTE_HEIGHT_MIN, NOTE_HEIGHT_MAX)

  return {
    height,
    width,
    x: geometry.x,
    y: geometry.y,
    zIndex: geometry.zIndex,
  }
}
