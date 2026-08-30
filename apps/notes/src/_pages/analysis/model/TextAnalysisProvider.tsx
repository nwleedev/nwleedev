"use client"

import {
  createContext,
  useContext,
  type PropsWithChildren,
} from "react"

import type { TextAnalyzer } from "./analysisMessage"

const TextAnalyzerContext = createContext<TextAnalyzer | null>(null)

type TextAnalysisProviderProps = PropsWithChildren<{
  analyzer: TextAnalyzer
}>

export function TextAnalysisProvider({
  analyzer,
  children,
}: TextAnalysisProviderProps) {
  return (
    <TextAnalyzerContext value={analyzer}>{children}</TextAnalyzerContext>
  )
}

export function useTextAnalyzer() {
  const analyzer = useContext(TextAnalyzerContext)

  if (analyzer === null) {
    throw new Error(
      "useTextAnalyzer must be used within TextAnalysisProvider",
    )
  }

  return analyzer
}
