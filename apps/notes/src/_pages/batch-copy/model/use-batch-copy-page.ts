"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import type { MobileBatchCopyDraft } from "@/entities/batch-copy"
import { useMobileBatchCopy } from "@/features/add-note-to-batch-copy"
import { useBatchCopyEditor, useCopyBatchTextFeedback } from "@/features/edit-batch-copy"

export function useBatchCopyPage() {
  const currentTask = useSearchParams().get("view") === "current"
  const batchCopy = useBatchCopyEditor()
  const mobileBatchCopy = useMobileBatchCopy()
  const router = useRouter()
  const [returningConfirmation, setReturningConfirmation] = useState<MobileBatchCopyDraft | null>(null)
  const showCopyResult = useCopyBatchTextFeedback(batchCopy.copyAll)
  const mobileDraft = currentTask ? mobileBatchCopy.draft : null

  async function returnToNotes() {
    router.push("/")
    return true
  }

  async function cancelConfirmation() {
    setReturningConfirmation(mobileDraft)
    await mobileBatchCopy.cancel()
    router.push("/")
    return true
  }

  return { batchCopy, cancelConfirmation, mobileDraft, returningConfirmation, returnToNotes, showCopyResult }
}
