"use client"

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type PropsWithChildren,
} from "react"

import type { Note, NoteReader } from "@/entities/note"

import {
  TEXT_ANALYSIS_ALGORITHM,
  type AnalysisInput,
  type AnalysisResponseMessage,
  type TextAnalyzer,
} from "./analysisMessage"
import {
  createAnalysisRows,
  type AnalysisResultRow,
} from "./analysisRows"
import {
  analysisResponseIsCurrent,
} from "./analysisRunState"

export type CompletedTextAnalysis = {
  completedAt: string
  input: AnalysisInput
  response: AnalysisResponseMessage
  rows: readonly AnalysisResultRow[]
}

type TextAnalysisState =
  | { status: "idle" }
  | { status: "running" }
  | { completed: CompletedTextAnalysis; status: "success" }
  | { status: "failure" }
  | { status: "stale" }

type TextAnalysisContextValue = TextAnalysisState & {
  run(): Promise<void>
  validate(): Promise<void>
}

const TextAnalysisContext = createContext<TextAnalysisContextValue | null>(
  null,
)

type TextAnalysisProviderProps = PropsWithChildren<{
  analyzer: TextAnalyzer
  now(): string
  reader: NoteReader
}>

function createAnalysisInput(notes: readonly Note[]): AnalysisInput {
  return {
    algorithm: TEXT_ANALYSIS_ALGORITHM,
    notes: notes.map((note) => ({
      content: note.content,
      note: { contentRevision: note.contentRevision, id: note.id },
    })),
  }
}

function contentReferences(notes: readonly Note[]) {
  return notes.map(({ contentRevision, id }) => ({ contentRevision, id }))
}

export function TextAnalysisProvider({
  analyzer,
  children,
  now,
  reader,
}: TextAnalysisProviderProps) {
  const [state, setState] = useState<TextAnalysisState>({ status: "idle" })
  const completed = useRef<CompletedTextAnalysis | null>(null)
  const sequence = useRef(0)

  const run = useCallback(async () => {
    const runSequence = sequence.current + 1
    sequence.current = runSequence
    completed.current = null
    setState({ status: "running" })

    try {
      const input = createAnalysisInput(await reader.getAll())
      const response = await analyzer.analyze(input)
      const currentNotes = await reader.getAll()

      if (sequence.current !== runSequence) {
        return
      }

      if (
        !analysisResponseIsCurrent(
          response,
          contentReferences(currentNotes),
          TEXT_ANALYSIS_ALGORITHM,
        )
      ) {
        setState({ status: "stale" })
        return
      }

      const rows = createAnalysisRows(response)

      if (rows === null) {
        setState({ status: "failure" })
        return
      }

      const nextCompleted: CompletedTextAnalysis = {
        completedAt: now(),
        input,
        response,
        rows,
      }
      completed.current = nextCompleted
      setState({ completed: nextCompleted, status: "success" })
    } catch {
      if (sequence.current === runSequence) {
        setState({ status: "failure" })
      }
    }
  }, [analyzer, now, reader])

  const validate = useCallback(async () => {
    const currentCompleted = completed.current

    if (currentCompleted === null) {
      return
    }

    const validationSequence = sequence.current

    try {
      const notes = await reader.getAll()
      const current = analysisResponseIsCurrent(
        currentCompleted.response,
        contentReferences(notes),
        TEXT_ANALYSIS_ALGORITHM,
      )

      if (sequence.current !== validationSequence || current) {
        return
      }

      completed.current = null
      setState({ status: "stale" })
    } catch {
      if (sequence.current === validationSequence) {
        setState({ status: "failure" })
      }
    }
  }, [reader])

  return (
    <TextAnalysisContext value={{ ...state, run, validate }}>
      {children}
    </TextAnalysisContext>
  )
}

export function useTextAnalysis() {
  const context = useContext(TextAnalysisContext)

  if (context === null) {
    throw new Error(
      "useTextAnalysis must be used within TextAnalysisProvider",
    )
  }

  return context
}
