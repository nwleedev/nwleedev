import type {
  AccumulatedTextItem,
  Accumulator,
} from "@/entities/accumulator"

export interface AccumulationWriter {
  addAndRecordUsage(item: AccumulatedTextItem): Promise<Accumulator>
}
