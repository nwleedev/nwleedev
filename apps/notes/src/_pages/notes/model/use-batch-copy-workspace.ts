import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  type SyntheticEvent,
} from "react"

import {
  useBatchCopyEditor,
  type CopyBatchTextResult,
} from "@/features/edit-batch-copy"
import { clipboardWriteFailureMessage } from "@/shared/lib/clipboard"

import { useNoteSession } from "./use-note-session-state"
import type { WorkspaceNoticeInput } from "./workspace-notice"

const INLINE_PANEL_THRESHOLD_REM = 72
export const INLINE_PANEL_ID = "workspace-side-panel"
export const MODAL_PANEL_ID = "workspace-dialog"

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

function canUseInlinePanel(element: HTMLElement | null) {
  if (element === null) {
    return false
  }

  const rootFontSize = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  )

  return element.clientWidth >= INLINE_PANEL_THRESHOLD_REM * rootFontSize
}

function useInlinePanel(container: RefObject<HTMLElement | null>) {
  const [inline, setInline] = useState(false)

  useEffect(() => {
    const element = container.current

    if (element === null || typeof ResizeObserver === "undefined") {
      return
    }

    const observer = new ResizeObserver(() => {
      setInline(canUseInlinePanel(element))
    })
    observer.observe(element)

    return () => observer.disconnect()
  }, [container])

  return inline
}

export function useBatchCopyWorkspaceState() {
  const batchCopy = useBatchCopyEditor()
  const session = useNoteSession()
  const batchCopyItems = batchCopy.status === "ready" ? batchCopy.items : []
  const batchCopyCountText = `${batchCopyItems.length.toLocaleString("ko-KR")}개`
  const notice = session.workspaceNotice
  const container = useRef<HTMLElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const dialogHeading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const switchingToInline = useRef(false)
  const inline = useInlinePanel(container)
  const activePanel = session.workspace.activePanel
  const selectedBatchCopyItemId = session.workspace.selectedBatchCopyItemId
  const workspaceSelectionActive =
    selectedBatchCopyItemId !== null || session.workspace.selectedNoteId !== null
  const open = activePanel !== null
  const batchCopyActive = activePanel === "batch-copy"
  const propertiesActive = activePanel === "note-properties"
  const showInlinePanel = open && inline
  const controlledPanelId = inline
    ? showInlinePanel ? INLINE_PANEL_ID : undefined
    : MODAL_PANEL_ID

  function showCopyResult(result: CopyBatchTextResult) {
    if (result.status === "copied") {
      session.showWorkspaceNotice({ message: "복사했습니다." })
      return
    }

    session.showWorkspaceNotice({
      actionLabel: "다시 시도",
      kind: "error",
      message: clipboardWriteFailureMessage(result.reason),
      onAction: retryCopyWithoutWaiting,
    })
  }

  useEffect(() => {
    const element = dialog.current

    if (element === null) {
      return
    }

    if (open && !inline && !element.open) {
      element.showModal()

      if (batchCopyActive) {
        dialogHeading.current?.focus()
      }

      return
    }

    if (element.open && (!open || inline)) {
      switchingToInline.current = open && inline
      element.close()
    }
  }, [batchCopyActive, inline, open])

  function toggleBatchCopyPanel() {
    if (batchCopyActive) {
      session.closePanel()
      return
    }

    session.activateBatchCopy()
  }

  function revealNewBatchCopyItem() {
    if (inline) {
      session.activateBatchCopy()
    }
  }

  async function retryCopy() {
    try {
      showCopyResult(await batchCopy.copyAll())
    } catch {
      showCopyResult({
        reason: "write-failed",
        status: "clipboard-failure",
      })
    }
  }

  function retryCopyWithoutWaiting() {
    void retryCopy()
  }

  function handleDialogClose() {
    if (switchingToInline.current) {
      switchingToInline.current = false
      return
    }

    session.closePanel()

    if (batchCopyActive) {
      trigger.current?.focus()
    }
  }

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      event.stopPropagation()
    }
  }

  function handleDialogCancel(event: SyntheticEvent<HTMLDialogElement>) {
    if (!workspaceSelectionActive) {
      return
    }

    event.preventDefault()
    session.clearSelections()
  }

  return {
    batchCopy,
    batchCopyActive,
    batchCopyCountText,
    batchCopyItems,
    container,
    controlledPanelId,
    dialog,
    dialogHeading,
    handleDialogCancel,
    handleDialogClose,
    handleDialogKeyDown,
    notice,
    propertiesActive,
    selectedBatchCopyItemId,
    session,
    showCopyResult,
    showInlinePanel,
    toggleBatchCopyPanel,
    trigger,
    workspaceContext: {
      dismissNotice: session.dismissWorkspaceNotice,
      revealNewBatchCopyItem,
      showNotice: session.showWorkspaceNotice,
    },
  }
}
