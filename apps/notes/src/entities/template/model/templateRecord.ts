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
    key: z.string().trim().min(1),
    kind: z.literal("placeholder"),
    label: z.string().trim().min(1),
  })
  .strict()

export const TemplateSegmentSchema = z.discriminatedUnion("kind", [
  LiteralSegmentSchema,
  PlaceholderSegmentSchema,
])

export type TemplateSegment = z.infer<typeof TemplateSegmentSchema>

export type PlaceholderLabelIssue = {
  key: string
  reason: "duplicate" | "empty"
}

export function findPlaceholderLabelIssues(
  segments: readonly TemplateSegment[],
): readonly PlaceholderLabelIssue[] {
  const placeholders = segments.filter(
    (segment) => segment.kind === "placeholder",
  )
  const labelCounts = new Map<string, number>()

  for (const placeholder of placeholders) {
    const label = placeholder.label.trim()
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1)
  }

  const issues: PlaceholderLabelIssue[] = []

  for (const placeholder of placeholders) {
    const label = placeholder.label.trim()

    if (label.length === 0) {
      issues.push({ key: placeholder.key, reason: "empty" })
      continue
    }

    if ((labelCounts.get(label) ?? 0) > 1) {
      issues.push({ key: placeholder.key, reason: "duplicate" })
    }
  }

  return issues
}

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
    const placeholders = segments.filter(
      (segment) => segment.kind === "placeholder",
    )
    const keys = placeholders.map(({ key }) => key)
    const labelIssues = findPlaceholderLabelIssues(segments)

    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: "custom",
        message: "Placeholder keys must be unique",
        path: ["segments"],
      })
    }

    if (labelIssues.length > 0) {
      context.addIssue({
        code: "custom",
        message: "Placeholder labels must be unique",
        path: ["segments"],
      })
    }
  })

export type TextTemplate = z.infer<typeof TemplateRecordSchema>

export interface TemplateRepository {
  getAll(): Promise<readonly TextTemplate[]>
  save(template: TextTemplate): Promise<TextTemplate>
  remove(id: string): Promise<void>
}

export function parseTemplateRecord(value: unknown): TextTemplate {
  return TemplateRecordSchema.parse(value)
}
