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

  async save(note: Note) {
    const record = parseNoteRecord(note)
    const database = await this.#connection.get()
    const transaction = database.transaction(NOTE_STORE_NAME, "readwrite")
    const completion = waitForTransaction(transaction)
    transaction.objectStore(NOTE_STORE_NAME).put(record)
    await completion

    return record
  }

  async saveAll(notes: readonly Note[]) {
    const records = notes.map(parseNoteRecord)
    const database = await this.#connection.get()
    const transaction = database.transaction(NOTE_STORE_NAME, "readwrite")
    const completion = waitForTransaction(transaction)
    const store = transaction.objectStore(NOTE_STORE_NAME)

    for (const record of records) {
      store.put(record)
    }

    await completion
    return records
  }

  async remove(reference: NoteReference) {
    const database = await this.#connection.get()
    const transaction = database.transaction(NOTE_STORE_NAME, "readwrite")
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

      store.delete(reference.id)
      await completion
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }
}
