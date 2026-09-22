"use client"

import type { TextTemplate } from "@/entities/template"
import { Button } from "@/shared/ui/button"
import { StatusNotice } from "@/shared/ui/status-notice"

import { useTemplateData } from "../model/template-data-provider"
import { TemplateSegmentPreview } from "./template-segment-preview"

type SavedTemplateItemProps = {
  selected: boolean
  template: TextTemplate
  onSelect(templateId: string): void
}

function SavedTemplateItem({
  onSelect,
  selected,
  template,
}: SavedTemplateItemProps) {
  return (
    <li className="grid gap-3 px-1 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold">{template.title}</h3>
        <Button
          aria-pressed={selected}
          onClick={() => onSelect(template.id)}
          tone="quiet"
        >
          {selected ? "사용 중" : "사용"}
        </Button>
      </div>
      <TemplateSegmentPreview segments={template.segments} />
    </li>
  )
}

type SavedTemplateListProps = {
  selectedTemplateId: string | null
  templates: readonly TextTemplate[]
  onSelect(templateId: string): void
}

function SavedTemplateList({
  onSelect,
  selectedTemplateId,
  templates,
}: SavedTemplateListProps) {
  return (
    <ol className="divide-y divide-line border-y border-line">
      {templates.map((template) => (
        <SavedTemplateItem
          key={template.id}
          onSelect={onSelect}
          selected={template.id === selectedTemplateId}
          template={template}
        />
      ))}
    </ol>
  )
}

type SavedTemplatesProps = {
  selectedTemplateId: string | null
  onSelect(templateId: string): void
}

export function SavedTemplates({
  onSelect,
  selectedTemplateId,
}: SavedTemplatesProps) {
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
    <SavedTemplateList
      onSelect={onSelect}
      selectedTemplateId={selectedTemplateId}
      templates={templateState.templates}
    />
  )
}
