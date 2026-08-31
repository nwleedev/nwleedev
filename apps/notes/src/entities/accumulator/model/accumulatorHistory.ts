import {
  moveAccumulatorItem,
  removeAccumulatorItem,
  restoreAccumulatorItem,
} from "./accumulatorCommands"
import type {
  AccumulatedTextItem,
  Accumulator,
} from "./accumulatorRecord"

type RemovalEntry = {
  index: number
  item: AccumulatedTextItem
  selectedNoteId: string | null
}

type AccumulatorHistory = {
  redo: readonly RemovalEntry[]
  undo: readonly RemovalEntry[]
}

export type AccumulatorSession = {
  accumulator: Accumulator
  history: AccumulatorHistory
  selectedItemByNote: Readonly<Record<string, string>>
}

function clearRedo(history: AccumulatorHistory): AccumulatorHistory {
  return { ...history, redo: [] }
}

function selectedNoteForItem(
  selectedItemByNote: Readonly<Record<string, string>>,
  itemId: string,
) {
  for (const [noteId, selectedItemId] of Object.entries(selectedItemByNote)) {
    if (selectedItemId === itemId) {
      return noteId
    }
  }

  return null
}

function removeSelection(
  selectedItemByNote: Readonly<Record<string, string>>,
  noteId: string | null,
  itemId: string,
) {
  const nextSelection = { ...selectedItemByNote }

  if (noteId !== null && nextSelection[noteId] === itemId) {
    delete nextSelection[noteId]
  }

  return nextSelection
}

export function createAccumulatorSession(
  accumulator: Accumulator,
): AccumulatorSession {
  return {
    accumulator,
    history: { redo: [], undo: [] },
    selectedItemByNote: {},
  }
}

export function applyAccumulation(
  session: AccumulatorSession,
  accumulator: Accumulator,
  item: AccumulatedTextItem,
  selectedNoteId: string | null,
): AccumulatorSession {
  const selectedItemByNote = { ...session.selectedItemByNote }

  if (selectedNoteId !== null) {
    selectedItemByNote[selectedNoteId] = item.id
  }

  return {
    accumulator,
    history: clearRedo(session.history),
    selectedItemByNote,
  }
}

export function reorderAccumulatorSession(
  session: AccumulatorSession,
  itemId: string,
  requestedIndex: number,
  updatedAt: string,
) {
  const accumulator = moveAccumulatorItem(
    session.accumulator,
    itemId,
    requestedIndex,
    updatedAt,
  )

  if (accumulator === null) {
    return null
  }

  return {
    ...session,
    accumulator,
    history: clearRedo(session.history),
  }
}

export function removeFromAccumulatorSession(
  session: AccumulatorSession,
  itemId: string,
  updatedAt: string,
) {
  const removal = removeAccumulatorItem(session.accumulator, itemId, updatedAt)

  if (removal === null) {
    return null
  }

  const selectedNoteId = selectedNoteForItem(
    session.selectedItemByNote,
    itemId,
  )
  const entry: RemovalEntry = {
    index: removal.index,
    item: removal.item,
    selectedNoteId,
  }

  return {
    accumulator: removal.accumulator,
    history: {
      redo: [],
      undo: [...session.history.undo, entry],
    },
    selectedItemByNote: removeSelection(
      session.selectedItemByNote,
      selectedNoteId,
      itemId,
    ),
  }
}

export function undoAccumulatorRemoval(
  session: AccumulatorSession,
  updatedAt: string,
) {
  const entry = session.history.undo.at(-1)

  if (entry === undefined) {
    return null
  }

  const accumulator = restoreAccumulatorItem(
    session.accumulator,
    entry.item,
    entry.index,
    updatedAt,
  )

  if (accumulator === null) {
    return null
  }

  const selectedItemByNote = { ...session.selectedItemByNote }

  if (
    entry.selectedNoteId !== null &&
    selectedItemByNote[entry.selectedNoteId] === undefined
  ) {
    selectedItemByNote[entry.selectedNoteId] = entry.item.id
  }

  return {
    accumulator,
    history: {
      redo: [...session.history.redo, entry],
      undo: session.history.undo.slice(0, -1),
    },
    selectedItemByNote,
  }
}

export function redoAccumulatorRemoval(
  session: AccumulatorSession,
  updatedAt: string,
) {
  const entry = session.history.redo.at(-1)

  if (entry === undefined) {
    return null
  }

  const removal = removeAccumulatorItem(
    session.accumulator,
    entry.item.id,
    updatedAt,
  )

  if (removal === null) {
    return null
  }

  return {
    accumulator: removal.accumulator,
    history: {
      redo: session.history.redo.slice(0, -1),
      undo: [...session.history.undo, entry],
    },
    selectedItemByNote: removeSelection(
      session.selectedItemByNote,
      entry.selectedNoteId,
      entry.item.id,
    ),
  }
}

export function canUndoAccumulatorRemoval(session: AccumulatorSession) {
  return session.history.undo.length > 0
}

export function canRedoAccumulatorRemoval(session: AccumulatorSession) {
  return session.history.redo.length > 0
}
