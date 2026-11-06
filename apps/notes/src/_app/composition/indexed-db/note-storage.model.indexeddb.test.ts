import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest"

import {
  NoteBody,
  mobileNotePosition,
  reviseNote,
  sendNoteToFront,
  type Note,
} from "@/entities/note"
import {
  IndexedDbNoteDraftRepository,
  IndexedDbNoteRepository,
  IndexedDbMobileNoteOrderRepository,
  NOTE_STORE_NAME,
} from "@/entities/note/index.browser"

import { readRequest, waitForTransaction } from "@/shared/lib/indexed-db/index.browser"

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

  it("두 연결에서 같은 변경을 재전송해도 한 번만 남고 메모 삭제 뒤에는 다시 쓰지 않는다", async () => {
    const first = new IndexedDbNoteRepository(createConnection())
    const second = new IndexedDbNoteRepository(createConnection())
    await first.save(note)
    const body = NoteBody.fromText(note.content)
    const update = { id: crypto.randomUUID(), noteId: note.id, payload: body.replace(0, 0, "추가 ") }
    await Promise.all([first.appendUpdate(update), second.appendUpdate(update)])
    const database = await createConnection().get()
    async function readUpdates() {
      const transaction = database.transaction("updates")
      const completed = waitForTransaction(transaction)
      const records = await readRequest(transaction.objectStore("updates").index("noteId").getAll(note.id))
      await completed
      return records
    }
    await expect(second.appendUpdate({ ...update, payload: body.replace(0, 1, "") })).rejects.toThrow()
    expect(await readUpdates()).toEqual([update])
    await first.remove(note)
    await expect(second.appendUpdate(update)).resolves.toBe(false)
    expect(await readUpdates()).toEqual([])
  })

  it("삭제 시점의 저장 본문만 같은 ID로 복원하고 삭제 전 편집기의 늦은 저장을 거절한다", async () => {
    const writer = new IndexedDbNoteRepository(createConnection())
    const remover = new IndexedDbNoteRepository(createConnection())
    const opened = await writer.save({ ...note, content: "빵" })
    const empty = await writer.saveEdit(opened, reviseNote(opened, { content: "", updatedAt: timestamp }))
    assert(empty)
    const deleted = await remover.remove(opened)
    expect(deleted?.content).toBe("")
    assert(deleted)
    const late = reviseNote(empty, { content: "달걀", updatedAt: timestamp })
    await expect(writer.saveEdit(empty, late)).resolves.toBeNull()
    const [restored] = await Promise.all([writer.restore(deleted), remover.restore(deleted)])
    await expect(writer.saveEdit(empty, late)).resolves.toBeNull()
    await writer.saveEdit(restored, reviseNote(restored, { content: "우유", updatedAt: timestamp }))
    await remover.restore(deleted)
    expect((await new IndexedDbNoteRepository(createConnection()).getAll()).map(({ id, content }) => [id, content]))
      .toEqual([[note.id, "우유"]])
  })

  it("열려 있던 마지막 편집 화면을 떠날 때 삭제 본문을 정리한다", async () => {
    const first = new IndexedDbNoteRepository(createConnection())
    const second = new IndexedDbNoteRepository(createConnection())
    const deletion = new IndexedDbNoteRepository(createConnection())
    await first.save(note)
    const leaveFirst = await first.openEditor(note.id)
    const leaveSecond = await second.openEditor(note.id)
    assert(leaveFirst && leaveSecond)
    await deletion.remove(note)
    expect(await first.get(note.id)).toBeNull()
    expect(await second.getAll()).toEqual([])
    expect(await deletion.openEditor(note.id)).toBeNull()
    await leaveFirst()
    expect((await second.deletedNote(note.id))?.content).toBe(note.content)
    await leaveSecond()
    expect(await deletion.deletedNote(note.id)).toBeNull()
  })

  it("반복해서 저장한 메모를 다시 열면 본문을 유지하면서 누적 변경분이 줄어든다", async () => {
    const connection = createConnection()
    const writer = new IndexedDbNoteRepository(connection)
    let saved = await writer.save(note)
    const edits = 100
    for (let index = 0; index < edits; index += 1) {
      const next = await writer.saveEdit(saved, reviseNote(saved, { content: saved.content + "가", updatedAt: timestamp }))
      assert(next)
      saved = next
    }
    const db = await connection.get()
    const count = () => readRequest(db.transaction("updates").objectStore("updates").index("noteId").count(note.id))
    await expect.poll(count).toBeLessThan(edits)
    expect((await new IndexedDbNoteRepository(createConnection()).get(note.id))?.content).toBe(note.content + "가".repeat(edits))
  })

  it("두 창이 같은 본문에서 편집하고 정리 도중 들어온 변경도 새 연결에서 읽는다", async () => {
    const first = new IndexedDbNoteRepository(createConnection())
    const second = new IndexedDbNoteRepository(createConnection())
    await first.save(note)
    const left = new NoteBody(await first.readBody(note.id))
    const right = new NoteBody(await second.readBody(note.id))
    const prefix = left.replace(0, 0, "앞 ")
    const suffix = right.replace(right.text.length, right.text.length, " 뒤")
    await first.appendUpdate({ id: crypto.randomUUID(), noteId: note.id, payload: prefix })
    await Promise.all([
      first.compactBody(note.id),
      second.appendUpdate({ id: crypto.randomUUID(), noteId: note.id, payload: suffix }),
    ])
    const reopened = new IndexedDbNoteRepository(createConnection())
    const expected = "앞 " + note.content + " 뒤"
    expect(new NoteBody(await reopened.readBody(note.id)).text).toBe(expected)
    expect(noteById(await reopened.getAll(), note.id).content).toBe(expected)
  })

  it("정리 트랜잭션이 중단되면 변경분과 기준 본문을 함께 되돌린다", async () => {
    const repository = new IndexedDbNoteRepository(createConnection())
    await repository.save(note)
    const baseline = await repository.readBody(note.id)
    const edit = new NoteBody(baseline)
    const change = { noteId: note.id, id: crypto.randomUUID(), payload: edit.replace(0, 1, "쓴") }
    await repository.appendUpdate(change)
    const originalDelete = IDBObjectStore.prototype.delete
    const deletion = vi.spyOn(IDBObjectStore.prototype, "delete")
    deletion.mockImplementation(function (this: IDBObjectStore, key: IDBValidKey | IDBKeyRange) {
      const request = originalDelete.call(this, key)
      if (this.name === "updates") this.transaction.abort()
      return request
    })
    try {
      await expect(repository.compactBody(note.id)).rejects.toThrow()
    } finally {
      deletion.mockRestore()
    }
    const database = await createConnection().get()
    const read = database.transaction(["notes", "updates"])
    const [stored, changes] = await Promise.all([
      readRequest(read.objectStore("notes").get(note.id)),
      readRequest(read.objectStore("updates").index("noteId").getAll(note.id)),
      waitForTransaction(read),
    ])
    expect(stored.body).toEqual(baseline)
    expect(changes).toEqual([change])
    await repository.compactBody(note.id)
    expect(new NoteBody(await repository.readBody(note.id)).text).toBe(edit.text)
  })

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
    await order.move({ visibleIds: before.ids, noteId: first.id, targetIndex: 3 })
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
    await first.move({ visibleIds: old.ids, noteId: note.id, targetIndex: 1 })
    const result = await second.move({ visibleIds: old.ids, noteId: companion.id, targetIndex: 1 })
    expect(result.status).toBe("conflict")
    expect(result.order.ids).toEqual([companion.id, note.id])
    expect((await second.read()).ids).toEqual([companion.id, note.id])
  })

  it.each([
    { sequence: "addThenMove" as const, targetIndex: 0, expected: ["라", "다", "가", "나"] },
    { sequence: "moveThenAdd" as const, targetIndex: 0, expected: ["라", "다", "가", "나"] },
    { sequence: "addThenMove" as const, targetIndex: 1, expected: ["라", "가", "다", "나"] },
    { sequence: "moveThenAdd" as const, targetIndex: 1, expected: ["라", "가", "다", "나"] },
  ])("새 메모의 생성 순서와 관계없이 드래그를 보존한다: $sequence, $targetIndex", async ({ sequence, targetIndex, expected }) => {
    const first = createConnection()
    const second = createConnection()
    const originals = ["가", "나", "다"].map((id, index) => ({
      ...note, id, tabIndex: note.tabIndex + index,
    }))
    const notes = new IndexedDbNoteRepository(first)
    await notes.saveAll(originals)
    const order = new IndexedDbMobileNoteOrderRepository(second)
    const before = await order.read()
    const add = () => notes.save({ ...note, id: "라", tabIndex: note.tabIndex + originals.length })
    const move = () => order.move({ visibleIds: before.ids, noteId: "다", targetIndex })
    const operations = { addThenMove: [add, move], moveThenAdd: [move, add] }
    for (const operation of operations[sequence]) await operation()
    expect((await new IndexedDbMobileNoteOrderRepository(first).read()).ids).toEqual(expected)
  })

  it("삭제 및 복원은 모바일 순서를 함께 저장하고 기록 중단은 두 자료를 보존한다", async () => {
    const connection = createConnection()
    const notes = new IndexedDbNoteRepository(connection)
    const order = new IndexedDbMobileNoteOrderRepository(connection)
    const companion = { ...note, id: crypto.randomUUID(), tabIndex: note.tabIndex + 1 }
    await notes.saveAll([note, companion])
    const before = await order.read()
    const position = mobileNotePosition(before.ids, note.id)
    const originalDelete = IDBObjectStore.prototype.delete
    const deletion = vi.spyOn(IDBObjectStore.prototype, "delete")
    deletion.mockImplementation(function (this: IDBObjectStore, key: IDBValidKey | IDBKeyRange) {
      const request = originalDelete.call(this, key)
      if (this.name === NOTE_STORE_NAME) queueMicrotask(() => this.transaction.abort())
      return request
    })
    try {
      await expect(notes.remove(note)).rejects.toThrow()
    } finally {
      deletion.mockRestore()
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
