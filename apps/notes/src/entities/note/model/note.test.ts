import { describe, expect, it } from "vitest"

import { NoteRecordSchema, reviseNote } from "./note"

const originalNote = {
  content: "첫 메모",
  contentRevision: 2,
  createdAt: "2026-08-31T01:00:00.000Z",
  geometry: {
    height: 240,
    width: 320,
    x: 40,
    y: 60,
    zIndex: 1,
  },
  id: "note-1",
  revision: 4,
  tabIndex: 1000,
  updatedAt: "2026-08-31T01:00:00.000Z",
}

describe("reviseNote", () => {
  it("increments both revisions when content changes", () => {
    const revised = reviseNote(originalNote, {
      content: "수정한 메모",
      updatedAt: "2026-08-31T02:00:00.000Z",
    })

    expect(revised).toMatchObject({
      contentRevision: 3,
      revision: 5,
    })
  })

  it("keeps the content revision when only geometry changes", () => {
    const revised = reviseNote(originalNote, {
      geometry: { ...originalNote.geometry, x: 80 },
      updatedAt: "2026-08-31T02:00:00.000Z",
    })

    expect(revised).toMatchObject({
      contentRevision: 2,
      revision: 5,
    })
  })

  it("increments each revision once when content and geometry change together", () => {
    const revised = reviseNote(originalNote, {
      content: "수정한 메모",
      geometry: { ...originalNote.geometry, width: 400 },
      updatedAt: "2026-08-31T02:00:00.000Z",
    })

    expect(revised).toMatchObject({
      contentRevision: 3,
      revision: 5,
    })
  })

  it("does not create a revision for an unchanged value", () => {
    const revised = reviseNote(originalNote, {
      content: originalNote.content,
      geometry: originalNote.geometry,
      updatedAt: "2026-08-31T02:00:00.000Z",
    })

    expect(revised).toEqual(originalNote)
  })
})

describe("NoteRecordSchema", () => {
  it("accepts a complete note record", () => {
    expect(NoteRecordSchema.safeParse(originalNote).success).toBe(true)
  })

  it("rejects a record with a missing field", () => {
    const incompleteRecord = {
      content: originalNote.content,
      contentRevision: originalNote.contentRevision,
      createdAt: originalNote.createdAt,
      id: originalNote.id,
      revision: originalNote.revision,
      updatedAt: originalNote.updatedAt,
    }

    expect(NoteRecordSchema.safeParse(incompleteRecord).success).toBe(false)
  })

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects an invalid revision",
    (revision) => {
      expect(
        NoteRecordSchema.safeParse({ ...originalNote, revision }).success,
      ).toBe(false)
    },
  )

  it("rejects a blank identifier", () => {
    expect(
      NoteRecordSchema.safeParse({ ...originalNote, id: "   " }).success,
    ).toBe(false)
  })

  it.each([999, 32768, 1000.5])(
    "rejects a keyboard order outside the note range",
    (tabIndex) => {
      expect(
        NoteRecordSchema.safeParse({ ...originalNote, tabIndex }).success,
      ).toBe(false)
    },
  )

  it("rejects geometry outside the logical canvas", () => {
    expect(
      NoteRecordSchema.safeParse({
        ...originalNote,
        geometry: { ...originalNote.geometry, x: 0 },
      }).success,
    ).toBe(false)
    expect(
      NoteRecordSchema.safeParse({
        ...originalNote,
        geometry: { ...originalNote.geometry, width: 4096 },
      }).success,
    ).toBe(false)
  })
})
