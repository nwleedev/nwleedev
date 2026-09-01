"use client"

import {
  useRef,
  useState,
  type ChangeEvent,
} from "react"
import { useForm } from "react-hook-form"

import {
  findPlaceholderLabelIssues,
  markPlaceholder,
  renamePlaceholder,
  restorePlaceholder,
  TemplateTitleSchema,
  toTemplateSegments,
  type TemplateDraft,
} from "@/entities/template"
import { Button } from "@/shared/ui/button"
import { StatusNotice } from "@/shared/ui/status-notice"
import { TextField } from "@/shared/ui/text-field"
import { Textarea } from "@/shared/ui/textarea"

import { useTemplateData } from "../model/template-data-provider"
import {
  TemplatePlaceholderFields,
  type TemplateSaveFields,
} from "./template-placeholder-fields"
import { TemplateSegmentPreview } from "./template-segment-preview"

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

type TemplateEditorProps = {
  draft: TemplateDraft
  heading: string
  onDraftChange(draft: TemplateDraft): void
  onSaved(templateId: string): void
}

export function TemplateEditor({
  draft,
  heading,
  onDraftChange,
  onSaved,
}: TemplateEditorProps) {
  const templates = useTemplateData()
  const sourceField = useRef<HTMLTextAreaElement>(null)
  const [status, setStatus] = useState<EditorStatus>("idle")
  const {
    clearErrors,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
    setFocus,
    setValue,
    unregister,
  } = useForm<TemplateSaveFields>({
    defaultValues: { labels: createLabelValues(draft), title: "" },
    shouldUnregister: true,
  })
  const titleRegistration = register("title", {
    validate: validateTemplateTitle,
  })
  const segments = toTemplateSegments(draft)
  const sourceReadOnly = draft.placeholders.length > 0

  function updateSource(event: ChangeEvent<HTMLTextAreaElement>) {
    onDraftChange({ placeholders: [], sourceText: event.target.value })
    setStatus("idle")
  }

  function markSelectedText() {
    const field = sourceField.current

    if (field === null) {
      return
    }

    const sequence = nextPlaceholderSequence(draft)
    const key = `input-${sequence}`
    const label = `입력값 ${sequence}`
    const result = markPlaceholder(draft, {
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
    setValue(fieldName, label)
    setStatus("idle")
    requestAnimationFrame(() => setFocus(fieldName))
  }

  function rename(key: string, label: string) {
    onDraftChange(renamePlaceholder(draft, key, label))
    clearErrors(`labels.${key}`)
  }

  function restore(key: string) {
    unregister(`labels.${key}`)
    onDraftChange(restorePlaceholder(draft, key))
    setStatus("idle")
  }

  async function saveTemplate(fields: TemplateSaveFields) {
    const title = TemplateTitleSchema.safeParse(fields.title)

    if (!title.success) {
      setError("title", { message: templateTitleRequiredMessage })
      setFocus("title")
      return
    }

    if (draft.placeholders.length === 0) {
      setStatus("placeholder-required")
      return
    }

    const namedDraft: TemplateDraft = {
      ...draft,
      placeholders: draft.placeholders.map((placeholder) => ({
        ...placeholder,
        label: fields.labels[placeholder.key] ?? placeholder.label,
      })),
    }
    const namedSegments = toTemplateSegments(namedDraft)
    const labelIssues = findPlaceholderLabelIssues(namedSegments)

    if (labelIssues.length > 0) {
      for (const issue of labelIssues) {
        const message = issue.reason === "empty"
          ? "플레이스홀더 이름을 입력하세요."
          : "다른 플레이스홀더 이름을 입력하세요."
        setError(`labels.${issue.key}`, { message })
      }

      setFocus(`labels.${labelIssues[0].key}`)
      return
    }

    const result = await templates.createTemplate({
      segments: namedSegments,
      title: title.data,
    })

    if (result.status === "failure") {
      setStatus("save-failure")
      return
    }

    onDraftChange(namedDraft)
    onSaved(result.template.id)
    setStatus("saved")
  }

  const submitTemplate = handleSubmit(saveTemplate)
  const statusMessage = status === "idle"
    ? null
    : editorStatusMessages[status]
  const statusKind = status === "saved" ? "status" : "error"

  return (
    <section
      aria-labelledby="template-editor-title"
      className="grid gap-4 rounded-panel border border-line bg-surface-raised p-4 shadow-note sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold" id="template-editor-title">
          {heading}
        </h2>
        <Button onClick={markSelectedText} tone="quiet">
          플레이스홀더로 지정
        </Button>
      </div>
      <div className="grid gap-1.5">
        <label className="text-sm font-semibold" htmlFor="template-source">
          원문
        </label>
        <Textarea
          className="min-h-32"
          id="template-source"
          onChange={updateSource}
          readOnly={sourceReadOnly}
          ref={sourceField}
          value={draft.sourceText}
        />
        {sourceReadOnly ? (
          <p className="text-xs text-soft-ink">
            원문을 바꾸려면 플레이스홀더를 일반 텍스트로 되돌리세요.
          </p>
        ) : null}
      </div>
      {segments.length > 0 ? (
        <TemplateSegmentPreview segments={segments} />
      ) : null}
      <form className="grid gap-4" noValidate onSubmit={submitTemplate}>
        <TemplatePlaceholderFields
          draft={draft}
          errors={errors}
          onRename={rename}
          onRestore={restore}
          register={register}
        />
        <div className="grid gap-1.5">
          <label className="text-sm font-semibold" htmlFor="template-title">
            템플릿 이름
          </label>
          <TextField
            aria-describedby={errors.title ? "template-title-error" : undefined}
            aria-invalid={errors.title ? "true" : undefined}
            id="template-title"
            {...titleRegistration}
          />
          {errors.title ? (
            <p
              className="text-xs font-semibold text-danger"
              id="template-title-error"
            >
              {errors.title.message}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end">
          <Button disabled={isSubmitting} type="submit">
            템플릿 저장
          </Button>
        </div>
      </form>
      {statusMessage ? (
        <StatusNotice kind={statusKind}>
          <p>{statusMessage}</p>
        </StatusNotice>
      ) : null}
    </section>
  )
}
