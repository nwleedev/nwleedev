import { z } from "zod"

import {
  EntityIdSchema,
  TimestampSchema,
} from "@/shared/lib/entity-metadata"

const SourceNoteSchema = z
  .object({
    id: EntityIdSchema,
  })
  .strict()

export const PRIMARY_BATCH_COPY_LIST_ID = "primary"

export const BatchCopyItemSchema = z
  .object({
    addedAt: TimestampSchema,
    id: EntityIdSchema,
    sourceNote: SourceNoteSchema,
    textSnapshot: z.string(),
  })
  .strict()

export const BatchCopyContentSchema = z
  .object({
    items: z.array(BatchCopyItemSchema),
    separator: z.string(),
  })
  .strict()
  .superRefine(({ items }, context) => {
    const identifiers = new Set(items.map(({ id }) => id))

    if (identifiers.size !== items.length) {
      context.addIssue({
        code: "custom",
        message: "Batch copy item identifiers must be unique",
        path: ["items"],
      })
    }
  })

export const BatchCopyListSchema = z
  .object({
    content: BatchCopyContentSchema,
    id: EntityIdSchema,
    updatedAt: TimestampSchema,
  })
  .strict()

export type BatchCopyItem = z.infer<typeof BatchCopyItemSchema>
export type BatchCopyList = z.infer<typeof BatchCopyListSchema>

export interface BatchCopyRepository {
  get(): Promise<BatchCopyList | null>
  save(list: BatchCopyList): Promise<BatchCopyList>
}

export function parseBatchCopyList(value: unknown): BatchCopyList {
  return BatchCopyListSchema.parse(value)
}
