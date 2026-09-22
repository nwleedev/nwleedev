import {
  analysisLineReferenceKey,
  type AnalysisPair,
  type AnalysisResponseMessage,
  type AnalysisSourceLine,
} from "./analysis-message"

export type AnalysisResultRow = Omit<AnalysisPair, "left" | "right"> & {
  left: AnalysisSourceLine
  right: AnalysisSourceLine
}

export function createAnalysisRows(
  response: AnalysisResponseMessage,
): readonly AnalysisResultRow[] | null {
  const sourceLines = new Map<string, AnalysisSourceLine>()

  for (const line of response.sourceLines) {
    const key = analysisLineReferenceKey(line)

    if (sourceLines.has(key)) {
      return null
    }

    sourceLines.set(key, line)
  }

  const rows: AnalysisResultRow[] = []

  for (const result of response.results) {
    const left = sourceLines.get(analysisLineReferenceKey(result.left))
    const right = sourceLines.get(analysisLineReferenceKey(result.right))

    if (left === undefined || right === undefined) {
      return null
    }

    rows.push({ ...result, left, right })
  }

  return rows
}
