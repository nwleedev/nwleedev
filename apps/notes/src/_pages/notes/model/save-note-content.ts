import {
  reviseNote,
  type Note,
  type NoteDraftRepository,
  type NoteRepository,
} from "@/entities/note"

type SaveNoteContentDependencies = {
  drafts: NoteDraftRepository
  notes: NoteRepository
  now(): string
}

export type SaveNoteContentFailureReason =
  | "draft-storage"
  | "note-missing"
  | "note-storage"

export type SaveNoteContentResult =
  | { note: Note; status: "saved" | "unchanged" }
  | {
      reason: SaveNoteContentFailureReason
      status: "failure"
    }

export async function saveNoteContent(
  dependencies: SaveNoteContentDependencies,
  note: Note,
  content: string,
): Promise<SaveNoteContentResult> {
  const draftReference = {
    contentRevision: note.contentRevision,
    id: note.id,
  }

  if (content === note.content) {
    try {
      await dependencies.drafts.remove(draftReference)
      return { note, status: "unchanged" }
    } catch {
      return { reason: "draft-storage", status: "failure" }
    }
  }

  const updatedAt = dependencies.now()

  try {
    await dependencies.drafts.save({
      content,
      note: draftReference,
      updatedAt,
    })
  } catch {
    return { reason: "draft-storage", status: "failure" }
  }

  let savedNote: Note

  try {
    savedNote = await dependencies.notes.save(
      reviseNote(note, { content, updatedAt }),
    )
  } catch {
    return { reason: "note-storage", status: "failure" }
  }

  try {
    await dependencies.drafts.remove(draftReference)
  } catch {
    return { note: savedNote, status: "saved" }
  }

  return { note: savedNote, status: "saved" }
}
