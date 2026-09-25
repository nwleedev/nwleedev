"use client"

import type { PropsWithChildren } from "react"

import { AddNoteToBatchCopyProvider } from "@/features/add-note-to-batch-copy"
import { EditBatchCopyProvider } from "@/features/edit-batch-copy"

import type { PersonalNotesDatabase } from "../composition/indexed-db/personal-notes-database"
import { useBatchCopyAdapters } from "../composition/use-batch-copy-adapters"
import {
  useBatchCopyState,
  type BatchCopyDependencies,
} from "./use-batch-copy-state"

type BatchCopyProviderProps = PropsWithChildren<
  Pick<BatchCopyDependencies, "onItemRemoved" | "reorderButtonsEnabled"> & {
    database: PersonalNotesDatabase
  }
>

export function BatchCopyProvider({
  children,
  database,
  onItemRemoved,
  reorderButtonsEnabled,
}: BatchCopyProviderProps) {
  const adapters = useBatchCopyAdapters(database)
  const { add, editorState, ready } = useBatchCopyState({
    ...adapters,
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
