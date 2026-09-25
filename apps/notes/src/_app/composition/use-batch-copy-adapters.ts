import { useState } from "react"

import { IndexedDbBatchCopyRepository } from "@/entities/batch-copy"
import { IndexedDbBatchCopyItemWriter } from "@/features/add-note-to-batch-copy"
import { BrowserClipboardWriter } from "@/shared/lib/clipboard"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"

export function useBatchCopyAdapters(database: PersonalNotesDatabase) {
  const [adapters] = useState(() => {
    const identifiers = new CryptoEntityIdGenerator()

    return {
      clipboard: new BrowserClipboardWriter(),
      createId: () => identifiers.create(),
      now: () => new Date().toISOString(),
      repository: new IndexedDbBatchCopyRepository(database),
      writer: new IndexedDbBatchCopyItemWriter(database, identifiers),
    }
  })

  return adapters
}
