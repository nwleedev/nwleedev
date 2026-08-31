"use client"

import Link from "next/link"

import { combineAccumulatorText } from "@/entities/accumulator"
import { useAccumulator } from "@/features/accumulate-note"
import {
  AccumulatorEditingView,
  AccumulatorHistoryShortcuts,
  CopyAccumulatorAction,
} from "@/features/edit-accumulated-text"
import { Button } from "@/shared/ui/button"

const navigationClassName =
  "inline-flex min-h-[var(--notes-control-size)] items-center justify-center rounded-control border border-line bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink transition-colors duration-[var(--notes-motion-fast)] hover:border-line-strong hover:bg-canvas"

function AccumulatorPageContent() {
  const accumulator = useAccumulator()

  if (accumulator.status === "loading") {
    return (
      <section className="grid min-h-0 place-items-center overflow-auto px-4 py-8">
        <p className="text-sm text-soft-ink" role="status">
          누적 텍스트 불러오는 중
        </p>
      </section>
    )
  }

  if (accumulator.status === "failure") {
    return (
      <section className="grid min-h-0 place-items-center overflow-auto px-4 py-8">
        <div className="grid justify-items-center gap-3 text-center">
          <p className="text-sm text-danger" role="alert">
            누적 텍스트를 불러오지 못했습니다.
          </p>
          <Button onClick={accumulator.retry} tone="quiet">
            다시 시도
          </Button>
        </div>
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
          누적한 텍스트가 없습니다.
        </h2>
      </section>
    )
  }

  const combinedText = combineAccumulatorText(accumulator.accumulator)

  return (
    <section
      aria-label="누적 텍스트 관리"
      className="min-h-0 overflow-auto px-4 py-5 sm:px-5"
    >
      <div className="mx-auto max-w-3xl">
        <AccumulatorEditingView
          canRedo={accumulator.canRedo}
          canUndo={accumulator.canUndo}
          combinedText={combinedText}
          items={accumulator.items}
          onMove={accumulator.moveItem}
          onRedo={accumulator.redo}
          onRemove={accumulator.removeItem}
          onUndo={accumulator.undo}
          pending={accumulator.pending}
        />
      </div>
    </section>
  )
}

export function AccumulatorStartPage() {
  const accumulator = useAccumulator()
  const copyDisabled =
    accumulator.status !== "ready" || accumulator.items.length === 0

  return (
    <main
      className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-canvas"
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
          누적 텍스트
        </h1>
      </header>
      <AccumulatorPageContent />
      <footer className="flex items-start justify-between gap-3 border-t border-line bg-surface-raised px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
        <Link className={navigationClassName} href="/">
          취소
        </Link>
        <CopyAccumulatorAction
          disabled={copyDisabled || accumulator.pending}
          onCopy={accumulator.copyAll}
        />
      </footer>
    </main>
  )
}
