import { describe, expect, it } from "vitest"

import type { AnalysisResponseMessage } from "./analysisMessage"
import { analysisResponseIsCurrent } from "./analysisRunState"

const algorithm = { type: "surface-v1", version: "1" } as const
const response: AnalysisResponseMessage = {
  algorithm,
  inputNotes: [
    { contentRevision: 2, id: "note-one" },
    { contentRevision: 4, id: "note-two" },
  ],
  requestId: "request-one",
  results: [],
  type: "analysis-result",
}

describe("analysisResponseIsCurrent", () => {
  it("accepts matching content revisions regardless of input order", () => {
    expect(
      analysisResponseIsCurrent(response, [
        { contentRevision: 4, id: "note-two" },
        { contentRevision: 2, id: "note-one" },
      ], algorithm),
    ).toBe(true)
  })

  it("rejects changed content revisions and note sets", () => {
    expect(
      analysisResponseIsCurrent(response, [
        { contentRevision: 3, id: "note-one" },
        { contentRevision: 4, id: "note-two" },
      ], algorithm),
    ).toBe(false)
    expect(
      analysisResponseIsCurrent(response, [
        { contentRevision: 2, id: "note-one" },
      ], algorithm),
    ).toBe(false)
  })

  it("rejects a response from another algorithm version", () => {
    expect(
      analysisResponseIsCurrent(response, response.inputNotes, {
        type: "surface-v1",
        version: "2",
      }),
    ).toBe(false)
  })
})
