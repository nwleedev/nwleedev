import {
  reviseNote,
  type Note,
  type NoteDraftRepository,
  type NoteRepository,
} from "@/entities/note"

type SaveNoteContentDependencies = {
  drafts: NoteDraftRepository
  notes: Pick<NoteRepository, "save">
  now(): string
}

export type SaveNoteContentFailureReason =
  | "draft-storage"
  | "note-missing"
  | "note-storage"

export type SaveNoteContentResult =
  | {
      draftCleanupRequired: boolean
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
  const draftReference = {
    contentRevision: note.contentRevision,
    id: note.id,
  }

  if (content === note.content) {
    try {
      await dependencies.drafts.remove(draftReference)
      return { draftCleanupRequired: false, note, status: "unchanged" }
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
    return { draftCleanupRequired: true, note: savedNote, status: "saved" }
  }

  return { draftCleanupRequired: false, note: savedNote, status: "saved" }
}
