import type { TemplateSegment } from "./template-record"

export function renderTemplate(
  segments: readonly TemplateSegment[],
  values: Readonly<Record<string, string>>,
) {
  return segments
    .map((segment) => {
      if (segment.kind === "literal") {
        return segment.value
      }

      return values[segment.key] ?? segment.defaultValue ?? ""
    })
    .join("")
}
