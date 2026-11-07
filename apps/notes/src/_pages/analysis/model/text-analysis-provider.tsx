"use client"

import type { PropsWithChildren } from "react"

import { useBrowserAnalysis } from "../api/use-browser-analysis"

import {
  TextAnalysisContext,
  useTextAnalysisState,
} from "./use-text-analysis-state"

export function TextAnalysisProvider({
  children,
}: PropsWithChildren) {
  const dependencies = useBrowserAnalysis()
  const value = useTextAnalysisState(dependencies)

  return <TextAnalysisContext value={value}>{children}</TextAnalysisContext>
}

export {
  useTextAnalysis,
  useValidateTextAnalysis,
} from "./use-text-analysis-state"
export type { CompletedTextAnalysis } from "./use-text-analysis-state"
