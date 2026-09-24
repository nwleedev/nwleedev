"use client"

import { useRouter } from "next/navigation"
import { startTransition, useState } from "react"

import type { ConfirmingMobileBatchCopyDraft } from "@/entities/batch-copy"
import { useMobileBatchCopy } from "@/features/add-note-to-batch-copy"
import {
  useBatchCopyEditor,
  type CopyBatchTextResult,
} from "@/features/edit-batch-copy"

type CopyNotice = {
  result: CopyBatchTextResult
  revision: number
}

export function useBatchCopyPage() {
  const batchCopy = useBatchCopyEditor()
  const mobileBatchCopy = useMobileBatchCopy()
  const router = useRouter()
  const [copyNotice, setCopyNotice] = useState<CopyNotice | null>(null)
  const [returningConfirmation, setReturningConfirmation] =
    useState<ConfirmingMobileBatchCopyDraft | null>(null)

  function showCopyResult(result: CopyBatchTextResult) {
    setCopyNotice((current) => ({
      result,
      revision: (current?.revision ?? 0) + 1,
    }))
  }

  async function retryCopy() {
    try {
      showCopyResult(await batchCopy.copyAll())
    } catch {
      showCopyResult({
        reason: "write-failed",
        status: "clipboard-failure",
      })
    }
  }

  async function returnToCollection() {
    const mobileDraft =
      mobileBatchCopy.status === "ready" ? mobileBatchCopy.draft : null
    const draft = mobileDraft?.step === "confirming" ? mobileDraft : null

    if (draft === null) {
      return false
    }

    const confirmingDraft = { ...draft, step: "confirming" as const }
    setReturningConfirmation(confirmingDraft)
    const result = await mobileBatchCopy.resumeCollection()

    if (result.status === "failure") {
      return false
    }

    startTransition(() => {
      router.push("/")
      setReturningConfirmation(null)
    })
    return true
  }

  return {
    batchCopy,
    copyNotice,
    dismissCopyNotice: () => setCopyNotice(null),
    mobileDraft:
      mobileBatchCopy.status === "ready" ? mobileBatchCopy.draft : null,
    returningConfirmation,
    returnToCollection,
    retryCopy: () => void retryCopy(),
    showCopyResult,
  }
}
