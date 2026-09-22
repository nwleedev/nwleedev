"use client"

import {
  useCallback,
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react"

import {
  createNoteRemovalHistory,
  dismissNoteRemovalHistory,
  forgetRemovedNote,
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
import type {
  WorkspaceNotice,
  WorkspaceNoticeInput,
} from "./workspace-notice"

const WORKSPACE_NOTICE_DURATION_MS = 5_000

type NoteSessionContextValue = {
  removals: readonly RemovedNoteSnapshot[]
  workspaceNotice: WorkspaceNotice | null
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
  dismissWorkspaceNotice(): void
  forgetBatchCopyItem(itemId: string): void
  forgetNote(noteId: string): void
  forgetRemoval(snapshot: RemovedNoteSnapshot): void
  rememberRemoval(note: Note, removedAt: string): void
  showWorkspaceNotice(notice: WorkspaceNoticeInput): void
  restorePropertiesTarget(note: NoteReference): void
  select(noteId: string): void
  toggleBatchCopyItem(itemId: string): void
}

type NoteSessionState = Pick<
  NoteSessionContextValue,
  "removals" | "workspace" | "workspaceNotice"
>
type NoteSessionCommands = Omit<
  NoteSessionContextValue,
  "removals" | "workspace" | "workspaceNotice"
>

const NoteSessionStateContext = createContext<NoteSessionState | null>(null)
const NoteSessionCommandsContext =
  createContext<NoteSessionCommands | null>(null)

export function NoteSessionProvider({ children }: PropsWithChildren) {
  const [workspace, setWorkspace] = useState(createNoteWorkspaceState)
  const [removalHistory, setRemovalHistory] = useState(
    createNoteRemovalHistory,
  )
  const [workspaceNotice, setWorkspaceNotice] =
    useState<WorkspaceNotice | null>(null)
  const workspaceNoticeRef = useRef<WorkspaceNotice | null>(null)
  const workspaceNoticeRevision = useRef(0)

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

  const dismissRemovalNotice = useCallback(() => {
    setRemovalHistory(dismissNoteRemovalHistory)
  }, [])

  const dismissWorkspaceNotice = useCallback(() => {
    const current = workspaceNoticeRef.current

    workspaceNoticeRef.current = null
    setWorkspaceNotice(null)
    current?.onDismiss?.()
  }, [])

  const showWorkspaceNotice = useCallback((notice: WorkspaceNoticeInput) => {
    const current = workspaceNoticeRef.current

    if (notice.replacement !== "preserve") {
      current?.onDismiss?.()
    }
    workspaceNoticeRevision.current += 1
    const nextNotice = {
      ...notice,
      expiresAtMs:
        notice.expiresAtMs ?? Date.now() + WORKSPACE_NOTICE_DURATION_MS,
      revision: workspaceNoticeRevision.current,
    }
    workspaceNoticeRef.current = nextNotice
    setWorkspaceNotice(nextNotice)
  }, [])

  const forgetRemovedNoteFromWorkspace = useCallback((noteId: string) => {
    setWorkspace((current) => forgetNote(current, noteId))
  }, [])

  const forgetBatchCopyItemFromWorkspace = useCallback((itemId: string) => {
    setWorkspace((current) => forgetBatchCopyItem(current, itemId))
  }, [])

  const state = useMemo(
    () => ({
      removals: removalHistory.entries,
      workspace,
      workspaceNotice,
    }),
    [removalHistory.entries, workspace, workspaceNotice],
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
      dismissWorkspaceNotice,
      forgetBatchCopyItem: forgetBatchCopyItemFromWorkspace,
      forgetNote: forgetRemovedNoteFromWorkspace,
      forgetRemoval,
      rememberRemoval,
      showWorkspaceNotice,
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
      dismissWorkspaceNotice,
      forgetBatchCopyItemFromWorkspace,
      forgetRemoval,
      forgetRemovedNoteFromWorkspace,
      rememberRemoval,
      showWorkspaceNotice,
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
