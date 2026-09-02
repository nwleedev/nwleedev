import {
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db"

import {
  parseNoteDraft,
  type NoteDraft,
  type NoteDraftRepository,
} from "../model/note-draft"
import type { NoteContentReference } from "../model/note"

export const NOTE_DRAFT_STORE_NAME = "noteDrafts"

export class IndexedDbNoteDraftRepository
  implements NoteDraftRepository
{
  readonly #connection: IndexedDbConnection

  constructor(connection: IndexedDbConnection) {
    this.#connection = connection
  }

  async get(note: NoteContentReference) {
    const database = await this.#connection.get()
    const transaction = database.transaction(
      NOTE_DRAFT_STORE_NAME,
      "readonly",
    )
    const completion = waitForTransaction(transaction)
    const stored: unknown = await readRequest(
      transaction.objectStore(NOTE_DRAFT_STORE_NAME).get(note.id),
    )
    await completion

    if (stored === undefined) {
      return null
    }

    const draft = parseNoteDraft(stored)
    return draft.note.contentRevision === note.contentRevision ? draft : null
  }

  async save(draft: NoteDraft) {
    const record = parseNoteDraft(draft)
    const database = await this.#connection.get()
    const transaction = database.transaction(
      NOTE_DRAFT_STORE_NAME,
      "readwrite",
    )
    const completion = waitForTransaction(transaction)
    transaction.objectStore(NOTE_DRAFT_STORE_NAME).put(record)
    await completion
    return record
  }

  async remove(note: NoteContentReference) {
    const database = await this.#connection.get()
    const transaction = database.transaction(
      NOTE_DRAFT_STORE_NAME,
      "readwrite",
    )
    const completion = waitForTransaction(transaction)
    transaction.objectStore(NOTE_DRAFT_STORE_NAME).delete(note.id)
    await completion
  }
}
