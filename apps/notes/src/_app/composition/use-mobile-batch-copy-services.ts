import { useState } from "react"

import { IndexedDbMobileBatchCopyUsageWriter } from "@/features/add-note-to-batch-copy/index.browser"
import { BrowserClipboardWriter } from "@/shared/lib/clipboard"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"

export function useMobileBatchCopyServices(database: PersonalNotesDatabase) {
  const [services] = useState(() => {
    const identifiers = new CryptoEntityIdGenerator()

    return {
      clipboard: new BrowserClipboardWriter(),
      createId: () => identifiers.create(),
      now: Date.now,
      writer: new IndexedDbMobileBatchCopyUsageWriter(
        database,
        identifiers,
      ),
    }
  })

  return services
}
