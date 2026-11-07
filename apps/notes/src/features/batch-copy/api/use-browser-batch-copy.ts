import { useState } from "react"

import { IndexedDbBatchCopyRepository } from "@/entities/batch-copy/index.browser"
import { IndexedDbBatchCopyItemWriter } from "./indexed-db-batch-copy-item-writer"
import { BrowserClipboardWriter } from "@/shared/lib/clipboard"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"
import { useDatabaseConnection } from "@/shared/lib/indexed-db/index.browser"

export function useBrowserBatchCopy() {
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
