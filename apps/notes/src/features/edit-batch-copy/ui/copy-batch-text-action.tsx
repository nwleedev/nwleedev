"use client"

import { Button } from "@/shared/ui/button"

import type { CopyBatchTextResult } from "../model/copy-batch-text"
import { useCopyBatchText } from "../model/use-copy-batch-text"

type CopyBatchTextActionProps = {
  disabled: boolean
  label?: string
  onCopy(): Promise<CopyBatchTextResult>
  onResult(result: CopyBatchTextResult): void
}

export function CopyBatchTextAction({
  disabled,
  label = "복사",
  onCopy,
  onResult,
}: CopyBatchTextActionProps) {
  const { copy, unavailable } = useCopyBatchText({
    disabled,
    onCopy,
    onResult,
  })

  return (
    <Button disabled={unavailable} onClick={copy}>
      {label}
    </Button>
  )
}
