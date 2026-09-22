import type {
  BatchCopyItem,
  BatchCopyList,
} from "@/entities/batch-copy"

export interface BatchCopyItemWriter {
  addAndRecordUsage(item: BatchCopyItem): Promise<BatchCopyList>
}
