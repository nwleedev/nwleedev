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
import {
  MOBILE_NOTE_ORDER_STORE_NAME,
  readMobileNoteOrder,
  writeMobileNoteOrder,
} from "./indexed-db-mobile-note-order-repository"

export const NOTE_STORE_NAME = "notes"

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

    return records.map(parseNoteRecord)
  }

  async save(note: Note, position?: MobileNotePosition) {
    const record = parseNoteRecord(note)
    const database = await this.#connection.get()
    const transaction = database.transaction([NOTE_STORE_NAME, MOBILE_NOTE_ORDER_STORE_NAME], "readwrite")
    const completion = waitForTransaction(transaction)
    try {
      const order = await readMobileNoteOrder(transaction)
      transaction.objectStore(NOTE_STORE_NAME).put(record)
      if (!order.ids.includes(record.id)) {
        writeMobileNoteOrder(transaction, order, insertMobileNote(order.ids, record.id, position))
      }
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
    const transaction = database.transaction([NOTE_STORE_NAME, MOBILE_NOTE_ORDER_STORE_NAME], "readwrite")
    const completion = waitForTransaction(transaction)
    const store = transaction.objectStore(NOTE_STORE_NAME)

    try {
      const order = await readMobileNoteOrder(transaction)
      const ids = [...new Set([...order.ids, ...records.map(({ id }) => id)])]
      for (const record of records) store.put(record)
      writeMobileNoteOrder(transaction, order, ids)
      await completion
      return records
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }

  async remove(reference: NoteReference) {
    const database = await this.#connection.get()
    const transaction = database.transaction([NOTE_STORE_NAME, MOBILE_NOTE_ORDER_STORE_NAME], "readwrite")
    const completion = waitForTransaction(transaction)

    try {
      const store = transaction.objectStore(NOTE_STORE_NAME)
      const stored: unknown = await readRequest(store.get(reference.id))

      if (stored === undefined) {
        await completion
        return
      }

      const note = parseNoteRecord(stored)

      if (note.revision !== reference.revision) {
        throw new StaleNoteRevisionError()
      }

      const order = await readMobileNoteOrder(transaction)
      store.delete(reference.id)
      writeMobileNoteOrder(transaction, order, order.ids.filter((id) => id !== reference.id))
      await completion
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }
}
