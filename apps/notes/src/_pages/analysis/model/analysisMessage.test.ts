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
})
