import type { Note } from "@/entities/note"

export interface MobileBatchCopyUsageWriter {
  record(note: Note, updatedAt: number): Promise<void>
}
