import { describe, expect, it } from "vitest"

import type { AnalysisResponseMessage } from "./analysis-message"
import {
  analysisResponseIsCurrent,
  analysisResponseMatchesInput,
} from "./analysis-run-state"

const algorithm = { type: "surface-v1", version: "1" } as const
const response: AnalysisResponseMessage = {
  algorithm,
  inputNotes: [
    { contentRevision: 2, id: "note-one" },
    { contentRevision: 4, id: "note-two" },
  ],
  requestId: "request-one",
  results: [],
  sourceLines: [],
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

  it("rejects duplicate response notes even when the lengths match", () => {
    expect(
      analysisResponseIsCurrent(
        {
          ...response,
          inputNotes: [response.inputNotes[0], response.inputNotes[0]],
        },
        response.inputNotes,
        algorithm,
      ),
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

  it("binds a response to the notes and algorithm in its request", () => {
    const input = {
      algorithm,
      notes: [
        {
          content: "첫 메모",
          note: response.inputNotes[0],
        },
        {
          content: "둘째 메모",
          note: response.inputNotes[1],
        },
      ],
    }

    expect(analysisResponseMatchesInput(response, input)).toBe(true)
    expect(
      analysisResponseMatchesInput(
        {
          ...response,
          inputNotes: [
            response.inputNotes[0],
            { contentRevision: 1, id: "note-three" },
          ],
        },
        input,
      ),
    ).toBe(false)
  })

  it("rejects result lines that are absent from the request content", () => {
    const input = {
      algorithm,
      notes: [
        {
          content: "첫 줄\n둘째 줄",
          note: response.inputNotes[0],
        },
        {
          content: "다른 메모",
          note: response.inputNotes[1],
        },
      ],
    }
    const result = {
      algorithm,
      left: {
        lineIndex: 0,
        note: response.inputNotes[0],
      },
      relation: "surface" as const,
      right: {
        lineIndex: 1,
        note: response.inputNotes[0],
      },
      score: 0.25,
    }

    expect(
      analysisResponseMatchesInput(
        {
          ...response,
          results: [result],
          sourceLines: [
            { ...result.left, rawText: "첫 줄" },
            { ...result.right, rawText: "둘째 줄" },
          ],
        },
        input,
      ),
    ).toBe(true)
    expect(
      analysisResponseMatchesInput(
        {
          ...response,
          sourceLines: [
            { ...result.left, rawText: "첫 줄" },
            { ...result.right, lineIndex: 2, rawText: "없는 줄" },
          ],
        },
        input,
      ),
    ).toBe(false)
    expect(
      analysisResponseMatchesInput(
        {
          ...response,
          sourceLines: [
            { ...result.left, rawText: "첫 줄" },
            { ...result.right, rawText: "바뀐 원문" },
          ],
        },
        input,
      ),
    ).toBe(false)
  })
})
