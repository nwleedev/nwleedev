import {
  NOTE_TAB_INDEX_MAX,
  NOTE_TAB_INDEX_MIN,
  reviseNote,
  type Note,
} from "./note"

type NoteTabIndexCandidate = {
  createdAt: string
  id: string
  tabIndex?: unknown
}

function validTabIndex(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= NOTE_TAB_INDEX_MIN &&
    value <= NOTE_TAB_INDEX_MAX
  )
}

function compareIdentity(
  left: Pick<NoteTabIndexCandidate, "createdAt" | "id">,
  right: Pick<NoteTabIndexCandidate, "createdAt" | "id">,
) {
  const createdAtOrder = left.createdAt.localeCompare(right.createdAt)
  return createdAtOrder === 0 ? left.id.localeCompare(right.id) : createdAtOrder
}

export function normalizeNoteTabIndexes<T extends NoteTabIndexCandidate>(
  notes: readonly T[],
): Array<T & { tabIndex: number }> {
  if (notes.length > NOTE_TAB_INDEX_MAX - NOTE_TAB_INDEX_MIN + 1) {
    throw new RangeError("No keyboard order remains for another note")
  }

  const ordered = [...notes].sort((left, right) => {
    const leftOrder = validTabIndex(left.tabIndex)
      ? left.tabIndex
      : Number.POSITIVE_INFINITY
    const rightOrder = validTabIndex(right.tabIndex)
      ? right.tabIndex
      : Number.POSITIVE_INFINITY

    return leftOrder === rightOrder
      ? compareIdentity(left, right)
      : leftOrder - rightOrder
  })

  return ordered.map((note, index) => ({
    ...note,
    tabIndex: NOTE_TAB_INDEX_MIN + index,
  }))
}

export function nextNoteTabIndex(
  notes: readonly Pick<Note, "tabIndex">[],
) {
  const currentMaximum = notes.reduce(
    (maximum, note) => Math.max(maximum, note.tabIndex),
    NOTE_TAB_INDEX_MIN - 1,
  )

  if (currentMaximum >= NOTE_TAB_INDEX_MAX) {
    throw new RangeError("No keyboard order remains for another note")
  }

  return currentMaximum + 1
}

function validZIndex(value: number) {
  return Number.isSafeInteger(value) && value > 0
}

export function normalizeNoteZIndexes(notes: readonly Note[]): Note[] {
  const ordered = [...notes].sort((left, right) => {
    const leftOrder = validZIndex(left.geometry.zIndex)
      ? left.geometry.zIndex
      : Number.POSITIVE_INFINITY
    const rightOrder = validZIndex(right.geometry.zIndex)
      ? right.geometry.zIndex
      : Number.POSITIVE_INFINITY

    return leftOrder === rightOrder
      ? compareIdentity(left, right)
      : leftOrder - rightOrder
  })

  return ordered.map((note, index) => ({
    ...note,
    geometry: { ...note.geometry, zIndex: index + 1 },
  }))
}

function moveNoteToStackEdge(
  notes: readonly Note[],
  noteId: string,
  edge: "back" | "front",
  updatedAt: string,
) {
  const normalized = normalizeNoteZIndexes(notes)
  const targetIndex = normalized.findIndex(({ id }) => id === noteId)

  if (targetIndex < 0) {
    return [...notes]
  }

  const ordered = [...normalized]
  const [target] = ordered.splice(targetIndex, 1)

  if (target === undefined) {
    return [...notes]
  }

  if (edge === "front") {
    ordered.push(target)
  } else {
    ordered.unshift(target)
  }

  return ordered.map((note, index) =>
    reviseNote(note, {
      geometry: { ...note.geometry, zIndex: index + 1 },
      updatedAt,
    }),
  )
}

export function sendNoteToFront(
  notes: readonly Note[],
  noteId: string,
  updatedAt: string,
) {
  return moveNoteToStackEdge(notes, noteId, "front", updatedAt)
}

export function sendNoteToBack(
  notes: readonly Note[],
  noteId: string,
  updatedAt: string,
) {
  return moveNoteToStackEdge(notes, noteId, "back", updatedAt)
}
