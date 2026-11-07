import { createContext, useContext } from "react"

import type {
  Note, NoteGeometry, MobileNoteOrder, MobileNotePosition,
  MoveMobileNoteInput, MoveMobileNoteResult,
} from "@/entities/note"

import type { CopyNoteResult } from "./copy-note"
import type { SaveNoteContentResult } from "./save-note-content"

type AvailableNotesData = {
  notes: readonly Note[]
}

export type NotesDataState =
  | { status: "loading" }
  | ({ status: "empty" | "ready" } & AvailableNotesData)
  | { status: "blocked" }
  | { status: "version-changed" }
  | { status: "failure" }

type NoteCommands = {
  copyNote(note: Note): Promise<CopyNoteResult>
  createNote(): Promise<Note>
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

export const NotesStateContext = createContext<
  (NotesDataState & { batchCopyShortcutEnabled: boolean }) | null
>(null)
export const NoteCommandsContext = createContext<NoteCommands | null>(null)

export function useNotesState() {
  const state = useContext(NotesStateContext)
  if (state === null) throw new Error("NotesDataProvider is required")
  return state
}

export function useNoteCommands() {
  const commands = useContext(NoteCommandsContext)
  if (commands === null) throw new Error("NotesDataProvider is required")
  return commands
}

export function useNotesData() {
  return { ...useNotesState(), ...useNoteCommands() }
}
