"use client"

import type { PropsWithChildren } from "react"

import {
  AddNoteToBatchCopyContext,
  type AddNoteToBatchCopyContextValue,
} from "./use-add-note"

export function AddNoteToBatchCopyProvider({
  add,
  children,
  ready,
}: PropsWithChildren<AddNoteToBatchCopyContextValue>) {
  return (
    <AddNoteToBatchCopyContext value={{ add, ready }}>
      {children}
    </AddNoteToBatchCopyContext>
  )
}

export { useAddNoteToBatchCopy } from "./use-add-note"
