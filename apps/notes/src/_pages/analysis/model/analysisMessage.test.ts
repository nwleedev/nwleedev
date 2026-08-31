import { describe, expect, it } from "vitest"

import {
  AnalysisRequestMessageSchema,
  AnalysisResponseMessageSchema,
} from "./analysisMessage"

const request = {
  algorithm: { type: "surface-v1", version: "1" },
  notes: [
    {
      content: "첫 줄\n둘째 줄",
      note: { contentRevision: 2, id: "note-1" },
    },
  ],
  requestId: "request-1",
  type: "analyze",
}

describe("analysis Worker message schemas", () => {
  it("accepts a request with nested note and algorithm references", () => {
    expect(AnalysisRequestMessageSchema.safeParse(request).success).toBe(true)
  })

  it("rejects a request without its algorithm identity", () => {
    const missingAlgorithm = {
      notes: request.notes,
      requestId: request.requestId,
      type: request.type,
    }

    expect(
      AnalysisRequestMessageSchema.safeParse(missingAlgorithm).success,
    ).toBe(false)
  })

  it("rejects an unknown response message", () => {
    expect(
      AnalysisResponseMessageSchema.safeParse({
        requestId: "request-1",
        type: "unrecognized",
      }).success,
    ).toBe(false)
  })

  it("distinguishes classified relations from calculated scores", () => {
    const response = {
      algorithm: request.algorithm,
      inputNotes: request.notes.map(({ note }) => note),
      requestId: request.requestId,
      results: [
        {
          algorithm: request.algorithm,
          left: { lineIndex: 0, note: request.notes[0].note },
          relation: "exact",
          right: { lineIndex: 1, note: request.notes[0].note },
          score: 1,
        },
      ],
      type: "analysis-result",
    }

    expect(AnalysisResponseMessageSchema.safeParse(response).success).toBe(
      false,
    )
    expect(
      AnalysisResponseMessageSchema.safeParse({
        ...response,
        results: [
          {
            ...response.results[0],
            relation: "surface",
            score: null,
          },
        ],
      }).success,
    ).toBe(false)
  })
})
