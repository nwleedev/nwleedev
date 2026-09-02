"use client"

import { useState } from "react"

import type { BatchCopyItem } from "@/entities/batch-copy"
import { StatusNotice } from "@/shared/ui/status-notice"

import type { EditBatchCopyResult } from "../model/edit-batch-copy"
import { BatchCopyList } from "./batch-copy-list"

type BatchCopyEditingViewProps = {
  items: readonly BatchCopyItem[]
  pending: boolean
  presentation: "management" | "panel"
  onMove(itemId: string, index: number): Promise<EditBatchCopyResult>
  onRemove(itemId: string): Promise<EditBatchCopyResult>
}

export function BatchCopyEditingView({
  items,
  onMove,
  onRemove,
  pending,
  presentation,
}: BatchCopyEditingViewProps) {
  const [errorMessage, setErrorMessage] = useState("")

  async function moveItem(itemId: string, index: number) {
    const result = await onMove(itemId, index)
    setErrorMessage(
      result.status === "failure"
        ? "순서를 저장하지 못했습니다. 다시 시도하세요."
        : "",
    )
  }

  async function removeItem(itemId: string) {
    const result = await onRemove(itemId)
    setErrorMessage(
      result.status === "failure"
        ? "일괄 복사 항목을 제거하지 못했습니다. 다시 시도하세요."
        : "",
    )
  }

  function moveFromList(itemId: string, index: number) {
    void moveItem(itemId, index)
  }

  function removeFromList(itemId: string) {
    void removeItem(itemId)
  }

  return (
    <div className="grid gap-4">
      {errorMessage ? (
        <StatusNotice kind="error">
          <p>{errorMessage}</p>
        </StatusNotice>
      ) : null}
      <BatchCopyList
        items={items}
        onMove={moveFromList}
        onRemove={removeFromList}
        pending={pending}
        presentation={presentation}
      />
    </div>
  )
}
