"use client"

import { useState } from "react"

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
  const [copyNotice, setCopyNotice] = useState<CopyNotice | null>(null)

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

  return {
    batchCopy,
    copyNotice,
    dismissCopyNotice: () => setCopyNotice(null),
    retryCopy: () => void retryCopy(),
    showCopyResult,
  }
}
