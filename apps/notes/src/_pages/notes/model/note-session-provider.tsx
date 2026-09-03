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
  type NoteReference,
} from "@/entities/note"

import {
  activateBatchCopyPanel,
  activateNoteProperties,
  clearNoteSelection,
  closeActivePanel,
  closeNoteProperties,
  confirmNotePropertiesTarget,
  createNoteWorkspaceState,
  forgetNote,
  restoreNotePropertiesTarget,
  selectNote,
  type NotePropertiesFocus,
  type NoteWorkspaceState,
} from "./note-workspace-state"

type NoteSessionContextValue = {
  latestRemovedNote: Note | null
  workspace: NoteWorkspaceState
  activateBatchCopy(): void
  activateProperties(
    note: NoteReference,
    focus?: NotePropertiesFocus,
  ): void
  clearSelection(): void
  closeProperties(noteId: string): void
  closePanel(): void
  confirmPropertiesTarget(expected: NoteReference, saved: NoteReference): void
  forgetLatestRemoval(): void
  forgetNote(noteId: string): void
  rememberRemoval(note: Note, removedAt: string): void
  restorePropertiesTarget(note: NoteReference): void
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
    focus?: NotePropertiesFocus,
  ) => {
    setWorkspace((current) =>
      activateNoteProperties(current, note, focus),
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

  const confirmPropertiesTarget = useCallback((
    expected: NoteReference,
    saved: NoteReference,
  ) => {
    setWorkspace((current) =>
      confirmNotePropertiesTarget(current, expected, saved),
    )
  }, [])

  const restorePropertiesTarget = useCallback((
    note: NoteReference,
  ) => {
    setWorkspace((current) =>
      restoreNotePropertiesTarget(current, note),
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
        clearSelection,
        closeProperties,
        closePanel,
        confirmPropertiesTarget,
        forgetLatestRemoval,
        forgetNote: forgetRemovedNoteFromWorkspace,
        latestRemovedNote,
        rememberRemoval,
        restorePropertiesTarget,
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
