import { useState } from "react"

import { IndexedDbInteractionPreferencesRepository } from "@/entities/preference"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"

export function usePreferenceServices(database: PersonalNotesDatabase) {
  const [services] = useState(() => ({
    now: () => new Date().toISOString(),
    repository: new IndexedDbInteractionPreferencesRepository(database),
  }))

  return services
}
