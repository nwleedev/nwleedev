import {
  abortTransaction,
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db"

import {
  parseNoteRecord,
  type Note,
  type NoteReference,
  type NoteRepository,
} from "../model/note"
import { insertMobileNote, type MobileNotePosition } from "../model/mobile-note-order"
import { allocatePosition, readMobileIds } from "./indexed-db-mobile-note-order-repository"
import { NOTE_STORE_NAME, readNote, StoredNoteSchema } from "./stored-note"

export { NOTE_STORE_NAME } from "./stored-note"

export class StaleNoteRevisionError extends Error {
  constructor() {
    super("The note has changed since it was read")
    this.name = "StaleNoteRevisionError"
  }
}

export class IndexedDbNoteRepository implements NoteRepository {
  readonly #connection: IndexedDbConnection

  constructor(connection: IndexedDbConnection) {
    this.#connection = connection
  }

  async getAll() {
    const database = await this.#connection.get()
    const transaction = database.transaction(NOTE_STORE_NAME, "readonly")
    const completion = waitForTransaction(transaction)
    const records: unknown[] = await readRequest(
      transaction.objectStore(NOTE_STORE_NAME).getAll(),
    )
    await completion

    return records.map(readNote)
  }

  async save(note: Note, position?: MobileNotePosition) {
    const record = parseNoteRecord(note)
    const database = await this.#connection.get()
    const transaction = database.transaction(NOTE_STORE_NAME, "readwrite")
    const completion = waitForTransaction(transaction)
    try {
      const store = transaction.objectStore(NOTE_STORE_NAME)
      const stored: unknown = await readRequest(store.get(record.id))
      let rank: number
      if (stored === undefined) {
        const ids = await readMobileIds(store)
        const insertion = position ? insertMobileNote(ids, record.id, position).indexOf(record.id) : 0
        rank = await allocatePosition(store, ids, insertion)
      } else {
        rank = StoredNoteSchema.parse(stored).position
      }
      store.put({ ...record, position: rank })
      await completion
      return record
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }

  async saveAll(notes: readonly Note[]) {
    const records = notes.map(parseNoteRecord)
    const database = await this.#connection.get()
    const transaction = database.transaction(NOTE_STORE_NAME, "readwrite")
    const completion = waitForTransaction(transaction)
    const store = transaction.objectStore(NOTE_STORE_NAME)

    try {
      const ids = await readMobileIds(store)
      for (const record of records) {
        const stored: unknown = await readRequest(store.get(record.id))
        const position = stored === undefined
          ? await allocatePosition(store, ids, ids.length)
          : StoredNoteSchema.parse(stored).position
        store.put({ ...record, position })
        if (stored === undefined) ids.push(record.id)
      }
      await completion
      return records
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }

  async appendUpdate(update: { id: string; noteId: string; payload: Uint8Array }) {
    const database = await this.#connection.get()
    const transaction = database.transaction([NOTE_STORE_NAME, "updates"], "readwrite")
    const completion = waitForTransaction(transaction)
    try {
      const notes = transaction.objectStore(NOTE_STORE_NAME)
      const exists = await readRequest(notes.getKey(update.noteId))
      if (exists === undefined) {
        await completion
        return false
      }
      const updates = transaction.objectStore("updates")
      const previous = await readRequest(updates.get([update.id, update.noteId]))
      if (previous === undefined) {
        updates.add(update)
      } else {
        const payload: unknown = previous.payload
        if (!(payload instanceof Uint8Array) || payload.length !== update.payload.length
          || !payload.every((byte, index) => byte === update.payload[index])) {
          throw new Error("Note update identifier already used for different content")
        }
      }
      await completion
      return true
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }

  async remove(reference: NoteReference) {
    const database = await this.#connection.get()
    const transaction = database.transaction([NOTE_STORE_NAME, "updates"], "readwrite")
    const completion = waitForTransaction(transaction)

    try {
      const store = transaction.objectStore(NOTE_STORE_NAME)
      const stored: unknown = await readRequest(store.get(reference.id))

      if (stored === undefined) {
        await completion
        return
      }

      const note = readNote(stored)

      if (note.revision !== reference.revision) {
        throw new StaleNoteRevisionError()
      }

      const updates = transaction.objectStore("updates")
      const keys = await readRequest(updates.index("noteId").getAllKeys(reference.id))
      for (const key of keys) updates.delete(key)
      store.delete(reference.id)
      await completion
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }
}
