import { describe, expect, it } from "vitest"

import {
  createTemplateDraft,
  createTemplateDraftFromSegments,
  markPlaceholder,
  renamePlaceholder,
  restorePlaceholder,
  toTemplateSegments,
  type MarkPlaceholderResult,
} from "./editSegments"

function requireUpdated(result: MarkPlaceholderResult) {
  if (result.status !== "updated") {
    throw new Error("The placeholder was not created")
  }

  return result.draft
}

describe("template segment editing", () => {
  it("creates ordered segments without empty literals at the edges", () => {
    const initial = createTemplateDraft("첫째와 둘째")
    const first = markPlaceholder(initial, {
      end: 2,
      key: "first",
      label: "첫 번째",
      start: 0,
    })
    expect(first.status).toBe("updated")
    const second = markPlaceholder(requireUpdated(first), {
      end: 6,
      key: "second",
      label: "두 번째",
      start: 4,
    })
    expect(second.status).toBe("updated")
    expect(toTemplateSegments(requireUpdated(second))).toEqual([
      {
        defaultValue: "첫째",
        key: "first",
        kind: "placeholder",
        label: "첫 번째",
      },
      { kind: "literal", value: "와 " },
      {
        defaultValue: "둘째",
        key: "second",
        kind: "placeholder",
        label: "두 번째",
      },
    ])
  })

  it("rejects empty, overlapping and out-of-bounds selections", () => {
    const initial = createTemplateDraft("abcdef")
    const first = markPlaceholder(initial, {
      end: 4,
      key: "middle",
      label: "가운데",
      start: 2,
    })
    const firstDraft = requireUpdated(first)

    expect(
      markPlaceholder(firstDraft, {
        end: 5,
        key: "overlap",
        label: "겹침",
        start: 3,
      }).status,
    ).toBe("overlap")
    expect(
      markPlaceholder(firstDraft, {
        end: 1,
        key: "empty",
        label: "빈 선택",
        start: 1,
      }).status,
    ).toBe("empty")
    expect(
      markPlaceholder(firstDraft, {
        end: 7,
        key: "outside",
        label: "바깥",
        start: 6,
      }).status,
    ).toBe("out-of-bounds")
  })

  it("restores a placeholder as literal text in the same position", () => {
    const draft = createTemplateDraftFromSegments([
      { kind: "literal", value: "요청 " },
      {
        defaultValue: "123",
        key: "number",
        kind: "placeholder",
        label: "번호",
      },
      { kind: "literal", value: " 완료" },
    ])
    const restored = restorePlaceholder(draft, "number")

    expect(restored.sourceText).toBe("요청 123 완료")
    expect(toTemplateSegments(restored)).toEqual([
      { kind: "literal", value: "요청 123 완료" },
    ])
  })

  it("renames a placeholder without changing its selected text", () => {
    const draft = createTemplateDraftFromSegments([
      {
        defaultValue: "서울",
        key: "location",
        kind: "placeholder",
        label: "장소",
      },
    ])
    const renamed = renamePlaceholder(draft, "location", "지역")

    expect(toTemplateSegments(renamed)).toEqual([
      {
        defaultValue: "서울",
        key: "location",
        kind: "placeholder",
        label: "지역",
      },
    ])
  })
})
