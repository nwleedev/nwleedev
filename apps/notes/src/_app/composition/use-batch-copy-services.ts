import { useState } from "react"

import { IndexedDbBatchCopyRepository } from "@/entities/batch-copy/index.browser"
import { IndexedDbBatchCopyItemWriter } from "@/features/add-note-to-batch-copy/index.browser"
import { BrowserClipboardWriter } from "@/shared/lib/clipboard"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"

export function useBatchCopyServices(database: PersonalNotesDatabase) {
  const [services] = useState(() => {
    const identifiers = new CryptoEntityIdGenerator()

    return {
      clipboard: new BrowserClipboardWriter(),
      createId: () => identifiers.create(),
      now: Date.now,
      repository: new IndexedDbBatchCopyRepository(database),
      writer: new IndexedDbBatchCopyItemWriter(database, identifiers),
    }
  })

  return services
}
