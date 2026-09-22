import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  IndexedDbNoteDraftRepository,
  IndexedDbNoteRepository,
  reviseNote,
  sendNoteToFront,
  type Note,
} from "@/entities/note"

import {
  PersonalNotesDatabase,
} from "./personal-notes-database"
import { PERSONAL_NOTES_DATABASE_NAME } from "./open-personal-notes-database"

const timestamp = "2026-09-01T00:00:00.000Z"

const note: Note = {
  content: "저장된 원문",
  contentRevision: 0,
  createdAt: timestamp,
  geometry: { height: 240, width: 320, x: 32, y: 32, zIndex: 1 },
  id: "note-storage-model",
  revision: 0,
  tabIndex: 1000,
  updatedAt: timestamp,
}

function deleteDatabase() {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(PERSONAL_NOTES_DATABASE_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () =>
      reject(request.error ?? new Error("Database could not be deleted"))
    request.onblocked = () =>
      reject(new Error("Database deletion was blocked"))
  })
}

function noteById(notes: readonly Note[], id: string) {
  const note = notes.find((current) => current.id === id)
  if (note === undefined) {
    throw new Error("Expected a stored note")
  }

  return note
}

describe("메모 저장소 모델", () => {
  let connections: PersonalNotesDatabase[]

  beforeEach(async () => {
    connections = []
    await deleteDatabase()
  })

  afterEach(async () => {
    for (const connection of connections) {
      connection.close()
    }
    await deleteDatabase()
  })

  function createConnection() {
    const connection = new PersonalNotesDatabase()
    connections.push(connection)
    return connection
  }

  it("새 연결에서 저장한 원문과 정리된 초안을 다시 읽는다", async () => {
    const firstConnection = createConnection()
    const notes = new IndexedDbNoteRepository(firstConnection)
    const drafts = new IndexedDbNoteDraftRepository(firstConnection)
    await notes.save(note)

    const changedContent = "새 원문"
    await drafts.save({
      content: changedContent,
      note: { contentRevision: note.contentRevision, id: note.id },
      updatedAt: timestamp,
    })
    await notes.save(
      reviseNote(note, { content: changedContent, updatedAt: timestamp }),
    )
    await drafts.remove({ contentRevision: note.contentRevision, id: note.id })
    firstConnection.close()

    const restoredConnection = createConnection()
    const restoredNotes = new IndexedDbNoteRepository(restoredConnection)
    const restoredDrafts = new IndexedDbNoteDraftRepository(restoredConnection)
    const saved = await restoredNotes.getAll()

    expect(saved).toMatchObject([
      { content: "새 원문", contentRevision: 1, id: note.id },
    ])
    expect(
      await restoredDrafts.get({ contentRevision: note.contentRevision, id: note.id }),
    ).toBeNull()
  })

  it("삭제 직후 부재와 복원한 중복 겹침 순서를 새 연결에서 읽는다", async () => {
    const firstConnection = createConnection()
    const notes = new IndexedDbNoteRepository(firstConnection)
    const secondNote: Note = {
      ...note,
      content: "두 번째 메모",
      geometry: { ...note.geometry, x: 384, zIndex: 2 },
      id: "note-storage-model-two",
      tabIndex: 1001,
    }
    const thirdNote: Note = {
      ...note,
      content: "세 번째 메모",
      geometry: { ...note.geometry, x: 736, zIndex: 3 },
      id: "note-storage-model-three",
      tabIndex: 1002,
    }
    await notes.saveAll([note, secondNote, thirdNote])
    await notes.remove({ id: secondNote.id, revision: secondNote.revision })
    const afterRemoval = await notes.getAll()
    expect(afterRemoval).toHaveLength(2)
    expect(noteById(afterRemoval, note.id)).toEqual(note)
    expect(noteById(afterRemoval, thirdNote.id)).toEqual(thirdNote)
    expect(afterRemoval.some((current) => current.id === secondNote.id)).toBe(false)

    const afterMove = sendNoteToFront(
      [note, thirdNote],
      note.id,
      "2026-09-01T00:00:01.000Z",
    )
    await notes.saveAll(afterMove)
    await notes.save(secondNote)
    firstConnection.close()

    const restoredConnection = createConnection()
    const restoredNotes = new IndexedDbNoteRepository(restoredConnection)
    const restored = await restoredNotes.getAll()

    expect(noteById(restored, note.id)).toMatchObject({
      geometry: { ...note.geometry, zIndex: 2 },
    })
    expect(noteById(restored, secondNote.id)).toMatchObject({
      geometry: secondNote.geometry,
    })
    expect(noteById(restored, thirdNote.id)).toMatchObject({
      geometry: { ...thirdNote.geometry, zIndex: 1 },
    })

    const afterSecondMove = sendNoteToFront(
      restored,
      secondNote.id,
      "2026-09-01T00:00:02.000Z",
    )
    await restoredNotes.saveAll(afterSecondMove)
    restoredConnection.close()

    const finalConnection = createConnection()
    const finalNotes = new IndexedDbNoteRepository(finalConnection)
    const final = await finalNotes.getAll()
    expect(noteById(final, note.id)).toMatchObject({
      geometry: { ...note.geometry, zIndex: 2 },
    })
    expect(noteById(final, secondNote.id)).toMatchObject({
      geometry: { ...secondNote.geometry, zIndex: 3 },
    })
    expect(noteById(final, thirdNote.id)).toMatchObject({
      geometry: { ...thirdNote.geometry, zIndex: 1 },
    })
  })
})
