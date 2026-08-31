import type { NoteContentReference } from "@/entities/note"
import type { AlgorithmReference } from "@/shared/lib/algorithm-reference"

import type { AnalysisResponseMessage } from "./analysisMessage"

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
  expected: readonly NoteContentReference[],
  current: readonly NoteContentReference[],
) {
  if (expected.length !== current.length) {
    return false
  }

  const currentRevisionByNote = new Map(
    current.map(({ contentRevision, id }) => [id, contentRevision]),
  )

  if (currentRevisionByNote.size !== current.length) {
    return false
  }

  return expected.every(({ contentRevision, id }) =>
    currentRevisionByNote.get(id) === contentRevision,
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
