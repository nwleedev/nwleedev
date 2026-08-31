import { describe, expect, it } from "vitest"

import { prepareAnalysisLines } from "./normalizeLines"

describe("prepareAnalysisLines", () => {
  it("normalizes whitespace, case, and canonical characters while preserving source lines", () => {
    const lines = prepareAnalysisLines([
      {
        content: "  A   B\r\n\rCafe\u0301!\n  \r끝",
        note: { contentRevision: 4, id: "note-z" },
      },
    ])

    expect(lines).toEqual([
      {
        lineIndex: 0,
        normalizedText: "a b",
        note: { contentRevision: 4, id: "note-z" },
        rawText: "  A   B",
      },
      {
        lineIndex: 2,
        normalizedText: "café!",
        note: { contentRevision: 4, id: "note-z" },
        rawText: "Cafe\u0301!",
      },
      {
        lineIndex: 4,
        normalizedText: "끝",
        note: { contentRevision: 4, id: "note-z" },
        rawText: "끝",
      },
    ])
  })

  it("sorts source positions by note identifier and line index", () => {
    const lines = prepareAnalysisLines([
      {
        content: "둘째\n셋째",
        note: { contentRevision: 1, id: "note-b" },
      },
      {
        content: "첫째",
        note: { contentRevision: 2, id: "note-a" },
      },
    ])

    expect(lines.map(({ lineIndex, note }) => [note.id, lineIndex])).toEqual([
      ["note-a", 0],
      ["note-b", 0],
      ["note-b", 1],
    ])
  })
})
