import { useState } from "react"

import {
  IndexedDbMobileNoteOrderRepository,
  IndexedDbNoteRepository,
} from "@/entities/note/index.browser"
import { BrowserClipboardWriter } from "@/shared/lib/clipboard"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"
import { useDatabaseConnection } from "@/shared/lib/indexed-db/index.browser"

export function useBrowserNoteData() {
  const database = useDatabaseConnection()
  const [services] = useState(() => {
    const identifiers = new CryptoEntityIdGenerator()
    const order = new IndexedDbMobileNoteOrderRepository(database)

    return {
      clipboard: new BrowserClipboardWriter(),
      createId: () => identifiers.create(),
      now: Date.now,
      repository: new IndexedDbNoteRepository(database),
      readMobileOrder: () => order.read(),
      moveMobileNote: (input: Parameters<typeof order.move>[0]) => order.move(input),
      storageMonitor: database,
    }
  })

  return services
}
