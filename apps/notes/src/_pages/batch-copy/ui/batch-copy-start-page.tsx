"use client"

import Link from "next/link"

import {
  BatchCopyEditingView,
  BatchCopyHistoryShortcuts,
  CopyBatchTextAction,
  CopyBatchTextNotice,
  useBatchCopyEditor,
} from "@/features/edit-batch-copy"
import { Button } from "@/shared/ui/button"

import { useBatchCopyActionPresentation } from "../model/use-batch-copy-action-presentation"
import { useBatchCopyPage } from "../model/use-batch-copy-page"
import { MobileBatchCopyConfirmation } from "./mobile-batch-copy-confirmation"

const navigationClassName =
  "inline-flex min-h-[var(--notes-control-size)] items-center justify-center rounded-control border border-line bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink transition-colors duration-[var(--notes-motion-fast)] hover:border-line-strong hover:bg-canvas"

function BatchCopyPageContent() {
  const batchCopy = useBatchCopyEditor()

  if (batchCopy.status !== "ready") {
    if (batchCopy.status === "failure") {
      return (
        <section className="grid min-h-0 place-items-center overflow-auto px-4 py-8">
          <div className="grid justify-items-center gap-3 text-center">
            <p className="text-sm text-danger" role="alert">
              일괄 복사 항목을 불러오지 못했습니다.
            </p>
            <Button onClick={batchCopy.retry} tone="quiet">
              다시 시도
            </Button>
          </div>
        </section>
      )
    }

    return (
      <section className="grid min-h-0 place-items-center overflow-auto px-4 py-8">
        <p className="text-sm text-soft-ink" role="status">
          일괄 복사 항목 불러오는 중
        </p>
      </section>
    )
  }

  return (
    <section
      aria-label="일괄 복사 항목 관리"
      className="min-h-0 overflow-auto px-4 py-5 sm:px-5"
    >
      {batchCopy.items.length === 0 ? (
        <h2 className="grid min-h-40 place-items-center text-base font-semibold">
          일괄 복사 항목이 없습니다.
        </h2>
      ) : null}
      <BatchCopyManagement
        items={batchCopy.items}
        onDuplicate={batchCopy.duplicateItem}
        onMove={batchCopy.moveItem}
        onRemove={batchCopy.removeItem}
        pending={batchCopy.pending}
        reorderButtonsEnabled={batchCopy.reorderButtonsEnabled}
      />
    </section>
  )
}

type BatchCopyManagementProps = Pick<
  Parameters<typeof BatchCopyEditingView>[0],
  "items" | "onDuplicate" | "onMove" | "onRemove" | "pending" | "reorderButtonsEnabled"
>

function BatchCopyManagement(props: BatchCopyManagementProps) {
  const { container, presentation } = useBatchCopyActionPresentation()

  return (
    <div className="mx-auto max-w-3xl" ref={container}>
      <BatchCopyEditingView
        {...props}
        actionPresentation={presentation}
        presentation="management"
      />
    </div>
  )
}

export function BatchCopyStartPage() {
  const {
    batchCopy,
    copyNotice,
    dismissCopyNotice,
    mobileDraft,
    returningConfirmation,
    returnToCollection,
    routePending,
    retryCopy,
    showCopyResult,
  } = useBatchCopyPage()
  const copyDisabled =
    batchCopy.status !== "ready" || batchCopy.items.length === 0

  if (routePending) {
    return (
      <main
        className="grid h-full min-h-0 place-items-center bg-canvas"
        id="main-content"
      >
        <p className="text-sm text-soft-ink" role="status">
          일괄 복사 화면 확인 중
        </p>
      </main>
    )
  }

  const mobileConfirmation =
    mobileDraft?.step === "confirming"
      ? { ...mobileDraft, step: "confirming" as const }
      : null
  const confirmingDraft = returningConfirmation ?? mobileConfirmation

  if (confirmingDraft !== null) {
    return (
      <MobileBatchCopyConfirmation
        draft={confirmingDraft}
        onReturnToCollection={returnToCollection}
      />
    )
  }

  return (
    <main
      className="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-canvas"
      id="main-content"
    >
      <BatchCopyHistoryShortcuts
        canRedo={batchCopy.canRedo}
        canUndo={batchCopy.canUndo}
        onRedo={batchCopy.redo}
        onUndo={batchCopy.undo}
        pending={batchCopy.pending}
      />
      <header className="border-b border-line bg-surface-raised px-4 py-3 sm:px-5">
        <h1 className="text-lg font-semibold tracking-[-0.02em]">
          일괄 복사
        </h1>
      </header>
      {copyNotice ? (
        <div className="absolute right-3 top-16 z-20 w-[min(24rem,calc(100%-1.5rem))] shadow-floating">
          <CopyBatchTextNotice
            onDismiss={dismissCopyNotice}
            onRetry={retryCopy}
            result={copyNotice.result}
            revision={copyNotice.revision}
          />
        </div>
      ) : null}
      <BatchCopyPageContent />
      <footer className="flex items-start justify-between gap-3 border-t border-line bg-surface-raised px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
        <Link className={navigationClassName} href="/">
          취소
        </Link>
        <CopyBatchTextAction
          disabled={copyDisabled || batchCopy.pending}
          onCopy={batchCopy.copyAll}
          onResult={showCopyResult}
        />
      </footer>
    </main>
  )
}
