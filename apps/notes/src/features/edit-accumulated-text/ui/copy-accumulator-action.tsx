"use client"

import { useState } from "react"

import { Button } from "@/shared/ui/button"
import { StatusNotice } from "@/shared/ui/status-notice"

import type { CopyAccumulatedTextResult } from "../model/copy-accumulated-text"

type CopyAccumulatorActionProps = {
  disabled: boolean
  onCopy(): Promise<CopyAccumulatedTextResult>
  onResult(result: CopyAccumulatedTextResult): void
}

type CopyAccumulatorNoticeProps = {
  result: CopyAccumulatedTextResult
}

function clipboardFailureMessage(
  reason: Extract<
    CopyAccumulatedTextResult,
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

export function CopyAccumulatorAction({
  disabled,
  onCopy,
  onResult,
}: CopyAccumulatorActionProps) {
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
      복사
    </Button>
  )
}

export function CopyAccumulatorNotice({
  result,
}: CopyAccumulatorNoticeProps) {
  if (result.status === "copied") {
    return (
      <StatusNotice>
        <p>복사했습니다.</p>
      </StatusNotice>
    )
  }

  return (
    <StatusNotice kind="error">
      <p>{clipboardFailureMessage(result.reason)}</p>
    </StatusNotice>
  )
}
