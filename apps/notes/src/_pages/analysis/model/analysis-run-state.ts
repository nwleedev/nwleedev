import type { AnalysisNote } from "./analysis-message"
import type { AlgorithmReference } from "@/shared/lib/algorithm-reference"

import type {
  AnalysisInput,
  AnalysisResponseMessage,
  AnalysisSourceLine,
} from "./analysis-message"
import { normalizeAnalysisText } from "./normalize-lines"

function algorithmsAreEqual(
  left: AlgorithmReference,
  right: AlgorithmReference,
) {
  return left.type === right.type && left.version === right.version
}

export function analysisResponseUsesAlgorithm(
  response: AnalysisResponseMessage,
  algorithm: AlgorithmReference,
) {
  if (!algorithmsAreEqual(response.algorithm, algorithm)) {
    return false
  }

  return response.results.every(({ algorithm: pair }) =>
    algorithmsAreEqual(pair, algorithm),
  )
}

function contentReferencesAreEqual(
  left: readonly AnalysisNote[],
  right: readonly AnalysisNote[],
) {
  if (left.length !== right.length) {
    return false
  }

  const leftKeyByNote = new Map(
    left.map(({ contentKey, id }) => [id, contentKey]),
  )
  const rightKeyByNote = new Map(
    right.map(({ contentKey, id }) => [id, contentKey]),
  )

  if (
    leftKeyByNote.size !== left.length ||
    rightKeyByNote.size !== right.length
  ) {
    return false
  }

  return left.every(({ contentKey, id }) =>
    rightKeyByNote.get(id) === contentKey,
  )
}

function resultLinesMatchInput(
  response: AnalysisResponseMessage,
  input: AnalysisInput,
) {
  const sourceNotes = new Map(
    input.notes.map((source) => [source.note.id, source]),
  )
  const rawLinesByNote = new Map<string, readonly string[]>()

  function lineMatchesInput(line: AnalysisSourceLine) {
    const source = sourceNotes.get(line.note.id)

    if (
      source === undefined ||
      source.note.contentKey !== line.note.contentKey
    ) {
      return false
    }

    let rawLines = rawLinesByNote.get(line.note.id)

    if (rawLines === undefined) {
      rawLines = source.content.split(/\r\n|\r|\n/u)
      rawLinesByNote.set(line.note.id, rawLines)
    }

    const rawText = rawLines[line.lineIndex]
    return (
      rawText !== undefined &&
      rawText === line.rawText &&
      normalizeAnalysisText(rawText).length > 0
    )
  }

  return response.sourceLines.every(lineMatchesInput)
}

export function analysisResponseMatchesInput(
  response: AnalysisResponseMessage,
  input: AnalysisInput,
) {
  if (!analysisResponseUsesAlgorithm(response, input.algorithm)) {
    return false
  }

  const inputNotes = input.notes.map(({ note }) => note)
  return (
    contentReferencesAreEqual(response.inputNotes, inputNotes) &&
    resultLinesMatchInput(response, input)
  )
}

export function analysisResponseIsCurrent(
  response: AnalysisResponseMessage,
  currentNotes: readonly AnalysisNote[],
  algorithm: AlgorithmReference,
) {
  if (!analysisResponseUsesAlgorithm(response, algorithm)) {
    return false
  }

  return contentReferencesAreEqual(response.inputNotes, currentNotes)
}
