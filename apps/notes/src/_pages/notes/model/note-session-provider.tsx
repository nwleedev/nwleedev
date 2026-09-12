"use client"

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react"

import {
  createNoteRemovalHistory,
  dismissNoteRemovalHistory,
  expireNoteRemoval,
  forgetRemovedNote,
  noteRemovalUndoRemainingMs,
  rememberRemovedNote,
  type Note,
  type NoteReference,
  type RemovedNoteSnapshot,
} from "@/entities/note"

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
  type NoteWorkspaceState,
} from "./note-workspace-state"

type NoteSessionContextValue = {
  latestRemoval: RemovedNoteSnapshot | null
  workspace: NoteWorkspaceState
  activateBatchCopy(): void
  activateProperties(
    note: NoteReference,
    focus?: NotePropertiesFocus,
  ): void
  clearSelection(): void
  clearSelections(): void
  closeProperties(noteId: string): void
  closePanel(): void
  confirmPropertiesTarget(expected: NoteReference, saved: NoteReference): void
  dismissRemovalNotice(): void
  expireRemoval(snapshot: RemovedNoteSnapshot): void
  forgetBatchCopyItem(itemId: string): void
  forgetNote(noteId: string): void
  forgetRemoval(snapshot: RemovedNoteSnapshot): void
  rememberRemoval(note: Note, removedAt: string): void
  restorePropertiesTarget(note: NoteReference): void
  select(noteId: string): void
  toggleBatchCopyItem(itemId: string): void
}

type NoteSessionState = Pick<
  NoteSessionContextValue,
  "latestRemoval" | "workspace"
>
type NoteSessionCommands = Omit<
  NoteSessionContextValue,
  "latestRemoval" | "workspace"
>

const NoteSessionStateContext = createContext<NoteSessionState | null>(null)
const NoteSessionCommandsContext =
  createContext<NoteSessionCommands | null>(null)

export function NoteSessionProvider({ children }: PropsWithChildren) {
  const [workspace, setWorkspace] = useState(createNoteWorkspaceState)
  const [removalHistory, setRemovalHistory] = useState(
    createNoteRemovalHistory,
  )
  const latestRemoval = removalHistory.entries.at(-1) ?? null

  useEffect(() => {
    if (latestRemoval === null) {
      return
    }

    const remainingMs = noteRemovalUndoRemainingMs(
      latestRemoval,
      Date.now(),
    )
    const expirationTimer = window.setTimeout(() => {
      setRemovalHistory((current) =>
        expireNoteRemoval(current, latestRemoval, Date.now()),
      )
    }, remainingMs)

    return () => {
      window.clearTimeout(expirationTimer)
    }
  }, [latestRemoval])

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
    setWorkspace((current) =>
      toggleBatchCopyItemSelection(current, itemId),
    )
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

  const forgetRemoval = useCallback((snapshot: RemovedNoteSnapshot) => {
    setRemovalHistory((current) => forgetRemovedNote(current, snapshot))
  }, [])

  const expireRemovalFromHistory = useCallback((
    snapshot: RemovedNoteSnapshot,
  ) => {
    setRemovalHistory((current) =>
      expireNoteRemoval(current, snapshot, Date.now()),
    )
  }, [])

  const dismissRemovalNotice = useCallback(() => {
    setRemovalHistory(dismissNoteRemovalHistory)
  }, [])

  const forgetRemovedNoteFromWorkspace = useCallback((noteId: string) => {
    setWorkspace((current) => forgetNote(current, noteId))
  }, [])

  const forgetBatchCopyItemFromWorkspace = useCallback((itemId: string) => {
    setWorkspace((current) => forgetBatchCopyItem(current, itemId))
  }, [])

  const state = useMemo(
    () => ({ latestRemoval, workspace }),
    [latestRemoval, workspace],
  )
  const commands = useMemo<NoteSessionCommands>(
    () => ({
      activateBatchCopy,
      activateProperties,
      clearSelection,
      clearSelections,
      closeProperties,
      closePanel,
      confirmPropertiesTarget,
      dismissRemovalNotice,
      expireRemoval: expireRemovalFromHistory,
      forgetBatchCopyItem: forgetBatchCopyItemFromWorkspace,
      forgetNote: forgetRemovedNoteFromWorkspace,
      forgetRemoval,
      rememberRemoval,
      restorePropertiesTarget,
      select,
      toggleBatchCopyItem,
    }),
    [
      activateBatchCopy,
      activateProperties,
      clearSelection,
      clearSelections,
      closePanel,
      closeProperties,
      confirmPropertiesTarget,
      dismissRemovalNotice,
      expireRemovalFromHistory,
      forgetBatchCopyItemFromWorkspace,
      forgetRemoval,
      forgetRemovedNoteFromWorkspace,
      rememberRemoval,
      restorePropertiesTarget,
      select,
      toggleBatchCopyItem,
    ],
  )

  return (
    <NoteSessionCommandsContext value={commands}>
      <NoteSessionStateContext value={state}>{children}</NoteSessionStateContext>
    </NoteSessionCommandsContext>
  )
}

export function useNoteSessionState() {
  const context = useContext(NoteSessionStateContext)

  if (context === null) {
    throw new Error(
      "useNoteSessionState must be used within NoteSessionProvider",
    )
  }

  return context
}

export function useNoteSessionCommands() {
  const context = useContext(NoteSessionCommandsContext)

  if (context === null) {
    throw new Error(
      "useNoteSessionCommands must be used within NoteSessionProvider",
    )
  }

  return context
}

export function useNoteSession() {
  return { ...useNoteSessionState(), ...useNoteSessionCommands() }
}
