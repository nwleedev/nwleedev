"use client"

import {
  useRef,
  useState,
} from "react"
import {
  useForm,
  useWatch,
  type Control,
} from "react-hook-form"

import {
  findPlaceholderLabelIssues,
  markPlaceholder,
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

function draftWithFields(
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

type TemplateDraftPreviewProps = {
  control: Control<TemplateSaveFields>
  draft: TemplateDraft
}

function TemplateDraftPreview({
  control,
  draft,
}: TemplateDraftPreviewProps) {
  const labels = useWatch({ control, name: "labels" })
  const previewDraft = draftWithFields(draft, {
    labels,
    sourceText: draft.sourceText,
    title: "",
  })
  const segments = toTemplateSegments(previewDraft)

  return <TemplateSegmentPreview segments={segments} />
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
    control,
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    register,
    setError,
    setFocus,
    setValue,
    unregister,
  } = useForm<TemplateSaveFields>({
    defaultValues: {
      labels: createLabelValues(draft),
      sourceText: draft.sourceText,
      title: "",
    },
    shouldUnregister: true,
  })
  const sourceRegistration = register("sourceText", {
    onChange() {
      setStatus("idle")
    },
  })
  const titleRegistration = register("title", {
    validate: validateTemplateTitle,
  })
  const sourceReadOnly = draft.placeholders.length > 0

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

    clearErrors("labels")

    for (const issue of labelIssues) {
      const message = issue.reason === "empty"
        ? "플레이스홀더 이름을 입력하세요."
        : "다른 플레이스홀더 이름을 입력하세요."
      setError(`labels.${issue.key}`, { message })
    }

    const firstIssue = labelIssues[0]

    if (focusFirstIssue && firstIssue !== undefined) {
      setFocus(`labels.${firstIssue.key}`)
    }

    return labelIssues
  }

  function markSelectedText() {
    const field = sourceField.current

    if (field === null) {
      return
    }

    const fields = getValues()
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
    setValue(fieldName, label)
    setStatus("idle")
    requestAnimationFrame(() => setFocus(fieldName))
  }

  function changeLabel(key: string, label: string) {
    const fields = getValues()
    const labels = { ...fields.labels, [key]: label }

    synchronizeLabelErrors(draft, { ...fields, labels }, false)
  }

  function restore(key: string) {
    const fields = getValues()
    const currentDraft = draftWithFields(draft, fields)
    const nextDraft = restorePlaceholder(currentDraft, key)
    const labels = { ...fields.labels }

    delete labels[key]
    unregister(`labels.${key}`)
    onDraftChange(nextDraft)
    synchronizeLabelErrors(nextDraft, { ...fields, labels }, false)
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

    const namedDraft = draftWithFields(draft, fields)
    const namedSegments = toTemplateSegments(namedDraft)
    const labelIssues = synchronizeLabelErrors(draft, fields, true)

    if (labelIssues.length > 0) {
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
      className="grid gap-4 border-y border-line py-4 sm:py-5"
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
          readOnly={sourceReadOnly}
          {...sourceRegistration}
          ref={connectSourceField}
        />
        {sourceReadOnly ? (
          <p className="text-xs text-soft-ink">
            원문을 바꾸려면 플레이스홀더를 일반 텍스트로 되돌리세요.
          </p>
        ) : null}
      </div>
      {draft.placeholders.length > 0 ? (
        <TemplateDraftPreview control={control} draft={draft} />
      ) : null}
      <form className="grid gap-4" noValidate onSubmit={submitTemplate}>
        <TemplatePlaceholderFields
          control={control}
          draft={draft}
          errors={errors}
          onLabelChange={changeLabel}
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
