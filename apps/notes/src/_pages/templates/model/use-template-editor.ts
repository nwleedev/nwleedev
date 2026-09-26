"use client"

import { useRef, useState } from "react"
import { useForm, useWatch, type Control } from "react-hook-form"

import {
  findPlaceholderLabelIssues,
  markPlaceholder,
  restorePlaceholder,
  TemplateTitleSchema,
  toTemplateSegments,
  type TemplateDraft,
} from "@/entities/template"

import { useTemplateData } from "./template-data-provider"
import { useTemplateSelection } from "./template-workspace-context"

export type TemplateSaveFields = {
  labels: Record<string, string>
  sourceText: string
  title: string
}

type EditorStatus =
  | "idle"
  | "empty-selection"
  | "overlap"
  | "save-failure"
  | "saved"
  | "placeholder-required"

const editorStatusMessages: Record<Exclude<EditorStatus, "idle">, string> = {
  "empty-selection": "원문에서 플레이스홀더로 바꿀 텍스트를 선택하세요.",
  overlap: "이미 지정한 플레이스홀더와 겹치지 않는 텍스트를 선택하세요.",
  "placeholder-required": "플레이스홀더를 하나 이상 지정하세요.",
  "save-failure": "템플릿을 저장하지 못했습니다. 다시 시도하세요.",
  saved: "템플릿을 저장했습니다.",
}

const templateTitleRequiredMessage = "템플릿 이름을 입력하세요."

function validateTemplateTitle(value: string) {
  return TemplateTitleSchema.safeParse(value).success
    || templateTitleRequiredMessage
}

function createLabelValues(draft: TemplateDraft) {
  return Object.fromEntries(
    draft.placeholders.map(({ key, label }) => [key, label]),
  )
}

function nextPlaceholderSequence(draft: TemplateDraft) {
  let sequence = 1
  const keys = new Set(draft.placeholders.map(({ key }) => key))

  while (keys.has(`input-${sequence}`)) {
    sequence += 1
  }

  return sequence
}

export function draftWithFields(
  draft: TemplateDraft,
  fields: TemplateSaveFields,
): TemplateDraft {
  return {
    placeholders: draft.placeholders.map((placeholder) => ({
      ...placeholder,
      label: fields.labels[placeholder.key] ?? placeholder.label,
    })),
    sourceText: fields.sourceText,
  }
}

export function useTemplateDraftPreview(
  draft: TemplateDraft,
  control: Control<TemplateSaveFields>,
) {
  const labels = useWatch({ control, name: "labels" })
  const previewDraft = draftWithFields(draft, {
    labels,
    sourceText: draft.sourceText,
    title: "",
  })

  return toTemplateSegments(previewDraft)
}

type UseTemplateEditorOptions = {
  draft: TemplateDraft
  onDraftChange(draft: TemplateDraft): void
}

export function useTemplateEditor({
  draft,
  onDraftChange,
}: UseTemplateEditorOptions) {
  const templates = useTemplateData()
  const { selectTemplate } = useTemplateSelection()
  const sourceField = useRef<HTMLTextAreaElement>(null)
  const [status, setStatus] = useState<EditorStatus>("idle")
  const form = useForm<TemplateSaveFields>({
    defaultValues: {
      labels: createLabelValues(draft),
      sourceText: draft.sourceText,
      title: "",
    },
    shouldUnregister: true,
  })
  const sourceRegistration = form.register("sourceText", {
    onChange() {
      setStatus("idle")
    },
  })
  const titleRegistration = form.register("title", {
    validate: validateTemplateTitle,
  })

  function connectSourceField(element: HTMLTextAreaElement | null) {
    sourceRegistration.ref(element)
    sourceField.current = element
  }

  function synchronizeLabelErrors(
    currentDraft: TemplateDraft,
    fields: TemplateSaveFields,
    focusFirstIssue: boolean,
  ) {
    const labelIssues = findPlaceholderLabelIssues(
      toTemplateSegments(draftWithFields(currentDraft, fields)),
    )

    form.clearErrors("labels")

    for (const issue of labelIssues) {
      const message = issue.reason === "empty"
        ? "플레이스홀더 이름을 입력하세요."
        : "다른 플레이스홀더 이름을 입력하세요."
      form.setError(`labels.${issue.key}`, { message })
    }

    const firstIssue = labelIssues[0]

    if (focusFirstIssue && firstIssue !== undefined) {
      form.setFocus(`labels.${firstIssue.key}`)
    }

    return labelIssues
  }

  function markSelectedText() {
    const field = sourceField.current

    if (field === null) {
      return
    }

    const fields = form.getValues()
    const currentDraft = draftWithFields(draft, fields)
    const sequence = nextPlaceholderSequence(currentDraft)
    const key = `input-${sequence}`
    const label = `입력값 ${sequence}`
    const result = markPlaceholder(currentDraft, {
      end: field.selectionEnd,
      key,
      label,
      start: field.selectionStart,
    })

    if (result.status === "overlap") {
      setStatus("overlap")
      return
    }

    if (result.status !== "updated") {
      setStatus("empty-selection")
      return
    }

    const fieldName = `labels.${key}` as const
    onDraftChange(result.draft)
    form.setValue(fieldName, label)
    setStatus("idle")
    requestAnimationFrame(() => form.setFocus(fieldName))
  }

  function changeLabel(key: string, label: string) {
    const fields = form.getValues()
    const labels = { ...fields.labels, [key]: label }

    synchronizeLabelErrors(draft, { ...fields, labels }, false)
  }

  function restore(key: string) {
    const fields = form.getValues()
    const currentDraft = draftWithFields(draft, fields)
    const nextDraft = restorePlaceholder(currentDraft, key)
    const labels = { ...fields.labels }

    delete labels[key]
    form.unregister(`labels.${key}`)
    onDraftChange(nextDraft)
    synchronizeLabelErrors(nextDraft, { ...fields, labels }, false)
    setStatus("idle")
  }

  async function saveTemplate(fields: TemplateSaveFields) {
    const title = TemplateTitleSchema.safeParse(fields.title)

    if (!title.success) {
      form.setError("title", { message: templateTitleRequiredMessage })
      form.setFocus("title")
      return
    }

    if (draft.placeholders.length === 0) {
      setStatus("placeholder-required")
      return
    }

    const namedDraft = draftWithFields(draft, fields)
    const labelIssues = synchronizeLabelErrors(draft, fields, true)

    if (labelIssues.length > 0) {
      return
    }

    const result = await templates.createTemplate({
      segments: toTemplateSegments(namedDraft),
      title: title.data,
    })

    if (result.status === "failure") {
      setStatus("save-failure")
      return
    }

    onDraftChange(namedDraft)
    selectTemplate(result.template.id)
    setStatus("saved")
  }

  return {
    changeLabel,
    connectSourceField,
    control: form.control,
    errors: form.formState.errors,
    isSubmitting: form.formState.isSubmitting,
    markSelectedText,
    register: form.register,
    restore,
    sourceReadOnly: draft.placeholders.length > 0,
    sourceRegistration,
    statusKind: status === "saved" ? "status" as const : "error" as const,
    statusMessage: status === "idle" ? null : editorStatusMessages[status],
    submitTemplate: form.handleSubmit(saveTemplate),
    titleRegistration,
  }
}
