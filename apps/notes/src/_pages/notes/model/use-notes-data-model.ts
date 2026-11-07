import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  type Note,
  type NoteRepository,
  type MobileNoteOrder,
  type MoveMobileNoteInput,
  type MoveMobileNoteResult,
} from "@/entities/note"
import type { ClipboardWriter } from "@/shared/lib/clipboard"

import type { IndexedDbMonitor } from "@/shared/lib/indexed-db"
import type { NotesDataState } from "./notes-data-context"
import { createNoteCommands } from "./note-commands"
import { openNoteChanges } from "./note-changes"

async function readNotes(
  repository: NoteRepository,
): Promise<NotesDataState> {
  try {
    const notes = await repository.getAll()
    return { notes, status: notes.length === 0 ? "empty" : "ready" }
  } catch {
    return { status: "failure" }
  }
}

export type NotesDataDependencies = {
  clipboard: ClipboardWriter
  createId(): string
  batchCopyShortcutEnabled: boolean
  now(): number
  repository: NoteRepository
  readMobileOrder(): Promise<MobileNoteOrder>
  moveMobileNote(input: MoveMobileNoteInput): Promise<MoveMobileNoteResult>
  storageMonitor: IndexedDbMonitor
}

export function useNotesDataModel({
  clipboard,
  createId,
  batchCopyShortcutEnabled,
  now,
  repository,
  readMobileOrder,
  moveMobileNote,
  storageMonitor,
}: NotesDataDependencies) {
  const [state, setState] = useState<NotesDataState>({ status: "loading" })
  const readSequence = useRef(0)
  const [operations] = useState(() => createNoteCommands({
    clipboard,
    createId,
    now,
    repository,
    onChange: (notes) => setState({
      notes,
      status: notes.length === 0 ? "empty" : "ready",
    }),
  }))
  const { enqueue, publishAvailable, readAvailable, connectChanges } = operations

  const removalListeners = useRef(new Set<(id: string) => void>())
  const onRemoteRemoval = useCallback((listener: (id: string) => void) => {
    const listeners = removalListeners.current
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])
  const editors = useRef(new Map<string, (note: Note) => void>())
  const watchEditor = useCallback((id: string, onDeleted: (note: Note) => void) => {
    let active = true
    let leave: (() => Promise<void>) | null = null
    const opened = repository.openEditor(id).catch(() => null)
    const notify = (note: Note) => {
      void opened.then((release) => {
        if (active && release) onDeleted(note)
      })
    }
    editors.current.set(id, notify)
    void opened.then((release) => {
      if (active) leave = release
      else void release?.().catch(() => undefined)
    })
    return () => {
      active = false
      editors.current.delete(id)
      void leave?.().catch(() => undefined)
    }
  }, [repository])

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
    void enqueue(async () => {
      const nextState = await readNotes(repository)
      if (active && readSequence.current === sequence) {
        if (nextState.status === "empty" || nextState.status === "ready") {
          publishAvailable(nextState.notes)
        } else {
          setState(nextState)
        }
      }
    })

    const channel = openNoteChanges(({ noteId, type }) => {
      void enqueue(async () => {
        if (!active) return
        const current = readAvailable()
        const index = current.findIndex(({ id }) => id === noteId)
        if (index >= 0 && type === "created") return
        const note = await repository.get(noteId)
        if (!active) return
        if (!note) {
          if (index < 0 || type !== "removed") return
          const listener = editors.current.get(noteId)
          if (listener) {
            const removed = await repository.deletedNote(noteId)
            if (active && removed) listener(removed)
          }
          if (!active) return
          for (const notify of removalListeners.current) notify(noteId)
          publishAvailable(current.filter(({ id }) => id !== noteId))
          return
        }
        const next = [...current]
        if (index < 0) next.push(note)
        else next[index] = note
        publishAvailable(next)
      }).catch(() => undefined)
    })
    connectChanges(channel)

    return () => {
      active = false
      connectChanges(null)
      channel.close()
      unsubscribe()
    }
  }, [connectChanges, enqueue, publishAvailable, readAvailable, repository, storageMonitor])

  const retry = useCallback(() => {
    const sequence = ++readSequence.current
    setState({ status: "loading" })
    void readNotes(repository).then((nextState) => {
      if (readSequence.current === sequence) {
        if (nextState.status === "empty" || nextState.status === "ready") {
          publishAvailable(nextState.notes)
        } else {
          setState(nextState)
        }
      }
    })
  }, [publishAvailable, repository])

  const commands = useMemo(() => ({
    copyNote: operations.copyNote,
    createNote: operations.createNote,
    moveNoteToBack: operations.moveNoteToBack,
    moveNoteToFront: operations.moveNoteToFront,
    removeNote: operations.removeNote,
    restoreNote: operations.restoreNote,
    saveContent: operations.saveContent,
    saveGeometry: operations.saveGeometry,
    onRemoteRemoval,
    watchEditor,
    readMobileOrder,
    moveMobileNote,
    retry,
  }), [operations, onRemoteRemoval, watchEditor, readMobileOrder, moveMobileNote, retry])

  return { state: { ...state, batchCopyShortcutEnabled }, commands }
}
