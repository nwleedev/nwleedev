"use client"

import {
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
  createNoteWorkspaceState,
  selectNote,
  updateNoteGeometryDraft,
  type NoteGeometryDraftField,
  type NoteWorkspaceState,
} from "./note-workspace-state"

type NoteSessionContextValue = {
  latestRemovedNote: Note | null
  workspace: NoteWorkspaceState
  activateBatchCopy(): void
  activateProperties(note: NoteReference, fields: NoteGeometryDraft): void
  changeGeometryDraft(field: NoteGeometryDraftField, value: string): void
  clearSelection(): void
  closePanel(): void
  forgetLatestRemoval(): void
  rememberRemoval(note: Note, removedAt: string): void
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

  function select(noteId: string) {
    setWorkspace((current) => selectNote(current, noteId))
  }

  function clearSelection() {
    setWorkspace(clearNoteSelection)
  }

  function activateProperties(
    note: NoteReference,
    fields: NoteGeometryDraft,
  ) {
    setWorkspace((current) =>
      activateNoteProperties(current, note, fields),
    )
  }

  function activateBatchCopy() {
    setWorkspace(activateBatchCopyPanel)
  }

  function closePanel() {
    setWorkspace(closeActivePanel)
  }

  function changeGeometryDraft(
    field: NoteGeometryDraftField,
    value: string,
  ) {
    setWorkspace((current) =>
      updateNoteGeometryDraft(current, field, value),
    )
  }

  function rememberRemoval(note: Note, removedAt: string) {
    setRemovalHistory((current) =>
      rememberRemovedNote(current, note, removedAt),
    )
  }

  function forgetLatestRemoval() {
    setRemovalHistory((current) => {
      const restored = restoreMostRecentlyRemovedNote(current)
      return restored?.history ?? current
    })
  }

  return (
    <NoteSessionContext
      value={{
        activateBatchCopy,
        activateProperties,
        changeGeometryDraft,
        clearSelection,
        closePanel,
        forgetLatestRemoval,
        latestRemovedNote,
        rememberRemoval,
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
