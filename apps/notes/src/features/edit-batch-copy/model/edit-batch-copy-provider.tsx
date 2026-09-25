"use client"

import type { PropsWithChildren } from "react"

import {
  EditBatchCopyContext,
  type EditBatchCopyContextValue,
} from "./use-editor"

type EditBatchCopyProviderProps = PropsWithChildren<{
  value: EditBatchCopyContextValue
}>

export function EditBatchCopyProvider({
  children,
  value,
}: EditBatchCopyProviderProps) {
  return (
    <EditBatchCopyContext value={value}>
      {children}
    </EditBatchCopyContext>
  )
}

export { useBatchCopyEditor } from "./use-editor"
export type { EditBatchCopyContextValue } from "./use-editor"
