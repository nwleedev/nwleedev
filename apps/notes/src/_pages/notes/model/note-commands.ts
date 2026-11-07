import {
  findNewNoteGeometry,
  nextNoteTabIndex,
  type Note,
  type NoteGeometry,
  type NoteRepository,
  type MobileNotePosition,
} from "@/entities/note"
import type { ClipboardWriter } from "@/shared/lib/clipboard"

import { copyNote as executeCopyNote } from "./copy-note"
import { saveNoteContent as executeSaveNoteContent } from "./save-note-content"
import type { NoteChange } from "./note-changes"

type NoteCommandDependencies = {
  clipboard: ClipboardWriter
  createId(): string
  now(): number
  repository: NoteRepository
  onChange(notes: readonly Note[]): void
}

export function createNoteCommands({
  clipboard,
  createId,
  now,
  repository,
  onChange,
}: NoteCommandDependencies) {
  let available: readonly Note[] = []
  let pending: Promise<void> = Promise.resolve()
  let channel: BroadcastChannel | null = null

  function enqueue<Result>(operation: () => Promise<Result>) {
    const result = pending.then(operation)
    pending = result.then(() => undefined, () => undefined)
    return result
  }

  function readAvailable() {
    return available
  }

  function publishAvailable(notes: readonly Note[]) {
    available = notes
    onChange(notes)
  }

  function publishChange(change: NoteChange) {
    channel?.postMessage(change)
  }

  function connectChanges(next: BroadcastChannel | null) {
    channel = next
  }

  async function createNote() {
    return enqueue(async () => {
      const notes = readAvailable()
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
        [...readAvailable(), savedNote],
      )
      publishChange({ type: "created", noteId: savedNote.id })
      return savedNote
    })
  }

  function copyNote(note: Note) {
    return executeCopyNote(clipboard, note)
  }

  async function saveContent(original: Note, content: string) {
    const noteId = original.id
    return enqueue(async () => {
      const note = readAvailable().find(
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

      if (result.status === "saved") publishChange({ type: "edited", noteId })
      const displayed = note === original ? result.note : await repository.get(noteId) ?? result.note
      const nextNotes = readAvailable().map((currentNote) =>
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
      publishChange({ type: "edited", noteId: note.id })
      const nextNotes = readAvailable().map((current) =>
        current.id === savedNote.id ? savedNote : current,
      )
      publishAvailable(nextNotes)
      return savedNote
    })
  }

  async function changeStack(noteId: string, edge: "back" | "front") {
    return enqueue(async () => {
      const notes = readAvailable()
      const target = notes.find(({ id }) => id === noteId)
      if (!target) return notes
      const { notes: savedNotes, changedIds } = await repository.moveInStack(target, edge, now())
      for (const id of changedIds) {
        publishChange({ type: "edited", noteId: id })
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
      const currentNote = readAvailable().find(
        ({ id }) => id === note.id,
      )

      if (currentNote === undefined) {
        throw new Error("Cannot remove a missing note")
      }

      const deleted = await repository.remove(currentNote)
      if (!deleted) throw new Error("Cannot remove a missing note")
      const notes = readAvailable().filter(
        ({ id }) => id !== currentNote.id,
      )
      publishAvailable(notes)
      publishChange({ type: "removed", noteId: note.id })
      return deleted
    })
  }

  async function restoreNote(note: Note, position?: MobileNotePosition) {
    return enqueue(async () => {
      const savedNote = await repository.restore(note, position)
      publishChange({ type: "edited", noteId: note.id })
      const notes = [...readAvailable().filter(({ id }) => id !== note.id), savedNote]
      publishAvailable(notes)
      return savedNote
    })
  }

  return {
    enqueue,
    readAvailable,
    publishAvailable,
    connectChanges,
    copyNote,
    createNote,
    moveNoteToBack,
    moveNoteToFront,
    removeNote,
    restoreNote,
    saveContent,
    saveGeometry,
  }
}
