"use client"

import type { PropsWithChildren } from "react"

import {
  TextAnalysisContext,
  useTextAnalysisState,
  type TextAnalysisDependencies,
} from "./use-text-analysis-state"

export function TestTextAnalysisProvider({
  children,
  ...dependencies
}: PropsWithChildren<TextAnalysisDependencies>) {
  const value = useTextAnalysisState(dependencies)

  return <TextAnalysisContext value={value}>{children}</TextAnalysisContext>
}
