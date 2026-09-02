import { describe, expect, it } from "vitest"

import type {
  Note,
  NoteDraft,
  NoteDraftRepository,
  NoteRepository,
} from "@/entities/note"

import { saveNoteContent } from "./save-note-content"

const timestamp = "2026-09-01T03:00:00.000Z"
const note: Note = {
  content: "저장된 원문",
  contentRevision: 0,
  createdAt: "2026-09-01T00:00:00.000Z",
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: "note-save-command",
  revision: 0,
  tabIndex: 1000,
  updatedAt: "2026-09-01T01:00:00.000Z",
}

function createStorage(options: {
  draftFailure?: boolean
  noteFailure?: boolean
} = {}) {
  let draft: NoteDraft | null = null
  let storedNote = note
  const drafts: NoteDraftRepository = {
    get: async () => draft,
    remove: async () => {
      draft = null
    },
    save: async (nextDraft) => {
      if (options.draftFailure) {
        throw new Error("Draft storage failed")
      }

      draft = nextDraft
      return nextDraft
    },
  }
  const notes: NoteRepository = {
    getAll: async () => [storedNote],
    remove: async () => undefined,
    save: async (nextNote) => {
      if (options.noteFailure) {
        throw new Error("Note storage failed")
      }

      storedNote = nextNote
      return nextNote
    },
    saveAll: async (nextNotes) => nextNotes,
  }

  return {
    drafts,
    notes,
    readDraft: () => draft,
    readNote: () => storedNote,
  }
}

describe("saving note content", () => {
  it("clears the recovery draft only after the changed note is stored", async () => {
    const storage = createStorage()
    const result = await saveNoteContent(
      { drafts: storage.drafts, notes: storage.notes, now: () => timestamp },
      note,
      "새 원문",
    )

    expect(result).toMatchObject({
      note: { content: "새 원문", contentRevision: 1, revision: 1 },
      status: "saved",
    })
    expect(storage.readNote().content).toBe("새 원문")
    expect(storage.readDraft()).toBeNull()
  })

  it("does not change the note when the recovery draft cannot be stored", async () => {
    const storage = createStorage({ draftFailure: true })
    const result = await saveNoteContent(
      { drafts: storage.drafts, notes: storage.notes, now: () => timestamp },
      note,
      "보존해야 할 원문",
    )

    expect(result.status).toBe("failure")
    expect(storage.readNote()).toEqual(note)
  })

  it("keeps the recovery draft when storing the note fails", async () => {
    const storage = createStorage({ noteFailure: true })
    const result = await saveNoteContent(
      { drafts: storage.drafts, notes: storage.notes, now: () => timestamp },
      note,
      "복구할 원문",
    )

    expect(result.status).toBe("failure")
    expect(storage.readDraft()).toMatchObject({
      content: "복구할 원문",
      note: { contentRevision: note.contentRevision, id: note.id },
    })
    expect(storage.readNote()).toEqual(note)
  })

  it("returns the current note when the content is unchanged", async () => {
    const storage = createStorage()
    const result = await saveNoteContent(
      { drafts: storage.drafts, notes: storage.notes, now: () => timestamp },
      note,
      note.content,
    )

    expect(result).toEqual({ note, status: "unchanged" })
    expect(storage.readDraft()).toBeNull()
  })
})
