"use client"

import { clipboardWriteFailureMessage } from "@/shared/lib/clipboard"
import { ActionToast } from "@/shared/ui/action-toast"
import { Button } from "@/shared/ui/button"

import type { CopyBatchTextResult } from "../model/copy-batch-text"
import { useCopyBatchText } from "../model/use-copy-batch-text"

type CopyBatchTextActionProps = {
  disabled: boolean
  label?: string
  onCopy(): Promise<CopyBatchTextResult>
  onResult(result: CopyBatchTextResult): void
}

type CopyBatchTextNoticeProps = {
  result: CopyBatchTextResult
  revision: number
  onDismiss(): void
  onRetry?(): void
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

export function CopyBatchTextNotice({
  onDismiss,
  onRetry,
  result,
  revision,
}: CopyBatchTextNoticeProps) {
  if (result.status === "copied") {
    return (
      <ActionToast
        message="복사했습니다."
        onDismiss={onDismiss}
        revision={revision}
      />
    )
  }

  return (
    <ActionToast
      actionLabel={onRetry === undefined ? undefined : "다시 시도"}
      kind="error"
      message={clipboardWriteFailureMessage(result.reason)}
      onAction={onRetry}
      onDismiss={onDismiss}
      revision={revision}
    />
  )
}
