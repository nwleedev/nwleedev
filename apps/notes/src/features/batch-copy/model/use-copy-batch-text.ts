"use client"

import { useState } from "react"

import type { CopyBatchTextResult } from "./copy-batch-text"

type UseCopyBatchTextOptions = {
  disabled: boolean
  onCopy(): Promise<CopyBatchTextResult>
  onResult(result: CopyBatchTextResult): void
}

export function useCopyBatchText({
  disabled,
  onCopy,
  onResult,
}: UseCopyBatchTextOptions) {
  const [pending, setPending] = useState(false)
  const unavailable = disabled || pending

  async function copy() {
    if (unavailable) {
      return
    }

    setPending(true)

    try {
      onResult(await onCopy())
    } catch {
      onResult({ reason: "write-failed", status: "clipboard-failure" })
    } finally {
      setPending(false)
    }
  }

  return { copy, unavailable }
}
