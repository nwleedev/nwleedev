"use client"

import { useSelectedSourceLines } from "@/features/suggest-template"
import { PageHeading } from "@/shared/ui/page-heading"

import { SelectedSourceLinesPreview } from "./SelectedSourceLinesPreview"

export function TemplatesStartPage() {
  const sourceLines = useSelectedSourceLines()

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
        <section className="grid min-h-[24rem] place-items-center rounded-panel border border-line bg-surface-raised p-6 shadow-note">
          <p className="text-sm text-soft-ink">템플릿이 없습니다.</p>
        </section>
      </div>
    </main>
  )
}
