"use client"

import { useState } from "react"

import { useSelectedSourceLines } from "@/features/suggest-template"

import { useTemplateData } from "./template-data-provider"

export function useTemplateWorkspace() {
  const sourceLines = useSelectedSourceLines()
  const templateState = useTemplateData()
  const [selectedTemplateId, selectTemplate] = useState<string | null>(null)
  const selectedTemplate = templateState.status === "ready"
    ? templateState.templates.find(({ id }) => id === selectedTemplateId)
    : undefined

  return {
    selectTemplate,
    selectedTemplate,
    selectedTemplateId,
    sourceSelection: sourceLines.selection,
  }
}
