import {
  moveBatchCopyItem,
  removeBatchCopyItem,
  restoreBatchCopyItem,
} from "./batch-copy-commands"
import type { BatchCopyItem, BatchCopyList } from "./batch-copy-list"

type RemovalEntry = {
  index: number
  item: BatchCopyItem
}

export type BatchCopyRemovalHistory = {
  redo: readonly RemovalEntry[]
  undo: readonly RemovalEntry[]
}

export type BatchCopySession = {
  history: BatchCopyRemovalHistory
  list: BatchCopyList
}

function clearRedo(history: BatchCopyRemovalHistory): BatchCopyRemovalHistory {
  return { ...history, redo: [] }
}

export function createBatchCopySession(list: BatchCopyList): BatchCopySession {
  return { history: { redo: [], undo: [] }, list }
}

export function applyBatchCopyItem(
  session: BatchCopySession,
  list: BatchCopyList,
): BatchCopySession {
  return { history: clearRedo(session.history), list }
}

export function reorderBatchCopySession(
  session: BatchCopySession,
  itemId: string,
  requestedIndex: number,
  updatedAt: string,
) {
  const list = moveBatchCopyItem(
    session.list,
    itemId,
    requestedIndex,
    updatedAt,
  )

  if (list === null) {
    return null
  }

  return { ...session, history: clearRedo(session.history), list }
}

export function removeFromBatchCopySession(
  session: BatchCopySession,
  itemId: string,
  updatedAt: string,
) {
  const removal = removeBatchCopyItem(session.list, itemId, updatedAt)

  if (removal === null) {
    return null
  }

  return {
    history: {
      redo: [],
      undo: [
        ...session.history.undo,
        { index: removal.index, item: removal.item },
      ],
    },
    list: removal.list,
  }
}

export function undoBatchCopyItemRemoval(
  session: BatchCopySession,
  updatedAt: string,
) {
  const entry = session.history.undo.at(-1)

  if (entry === undefined) {
    return null
  }

  const list = restoreBatchCopyItem(
    session.list,
    entry.item,
    entry.index,
    updatedAt,
  )

  if (list === null) {
    return null
  }

  return {
    history: {
      redo: [...session.history.redo, entry],
      undo: session.history.undo.slice(0, -1),
    },
    list,
  }
}

export function redoBatchCopyItemRemoval(
  session: BatchCopySession,
  updatedAt: string,
) {
  const entry = session.history.redo.at(-1)

  if (entry === undefined) {
    return null
  }

  const removal = removeBatchCopyItem(session.list, entry.item.id, updatedAt)

  if (removal === null) {
    return null
  }

  return {
    history: {
      redo: session.history.redo.slice(0, -1),
      undo: [...session.history.undo, entry],
    },
    list: removal.list,
  }
}

export function canUndoBatchCopyItemRemoval(session: BatchCopySession) {
  return session.history.undo.length > 0
}

export function canRedoBatchCopyItemRemoval(session: BatchCopySession) {
  return session.history.redo.length > 0
}
