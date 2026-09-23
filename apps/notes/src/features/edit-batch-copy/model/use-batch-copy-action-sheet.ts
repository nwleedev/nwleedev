"use client"

import { useRef, useState, type RefObject } from "react"

export function useBatchCopyActionSheet(
  itemIds: readonly string[],
  listRef: RefObject<HTMLOListElement | null>,
) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const triggers = useRef(new Map<string, HTMLButtonElement>())
  const previousPosition = useRef(0)
  const previousItemId = useRef<string | null>(null)

  function registerTrigger(itemId: string, element: HTMLButtonElement | null) {
    if (element === null) {
      triggers.current.delete(itemId)
    } else {
      triggers.current.set(itemId, element)
    }
  }

  function open(itemId: string) {
    previousPosition.current = itemIds.indexOf(itemId)
    previousItemId.current = itemId
    setActiveItemId(itemId)
  }

  function dismiss() {
    setActiveItemId(null)
  }

  function closed() {
    setActiveItemId(null)

    requestAnimationFrame(() => {
      const previousId = previousItemId.current
      const previousTrigger = previousId === null
        ? null
        : triggers.current.get(previousId)
      const nextId = itemIds[previousPosition.current]
      const previousNeighborId = itemIds[previousPosition.current - 1]
      const neighborId = nextId ?? previousNeighborId
      const neighborTrigger = neighborId === undefined
        ? null
        : triggers.current.get(neighborId)
      const target = previousTrigger?.isConnected
        ? previousTrigger
        : neighborTrigger

      if (target?.isConnected) {
        target.focus()
      } else {
        listRef.current?.focus()
      }
    })
  }

  function run(action: () => void) {
    action()
    dismiss()
  }

  return {
    activeItemId,
    closed,
    dismiss,
    open,
    registerTrigger,
    run,
  }
}
