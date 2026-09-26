"use client"

import { startTransition, useOptimistic, useRef } from "react"

import type {
  ConfirmingMobileBatchCopyDraft,
  MobileBatchCopyEntry,
} from "@/entities/batch-copy"
import { useMobileBatchCopy } from "@/features/add-note-to-batch-copy"
import {
  useCopyBatchTextFeedback,
  type CopyBatchTextResult,
} from "@/features/edit-batch-copy"
import { useActionToast } from "@/shared/ui/action-toast"

type OptimisticChange =
  | { entryId: string; kind: "remove" }
  | { entryId: string; index: number; kind: "move" }

function applyOptimisticChange(
  entries: readonly MobileBatchCopyEntry[],
  change: OptimisticChange,
) {
  if (change.kind === "remove") {
    return entries.filter(({ id }) => id !== change.entryId)
  }

  const sourceIndex = entries.findIndex(({ id }) => id === change.entryId)

  if (sourceIndex < 0 || sourceIndex === change.index) {
    return entries
  }

  const reordered = [...entries]
  const [entry] = reordered.splice(sourceIndex, 1)

  if (entry === undefined) {
    return entries
  }

  reordered.splice(change.index, 0, entry)
  return reordered
}

export function useMobileBatchCopyConfirmation(
  draft: ConfirmingMobileBatchCopyDraft,
  onReturnToCollection: () => Promise<boolean>,
  onCancelConfirmation: () => Promise<boolean>,
) {
  const batchCopy = useMobileBatchCopy()
  const toast = useActionToast()
  const showCopyResult = useCopyBatchTextFeedback(batchCopy.copy)
  const failureRevision = useRef<number | null>(null)
  const [entries, applyOptimistic] = useOptimistic(
    draft.entries,
    applyOptimisticChange,
  )

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

  async function returnToCollection() {
    if (await onReturnToCollection()) {
      clearFailure()
      return
    }

    showFailure("메모 선택 화면으로 돌아가지 못했습니다.", () =>
      void returnToCollection(),
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

  function move(entryId: string, index: number): Promise<boolean> {
    return new Promise((resolve) => {
      startTransition(async () => {
        applyOptimistic({ entryId, index, kind: "move" })
        const result = await batchCopy.move(entryId, index)

        if (result) {
          clearFailure()
          resolve(true)
          return
        }

        showFailure("항목 순서를 변경하지 못했습니다.", () =>
          void move(entryId, index),
        )
        resolve(false)
      })
    })
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
    startTransition(async () => {
      applyOptimistic({ entryId, kind: "remove" })
      const result = await batchCopy.removeEntry(entryId)

      if (result) {
        clearFailure()
        return
      }

      showFailure("항목을 삭제하지 못했습니다.", () => remove(entryId))
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
    returnToCollection: () => void returnToCollection(),
    showCopyResult: reportCopyResult,
  }
}
