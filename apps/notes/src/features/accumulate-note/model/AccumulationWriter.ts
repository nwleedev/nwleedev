import type { AccumulatedTextItem } from "@/entities/accumulator"

export interface AccumulationWriter {
  addAndRecordUsage(item: AccumulatedTextItem): Promise<void>
}
