"use client"

import { useRouter } from "next/navigation"
import { startTransition, useOptimistic, useState } from "react"

import type {
  ConfirmingMobileBatchCopyDraft,
  MobileBatchCopyEntry,
} from "@/entities/batch-copy"
import { useMobileBatchCopy } from "@/features/add-note-to-batch-copy"
import type { CopyBatchTextResult } from "@/features/edit-batch-copy"

type OptimisticChange =
  | { entryId: string; kind: "remove" }
  | { entryId: string; index: number; kind: "move" }

export type ConfirmationNoticeInput =
  | { kind: "copy"; result: CopyBatchTextResult }
  | { kind: "error"; message: string; retry(): void }

export type ConfirmationNotice = ConfirmationNoticeInput & {
  revision: number
}

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
) {
  const batchCopy = useMobileBatchCopy()
  const router = useRouter()
  const [notice, setNotice] = useState<ConfirmationNotice | null>(null)
  const [entries, applyOptimistic] = useOptimistic(
    draft.entries,
    applyOptimisticChange,
  )

  function showNotice(nextNotice: ConfirmationNoticeInput) {
    setNotice((current) => ({
      ...nextNotice,
      revision: (current?.revision ?? 0) + 1,
    }))
  }

  async function returnToCollection() {
    if (await onReturnToCollection()) {
      return
    }

    showNotice({
      kind: "error",
      message: "메모 선택 화면으로 돌아가지 못했습니다.",
      retry: () => void returnToCollection(),
    })
  }

  async function cancel() {
    const result = await batchCopy.cancel()

    if (result.status === "removed") {
      router.push("/")
      return
    }

    showNotice({
      kind: "error",
      message: "이번 일괄 복사 작업을 취소하지 못했습니다.",
      retry: () => void cancel(),
    })
  }

  function move(entryId: string, index: number): Promise<boolean> {
    return new Promise((resolve) => {
      startTransition(async () => {
        applyOptimistic({ entryId, index, kind: "move" })
        const result = await batchCopy.move(entryId, index)

        if (result.status === "saved") {
          setNotice(null)
          resolve(true)
          return
        }

        showNotice({
          kind: "error",
          message: "항목 순서를 저장하지 못했습니다.",
          retry: () => void move(entryId, index),
        })
        resolve(false)
      })
    })
  }

  function duplicate(entryId: string) {
    void batchCopy.duplicate(entryId).then((result) => {
      if (result.status === "saved") {
        setNotice(null)
        return
      }

      showNotice({
        kind: "error",
        message: "항목을 복제하지 못했습니다.",
        retry: () => duplicate(entryId),
      })
    })
  }

  function remove(entryId: string) {
    startTransition(async () => {
      applyOptimistic({ entryId, kind: "remove" })
      const result = await batchCopy.removeEntry(entryId)

      if (result.status === "saved") {
        setNotice(null)
        return
      }

      showNotice({
        kind: "error",
        message: "항목을 삭제하지 못했습니다.",
        retry: () => remove(entryId),
      })
    })
  }

  function showCopyResult(result: CopyBatchTextResult) {
    showNotice({ kind: "copy", result })
  }

  async function retryCopy() {
    try {
      showCopyResult(await batchCopy.copy())
    } catch {
      showCopyResult({
        reason: "write-failed",
        status: "clipboard-failure",
      })
    }
  }

  return {
    cancel: () => void cancel(),
    copy: batchCopy.copy,
    copyDisabled: batchCopy.pending || entries.length === 0,
    dismissNotice: () => setNotice(null),
    duplicate,
    entries,
    move,
    notice,
    pending: batchCopy.pending,
    reorderButtonsEnabled: batchCopy.reorderButtonsEnabled,
    remove,
    retryCopy: () => void retryCopy(),
    returnToCollection: () => void returnToCollection(),
    showCopyResult,
  }
}
