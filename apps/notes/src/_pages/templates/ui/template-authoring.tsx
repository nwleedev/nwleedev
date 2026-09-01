"use client"

import Link from "next/link"
import { useState } from "react"

import {
  createTemplateDraft,
  createTemplateDraftFromSegments,
  type TemplateDraft,
} from "@/entities/template"
import {
  suggestTemplate,
  useSelectedSourceLines,
  type SelectedSourceLines,
} from "@/features/suggest-template"
import { Button } from "@/shared/ui/button"

import { TemplateEditor } from "./template-editor"

type AuthoringSeed = {
  draft: TemplateDraft | null
  manualText: string
  reason: string | null
}

function createAuthoringSeed(
  selection: SelectedSourceLines | null,
): AuthoringSeed {
  if (selection === null) {
    return {
      draft: null,
      manualText: "",
      reason: "분석에서 두 줄을 선택하거나 새 템플릿을 직접 작성하세요.",
    }
  }

  const suggestion = suggestTemplate(
    selection.left.textSnapshot,
    selection.right.textSnapshot,
  )

  if (suggestion.status === "same") {
    return {
      draft: null,
      manualText: selection.left.textSnapshot,
      reason: "선택한 두 줄이 같아 자동 제안을 만들지 않았습니다.",
    }
  }

  if (suggestion.status === "no-common-literal") {
    return {
      draft: null,
      manualText: selection.left.textSnapshot,
      reason: "두 줄에 공통 일반 텍스트가 없어 자동 제안을 만들지 않았습니다.",
    }
  }

  return {
    draft: createTemplateDraftFromSegments(suggestion.segments),
    manualText: selection.left.textSnapshot,
    reason: null,
  }
}

type TemplateAuthoringProps = {
  onSaved(templateId: string): void
}

export function TemplateAuthoring({ onSaved }: TemplateAuthoringProps) {
  const sourceLines = useSelectedSourceLines()
  const [seed] = useState(() => createAuthoringSeed(sourceLines.selection))
  const [draft, setDraft] = useState<TemplateDraft | null>(seed.draft)
  const [manual, setManual] = useState(seed.draft === null)

  function startManual() {
    setDraft(createTemplateDraft(seed.manualText))
    setManual(true)
  }

  if (draft === null) {
    return (
      <section className="grid min-h-52 place-items-center rounded-panel border border-line bg-surface-raised p-6 text-center shadow-note">
        <div className="grid max-w-lg gap-4 justify-items-center">
          <p className="text-sm leading-6 text-soft-ink">{seed.reason}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={startManual}>수동으로 작성</Button>
            <Link
              className="inline-flex min-h-[var(--notes-control-size)] items-center rounded-control border border-line bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink hover:border-line-strong hover:bg-canvas"
              href="/analysis/"
            >
              분석 결과로 이동
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const heading = manual ? "새 템플릿" : "제안 편집"

  return (
    <TemplateEditor
      draft={draft}
      heading={heading}
      onDraftChange={setDraft}
      onSaved={onSaved}
    />
  )
}
