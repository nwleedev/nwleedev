import { toTimestamp, RevisionSchema } from "@/shared/lib/entity-metadata"

import { NoteBody, openNoteBody, rememberNoteBody, savedNoteBody } from "../model/note-body"
import {
  abortTransaction,
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db/index.browser"

import {
  parseNoteRecord,
  reviseNote,
  type NoteGeometry,
  type Note,
  type NoteReference,
  type NoteRepository,
} from "../model/note"
import { sendNoteToFront, sendNoteToBack } from "../model/note-order"
import { insertMobileNote, type MobileNotePosition } from "../model/mobile-note-order"
import { allocatePosition, readMobileIds } from "./indexed-db-mobile-note-order-repository"
import { NOTE_STORE_NAME, NoteFields, readStoredBody, storeGeometry, storeNote, StoredNoteSchema } from "./stored-note"

export { NOTE_STORE_NAME } from "./stored-note"

function editorLock(id: string) {
  return "personal-notes/editor/" + id
}

function isRemoved(value: unknown): value is { id: string; removed: unknown } {
  return typeof value === "object" && value !== null && "removed" in value
}

const updatesPerCompaction = 64

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
    rememberNoteBody(note, { bytes: body.snapshot(), restoration: body.restoration })
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

  async save(note: Note) {
    return this.#save(note, undefined, false)
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
      if (stored !== undefined && !restoring) throw new Error("Note identifier already exists")
      if (stored !== undefined && !isRemoved(stored)) {
        const existing = await this.#readNote(stored, transaction.objectStore("updates"))
        await completion
        return existing
      }
      const ids = await readMobileIds(store)
      const insertion = position ? insertMobileNote(ids, record.id, position).indexOf(record.id) : 0
      const rank = await allocatePosition(store, ids, insertion)
      const next = storeNote(record, rank, restoring)
      store.put(next)
      const saved = await this.#readNote(next, transaction.objectStore("updates"))
      await completion
      return saved
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }

  async moveInStack(target: Note, edge: "front" | "back", updatedAt: string) {
    const database = await this.#connection.get()
    const transaction = database.transaction([NOTE_STORE_NAME, "updates"], "readwrite")
    const completion = waitForTransaction(transaction)
    try {
      const store = transaction.objectStore(NOTE_STORE_NAME)
      const values: unknown[] = await readRequest(store.getAll())
      const records = values.filter((value) => !isRemoved(value)).map((value) => StoredNoteSchema.parse(value))
      const updates = transaction.objectStore("updates")
      const current = await Promise.all(records.map((record) => this.#readNote(record, updates)))
      const opened = savedNoteBody(target)
      const byId = new Map(current.map((note, index) => [note.id, { note, record: records[index] }]))
      const selected = byId.get(target.id)
      if (!selected || !opened || savedNoteBody(selected.note)?.restoration !== opened.restoration) {
        await completion
        return { notes: current, changedIds: [] }
      }
      const move = edge === "front" ? sendNoteToFront : sendNoteToBack
      const ordered = move(current, target.id, updatedAt)
      const changedIds: string[] = []
      for (const note of ordered) {
        const previous = byId.get(note.id)
        if (!previous) throw new Error("Unknown note in stacking order")
        const body = savedNoteBody(previous.note)
        if (body) rememberNoteBody(note, body)
        if (previous.record.geometry.zIndex !== note.geometry.zIndex) {
          store.put(storeGeometry(previous.record, note))
          changedIds.push(note.id)
        }
      }
      await completion
      return { notes: ordered, changedIds }
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }

  async saveGeometry(original: Note, geometry: NoteGeometry, updatedAt: string) {
    const database = await this.#connection.get()
    const transaction = database.transaction([NOTE_STORE_NAME, "updates"], "readwrite")
    const completion = waitForTransaction(transaction)
    try {
      const notes = transaction.objectStore(NOTE_STORE_NAME)
      const value: unknown = await readRequest(notes.get(original.id))
      if (value === undefined || isRemoved(value)) {
        await completion
        return null
      }
      const record = StoredNoteSchema.parse(value)
      const current = await this.#readNote(record, transaction.objectStore("updates"))
      const opened = savedNoteBody(original)
      const body = savedNoteBody(current)
      if (!opened || !body || opened.restoration !== body.restoration) {
        await completion
        return null
      }
      const merged = { ...current.geometry }
      for (const field of ["x", "y", "width", "height", "zIndex"] as const) {
        if (geometry[field] !== original.geometry[field]) merged[field] = geometry[field]
      }
      const saved = reviseNote(current, { geometry: merged, updatedAt })
      if (saved !== current) {
        const next = storeGeometry(record, saved)
        notes.put(next)
        rememberNoteBody(saved, body)
      }
      await completion
      return saved
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
    rememberNoteBody(saved, { bytes: change.snapshot, restoration: change.restoration })
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
      const pending = await readRequest(updates.index("noteId").count(update.noteId))
      await completion
      if (pending >= updatesPerCompaction) {
        void this.compactBody(update.noteId).catch(() => undefined)
      }
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
