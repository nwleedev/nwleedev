"use client"

import { useState } from "react"

import { ActionToast } from "@/shared/ui/action-toast"
import { Button } from "@/shared/ui/button"

import type { CopyBatchTextResult } from "../model/copy-batch-text"

type CopyBatchTextActionProps = {
  disabled: boolean
  label?: string
  onCopy(): Promise<CopyBatchTextResult>
  onResult(result: CopyBatchTextResult): void
}

type CopyBatchTextNoticeProps = {
  result: CopyBatchTextResult
  onDismiss(): void
  onRetry?(): void
}

function clipboardFailureMessage(
  reason: Extract<
    CopyBatchTextResult,
    { status: "clipboard-failure" }
  >["reason"],
) {
  if (reason === "api-unavailable") {
    return "이 브라우저에서는 클립보드에 복사할 수 없습니다. 텍스트를 직접 선택해 복사하세요."
  }

  if (reason === "not-allowed") {
    return "브라우저가 클립보드 쓰기를 허용하지 않았습니다. 주소 표시줄의 사이트 권한을 확인한 뒤 다시 시도하세요."
  }

  return "클립보드에 쓰는 중 오류가 발생했습니다. 텍스트를 직접 선택해 복사하거나 다시 시도하세요."
}

export function CopyBatchTextAction({
  disabled,
  label = "복사",
  onCopy,
  onResult,
}: CopyBatchTextActionProps) {
  const [pending, setPending] = useState(false)
  const unavailable = disabled || pending

  async function copy() {
    if (unavailable) {
      return
    }

    setPending(true)

    try {
      const result = await onCopy()
      onResult(result)
    } catch {
      onResult({ reason: "write-failed", status: "clipboard-failure" })
    } finally {
      setPending(false)
    }
  }

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
}: CopyBatchTextNoticeProps) {
  if (result.status === "copied") {
    return (
      <ActionToast
        message="복사했습니다."
        onDismiss={onDismiss}
        resetKey={result}
      />
    )
  }

  return (
    <ActionToast
      actionLabel={onRetry === undefined ? undefined : "다시 시도"}
      kind="error"
      message={clipboardFailureMessage(result.reason)}
      onAction={onRetry}
      onDismiss={onDismiss}
      resetKey={result}
    />
  )
}
