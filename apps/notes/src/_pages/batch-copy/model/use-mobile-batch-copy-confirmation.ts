"use client"

import { useRef } from "react"

import type {
  MobileBatchCopyDraft,
} from "@/entities/batch-copy"
import { useMobileBatchCopy } from "@/features/add-note-to-batch-copy"
import {
  useCopyBatchTextFeedback,
  type CopyBatchTextResult,
} from "@/features/edit-batch-copy"
import { useActionToast } from "@/shared/ui/action-toast"

export function useMobileBatchCopyConfirmation(
  draft: MobileBatchCopyDraft,
  onReturnToNotes: () => Promise<boolean>,
  onCancelConfirmation: () => Promise<boolean>,
) {
  const batchCopy = useMobileBatchCopy()
  const toast = useActionToast()
  const showCopyResult = useCopyBatchTextFeedback(batchCopy.copy)
  const failureRevision = useRef<number | null>(null)
  const entries = draft.entries

  function showFailure(message: string, retry: () => void) {
    let revision = 0
    revision = toast.show({
      actionLabel: "다시 시도",
      kind: "error",
      message,
      onAction: retry,
      onDismiss: () => {
        if (failureRevision.current === revision) {
          failureRevision.current = null
        }
      },
    })
    failureRevision.current = revision
  }

  function clearFailure() {
    const revision = failureRevision.current

    if (revision === null) {
      return
    }

    toast.dismiss(revision)
    failureRevision.current = null
  }

  async function returnToNotes() {
    if (await onReturnToNotes()) {
      clearFailure()
      return
    }

    showFailure("메모 목록으로 돌아가지 못했습니다.", () =>
      void returnToNotes(),
    )
  }

  async function cancel() {
    if (await onCancelConfirmation()) {
      clearFailure()
      return
    }

    showFailure("이번 일괄 복사 작업을 취소하지 못했습니다.", () =>
      void cancel(),
    )
  }

  async function move(entryId: string, index: number) {
    const result = await batchCopy.move(entryId, index)
    if (result) clearFailure()
    else showFailure("항목 순서를 변경하지 못했습니다.", () => void move(entryId, index))
    return result
  }

  function duplicate(entryId: string) {
    void batchCopy.duplicate(entryId).then((result) => {
      if (result) {
        clearFailure()
        return
      }

      showFailure("항목을 복제하지 못했습니다.", () => duplicate(entryId))
    })
  }

  function remove(entryId: string) {
    void batchCopy.removeEntry(entryId).then((result) => {
      if (result) clearFailure()
      else showFailure("항목을 삭제하지 못했습니다.", () => remove(entryId))
    })
  }

  function reportCopyResult(result: CopyBatchTextResult) {
    clearFailure()
    showCopyResult(result)
  }

  return {
    cancel: () => void cancel(),
    copy: batchCopy.copy,
    copyDisabled: batchCopy.pending || entries.length === 0,
    duplicate,
    entries,
    move,
    pending: batchCopy.pending,
    reorderButtonsEnabled: batchCopy.reorderButtonsEnabled,
    remove,
    returnToNotes: () => void returnToNotes(),
    showCopyResult: reportCopyResult,
  }
}
