import { createContext, useContext } from "react"

type RemovalListener = (itemId: string) => void
type SubscribeToRemoval = (listener: RemovalListener) => () => void

export const BatchCopyRemovalContext = createContext<SubscribeToRemoval | null>(null)

export function createBatchCopyRemovals() {
  const listeners = new Set<RemovalListener>()
  return {
    notify(itemId: string) {
      for (const listener of listeners) listener(itemId)
    },
    subscribe(listener: RemovalListener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

export function useBatchCopyRemoval() {
  const subscribe = useContext(BatchCopyRemovalContext)
  if (subscribe === null) throw new Error("BatchCopyProvider is required")
  return subscribe
}
