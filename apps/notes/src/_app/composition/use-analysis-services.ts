import { useEffect, useState } from "react"

import { WorkerTextAnalyzer } from "@/_pages/analysis/composition"
import { IndexedDbNoteRepository } from "@/entities/note/index.browser"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"
import { useDatabaseConnection } from "@/shared/lib/indexed-db/index.browser"

export function useAnalysisServices() {
  const database = useDatabaseConnection()
  const [services] = useState(() => ({
    analyzer: new WorkerTextAnalyzer(new CryptoEntityIdGenerator()),
    now: Date.now,
    reader: new IndexedDbNoteRepository(database),
  }))

  useEffect(() => () => services.analyzer.dispose(), [services])

  return services
}
