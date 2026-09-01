import type { NoteContentReference } from "@/entities/note"
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
  left: readonly NoteContentReference[],
  right: readonly NoteContentReference[],
) {
  if (left.length !== right.length) {
    return false
  }

  const leftRevisionByNote = new Map(
    left.map(({ contentRevision, id }) => [id, contentRevision]),
  )
  const rightRevisionByNote = new Map(
    right.map(({ contentRevision, id }) => [id, contentRevision]),
  )

  if (
    leftRevisionByNote.size !== left.length ||
    rightRevisionByNote.size !== right.length
  ) {
    return false
  }

  return left.every(({ contentRevision, id }) =>
    rightRevisionByNote.get(id) === contentRevision,
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
      source.note.contentRevision !== line.note.contentRevision
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
  currentNotes: readonly NoteContentReference[],
  algorithm: AlgorithmReference,
) {
  if (!analysisResponseUsesAlgorithm(response, algorithm)) {
    return false
  }

  return contentReferencesAreEqual(response.inputNotes, currentNotes)
}
