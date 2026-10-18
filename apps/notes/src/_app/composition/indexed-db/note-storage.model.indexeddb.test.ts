import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  IndexedDbNoteDraftRepository,
  IndexedDbNoteRepository,
  IndexedDbMobileNoteOrderRepository,
  MOBILE_NOTE_ORDER_STORE_NAME,
  mobileNotePosition,
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

  it("모바일 순서를 새 연결에서 복원하고 원문 및 데스크톱 자료를 보존한다", async () => {
    const connection = createConnection()
    const notes = new IndexedDbNoteRepository(connection)
    const order = new IndexedDbMobileNoteOrderRepository(connection)
    const originals = Array.from({ length: 4 }, (_, index) => ({
      ...note,
      content: `메모 ${index + 1}\n  원문  `,
      id: crypto.randomUUID(),
      tabIndex: note.tabIndex + index,
    }))
    await notes.saveAll(originals)
    const before = await order.read()
    const [first, second, third, fourth] = originals as [Note, Note, Note, Note]
    await order.move({ expectedRevision: before.revision, noteId: first.id, targetIndex: 3 })
    connection.close()
    const next = createConnection()
    expect((await new IndexedDbMobileNoteOrderRepository(next).read()).ids).toEqual([
      second.id, third.id, fourth.id, first.id,
    ])
    const stored = await new IndexedDbNoteRepository(next).getAll()
    expect(new Map(stored.map((value) => [value.id, value]))).toEqual(
      new Map(originals.map((value) => [value.id, value])),
    )
  })

  it("두 연결의 오래된 이동은 최신 순서를 덮어쓰지 않는다", async () => {
    const connection = createConnection()
    const notes = new IndexedDbNoteRepository(connection)
    const companion = { ...note, id: crypto.randomUUID(), tabIndex: note.tabIndex + 1 }
    await notes.saveAll([note, companion])
    const first = new IndexedDbMobileNoteOrderRepository(connection)
    const second = new IndexedDbMobileNoteOrderRepository(createConnection())
    const old = await second.read()
    await first.move({ expectedRevision: old.revision, noteId: note.id, targetIndex: 1 })
    const result = await second.move({ expectedRevision: old.revision, noteId: companion.id, targetIndex: 1 })
    expect(result.status).toBe("conflict")
    expect(result.order.ids).toEqual([companion.id, note.id])
    expect((await second.read()).ids).toEqual([companion.id, note.id])
  })

  it("삭제 및 복원은 모바일 순서를 함께 저장하고 기록 중단은 두 자료를 보존한다", async () => {
    const connection = createConnection()
    const notes = new IndexedDbNoteRepository(connection)
    const order = new IndexedDbMobileNoteOrderRepository(connection)
    const companion = { ...note, id: crypto.randomUUID(), tabIndex: note.tabIndex + 1 }
    await notes.saveAll([note, companion])
    const before = await order.read()
    const position = mobileNotePosition(before.ids, note.id)
    const originalPut = IDBObjectStore.prototype.put
    const put = vi.spyOn(IDBObjectStore.prototype, "put")
    put.mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      const request = originalPut.call(this, value, key)
      if (this.name === MOBILE_NOTE_ORDER_STORE_NAME) queueMicrotask(() => this.transaction.abort())
      return request
    })
    try {
      await expect(notes.remove(note)).rejects.toThrow()
    } finally {
      put.mockRestore()
    }
    expect(await order.read()).toEqual(before)
    expect(await notes.getAll()).toHaveLength(2)
    await notes.remove(note)
    expect((await order.read()).ids).toEqual([companion.id])
    await notes.save(note, position)
    expect((await order.read()).ids).toEqual([note.id, companion.id])
    expect(noteById(await notes.getAll(), note.id)).toEqual(note)
  })

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

  it("겹침 순서의 일괄 저장이 중단되면 이전 순서가 모두 남는다", async () => {
    const firstConnection = createConnection()
    const notes = new IndexedDbNoteRepository(firstConnection)
    const companion: Note = {
      ...note,
      content: crypto.randomUUID(),
      geometry: { ...note.geometry, zIndex: note.geometry.zIndex + 1 },
      id: crypto.randomUUID(),
      tabIndex: note.tabIndex + 1,
    }
    const original = [note, companion]
    await notes.saveAll(original)
    const moved = sendNoteToFront(original, note.id, timestamp)
    const originalPut = IDBObjectStore.prototype.put
    let writes = 0
    const put = vi.spyOn(IDBObjectStore.prototype, "put")
    put.mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      const request = originalPut.call(this, value, key)
      if (this.name === "notes") {
        writes += 1
        if (writes === moved.length) {
          queueMicrotask(() => this.transaction.abort())
        }
      }
      return request
    })

    try {
      await expect(notes.saveAll(moved)).rejects.toThrow()
    } finally {
      put.mockRestore()
    }
    firstConnection.close()

    const restored = new IndexedDbNoteRepository(createConnection())
    const saved = await restored.getAll()
    expect(saved).toHaveLength(original.length)
    for (const previous of original) {
      expect(noteById(saved, previous.id)).toEqual(previous)
    }
  })
})
