import { z } from "zod"

import {
  EntityIdSchema,
  IsoDateTimeSchema,
  RevisionSchema,
} from "@/shared/lib/entity-metadata"

const LiteralSegmentSchema = z
  .object({
    kind: z.literal("literal"),
    value: z.string(),
  })
  .strict()

const PlaceholderSegmentSchema = z
  .object({
    defaultValue: z.string().optional(),
    key: z.string().min(1),
    kind: z.literal("placeholder"),
    label: z.string().min(1),
  })
  .strict()

export const TemplateSegmentSchema = z.discriminatedUnion("kind", [
  LiteralSegmentSchema,
  PlaceholderSegmentSchema,
])

export const TemplateRecordSchema = z
  .object({
    createdAt: IsoDateTimeSchema,
    id: EntityIdSchema,
    revision: RevisionSchema,
    segments: z.array(TemplateSegmentSchema),
    title: z.string().min(1),
    updatedAt: IsoDateTimeSchema,
  })
  .strict()
  .superRefine(({ segments }, context) => {
    const keys = segments.flatMap((segment) =>
      segment.kind === "placeholder" ? [segment.key] : [],
    )

    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: "custom",
        message: "Placeholder keys must be unique",
        path: ["segments"],
      })
    }
  })

export type TemplateSegment = z.infer<typeof TemplateSegmentSchema>
export type TextTemplate = z.infer<typeof TemplateRecordSchema>

export interface TemplateRepository {
  getAll(): Promise<readonly TextTemplate[]>
  save(template: TextTemplate): Promise<TextTemplate>
  remove(id: string): Promise<void>
}

export function parseTemplateRecord(value: unknown): TextTemplate {
  return TemplateRecordSchema.parse(value)
}
