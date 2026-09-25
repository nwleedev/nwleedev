import { createContext, useContext, useMemo } from "react"

import type { Note, NoteReference, RemovedNoteSnapshot } from "@/entities/note"

import type { NotePropertiesFocus, NoteWorkspaceState } from "./note-workspace-state"
import { useNoteRemovalHistory } from "./use-note-removal-history"
import { useNoteWorkspace } from "./use-note-workspace"
import { useWorkspaceNotice } from "./use-workspace-notice"
import type {
  WorkspaceNotice,
  WorkspaceNoticeInput,
} from "./workspace-notice"

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
  dismissWorkspaceNotice(revision?: number): void
  forgetBatchCopyItem(itemId: string): void
  forgetNote(noteId: string): void
  forgetRemoval(snapshot: RemovedNoteSnapshot): void
  rememberRemoval(note: Note): RemovedNoteSnapshot
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

export const NoteSessionStateContext = createContext<NoteSessionState | null>(null)
export const NoteSessionCommandsContext =
  createContext<NoteSessionCommands | null>(null)

export function useNoteSessionStateModel(now: () => string) {
  const workspaceModel = useNoteWorkspace()
  const removalHistory = useNoteRemovalHistory(now)
  const noticeModel = useWorkspaceNotice(now)

  const state = useMemo(
    () => ({
      removals: removalHistory.removals,
      workspace: workspaceModel.workspace,
      workspaceNotice: noticeModel.workspaceNotice,
    }),
    [removalHistory.removals, workspaceModel.workspace, noticeModel.workspaceNotice],
  )
  const commands = useMemo<NoteSessionCommands>(
    () => ({
      activateBatchCopy: workspaceModel.activateBatchCopy,
      activateProperties: workspaceModel.activateProperties,
      clearSelection: workspaceModel.clearSelection,
      clearSelections: workspaceModel.clearSelections,
      closeProperties: workspaceModel.closeProperties,
      closePanel: workspaceModel.closePanel,
      confirmPropertiesTarget: workspaceModel.confirmPropertiesTarget,
      dismissRemovalNotice: removalHistory.dismissRemovalNotice,
      dismissWorkspaceNotice: noticeModel.dismissWorkspaceNotice,
      forgetBatchCopyItem: workspaceModel.forgetBatchCopyItem,
      forgetNote: workspaceModel.forgetNote,
      forgetRemoval: removalHistory.forgetRemoval,
      rememberRemoval: removalHistory.rememberRemoval,
      showWorkspaceNotice: noticeModel.showWorkspaceNotice,
      restorePropertiesTarget: workspaceModel.restorePropertiesTarget,
      select: workspaceModel.select,
      toggleBatchCopyItem: workspaceModel.toggleBatchCopyItem,
    }),
    [
      workspaceModel.activateBatchCopy,
      workspaceModel.activateProperties,
      workspaceModel.clearSelection,
      workspaceModel.clearSelections,
      workspaceModel.closePanel,
      workspaceModel.closeProperties,
      workspaceModel.confirmPropertiesTarget,
      removalHistory.dismissRemovalNotice,
      noticeModel.dismissWorkspaceNotice,
      workspaceModel.forgetBatchCopyItem,
      removalHistory.forgetRemoval,
      workspaceModel.forgetNote,
      removalHistory.rememberRemoval,
      noticeModel.showWorkspaceNotice,
      workspaceModel.restorePropertiesTarget,
      workspaceModel.select,
      workspaceModel.toggleBatchCopyItem,
    ],
  )

  return { commands, state }
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
