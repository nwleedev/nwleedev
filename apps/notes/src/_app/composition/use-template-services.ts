import { useState } from "react"

import { IndexedDbTemplateRepository } from "@/entities/template/index.browser"
import { BrowserClipboardWriter } from "@/shared/lib/clipboard"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"

import type { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"

export function useTemplateServices(database: PersonalNotesDatabase) {
  const [services] = useState(() => {
    const identifiers = new CryptoEntityIdGenerator()

    return {
      clipboard: new BrowserClipboardWriter(),
      createId: () => identifiers.create(),
      now: Date.now,
      repository: new IndexedDbTemplateRepository(database),
    }
  })

  return services
}
