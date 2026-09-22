import Link from "next/link"

import type {
  SelectedSourceLine,
  SelectedSourceLines,
} from "@/features/suggest-template"

type SourceLineCardProps = {
  line: SelectedSourceLine
}

function SourceLineCard({ line }: SourceLineCardProps) {
  const lineNumber = (line.lineIndex + 1).toLocaleString("ko-KR")
  const noteHref = `/#note-${encodeURIComponent(line.note.id)}`

  return (
    <li className="rounded-control border border-line bg-canvas p-3">
      <p className="whitespace-pre-wrap break-words text-sm leading-6">
        {line.textSnapshot}
      </p>
      <p className="mt-2 break-all text-xs text-soft-ink">
        메모 {line.note.id}, {lineNumber}번째 줄
      </p>
      <Link
        className="mt-2 inline-flex min-h-[var(--notes-control-size)] items-center text-sm font-semibold text-ink underline decoration-line-strong underline-offset-4"
        href={noteHref}
      >
        원본 메모로 이동
      </Link>
    </li>
  )
}

type SelectedSourceLinesPreviewProps = {
  selection: SelectedSourceLines
}

export function SelectedSourceLinesPreview({
  selection,
}: SelectedSourceLinesPreviewProps) {
  const lines = [selection.left, selection.right]

  return (
    <section aria-labelledby="selected-source-lines-title" className="grid gap-3">
      <h2 className="text-base font-bold" id="selected-source-lines-title">
        선택한 원문
      </h2>
      <ol className="grid gap-3 lg:grid-cols-2">
        {lines.map((line) => (
          <SourceLineCard
            key={`${line.note.id}:${line.lineIndex}`}
            line={line}
          />
        ))}
      </ol>
    </section>
  )
}
