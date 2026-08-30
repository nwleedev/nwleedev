"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react"

import type { Note, NoteRepository } from "@/entities/note"

import type { NoteStorageMonitor } from "./NoteStorageMonitor"

type NotesDataState =
  | { status: "loading" }
  | { status: "empty" }
  | { notes: readonly Note[]; status: "ready" }
  | { status: "blocked" }
  | { status: "version-changed" }
  | { status: "failure" }

type NotesDataContextValue = NotesDataState & {
  retry(): void
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
  repository: NoteRepository
  storageMonitor: NoteStorageMonitor
}>

export function NotesDataProvider({
  children,
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

  return (
    <NotesDataContext value={{ ...state, retry }}>
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
