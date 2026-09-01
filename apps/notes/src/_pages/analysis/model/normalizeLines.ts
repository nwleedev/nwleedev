import type { NoteContentReference } from "@/entities/note"

import { compareCodePointStrings } from "./analysisOrder"

export type AnalysisSourceNote = {
  content: string
  note: NoteContentReference
}

export type PreparedAnalysisLine = {
  lineIndex: number
  normalizedText: string
  note: NoteContentReference
  rawText: string
}

export function normalizeAnalysisText(rawText: string) {
  return rawText
    .trim()
    .replace(/\s+/gu, " ")
    .normalize("NFC")
    .toLowerCase()
    .normalize("NFC")
}

function compareLines(left: PreparedAnalysisLine, right: PreparedAnalysisLine) {
  const noteComparison = compareCodePointStrings(left.note.id, right.note.id)

  if (noteComparison !== 0) {
    return noteComparison
  }

  return left.lineIndex - right.lineIndex
}

export function prepareAnalysisLines(
  notes: readonly AnalysisSourceNote[],
): readonly PreparedAnalysisLine[] {
  const lines: PreparedAnalysisLine[] = []

  for (const source of notes) {
    const rawLines = source.content.split(/\r\n|\r|\n/u)

    for (const [lineIndex, rawText] of rawLines.entries()) {
      const normalizedText = normalizeAnalysisText(rawText)

      if (normalizedText.length === 0) {
        continue
      }

      lines.push({
        lineIndex,
        normalizedText,
        note: source.note,
        rawText,
      })
    }
  }

  return lines.sort(compareLines)
}
