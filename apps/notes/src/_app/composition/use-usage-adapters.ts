import { useState } from "react"

import { IndexedDbUsageRepository } from "@/entities/usage"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"

export function useUsageAdapters(database: PersonalNotesDatabase) {
  const [repository] = useState(
    () => new IndexedDbUsageRepository(
      database,
      new CryptoEntityIdGenerator(),
      () => new Date().toISOString(),
    ),
  )

  return repository
}
