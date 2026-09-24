"use client"

import Link from "next/link"
import { Button } from "@/shared/ui/button"

import { useTemplateAuthoring } from "../model/use-template-authoring"
import { TemplateEditor } from "./template-editor"

type TemplateAuthoringProps = {
  onSaved(templateId: string): void
}

export function TemplateAuthoring({ onSaved }: TemplateAuthoringProps) {
  const authoring = useTemplateAuthoring()

  if (authoring.draft === null) {
    return (
      <section className="grid min-h-52 place-items-center p-6 text-center">
        <div className="grid max-w-lg gap-4 justify-items-center">
          <p className="text-sm leading-6 text-soft-ink">{authoring.reason}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={authoring.startManual}>수동으로 작성</Button>
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

  return (
    <TemplateEditor
      draft={authoring.draft}
      heading={authoring.heading}
      onDraftChange={authoring.setDraft}
      onSaved={onSaved}
    />
  )
}
