"use client"

import type { PropsWithChildren } from "react"

import { AddNoteToBatchCopyProvider } from "@/features/add-note-to-batch-copy"
import { EditBatchCopyProvider } from "@/features/edit-batch-copy"

import type { PersonalNotesDatabase } from "../composition/indexed-db/personal-notes-database"
import { useBatchCopyServices } from "../composition/use-batch-copy-services"
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
  const services = useBatchCopyServices(database)
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
