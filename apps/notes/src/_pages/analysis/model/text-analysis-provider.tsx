"use client"

import type { PropsWithChildren } from "react"

import {
  TextAnalysisContext,
  useTextAnalysisState,
  type TextAnalysisDependencies,
} from "./use-text-analysis-state"

export function TextAnalysisProvider({
  children,
  ...dependencies
}: PropsWithChildren<TextAnalysisDependencies>) {
  const value = useTextAnalysisState(dependencies)

  return <TextAnalysisContext value={value}>{children}</TextAnalysisContext>
}

export {
  useTextAnalysis,
  useValidateTextAnalysis,
} from "./use-text-analysis-state"
export type { CompletedTextAnalysis } from "./use-text-analysis-state"
