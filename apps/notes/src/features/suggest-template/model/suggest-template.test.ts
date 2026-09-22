import { describe, expect, it } from "vitest"

import { suggestTemplate } from "./suggest-template"

describe("suggestTemplate", () => {
  it("preserves common text and creates a placeholder for every separated difference", () => {
    const suggestion = suggestTemplate(
      "αα[COMMON-ONE]ββ[COMMON-TWO]γγ",
      "δδ[COMMON-ONE]εε[COMMON-TWO]ζη",
    )

    expect(suggestion).toEqual({
      segments: [
        {
          defaultValue: "αα",
          key: "input-1",
          kind: "placeholder",
          label: "입력값 1",
        },
        { kind: "literal", value: "[COMMON-ONE]" },
        {
          defaultValue: "ββ",
          key: "input-2",
          kind: "placeholder",
          label: "입력값 2",
        },
        { kind: "literal", value: "[COMMON-TWO]" },
        {
          defaultValue: "γγ",
          key: "input-3",
          kind: "placeholder",
          label: "입력값 3",
        },
      ],
      status: "suggested",
    })
  })

  it("uses a complete grapheme as one difference", () => {
    const suggestion = suggestTemplate(
      "👨‍👩‍👧‍👦-123",
      "👩‍👩‍👧-123",
    )

    expect(suggestion).toEqual({
      segments: [
        {
          defaultValue: "👨‍👩‍👧‍👦",
          key: "input-1",
          kind: "placeholder",
          label: "입력값 1",
        },
        { kind: "literal", value: "-123" },
      ],
      status: "suggested",
    })
  })

  it("uses inserted text as the placeholder default", () => {
    const suggestion = suggestTemplate("[A][B]", "[A]value[B]")

    expect(suggestion).toEqual({
      segments: [
        { kind: "literal", value: "[A]" },
        {
          defaultValue: "value",
          key: "input-1",
          kind: "placeholder",
          label: "입력값 1",
        },
        { kind: "literal", value: "[B]" },
      ],
      status: "suggested",
    })
  })

  it("does not propose a template for the same line", () => {
    expect(suggestTemplate("같은 줄", "같은 줄")).toEqual({
      status: "same",
    })
  })

  it("does not propose a template without meaningful common text", () => {
    expect(suggestTemplate("가나다 - ", "라마바사 - ")).toEqual({
      status: "no-common-literal",
    })
  })
})
