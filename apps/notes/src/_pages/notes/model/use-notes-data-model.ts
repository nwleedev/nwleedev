import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

import {
  createNoteReference,
  findNewNoteGeometry,
  isRecoverableNoteDraft,
  nextNoteTabIndex,
  reviseNote,
  sendNoteToBack,
  sendNoteToFront,
  type Note,
  type NoteDraftRepository,
  type NoteGeometry,
  type NoteRepository,
  type MobileNoteOrder,
  type MobileNotePosition,
  type MoveMobileNoteInput,
  type MoveMobileNoteResult,
} from "@/entities/note"
import type { IndividualCopyUsageWriter } from "@/entities/usage"
import { z } from "zod"
import { EntityIdSchema } from "@/shared/lib/entity-metadata"
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

const NOTE_CHANNEL_NAME = "personal-notes-changes"
const NoteChangeSchema = z.object({ type: z.enum(["created", "edited", "removed"]), noteId: EntityIdSchema })

type NoteDraftContent = Readonly<Record<string, string>>

type AvailableNotesData = {
  draftContentById: NoteDraftContent
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
  watchEditor(id: string, onDeleted: (note: Note) => void): () => void
  removeNote(note: Note): Promise<Note>
  restoreNote(note: Note, position?: MobileNotePosition): Promise<Note>
  readMobileOrder(): Promise<MobileNoteOrder>
  moveMobileNote(input: MoveMobileNoteInput): Promise<MoveMobileNoteResult>
  retry(): void
  saveContent(note: Note, content: string): Promise<SaveNoteContentResult>
  saveDraft(noteId: string, content: string): Promise<void>
  discardDraft(noteId: string): Promise<void>
  updateNote(
    note: Note,
    change: { content?: string; geometry?: NoteGeometry },
  ): Promise<Note>
}

export const NotesDataContext = createContext<NotesDataContextValue | null>(null)

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
    const draftContentById = Object.fromEntries(
      draftEntries.filter((entry) => entry !== null),
    )

    return notes.length === 0
      ? { draftContentById, notes, status: "empty" }
      : { draftContentById, notes, status: "ready" }
  } catch {
    return { status: "failure" }
  }
}

export type NotesDataDependencies = {
  clipboard: ClipboardWriter
  createId(): string
  batchCopyShortcutEnabled: boolean
  drafts: NoteDraftRepository
  now(): string
  repository: NoteRepository
  readMobileOrder(): Promise<MobileNoteOrder>
  moveMobileNote(input: MoveMobileNoteInput): Promise<MoveMobileNoteResult>
  storageMonitor: NoteStorageMonitor
  usage: IndividualCopyUsageWriter
}

export function useNotesDataModel({
  clipboard,
  createId,
  drafts,
  batchCopyShortcutEnabled,
  now,
  repository,
  readMobileOrder,
  moveMobileNote,
  storageMonitor,
  usage,
}: NotesDataDependencies) {
  const [state, setState] = useState<NotesDataState>({ status: "loading" })
  const readSequence = useRef(0)
  const changes = useRef<BroadcastChannel | null>(null)
  const availableNotesReference = useRef<readonly Note[]>([])
  const draftContentReference = useRef<NoteDraftContent>({})
  const mutationQueue = useRef<Promise<void>>(Promise.resolve())

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
    draftContentById: NoteDraftContent,
  ) => {
    availableNotesReference.current = notes
    draftContentReference.current = draftContentById
    setState({
      draftContentById,
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
      const nextState = await readNotes(repository, drafts)
      if (active && readSequence.current === sequence) {
        if (nextState.status === "empty" || nextState.status === "ready") {
          availableNotesReference.current = nextState.notes
          draftContentReference.current = nextState.draftContentById
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
          const nextDrafts = { ...draftContentReference.current }
          delete nextDrafts[noteId]
          publishAvailable(current.filter(({ id }) => id !== noteId), nextDrafts)
          return
        }
        const next = [...current]
        if (index < 0) next.push(note)
        else next[index] = note
        publishAvailable(next, draftContentReference.current)
      }).catch(() => undefined)
    }

    return () => {
      active = false
      changes.current = null
      channel.close()
      unsubscribe()
    }
  }, [drafts, publishAvailable, repository, storageMonitor])

  function retry() {
    const sequence = ++readSequence.current
    setState({ status: "loading" })
    void readNotes(repository, drafts).then((nextState) => {
      if (readSequence.current === sequence) {
        if (nextState.status === "empty" || nextState.status === "ready") {
          availableNotesReference.current = nextState.notes
          draftContentReference.current = nextState.draftContentById
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
        contentRevision: 0,
        createdAt: timestamp,
        geometry: findNewNoteGeometry(notes.map(({ geometry }) => geometry)),
        id: createId(),
        revision: 0,
        tabIndex: nextNoteTabIndex(notes),
        updatedAt: timestamp,
      }
      const savedNote = await repository.save(note)

      publishAvailable(
        [...availableNotesReference.current, savedNote],
        draftContentReference.current,
      )
      changes.current?.postMessage({ type: "created", noteId: savedNote.id })
      return savedNote
    })
  }

  function copyNote(note: Note) {
    return executeCopyNote({ clipboard, usage }, note)
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
        { drafts, notes: repository, now },
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
      const nextDraftContent = { ...draftContentReference.current }
      delete nextDraftContent[result.note.id]
      publishAvailable(nextNotes, nextDraftContent)
      return result
    })
  }

  async function saveDraft(noteId: string, content: string) {
    return enqueue(async () => {
      const note = availableNotesReference.current.find(
        ({ id }) => id === noteId,
      )

      if (note === undefined) {
        throw new Error("Cannot save a draft for a missing note")
      }

      const reference = {
        contentRevision: note.contentRevision,
        id: note.id,
      }
      const draftContentById = { ...draftContentReference.current }

      if (content === note.content) {
        await drafts.remove(reference)
        delete draftContentById[noteId]
      } else {
        await drafts.save({ content, note: reference, updatedAt: now() })
        draftContentById[noteId] = content
      }

      publishAvailable(availableNotesReference.current, draftContentById)
    })
  }

  async function discardDraft(noteId: string) {
    return enqueue(async () => {
      const note = availableNotesReference.current.find(({ id }) => id === noteId)
      if (note === undefined) return
      await drafts.remove({ id: note.id, contentRevision: note.contentRevision })
      const nextDraftContent = { ...draftContentReference.current }
      delete nextDraftContent[noteId]
      publishAvailable(availableNotesReference.current, nextDraftContent)
    })
  }

  async function updateNote(
    note: Note,
    change: { content?: string; geometry?: NoteGeometry },
  ) {
    return enqueue(async () => {
      const currentNote = availableNotesReference.current.find(
        ({ id }) => id === note.id,
      )

      if (currentNote === undefined) {
        throw new Error("Cannot update a missing note")
      }

      const nextNote = reviseNote(currentNote, { ...change, updatedAt: now() })
      const savedNote = await repository.save(nextNote)
      const nextNotes = availableNotesReference.current.map((current) =>
        current.id === savedNote.id ? savedNote : current,
      )
      publishAvailable(nextNotes, draftContentReference.current)
      return savedNote
    })
  }

  async function changeStack(noteId: string, edge: "back" | "front") {
    return enqueue(async () => {
      const notes = availableNotesReference.current
      const timestamp = now()
      const ordered = edge === "front"
        ? sendNoteToFront(notes, noteId, timestamp)
        : sendNoteToBack(notes, noteId, timestamp)
      const savedNotes = await repository.saveAll(ordered)

      publishAvailable(savedNotes, draftContentReference.current)
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

      const deleted = await repository.remove(createNoteReference(currentNote))
      if (!deleted) throw new Error("Cannot remove a missing note")
      const notes = availableNotesReference.current.filter(
        ({ id }) => id !== currentNote.id,
      )
      const draftContentById = { ...draftContentReference.current }
      delete draftContentById[currentNote.id]
      publishAvailable(notes, draftContentById)
      changes.current?.postMessage({ type: "removed", noteId: note.id })
      return deleted
    })
  }

  async function restoreNote(note: Note, position?: MobileNotePosition) {
    return enqueue(async () => {
      const savedNote = await repository.restore(note, position)
      changes.current?.postMessage({ type: "edited", noteId: note.id })
      const notes = [...availableNotesReference.current.filter(({ id }) => id !== note.id), savedNote]
      publishAvailable(notes, draftContentReference.current)
      return savedNote
    })
  }

  return {
    ...state,
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
    saveDraft,
    discardDraft,
    updateNote,
  }
}

export function useNotesData() {
  const context = useContext(NotesDataContext)

  if (context === null) {
    throw new Error("useNotesData must be used within NotesDataProvider")
  }

  return context
}
