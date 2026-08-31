import type {
  AnalysisInput,
  AnalysisPair,
  AnalysisLineReference,
} from "./analysisMessage"
import {
  calculateJaccard,
  createGraphemeNgrams,
  splitGraphemes,
} from "./graphemeNgrams"
import {
  compareCodePointStrings,
  prepareAnalysisLines,
  type PreparedAnalysisLine,
} from "./normalizeLines"

const relationOrder = {
  exact: 0,
  containment: 1,
  surface: 2,
} as const

function lineReference(line: PreparedAnalysisLine): AnalysisLineReference {
  return { lineIndex: line.lineIndex, note: line.note }
}

function compareReferences(
  left: AnalysisLineReference,
  right: AnalysisLineReference,
) {
  const noteComparison = compareCodePointStrings(left.note.id, right.note.id)

  if (noteComparison !== 0) {
    return noteComparison
  }

  return left.lineIndex - right.lineIndex
}

function comparePairs(left: AnalysisPair, right: AnalysisPair) {
  const relationComparison =
    relationOrder[left.relation] - relationOrder[right.relation]

  if (relationComparison !== 0) {
    return relationComparison
  }

  if (left.relation === "surface" && right.relation === "surface") {
    const scoreComparison = (right.score ?? 0) - (left.score ?? 0)

    if (scoreComparison !== 0) {
      return scoreComparison
    }
  }

  const leftComparison = compareReferences(left.left, right.left)

  if (leftComparison !== 0) {
    return leftComparison
  }

  return compareReferences(left.right, right.right)
}

function classifyPair(
  input: AnalysisInput,
  left: PreparedAnalysisLine,
  right: PreparedAnalysisLine,
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

  const leftGraphemes = splitGraphemes(left.normalizedText)
  const rightGraphemes = splitGraphemes(right.normalizedText)

  if (leftGraphemes.length < 3 || rightGraphemes.length < 3) {
    return null
  }

  const score = calculateJaccard(
    createGraphemeNgrams(left.normalizedText),
    createGraphemeNgrams(right.normalizedText),
  )

  if (score === 0) {
    return null
  }

  return { ...commonPair, relation: "surface", score }
}

export function analyzeText(input: AnalysisInput): readonly AnalysisPair[] {
  const lines = prepareAnalysisLines(input.notes)
  const results: AnalysisPair[] = []

  for (let leftIndex = 0; leftIndex < lines.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < lines.length;
      rightIndex += 1
    ) {
      const pair = classifyPair(input, lines[leftIndex], lines[rightIndex])

      if (pair !== null) {
        results.push(pair)
      }
    }
  }

  return results.sort(comparePairs)
}
