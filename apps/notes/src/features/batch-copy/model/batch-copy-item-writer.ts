import type {
  BatchCopyItem,
  BatchCopyList,
} from "@/entities/batch-copy"

export interface BatchCopyItemWriter {
  add(item: BatchCopyItem): Promise<BatchCopyList>
}
