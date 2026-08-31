import type {
  AccumulatedTextItem,
  Accumulator,
} from "./accumulatorRecord"

export type RemovedAccumulatorItem = {
  accumulator: Accumulator
  index: number
  item: AccumulatedTextItem
}

function reviseAccumulator(
  accumulator: Accumulator,
  items: readonly AccumulatedTextItem[],
  updatedAt: string,
): Accumulator {
  return {
    ...accumulator,
    content: { ...accumulator.content, items: [...items] },
    revision: accumulator.revision + 1,
    updatedAt,
  }
}

export function combineAccumulatorText(accumulator: Accumulator) {
  return accumulator.content.items
    .map(({ textSnapshot }) => textSnapshot)
    .join(accumulator.content.separator)
}

export function moveAccumulatorItem(
  accumulator: Accumulator,
  itemId: string,
  requestedIndex: number,
  updatedAt: string,
) {
  const currentIndex = accumulator.content.items.findIndex(
    ({ id }) => id === itemId,
  )

  if (currentIndex < 0) {
    return null
  }

  const lastIndex = accumulator.content.items.length - 1
  const nextIndex = Math.max(0, Math.min(requestedIndex, lastIndex))

  if (currentIndex === nextIndex) {
    return null
  }

  const items = [...accumulator.content.items]
  const [item] = items.splice(currentIndex, 1)
  items.splice(nextIndex, 0, item)
  return reviseAccumulator(accumulator, items, updatedAt)
}

export function removeAccumulatorItem(
  accumulator: Accumulator,
  itemId: string,
  updatedAt: string,
): RemovedAccumulatorItem | null {
  const index = accumulator.content.items.findIndex(({ id }) => id === itemId)

  if (index < 0) {
    return null
  }

  const items = [...accumulator.content.items]
  const [item] = items.splice(index, 1)

  return {
    accumulator: reviseAccumulator(accumulator, items, updatedAt),
    index,
    item,
  }
}

export function restoreAccumulatorItem(
  accumulator: Accumulator,
  item: AccumulatedTextItem,
  requestedIndex: number,
  updatedAt: string,
) {
  const duplicate = accumulator.content.items.some(({ id }) => id === item.id)

  if (duplicate) {
    return null
  }

  const nextIndex = Math.max(
    0,
    Math.min(requestedIndex, accumulator.content.items.length),
  )
  const items = [...accumulator.content.items]
  items.splice(nextIndex, 0, item)
  return reviseAccumulator(accumulator, items, updatedAt)
}
