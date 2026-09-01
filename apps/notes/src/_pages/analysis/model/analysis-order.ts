type OrderedLineReference = {
  lineIndex: number
  note: { id: string }
}

type OrderedAnalysisPair = {
  left: OrderedLineReference
  relation: "containment" | "exact" | "surface"
  right: OrderedLineReference
  score: number | null
}

const relationOrder = {
  exact: 0,
  containment: 1,
  surface: 2,
} as const

export function compareCodePointStrings(left: string, right: string) {
  const leftCodePoints = Array.from(left)
  const rightCodePoints = Array.from(right)
  const sharedLength = Math.min(leftCodePoints.length, rightCodePoints.length)

  for (let index = 0; index < sharedLength; index += 1) {
    const leftValue = leftCodePoints[index].codePointAt(0) ?? 0
    const rightValue = rightCodePoints[index].codePointAt(0) ?? 0

    if (leftValue !== rightValue) {
      return leftValue - rightValue
    }
  }

  return leftCodePoints.length - rightCodePoints.length
}

export function compareAnalysisLineReferences(
  left: OrderedLineReference,
  right: OrderedLineReference,
) {
  const noteComparison = compareCodePointStrings(left.note.id, right.note.id)

  if (noteComparison !== 0) {
    return noteComparison
  }

  return left.lineIndex - right.lineIndex
}

export function compareAnalysisPairs(
  left: OrderedAnalysisPair,
  right: OrderedAnalysisPair,
) {
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

  const leftComparison = compareAnalysisLineReferences(left.left, right.left)

  if (leftComparison !== 0) {
    return leftComparison
  }

  return compareAnalysisLineReferences(left.right, right.right)
}
