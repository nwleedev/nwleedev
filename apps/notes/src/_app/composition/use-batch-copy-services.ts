import { useState } from "react"

import { IndexedDbBatchCopyRepository } from "@/entities/batch-copy/index.browser"
import { IndexedDbBatchCopyItemWriter } from "@/features/add-note-to-batch-copy/index.browser"
import { BrowserClipboardWriter } from "@/shared/lib/clipboard"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"
import { useDatabaseConnection } from "@/shared/lib/indexed-db/index.browser"

export function useBatchCopyServices() {
  const database = useDatabaseConnection()
  const [services] = useState(() => {
    const identifiers = new CryptoEntityIdGenerator()

    return {
      clipboard: new BrowserClipboardWriter(),
      createId: () => identifiers.create(),
      now: Date.now,
      repository: new IndexedDbBatchCopyRepository(database),
      writer: new IndexedDbBatchCopyItemWriter(database),
    }
  })

  return services
}
