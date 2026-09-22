"use client"

import type { BatchCopyItem } from "@/entities/batch-copy"
import { Button } from "@/shared/ui/button"
import { StatusNotice } from "@/shared/ui/status-notice"

import type { EditBatchCopyResult } from "../model/edit-batch-copy"
import { useBatchCopyEditing } from "../model/use-batch-copy-editing"
import { BatchCopyList } from "./batch-copy-list"

type BatchCopyEditingViewProps = {
  items: readonly BatchCopyItem[]
  pending: boolean
  presentation: "management" | "panel"
  reorderButtonsEnabled: boolean
  selectedItemId?: string | null
  onDuplicate(itemId: string): Promise<EditBatchCopyResult>
  onMove(itemId: string, index: number): Promise<EditBatchCopyResult>
  onRemove(itemId: string): Promise<EditBatchCopyResult>
  onToggleSelection?(itemId: string): void
}

export function BatchCopyEditingView({
  items,
  onDuplicate,
  onMove,
  onRemove,
  onToggleSelection,
  pending,
  presentation,
  reorderButtonsEnabled,
  selectedItemId,
}: BatchCopyEditingViewProps) {
  const editing = useBatchCopyEditing({
    items,
    onDuplicate,
    onMove,
    onRemove,
  })

  return (
    <div className="grid gap-3">
      {editing.failure !== null ? (
        <StatusNotice kind="error">
          <p>{editing.failure.message}</p>
          <Button onClick={editing.failure.retry} tone="quiet">
            다시 시도
          </Button>
        </StatusNotice>
      ) : null}
      <BatchCopyList
        items={editing.items}
        onDuplicate={editing.duplicate}
        onMove={editing.move}
        onRemove={editing.remove}
        onToggleSelection={onToggleSelection}
        pending={pending}
        presentation={presentation}
        reorderButtonsEnabled={reorderButtonsEnabled}
        selectedItemId={selectedItemId}
      />
    </div>
  )
}
