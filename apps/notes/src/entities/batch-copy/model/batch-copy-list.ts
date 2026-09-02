import { z } from "zod"

import type { NoteContentReference } from "@/entities/note/@x/batch-copy"
import {
  EntityIdSchema,
  IsoDateTimeSchema,
  RevisionSchema,
} from "@/shared/lib/entity-metadata"

const SourceNoteSchema: z.ZodType<NoteContentReference> = z
  .object({
    contentRevision: RevisionSchema,
    id: EntityIdSchema,
  })
  .strict()

export const BatchCopyItemSchema = z
  .object({
    addedAt: IsoDateTimeSchema,
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
    revision: RevisionSchema,
    updatedAt: IsoDateTimeSchema,
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
