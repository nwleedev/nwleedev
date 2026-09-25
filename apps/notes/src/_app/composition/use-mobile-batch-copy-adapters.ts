import { useState } from "react"

import { IndexedDbMobileBatchCopyDraftRepository } from "@/entities/batch-copy"
import { IndexedDbMobileBatchCopyEntryWriter } from "@/features/add-note-to-batch-copy"
import { BrowserClipboardWriter } from "@/shared/lib/clipboard"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"

export function useMobileBatchCopyAdapters(database: PersonalNotesDatabase) {
  const [adapters] = useState(() => {
    const identifiers = new CryptoEntityIdGenerator()

    return {
      clipboard: new BrowserClipboardWriter(),
      createId: () => identifiers.create(),
      now: () => new Date().toISOString(),
      repository: new IndexedDbMobileBatchCopyDraftRepository(database),
      writer: new IndexedDbMobileBatchCopyEntryWriter(
        database,
        identifiers,
      ),
    }
  })

  return adapters
}
