import type { Note, NoteGeometry } from "@/entities/note"

export type BoardView = {
  originX: number
  originY: number
  scale: number
  x: number
  y: number
}

export type BoardSize = {
  height: number
  width: number
}

export type BoardRectangle = {
  bottom: number
  left: number
  right: number
  top: number
}

export type BoardPoint = {
  x: number
  y: number
}

const VIEW_PADDING = 16
const FIT_PADDING = 32
const MAX_SCALE = 2

export function initialBoardView(
  notes: readonly Note[],
  focusedNoteId: string | null,
): BoardView {
  const focusedNote = notes.find(({ id }) => id === focusedNoteId)

  if (focusedNote === undefined) {
    return { originX: 0, originY: 0, scale: 1, x: 0, y: 0 }
  }

  return {
    originX: focusedNote.geometry.x,
    originY: focusedNote.geometry.y,
    scale: 1,
    x: 48,
    y: 80,
  }
}

function noteBounds(notes: readonly Note[]): BoardRectangle {
  const [firstNote, ...remainingNotes] = notes

  if (firstNote === undefined) {
    return { bottom: 0, left: 0, right: 0, top: 0 }
  }

  return remainingNotes.reduce(
    (bounds, note) => ({
      bottom: Math.max(bounds.bottom, note.geometry.y + note.geometry.height),
      left: Math.min(bounds.left, note.geometry.x),
      right: Math.max(bounds.right, note.geometry.x + note.geometry.width),
      top: Math.min(bounds.top, note.geometry.y),
    }),
    {
      bottom: firstNote.geometry.y + firstNote.geometry.height,
      left: firstNote.geometry.x,
      right: firstNote.geometry.x + firstNote.geometry.width,
      top: firstNote.geometry.y,
    },
  )
}

export function fitNotesInView(
  notes: readonly Note[],
  viewport: BoardSize,
): BoardView {
  if (notes.length === 0) {
    return initialBoardView(notes, null)
  }

  const bounds = noteBounds(notes)
  const contentWidth = Math.max(1, bounds.right - bounds.left)
  const contentHeight = Math.max(1, bounds.bottom - bounds.top)
  const availableWidth = Math.max(1, viewport.width - FIT_PADDING * 2)
  const availableHeight = Math.max(1, viewport.height - FIT_PADDING * 2)
  const scale = Math.min(
    1,
    availableWidth / contentWidth,
    availableHeight / contentHeight,
  )

  return {
    originX: bounds.left,
    originY: bounds.top,
    scale,
    x: FIT_PADDING,
    y: FIT_PADDING,
  }
}

function focusedRectangle(
  view: BoardView,
  geometry: NoteGeometry,
): BoardRectangle {
  const left = (geometry.x - view.originX) * view.scale + view.x
  const top = (geometry.y - view.originY) * view.scale + view.y

  return {
    bottom: top + geometry.height * view.scale,
    left,
    right: left + geometry.width * view.scale,
    top,
  }
}

function revealAxis(start: number, end: number, available: number) {
  const near = VIEW_PADDING
  const far = available - VIEW_PADDING

  if (end - start > far - near) {
    return start < near || start > far ? near - start : 0
  }

  if (start < near) {
    return near - start
  }

  return end > far ? far - end : 0
}

function rectanglesOverlap(left: BoardRectangle, right: BoardRectangle) {
  return (
    left.left < right.right &&
    left.right > right.left &&
    left.top < right.bottom &&
    left.bottom > right.top
  )
}

export function revealNoteInView(
  view: BoardView,
  geometry: NoteGeometry,
  viewport: BoardSize,
  controls: BoardRectangle | null,
): BoardView {
  if (viewport.width <= 0 || viewport.height <= 0) {
    return view
  }

  const bounds = focusedRectangle(view, geometry)
  let x = view.x + revealAxis(bounds.left, bounds.right, viewport.width)
  let y = view.y + revealAxis(bounds.top, bounds.bottom, viewport.height)

  if (controls !== null) {
    const shifted = {
      bottom: bounds.bottom + y - view.y,
      left: bounds.left + x - view.x,
      right: bounds.right + x - view.x,
      top: bounds.top + y - view.y,
    }

    if (rectanglesOverlap(shifted, controls)) {
      const above = controls.top - VIEW_PADDING - shifted.bottom
      const right = controls.right + VIEW_PADDING - shifted.left

      if (shifted.top + above >= VIEW_PADDING) {
        y += above
      } else if (shifted.right + right <= viewport.width - VIEW_PADDING) {
        x += right
      } else if (shifted.top > VIEW_PADDING) {
        y += VIEW_PADDING - shifted.top
      }
    }
  }

  if (x === view.x && y === view.y) {
    return view
  }

  return { ...view, x, y }
}

export function zoomBoardView(
  view: BoardView,
  proposedScale: number,
  anchor: BoardPoint,
): BoardView {
  const scale = Math.max(Number.EPSILON, Math.min(MAX_SCALE, proposedScale))

  if (!Number.isFinite(scale) || scale === view.scale) {
    return view
  }

  const ratio = scale / view.scale

  return {
    ...view,
    scale,
    x: anchor.x - (anchor.x - view.x) * ratio,
    y: anchor.y - (anchor.y - view.y) * ratio,
  }
}
