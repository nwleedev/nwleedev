import { useState } from "react"

import { IndexedDbInteractionPreferencesRepository } from "@/entities/preference/index.browser"
import { useDatabaseConnection } from "@/shared/lib/indexed-db/index.browser"

export function usePreferenceServices() {
  const database = useDatabaseConnection()
  const [services] = useState(() => ({
    now: Date.now,
    repository: new IndexedDbInteractionPreferencesRepository(database),
  }))

  return services
}
