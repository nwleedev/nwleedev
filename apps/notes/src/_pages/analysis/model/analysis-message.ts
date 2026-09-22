import { z } from "zod"

import { NoteContentReferenceSchema } from "@/entities/note"
import { AlgorithmReferenceSchema } from "@/shared/lib/algorithm-reference"
import { EntityIdSchema } from "@/shared/lib/entity-metadata"

import {
  compareAnalysisLineReferences,
  compareAnalysisPairs,
} from "./analysis-order"

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

export const AnalysisSourceLineSchema = z
  .object({
    lineIndex: z.number().int().nonnegative().safe(),
    note: NoteContentReferenceSchema,
    rawText: z.string(),
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

function noteReferenceKey(note: z.infer<typeof NoteContentReferenceSchema>) {
  return JSON.stringify([note.id, note.contentRevision])
}

export function analysisLineReferenceKey(
  line: z.infer<typeof AnalysisLineReferenceSchema>,
) {
  return JSON.stringify([
    line.note.id,
    line.note.contentRevision,
    line.lineIndex,
  ])
}

export const AnalysisRequestMessageSchema = z
  .object({
    algorithm: AlgorithmReferenceSchema,
    notes: z.array(AnalysisInputNoteSchema),
    requestId: EntityIdSchema,
    type: z.literal("analyze"),
  })
  .strict()
  .superRefine(({ notes }, context) => {
    const noteIds = new Set(notes.map(({ note }) => note.id))

    if (noteIds.size !== notes.length) {
      context.addIssue({
        code: "custom",
        message: "Analysis input note identifiers must be unique",
        path: ["notes"],
      })
    }
  })

export const AnalysisResponseMessageSchema = z
  .object({
    algorithm: AlgorithmReferenceSchema,
    inputNotes: z.array(NoteContentReferenceSchema),
    requestId: EntityIdSchema,
    results: z.array(AnalysisPairSchema),
    sourceLines: z.array(AnalysisSourceLineSchema),
    type: z.literal("analysis-result"),
  })
  .strict()
  .superRefine((response, context) => {
    const inputNoteIds = new Set(response.inputNotes.map(({ id }) => id))
    const inputReferences = new Set(
      response.inputNotes.map(noteReferenceKey),
    )
    const pairKeys = new Set<string>()
    const sourceLineKeys = new Set<string>()

    if (inputNoteIds.size !== response.inputNotes.length) {
      context.addIssue({
        code: "custom",
        message: "Analysis response note identifiers must be unique",
        path: ["inputNotes"],
      })
    }

    for (const [index, line] of response.sourceLines.entries()) {
      const lineKey = analysisLineReferenceKey(line)
      const previous = response.sourceLines[index - 1]

      if (!inputReferences.has(noteReferenceKey(line.note))) {
        context.addIssue({
          code: "custom",
          message: "Analysis source line must reference an input note",
          path: ["sourceLines", index],
        })
      }

      if (sourceLineKeys.has(lineKey)) {
        context.addIssue({
          code: "custom",
          message: "Analysis source lines must be unique",
          path: ["sourceLines", index],
        })
      }

      if (
        previous !== undefined &&
        compareAnalysisLineReferences(previous, line) > 0
      ) {
        context.addIssue({
          code: "custom",
          message: "Analysis source lines must use deterministic order",
          path: ["sourceLines", index],
        })
      }

      sourceLineKeys.add(lineKey)
    }

    for (const [index, pair] of response.results.entries()) {
      const leftKey = analysisLineReferenceKey(pair.left)
      const rightKey = analysisLineReferenceKey(pair.right)
      const pairKey = JSON.stringify([leftKey, rightKey])
      const previous = response.results[index - 1]

      if (
        pair.algorithm.type !== response.algorithm.type ||
        pair.algorithm.version !== response.algorithm.version
      ) {
        context.addIssue({
          code: "custom",
          message: "Analysis pair algorithm must match the response",
          path: ["results", index, "algorithm"],
        })
      }

      if (!sourceLineKeys.has(leftKey)) {
        context.addIssue({
          code: "custom",
          message: "Analysis left line must reference a source line",
          path: ["results", index, "left"],
        })
      }

      if (!sourceLineKeys.has(rightKey)) {
        context.addIssue({
          code: "custom",
          message: "Analysis right line must reference a source line",
          path: ["results", index, "right"],
        })
      }

      if (compareAnalysisLineReferences(pair.left, pair.right) >= 0) {
        context.addIssue({
          code: "custom",
          message: "Analysis pair lines must use canonical order",
          path: ["results", index],
        })
      }

      if (pairKeys.has(pairKey)) {
        context.addIssue({
          code: "custom",
          message: "Analysis response pairs must be unique",
          path: ["results", index],
        })
      }

      if (previous !== undefined && compareAnalysisPairs(previous, pair) > 0) {
        context.addIssue({
          code: "custom",
          message: "Analysis response pairs must use deterministic order",
          path: ["results", index],
        })
      }

      pairKeys.add(pairKey)
    }
  })

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
export type AnalysisSourceLine = z.infer<typeof AnalysisSourceLineSchema>
export type AnalysisPair = z.infer<typeof AnalysisPairSchema>

export interface TextAnalyzer {
  analyze(input: AnalysisInput): Promise<AnalysisResponseMessage>
}
