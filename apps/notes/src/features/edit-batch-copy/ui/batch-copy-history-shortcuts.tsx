import type { EditBatchCopyResult } from "../model/save-changes"
import { useBatchCopyHistoryShortcuts } from "../model/use-batch-copy-history-shortcuts"

type BatchCopyHistoryShortcutsProps = {
  canRedo: boolean
  canUndo: boolean
  pending: boolean
  onRedo(): Promise<EditBatchCopyResult>
  onUndo(): Promise<EditBatchCopyResult>
}

export function BatchCopyHistoryShortcuts({
  canRedo,
  canUndo,
  onRedo,
  onUndo,
  pending,
}: BatchCopyHistoryShortcutsProps) {
  useBatchCopyHistoryShortcuts({ canRedo, canUndo, onRedo, onUndo, pending })

  return null
}
