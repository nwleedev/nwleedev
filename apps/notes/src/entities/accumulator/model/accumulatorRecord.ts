import { z } from "zod"

import type { NoteContentReference } from "@/entities/note/@x/accumulator"
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

export const AccumulatedTextItemSchema = z
  .object({
    addedAt: IsoDateTimeSchema,
    id: EntityIdSchema,
    sourceNote: SourceNoteSchema,
    textSnapshot: z.string(),
  })
  .strict()

const AccumulatorContentSchema = z
  .object({
    items: z.array(AccumulatedTextItemSchema),
    separator: z.string(),
  })
  .strict()
  .superRefine(({ items }, context) => {
    const identifiers = new Set(items.map(({ id }) => id))

    if (identifiers.size !== items.length) {
      context.addIssue({
        code: "custom",
        message: "Accumulator item identifiers must be unique",
        path: ["items"],
      })
    }
  })

export const AccumulatorRecordSchema = z
  .object({
    content: AccumulatorContentSchema,
    id: EntityIdSchema,
    revision: RevisionSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strict()

export type AccumulatedTextItem = z.infer<typeof AccumulatedTextItemSchema>
export type Accumulator = z.infer<typeof AccumulatorRecordSchema>

export interface AccumulatorRepository {
  get(): Promise<Accumulator | null>
  save(accumulator: Accumulator): Promise<Accumulator>
}

export function parseAccumulatorRecord(value: unknown): Accumulator {
  return AccumulatorRecordSchema.parse(value)
}
