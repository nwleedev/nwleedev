"use client"

import { useState } from "react"

import { useSelectedSourceLines } from "@/features/suggest-template"
import { PageHeading } from "@/shared/ui/page-heading"

import { useTemplateData } from "../model/template-data-provider"
import { SavedTemplates } from "./saved-templates"
import { SelectedSourceLinesPreview } from "./selected-source-lines-preview"
import { TemplateAuthoring } from "./template-authoring"
import { TemplateInputForm } from "./template-input-form"

export function TemplatesStartPage() {
  const sourceLines = useSelectedSourceLines()
  const templateState = useTemplateData()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  )
  const selectedTemplate = templateState.status === "ready"
    ? templateState.templates.find(({ id }) => id === selectedTemplateId)
    : undefined

  return (
    <main
      className="min-h-screen px-4 py-5 sm:px-6 sm:py-7 xl:px-8"
      id="main-content"
    >
      <PageHeading density="compact" title="템플릿" />
      <div className="mt-5 grid gap-5">
        {sourceLines.selection ? (
          <SelectedSourceLinesPreview selection={sourceLines.selection} />
        ) : null}
        <TemplateAuthoring onSaved={setSelectedTemplateId} />
        <section aria-labelledby="saved-templates-title" className="grid gap-3">
          <h2 className="font-display text-base font-bold" id="saved-templates-title">
            저장된 템플릿
          </h2>
          <SavedTemplates
            onSelect={setSelectedTemplateId}
            selectedTemplateId={selectedTemplateId}
          />
        </section>
        {selectedTemplate ? (
          <TemplateInputForm
            key={selectedTemplate.id}
            template={selectedTemplate}
          />
        ) : null}
      </div>
    </main>
  )
}
