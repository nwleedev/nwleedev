import Link from "next/link"

import type { SelectedSourceLines } from "@/features/suggest-template"
import { Button } from "@/shared/ui/button"

import type { AnalysisSourceLine as AnalysisSourceLineValue } from "../model/analysis-message"
import type { AnalysisResultRow } from "../model/analysis-rows"
import type { CompletedTextAnalysis } from "../model/text-analysis-provider"

const completedTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
})

const scoreFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 1,
  style: "percent",
})

const relationLabels = {
  containment: "포함 관계",
  exact: "정확한 반복",
  surface: "문자열 근접 후보",
} as const

type AnalysisSourceLineProps = {
  line: AnalysisSourceLineValue
}

function AnalysisSourceLine({ line }: AnalysisSourceLineProps) {
  const lineNumber = (line.lineIndex + 1).toLocaleString("ko-KR")
  const noteHref = `/#note-${encodeURIComponent(line.note.id)}`

  return (
    <div className="min-w-0 rounded-control border border-line bg-canvas p-3">
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink">
        {line.rawText}
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
    </div>
  )
}

type AnalysisResultItemProps = {
  row: AnalysisResultRow
  onSuggest(row: AnalysisResultRow): void
}

function AnalysisResultItem({ onSuggest, row }: AnalysisResultItemProps) {
  const relationLabel = relationLabels[row.relation]
  const scoreText = row.score === null
    ? null
    : `문자열 근접 점수 ${scoreFormatter.format(row.score)}`

  return (
    <li className="grid gap-3 px-4 py-5 sm:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-sm font-bold text-ink">
          {relationLabel}
        </h3>
        {scoreText ? (
          <p className="text-xs font-semibold tabular-nums text-soft-ink">
            {scoreText}
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <AnalysisSourceLine line={row.left} />
        <AnalysisSourceLine line={row.right} />
      </div>
      <div className="flex justify-end">
        <Button onClick={() => onSuggest(row)} tone="quiet">
          이 두 줄로 템플릿 제안
        </Button>
      </div>
    </li>
  )
}

function selectedSourceLines(row: AnalysisResultRow): SelectedSourceLines {
  return {
    algorithm: row.algorithm,
    left: {
      lineIndex: row.left.lineIndex,
      note: row.left.note,
      textSnapshot: row.left.rawText,
    },
    right: {
      lineIndex: row.right.lineIndex,
      note: row.right.note,
      textSnapshot: row.right.rawText,
    },
  }
}

type AnalysisResultsProps = {
  completed: CompletedTextAnalysis
  onSuggest(selection: SelectedSourceLines): void
}

export function AnalysisResults({
  completed,
  onSuggest,
}: AnalysisResultsProps) {
  const completedAt = completedTimeFormatter.format(
    new Date(completed.completedAt),
  )
  const noteCount = completed.input.notes.length.toLocaleString("ko-KR")
  const resultCount = completed.rows.length.toLocaleString("ko-KR")

  function suggest(row: AnalysisResultRow) {
    onSuggest(selectedSourceLines(row))
  }

  if (completed.rows.length === 0) {
    return (
      <div className="grid gap-4">
        <p className="text-xs text-soft-ink">
          {noteCount}개 메모 분석 완료, {completedAt}
        </p>
        <p
          className="rounded-panel border border-line bg-surface-raised px-5 py-12 text-center text-sm text-soft-ink shadow-note"
          role="status"
        >
          분석 후보가 없습니다.
        </p>
      </div>
    )
  }

  return (
    <section aria-labelledby="analysis-results-title" className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-bold" id="analysis-results-title">
          분석 결과 {resultCount}개
        </h2>
        <p className="text-xs text-soft-ink">
          {noteCount}개 메모 분석 완료, {completedAt}
        </p>
      </div>
      <ol className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface-raised shadow-note">
        {completed.rows.map((row) => {
          const key = [
            row.left.note.id,
            row.left.lineIndex,
            row.right.note.id,
            row.right.lineIndex,
          ].join(":")

          return <AnalysisResultItem key={key} onSuggest={suggest} row={row} />
        })}
      </ol>
    </section>
  )
}
