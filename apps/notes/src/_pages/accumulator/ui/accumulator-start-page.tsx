"use client"

import Link from "next/link"
import { useState } from "react"

import {
  AccumulatorEditingView,
  AccumulatorHistoryShortcuts,
  CopyAccumulatorAction,
  CopyAccumulatorNotice,
  useAccumulatedTextEditor,
  type CopyAccumulatedTextResult,
} from "@/features/edit-accumulated-text"
import { Button } from "@/shared/ui/button"

const navigationClassName =
  "inline-flex min-h-[var(--notes-control-size)] items-center justify-center rounded-control border border-line bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink transition-colors duration-[var(--notes-motion-fast)] hover:border-line-strong hover:bg-canvas"

function AccumulatorPageContent() {
  const accumulator = useAccumulatedTextEditor()

  if (accumulator.status !== "ready") {
    if (accumulator.status === "failure") {
      return (
        <section className="grid min-h-0 place-items-center overflow-auto px-4 py-8">
          <div className="grid justify-items-center gap-3 text-center">
            <p className="text-sm text-danger" role="alert">
              일괄 복사 항목을 불러오지 못했습니다.
            </p>
            <Button onClick={accumulator.retry} tone="quiet">
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

  if (accumulator.items.length === 0) {
    return (
      <section
        aria-labelledby="accumulator-empty-title"
        className="grid min-h-0 place-items-center overflow-auto px-4 py-8"
      >
        <h2 className="text-base font-semibold" id="accumulator-empty-title">
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
        <AccumulatorEditingView
          items={accumulator.items}
          onMove={accumulator.moveItem}
          onRemove={accumulator.removeItem}
          pending={accumulator.pending}
          presentation="management"
        />
      </div>
    </section>
  )
}

export function AccumulatorStartPage() {
  const accumulator = useAccumulatedTextEditor()
  const [copyResult, setCopyResult] =
    useState<CopyAccumulatedTextResult | null>(null)
  const copyDisabled =
    accumulator.status !== "ready" || accumulator.items.length === 0

  return (
    <main
      className="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-canvas"
      id="main-content"
    >
      <AccumulatorHistoryShortcuts
        canRedo={accumulator.canRedo}
        canUndo={accumulator.canUndo}
        onRedo={accumulator.redo}
        onUndo={accumulator.undo}
        pending={accumulator.pending}
      />
      <header className="border-b border-line bg-surface-raised px-4 py-3 sm:px-5">
        <h1 className="font-display text-lg font-semibold tracking-[-0.02em]">
          일괄 복사
        </h1>
      </header>
      {copyResult ? (
        <div className="absolute right-3 top-16 z-20 w-[min(24rem,calc(100%-1.5rem))] shadow-floating">
          <CopyAccumulatorNotice result={copyResult} />
        </div>
      ) : null}
      <AccumulatorPageContent />
      <footer className="flex items-start justify-between gap-3 border-t border-line bg-surface-raised px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
        <Link className={navigationClassName} href="/">
          취소
        </Link>
        <CopyAccumulatorAction
          disabled={copyDisabled || accumulator.pending}
          onCopy={accumulator.copyAll}
          onResult={setCopyResult}
        />
      </footer>
    </main>
  )
}
