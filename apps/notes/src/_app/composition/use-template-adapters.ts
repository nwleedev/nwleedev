import { useState } from "react"

import { IndexedDbTemplateRepository } from "@/entities/template"
import { BrowserClipboardWriter } from "@/shared/lib/clipboard"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"

export function useTemplateAdapters(database: PersonalNotesDatabase) {
  const [adapters] = useState(() => {
    const identifiers = new CryptoEntityIdGenerator()

    return {
      clipboard: new BrowserClipboardWriter(),
      createId: () => identifiers.create(),
      now: () => new Date().toISOString(),
      repository: new IndexedDbTemplateRepository(database),
    }
  })

  return adapters
}
