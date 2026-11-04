"use client"

import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react"
import type { UseFormRegisterReturn } from "react-hook-form"

import type { NoteGeometryDraftField } from "@/entities/note"
import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { CloseIcon } from "@/shared/ui/icons"
import { TextField } from "@/shared/ui/text-field"

import {
  geometryFields,
  useNotePropertiesPanel,
  type ApplyDraftOptions,
  type ApplyDraftResult,
} from "../model/use-note-properties-panel"

type GeometryFieldProps = {
  invalid: boolean
  label: string
  maximum?: number
  minimum?: number
  registration: UseFormRegisterReturn<NoteGeometryDraftField>
  onApply(options: ApplyDraftOptions): ApplyDraftResult
}

function GeometryField({
  invalid,
  label,
  maximum,
  minimum,
  onApply,
  registration,
}: GeometryFieldProps) {
  function applyOnBlur(event: ReactFocusEvent<HTMLInputElement>) {
    void registration.onBlur(event)
    onApply({ focusInvalid: false })
  }

  function applyOnEnter(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return
    }

    event.preventDefault()
    onApply({ focusInvalid: true })
  }

  return (
    <label className="grid min-w-0 gap-2 text-base font-medium">
      <span>{label}</span>
      <TextField
        aria-invalid={invalid}
        {...registration}
        {...(maximum === undefined ? {} : { max: maximum })}
        {...(minimum === undefined ? {} : { min: minimum })}
        onBlur={applyOnBlur}
        onKeyDown={applyOnEnter}
        style={{ fontSize: "var(--notes-panel-text-size)", minHeight: "var(--notes-touch-target)" }}
        step="1"
        type="number"
      />
    </label>
  )
}

export function NotePropertiesPanel() {
  const {
    applyDraft,
    closeProperties,
    errors,
    maximums,
    note,
    panel,
    pending,
    registrations,
    restoreSavedGeometry,
    submit,
    title,
    visibleMessage,
  } = useNotePropertiesPanel()

  if (note === undefined || maximums === null) {
    return (
      <aside
        aria-label="메모 속성"
        className="flex h-full flex-col bg-surface-raised"
        ref={panel}
      >
        <header className="flex min-h-[var(--notes-panel-header-height)] shrink-0 items-center justify-between border-b border-line px-[var(--notes-panel-inset)] py-3">
          <h2 className="text-xl font-semibold">메모 속성</h2>
          <IconButton
            aria-label="메모 속성 패널 닫기"
            onClick={closeProperties}
          >
            <CloseIcon />
          </IconButton>
        </header>
        <p className="p-4 text-sm text-danger" role="alert">
          메모를 찾을 수 없습니다.
        </p>
      </aside>
    )
  }

  return (
    <aside
      aria-label="메모 속성"
      className="flex h-full min-h-0 flex-col bg-surface-raised"
      ref={panel}
    >
      <header className="flex min-h-[var(--notes-panel-header-height)] shrink-0 items-center justify-between gap-3 border-b border-line px-[var(--notes-panel-inset)] py-3">
        <h2 className="min-w-0 truncate text-xl font-semibold">메모 속성</h2>
        <IconButton
          aria-label="메모 속성 패널 닫기"
          onClick={closeProperties}
        >
          <CloseIcon />
        </IconButton>
      </header>
      <form className="grid gap-6 overflow-auto p-[var(--notes-panel-inset)]" onSubmit={submit}>
        <h3 className="min-w-0 truncate text-lg font-medium text-soft-ink">{title}</h3>
        <fieldset className="grid grid-cols-2 gap-x-6 gap-y-7" disabled={pending}>
          <legend className="sr-only">위치와 크기</legend>
          {geometryFields.map(({ field, label, minimum }) => (
            <GeometryField
              invalid={errors[field] !== undefined}
              key={field}
              label={label}
              maximum={maximums[field]}
              minimum={minimum}
              onApply={applyDraft}
              registration={registrations[field]}
            />
          ))}
        </fieldset>
        {visibleMessage ? (
          <p className="text-sm leading-6 text-danger" role="alert">
            {visibleMessage}
          </p>
        ) : null}
        <Button
          disabled={pending}
          onClick={restoreSavedGeometry}
          tone="quiet"
          type="button"
        >
          저장값으로 되돌리기
        </Button>
      </form>
    </aside>
  )
}
