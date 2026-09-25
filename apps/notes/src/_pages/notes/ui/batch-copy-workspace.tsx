"use client"

import type { PropsWithChildren, RefObject } from "react"

import type { BatchCopyItem } from "@/entities/batch-copy"
import {
  BatchCopyEditingView,
  BatchCopyHistoryShortcuts,
  CopyBatchTextAction,
  type CopyBatchTextResult,
  type EditBatchCopyResult,
} from "@/features/edit-batch-copy"
import { joinClassNames } from "@/shared/lib/join-class-names"
import { ActionToast } from "@/shared/ui/action-toast"
import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { CloseIcon } from "@/shared/ui/icons"

import { NotePropertiesFormProvider } from "../model/note-properties-form-provider"
import {
  BatchCopyWorkspaceContext,
  INLINE_PANEL_ID,
  MODAL_PANEL_ID,
  useBatchCopyWorkspaceState,
} from "../model/use-batch-copy-workspace"
import { NotePropertiesPanel } from "./note-properties-panel"

type BatchCopyPanelContentProps = {
  headingId: string
  headingRef?: RefObject<HTMLHeadingElement | null>
  items: readonly BatchCopyItem[]
  pending: boolean
  reorderButtonsEnabled: boolean
  selectedItemId: string | null
  status: "failure" | "loading" | "ready"
  onClose(): void
  onCopy(): Promise<CopyBatchTextResult>
  onCopyResult(result: CopyBatchTextResult): void
  onDuplicate(itemId: string): Promise<EditBatchCopyResult>
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
  onDuplicate,
  onMove,
  onRemove,
  onRetry,
  onToggleSelection,
  pending,
  reorderButtonsEnabled,
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
              actionPresentation="popover"
              items={items}
              onDuplicate={onDuplicate}
              onMove={onMove}
              onRemove={onRemove}
              onToggleSelection={onToggleSelection}
              pending={pending}
              presentation="panel"
              reorderButtonsEnabled={reorderButtonsEnabled}
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
  const {
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
    workspaceContext,
  } = useBatchCopyWorkspaceState()
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
  const noticeClassName = joinClassNames(
    "absolute top-3 z-40 w-[min(24rem,calc(100%-1.5rem))]",
    showInlinePanel ? "right-[22.75rem]" : "right-3",
  )

  return (
    <BatchCopyWorkspaceContext value={workspaceContext}>
      <main
        className="@container/notes-workspace relative h-full min-h-0 overflow-clip"
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
              className="inline-flex min-w-8 items-center justify-center rounded-full bg-notice px-2 py-0.5 text-xs font-semibold tabular-nums text-action-ink"
            >
              {batchCopyCountText}
            </span>
          </Button>
        </div>
        {notice ? (
          <div className={noticeClassName}>
            <ActionToast
              actionLabel={notice.actionLabel}
              expiresAtMs={notice.expiresAtMs}
              kind={notice.kind}
              message={notice.message}
              onAction={notice.onAction}
              onDismiss={() => session.dismissWorkspaceNotice(notice.revision)}
              revision={notice.revision}
            />
          </div>
        ) : null}
        <div className={workspaceLayoutClassName}>
          <section
            aria-label="메모 작업 영역"
            className="h-full min-h-0 min-w-0 overflow-clip"
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
                  onCopyResult={showCopyResult}
                  onDuplicate={batchCopy.duplicateItem}
                  onMove={batchCopy.moveItem}
                  onRemove={batchCopy.removeItem}
                  onRetry={batchCopy.retry}
                  onToggleSelection={session.toggleBatchCopyItem}
                  pending={batchCopy.pending}
                  reorderButtonsEnabled={batchCopy.reorderButtonsEnabled}
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
              onCopyResult={showCopyResult}
              onDuplicate={batchCopy.duplicateItem}
              onMove={batchCopy.moveItem}
              onRemove={batchCopy.removeItem}
              onRetry={batchCopy.retry}
              onToggleSelection={session.toggleBatchCopyItem}
              pending={batchCopy.pending}
              reorderButtonsEnabled={batchCopy.reorderButtonsEnabled}
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
