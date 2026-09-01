import type { TemplateSegment } from "./templateRecord"

export type TemplatePlaceholderRange = {
  end: number
  key: string
  label: string
  start: number
}

export type TemplateDraft = {
  placeholders: readonly TemplatePlaceholderRange[]
  sourceText: string
}

type PlaceholderSelection = TemplatePlaceholderRange

export type MarkPlaceholderResult =
  | { status: "duplicate-key" | "empty" | "out-of-bounds" | "overlap" }
  | { draft: TemplateDraft; placeholder: TemplatePlaceholderRange; status: "updated" }

function compareRanges(
  left: TemplatePlaceholderRange,
  right: TemplatePlaceholderRange,
) {
  return left.start - right.start
}

export function createTemplateDraft(sourceText: string): TemplateDraft {
  return { placeholders: [], sourceText }
}

export function createTemplateDraftFromSegments(
  segments: readonly TemplateSegment[],
): TemplateDraft {
  const placeholders: TemplatePlaceholderRange[] = []
  let sourceText = ""

  for (const segment of segments) {
    if (segment.kind === "literal") {
      sourceText += segment.value
      continue
    }

    const defaultValue = segment.defaultValue ?? ""
    const start = sourceText.length
    sourceText += defaultValue
    placeholders.push({
      end: sourceText.length,
      key: segment.key,
      label: segment.label,
      start,
    })
  }

  return { placeholders, sourceText }
}

export function markPlaceholder(
  draft: TemplateDraft,
  selection: PlaceholderSelection,
): MarkPlaceholderResult {
  if (
    selection.start < 0 ||
    selection.end > draft.sourceText.length ||
    selection.start > selection.end
  ) {
    return { status: "out-of-bounds" }
  }

  if (selection.start === selection.end) {
    return { status: "empty" }
  }

  if (draft.placeholders.some(({ key }) => key === selection.key)) {
    return { status: "duplicate-key" }
  }

  const overlaps = draft.placeholders.some(
    (placeholder) =>
      selection.start < placeholder.end &&
      selection.end > placeholder.start,
  )

  if (overlaps) {
    return { status: "overlap" }
  }

  const placeholders = [...draft.placeholders, selection].sort(compareRanges)

  return {
    draft: { ...draft, placeholders },
    placeholder: selection,
    status: "updated",
  }
}

export function renamePlaceholder(
  draft: TemplateDraft,
  key: string,
  label: string,
): TemplateDraft {
  return {
    ...draft,
    placeholders: draft.placeholders.map((placeholder) =>
      placeholder.key === key ? { ...placeholder, label } : placeholder,
    ),
  }
}

export function restorePlaceholder(
  draft: TemplateDraft,
  key: string,
): TemplateDraft {
  return {
    ...draft,
    placeholders: draft.placeholders.filter(
      (placeholder) => placeholder.key !== key,
    ),
  }
}

export function toTemplateSegments(
  draft: TemplateDraft,
): readonly TemplateSegment[] {
  const segments: TemplateSegment[] = []
  let position = 0

  for (const placeholder of draft.placeholders) {
    if (position < placeholder.start) {
      segments.push({
        kind: "literal",
        value: draft.sourceText.slice(position, placeholder.start),
      })
    }

    segments.push({
      defaultValue: draft.sourceText.slice(
        placeholder.start,
        placeholder.end,
      ),
      key: placeholder.key,
      kind: "placeholder",
      label: placeholder.label,
    })
    position = placeholder.end
  }

  if (position < draft.sourceText.length) {
    segments.push({
      kind: "literal",
      value: draft.sourceText.slice(position),
    })
  }

  return segments
}
