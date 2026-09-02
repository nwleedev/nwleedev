import type { AccumulatedTextItem } from "@/entities/accumulator"

type MobileBatchCopySessionBase = {
  clickCount: number
  items: readonly AccumulatedTextItem[]
}

export type CollectingMobileBatchCopySession = MobileBatchCopySessionBase & {
  phase: "collecting"
}

export type ConfirmingMobileBatchCopySession = MobileBatchCopySessionBase & {
  phase: "confirming"
}

export type MobileBatchCopySession =
  | CollectingMobileBatchCopySession
  | ConfirmingMobileBatchCopySession

export function beginMobileBatchCopy(): CollectingMobileBatchCopySession {
  return { clickCount: 0, items: [], phase: "collecting" }
}

export function addMobileBatchCopyItem(
  session: CollectingMobileBatchCopySession,
  item: AccumulatedTextItem,
): CollectingMobileBatchCopySession {
  return {
    ...session,
    clickCount: session.clickCount + 1,
    items: [...session.items, item],
  }
}

export function resetMobileBatchCopy(
  session: CollectingMobileBatchCopySession,
): CollectingMobileBatchCopySession {
  if (session.items.length === 0 && session.clickCount === 0) {
    return session
  }

  return { clickCount: 0, items: [], phase: "collecting" }
}

export function confirmMobileBatchCopy(
  session: CollectingMobileBatchCopySession,
): ConfirmingMobileBatchCopySession {
  return { ...session, phase: "confirming" }
}

export function moveMobileBatchCopyItem(
  session: ConfirmingMobileBatchCopySession,
  itemId: string,
  requestedIndex: number,
): ConfirmingMobileBatchCopySession {
  const currentIndex = session.items.findIndex(({ id }) => id === itemId)

  if (currentIndex < 0 || session.items.length < 2) {
    return session
  }

  const lastIndex = session.items.length - 1
  const nextIndex = Math.min(Math.max(requestedIndex, 0), lastIndex)

  if (currentIndex === nextIndex) {
    return session
  }

  const items = [...session.items]
  const [item] = items.splice(currentIndex, 1)

  if (item === undefined) {
    return session
  }

  items.splice(nextIndex, 0, item)
  return { ...session, items }
}

export function removeMobileBatchCopyItem(
  session: ConfirmingMobileBatchCopySession,
  itemId: string,
): ConfirmingMobileBatchCopySession {
  const nextItems = session.items.filter(({ id }) => id !== itemId)

  if (nextItems.length === session.items.length) {
    return session
  }

  return { ...session, items: nextItems }
}
