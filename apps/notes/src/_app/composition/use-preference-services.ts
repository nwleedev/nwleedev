import { useState } from "react"

import { IndexedDbInteractionPreferencesRepository } from "@/entities/preference/index.browser"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"

export function usePreferenceServices(database: PersonalNotesDatabase) {
  const [services] = useState(() => ({
    now: Date.now,
    repository: new IndexedDbInteractionPreferencesRepository(database),
  }))

  return services
}
