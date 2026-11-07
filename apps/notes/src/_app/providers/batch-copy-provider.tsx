"use client"

import type { PropsWithChildren } from "react"

import { AddNoteToBatchCopyProvider } from "@/features/add-note-to-batch-copy"
import { EditBatchCopyProvider } from "@/features/edit-batch-copy"

import { useBatchCopyServices } from "../composition/use-batch-copy-services"
import {
  useBatchCopyState,
  type BatchCopyDependencies,
} from "./use-batch-copy-state"

type BatchCopyProviderProps = PropsWithChildren<
  Pick<BatchCopyDependencies, "onItemRemoved" | "reorderButtonsEnabled">
>

export function BatchCopyProvider({
  children,
  onItemRemoved,
  reorderButtonsEnabled,
}: BatchCopyProviderProps) {
  const services = useBatchCopyServices()
  const { add, editorState, ready } = useBatchCopyState({
    ...services,
    onItemRemoved,
    reorderButtonsEnabled,
  })

  return (
    <AddNoteToBatchCopyProvider add={add} ready={ready}>
      <EditBatchCopyProvider value={editorState}>
        {children}
      </EditBatchCopyProvider>
    </AddNoteToBatchCopyProvider>
  )
}
