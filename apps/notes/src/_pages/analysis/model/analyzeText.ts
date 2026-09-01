import type {
  AnalysisInput,
  AnalysisPair,
  AnalysisSourceLine,
} from "./analysisMessage"
import { compareAnalysisPairs } from "./analysisOrder"
import {
  calculateJaccard,
  createGraphemeNgramsFromSegments,
  splitGraphemes,
} from "./graphemeNgrams"
import {
  prepareAnalysisLines,
  type PreparedAnalysisLine,
} from "./normalizeLines"

type SurfaceFeatures = {
  graphemeCount: number
  ngrams: ReadonlySet<string>
}

function lineReference(line: PreparedAnalysisLine) {
  return {
    lineIndex: line.lineIndex,
    note: line.note,
  }
}

function sourceLine(line: PreparedAnalysisLine): AnalysisSourceLine {
  return {
    ...lineReference(line),
    rawText: line.rawText,
  }
}

function classifyPair(
  input: AnalysisInput,
  left: PreparedAnalysisLine,
  right: PreparedAnalysisLine,
  surfaceFeatures: (line: PreparedAnalysisLine) => SurfaceFeatures,
): AnalysisPair | null {
  const commonPair = {
    algorithm: input.algorithm,
    left: lineReference(left),
    right: lineReference(right),
  }

  if (left.normalizedText === right.normalizedText) {
    return { ...commonPair, relation: "exact", score: null }
  }

  const containment =
    left.normalizedText.includes(right.normalizedText) ||
    right.normalizedText.includes(left.normalizedText)

  if (containment) {
    return { ...commonPair, relation: "containment", score: null }
  }

  const leftSurface = surfaceFeatures(left)
  const rightSurface = surfaceFeatures(right)

  if (leftSurface.graphemeCount < 3 || rightSurface.graphemeCount < 3) {
    return null
  }

  const score = calculateJaccard(
    leftSurface.ngrams,
    rightSurface.ngrams,
  )

  if (score === 0) {
    return null
  }

  return { ...commonPair, relation: "surface", score }
}

export type TextAnalysisComputation = {
  results: AnalysisPair[]
  sourceLines: AnalysisSourceLine[]
}

export function analyzeText(input: AnalysisInput): TextAnalysisComputation {
  const lines = prepareAnalysisLines(input.notes)
  const results: AnalysisPair[] = []
  const resultLines = new Set<PreparedAnalysisLine>()
  const surfaceByLine = new Map<PreparedAnalysisLine, SurfaceFeatures>()

  function surfaceFeatures(line: PreparedAnalysisLine) {
    const existing = surfaceByLine.get(line)

    if (existing !== undefined) {
      return existing
    }

    const graphemes = splitGraphemes(line.normalizedText)
    const features = {
      graphemeCount: graphemes.length,
      ngrams: createGraphemeNgramsFromSegments(graphemes),
    }
    surfaceByLine.set(line, features)
    return features
  }

  for (let leftIndex = 0; leftIndex < lines.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < lines.length;
      rightIndex += 1
    ) {
      const pair = classifyPair(
        input,
        lines[leftIndex],
        lines[rightIndex],
        surfaceFeatures,
      )

      if (pair !== null) {
        results.push(pair)
        resultLines.add(lines[leftIndex])
        resultLines.add(lines[rightIndex])
      }
    }
  }

  return {
    results: results.sort(compareAnalysisPairs),
    sourceLines: lines.filter((line) => resultLines.has(line)).map(sourceLine),
  }
}
