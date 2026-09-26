import type { ChangeEvent } from "react"
import type {
  Control,
  FieldErrors,
  UseFormRegister,
} from "react-hook-form"
import { useWatch } from "react-hook-form"

import type { TemplatePlaceholderRange } from "@/entities/template"
import { Button } from "@/shared/ui/button"
import { TextField } from "@/shared/ui/text-field"

import type { TemplateSaveFields } from "../model/use-template-editor"

type TemplatePlaceholderFieldProps = {
  control: Control<TemplateSaveFields>
  errors: FieldErrors<TemplateSaveFields>
  placeholder: TemplatePlaceholderRange
  sourceText: string
  register: UseFormRegister<TemplateSaveFields>
  onLabelChange(key: string, label: string): void
  onRestore(key: string): void
}

export function TemplatePlaceholderField({
  control,
  errors,
  onLabelChange,
  onRestore,
  placeholder,
  register,
  sourceText,
}: TemplatePlaceholderFieldProps) {
  const fieldName = `labels.${placeholder.key}` as const
  const error = errors.labels?.[placeholder.key]
  const errorId = `placeholder-${placeholder.key}-error`
  const selectionTextId = `placeholder-${placeholder.key}-text`
  const selectedText = sourceText.slice(placeholder.start, placeholder.end)
  const currentLabel = useWatch({
    control,
    defaultValue: placeholder.label,
    name: fieldName,
  })
  const describedBy = error
    ? `${selectionTextId} ${errorId}`
    : selectionTextId
  const restoreButtonLabel = `${currentLabel}: 일반 텍스트로 되돌리기`
  const registration = register(fieldName, {
    onChange(event: ChangeEvent<HTMLInputElement>) {
      onLabelChange(placeholder.key, event.target.value)
    },
  })

  return (
    <li className="grid gap-3 rounded-control border border-line bg-canvas p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="grid gap-1.5">
        <label className="text-sm font-semibold" htmlFor={fieldName}>
          플레이스홀더 이름
        </label>
        <TextField
          aria-describedby={describedBy}
          aria-invalid={error ? "true" : undefined}
          id={fieldName}
          {...registration}
        />
        <div className="grid gap-1 text-xs text-soft-ink">
          <p>되돌릴 텍스트</p>
          <p
            className="max-h-24 overflow-auto whitespace-pre-wrap break-words text-ink"
            id={selectionTextId}
          >
            {selectedText}
          </p>
        </div>
        {error ? (
          <p className="text-xs font-semibold text-danger" id={errorId}>
            {error.message}
          </p>
        ) : null}
      </div>
      <Button
        aria-describedby={selectionTextId}
        aria-label={restoreButtonLabel}
        onClick={() => onRestore(placeholder.key)}
        tone="quiet"
      >
        일반 텍스트로 되돌리기
      </Button>
    </li>
  )
}
