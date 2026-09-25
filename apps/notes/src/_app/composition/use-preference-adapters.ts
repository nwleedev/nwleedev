import { useState } from "react"

import { IndexedDbInteractionPreferencesRepository } from "@/entities/preference"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"

export function usePreferenceAdapters(database: PersonalNotesDatabase) {
  const [adapters] = useState(() => ({
    now: () => new Date().toISOString(),
    repository: new IndexedDbInteractionPreferencesRepository(database),
  }))

  return adapters
}
