"use client"

import { useState } from "react"

import type { AccumulatedTextItem } from "@/entities/accumulator"
import { Button } from "@/shared/ui/button"
import { StatusNotice } from "@/shared/ui/status-notice"

import { AccumulatorList } from "./AccumulatorList"

type EditResult = {
  status: "failure" | "saved" | "unchanged"
}

type AccumulatorEditingViewProps = {
  canRedo: boolean
  canUndo: boolean
  combinedText: string
  items: readonly AccumulatedTextItem[]
  pending: boolean
  onMove(itemId: string, index: number): Promise<EditResult>
  onRedo(): Promise<EditResult>
  onRemove(itemId: string): Promise<EditResult>
  onUndo(): Promise<EditResult>
}

export function AccumulatorEditingView({
  canRedo,
  canUndo,
  combinedText,
  items,
  onMove,
  onRedo,
  onRemove,
  onUndo,
  pending,
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
        ? "누적 텍스트를 제거하지 못했습니다. 다시 시도하세요."
        : "",
    )
  }

  async function undo() {
    const result = await onUndo()
    setErrorMessage(
      result.status === "failure"
        ? "제거를 실행 취소하지 못했습니다. 다시 시도하세요."
        : "",
    )
  }

  async function redo() {
    const result = await onRedo()
    setErrorMessage(
      result.status === "failure"
        ? "제거를 다시 실행하지 못했습니다. 다시 시도하세요."
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
      <div
        aria-label="누적 텍스트 편집"
        className="flex flex-wrap gap-2"
        role="group"
      >
        <Button disabled={pending || !canUndo} onClick={undo} tone="quiet">
          실행 취소
        </Button>
        <Button disabled={pending || !canRedo} onClick={redo} tone="quiet">
          다시 실행
        </Button>
      </div>
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
      />
      <section aria-label="합친 텍스트" className="grid gap-2">
        <h3 className="text-sm font-semibold">
          합친 텍스트
        </h3>
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-control border border-line bg-canvas p-3 font-sans text-sm leading-6 text-ink">
          {combinedText}
        </pre>
      </section>
    </div>
  )
}
