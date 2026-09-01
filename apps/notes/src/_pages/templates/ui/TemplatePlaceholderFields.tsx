import type { ChangeEvent } from "react"
import type {
  FieldErrors,
  UseFormRegister,
} from "react-hook-form"

import type {
  TemplateDraft,
  TemplatePlaceholderRange,
} from "@/entities/template"
import { Button } from "@/shared/ui/button"
import { TextField } from "@/shared/ui/text-field"

export type TemplateSaveFields = {
  labels: Record<string, string>
  title: string
}

type PlaceholderNameFieldProps = {
  errors: FieldErrors<TemplateSaveFields>
  placeholder: TemplatePlaceholderRange
  register: UseFormRegister<TemplateSaveFields>
  onRename(key: string, label: string): void
  onRestore(key: string): void
}

function PlaceholderNameField({
  errors,
  onRename,
  onRestore,
  placeholder,
  register,
}: PlaceholderNameFieldProps) {
  const fieldName = `labels.${placeholder.key}` as const
  const error = errors.labels?.[placeholder.key]
  const errorId = `placeholder-${placeholder.key}-error`
  const selectionTextId = `placeholder-${placeholder.key}-text`
  const registration = register(fieldName, {
    onChange(event: ChangeEvent<HTMLInputElement>) {
      onRename(placeholder.key, event.target.value)
    },
  })

  return (
    <li className="grid gap-3 rounded-control border border-line bg-canvas p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="grid gap-1.5">
        <label className="text-sm font-semibold" htmlFor={fieldName}>
          플레이스홀더 이름
        </label>
        <TextField
          aria-describedby={error ? errorId : selectionTextId}
          aria-invalid={error ? "true" : undefined}
          defaultValue={placeholder.label}
          id={fieldName}
          {...registration}
        />
        <p
          className="truncate text-xs text-soft-ink"
          id={selectionTextId}
        >
          선택한 텍스트 {placeholder.start + 1}–{placeholder.end}
        </p>
        {error ? (
          <p className="text-xs font-semibold text-danger" id={errorId}>
            {error.message}
          </p>
        ) : null}
      </div>
      <Button onClick={() => onRestore(placeholder.key)} tone="quiet">
        일반 텍스트로 되돌리기
      </Button>
    </li>
  )
}

type TemplatePlaceholderFieldsProps = {
  draft: TemplateDraft
  errors: FieldErrors<TemplateSaveFields>
  register: UseFormRegister<TemplateSaveFields>
  onRename(key: string, label: string): void
  onRestore(key: string): void
}

export function TemplatePlaceholderFields({
  draft,
  errors,
  onRename,
  onRestore,
  register,
}: TemplatePlaceholderFieldsProps) {
  if (draft.placeholders.length === 0) {
    return null
  }

  return (
    <ol className="grid gap-3">
      {draft.placeholders.map((placeholder) => (
        <PlaceholderNameField
          errors={errors}
          key={placeholder.key}
          onRename={onRename}
          onRestore={onRestore}
          placeholder={placeholder}
          register={register}
        />
      ))}
    </ol>
  )
}
