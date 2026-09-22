"use client"

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

export function useTemplateAuthoring() {
  const sourceLines = useSelectedSourceLines()
  const [seed] = useState(() => createAuthoringSeed(sourceLines.selection))
  const [draft, setDraft] = useState<TemplateDraft | null>(seed.draft)

  return {
    draft,
    heading: seed.draft === null ? "새 템플릿" : "제안 편집",
    reason: seed.reason,
    setDraft,
    startManual: () => setDraft(createTemplateDraft(seed.manualText)),
  }
}
