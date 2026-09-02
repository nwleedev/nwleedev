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

export type SaveNoteContentResult =
  | { note: Note; status: "saved" | "unchanged" }
  | { status: "failure" }

export async function saveNoteContent(
  dependencies: SaveNoteContentDependencies,
  note: Note,
  content: string,
): Promise<SaveNoteContentResult> {
  if (content === note.content) {
    return { note, status: "unchanged" }
  }

  const updatedAt = dependencies.now()

  try {
    await dependencies.drafts.save({
      content,
      note: { contentRevision: note.contentRevision, id: note.id },
      updatedAt,
    })
    const savedNote = await dependencies.notes.save(
      reviseNote(note, { content, updatedAt }),
    )

    try {
      await dependencies.drafts.remove({
        contentRevision: note.contentRevision,
        id: note.id,
      })
    } catch {
      return { note: savedNote, status: "saved" }
    }

    return { note: savedNote, status: "saved" }
  } catch {
    return { status: "failure" }
  }
}
