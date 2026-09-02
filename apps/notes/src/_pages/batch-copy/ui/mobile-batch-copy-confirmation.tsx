"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import type { ConfirmingMobileBatchCopyDraft } from "@/entities/batch-copy"
import { useMobileBatchCopy } from "@/features/add-note-to-batch-copy"
import {
  CopyBatchTextAction,
  CopyBatchTextNotice,
  type CopyBatchTextResult,
} from "@/features/edit-batch-copy"
import { ActionToast } from "@/shared/ui/action-toast"
import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { ArrowBackIcon } from "@/shared/ui/icons"

import { MobileBatchCopyConfirmationList } from "./mobile-batch-copy-confirmation-list"

type MobileBatchCopyConfirmationProps = {
  draft: ConfirmingMobileBatchCopyDraft
}

type ConfirmationNotice =
  | {
      kind: "copy"
      result: CopyBatchTextResult
    }
  | {
      kind: "error"
      message: string
      retry(): void
    }

type ConfirmationNoticeViewProps = {
  notice: ConfirmationNotice
  onDismiss(): void
  onRetryCopy(): void
}

function ConfirmationNoticeView({
  notice,
  onDismiss,
  onRetryCopy,
}: ConfirmationNoticeViewProps) {
  if (notice.kind === "copy") {
    return (
      <CopyBatchTextNotice
        onDismiss={onDismiss}
        onRetry={onRetryCopy}
        result={notice.result}
      />
    )
  }

  return (
    <ActionToast
      actionLabel="다시 시도"
      kind="error"
      message={notice.message}
      onAction={notice.retry}
      onDismiss={onDismiss}
    />
  )
}

export function MobileBatchCopyConfirmation({
  draft,
}: MobileBatchCopyConfirmationProps) {
  const batchCopy = useMobileBatchCopy()
  const router = useRouter()
  const [notice, setNotice] = useState<ConfirmationNotice | null>(null)
  const copyDisabled = batchCopy.pending || draft.entries.length === 0

  async function returnToCollection() {
    const result = await batchCopy.resumeCollection()

    if (result.status === "saved") {
      router.push("/")
      return
    }

    setNotice({
      kind: "error",
      message: "메모 선택 화면으로 돌아가지 못했습니다.",
      retry: () => {
        void returnToCollection()
      },
    })
  }

  async function cancel() {
    const result = await batchCopy.cancel()

    if (result.status === "removed") {
      router.push("/")
      return
    }

    setNotice({
      kind: "error",
      message: "이번 일괄 복사 작업을 취소하지 못했습니다.",
      retry: () => {
        void cancel()
      },
    })
  }

  async function move(entryId: string, index: number) {
    const result = await batchCopy.move(entryId, index)

    if (result.status === "saved") {
      setNotice(null)
      return true
    }

    setNotice({
      kind: "error",
      message: "항목 순서를 저장하지 못했습니다.",
      retry: () => {
        void move(entryId, index)
      },
    })
    return false
  }

  async function duplicate(entryId: string) {
    const result = await batchCopy.duplicate(entryId)

    if (result.status === "saved") {
      setNotice(null)
      return
    }

    setNotice({
      kind: "error",
      message: "항목을 복제하지 못했습니다.",
      retry: () => {
        void duplicate(entryId)
      },
    })
  }

  async function remove(entryId: string) {
    const result = await batchCopy.removeEntry(entryId)

    if (result.status === "saved") {
      setNotice(null)
      return
    }

    setNotice({
      kind: "error",
      message: "항목을 삭제하지 못했습니다.",
      retry: () => {
        void remove(entryId)
      },
    })
  }

  function duplicateEntry(entryId: string) {
    void duplicate(entryId)
  }

  function removeEntry(entryId: string) {
    void remove(entryId)
  }

  function showCopyResult(result: CopyBatchTextResult) {
    setNotice({ kind: "copy", result })
  }

  async function retryCopy() {
    try {
      const result = await batchCopy.copy()
      showCopyResult(result)
    } catch {
      showCopyResult({
        reason: "write-failed",
        status: "clipboard-failure",
      })
    }
  }

  function retryCopyWithoutWaiting() {
    void retryCopy()
  }

  function dismissNotice() {
    setNotice(null)
  }

  return (
    <main
      className="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-canvas"
      id="main-content"
    >
      <header className="grid min-h-14 grid-cols-[auto_1fr_auto] items-center border-b border-line bg-surface-raised px-3 py-2">
        <IconButton
          aria-label="메모 선택으로 돌아가기"
          disabled={batchCopy.pending}
          onClick={returnToCollection}
          size="compact"
        >
          <ArrowBackIcon />
        </IconButton>
        <h1 className="text-center text-base font-semibold">일괄 복사 확인</h1>
        <span aria-hidden="true" className="h-9 w-9" />
      </header>
      {notice ? (
        <div className="absolute right-3 top-[4.25rem] z-30 w-[min(24rem,calc(100%-1.5rem))]">
          <ConfirmationNoticeView
            notice={notice}
            onDismiss={dismissNotice}
            onRetryCopy={retryCopyWithoutWaiting}
          />
        </div>
      ) : null}
      <section className="min-h-0 overflow-auto px-4 py-5">
        {draft.entries.length === 0 ? (
          <p className="grid min-h-40 place-items-center text-sm text-soft-ink">
            일괄 복사 항목이 없습니다.
          </p>
        ) : (
          <MobileBatchCopyConfirmationList
            disabled={batchCopy.pending}
            entries={draft.entries}
            onDuplicate={duplicateEntry}
            onMove={move}
            onRemove={removeEntry}
          />
        )}
      </section>
      <footer className="flex justify-between gap-3 border-t border-line bg-surface-raised px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button disabled={batchCopy.pending} onClick={cancel} tone="quiet">
          취소
        </Button>
        <CopyBatchTextAction
          disabled={copyDisabled}
          label="일괄 복사하기"
          onCopy={batchCopy.copy}
          onResult={showCopyResult}
        />
      </footer>
    </main>
  )
}
