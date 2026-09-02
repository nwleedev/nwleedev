"use client"

import { useRouter } from "next/navigation"

import type { ConfirmingMobileBatchCopyDraft } from "@/entities/batch-copy"
import { useMobileBatchCopy } from "@/features/add-note-to-batch-copy"
import { Button } from "@/shared/ui/button"

type MobileBatchCopyConfirmationProps = {
  draft: ConfirmingMobileBatchCopyDraft
}

export function MobileBatchCopyConfirmation({
  draft,
}: MobileBatchCopyConfirmationProps) {
  const batchCopy = useMobileBatchCopy()
  const router = useRouter()

  async function cancel() {
    const result = await batchCopy.cancel()

    if (result.status === "removed") {
      router.push("/")
    }
  }

  return (
    <main
      className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-canvas"
      id="main-content"
    >
      <header className="border-b border-line bg-surface-raised px-4 py-3">
        <h1 className="text-base font-semibold">일괄 복사 확인</h1>
      </header>
      <ol className="grid min-h-0 content-start gap-3 overflow-auto px-4 py-5">
        {draft.entries.map((entry) => (
          <li
            className="whitespace-pre-wrap break-words rounded-note border border-note-line bg-note px-4 py-3 text-sm leading-6 text-ink shadow-note"
            key={entry.id}
          >
            {entry.textSnapshot}
          </li>
        ))}
      </ol>
      <footer className="flex justify-start border-t border-line bg-surface-raised px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button disabled={batchCopy.pending} onClick={cancel} tone="quiet">
          취소
        </Button>
      </footer>
    </main>
  )
}
