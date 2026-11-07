import { useState } from "react"

import { IndexedDbInteractionPreferencesRepository } from "./indexed-db-interaction-preferences-repository"
import { useDatabaseConnection } from "@/shared/lib/indexed-db/index.browser"

export function useBrowserPreferences() {
  const database = useDatabaseConnection()
  const [services] = useState(() => ({
    now: Date.now,
    repository: new IndexedDbInteractionPreferencesRepository(database),
  }))

  return services
}
