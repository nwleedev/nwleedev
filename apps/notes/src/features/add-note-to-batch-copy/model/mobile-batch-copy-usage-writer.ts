import type { Note } from "@/entities/note"

export interface MobileBatchCopyUsageWriter {
  record(note: Note, updatedAt: string): Promise<void>
}
