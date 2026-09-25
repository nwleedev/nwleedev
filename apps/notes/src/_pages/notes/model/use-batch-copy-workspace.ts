import { createContext, useContext } from "react"

import { useBatchCopyEditor } from "@/features/edit-batch-copy"

import { useBatchCopyFeedback } from "./use-batch-copy-feedback"
import { useBatchCopyPanel } from "./use-batch-copy-panel"
import { useNoteSession } from "./use-note-session-state"
import type { WorkspaceNoticeInput } from "./workspace-notice"

export { INLINE_PANEL_ID, MODAL_PANEL_ID } from "./use-batch-copy-panel"

type BatchCopyWorkspaceContextValue = {
  revealNewBatchCopyItem(): void
  dismissNotice(): void
  showNotice(notice: WorkspaceNoticeInput): void
}

export const BatchCopyWorkspaceContext =
  createContext<BatchCopyWorkspaceContextValue | null>(null)

export function useBatchCopyWorkspace() {
  const context = useContext(BatchCopyWorkspaceContext)

  if (context === null) {
    throw new Error(
      "useBatchCopyWorkspace must be used within BatchCopyWorkspace",
    )
  }

  return context
}

export function useBatchCopyWorkspaceState() {
  const batchCopy = useBatchCopyEditor()
  const session = useNoteSession()
  const batchCopyItems = batchCopy.status === "ready" ? batchCopy.items : []
  const batchCopyCountText = `${batchCopyItems.length.toLocaleString("ko-KR")}개`
  const notice = session.workspaceNotice
  const selectedBatchCopyItemId = session.workspace.selectedBatchCopyItemId
  const workspaceSelectionActive =
    selectedBatchCopyItemId !== null || session.workspace.selectedNoteId !== null
  const panel = useBatchCopyPanel({
    activePanel: session.workspace.activePanel,
    workspaceSelectionActive,
    activateBatchCopy: session.activateBatchCopy,
    clearSelections: session.clearSelections,
    closePanel: session.closePanel,
  })
  const showCopyResult = useBatchCopyFeedback(
    batchCopy.copyAll,
    session.showWorkspaceNotice,
  )

  return {
    batchCopy,
    batchCopyActive: panel.batchCopyActive,
    batchCopyCountText,
    batchCopyItems,
    container: panel.container,
    controlledPanelId: panel.controlledPanelId,
    dialog: panel.dialog,
    dialogHeading: panel.dialogHeading,
    handleDialogCancel: panel.handleDialogCancel,
    handleDialogClose: panel.handleDialogClose,
    handleDialogKeyDown: panel.handleDialogKeyDown,
    notice,
    propertiesActive: panel.propertiesActive,
    selectedBatchCopyItemId,
    session,
    showCopyResult,
    showInlinePanel: panel.showInlinePanel,
    toggleBatchCopyPanel: panel.toggleBatchCopyPanel,
    trigger: panel.trigger,
    workspaceContext: {
      dismissNotice: session.dismissWorkspaceNotice,
      revealNewBatchCopyItem: panel.revealNewBatchCopyItem,
      showNotice: session.showWorkspaceNotice,
    },
  }
}
