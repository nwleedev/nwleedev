"use client"

import type { PropsWithChildren } from "react"

import {
  TemplateDataContext,
  useTemplateDataState,
  type TemplateDataDependencies,
} from "./use-template-data-state"

export function TemplateDataProvider({
  children,
  ...dependencies
}: PropsWithChildren<TemplateDataDependencies>) {
  const value = useTemplateDataState(dependencies)

  return <TemplateDataContext value={value}>{children}</TemplateDataContext>
}

export { useTemplateData } from "./use-template-data-state"
export type {
  CopyTemplateResult,
  CreateTemplateResult,
} from "./use-template-data-state"
