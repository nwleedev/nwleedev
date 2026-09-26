import { z } from "zod"

import {
  BATCH_COPY_LIST_STORE_NAME,
} from "@/entities/batch-copy"
import {
  NOTE_DRAFT_STORE_NAME,
  NOTE_STORE_NAME,
  NoteRecordSchema,
  validateAndClampNoteGeometry,
  normalizeNoteTabIndexes,
} from "@/entities/note"
import {
  InteractionPreferencesRecordSchema,
  PREFERENCE_STORE_NAME,
} from "@/entities/preference"
import {
  USAGE_STORE_NAME,
  TextUsageRecordSchema,
} from "@/entities/usage"
import {
  EntityIdSchema,
  IsoDateTimeSchema,
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

function migrateNotes(transaction: IDBTransaction) {
  const store = transaction.objectStore(NOTE_STORE_NAME)
  const request = store.getAll()

  request.onsuccess = () => {
    try {
      for (const note of migrateNoteRecords(request.result)) {
        store.put(note)
      }
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
        store.put(migrated)
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
        return
      }

      const previous = PreviousInteractionPreferencesSchema.parse(
        request.result,
      )
      store.put(
        {
          batchCopyShortcutEnabled: previous.metaClickEnabled,
          updatedAt: previous.updatedAt,
        },
        INTERACTION_PREFERENCE_KEY,
      )
    } catch {
      transaction.abort()
    }
  }
}

function ensureBatchCopyListStore(
  database: IDBDatabase,
  transaction: IDBTransaction,
) {
  if (database.objectStoreNames.contains(BATCH_COPY_LIST_STORE_NAME)) {
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
  database: IDBDatabase,
  transaction: IDBTransaction,
) {
  ensureBatchCopyListStore(database, transaction)

  if (!database.objectStoreNames.contains(NOTE_DRAFT_STORE_NAME)) {
    database.createObjectStore(NOTE_DRAFT_STORE_NAME, {
      keyPath: "note.id",
    })
  }

  migrateNotes(transaction)
  migrateUsage(transaction)
  migratePreferences(transaction)
}

export function migrateMobileBatchCopyDraftStore(database: IDBDatabase) {
  if (database.objectStoreNames.contains(PREVIOUS_MOBILE_BATCH_COPY_DRAFT_STORE_NAME)) {
    database.deleteObjectStore(PREVIOUS_MOBILE_BATCH_COPY_DRAFT_STORE_NAME)
  }
}
