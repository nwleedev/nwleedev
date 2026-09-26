"use client"

import type { TextTemplate } from "@/entities/template"
import { Button } from "@/shared/ui/button"
import { StatusNotice } from "@/shared/ui/status-notice"

import { useTemplateData } from "../model/template-data-provider"
import { useTemplateSelection } from "../model/template-workspace-context"
import { TemplateSegmentPreview } from "./template-segment-preview"

type SavedTemplateItemProps = {
  template: TextTemplate
}

function SavedTemplateItem({ template }: SavedTemplateItemProps) {
  const { selectTemplate, selectedTemplateId } = useTemplateSelection()
  const selected = template.id === selectedTemplateId

  return (
    <li className="grid gap-3 px-1 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold">{template.title}</h3>
        <Button
          aria-pressed={selected}
          onClick={() => selectTemplate(template.id)}
          tone="quiet"
        >
          {selected ? "사용 중" : "사용"}
        </Button>
      </div>
      <TemplateSegmentPreview segments={template.segments} />
    </li>
  )
}

export function SavedTemplates() {
  const templateState = useTemplateData()

  if (templateState.status === "loading") {
    return <p className="text-sm text-soft-ink">템플릿을 불러오는 중입니다.</p>
  }

  if (templateState.status === "load-failure") {
    return (
      <StatusNotice kind="error">
        <p>저장된 템플릿을 불러오지 못했습니다.</p>
        <Button onClick={templateState.retry} tone="quiet">
          다시 시도
        </Button>
      </StatusNotice>
    )
  }

  if (templateState.templates.length === 0) {
    return <p className="text-sm text-soft-ink">저장된 템플릿이 없습니다.</p>
  }

  return (
    <ol className="divide-y divide-line">
      {templateState.templates.map((template) => (
        <SavedTemplateItem key={template.id} template={template} />
      ))}
    </ol>
  )
}
