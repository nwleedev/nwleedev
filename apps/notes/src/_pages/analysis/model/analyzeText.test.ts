import { describe, expect, it } from "vitest"

import { analyzeText } from "./analyzeText"
import { createGraphemeNgrams } from "./graphemeNgrams"

const algorithm = { type: "surface-v1", version: "1" } as const

describe("createGraphemeNgrams", () => {
  it("segments extended grapheme clusters instead of UTF-16 code units", () => {
    expect([...createGraphemeNgrams("👨‍👩‍👧‍👦가나다")]).toEqual([
      "👨‍👩‍👧‍👦가나",
      "가나다",
    ])
  })
})

describe("analyzeText", () => {
  it.each([
    ["한 줄", 0],
    ["첫 줄\n첫 줄", 1],
    ["첫 줄\n첫 줄\n첫 줄", 3],
  ])("creates every source pair for %s", (content, pairCount) => {
    const analysis = analyzeText({
      algorithm,
      notes: [
        {
          content,
          note: { contentRevision: 1, id: "note-one" },
        },
      ],
    })

    expect(analysis.results).toHaveLength(pairCount)
  })

  it("compares each source position once inside the same note", () => {
    const analysis = analyzeText({
      algorithm,
      notes: [
        {
          content: "Same\nsame\nSame extra",
          note: { contentRevision: 2, id: "note-one" },
        },
      ],
    })

    expect(analysis.results).toHaveLength(3)
    expect(analysis.sourceLines).toHaveLength(3)
    expect(analysis.results.map(({ left, relation, right, score }) => ({
      left: left.lineIndex,
      relation,
      right: right.lineIndex,
      score,
    }))).toEqual([
      { left: 0, relation: "exact", right: 1, score: null },
      { left: 0, relation: "containment", right: 2, score: null },
      { left: 1, relation: "containment", right: 2, score: null },
    ])
  })

  it("returns positive surface candidates and excludes zero or short comparisons", () => {
    const { results } = analyzeText({
      algorithm,
      notes: [
        {
          content: "abcdef\nabcxyz\nxyz\nab\nac",
          note: { contentRevision: 1, id: "note-one" },
        },
      ],
    })
    const surfaceResult = results.find(
      ({ left, right }) => left.lineIndex === 0 && right.lineIndex === 1,
    )
    const zeroResult = results.find(
      ({ left, right }) => left.lineIndex === 0 && right.lineIndex === 2,
    )
    const shortResult = results.find(
      ({ left, right }) => left.lineIndex === 3 && right.lineIndex === 4,
    )

    expect(surfaceResult).toMatchObject({
      relation: "surface",
      score: 1 / 7,
    })
    expect(zeroResult).toBeUndefined()
    expect(shortResult).toBeUndefined()
  })

  it("uses source positions as stable tie breakers", () => {
    const { results } = analyzeText({
      algorithm,
      notes: [
        {
          content: "abcdef\nabcxyz\nabcuvw",
          note: { contentRevision: 1, id: "note-one" },
        },
      ],
    })

    expect(results.map(({ left, right }) => [
      left.lineIndex,
      right.lineIndex,
    ])).toEqual([
      [0, 1],
      [0, 2],
      [1, 2],
    ])
  })

  it("uses note identifiers before line positions for equal scores", () => {
    const { results } = analyzeText({
      algorithm,
      notes: [
        {
          content: "abcdef",
          note: { contentRevision: 1, id: "note-b" },
        },
        {
          content: "abcxyz\nabcuvw",
          note: { contentRevision: 1, id: "note-a" },
        },
      ],
    })

    expect(results.map(({ left, right }) => [
      [left.note.id, left.lineIndex],
      [right.note.id, right.lineIndex],
    ])).toEqual([
      [["note-a", 0], ["note-a", 1]],
      [["note-a", 0], ["note-b", 0]],
      [["note-a", 1], ["note-b", 0]],
    ])
  })
})
