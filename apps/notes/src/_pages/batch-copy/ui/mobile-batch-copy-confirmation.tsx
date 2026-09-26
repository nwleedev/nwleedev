"use client"

import type { ConfirmingMobileBatchCopyDraft } from "@/entities/batch-copy"
import { CopyBatchTextAction } from "@/features/edit-batch-copy"
import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { NavigateBackIcon } from "@/shared/ui/icons"

import {
  useMobileBatchCopyConfirmation,
} from "../model/use-mobile-batch-copy-confirmation"
import { MobileBatchCopyConfirmationList } from "./mobile-batch-copy-confirmation-list"

type MobileBatchCopyConfirmationProps = {
  draft: ConfirmingMobileBatchCopyDraft
  onCancelConfirmation(): Promise<boolean>
  onReturnToCollection(): Promise<boolean>
}

export function MobileBatchCopyConfirmation({
  draft,
  onCancelConfirmation,
  onReturnToCollection,
}: MobileBatchCopyConfirmationProps) {
  const confirmation = useMobileBatchCopyConfirmation(
    draft,
    onReturnToCollection,
    onCancelConfirmation,
  )

  return (
    <main
      className="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-canvas"
      id="main-content"
    >
      <header className="grid min-h-14 grid-cols-[auto_1fr_auto] items-center border-b border-line bg-surface-raised px-3 py-2">
        <IconButton
          aria-label="메모 선택으로 돌아가기"
          disabled={confirmation.pending}
          onClick={confirmation.returnToCollection}
          size="compact"
        >
          <NavigateBackIcon />
        </IconButton>
        <h1 className="text-center text-base font-semibold">일괄 복사 확인</h1>
        <span aria-hidden="true" className="h-9 w-9" />
      </header>
      <section className="min-h-0 overflow-auto px-4 py-5">
        {confirmation.entries.length === 0 ? (
          <p className="grid min-h-40 place-items-center text-sm text-soft-ink">
            일괄 복사 항목이 없습니다.
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
      <footer className="flex justify-between gap-3 border-t border-line bg-surface-raised px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          disabled={confirmation.pending}
          onClick={confirmation.cancel}
          tone="quiet"
        >
          취소
        </Button>
        <CopyBatchTextAction
          disabled={confirmation.copyDisabled}
          label="일괄 복사하기"
          onCopy={confirmation.copy}
          onResult={confirmation.showCopyResult}
        />
      </footer>
    </main>
  )
}
