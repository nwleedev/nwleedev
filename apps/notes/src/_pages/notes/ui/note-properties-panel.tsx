"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react"

import {
  NOTE_CANVAS_SIZE,
  NOTE_HEIGHT_MAX,
  NOTE_HEIGHT_MIN,
  NOTE_WIDTH_MAX,
  NOTE_WIDTH_MIN,
  createNoteReference,
  readNoteGeometryDraft,
  type Note,
  type NoteGeometryDraft,
  type NoteGeometryDraftField,
} from "@/entities/note"
import { IconButton } from "@/shared/ui/icon-button"
import { CloseIcon } from "@/shared/ui/icons"
import { TextField } from "@/shared/ui/text-field"

import { useNoteSession } from "../model/note-session-provider"
import { useNotesData } from "../model/notes-data-provider"

const geometryFields: ReadonlyArray<{
  field: NoteGeometryDraftField
  label: string
  maximum: number
  minimum: number
}> = [
  { field: "x", label: "X", maximum: NOTE_CANVAS_SIZE, minimum: 1 },
  { field: "y", label: "Y", maximum: NOTE_CANVAS_SIZE, minimum: 1 },
  {
    field: "width",
    label: "너비",
    maximum: NOTE_WIDTH_MAX,
    minimum: NOTE_WIDTH_MIN,
  },
  {
    field: "height",
    label: "높이",
    maximum: NOTE_HEIGHT_MAX,
    minimum: NOTE_HEIGHT_MIN,
  },
]

function noteTitle(note: Note) {
  const firstLine = note.content
    .split(/\r?\n/u)
    .find((line) => line.trim().length > 0)

  if (firstLine === undefined) {
    return "빈 메모"
  }

  return firstLine.length > 28 ? `${firstLine.slice(0, 28)}…` : firstLine
}

function geometryDraft(note: Note): NoteGeometryDraft {
  return {
    height: String(note.geometry.height),
    width: String(note.geometry.width),
    x: String(note.geometry.x),
    y: String(note.geometry.y),
  }
}

function sameGeometry(note: Note, draft: NoteGeometryDraft) {
  return (
    String(note.geometry.height) === draft.height &&
    String(note.geometry.width) === draft.width &&
    String(note.geometry.x) === draft.x &&
    String(note.geometry.y) === draft.y
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
  const panel = useRef<HTMLElement>(null)
  const firstField = useRef<HTMLInputElement>(null)
  const pendingReference = useRef(false)
  const [invalidFields, setInvalidFields] = useState<
    readonly NoteGeometryDraftField[]
  >([])
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)
  const note = availableNotes(notesData).find(
    ({ id }) => id === session.workspace.propertiesNoteId,
  )
  const draft = session.workspace.geometryDraft?.fields ?? null
  const title = note === undefined ? "메모 속성" : noteTitle(note)

  useEffect(() => {
    firstField.current?.focus()
  }, [session.workspace.propertiesNoteId])

  const applyDraft = useCallback(() => {
    if (note === undefined || draft === null || pendingReference.current) {
      return true
    }

    const result = readNoteGeometryDraft(draft, note.geometry.zIndex)

    if (result.status === "invalid") {
      setInvalidFields(result.fields)
      setMessage("값의 범위와 캔버스 안의 위치를 확인하세요.")
      return false
    }

    setInvalidFields([])
    setMessage("")

    if (sameGeometry(note, draft)) {
      return true
    }

    pendingReference.current = true
    setPending(true)
    void notesData
      .updateNote(note, { geometry: result.geometry })
      .then((savedNote) => {
        session.activateProperties(
          createNoteReference(savedNote),
          geometryDraft(savedNote),
        )
      })
      .catch(() => {
        setMessage("메모 위치와 크기를 저장하지 못했습니다. 다시 시도하세요.")
      })
      .finally(() => {
        pendingReference.current = false
        setPending(false)
      })

    return true
  }, [draft, note, notesData, session])

  useEffect(() => {
    function applyBeforeOutsideAction(event: PointerEvent) {
      const element = panel.current

      if (element === null || element.contains(event.target as Node)) {
        return
      }

      if (!applyDraft()) {
        event.preventDefault()
        event.stopPropagation()
      }
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
    event.preventDefault()
    applyDraft()
  }

  function applyOnEnter(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return
    }

    event.preventDefault()
    applyDraft()
  }

  if (note === undefined || draft === null) {
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
            onClick={session.closePanel}
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
          onClick={session.closePanel}
          size="compact"
        >
          <CloseIcon />
        </IconButton>
      </header>
      <form className="grid gap-4 overflow-auto p-4" onSubmit={submit}>
        <fieldset className="grid grid-cols-2 gap-3" disabled={pending}>
          <legend className="sr-only">위치와 크기</legend>
          {geometryFields.map(({ field, label, maximum, minimum }, index) => {
            const invalid = invalidFields.includes(field)

            return (
              <label className="grid gap-1.5 text-xs font-semibold" key={field}>
                <span>{label}</span>
                <TextField
                  aria-invalid={invalid}
                  max={maximum}
                  min={minimum}
                  name={field}
                  onBlur={applyDraft}
                  onChange={(event) =>
                    session.changeGeometryDraft(field, event.target.value)
                  }
                  onKeyDown={applyOnEnter}
                  ref={index === 0 ? firstField : undefined}
                  step="1"
                  type="number"
                  value={draft[field]}
                />
              </label>
            )
          })}
        </fieldset>
        {message ? (
          <p className="text-sm leading-6 text-danger" role="alert">
            {message}
          </p>
        ) : null}
      </form>
    </aside>
  )
}
