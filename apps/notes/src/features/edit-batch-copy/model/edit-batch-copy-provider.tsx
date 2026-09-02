"use client"

import {
  createContext,
  useContext,
  type PropsWithChildren,
} from "react"

import type {
  BatchCopyItem,
  BatchCopyList,
} from "@/entities/batch-copy"

import type { CopyBatchTextResult } from "./copy-batch-text"
import type { EditBatchCopyResult } from "./edit-batch-copy"

type ReadyBatchCopyContext = {
  items: readonly BatchCopyItem[]
  list: BatchCopyList
  separator: string
  status: "ready"
}

type UnavailableBatchCopyContext = {
  status: "failure" | "loading"
}

type BatchCopyCommands = {
  canRedo: boolean
  canUndo: boolean
  pending: boolean
  copyAll(): Promise<CopyBatchTextResult>
  moveItem(itemId: string, index: number): Promise<EditBatchCopyResult>
  redo(): Promise<EditBatchCopyResult>
  removeItem(itemId: string): Promise<EditBatchCopyResult>
  retry(): void
  undo(): Promise<EditBatchCopyResult>
}

export type EditBatchCopyContextValue =
  | (ReadyBatchCopyContext & BatchCopyCommands)
  | (UnavailableBatchCopyContext & BatchCopyCommands)

const EditBatchCopyContext =
  createContext<EditBatchCopyContextValue | null>(null)

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

export function useBatchCopyEditor() {
  const context = useContext(EditBatchCopyContext)

  if (context === null) {
    throw new Error(
      "useBatchCopyEditor must be used within EditBatchCopyProvider",
    )
  }

  return context
}
