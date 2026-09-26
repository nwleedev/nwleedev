import { createContext, useContext } from "react"

import {
  useBatchCopyEditor,
  useCopyBatchTextFeedback,
} from "@/features/edit-batch-copy"

import { useBatchCopyPanel } from "./use-batch-copy-panel"
import { useNoteSession } from "./use-note-session-state"

export { INLINE_PANEL_ID, MODAL_PANEL_ID } from "./use-batch-copy-panel"

type BatchCopyWorkspaceContextValue = {
  revealNewBatchCopyItem(): void
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
  const showCopyResult = useCopyBatchTextFeedback(batchCopy.copyAll)

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
    propertiesActive: panel.propertiesActive,
    selectedBatchCopyItemId,
    session,
    showCopyResult,
    showInlinePanel: panel.showInlinePanel,
    toggleBatchCopyPanel: panel.toggleBatchCopyPanel,
    trigger: panel.trigger,
    workspaceContext: {
      revealNewBatchCopyItem: panel.revealNewBatchCopyItem,
    },
  }
}
