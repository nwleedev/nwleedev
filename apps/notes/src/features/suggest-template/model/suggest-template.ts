import type { TemplateSegment } from "@/entities/template"
import { splitGraphemes } from "@/shared/lib/grapheme"

type EditOperation = {
  kind: "common" | "left" | "right"
  value: string
}

export type TemplateSuggestion =
  | { status: "same" }
  | { status: "no-common-literal" }
  | { segments: readonly TemplateSegment[]; status: "suggested" }

function furthestPoint(points: ReadonlyMap<number, number>, diagonal: number) {
  return points.get(diagonal) ?? Number.NEGATIVE_INFINITY
}

function backtrack(
  trace: readonly ReadonlyMap<number, number>[],
  left: readonly string[],
  right: readonly string[],
) {
  const operations: EditOperation[] = []
  let leftIndex = left.length
  let rightIndex = right.length

  for (let distance = trace.length - 1; distance >= 0; distance -= 1) {
    const points = trace[distance]
    const diagonal = leftIndex - rightIndex
    const followsInsertion =
      diagonal === -distance ||
      (diagonal !== distance &&
        furthestPoint(points, diagonal - 1) <
          furthestPoint(points, diagonal + 1))
    const previousDiagonal = followsInsertion
      ? diagonal + 1
      : diagonal - 1
    const previousLeftIndex = points.get(previousDiagonal) ?? 0
    const previousRightIndex = previousLeftIndex - previousDiagonal

    while (
      leftIndex > previousLeftIndex &&
      rightIndex > previousRightIndex
    ) {
      operations.push({
        kind: "common",
        value: left[leftIndex - 1],
      })
      leftIndex -= 1
      rightIndex -= 1
    }

    if (distance === 0) {
      break
    }

    if (followsInsertion) {
      operations.push({ kind: "right", value: right[rightIndex - 1] })
      rightIndex -= 1
    } else {
      operations.push({ kind: "left", value: left[leftIndex - 1] })
      leftIndex -= 1
    }
  }

  return operations.reverse()
}

function shortestEditScript(
  left: readonly string[],
  right: readonly string[],
) {
  const maximumDistance = left.length + right.length
  const points = new Map<number, number>([[1, 0]])
  const trace: ReadonlyMap<number, number>[] = []

  for (let distance = 0; distance <= maximumDistance; distance += 1) {
    trace.push(new Map(points))

    for (
      let diagonal = -distance;
      diagonal <= distance;
      diagonal += 2
    ) {
      const followsInsertion =
        diagonal === -distance ||
        (diagonal !== distance &&
          furthestPoint(points, diagonal - 1) <
            furthestPoint(points, diagonal + 1))
      let leftIndex = followsInsertion
        ? furthestPoint(points, diagonal + 1)
        : furthestPoint(points, diagonal - 1) + 1

      if (!Number.isFinite(leftIndex)) {
        leftIndex = 0
      }

      let rightIndex = leftIndex - diagonal

      while (
        leftIndex < left.length &&
        rightIndex < right.length &&
        left[leftIndex] === right[rightIndex]
      ) {
        leftIndex += 1
        rightIndex += 1
      }

      points.set(diagonal, leftIndex)

      if (leftIndex >= left.length && rightIndex >= right.length) {
        return backtrack(trace, left, right)
      }
    }
  }

  return []
}

function appendLiteral(segments: TemplateSegment[], value: string) {
  if (value.length === 0) {
    return
  }

  const previous = segments.at(-1)

  if (previous?.kind === "literal") {
    previous.value += value
    return
  }

  segments.push({ kind: "literal", value })
}

function createSegments(operations: readonly EditOperation[]) {
  const segments: TemplateSegment[] = []
  let leftDifference = ""
  let rightDifference = ""
  let placeholderIndex = 0

  function flushDifference() {
    const defaultValue = leftDifference || rightDifference

    if (defaultValue.length === 0) {
      return
    }

    placeholderIndex += 1
    segments.push({
      defaultValue,
      key: `input-${placeholderIndex}`,
      kind: "placeholder",
      label: `입력값 ${placeholderIndex}`,
    })
    leftDifference = ""
    rightDifference = ""
  }

  for (const operation of operations) {
    if (operation.kind === "common") {
      flushDifference()
      appendLiteral(segments, operation.value)
      continue
    }

    if (operation.kind === "left") {
      leftDifference += operation.value
    } else {
      rightDifference += operation.value
    }
  }

  flushDifference()
  return segments
}

function hasMeaningfulLiteral(segments: readonly TemplateSegment[]) {
  const literalText = segments
    .flatMap((segment) =>
      segment.kind === "literal" ? [segment.value] : [],
    )
    .join("")

  return /[\p{L}\p{M}\p{N}]/u.test(literalText)
}

export function suggestTemplate(
  leftText: string,
  rightText: string,
): TemplateSuggestion {
  if (leftText === rightText) {
    return { status: "same" }
  }

  const operations = shortestEditScript(
    splitGraphemes(leftText),
    splitGraphemes(rightText),
  )
  const segments = createSegments(operations)

  if (!hasMeaningfulLiteral(segments)) {
    return { status: "no-common-literal" }
  }

  return { segments, status: "suggested" }
}
