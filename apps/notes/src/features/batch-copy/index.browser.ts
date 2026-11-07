"use client"

export type { BatchCopyItemWriter } from "./model/batch-copy-item-writer"
export {
  useAddNoteToBatchCopy,
} from "./model/use-add-note"
export {
  MobileBatchCopyProvider,
  useMobileBatchCopy,
} from "./model/mobile-batch-copy-provider"
export {
  addNoteToBatchCopy,
  type AddNoteToBatchCopyResult,
} from "./model/add-note"
export {
  copyMobileBatchText,
  type CopyMobileBatchTextResult,
} from "./model/copy-mobile-batch-text"
export {
  addNoteToMobileBatchCopy,
  duplicateMobileBatchCopySessionEntry,
  moveMobileBatchCopySessionEntry,
  removeMobileBatchCopySessionEntry,
  resetMobileBatchCopySession,
} from "./model/mobile-batch-copy-session"
export {
  useBatchCopyEditor,
  type EditBatchCopyContextValue,
} from "./model/use-editor"
export {
  copyBatchText,
  type CopyBatchTextResult,
} from "./model/copy-batch-text"
export {
  duplicateBatchCopyItem,
  redoBatchCopyItemRemoval,
  removeBatchCopyItem,
  resetBatchCopyList,
  saveBatchCopyItemPosition,
  undoBatchCopyItemRemoval,
  type EditBatchCopyExecution,
  type EditBatchCopyResult,
} from "./model/save-changes"
export { BatchCopyActionSheet } from "./ui/batch-copy-action-sheet"
export { BatchCopyList } from "./ui/batch-copy-list"
export { createBatchCopyItemActions } from "./model/batch-copy-item-actions"
export { useBatchCopyActionSheet } from "./model/use-batch-copy-action-sheet"
export { BatchCopyHistoryShortcuts } from "./ui/batch-copy-history-shortcuts"
export {
  CopyBatchTextAction,
} from "./ui/copy-batch-text-action"
export { useCopyBatchTextFeedback } from "./model/use-copy-batch-text-feedback"

export { BatchCopyProvider } from "./model/batch-copy-provider"
export { useBatchCopyRemoval } from "./model/batch-copy-removals"

export { IndexedDbBatchCopyItemWriter } from "./api/indexed-db-batch-copy-item-writer"
