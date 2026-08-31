import { z } from "zod"

import { NoteContentReferenceSchema } from "@/entities/note"
import { AlgorithmReferenceSchema } from "@/shared/lib/algorithm-reference"
import { EntityIdSchema } from "@/shared/lib/entity-metadata"

export const TEXT_ANALYSIS_ALGORITHM = {
  type: "surface-v1",
  version: "1",
} as const

export const AnalysisLineReferenceSchema = z
  .object({
    lineIndex: z.number().int().nonnegative().safe(),
    note: NoteContentReferenceSchema,
  })
  .strict()

export const AnalysisPairSchema = z
  .object({
    algorithm: AlgorithmReferenceSchema,
    left: AnalysisLineReferenceSchema,
    relation: z.enum(["exact", "containment", "surface"]),
    right: AnalysisLineReferenceSchema,
    score: z.number().min(0).max(1).nullable(),
  })
  .strict()
  .superRefine((pair, context) => {
    if (pair.relation === "surface") {
      if (pair.score === null || pair.score === 0) {
        context.addIssue({
          code: "custom",
          message: "Surface analysis requires a positive score",
          path: ["score"],
        })
      }

      return
    }

    if (pair.score !== null) {
      context.addIssue({
        code: "custom",
        message: "Classified relations do not have a score",
        path: ["score"],
      })
    }
  })

const AnalysisInputNoteSchema = z
  .object({
    content: z.string(),
    note: NoteContentReferenceSchema,
  })
  .strict()

export const AnalysisRequestMessageSchema = z
  .object({
    algorithm: AlgorithmReferenceSchema,
    notes: z.array(AnalysisInputNoteSchema),
    requestId: EntityIdSchema,
    type: z.literal("analyze"),
  })
  .strict()

export const AnalysisResponseMessageSchema = z
  .object({
    algorithm: AlgorithmReferenceSchema,
    inputNotes: z.array(NoteContentReferenceSchema),
    requestId: EntityIdSchema,
    results: z.array(AnalysisPairSchema),
    type: z.literal("analysis-result"),
  })
  .strict()

export type AnalysisInput = Omit<
  z.infer<typeof AnalysisRequestMessageSchema>,
  "requestId" | "type"
>
export type AnalysisRequestMessage = z.infer<
  typeof AnalysisRequestMessageSchema
>
export type AnalysisResponseMessage = z.infer<
  typeof AnalysisResponseMessageSchema
>
export type AnalysisLineReference = z.infer<
  typeof AnalysisLineReferenceSchema
>
export type AnalysisPair = z.infer<typeof AnalysisPairSchema>

export interface TextAnalyzer {
  analyze(input: AnalysisInput): Promise<AnalysisResponseMessage>
}
