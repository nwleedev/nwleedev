"use client"

import Link from "next/link"
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  type SyntheticEvent,
} from "react"

import type { BatchCopyItem } from "@/entities/batch-copy"
import { useMobileBatchCopy } from "@/features/add-note-to-batch-copy"
import {
  BatchCopyEditingView,
  BatchCopyHistoryShortcuts,
  CopyBatchTextAction,
  CopyBatchTextNotice,
  useBatchCopyEditor,
  type CopyBatchTextResult,
  type EditBatchCopyResult,
} from "@/features/edit-batch-copy"
import { joinClassNames } from "@/shared/lib/join-class-names"
import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { CloseIcon } from "@/shared/ui/icons"

import { useNoteSession } from "../model/note-session-provider"
import { NotePropertiesFormProvider } from "../model/note-properties-form-provider"
import { NotePropertiesPanel } from "./note-properties-panel"

const INLINE_PANEL_THRESHOLD_REM = 72
const INLINE_PANEL_ID = "workspace-side-panel"
const MODAL_PANEL_ID = "workspace-dialog"

type BatchCopyWorkspaceContextValue = {
  revealNewBatchCopyItem(): void
}

const BatchCopyWorkspaceContext =
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

type BatchCopyPanelContentProps = {
  headingId: string
  headingRef?: RefObject<HTMLHeadingElement | null>
  items: readonly BatchCopyItem[]
  pending: boolean
  selectedItemId: string | null
  status: "failure" | "loading" | "ready"
  onClose(): void
  onCopy(): Promise<CopyBatchTextResult>
  onCopyResult(result: CopyBatchTextResult): void
  onMove(itemId: string, index: number): Promise<EditBatchCopyResult>
  onRemove(itemId: string): Promise<EditBatchCopyResult>
  onRetry(): void
  onToggleSelection(itemId: string): void
}

type EmptyBatchCopyContentProps = {
  status: "failure" | "loading" | "ready"
  onRetry(): void
}

function EmptyBatchCopyContent({
  onRetry,
  status,
}: EmptyBatchCopyContentProps) {
  if (status === "failure") {
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-6 text-center">
        <div className="grid justify-items-center gap-3">
          <p className="text-sm leading-6 text-danger">
            일괄 복사 항목을 불러오지 못했습니다.
          </p>
          <Button onClick={onRetry} tone="quiet">
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  const message =
    status === "loading"
      ? "일괄 복사 항목 불러오는 중"
      : "일괄 복사 항목이 없습니다."

  return (
    <div className="grid min-h-0 flex-1 place-items-center p-6 text-center">
      <p className="text-sm leading-6 text-soft-ink">{message}</p>
    </div>
  )
}

function BatchCopyPanelContent({
  headingId,
  headingRef,
  items,
  onClose,
  onCopy,
  onCopyResult,
  onMove,
  onRemove,
  onRetry,
  onToggleSelection,
  pending,
  selectedItemId,
  status,
}: BatchCopyPanelContentProps) {
  return (
    <div
      className="flex h-full min-h-0 flex-col bg-surface-raised"
      data-batch-copy-panel-boundary
    >
      <header className="flex h-[2.375rem] shrink-0 items-center justify-between gap-3 border-b border-line px-3">
        <h2
          className="text-sm font-semibold tracking-[-0.01em]"
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
        >
          일괄 복사
        </h2>
        <IconButton
          aria-label="일괄 복사 패널 닫기"
          onClick={onClose}
          size="compact"
        >
          <CloseIcon />
        </IconButton>
      </header>
      {items.length === 0 ? (
        <EmptyBatchCopyContent onRetry={onRetry} status={status} />
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <BatchCopyEditingView
              items={items}
              onMove={onMove}
              onRemove={onRemove}
              onToggleSelection={onToggleSelection}
              pending={pending}
              presentation="panel"
              selectedItemId={selectedItemId}
            />
          </div>
          <div className="flex shrink-0 justify-end border-t border-line p-3">
            <CopyBatchTextAction
              disabled={pending}
              onCopy={onCopy}
              onResult={onCopyResult}
            />
          </div>
        </>
      )}
    </div>
  )
}

function BatchCopyWorkspaceContent({ children }: PropsWithChildren) {
  const batchCopy = useBatchCopyEditor()
  const mobileBatchCopy = useMobileBatchCopy()
  const session = useNoteSession()
  const batchCopyItems = batchCopy.status === "ready" ? batchCopy.items : []
  const batchCopyCount = batchCopyItems.length
  const batchCopyCountText = `${batchCopyCount.toLocaleString("ko-KR")}개`
  const [copyResult, setCopyResult] =
    useState<CopyBatchTextResult | null>(null)
  const container = useRef<HTMLElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const dialogHeading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const switchingToInline = useRef(false)
  const inline = useInlinePanel(container)
  const activePanel = session.workspace.activePanel
  const selectedBatchCopyItemId =
    session.workspace.selectedBatchCopyItemId
  const batchCopyItemSelected = selectedBatchCopyItemId !== null
  const noteSelected = session.workspace.selectedNoteId !== null
  const workspaceSelectionActive = batchCopyItemSelected || noteSelected
  const open = activePanel !== null
  const batchCopyActive = activePanel === "batch-copy"
  const propertiesActive = activePanel === "note-properties"
  const mobileBatchCopyActive =
    mobileBatchCopy.status === "ready" && mobileBatchCopy.draft !== null
  const showInlinePanel = open && inline
  const workspaceLayoutClassName = joinClassNames(
    "h-full min-h-0",
    showInlinePanel ? "grid grid-cols-[minmax(0,1fr)_22rem]" : "block",
  )
  const batchCopyTriggerClassName = joinClassNames(
    "shadow-floating",
    batchCopyActive && showInlinePanel ? "invisible" : undefined,
  )
  const batchCopyTriggerPositionClassName = joinClassNames(
    "absolute top-3 z-20 hidden @3xl/notes-workspace:block",
    showInlinePanel ? "right-[22.75rem]" : "right-3 sm:right-4",
  )
  const copyNoticeClassName = joinClassNames(
    "absolute top-3 z-40 w-[min(24rem,calc(100%-1.5rem))]",
    showInlinePanel ? "right-[22.75rem]" : "right-3",
  )
  let controlledPanelId: string | undefined = MODAL_PANEL_ID

  if (inline) {
    controlledPanelId = showInlinePanel ? INLINE_PANEL_ID : undefined
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
      setCopyResult(await batchCopy.copyAll())
    } catch {
      setCopyResult({
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

  function handleDialogKeyDown(
    event: ReactKeyboardEvent<HTMLDialogElement>,
  ) {
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

  return (
    <BatchCopyWorkspaceContext value={{ revealNewBatchCopyItem }}>
      <main
        className="@container/notes-workspace relative h-full min-h-0 overflow-hidden"
        id="main-content"
        ref={container}
      >
        <BatchCopyHistoryShortcuts
          canRedo={batchCopy.canRedo}
          canUndo={batchCopy.canUndo}
          onRedo={batchCopy.redo}
          onUndo={batchCopy.undo}
          pending={batchCopy.pending}
        />
        <div className={batchCopyTriggerPositionClassName}>
          <Button
            aria-label={`일괄 복사 ${batchCopyCountText}`}
            aria-controls={controlledPanelId}
            aria-expanded={batchCopyActive}
            className={batchCopyTriggerClassName}
            onClick={toggleBatchCopyPanel}
            ref={trigger}
            tabIndex={101}
            tone="quiet"
          >
            <span>일괄 복사</span>
            <span
              aria-hidden="true"
              className="inline-flex min-w-8 items-center justify-center rounded-full bg-rail px-2 py-0.5 text-xs font-semibold tabular-nums text-rail-ink"
            >
              {batchCopyCountText}
            </span>
          </Button>
        </div>
        {batchCopyCount > 0 && !mobileBatchCopyActive ? (
          <Link
            aria-label={`일괄 복사 ${batchCopyCountText} 관리`}
            className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-3 z-30 inline-flex min-h-12 items-center gap-2 rounded-full border border-action bg-action px-4 py-2 text-sm font-semibold text-action-ink shadow-floating @3xl/notes-workspace:hidden"
            href="/batch-copy/"
          >
            <span>일괄 복사</span>
            <span aria-hidden="true" className="min-w-6 text-center tabular-nums">
              {batchCopyCountText}
            </span>
          </Link>
        ) : null}
        {copyResult ? (
          <div className={copyNoticeClassName}>
            <CopyBatchTextNotice
              onDismiss={() => setCopyResult(null)}
              onRetry={retryCopyWithoutWaiting}
              result={copyResult}
            />
          </div>
        ) : null}
        <div className={workspaceLayoutClassName}>
          <section
            aria-label="메모 작업 영역"
            className="h-full min-h-0 min-w-0 overflow-hidden"
          >
            {children}
          </section>
          {showInlinePanel ? (
            <div
              aria-label={batchCopyActive ? "일괄 복사" : undefined}
              className="h-full min-h-0 overflow-hidden border-l border-line bg-surface-raised shadow-floating"
              id={INLINE_PANEL_ID}
              role={batchCopyActive ? "complementary" : undefined}
            >
              {batchCopyActive ? (
                <BatchCopyPanelContent
                  headingId="batch-copy-inline-title"
                  items={batchCopyItems}
                  onClose={session.closePanel}
                  onCopy={batchCopy.copyAll}
                  onCopyResult={setCopyResult}
                  onMove={batchCopy.moveItem}
                  onRemove={batchCopy.removeItem}
                  onRetry={batchCopy.retry}
                  onToggleSelection={session.toggleBatchCopyItem}
                  pending={batchCopy.pending}
                  selectedItemId={selectedBatchCopyItemId}
                  status={batchCopy.status}
                />
              ) : null}
              {propertiesActive ? <NotePropertiesPanel /> : null}
            </div>
          ) : null}
        </div>
        <dialog
          aria-label={propertiesActive ? "메모 속성" : "일괄 복사"}
          className="m-auto h-[min(42rem,calc(100dvh-2rem))] w-[min(32rem,calc(100vw-2rem))] max-w-none overflow-visible rounded-panel border border-line bg-surface-raised p-0 text-ink shadow-floating"
          id={MODAL_PANEL_ID}
          onCancel={handleDialogCancel}
          onClose={handleDialogClose}
          onKeyDown={handleDialogKeyDown}
          ref={dialog}
        >
          {batchCopyActive ? (
            <BatchCopyPanelContent
              headingId="batch-copy-dialog-title"
              headingRef={dialogHeading}
              items={batchCopyItems}
              onClose={session.closePanel}
              onCopy={batchCopy.copyAll}
              onCopyResult={setCopyResult}
              onMove={batchCopy.moveItem}
              onRemove={batchCopy.removeItem}
              onRetry={batchCopy.retry}
              onToggleSelection={session.toggleBatchCopyItem}
              pending={batchCopy.pending}
              selectedItemId={selectedBatchCopyItemId}
              status={batchCopy.status}
            />
          ) : null}
          {propertiesActive && !showInlinePanel ? (
            <NotePropertiesPanel />
          ) : null}
        </dialog>
      </main>
    </BatchCopyWorkspaceContext>
  )
}

export function BatchCopyWorkspace({ children }: PropsWithChildren) {
  return (
    <NotePropertiesFormProvider>
      <BatchCopyWorkspaceContent>{children}</BatchCopyWorkspaceContent>
    </NotePropertiesFormProvider>
  )
}
