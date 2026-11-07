import { useEffect, useState } from "react"

import { WorkerTextAnalyzer } from "./worker-text-analyzer"
import { IndexedDbNoteRepository } from "@/entities/note/index.browser"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"
import { useDatabaseConnection } from "@/shared/lib/indexed-db/index.browser"

export function useBrowserAnalysis() {
  const database = useDatabaseConnection()
  const [services] = useState(() => ({
    analyzer: new WorkerTextAnalyzer(new CryptoEntityIdGenerator()),
    now: Date.now,
    reader: new IndexedDbNoteRepository(database),
  }))

  useEffect(() => () => services.analyzer.dispose(), [services])

  return services
}
