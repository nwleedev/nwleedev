import { useEffect, useState } from "react"

import { WorkerTextAnalyzer } from "@/_pages/analysis/composition"
import { IndexedDbNoteRepository } from "@/entities/note"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"

export function useAnalysisServices(database: PersonalNotesDatabase) {
  const [services] = useState(() => ({
    analyzer: new WorkerTextAnalyzer(new CryptoEntityIdGenerator()),
    now: () => new Date().toISOString(),
    reader: new IndexedDbNoteRepository(database),
  }))

  useEffect(() => () => services.analyzer.dispose(), [services])

  return services
}
