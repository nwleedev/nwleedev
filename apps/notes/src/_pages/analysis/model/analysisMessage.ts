import { z } from "zod"

import { NoteContentReferenceSchema } from "@/entities/note"
import { AlgorithmReferenceSchema } from "@/shared/lib/algorithm-reference"
import { EntityIdSchema } from "@/shared/lib/entity-metadata"

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
    score: z.number().min(0).max(1),
  })
  .strict()

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

export interface TextAnalyzer {
  analyze(input: AnalysisInput): Promise<AnalysisResponseMessage>
}
