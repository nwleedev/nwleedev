"use client"

import { startTransition, useOptimistic, useState } from "react"

import type { BatchCopyItem } from "@/entities/batch-copy"

import type { EditBatchCopyResult } from "./edit-batch-copy"

type OptimisticChange =
  | { itemId: string; kind: "remove" }
  | { index: number; itemId: string; kind: "move" }

type EditingFailure = {
  message: string
  retry(): void
}

type UseBatchCopyEditingOptions = {
  items: readonly BatchCopyItem[]
  onDuplicate(itemId: string): Promise<EditBatchCopyResult>
  onMove(itemId: string, index: number): Promise<EditBatchCopyResult>
  onRemove(itemId: string): Promise<EditBatchCopyResult>
}

function applyOptimisticChange(
  items: readonly BatchCopyItem[],
  change: OptimisticChange,
) {
  if (change.kind === "remove") {
    return items.filter(({ id }) => id !== change.itemId)
  }

  const sourceIndex = items.findIndex(({ id }) => id === change.itemId)

  if (sourceIndex < 0 || sourceIndex === change.index) {
    return items
  }

  const moved = [...items]
  const [item] = moved.splice(sourceIndex, 1)

  if (item === undefined) {
    return items
  }

  moved.splice(change.index, 0, item)
  return moved
}

export function useBatchCopyEditing({
  items,
  onDuplicate,
  onMove,
  onRemove,
}: UseBatchCopyEditingOptions) {
  const [failure, setFailure] = useState<EditingFailure | null>(null)
  const [optimisticItems, applyOptimistic] = useOptimistic(
    items,
    applyOptimisticChange,
  )

  function move(itemId: string, index: number): Promise<boolean> {
    return new Promise((resolve) => {
      startTransition(async () => {
        applyOptimistic({ index, itemId, kind: "move" })
        const result = await onMove(itemId, index)

        if (result.status === "failure") {
          setFailure({
            message: "순서를 저장하지 못했습니다.",
            retry: () => void move(itemId, index),
          })
          resolve(false)
          return
        }

        setFailure(null)
        resolve(true)
      })
    })
  }

  function duplicate(itemId: string) {
    void onDuplicate(itemId).then((result) => {
      if (result.status === "failure") {
        setFailure({
          message: "일괄 복사 항목을 복제하지 못했습니다.",
          retry: () => duplicate(itemId),
        })
      } else {
        setFailure(null)
      }
    })
  }

  function remove(itemId: string) {
    startTransition(async () => {
      applyOptimistic({ itemId, kind: "remove" })
      const result = await onRemove(itemId)

      if (result.status === "failure") {
        setFailure({
          message: "일괄 복사 항목을 삭제하지 못했습니다.",
          retry: () => remove(itemId),
        })
      } else {
        setFailure(null)
      }
    })
  }

  return {
    duplicate,
    failure,
    items: optimisticItems,
    move,
    remove,
  }
}
