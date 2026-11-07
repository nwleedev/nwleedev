"use client"

import type { PropsWithChildren } from "react"

import { useBrowserTemplates } from "../api/use-browser-templates"

import {
  TemplateDataContext,
  useTemplateDataState,
} from "./use-template-data-state"

export function TemplateDataProvider({
  children,
}: PropsWithChildren) {
  const dependencies = useBrowserTemplates()
  const value = useTemplateDataState(dependencies)

  return <TemplateDataContext value={value}>{children}</TemplateDataContext>
}

export { useTemplateData } from "./use-template-data-state"
