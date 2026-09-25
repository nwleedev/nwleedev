import { useCallback, useState } from "react"

import type { NoteReference } from "@/entities/note"

import {
  activateBatchCopyPanel,
  activateNoteProperties,
  clearNoteSelection,
  clearWorkspaceSelections,
  closeActivePanel,
  closeNoteProperties,
  confirmNotePropertiesTarget,
  createNoteWorkspaceState,
  forgetBatchCopyItem,
  forgetNote,
  restoreNotePropertiesTarget,
  selectNote,
  toggleBatchCopyItemSelection,
  type NotePropertiesFocus,
} from "./note-workspace-state"

export function useNoteWorkspace() {
  const [workspace, setWorkspace] = useState(createNoteWorkspaceState)

  const select = useCallback((noteId: string) => {
    setWorkspace((current) => selectNote(current, noteId))
  }, [])

  const clearSelection = useCallback(() => {
    setWorkspace(clearNoteSelection)
  }, [])

  const clearSelections = useCallback(() => {
    setWorkspace(clearWorkspaceSelections)
  }, [])

  const toggleBatchCopyItem = useCallback((itemId: string) => {
    setWorkspace((current) => toggleBatchCopyItemSelection(current, itemId))
  }, [])

  const activateProperties = useCallback((
    note: NoteReference,
    focus?: NotePropertiesFocus,
  ) => {
    setWorkspace((current) => activateNoteProperties(current, note, focus))
  }, [])

  const activateBatchCopy = useCallback(() => {
    setWorkspace(activateBatchCopyPanel)
  }, [])

  const closePanel = useCallback(() => {
    setWorkspace(closeActivePanel)
  }, [])

  const closeProperties = useCallback((noteId: string) => {
    setWorkspace((current) => closeNoteProperties(current, noteId))
  }, [])

  const confirmPropertiesTarget = useCallback((
    expected: NoteReference,
    saved: NoteReference,
  ) => {
    setWorkspace((current) =>
      confirmNotePropertiesTarget(current, expected, saved),
    )
  }, [])

  const restorePropertiesTarget = useCallback((note: NoteReference) => {
    setWorkspace((current) => restoreNotePropertiesTarget(current, note))
  }, [])

  const forgetNoteFromWorkspace = useCallback((noteId: string) => {
    setWorkspace((current) => forgetNote(current, noteId))
  }, [])

  const forgetBatchCopyItemFromWorkspace = useCallback((itemId: string) => {
    setWorkspace((current) => forgetBatchCopyItem(current, itemId))
  }, [])

  return {
    workspace,
    activateBatchCopy,
    activateProperties,
    clearSelection,
    clearSelections,
    closeProperties,
    closePanel,
    confirmPropertiesTarget,
    forgetBatchCopyItem: forgetBatchCopyItemFromWorkspace,
    forgetNote: forgetNoteFromWorkspace,
    restorePropertiesTarget,
    select,
    toggleBatchCopyItem,
  }
}
