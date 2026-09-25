import { useEffect, useState } from "react"

import { WorkerTextAnalyzer } from "@/_pages/analysis/composition"
import { IndexedDbNoteRepository } from "@/entities/note"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"

export function useAnalysisAdapters(database: PersonalNotesDatabase) {
  const [adapters] = useState(() => ({
    analyzer: new WorkerTextAnalyzer(new CryptoEntityIdGenerator()),
    now: () => new Date().toISOString(),
    reader: new IndexedDbNoteRepository(database),
  }))

  useEffect(() => () => adapters.analyzer.dispose(), [adapters])

  return adapters
}
