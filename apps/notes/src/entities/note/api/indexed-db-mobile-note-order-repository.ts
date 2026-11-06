import { abortTransaction, readRequest, waitForTransaction, type IndexedDbConnection } from "@/shared/lib/indexed-db/index.browser"

import { insertMobileNote, mobileNotePosition, moveMobileNoteId, type MoveMobileNoteInput, type MoveMobileNoteResult } from "../model/mobile-note-order"
import { NOTE_POSITION_INDEX, NOTE_STORE_NAME, StoredNoteSchema } from "./stored-note"

export async function readMobileIds(store: IDBObjectStore) {
  const keys = await readRequest(store.index(NOTE_POSITION_INDEX).getAllKeys())
  return keys.map((key) => {
    if (typeof key !== "string") throw new TypeError("Invalid note identifier")
    return key
  })
}

export async function allocatePosition(store: IDBObjectStore, ids: readonly string[], insertion: number) {
  async function positionAt(index: number) {
    const id = ids[index]
    if (id === undefined) return undefined
    return StoredNoteSchema.parse(await readRequest(store.get(id))).position
  }

  const [left, right] = await Promise.all([positionAt(insertion - 1), positionAt(insertion)])
  if (left === undefined && right === undefined) return 0
  let next: number
  if (left !== undefined && right !== undefined) next = left + (right - left) / 2
  else if (left !== undefined) next = left + 1
  else next = (right ?? 1) - 1
  if (Number.isFinite(next) && (left === undefined || left < next) && (right === undefined || next < right)) return next

  for (const [index, id] of ids.entries()) {
    const record = StoredNoteSchema.parse(await readRequest(store.get(id)))
    store.put({ ...record, position: index < insertion ? index : index + 1 })
  }
  return insertion
}

export class IndexedDbMobileNoteOrderRepository {
  readonly #connection: IndexedDbConnection

  constructor(connection: IndexedDbConnection) {
    this.#connection = connection
  }

  async read() {
    const database = await this.#connection.get()
    const transaction = database.transaction(NOTE_STORE_NAME, "readonly")
    const completion = waitForTransaction(transaction)
    try {
      const ids = await readMobileIds(transaction.objectStore(NOTE_STORE_NAME))
      await completion
      return { ids }
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }

  async move({ visibleIds, noteId, targetIndex }: MoveMobileNoteInput): Promise<MoveMobileNoteResult> {
    const database = await this.#connection.get()
    const transaction = database.transaction(NOTE_STORE_NAME, "readwrite")
    const completion = waitForTransaction(transaction)
    try {
      const store = transaction.objectStore(NOTE_STORE_NAME)
      const ids = await readMobileIds(store)
      const visible = new Set(visibleIds)
      const remaining = ids.filter((id) => visible.has(id))
      if (remaining.length !== visibleIds.length || remaining.some((id, index) => id !== visibleIds[index]) || !visible.has(noteId)) {
        await completion
        return { order: { ids }, status: "conflict" }
      }
      const moved = moveMobileNoteId(visibleIds, noteId, targetIndex)
      const ordered = insertMobileNote(ids, noteId, mobileNotePosition(moved, noteId))
      if (ordered.indexOf(noteId) !== ids.indexOf(noteId)) {
        const record = StoredNoteSchema.parse(await readRequest(store.get(noteId)))
        const position = await allocatePosition(store, ids.filter((id) => id !== noteId), ordered.indexOf(noteId))
        store.put({ ...record, position })
      }
      await completion
      return { order: { ids: ordered }, status: "saved" }
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }
}
