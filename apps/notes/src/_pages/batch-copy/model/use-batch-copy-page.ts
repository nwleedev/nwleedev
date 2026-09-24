"use client"

import { usePathname, useRouter } from "next/navigation"
import { startTransition, useEffect, useState } from "react"

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
  const pathname = usePathname()
  const router = useRouter()
  const [copyNotice, setCopyNotice] = useState<CopyNotice | null>(null)
  const [returningConfirmation, setReturningConfirmation] =
    useState<ConfirmingMobileBatchCopyDraft | null>(null)
  const mobileDraft =
    mobileBatchCopy.status === "ready" ? mobileBatchCopy.draft : null
  const isBatchCopyRoute =
    pathname === "/batch-copy" || pathname === "/batch-copy/"
  const redirectCollectingDraft =
    isBatchCopyRoute &&
    mobileBatchCopy.status === "ready" &&
    mobileDraft?.step === "collecting" &&
    returningConfirmation === null
  const routePending =
    isBatchCopyRoute &&
    returningConfirmation === null &&
    (mobileBatchCopy.status === "loading" || redirectCollectingDraft)

  useEffect(() => {
    if (redirectCollectingDraft) {
      router.replace("/")
    }
  }, [redirectCollectingDraft, router])

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
    mobileDraft,
    returningConfirmation,
    returnToCollection,
    routePending,
    retryCopy: () => void retryCopy(),
    showCopyResult,
  }
}
