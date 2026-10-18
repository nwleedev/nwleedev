import { useState } from "react"

import {
  IndexedDbNoteDraftRepository,
  IndexedDbMobileNoteOrderRepository,
  IndexedDbNoteRepository,
} from "@/entities/note"
import { BrowserClipboardWriter } from "@/shared/lib/clipboard"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"

export function useNoteAdapters(database: PersonalNotesDatabase) {
  const [adapters] = useState(() => {
    const identifiers = new CryptoEntityIdGenerator()
    const order = new IndexedDbMobileNoteOrderRepository(database)

    return {
      clipboard: new BrowserClipboardWriter(),
      createId: () => identifiers.create(),
      drafts: new IndexedDbNoteDraftRepository(database),
      now: () => new Date().toISOString(),
      repository: new IndexedDbNoteRepository(database),
      readMobileOrder: () => order.read(),
      moveMobileNote: (input: Parameters<typeof order.move>[0]) => order.move(input),
      storageMonitor: database,
    }
  })

  return adapters
}
