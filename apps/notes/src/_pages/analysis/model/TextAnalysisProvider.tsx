"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type PropsWithChildren,
} from "react"

import type {
  AnalysisInput,
  AnalysisResponseMessage,
  TextAnalyzer,
} from "./analysisMessage"

type TextAnalysisState =
  | { status: "idle" }
  | { status: "running" }
  | { result: AnalysisResponseMessage; status: "success" }
  | { status: "failure" }

type TextAnalysisContextValue = TextAnalysisState & {
  run(input: AnalysisInput): Promise<void>
}

const TextAnalysisContext = createContext<TextAnalysisContextValue | null>(
  null,
)

type TextAnalysisProviderProps = PropsWithChildren<{
  analyzer: TextAnalyzer
}>

export function TextAnalysisProvider({
  analyzer,
  children,
}: TextAnalysisProviderProps) {
  const [state, setState] = useState<TextAnalysisState>({ status: "idle" })
  const run = useCallback(
    async (input: AnalysisInput) => {
      setState({ status: "running" })

      try {
        const result = await analyzer.analyze(input)
        setState({ result, status: "success" })
      } catch {
        setState({ status: "failure" })
      }
    },
    [analyzer],
  )

  return (
    <TextAnalysisContext value={{ ...state, run }}>
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
