import { z } from "zod"

import { readRequest } from "@/shared/lib/indexed-db/index.browser"

import { parseBatchCopyList } from "@/entities/batch-copy"
import { BATCH_COPY_LIST_STORE_NAME, storeBatch } from "@/entities/batch-copy/index.browser"
import {
  NoteRecordSchema,
  NoteDraftSchema,
  isRecoverableNoteDraft,
  validateAndClampNoteGeometry,
  normalizeNoteTabIndexes,
  reconcileMobileNoteIds,
} from "@/entities/note"
import {
  StoredNoteSchema,
  readStoredBody,
  NOTE_STORE_NAME,
  storeNote,
} from "@/entities/note/index.browser"
import { TemplateRecordSchema } from "@/entities/template"
import { StoredTemplateSchema, TEMPLATE_STORE_NAME } from "@/entities/template/index.browser"
import { InteractionPreferencesRecordSchema } from "@/entities/preference"
import { PREFERENCE_STORE_NAME, StoredPreferencesSchema } from "@/entities/preference/index.browser"
import { TextUsageRecordSchema } from "@/entities/usage"
import { USAGE_STORE_NAME, StoredUsageSchema } from "@/entities/usage/index.browser"
import {
  EntityIdSchema,
  IsoDateTimeSchema,
  toTimestamp,
  RevisionSchema,
} from "@/shared/lib/entity-metadata"

const PREVIOUS_BATCH_COPY_LIST_STORE_NAME = "accumulators"
const PREVIOUS_MOBILE_BATCH_COPY_DRAFT_STORE_NAME = "mobileBatchCopyDrafts"
const INTERACTION_PREFERENCE_KEY = "interaction"

const PreviousNoteRecordSchema = z
  .object({
    content: z.string(),
    contentRevision: RevisionSchema,
    createdAt: IsoDateTimeSchema,
    geometry: z
      .object({
        height: z.number().finite().positive(),
        width: z.number().finite().positive(),
        x: z.number().finite(),
        y: z.number().finite(),
        zIndex: z.number().int().nonnegative().safe(),
      })
      .strict(),
    id: EntityIdSchema,
    revision: RevisionSchema,
    tabIndex: z.unknown().optional(),
    updatedAt: IsoDateTimeSchema,
  })
  .strict()

const PreviousUsageRecordSchema = z
  .object({
    counts: z
      .object({
        accumulation: z.number().int().nonnegative().safe(),
        ordinaryCopy: z.number().int().nonnegative().safe(),
      })
      .strict(),
    id: EntityIdSchema,
    note: z
      .object({
        contentRevision: RevisionSchema,
        id: EntityIdSchema,
      })
      .strict(),
    textSnapshot: z.string(),
    updatedAt: IsoDateTimeSchema,
  })
  .strict()

const PreviousInteractionPreferencesSchema = z
  .object({
    metaClickEnabled: z.boolean(),
    updatedAt: IsoDateTimeSchema,
  })
  .strict()

function compareIdentity(
  left: { createdAt: string; id: string },
  right: { createdAt: string; id: string },
) {
  const creationOrder = left.createdAt.localeCompare(right.createdAt)
  return creationOrder === 0 ? left.id.localeCompare(right.id) : creationOrder
}

function incrementRevision(revision: number) {
  if (revision >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError("Revision cannot exceed the safe integer range")
  }

  return revision + 1
}

function migrateNoteRecords(records: unknown[]) {
  const previousNotes = records.map((record) =>
    PreviousNoteRecordSchema.parse(record),
  )
  const zOrder = new Map(
    [...previousNotes]
      .sort((left, right) => {
        const layerOrder = left.geometry.zIndex - right.geometry.zIndex
        return layerOrder === 0
          ? compareIdentity(left, right)
          : layerOrder
      })
      .map((note, index) => [note.id, index + 1]),
  )

  return normalizeNoteTabIndexes(previousNotes).map((note) => {
    const zIndex = zOrder.get(note.id)

    if (zIndex === undefined) {
      throw new Error("Note layer order could not be determined")
    }

    const geometry = validateAndClampNoteGeometry({
      ...note.geometry,
      zIndex,
    })
    const geometryChanged =
      geometry.height !== note.geometry.height ||
      geometry.width !== note.geometry.width ||
      geometry.x !== note.geometry.x ||
      geometry.y !== note.geometry.y ||
      geometry.zIndex !== note.geometry.zIndex

    return NoteRecordSchema.parse({
      ...note,
      geometry,
      revision: geometryChanged
        ? incrementRevision(note.revision)
        : note.revision,
    })
  })
}

export function recoverNoteDrafts(transaction: IDBTransaction) {
  const previousStore = "noteDrafts"
  const database = transaction.db
  if (!database.objectStoreNames.contains(previousStore)) return
  const notes = transaction.objectStore(NOTE_STORE_NAME)
  const updates = transaction.objectStore("updates")
  const cursor = transaction.objectStore(previousStore).openCursor()
  cursor.onsuccess = async () => {
    const entry = cursor.result
    if (!entry) {
      database.deleteObjectStore(previousStore)
      return
    }
    try {
      const draft = NoteDraftSchema.parse(entry.value)
      const value = await readRequest(notes.get(draft.note.id))
      if (value && !("removed" in value)) {
        const record = StoredNoteSchema.parse(value)
        if (record.contentRevision === draft.note.contentRevision) {
          const { body } = await readStoredBody(record, updates)
          if (isRecoverableNoteDraft(draft, { ...record, content: body.text })) {
            const payload = body.updateText(draft.content)
            updates.add({ noteId: record.id, id: crypto.randomUUID(), payload })
            notes.put({
              ...record,
              updatedAt: Math.max(record.updatedAt, toTimestamp(draft.updatedAt)),
              revision: incrementRevision(record.revision),
              contentRevision: incrementRevision(record.contentRevision),
            })
          }
        }
      }
      entry.continue()
    } catch {
      transaction.abort()
    }
  }
}

function migrateNotes(transaction: IDBTransaction) {
  const store = transaction.objectStore(NOTE_STORE_NAME)
  const request = store.getAll()

  request.onsuccess = () => {
    try {
      for (const note of migrateNoteRecords(request.result)) {
        store.put(storeNote(note, note.tabIndex))
      }
      recoverNoteDrafts(transaction)
    } catch {
      transaction.abort()
    }
  }
}

const PREVIOUS_ORDER_STORE = "mobileNoteOrder"
const PreviousOrderSchema = z.object({ ids: z.array(EntityIdSchema) })

export function migrateNotePositions(database: IDBDatabase, transaction: IDBTransaction) {
  const store = transaction.objectStore(NOTE_STORE_NAME)
  const hasOrder = database.objectStoreNames.contains(PREVIOUS_ORDER_STORE)
  const order = hasOrder ? transaction.objectStore(PREVIOUS_ORDER_STORE).get("current") : null
  const records = store.getAll()
  records.onsuccess = () => {
    try {
      const notes = records.result.map((value: unknown) => NoteRecordSchema.parse(value))
      notes.sort((left, right) => left.tabIndex - right.tabIndex)
      const stored: unknown = order?.result
      const ids = reconcileMobileNoteIds(stored === undefined ? [] : PreviousOrderSchema.parse(stored).ids, notes.map(({ id }) => id))
      const ranks = new Map(ids.map((id, index) => [id, index]))
      for (const note of notes) store.put(storeNote(note, ranks.get(note.id) ?? note.tabIndex))
      if (hasOrder) database.deleteObjectStore(PREVIOUS_ORDER_STORE)
      recoverNoteDrafts(transaction)
    } catch {
      transaction.abort()
    }
  }
}

export function migrateNoteBodies(transaction: IDBTransaction, oldVersion: number) {
  const notes = transaction.objectStore(NOTE_STORE_NAME)
  const cursor = notes.openCursor()
  const previous = NoteRecordSchema.extend({ position: z.number().finite() })
  const withBody = previous.omit({ content: true }).extend({ body: z.instanceof(Uint8Array) })
  cursor.onsuccess = () => {
    const entry = cursor.result
    if (!entry) {
      recoverNoteDrafts(transaction)
      return
    }
    try {
      if (oldVersion === 8) {
        const record = withBody.parse(entry.value)
        entry.update({ ...record, createdAt: toTimestamp(record.createdAt), updatedAt: toTimestamp(record.updatedAt) })
      } else {
        const { position, ...note } = previous.parse(entry.value)
        entry.update(storeNote(note, position))
      }
      entry.continue()
    } catch {
      transaction.abort()
    }
  }
}

function migrateUsage(transaction: IDBTransaction) {
  const store = transaction.objectStore(USAGE_STORE_NAME)
  const request = store.getAll()

  request.onsuccess = () => {
    try {
      for (const stored of request.result) {
        const current = TextUsageRecordSchema.safeParse(stored)

        if (current.success) {
          store.put(StoredUsageSchema.encode(current.data))
          continue
        }

        const previous = PreviousUsageRecordSchema.parse(stored)
        const migrated = TextUsageRecordSchema.parse({
          ...previous,
          counts: {
            batchCopy: previous.counts.accumulation,
            individualCopy: previous.counts.ordinaryCopy,
          },
        })
        store.put(StoredUsageSchema.encode(migrated))
      }
    } catch {
      transaction.abort()
    }
  }
}

function migratePreferences(transaction: IDBTransaction) {
  const store = transaction.objectStore(PREFERENCE_STORE_NAME)
  const request = store.get(INTERACTION_PREFERENCE_KEY)

  request.onsuccess = () => {
    if (request.result === undefined) {
      return
    }

    try {
      const current = InteractionPreferencesRecordSchema.safeParse(
        request.result,
      )

      if (current.success) {
        store.put(StoredPreferencesSchema.encode(current.data), INTERACTION_PREFERENCE_KEY)
        return
      }

      const previous = PreviousInteractionPreferencesSchema.parse(
        request.result,
      )
      store.put(
        StoredPreferencesSchema.encode({
          batchCopyReorderButtonsEnabled: false,
          batchCopyShortcutEnabled: previous.metaClickEnabled,
          updatedAt: previous.updatedAt,
        }),
        INTERACTION_PREFERENCE_KEY,
      )
    } catch {
      transaction.abort()
    }
  }
}

function convertStoredRecords(
  transaction: IDBTransaction,
  storeName: string,
  convert: (value: unknown) => unknown,
  key?: IDBValidKey,
) {
  if (!transaction.objectStoreNames.contains(storeName)) return
  const cursor = transaction.objectStore(storeName).openCursor(key)
  cursor.onsuccess = () => {
    const row = cursor.result
    if (!row) return
    try {
      row.update(convert(row.value))
      row.continue()
    } catch {
      transaction.abort()
    }
  }
}

export function migrateTimestamps(transaction: IDBTransaction, oldVersion: number) {
  if (oldVersion < 11) {
    convertStoredRecords(transaction, BATCH_COPY_LIST_STORE_NAME, (value) => storeBatch(parseBatchCopyList(value)))
  }
  convertStoredRecords(transaction, TEMPLATE_STORE_NAME, (value) => StoredTemplateSchema.encode(TemplateRecordSchema.parse(value)))
  if (oldVersion === 1) return
  convertStoredRecords(transaction, USAGE_STORE_NAME, (value) => StoredUsageSchema.encode(TextUsageRecordSchema.parse(value)))
  convertStoredRecords(transaction, PREFERENCE_STORE_NAME, (value) =>
    StoredPreferencesSchema.encode(InteractionPreferencesRecordSchema.parse(value)), INTERACTION_PREFERENCE_KEY)
}

export function ensureBatchCopyListStore(
  database: IDBDatabase,
  transaction: IDBTransaction,
) {
  if (database.objectStoreNames.contains(BATCH_COPY_LIST_STORE_NAME)) {
    return
  }

  if (database.objectStoreNames.contains("batchCopyLists")) {
    transaction.objectStore("batchCopyLists").name = BATCH_COPY_LIST_STORE_NAME
    return
  }

  if (database.objectStoreNames.contains(PREVIOUS_BATCH_COPY_LIST_STORE_NAME)) {
    transaction.objectStore(PREVIOUS_BATCH_COPY_LIST_STORE_NAME).name =
      BATCH_COPY_LIST_STORE_NAME
    return
  }

  database.createObjectStore(BATCH_COPY_LIST_STORE_NAME, { keyPath: "id" })
}

export function migratePersonalNotesDatabase(
  transaction: IDBTransaction,
) {

  migrateNotes(transaction)
  migrateUsage(transaction)
  migratePreferences(transaction)
}

export function migrateMobileBatchCopyDraftStore(database: IDBDatabase) {
  if (database.objectStoreNames.contains(PREVIOUS_MOBILE_BATCH_COPY_DRAFT_STORE_NAME)) {
    database.deleteObjectStore(PREVIOUS_MOBILE_BATCH_COPY_DRAFT_STORE_NAME)
  }
}
