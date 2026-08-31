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
  reviseNote,
  type Note,
  type NoteGeometry,
  type NoteRepository,
} from "@/entities/note"

import type { NoteStorageMonitor } from "./NoteStorageMonitor"

type NotesDataState =
  | { status: "loading" }
  | { status: "empty" }
  | { notes: readonly Note[]; status: "ready" }
  | { status: "blocked" }
  | { status: "version-changed" }
  | { status: "failure" }

type NotesDataContextValue = NotesDataState & {
  createNote(): Promise<Note>
  retry(): void
  updateNote(
    note: Note,
    change: { content?: string; geometry?: NoteGeometry },
  ): Promise<Note>
}

const NotesDataContext = createContext<NotesDataContextValue | null>(null)

async function readNotes(repository: NoteRepository): Promise<NotesDataState> {
  try {
    const notes = await repository.getAll()

    return notes.length === 0
      ? { status: "empty" }
      : { notes, status: "ready" }
  } catch {
    return { status: "failure" }
  }
}

type NotesDataProviderProps = PropsWithChildren<{
  createId(): string
  now(): string
  repository: NoteRepository
  storageMonitor: NoteStorageMonitor
}>

function notesFromState(state: NotesDataState) {
  return state.status === "ready" ? state.notes : []
}

function nextGeometry(notes: readonly Note[]): NoteGeometry {
  const index = notes.length
  const highestLayer = notes.reduce(
    (highest, note) => Math.max(highest, note.geometry.zIndex),
    0,
  )

  return {
    height: 240,
    width: 320,
    x: 32 + (index % 4) * 40,
    y: 32 + (index % 5) * 36,
    zIndex: highestLayer + 1,
  }
}

export function NotesDataProvider({
  children,
  createId,
  now,
  repository,
  storageMonitor,
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
    void readNotes(repository).then((nextState) => {
      if (active && readSequence.current === sequence) {
        setState(nextState)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [repository, storageMonitor])

  function retry() {
    const sequence = ++readSequence.current
    setState({ status: "loading" })
    void readNotes(repository).then((nextState) => {
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
      updatedAt: timestamp,
    }
    const savedNote = await repository.save(note)

    setState((current) => ({
      notes: [...notesFromState(current), savedNote],
      status: "ready",
    }))

    return savedNote
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
        notes: current.notes.map((currentNote) =>
          currentNote.id === savedNote.id ? savedNote : currentNote,
        ),
        status: "ready",
      }
    })

    return savedNote
  }

  return (
    <NotesDataContext value={{ ...state, createNote, retry, updateNote }}>
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
