import {
  reviseNote,
  type Note,
  type NoteRepository,
} from "@/entities/note"

type SaveNoteContentDependencies = {
  notes: Pick<NoteRepository, "saveEdit">
  now(): number
}

export type SaveNoteContentFailureReason =
  | "note-missing"
  | "note-storage"

export type SaveNoteContentResult =
  | {
      note: Note
      status: "saved" | "unchanged"
    }
  | {
      reason: SaveNoteContentFailureReason
      status: "failure"
    }

export async function saveNoteContent(
  dependencies: SaveNoteContentDependencies,
  note: Note,
  content: string,
): Promise<SaveNoteContentResult> {
  if (content === note.content) return { note, status: "unchanged" }

  let savedNote: Note | null

  try {
    savedNote = await dependencies.notes.saveEdit(
      note,
      reviseNote(note, { content, updatedAt: dependencies.now() }),
    )
  } catch {
    return { reason: "note-storage", status: "failure" }
  }

  if (savedNote === null) return { status: "failure", reason: "note-missing" }

  return { note: savedNote, status: "saved" }
}
