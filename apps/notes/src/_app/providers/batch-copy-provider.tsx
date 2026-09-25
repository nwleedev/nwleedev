"use client"

import type { PropsWithChildren } from "react"

import { AddNoteToBatchCopyProvider } from "@/features/add-note-to-batch-copy"
import { EditBatchCopyProvider } from "@/features/edit-batch-copy"

import {
  useBatchCopyState,
  type BatchCopyDependencies,
} from "./use-batch-copy-state"

export function BatchCopyProvider({
  children,
  ...dependencies
}: PropsWithChildren<BatchCopyDependencies>) {
  const { add, editorState, ready } = useBatchCopyState(dependencies)

  return (
    <AddNoteToBatchCopyProvider add={add} ready={ready}>
      <EditBatchCopyProvider value={editorState}>
        {children}
      </EditBatchCopyProvider>
    </AddNoteToBatchCopyProvider>
  )
}
