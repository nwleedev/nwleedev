"use client"

import type {
  FieldErrors,
  UseFormRegister,
} from "react-hook-form"

import {
  type TemplateSegment,
  type TextTemplate,
} from "@/entities/template"
import type { ClipboardWriteFailureReason } from "@/shared/lib/clipboard"
import { Button } from "@/shared/ui/button"
import { StatusNotice } from "@/shared/ui/status-notice"
import { TextField } from "@/shared/ui/text-field"

import {
  useTemplateOutput,
  type OutputStatus,
  type TemplateValueFields,
} from "../model/use-template-output"

type TemplateValueFieldProps = {
  errors: FieldErrors<TemplateValueFields>
  placeholder: Extract<TemplateSegment, { kind: "placeholder" }>
  register: UseFormRegister<TemplateValueFields>
}

function TemplateValueField({
  errors,
  placeholder,
  register,
}: TemplateValueFieldProps) {
  const fieldName = `values.${placeholder.key}` as const
  const error = errors.values?.[placeholder.key]
  const errorId = `template-value-${placeholder.key}-error`
  const example = placeholder.defaultValue
    ? `예: ${placeholder.defaultValue}`
    : undefined
  const registration = register(fieldName, {
    required: "값을 입력하세요.",
  })

  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-semibold" htmlFor={fieldName}>
        {placeholder.label}
      </label>
      <TextField
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? "true" : undefined}
        id={fieldName}
        placeholder={example}
        {...registration}
      />
      {error ? (
        <p className="text-xs font-semibold text-danger" id={errorId}>
          {error.message}
        </p>
      ) : null}
    </div>
  )
}

type TemplateValueFieldListProps = {
  errors: FieldErrors<TemplateValueFields>
  placeholders: readonly Extract<
    TemplateSegment,
    { kind: "placeholder" }
  >[]
  register: UseFormRegister<TemplateValueFields>
}

function TemplateValueFieldList({
  errors,
  placeholders,
  register,
}: TemplateValueFieldListProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {placeholders.map((placeholder) => (
        <TemplateValueField
          errors={errors}
          key={placeholder.key}
          placeholder={placeholder}
          register={register}
        />
      ))}
    </div>
  )
}

const outputCopyFailureMessages: Record<
  ClipboardWriteFailureReason,
  string
> = {
  "api-unavailable":
    "이 브라우저에서는 자동 복사를 사용할 수 없습니다. 생성한 텍스트를 직접 선택해 복사하세요.",
  "not-allowed":
    "클립보드 쓰기가 허용되지 않았습니다. 브라우저의 사이트 권한을 확인한 뒤 다시 시도하세요.",
  "write-failed":
    "클립보드에 쓰지 못했습니다. 다시 시도하거나 생성한 텍스트를 직접 선택해 복사하세요.",
}

type OutputCopyNoticeProps = {
  status: OutputStatus
}

function OutputCopyNotice({ status }: OutputCopyNoticeProps) {
  if (status === "idle") {
    return null
  }

  if (status === "copied") {
    return (
      <p className="text-xs font-semibold text-soft-ink" role="status">
        복사했습니다.
      </p>
    )
  }

  return (
    <StatusNotice kind="error">
      <p>{outputCopyFailureMessages[status]}</p>
    </StatusNotice>
  )
}

type GeneratedTemplateOutputProps = {
  copying: boolean
  output: string
  status: OutputStatus
  onCopy(): void
}

function GeneratedTemplateOutput({
  copying,
  onCopy,
  output,
  status,
}: GeneratedTemplateOutputProps) {
  return (
    <section aria-labelledby="generated-text-title" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold" id="generated-text-title">
          생성한 텍스트
        </h3>
        <Button disabled={copying} onClick={onCopy} tone="quiet">
          복사
        </Button>
      </div>
      <p className="whitespace-pre-wrap break-words rounded-control border border-line bg-canvas px-4 py-3 text-sm leading-7">
        {output}
      </p>
      <OutputCopyNotice status={status} />
    </section>
  )
}

type TemplateInputFormProps = {
  template: TextTemplate
}

export function TemplateInputForm({ template }: TemplateInputFormProps) {
  const generated = useTemplateOutput(template)

  return (
    <section
      aria-labelledby="template-input-title"
      className="grid gap-4 border-y border-line py-4 sm:py-5"
    >
      <h2 className="text-base font-bold" id="template-input-title">
        {template.title}
      </h2>
      <form className="grid gap-4" noValidate onSubmit={generated.submitValues}>
        <TemplateValueFieldList
          errors={generated.errors}
          placeholders={generated.placeholders}
          register={generated.register}
        />
        <div className="flex justify-end">
          <Button type="submit">텍스트 생성</Button>
        </div>
      </form>
      {generated.output === null ? null : (
        <GeneratedTemplateOutput
          copying={generated.output.copying}
          onCopy={generated.copyOutput}
          output={generated.output.text}
          status={generated.output.status}
        />
      )}
    </section>
  )
}
