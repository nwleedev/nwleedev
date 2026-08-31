import type {
  AnalysisInput,
  AnalysisPair,
  AnalysisResponseMessage,
} from "./analysisMessage"
import {
  prepareAnalysisLines,
  type PreparedAnalysisLine,
} from "./normalizeLines"

export type AnalysisResultRow = Omit<AnalysisPair, "left" | "right"> & {
  left: PreparedAnalysisLine
  right: PreparedAnalysisLine
}

function lineKey(
  noteId: string,
  contentRevision: number,
  lineIndex: number,
) {
  return JSON.stringify([noteId, contentRevision, lineIndex])
}

export function projectAnalysisResults(
  input: AnalysisInput,
  response: AnalysisResponseMessage,
): readonly AnalysisResultRow[] | null {
  const lineByKey = new Map(
    prepareAnalysisLines(input.notes).map((line) => [
      lineKey(line.note.id, line.note.contentRevision, line.lineIndex),
      line,
    ]),
  )
  const rows: AnalysisResultRow[] = []

  for (const pair of response.results) {
    const left = lineByKey.get(
      lineKey(
        pair.left.note.id,
        pair.left.note.contentRevision,
        pair.left.lineIndex,
      ),
    )
    const right = lineByKey.get(
      lineKey(
        pair.right.note.id,
        pair.right.note.contentRevision,
        pair.right.lineIndex,
      ),
    )

    if (left === undefined || right === undefined) {
      return null
    }

    rows.push({
      algorithm: pair.algorithm,
      left,
      relation: pair.relation,
      right,
      score: pair.score,
    })
  }

  return rows
}
