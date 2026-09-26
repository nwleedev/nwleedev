import { createContext, useContext } from "react"

type TemplateWorkspaceContextValue = {
  selectTemplate(templateId: string): void
  selectedTemplateId: string | null
}

export const TemplateWorkspaceContext =
  createContext<TemplateWorkspaceContextValue | null>(null)

export function useTemplateSelection() {
  const selection = useContext(TemplateWorkspaceContext)

  if (selection === null) {
    throw new Error("TemplateWorkspaceContext is missing")
  }

  return selection
}
