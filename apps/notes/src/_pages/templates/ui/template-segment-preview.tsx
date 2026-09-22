import type { TemplateSegment } from "@/entities/template"

type TemplateSegmentPreviewProps = {
  segments: readonly TemplateSegment[]
}

export function TemplateSegmentPreview({
  segments,
}: TemplateSegmentPreviewProps) {
  return (
    <p
      aria-label="템플릿 미리보기"
      className="whitespace-pre-wrap break-words rounded-control border border-line bg-canvas px-4 py-3 text-sm leading-7 text-ink"
    >
      {segments.map((segment, index) => {
        if (segment.kind === "literal") {
          return <span key={`literal-${index}`}>{segment.value}</span>
        }

        return (
          <span
            className="mx-0.5 inline rounded-control border border-action/35 bg-action/10 px-1.5 py-0.5 font-semibold text-ink"
            key={segment.key}
          >
            <span className="sr-only">{segment.label}: </span>
            {segment.defaultValue ?? segment.label}
          </span>
        )
      })}
    </p>
  )
}
