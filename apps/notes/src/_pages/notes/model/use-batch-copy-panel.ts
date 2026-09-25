import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  type SyntheticEvent,
} from "react"

const INLINE_PANEL_THRESHOLD_REM = 72
export const INLINE_PANEL_ID = "workspace-side-panel"
export const MODAL_PANEL_ID = "workspace-dialog"

type BatchCopyPanelOptions = {
  activePanel: "batch-copy" | "note-properties" | null
  workspaceSelectionActive: boolean
  activateBatchCopy(): void
  clearSelections(): void
  closePanel(): void
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

export function useBatchCopyPanel({
  activePanel,
  workspaceSelectionActive,
  activateBatchCopy,
  clearSelections,
  closePanel,
}: BatchCopyPanelOptions) {
  const container = useRef<HTMLElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const dialogHeading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const switchingToInline = useRef(false)
  const inline = useInlinePanel(container)
  const open = activePanel !== null
  const batchCopyActive = activePanel === "batch-copy"
  const propertiesActive = activePanel === "note-properties"
  const showInlinePanel = open && inline
  const controlledPanelId = inline
    ? showInlinePanel ? INLINE_PANEL_ID : undefined
    : MODAL_PANEL_ID

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
      closePanel()
      return
    }

    activateBatchCopy()
  }

  function revealNewBatchCopyItem() {
    if (inline) {
      activateBatchCopy()
    }
  }

  function handleDialogClose() {
    if (switchingToInline.current) {
      switchingToInline.current = false
      return
    }

    closePanel()

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
    clearSelections()
  }

  return {
    batchCopyActive,
    container,
    controlledPanelId,
    dialog,
    dialogHeading,
    handleDialogCancel,
    handleDialogClose,
    handleDialogKeyDown,
    propertiesActive,
    revealNewBatchCopyItem,
    showInlinePanel,
    toggleBatchCopyPanel,
    trigger,
  }
}
