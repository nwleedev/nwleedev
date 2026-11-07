import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import {
  findNewNoteGeometry,
  nextNoteTabIndex,
  type Note,
  type NoteGeometry,
  type NoteRepository,
  type MobileNoteOrder,
  type MobileNotePosition,
  type MoveMobileNoteInput,
  type MoveMobileNoteResult,
} from "@/entities/note"
import { z } from "zod"
import { EntityIdSchema } from "@/shared/lib/entity-metadata"
import type { ClipboardWriter } from "@/shared/lib/clipboard"

import type { IndexedDbMonitor } from "@/shared/lib/indexed-db"
import {
  copyNote as executeCopyNote,
  type CopyNoteResult,
} from "./copy-note"
import {
  saveNoteContent as executeSaveNoteContent,
  type SaveNoteContentResult,
} from "./save-note-content"

const NOTE_CHANNEL_NAME = "personal-notes-changes"
const NoteChangeSchema = z.object({ type: z.enum(["created", "edited", "removed"]), noteId: EntityIdSchema })

type AvailableNotesData = {
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
  onRemoteRemoval(listener: (id: string) => void): () => void
  watchEditor(id: string, onDeleted: (note: Note) => void): () => void
  removeNote(note: Note): Promise<Note>
  restoreNote(note: Note, position?: MobileNotePosition): Promise<Note>
  readMobileOrder(): Promise<MobileNoteOrder>
  moveMobileNote(input: MoveMobileNoteInput): Promise<MoveMobileNoteResult>
  retry(): void
  saveContent(note: Note, content: string): Promise<SaveNoteContentResult>
  saveGeometry(
    note: Note,
    geometry: NoteGeometry,
  ): Promise<Note>
}

export const NotesDataContext = createContext<NotesDataContextValue | null>(null)

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
  const changes = useRef<BroadcastChannel | null>(null)
  const availableNotesReference = useRef<readonly Note[]>([])
  const mutationQueue = useRef<Promise<void>>(Promise.resolve())

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

  const publishAvailable = useCallback((
    notes: readonly Note[],
  ) => {
    availableNotesReference.current = notes
    setState({
      notes,
      status: notes.length === 0 ? "empty" : "ready",
    })
  }, [])

  function enqueue<Result>(operation: () => Promise<Result>) {
    const result = mutationQueue.current.then(operation)
    mutationQueue.current = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

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
          availableNotesReference.current = nextState.notes
        }

        setState(nextState)
      }
    })

    const channel = new BroadcastChannel(NOTE_CHANNEL_NAME)
    changes.current = channel
    channel.onmessage = ({ data }: MessageEvent<unknown>) => {
      const message = NoteChangeSchema.safeParse(data)
      if (!message.success) return
      const { noteId, type } = message.data
      void enqueue(async () => {
        if (!active) return
        const current = availableNotesReference.current
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
    }

    return () => {
      active = false
      changes.current = null
      channel.close()
      unsubscribe()
    }
  }, [publishAvailable, repository, storageMonitor])

  function retry() {
    const sequence = ++readSequence.current
    setState({ status: "loading" })
    void readNotes(repository).then((nextState) => {
      if (readSequence.current === sequence) {
        if (nextState.status === "empty" || nextState.status === "ready") {
          availableNotesReference.current = nextState.notes
        }

        setState(nextState)
      }
    })
  }

  async function createNote() {
    return enqueue(async () => {
      const notes = availableNotesReference.current
      const timestamp = now()
      const note: Note = {
        content: "",
        createdAt: timestamp,
        geometry: findNewNoteGeometry(notes.map(({ geometry }) => geometry)),
        id: createId(),
        tabIndex: nextNoteTabIndex(notes),
        updatedAt: timestamp,
      }
      const savedNote = await repository.save(note)

      publishAvailable(
        [...availableNotesReference.current, savedNote],
      )
      changes.current?.postMessage({ type: "created", noteId: savedNote.id })
      return savedNote
    })
  }

  function copyNote(note: Note) {
    return executeCopyNote(clipboard, note)
  }

  async function saveContent(original: Note, content: string) {
    const noteId = original.id
    return enqueue(async () => {
      const note = availableNotesReference.current.find(
        ({ id }) => id === noteId,
      )

      if (note === undefined) {
        return { reason: "note-missing", status: "failure" } as const
      }

      const result = await executeSaveNoteContent(
        { notes: repository, now },
        original,
        content,
      )

      if (result.status === "failure") {
        return result
      }

      if (result.status === "saved") changes.current?.postMessage({ type: "edited", noteId })
      const displayed = note === original ? result.note : await repository.get(noteId) ?? result.note
      const nextNotes = availableNotesReference.current.map((currentNote) =>
        currentNote.id === result.note.id ? displayed : currentNote,
      )
      publishAvailable(nextNotes)
      return result
    })
  }

  async function saveGeometry(note: Note, geometry: NoteGeometry) {
    return enqueue(async () => {
      const savedNote = await repository.saveGeometry(note, geometry, now())
      if (!savedNote) throw new Error("Cannot move a deleted note")
      changes.current?.postMessage({ type: "edited", noteId: note.id })
      const nextNotes = availableNotesReference.current.map((current) =>
        current.id === savedNote.id ? savedNote : current,
      )
      publishAvailable(nextNotes)
      return savedNote
    })
  }

  async function changeStack(noteId: string, edge: "back" | "front") {
    return enqueue(async () => {
      const notes = availableNotesReference.current
      const target = notes.find(({ id }) => id === noteId)
      if (!target) return notes
      const { notes: savedNotes, changedIds } = await repository.moveInStack(target, edge, now())
      for (const id of changedIds) {
        changes.current?.postMessage({ type: "edited", noteId: id })
      }
      publishAvailable(savedNotes)
      return savedNotes
    })
  }

  function moveNoteToFront(noteId: string) {
    return changeStack(noteId, "front")
  }

  function moveNoteToBack(noteId: string) {
    return changeStack(noteId, "back")
  }

  async function removeNote(note: Note) {
    return enqueue(async () => {
      const currentNote = availableNotesReference.current.find(
        ({ id }) => id === note.id,
      )

      if (currentNote === undefined) {
        throw new Error("Cannot remove a missing note")
      }

      const deleted = await repository.remove(currentNote)
      if (!deleted) throw new Error("Cannot remove a missing note")
      const notes = availableNotesReference.current.filter(
        ({ id }) => id !== currentNote.id,
      )
      publishAvailable(notes)
      changes.current?.postMessage({ type: "removed", noteId: note.id })
      return deleted
    })
  }

  async function restoreNote(note: Note, position?: MobileNotePosition) {
    return enqueue(async () => {
      const savedNote = await repository.restore(note, position)
      changes.current?.postMessage({ type: "edited", noteId: note.id })
      const notes = [...availableNotesReference.current.filter(({ id }) => id !== note.id), savedNote]
      publishAvailable(notes)
      return savedNote
    })
  }

  return {
    ...state,
    onRemoteRemoval,
    watchEditor,
    copyNote,
    createNote,
    moveNoteToBack,
    moveNoteToFront,
    readMobileOrder,
    moveMobileNote,
    batchCopyShortcutEnabled,
    removeNote,
    restoreNote,
    retry,
    saveContent,
    saveGeometry,
  }
}

export function useNotesData() {
  const context = useContext(NotesDataContext)

  if (context === null) {
    throw new Error("useNotesData must be used within NotesDataProvider")
  }

  return context
}
