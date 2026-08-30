import { z } from "zod"

import type { NoteContentReference } from "@/entities/note/@x/usage"
import {
  EntityIdSchema,
  IsoDateTimeSchema,
  RevisionSchema,
} from "@/shared/lib/entity-metadata"

const UsedNoteSchema: z.ZodType<NoteContentReference> = z
  .object({
    contentRevision: RevisionSchema,
    id: EntityIdSchema,
  })
  .strict()

export const UsageCountsSchema = z
  .object({
    accumulation: z.number().int().nonnegative().safe(),
    ordinaryCopy: z.number().int().nonnegative().safe(),
  })
  .strict()

export const TextUsageRecordSchema = z
  .object({
    counts: UsageCountsSchema,
    id: EntityIdSchema,
    note: UsedNoteSchema,
    textSnapshot: z.string(),
    updatedAt: IsoDateTimeSchema,
  })
  .strict()

export type TextUsage = z.infer<typeof TextUsageRecordSchema>

export interface TextUsageReader {
  getAll(): Promise<readonly TextUsage[]>
}

export interface OrdinaryCopyUsageWriter {
  recordOrdinaryCopy(input: {
    note: NoteContentReference
    textSnapshot: string
  }): Promise<void>
}

export function parseTextUsageRecord(value: unknown): TextUsage {
  return TextUsageRecordSchema.parse(value)
}
