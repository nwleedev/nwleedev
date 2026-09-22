import type {
  CollectingMobileBatchCopyDraft,
  MobileBatchCopyEntry,
} from "@/entities/batch-copy"

export interface MobileBatchCopyEntryWriter {
  saveAndRecordUsage(
    draft: CollectingMobileBatchCopyDraft,
    entry: MobileBatchCopyEntry,
  ): Promise<CollectingMobileBatchCopyDraft>
}
