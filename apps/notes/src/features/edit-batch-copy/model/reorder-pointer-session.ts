export type ReorderSnapshot = {
  focusItemId: string | null
  itemIds: readonly string[]
  selectedItemId: string | null
}

type ReorderPointerSession = {
  active: boolean
  itemId: string
  originalIndex: number
  pointerId: number
  previewItemIds: readonly string[]
  snapshot: ReorderSnapshot
  startX: number
  startY: number
  targetIndex: number | null
  threshold: number
}

type CreateReorderPointerSessionInput = ReorderSnapshot & {
  itemId: string
  pointerId: number
  startX: number
  startY: number
  threshold: number
}

type ReorderPointerPosition = {
  clientX: number
  clientY: number
  targetIndex: number | null
}

export type ReorderPointerCompletion = {
  command: { itemId: string; targetIndex: number } | null
  itemIds: readonly string[]
  snapshot: ReorderSnapshot
}

function moveItemId(
  itemIds: readonly string[],
  itemId: string,
  targetIndex: number,
) {
  const sourceIndex = itemIds.indexOf(itemId)

  if (sourceIndex < 0 || sourceIndex === targetIndex) {
    return [...itemIds]
  }

  const moved = [...itemIds]
  const [item] = moved.splice(sourceIndex, 1)

  if (item === undefined) {
    return [...itemIds]
  }

  moved.splice(targetIndex, 0, item)
  return moved
}

export function createReorderPointerSession({
  focusItemId,
  itemId,
  itemIds,
  pointerId,
  selectedItemId,
  startX,
  startY,
  threshold,
}: CreateReorderPointerSessionInput): ReorderPointerSession {
  return {
    active: false,
    itemId,
    originalIndex: itemIds.indexOf(itemId),
    pointerId,
    previewItemIds: [...itemIds],
    snapshot: {
      focusItemId,
      itemIds: [...itemIds],
      selectedItemId,
    },
    startX,
    startY,
    targetIndex: null,
    threshold,
  }
}

export function advanceReorderPointerSession(
  session: ReorderPointerSession,
  position: ReorderPointerPosition,
): ReorderPointerSession {
  const distance = Math.hypot(
    position.clientX - session.startX,
    position.clientY - session.startY,
  )
  const active = session.active || distance >= session.threshold
  const validTarget =
    position.targetIndex !== null &&
    position.targetIndex >= 0 &&
    position.targetIndex < session.snapshot.itemIds.length
  const targetIndex = active && validTarget ? position.targetIndex : null
  const previewItemIds = targetIndex === null
    ? session.snapshot.itemIds
    : moveItemId(session.snapshot.itemIds, session.itemId, targetIndex)

  return {
    ...session,
    active,
    previewItemIds,
    targetIndex,
  }
}

export function finishReorderPointerSession(
  session: ReorderPointerSession,
): ReorderPointerCompletion {
  const targetIndex = session.previewItemIds.indexOf(session.itemId)
  const changed =
    session.active &&
    session.targetIndex !== null &&
    targetIndex !== session.originalIndex

  return {
    command: changed ? { itemId: session.itemId, targetIndex } : null,
    itemIds: changed ? session.previewItemIds : session.snapshot.itemIds,
    snapshot: session.snapshot,
  }
}

export function restoreReorderSnapshot(snapshot: ReorderSnapshot) {
  return {
    focusItemId: snapshot.focusItemId,
    itemIds: [...snapshot.itemIds],
    selectedItemId: snapshot.selectedItemId,
  }
}
