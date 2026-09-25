import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
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

import { useNotePropertiesForm } from "./use-note-properties-form"
import { useNoteSession } from "./use-note-session-state"
import { useNotesData } from "./use-notes-data-model"

export const geometryFields: ReadonlyArray<{
  field: NoteGeometryDraftField
  label: string
  minimum?: number
}> = [
  { field: "x", label: "X" },
  { field: "y", label: "Y" },
  { field: "width", label: "너비", minimum: NOTE_WIDTH_MIN },
  { field: "height", label: "높이", minimum: NOTE_HEIGHT_MIN },
]

export const invalidGeometryMessage = "값의 범위와 위치를 확인하세요."

type GeometryInputMaximums = Record<NoteGeometryDraftField, number | undefined>

export type ApplyDraftOptions = { focusInvalid: boolean }
export type ApplyDraftResult = { completion: Promise<boolean>; valid: boolean }

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

export function useNotePropertiesPanel() {
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
  const notes = notesData.status === "empty" || notesData.status === "ready"
    ? notesData.notes
    : []
  const note = notes.find(({ id }) => id === propertiesNoteId)
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

  return {
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
  }
}
