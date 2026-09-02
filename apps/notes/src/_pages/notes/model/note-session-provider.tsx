"use client"

import {
  useCallback,
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react"

import {
  createNoteRemovalHistory,
  rememberRemovedNote,
  restoreMostRecentlyRemovedNote,
  type Note,
  type NoteGeometryDraft,
  type NoteReference,
} from "@/entities/note"

import {
  activateBatchCopyPanel,
  activateNoteProperties,
  clearNoteSelection,
  closeActivePanel,
  closeNoteProperties,
  confirmNoteGeometryDraft,
  createNoteWorkspaceState,
  forgetNote,
  restoreNoteGeometryDraft,
  selectNote,
  updateNoteGeometryDraft,
  type NoteGeometryDraftField,
  type NotePropertiesFocus,
  type NoteWorkspaceState,
} from "./note-workspace-state"

type NoteSessionContextValue = {
  latestRemovedNote: Note | null
  workspace: NoteWorkspaceState
  activateBatchCopy(): void
  activateProperties(
    note: NoteReference,
    fields: NoteGeometryDraft,
    focus?: NotePropertiesFocus,
  ): void
  changeGeometryDraft(field: NoteGeometryDraftField, value: string): void
  clearSelection(): void
  closeProperties(noteId: string): void
  closePanel(): void
  confirmGeometryDraft(expected: NoteReference, saved: NoteReference): void
  forgetLatestRemoval(): void
  forgetNote(noteId: string): void
  rememberRemoval(note: Note, removedAt: string): void
  restoreGeometryDraft(note: NoteReference, fields: NoteGeometryDraft): void
  select(noteId: string): void
}

const NoteSessionContext = createContext<NoteSessionContextValue | null>(null)

export function NoteSessionProvider({ children }: PropsWithChildren) {
  const [workspace, setWorkspace] = useState(createNoteWorkspaceState)
  const [removalHistory, setRemovalHistory] = useState(
    createNoteRemovalHistory,
  )
  const latestRemovedNote =
    removalHistory.entries.at(-1)?.note ?? null

  const select = useCallback((noteId: string) => {
    setWorkspace((current) => selectNote(current, noteId))
  }, [])

  const clearSelection = useCallback(() => {
    setWorkspace(clearNoteSelection)
  }, [])

  const activateProperties = useCallback((
    note: NoteReference,
    fields: NoteGeometryDraft,
    focus?: NotePropertiesFocus,
  ) => {
    setWorkspace((current) =>
      activateNoteProperties(current, note, fields, focus),
    )
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

  const confirmGeometryDraft = useCallback((
    expected: NoteReference,
    saved: NoteReference,
  ) => {
    setWorkspace((current) =>
      confirmNoteGeometryDraft(current, expected, saved),
    )
  }, [])

  const restoreGeometryDraft = useCallback((
    note: NoteReference,
    fields: NoteGeometryDraft,
  ) => {
    setWorkspace((current) =>
      restoreNoteGeometryDraft(current, note, fields),
    )
  }, [])

  const changeGeometryDraft = useCallback((
    field: NoteGeometryDraftField,
    value: string,
  ) => {
    setWorkspace((current) =>
      updateNoteGeometryDraft(current, field, value),
    )
  }, [])

  const rememberRemoval = useCallback((note: Note, removedAt: string) => {
    setRemovalHistory((current) =>
      rememberRemovedNote(current, note, removedAt),
    )
  }, [])

  const forgetLatestRemoval = useCallback(() => {
    setRemovalHistory((current) => {
      const restored = restoreMostRecentlyRemovedNote(current)
      return restored?.history ?? current
    })
  }, [])

  const forgetRemovedNoteFromWorkspace = useCallback((noteId: string) => {
    setWorkspace((current) => forgetNote(current, noteId))
  }, [])

  return (
    <NoteSessionContext
      value={{
        activateBatchCopy,
        activateProperties,
        changeGeometryDraft,
        clearSelection,
        closeProperties,
        closePanel,
        confirmGeometryDraft,
        forgetLatestRemoval,
        forgetNote: forgetRemovedNoteFromWorkspace,
        latestRemovedNote,
        rememberRemoval,
        restoreGeometryDraft,
        select,
        workspace,
      }}
    >
      {children}
    </NoteSessionContext>
  )
}

export function useNoteSession() {
  const context = useContext(NoteSessionContext)

  if (context === null) {
    throw new Error("useNoteSession must be used within NoteSessionProvider")
  }

  return context
}
