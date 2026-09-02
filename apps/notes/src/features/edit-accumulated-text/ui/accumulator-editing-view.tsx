"use client"

import { useState } from "react"

import type { AccumulatedTextItem } from "@/entities/accumulator"
import { StatusNotice } from "@/shared/ui/status-notice"

import type { EditAccumulatorResult } from "../model/edit-accumulated-text"
import { AccumulatorList } from "./accumulator-list"

type AccumulatorEditingViewProps = {
  items: readonly AccumulatedTextItem[]
  pending: boolean
  presentation: "management" | "panel"
  onMove(itemId: string, index: number): Promise<EditAccumulatorResult>
  onRemove(itemId: string): Promise<EditAccumulatorResult>
}

export function AccumulatorEditingView({
  items,
  onMove,
  onRemove,
  pending,
  presentation,
}: AccumulatorEditingViewProps) {
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
      <AccumulatorList
        items={items}
        onMove={moveFromList}
        onRemove={removeFromList}
        pending={pending}
        presentation={presentation}
      />
    </div>
  )
}
