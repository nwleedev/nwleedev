import {
  BATCH_COPY_LIST_STORE_NAME,
} from "@/entities/batch-copy"
import { NOTE_POSITION_INDEX, NOTE_DRAFT_STORE_NAME, NOTE_STORE_NAME } from "@/entities/note"
import { PREFERENCE_STORE_NAME } from "@/entities/preference"
import { TEMPLATE_STORE_NAME } from "@/entities/template"
import {
  USAGE_BY_NOTE_CONTENT_INDEX,
  USAGE_STORE_NAME,
} from "@/entities/usage"
import { openIndexedDatabase } from "@/shared/lib/indexed-db"

import {
  ensureBatchCopyListStore,
  migrateMobileBatchCopyDraftStore,
  migratePersonalNotesDatabase,
  migrateNotePositions,
} from "./migrate-personal-notes-database"

export const PERSONAL_NOTES_DATABASE_NAME = "personal-notes"
export const PERSONAL_NOTES_DATABASE_VERSION = 7

type PersonalNotesDatabaseCallbacks = {
  onBlocked?(): void
  onVersionChange?(): void
}

export function openPersonalNotesDatabase(
  callbacks: PersonalNotesDatabaseCallbacks = {},
) {
  return openIndexedDatabase({
    name: PERSONAL_NOTES_DATABASE_NAME,
    onBlocked: callbacks.onBlocked,
    onVersionChange: callbacks.onVersionChange,
    upgrade: (database, transaction, oldVersion) => {
      const updates = database.createObjectStore("updates", { keyPath: ["id", "noteId"] })
      updates.createIndex("noteId", "noteId")

      if (oldVersion === 0) {
        const notes = database.createObjectStore(NOTE_STORE_NAME, { keyPath: "id" })
        notes.createIndex(NOTE_POSITION_INDEX, "position")
        database.createObjectStore(BATCH_COPY_LIST_STORE_NAME, {
          keyPath: "id",
        })
        const usage = database.createObjectStore(USAGE_STORE_NAME, {
          keyPath: "id",
        })
        usage.createIndex(
          USAGE_BY_NOTE_CONTENT_INDEX,
          ["note.id", "note.contentRevision", "textSnapshot"],
          { unique: true },
        )
        database.createObjectStore(TEMPLATE_STORE_NAME, { keyPath: "id" })
        database.createObjectStore(PREFERENCE_STORE_NAME)
        database.createObjectStore(NOTE_DRAFT_STORE_NAME, {
          keyPath: "note.id",
        })
        return
      }

      if (oldVersion >= 6) return
      ensureBatchCopyListStore(database, transaction)

      transaction.objectStore(NOTE_STORE_NAME).createIndex(NOTE_POSITION_INDEX, "position")
      if (oldVersion < 2) {
        migratePersonalNotesDatabase(database, transaction)
      } else {
        migrateNotePositions(database, transaction)
      }

      if (oldVersion < 3) {
        migrateMobileBatchCopyDraftStore(database)
      }
    },
    version: PERSONAL_NOTES_DATABASE_VERSION,
  })
}
