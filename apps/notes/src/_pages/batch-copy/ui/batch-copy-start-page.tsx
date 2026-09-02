"use client"

import Link from "next/link"
import { useState } from "react"

import {
  BatchCopyEditingView,
  BatchCopyHistoryShortcuts,
  CopyBatchTextAction,
  CopyBatchTextNotice,
  useBatchCopyEditor,
  type CopyBatchTextResult,
} from "@/features/edit-batch-copy"
import { Button } from "@/shared/ui/button"

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

  if (batchCopy.items.length === 0) {
    return (
      <section
        aria-labelledby="batch-copy-empty-title"
        className="grid min-h-0 place-items-center overflow-auto px-4 py-8"
      >
        <h2 className="text-base font-semibold" id="batch-copy-empty-title">
          일괄 복사 항목이 없습니다.
        </h2>
      </section>
    )
  }

  return (
    <section
      aria-label="일괄 복사 항목 관리"
      className="min-h-0 overflow-auto px-4 py-5 sm:px-5"
    >
      <div className="mx-auto max-w-3xl">
        <BatchCopyEditingView
          items={batchCopy.items}
          onMove={batchCopy.moveItem}
          onRemove={batchCopy.removeItem}
          pending={batchCopy.pending}
          presentation="management"
        />
      </div>
    </section>
  )
}

export function BatchCopyStartPage() {
  const batchCopy = useBatchCopyEditor()
  const [copyResult, setCopyResult] =
    useState<CopyBatchTextResult | null>(null)
  const copyDisabled =
    batchCopy.status !== "ready" || batchCopy.items.length === 0

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
        <h1 className="font-display text-lg font-semibold tracking-[-0.02em]">
          일괄 복사
        </h1>
      </header>
      {copyResult ? (
        <div className="absolute right-3 top-16 z-20 w-[min(24rem,calc(100%-1.5rem))] shadow-floating">
          <CopyBatchTextNotice
            onDismiss={() => setCopyResult(null)}
            result={copyResult}
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
          onResult={setCopyResult}
        />
      </footer>
    </main>
  )
}
