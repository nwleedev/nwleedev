"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react"
import type { UseFormRegisterReturn } from "react-hook-form"

import {
  NOTE_HEIGHT_MAX,
  NOTE_HEIGHT_MIN,
  NOTE_WIDTH_MAX,
  NOTE_WIDTH_MIN,
  createNoteGeometryDraft,
  createNoteReference,
  readNoteGeometryDraft,
  type Note,
  type NoteGeometry,
  type NoteGeometryDraftField,
} from "@/entities/note"
import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { CloseIcon } from "@/shared/ui/icons"
import { TextField } from "@/shared/ui/text-field"

import { useNotePropertiesForm } from "../model/note-properties-form-provider"
import { useNoteSession } from "../model/note-session-provider"
import { useNotesData } from "../model/notes-data-provider"

const geometryFields: ReadonlyArray<{
  field: NoteGeometryDraftField
  label: string
  minimum?: number
}> = [
  { field: "x", label: "X" },
  { field: "y", label: "Y" },
  { field: "width", label: "너비", minimum: NOTE_WIDTH_MIN },
  { field: "height", label: "높이", minimum: NOTE_HEIGHT_MIN },
]

const invalidGeometryMessage = "값의 범위와 위치를 확인하세요."

type GeometryInputMaximums = Record<NoteGeometryDraftField, number | undefined>

type ApplyDraftOptions = {
  focusInvalid: boolean
}

type ApplyDraftResult = {
  completion: Promise<boolean>
  valid: boolean
}

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
    <label className="grid gap-1.5 text-xs font-semibold">
      <span>{label}</span>
      <TextField
        aria-invalid={invalid}
        {...registration}
        {...(maximum === undefined ? {} : { max: maximum })}
        {...(minimum === undefined ? {} : { min: minimum })}
        onBlur={applyOnBlur}
        onKeyDown={applyOnEnter}
        step="1"
        type="number"
      />
    </label>
  )
}

function geometryInputMaximums(): GeometryInputMaximums {
  return {
    height: NOTE_HEIGHT_MAX,
    width: NOTE_WIDTH_MAX,
    x: undefined,
    y: undefined,
  }
}

function noteTitle(note: Note) {
  const firstLine = note.content
    .split(/\r?\n/u)
    .find((line) => line.trim().length > 0)

  if (firstLine === undefined) {
    return "빈 메모"
  }

  return firstLine.length > 28 ? `${firstLine.slice(0, 28)}…` : firstLine
}

function sameGeometry(note: Note, geometry: NoteGeometry) {
  return (
    note.geometry.height === geometry.height &&
    note.geometry.width === geometry.width &&
    note.geometry.x === geometry.x &&
    note.geometry.y === geometry.y
  )
}

function availableNotes(notesData: ReturnType<typeof useNotesData>) {
  if (notesData.status === "empty" || notesData.status === "ready") {
    return notesData.notes
  }

  return []
}

export function NotePropertiesPanel() {
  const notesData = useNotesData()
  const session = useNoteSession()
  const {
    clearErrors,
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    reset,
    setError,
    setFocus,
  } = useNotePropertiesForm()
  const panel = useRef<HTMLElement>(null)
  const pendingOperation = useRef<Promise<boolean> | null>(null)
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)
  const propertiesNoteId = session.workspace.propertiesTarget?.id ?? null
  const note = availableNotes(notesData).find(
    ({ id }) => id === propertiesNoteId,
  )
  const title = note === undefined ? "메모 속성" : noteTitle(note)
  const maximums = note === undefined ? null : geometryInputMaximums()
  const fieldValidationFailed = geometryFields.some(
    ({ field }) => errors[field] !== undefined,
  )
  const validationFailed = fieldValidationFailed || errors.root !== undefined
  const visibleMessage = validationFailed ? invalidGeometryMessage : message
  const registrations: Record<
    NoteGeometryDraftField,
    UseFormRegisterReturn<NoteGeometryDraftField>
  > = {
    height: register("height"),
    width: register("width"),
    x: register("x"),
    y: register("y"),
  }

  useEffect(() => {
    const focusFirstField =
      session.workspace.activePanel === "note-properties" &&
      session.workspace.propertiesFocus === "first-field"

    if (focusFirstField) {
      setFocus("x")
    }
  }, [
    propertiesNoteId,
    setFocus,
    session.workspace.activePanel,
    session.workspace.propertiesFocus,
  ])

  const applyDraft = useCallback(({ focusInvalid }: ApplyDraftOptions) => {
    if (note === undefined) {
      return { completion: Promise.resolve(false), valid: true }
    }

    const submittedDraft = getValues()
    const result = readNoteGeometryDraft(
      submittedDraft,
      note.geometry.zIndex,
    )

    if (result.status === "invalid") {
      clearErrors()
      setMessage("")

      for (const field of result.fields) {
        setError(field, { message: invalidGeometryMessage })
      }

      if (result.fields.length === 0) {
        setError("root.geometry", { message: invalidGeometryMessage })
      }

      const firstInvalidField = result.fields[0]

      if (focusInvalid && firstInvalidField !== undefined) {
        requestAnimationFrame(() => setFocus(firstInvalidField))
      }

      return { completion: Promise.resolve(false), valid: false }
    }

    clearErrors()
    setMessage("")

    if (sameGeometry(note, result.geometry)) {
      return { completion: Promise.resolve(true), valid: true }
    }

    if (pendingOperation.current !== null) {
      return { completion: pendingOperation.current, valid: true }
    }

    const expectedReference = session.workspace.propertiesTarget
    setPending(true)
    const operation = notesData
      .updateNote(note, { geometry: result.geometry })
      .then((savedNote) => {
        if (expectedReference !== null) {
          session.confirmPropertiesTarget(
            expectedReference,
            createNoteReference(savedNote),
          )
        }

        const savedFields = createNoteGeometryDraft(savedNote.geometry)
        const latestFields = getValues()
        const unchanged = geometryFields.every(
          ({ field }) => latestFields[field] === submittedDraft[field],
        )

        if (unchanged) {
          reset(savedFields)
        } else {
          reset(savedFields, { keepValues: true })
        }

        return true
      })
      .catch(() => {
        setMessage("메모 위치와 크기를 저장하지 못했습니다. 다시 시도하세요.")
        return false
      })
      .finally(() => {
        pendingOperation.current = null
        setPending(false)
      })
    pendingOperation.current = operation

    return { completion: operation, valid: true }
  }, [
    clearErrors,
    getValues,
    note,
    notesData,
    reset,
    session,
    setError,
    setFocus,
  ])

  useEffect(() => {
    function applyBeforeOutsideAction(event: PointerEvent) {
      const element = panel.current

      if (element === null || element.contains(event.target as Node)) {
        return
      }

      applyDraft({ focusInvalid: false })
    }

    document.addEventListener("pointerdown", applyBeforeOutsideAction, true)
    return () => {
      document.removeEventListener(
        "pointerdown",
        applyBeforeOutsideAction,
        true,
      )
    }
  }, [applyDraft])

  function submit(event: FormEvent<HTMLFormElement>) {
    void handleSubmit(() => {
      return applyDraft({ focusInvalid: true }).completion
    })(event)
  }

  async function closeProperties() {
    if (note === undefined) {
      session.closePanel()
      return
    }

    const application = applyDraft({ focusInvalid: true })

    if (!application.valid) {
      return
    }

    const saved = await application.completion

    if (saved) {
      session.closeProperties(note.id)
    }
  }

  function restoreSavedGeometry() {
    if (note === undefined) {
      return
    }

    reset(createNoteGeometryDraft(note.geometry))
    setMessage("")
    session.restorePropertiesTarget(createNoteReference(note))
  }

  if (note === undefined || maximums === null) {
    return (
      <aside
        aria-label="메모 속성"
        className="flex h-full flex-col bg-surface-raised"
        ref={panel}
      >
        <header className="flex h-[2.375rem] items-center justify-between border-b border-line px-3">
          <h2 className="text-sm font-semibold">메모 속성</h2>
          <IconButton
            aria-label="메모 속성 패널 닫기"
            onClick={closeProperties}
            size="compact"
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
      <header className="flex h-[2.375rem] shrink-0 items-center justify-between gap-3 border-b border-line px-3">
        <h2 className="min-w-0 truncate text-sm font-semibold">
          {title}
        </h2>
        <IconButton
          aria-label="메모 속성 패널 닫기"
          onClick={closeProperties}
          size="compact"
        >
          <CloseIcon />
        </IconButton>
      </header>
      <form className="grid gap-4 overflow-auto p-4" onSubmit={submit}>
        <fieldset className="grid grid-cols-2 gap-3" disabled={pending}>
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
