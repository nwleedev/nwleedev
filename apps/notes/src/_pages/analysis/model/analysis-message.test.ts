import { describe, expect, it } from "vitest"

import {
  AnalysisRequestMessageSchema,
  AnalysisResponseMessageSchema,
} from "./analysis-message"

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

const firstNote = request.notes[0].note
const secondNote = { contentRevision: 1, id: "note-2" }

function sourceLine(
  note: typeof firstNote,
  lineIndex: number,
  rawText: string,
) {
  return { lineIndex, note, rawText }
}

function lineReference(note: typeof firstNote, lineIndex: number) {
  return { lineIndex, note }
}

function validResponse() {
  return {
    algorithm: request.algorithm,
    inputNotes: [firstNote],
    requestId: request.requestId,
    results: [
      {
        algorithm: request.algorithm,
        left: lineReference(firstNote, 0),
        relation: "surface" as const,
        right: lineReference(firstNote, 1),
        score: 0.25,
      },
    ],
    sourceLines: [
      sourceLine(firstNote, 0, "첫 줄"),
      sourceLine(firstNote, 1, "둘째 줄"),
    ],
    type: "analysis-result" as const,
  }
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

  it("rejects duplicate note identifiers in one request", () => {
    expect(
      AnalysisRequestMessageSchema.safeParse({
        ...request,
        notes: [request.notes[0], request.notes[0]],
      }).success,
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
      sourceLines: [
        sourceLine(request.notes[0].note, 0, "첫 줄"),
        sourceLine(request.notes[0].note, 1, "둘째 줄"),
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

  it("rejects duplicate input notes and lines outside the input set", () => {
    const response = validResponse()

    expect(
      AnalysisResponseMessageSchema.safeParse({
        ...response,
        inputNotes: [firstNote, firstNote],
      }).success,
    ).toBe(false)
    expect(
      AnalysisResponseMessageSchema.safeParse({
        ...response,
        sourceLines: [
          response.sourceLines[0],
          sourceLine(secondNote, 0, "다른 메모"),
        ],
        results: [
          {
            ...response.results[0],
            right: lineReference(secondNote, 0),
          },
        ],
      }).success,
    ).toBe(false)
  })

  it("rejects duplicate source lines and result references without snapshots", () => {
    const response = validResponse()

    expect(
      AnalysisResponseMessageSchema.safeParse({
        ...response,
        sourceLines: [response.sourceLines[0], response.sourceLines[0]],
      }).success,
    ).toBe(false)
    expect(
      AnalysisResponseMessageSchema.safeParse({
        ...response,
        sourceLines: [response.sourceLines[0]],
      }).success,
    ).toBe(false)
  })

  it("rejects self comparisons, reverse order and duplicate pairs", () => {
    const response = validResponse()
    const [pair] = response.results

    expect(
      AnalysisResponseMessageSchema.safeParse({
        ...response,
        results: [{ ...pair, right: pair.left }],
      }).success,
    ).toBe(false)
    expect(
      AnalysisResponseMessageSchema.safeParse({
        ...response,
        results: [{ ...pair, left: pair.right, right: pair.left }],
      }).success,
    ).toBe(false)
    expect(
      AnalysisResponseMessageSchema.safeParse({
        ...response,
        results: [pair, pair],
      }).success,
    ).toBe(false)
  })

  it("rejects pair algorithms and result order that differ from the response", () => {
    const response = validResponse()
    const exactPair = {
      ...response.results[0],
      relation: "exact" as const,
      score: null,
    }

    expect(
      AnalysisResponseMessageSchema.safeParse({
        ...response,
        results: [
          {
            ...response.results[0],
            algorithm: { ...request.algorithm, version: "2" },
          },
        ],
      }).success,
    ).toBe(false)
    expect(
      AnalysisResponseMessageSchema.safeParse({
        ...response,
        inputNotes: [firstNote, secondNote],
        sourceLines: [
          ...response.sourceLines,
          sourceLine(secondNote, 0, "다른 메모"),
        ],
        results: [
          {
            ...response.results[0],
            right: lineReference(secondNote, 0),
          },
          exactPair,
        ],
      }).success,
    ).toBe(false)
  })
})
