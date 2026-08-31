"use client"

import { useState } from "react"

import { Button } from "@/shared/ui/button"
import { StatusNotice } from "@/shared/ui/status-notice"

type CopyResult = {
  status: "clipboard-failure" | "copied"
}

type CopyAccumulatorActionProps = {
  disabled: boolean
  onCopy(): Promise<CopyResult>
}

export function CopyAccumulatorAction({
  disabled,
  onCopy,
}: CopyAccumulatorActionProps) {
  const [notice, setNotice] = useState<CopyResult["status"] | null>(null)
  const [pending, setPending] = useState(false)
  const unavailable = disabled || pending

  async function copy() {
    if (unavailable) {
      return
    }

    setPending(true)
    const result = await onCopy()
    setNotice(result.status)
    setPending(false)
  }

  return (
    <div className="grid justify-items-end gap-2">
      <Button aria-disabled={unavailable} onClick={copy}>
        복사
      </Button>
      {notice === "copied" ? (
        <StatusNotice>
          <p>합친 텍스트를 복사했습니다.</p>
        </StatusNotice>
      ) : null}
      {notice === "clipboard-failure" ? (
        <StatusNotice kind="error">
          <p>복사하지 못했습니다. 복사 버튼으로 다시 시도하세요.</p>
        </StatusNotice>
      ) : null}
    </div>
  )
}
