"use client"

import {
  useWatch,
  type Control,
} from "react-hook-form"

import {
  toTemplateSegments,
  type TemplateDraft,
} from "@/entities/template"
import { Button } from "@/shared/ui/button"
import { StatusNotice } from "@/shared/ui/status-notice"
import { TextField } from "@/shared/ui/text-field"
import { Textarea } from "@/shared/ui/textarea"

import {
  draftWithFields,
  useTemplateEditor,
  type TemplateSaveFields,
} from "../model/use-template-editor"
import { TemplatePlaceholderFields } from "./template-placeholder-fields"
import { TemplateSegmentPreview } from "./template-segment-preview"

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
  const {
    changeLabel,
    connectSourceField,
    control,
    errors,
    isSubmitting,
    markSelectedText,
    register,
    restore,
    sourceReadOnly,
    sourceRegistration,
    statusKind,
    statusMessage,
    submitTemplate,
    titleRegistration,
  } = useTemplateEditor({ draft, onDraftChange, onSaved })

  return (
    <section
      aria-labelledby="template-editor-title"
      className="grid gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold" id="template-editor-title">
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
