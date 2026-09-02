import type { Revision } from "@/shared/lib/entity-metadata"

import type { BatchCopyItem, BatchCopyList } from "./batch-copy-list"

export type RemovedBatchCopyItem = {
  index: number
  item: BatchCopyItem
  list: BatchCopyList
}

export function itemIndexForInsertionSlot(
  currentIndex: number,
  insertionSlot: number,
  itemCount: number,
) {
  const invalidCurrentIndex = currentIndex < 0 || currentIndex >= itemCount
  const invalidInsertionSlot = insertionSlot < 0 || insertionSlot > itemCount

  if (invalidCurrentIndex || invalidInsertionSlot) {
    return null
  }

  const beforeCurrentItem = insertionSlot === currentIndex
  const afterCurrentItem = insertionSlot === currentIndex + 1

  if (beforeCurrentItem || afterCurrentItem) {
    return null
  }

  return insertionSlot > currentIndex
    ? insertionSlot - 1
    : insertionSlot
}

function nextRevision(revision: Revision) {
  if (revision >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError("Batch copy revision cannot exceed the safe integer range")
  }

  return revision + 1
}

function reviseBatchCopyList(
  list: BatchCopyList,
  items: readonly BatchCopyItem[],
  updatedAt: string,
): BatchCopyList {
  return {
    ...list,
    content: { ...list.content, items: [...items] },
    revision: nextRevision(list.revision),
    updatedAt,
  }
}

export function combineBatchCopyText(list: BatchCopyList) {
  return list.content.items
    .map(({ textSnapshot }) => textSnapshot)
    .join(list.content.separator)
}

export function moveBatchCopyItem(
  list: BatchCopyList,
  itemId: string,
  requestedIndex: number,
  updatedAt: string,
) {
  const currentIndex = list.content.items.findIndex(({ id }) => id === itemId)

  if (currentIndex < 0 || list.content.items.length < 2) {
    return null
  }

  const lastIndex = list.content.items.length - 1
  const nextIndex = Math.max(0, Math.min(requestedIndex, lastIndex))

  if (currentIndex === nextIndex) {
    return null
  }

  const items = [...list.content.items]
  const [item] = items.splice(currentIndex, 1)

  if (item === undefined) {
    return null
  }

  items.splice(nextIndex, 0, item)
  return reviseBatchCopyList(list, items, updatedAt)
}

export function removeBatchCopyItem(
  list: BatchCopyList,
  itemId: string,
  updatedAt: string,
): RemovedBatchCopyItem | null {
  const index = list.content.items.findIndex(({ id }) => id === itemId)

  if (index < 0) {
    return null
  }

  const items = [...list.content.items]
  const [item] = items.splice(index, 1)

  if (item === undefined) {
    return null
  }

  return {
    index,
    item,
    list: reviseBatchCopyList(list, items, updatedAt),
  }
}

export function restoreBatchCopyItem(
  list: BatchCopyList,
  item: BatchCopyItem,
  requestedIndex: number,
  updatedAt: string,
) {
  const duplicate = list.content.items.some(({ id }) => id === item.id)

  if (duplicate) {
    return null
  }

  const nextIndex = Math.max(
    0,
    Math.min(requestedIndex, list.content.items.length),
  )
  const items = [...list.content.items]
  items.splice(nextIndex, 0, item)
  return reviseBatchCopyList(list, items, updatedAt)
}
