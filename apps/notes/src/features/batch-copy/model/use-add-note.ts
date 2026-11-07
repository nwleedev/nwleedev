import { createContext, useContext } from "react"

import type { Note } from "@/entities/note"

import type { AddNoteToBatchCopyResult } from "./add-note"

export type AddNoteToBatchCopyContextValue = {
  ready: boolean
  add(note: Note): Promise<AddNoteToBatchCopyResult>
}

export const AddNoteToBatchCopyContext =
  createContext<AddNoteToBatchCopyContextValue | null>(null)

export function useAddNoteToBatchCopy() {
  const context = useContext(AddNoteToBatchCopyContext)

  if (context === null) {
    throw new Error(
      "useAddNoteToBatchCopy must be used within AddNoteToBatchCopyProvider",
    )
  }

  return context
}
