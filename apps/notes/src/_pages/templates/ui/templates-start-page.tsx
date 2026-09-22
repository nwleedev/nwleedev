"use client"

import { PageHeading } from "@/shared/ui/page-heading"

import { useTemplateWorkspace } from "../model/use-template-workspace"
import { SavedTemplates } from "./saved-templates"
import { SelectedSourceLinesPreview } from "./selected-source-lines-preview"
import { TemplateAuthoring } from "./template-authoring"
import { TemplateInputForm } from "./template-input-form"

export function TemplatesStartPage() {
  const workspace = useTemplateWorkspace()

  return (
    <main
      className="min-h-screen px-4 py-5 sm:px-6 sm:py-7 xl:px-8"
      id="main-content"
    >
      <PageHeading density="compact" title="템플릿" />
      <div className="mt-5 grid gap-5">
        {workspace.sourceSelection ? (
          <SelectedSourceLinesPreview selection={workspace.sourceSelection} />
        ) : null}
        <TemplateAuthoring onSaved={workspace.selectTemplate} />
        <section aria-labelledby="saved-templates-title" className="grid gap-3">
          <h2 className="text-base font-bold" id="saved-templates-title">
            저장된 템플릿
          </h2>
          <SavedTemplates
            onSelect={workspace.selectTemplate}
            selectedTemplateId={workspace.selectedTemplateId}
          />
        </section>
        {workspace.selectedTemplate ? (
          <TemplateInputForm
            key={workspace.selectedTemplate.id}
            template={workspace.selectedTemplate}
          />
        ) : null}
      </div>
    </main>
  )
}
