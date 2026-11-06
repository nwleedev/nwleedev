import { toTimestamp, RevisionSchema } from "@/shared/lib/entity-metadata"

import { NoteBody, openNoteBody, rememberNoteBody } from "../model/note-body"
import {
  abortTransaction,
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db/index.browser"

import {
  parseNoteRecord,
  type Note,
  type NoteReference,
  type NoteRepository,
} from "../model/note"
import { insertMobileNote, type MobileNotePosition } from "../model/mobile-note-order"
import { allocatePosition, readMobileIds } from "./indexed-db-mobile-note-order-repository"
import { NOTE_STORE_NAME, NoteFields, readStoredBody, storeNote, StoredNoteSchema } from "./stored-note"

export { NOTE_STORE_NAME } from "./stored-note"

function editorLock(id: string) {
  return "personal-notes/editor/" + id
}

function isRemoved(value: unknown): value is { id: string; removed: unknown } {
  return typeof value === "object" && value !== null && "removed" in value
}

type TextUpdate = { id: string; noteId: string; payload: Uint8Array }

export class IndexedDbNoteRepository implements NoteRepository {
  readonly #connection: IndexedDbConnection
  readonly #pendingEdits = new WeakMap<Note, { text: string; restoration?: string; snapshot: Uint8Array; update: TextUpdate }>()

  constructor(connection: IndexedDbConnection) {
    this.#connection = connection
  }

  async getAll() {
    const database = await this.#connection.get()
    const transaction = database.transaction([NOTE_STORE_NAME, "updates"])
    const completion = waitForTransaction(transaction)
    try {
      const records: unknown[] = await readRequest(transaction.objectStore(NOTE_STORE_NAME).getAll())
      const updates = transaction.objectStore("updates")
      const notes = await Promise.all(records.filter((value) => !isRemoved(value)).map((value) => this.#readNote(value, updates)))
      await completion
      await Promise.all(records.filter(isRemoved).map(({ id }) => this.#discardRemoved(id)))
      return notes
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }

  async #readNote(value: unknown, updates: IDBObjectStore) {
    const record = StoredNoteSchema.parse(value)
    const { body } = await readStoredBody(record, updates)
    const note = NoteFields.parse({
      ...record,
      content: body.text,
      createdAt: new Date(record.createdAt).toISOString(),
      updatedAt: new Date(record.updatedAt).toISOString(),
    })
    rememberNoteBody(note, body.snapshot())
    return note
  }

  async get(noteId: string) {
    const database = await this.#connection.get()
    const transaction = database.transaction([NOTE_STORE_NAME, "updates"])
    const completion = waitForTransaction(transaction)
    try {
      const value: unknown = await readRequest(transaction.objectStore(NOTE_STORE_NAME).get(noteId))
      const note = value === undefined || isRemoved(value) ? null : await this.#readNote(value, transaction.objectStore("updates"))
      await completion
      return note
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }

  async openEditor(id: string): Promise<(() => Promise<void>) | null> {
    let release!: () => void
    const left = new Promise<void>((resolve) => { release = resolve })
    return new Promise((resolve, reject) => {
      const held = navigator.locks.request(editorLock(id), { mode: "shared" }, async () => {
        if (!await this.get(id)) {
          resolve(null)
          return
        }
        resolve(async () => {
          release()
          await held
          await this.#discardRemoved(id)
        })
        await left
      })
      held.catch(reject)
    })
  }

  async deletedNote(id: string) {
    const database = await this.#connection.get()
    const transaction = database.transaction([NOTE_STORE_NAME, "updates"])
    const completion = waitForTransaction(transaction)
    const value: unknown = await readRequest(transaction.objectStore(NOTE_STORE_NAME).get(id))
    const note = isRemoved(value) ? await this.#readNote(value.removed, transaction.objectStore("updates")) : null
    await completion
    return note
  }

  async #discardRemoved(id: string) {
    await navigator.locks.request(editorLock(id), { ifAvailable: true }, async (lock) => {
      if (!lock) return
      const database = await this.#connection.get()
      const transaction = database.transaction(NOTE_STORE_NAME, "readwrite")
      const completion = waitForTransaction(transaction)
      const notes = transaction.objectStore(NOTE_STORE_NAME)
      const value: unknown = await readRequest(notes.get(id))
      if (isRemoved(value)) notes.delete(id)
      await completion
    })
  }

  async readBody(noteId: string) {
    return this.#loadBody(noteId, false)
  }

  async compactBody(noteId: string) {
    await this.#loadBody(noteId, true)
  }

  async #loadBody(noteId: string, compact: boolean) {
    const database = await this.#connection.get()
    const transaction = database.transaction([NOTE_STORE_NAME, "updates"], compact ? "readwrite" : "readonly")
    const completion = waitForTransaction(transaction)
    try {
      const notes = transaction.objectStore(NOTE_STORE_NAME)
      const updates = transaction.objectStore("updates")
      const record = StoredNoteSchema.parse(await readRequest(notes.get(noteId)))
      const { body, keys } = await readStoredBody(record, updates)
      const snapshot = body.snapshot()
      if (compact && keys.length > 0) {
        notes.put({ ...record, body: snapshot })
        for (const key of keys) updates.delete(key)
      }
      await completion
      return snapshot
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }

  async save(note: Note, position?: MobileNotePosition) {
    return this.#save(note, position, false)
  }

  async restore(note: Note, position?: MobileNotePosition) {
    return this.#save(note, position, true)
  }

  async #save(note: Note, position: MobileNotePosition | undefined, restoring: boolean) {
    const record = parseNoteRecord(note)
    const database = await this.#connection.get()
    const transaction = database.transaction([NOTE_STORE_NAME, "updates"], "readwrite")
    const completion = waitForTransaction(transaction)
    try {
      const store = transaction.objectStore(NOTE_STORE_NAME)
      const stored: unknown = await readRequest(store.get(record.id))
      const previous = stored === undefined || isRemoved(stored) ? undefined : StoredNoteSchema.parse(stored)
      if (isRemoved(stored) && !restoring) throw new Error("Cannot change a deleted note")
      if (restoring && previous) {
        const existing = await this.#readNote(previous, transaction.objectStore("updates"))
        await completion
        return existing
      }
      let rank: number
      if (previous === undefined) {
        const ids = await readMobileIds(store)
        const insertion = position ? insertMobileNote(ids, record.id, position).indexOf(record.id) : 0
        rank = await allocatePosition(store, ids, insertion)
      } else {
        rank = previous.position
      }
      const next = storeNote(record, rank, previous, restoring)
      store.put(next)
      const saved = await this.#readNote(next, transaction.objectStore("updates"))
      await completion
      return saved
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }

  async saveAll(notes: readonly Note[]) {
    const records = notes.map(parseNoteRecord)
    const database = await this.#connection.get()
    const transaction = database.transaction([NOTE_STORE_NAME, "updates"], "readwrite")
    const completion = waitForTransaction(transaction)
    const store = transaction.objectStore(NOTE_STORE_NAME)

    try {
      const ids = await readMobileIds(store)
      const savedNotes: Note[] = []
      for (const record of records) {
        const stored: unknown = await readRequest(store.get(record.id))
        if (isRemoved(stored)) continue
        const previous = stored === undefined ? undefined : StoredNoteSchema.parse(stored)
        const position = previous === undefined
          ? await allocatePosition(store, ids, ids.length)
          : previous.position
        const next = storeNote(record, position, previous)
        store.put(next)
        savedNotes.push(await this.#readNote(next, transaction.objectStore("updates")))
        if (stored === undefined) ids.push(record.id)
      }
      await completion
      return savedNotes
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }

  async saveEdit(original: Note, edited: Note) {
    let change = this.#pendingEdits.get(original)
    if (!change || change.text !== edited.content) {
      const body = openNoteBody(original)
      if (!body || original.id !== edited.id) throw new Error("Expected the note opened for editing")
      const payload = body.updateText(edited.content)
      change = {
        update: { id: crypto.randomUUID(), noteId: original.id, payload },
        text: edited.content,
        restoration: body.restoration,
        snapshot: body.snapshot(),
      }
      this.#pendingEdits.set(original, change)
    }
    const stored = await this.#writeUpdate(change.update, edited.updatedAt, change.restoration)
    if (!stored) return null
    const saved = { ...edited, revision: stored.revision, contentRevision: stored.contentRevision }
    rememberNoteBody(saved, change.snapshot)
    this.#pendingEdits.delete(original)
    return saved
  }

  async appendUpdate(update: TextUpdate) {
    return (await this.#writeUpdate(update)) !== null
  }

  async #writeUpdate(update: TextUpdate, updatedAt?: string, restoration?: string) {
    const database = await this.#connection.get()
    const transaction = database.transaction([NOTE_STORE_NAME, "updates"], "readwrite")
    const completion = waitForTransaction(transaction)
    try {
      const notes = transaction.objectStore(NOTE_STORE_NAME)
      const value: unknown = await readRequest(notes.get(update.noteId))
      if (value === undefined || isRemoved(value)) {
        await completion
        return null
      }
      const updates = transaction.objectStore("updates")
      let record = StoredNoteSchema.parse(value)
      if (new NoteBody(record.body).restoration !== restoration) {
        await completion
        return null
      }
      const previous = await readRequest(updates.get([update.id, update.noteId]))
      if (previous === undefined) {
        updates.add(update)
        if (updatedAt !== undefined) {
          record = {
            ...record,
            contentRevision: RevisionSchema.parse(record.contentRevision + 1),
            revision: RevisionSchema.parse(record.revision + 1),
            updatedAt: toTimestamp(updatedAt),
          }
          notes.put(record)
        }
      } else {
        const payload: unknown = previous.payload
        if (!(payload instanceof Uint8Array) || payload.length !== update.payload.length
          || !payload.every((byte, index) => byte === update.payload[index])) {
          throw new Error("Note update identifier already used for different content")
        }
      }
      await completion
      return record
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }

  async remove(reference: NoteReference) {
    return navigator.locks.request(editorLock(reference.id), { ifAvailable: true }, (lock) =>
      this.#remove(reference, lock === null))
  }

  async #remove(reference: NoteReference, keepBody: boolean) {
    const database = await this.#connection.get()
    const transaction = database.transaction([NOTE_STORE_NAME, "updates"], "readwrite")
    const completion = waitForTransaction(transaction)

    try {
      const store = transaction.objectStore(NOTE_STORE_NAME)
      const stored: unknown = await readRequest(store.get(reference.id))

      if (stored === undefined || isRemoved(stored)) {
        await completion
        return null
      }

      const updates = transaction.objectStore("updates")
      const note = await this.#readNote(stored, updates)
      const keys = await readRequest(updates.index("noteId").getAllKeys(reference.id))
      for (const key of keys) updates.delete(key)
      if (keepBody) {
        const body = openNoteBody(note)
        if (!body) throw new Error("Missing saved note body")
        store.put({ id: reference.id, removed: { ...StoredNoteSchema.parse(stored), body: body.snapshot() } })
      } else {
        store.delete(reference.id)
      }
      await completion
      return note
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }
}
