"use client"

import type { MobileBatchCopyDraft } from "@/entities/batch-copy"
import { CopyBatchTextAction } from "@/features/batch-copy/index.browser"
import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { NavigateBackIcon } from "@/shared/ui/icons"

import {
  useMobileBatchCopyConfirmation,
} from "../model/use-mobile-batch-copy-confirmation"
import { MobileBatchCopyConfirmationList } from "./mobile-batch-copy-confirmation-list"

type MobileBatchCopyConfirmationProps = {
  draft: MobileBatchCopyDraft
  onReturnToNotes(): Promise<boolean>
}

export function MobileBatchCopyConfirmation({
  draft,
  onReturnToNotes,
}: MobileBatchCopyConfirmationProps) {
  const confirmation = useMobileBatchCopyConfirmation(
    draft,
    onReturnToNotes,
  )

  return (
    <main
      className="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-canvas"
      id="main-content"
    >
      <header className="grid min-h-14 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-line bg-surface-raised px-3 py-2 max-md:min-h-[var(--notes-mobile-page-header-height)] max-md:py-0">
        <IconButton
          aria-label="메모 목록으로 돌아가기"
          disabled={confirmation.pending}
          onClick={confirmation.returnToNotes}
          className="h-[var(--notes-touch-target)] w-[var(--notes-touch-target)]"
        >
          <NavigateBackIcon />
        </IconButton>
        <h1 className="min-w-0 text-lg font-semibold">일괄 복사 확인</h1>
        <span className="text-sm font-semibold tabular-nums text-danger">
          {confirmation.entries.length.toLocaleString("ko-KR")}개
        </span>
      </header>
      <section className="min-h-0 overflow-auto px-4 py-5">
        {confirmation.entries.length === 0 ? (
          <p className="grid min-h-40 place-items-center text-sm text-soft-ink">
            복사할 항목이 없습니다.
          </p>
        ) : null}
        <MobileBatchCopyConfirmationList
          disabled={confirmation.pending}
          entries={confirmation.entries}
          onDuplicate={confirmation.duplicate}
          onMove={confirmation.move}
          onRemove={confirmation.remove}
          reorderButtonsEnabled={confirmation.reorderButtonsEnabled}
        />
      </section>
      <footer className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 border-t border-line bg-surface-raised px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          disabled={confirmation.copyDisabled}
          onClick={confirmation.reset}
          size="large"
          tone="quiet"
        >
          초기화
        </Button>
        <CopyBatchTextAction
          disabled={confirmation.copyDisabled}
          label="일괄 복사하기"
          onCopy={confirmation.copy}
          onResult={confirmation.showCopyResult}
          size="large"
        />
      </footer>
    </main>
  )
}
