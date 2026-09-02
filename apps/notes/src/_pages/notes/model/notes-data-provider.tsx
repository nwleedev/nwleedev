"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react"

import {
  createNoteReference,
  isRecoverableNoteDraft,
  nextNoteTabIndex,
  reviseNote,
  sendNoteToBack,
  sendNoteToFront,
  type Note,
  type NoteDraftRepository,
  type NoteGeometry,
  type NoteRepository,
} from "@/entities/note"
import type { IndividualCopyUsageWriter } from "@/entities/usage"
import type { ClipboardWriter } from "@/shared/lib/clipboard"

import type { NoteStorageMonitor } from "./note-storage-monitor"
import {
  copyNote as executeCopyNote,
  type CopyNoteResult,
} from "./copy-note"
import {
  saveNoteContent as executeSaveNoteContent,
  type SaveNoteContentResult,
} from "./save-note-content"

type NoteDraftContent = Readonly<Record<string, string>>

type AvailableNotesData = {
  draftContentByNote: NoteDraftContent
  notes: readonly Note[]
}

type NotesDataState =
  | { status: "loading" }
  | ({ status: "empty" | "ready" } & AvailableNotesData)
  | { status: "blocked" }
  | { status: "version-changed" }
  | { status: "failure" }

type NotesDataContextValue = NotesDataState & {
  copyNote(note: Note): Promise<CopyNoteResult>
  createNote(): Promise<Note>
  batchCopyShortcutEnabled: boolean
  moveNoteToBack(noteId: string): Promise<readonly Note[]>
  moveNoteToFront(noteId: string): Promise<readonly Note[]>
  removeNote(note: Note): Promise<void>
  restoreNote(note: Note): Promise<Note>
  retry(): void
  saveContent(note: Note, content: string): Promise<SaveNoteContentResult>
  updateNote(
    note: Note,
    change: { content?: string; geometry?: NoteGeometry },
  ): Promise<Note>
}

const NotesDataContext = createContext<NotesDataContextValue | null>(null)
const defaultNoteHeight = 240
const defaultNoteWidth = 320
const notePlacementGap = 32

async function readNotes(
  repository: NoteRepository,
  drafts: NoteDraftRepository,
): Promise<NotesDataState> {
  try {
    const notes = await repository.getAll()
    const draftEntries = await Promise.all(
      notes.map(async (note) => {
        const draft = await drafts.get({
          contentRevision: note.contentRevision,
          id: note.id,
        })

        return draft !== null && isRecoverableNoteDraft(draft, note)
          ? ([note.id, draft.content] as const)
          : null
      }),
    )
    const draftContentByNote = Object.fromEntries(
      draftEntries.filter((entry) => entry !== null),
    )

    return notes.length === 0
      ? { draftContentByNote, notes, status: "empty" }
      : { draftContentByNote, notes, status: "ready" }
  } catch {
    return { status: "failure" }
  }
}

type NotesDataProviderProps = PropsWithChildren<{
  clipboard: ClipboardWriter
  createId(): string
  batchCopyShortcutEnabled: boolean
  drafts: NoteDraftRepository
  now(): string
  repository: NoteRepository
  storageMonitor: NoteStorageMonitor
  usage: IndividualCopyUsageWriter
}>

function notesFromState(state: NotesDataState) {
  return state.status === "ready" || state.status === "empty"
    ? state.notes
    : []
}

function draftContentFromState(state: NotesDataState) {
  return state.status === "ready" || state.status === "empty"
    ? state.draftContentByNote
    : {}
}

function overlapsExistingNote(
  candidate: NoteGeometry,
  existing: NoteGeometry,
) {
  const separatedHorizontally =
    candidate.x + candidate.width + notePlacementGap <= existing.x ||
    existing.x + existing.width + notePlacementGap <= candidate.x
  const separatedVertically =
    candidate.y + candidate.height + notePlacementGap <= existing.y ||
    existing.y + existing.height + notePlacementGap <= candidate.y

  return !separatedHorizontally && !separatedVertically
}

function nextGeometry(notes: readonly Note[]): NoteGeometry {
  const highestLayer = notes.reduce(
    (highest, note) => Math.max(highest, note.geometry.zIndex),
    0,
  )
  const cellWidth = notes.reduce(
    (width, note) => Math.max(width, note.geometry.width),
    defaultNoteWidth,
  )
  const cellHeight = notes.reduce(
    (height, note) => Math.max(height, note.geometry.height),
    defaultNoteHeight,
  )
  const maximumAttempts = notes.length * 4 + 4

  for (let offset = 0; offset < maximumAttempts; offset += 1) {
    const index = notes.length + offset
    const column = index % 2
    const row = Math.floor(index / 2)
    const candidate: NoteGeometry = {
      height: defaultNoteHeight,
      width: defaultNoteWidth,
      x: notePlacementGap + column * (cellWidth + notePlacementGap),
      y: notePlacementGap + row * (cellHeight + notePlacementGap),
      zIndex: highestLayer + 1,
    }
    const occupied = notes.some((note) =>
      overlapsExistingNote(candidate, note.geometry),
    )

    if (!occupied) {
      return candidate
    }
  }

  const lowestEdge = notes.reduce(
    (edge, note) => Math.max(edge, note.geometry.y + note.geometry.height),
    0,
  )

  return {
    height: defaultNoteHeight,
    width: defaultNoteWidth,
    x: notePlacementGap,
    y: lowestEdge + notePlacementGap,
    zIndex: highestLayer + 1,
  }
}

export function NotesDataProvider({
  children,
  clipboard,
  createId,
  drafts,
  batchCopyShortcutEnabled,
  now,
  repository,
  storageMonitor,
  usage,
}: NotesDataProviderProps) {
  const [state, setState] = useState<NotesDataState>({ status: "loading" })
  const readSequence = useRef(0)

  useEffect(() => {
    let active = true
    const sequence = ++readSequence.current
    const unsubscribe = storageMonitor.subscribe((event) => {
      if (event === "blocked") {
        setState({ status: event })
        return
      }

      readSequence.current += 1
      setState({ status: event })
    })
    void readNotes(repository, drafts).then((nextState) => {
      if (active && readSequence.current === sequence) {
        setState(nextState)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [drafts, repository, storageMonitor])

  function retry() {
    const sequence = ++readSequence.current
    setState({ status: "loading" })
    void readNotes(repository, drafts).then((nextState) => {
      if (readSequence.current === sequence) {
        setState(nextState)
      }
    })
  }

  async function createNote() {
    const notes = notesFromState(state)
    const timestamp = now()
    const note: Note = {
      content: "",
      contentRevision: 0,
      createdAt: timestamp,
      geometry: nextGeometry(notes),
      id: createId(),
      revision: 0,
      tabIndex: nextNoteTabIndex(notes),
      updatedAt: timestamp,
    }
    const savedNote = await repository.save(note)

    setState((current) => ({
      draftContentByNote: draftContentFromState(current),
      notes: [...notesFromState(current), savedNote],
      status: "ready",
    }))

    return savedNote
  }

  function copyNote(note: Note) {
    return executeCopyNote({ clipboard, usage }, note)
  }

  async function saveContent(note: Note, content: string) {
    const result = await executeSaveNoteContent(
      { drafts, notes: repository, now },
      note,
      content,
    )

    if (result.status === "failure") {
      return result
    }

    setState((current) => {
      const currentNotes = notesFromState(current)
      const nextNotes = currentNotes.map((currentNote) =>
        currentNote.id === result.note.id ? result.note : currentNote,
      )
      const nextDraftContent = { ...draftContentFromState(current) }
      delete nextDraftContent[result.note.id]

      return {
        draftContentByNote: nextDraftContent,
        notes: nextNotes,
        status: nextNotes.length === 0 ? "empty" : "ready",
      }
    })

    return result
  }

  async function updateNote(
    note: Note,
    change: { content?: string; geometry?: NoteGeometry },
  ) {
    const nextNote = reviseNote(note, { ...change, updatedAt: now() })
    const savedNote = await repository.save(nextNote)

    setState((current) => {
      if (current.status !== "ready") {
        return current
      }

      return {
        draftContentByNote: draftContentFromState(current),
        notes: current.notes.map((currentNote) =>
          currentNote.id === savedNote.id ? savedNote : currentNote,
        ),
        status: "ready",
      }
    })

    return savedNote
  }

  async function changeStack(noteId: string, edge: "back" | "front") {
    const notes = notesFromState(state)
    const timestamp = now()
    const ordered = edge === "front"
      ? sendNoteToFront(notes, noteId, timestamp)
      : sendNoteToBack(notes, noteId, timestamp)
    const savedNotes = await repository.saveAll(ordered)

    setState((current) => ({
      draftContentByNote: draftContentFromState(current),
      notes: savedNotes,
      status: savedNotes.length === 0 ? "empty" : "ready",
    }))
    return savedNotes
  }

  function moveNoteToFront(noteId: string) {
    return changeStack(noteId, "front")
  }

  function moveNoteToBack(noteId: string) {
    return changeStack(noteId, "back")
  }

  async function removeNote(note: Note) {
    await repository.remove(createNoteReference(note))
    setState((current) => {
      const notes = notesFromState(current).filter(
        (currentNote) => currentNote.id !== note.id,
      )
      const draftContentByNote = { ...draftContentFromState(current) }
      delete draftContentByNote[note.id]

      return {
        draftContentByNote,
        notes,
        status: notes.length === 0 ? "empty" : "ready",
      }
    })
  }

  async function restoreNote(note: Note) {
    const savedNote = await repository.save(note)

    setState((current) => {
      const notes = [...notesFromState(current), savedNote]
      return {
        draftContentByNote: draftContentFromState(current),
        notes,
        status: "ready",
      }
    })
    return savedNote
  }

  return (
    <NotesDataContext
      value={{
        ...state,
        copyNote,
        createNote,
        moveNoteToBack,
        moveNoteToFront,
        batchCopyShortcutEnabled,
        removeNote,
        restoreNote,
        retry,
        saveContent,
        updateNote,
      }}
    >
      {children}
    </NotesDataContext>
  )
}

export function useNotesData() {
  const context = useContext(NotesDataContext)

  if (context === null) {
    throw new Error("useNotesData must be used within NotesDataProvider")
  }

  return context
}
