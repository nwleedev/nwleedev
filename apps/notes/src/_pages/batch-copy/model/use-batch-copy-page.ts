"use client"

import { usePathname, useRouter } from "next/navigation"
import { startTransition, useEffect, useRef, useState } from "react"

import type { ConfirmingMobileBatchCopyDraft } from "@/entities/batch-copy"
import { useMobileBatchCopy } from "@/features/add-note-to-batch-copy"
import {
  useBatchCopyEditor,
  useCopyBatchTextFeedback,
} from "@/features/edit-batch-copy"

export function useBatchCopyPage() {
  const batchCopy = useBatchCopyEditor()
  const mobileBatchCopy = useMobileBatchCopy()
  const pathname = usePathname()
  const router = useRouter()
  const [returningConfirmation, setReturningConfirmation] =
    useState<ConfirmingMobileBatchCopyDraft | null>(null)
  const showCopyResult = useCopyBatchTextFeedback(batchCopy.copyAll)
  const cancellationCompleted = useRef(false)
  const collectionReturnCompleted = useRef(false)
  const transitionPending = useRef(false)
  const mobileDraft = mobileBatchCopy.draft
  const isBatchCopyRoute =
    pathname === "/batch-copy" || pathname === "/batch-copy/"
  const redirectCollectingDraft =
    isBatchCopyRoute &&
    mobileDraft?.step === "collecting" &&
    returningConfirmation === null
  const routePending =
    isBatchCopyRoute &&
    returningConfirmation === null &&
    redirectCollectingDraft

  useEffect(() => {
    if (redirectCollectingDraft) {
      router.replace("/")
    }
  }, [redirectCollectingDraft, router])

  async function returnToCollection() {
    const draft =
      returningConfirmation ??
      (mobileDraft?.step === "confirming" ? mobileDraft : null)

    if (draft === null) {
      return false
    }

    if (collectionReturnCompleted.current) {
      router.push("/")
      return true
    }

    if (transitionPending.current) {
      return false
    }

    transitionPending.current = true
    const confirmingDraft = { ...draft, step: "confirming" as const }
    setReturningConfirmation(confirmingDraft)
    const resumed = await mobileBatchCopy.resumeCollection()

    if (!resumed) {
      transitionPending.current = false
      return false
    }

    startTransition(() => {
      router.push("/")
    })
    collectionReturnCompleted.current = true
    return true
  }

  async function cancelConfirmation() {
    const draft =
      returningConfirmation ??
      (mobileDraft?.step === "confirming" ? mobileDraft : null)

    if (draft === null || transitionPending.current) {
      return false
    }

    setReturningConfirmation({ ...draft, step: "confirming" })

    if (cancellationCompleted.current) {
      router.push("/")
      return true
    }

    transitionPending.current = true
    await mobileBatchCopy.cancel()
    transitionPending.current = false

    cancellationCompleted.current = true
    router.push("/")
    return true
  }

  return {
    batchCopy,
    cancelConfirmation,
    mobileDraft,
    returningConfirmation,
    returnToCollection,
    routePending,
    showCopyResult,
  }
}
