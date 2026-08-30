import { ACCUMULATOR_STORE_NAME } from "@/entities/accumulator"
import { NOTE_STORE_NAME } from "@/entities/note"
import { PREFERENCE_STORE_NAME } from "@/entities/preference"
import { TEMPLATE_STORE_NAME } from "@/entities/template"
import {
  USAGE_BY_NOTE_CONTENT_INDEX,
  USAGE_STORE_NAME,
} from "@/entities/usage"
import { openIndexedDatabase } from "@/shared/lib/indexed-db"

export const PERSONAL_NOTES_DATABASE_NAME = "personal-notes"
export const PERSONAL_NOTES_DATABASE_VERSION = 1

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
    upgrade: (database, _transaction, oldVersion) => {
      if (oldVersion !== 0) {
        return
      }

      database.createObjectStore(NOTE_STORE_NAME, { keyPath: "id" })
      database.createObjectStore(ACCUMULATOR_STORE_NAME, { keyPath: "id" })
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
    },
    version: PERSONAL_NOTES_DATABASE_VERSION,
  })
}
