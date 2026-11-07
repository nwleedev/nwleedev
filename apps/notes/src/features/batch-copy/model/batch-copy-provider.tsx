"use client"

import { useState, type PropsWithChildren } from "react"

import { useInteractionPreferences } from "@/entities/preference/index.browser"

import { useBrowserBatchCopy } from "../api/use-browser-batch-copy"
import { BatchCopyRemovalContext, createBatchCopyRemovals } from "./batch-copy-removals"
import { AddNoteToBatchCopyContext } from "./use-add-note"
import { useBatchCopyState } from "./use-batch-copy-state"
import { EditBatchCopyContext } from "./use-editor"

export function BatchCopyProvider({ children }: PropsWithChildren) {
  const dependencies = useBrowserBatchCopy()
  const preferences = useInteractionPreferences()
  const [removals] = useState(createBatchCopyRemovals)
  const reorderButtonsEnabled = "preferences" in preferences
    ? preferences.preferences.batchCopyReorderButtonsEnabled
    : false
  const { add, editorState, ready } = useBatchCopyState({
    ...dependencies,
    onItemRemoved: removals.notify,
    reorderButtonsEnabled,
  })

  return (
    <BatchCopyRemovalContext value={removals.subscribe}>
      <AddNoteToBatchCopyContext value={{ add, ready }}>
        <EditBatchCopyContext value={editorState}>{children}</EditBatchCopyContext>
      </AddNoteToBatchCopyContext>
    </BatchCopyRemovalContext>
  )
}
