import {
  WorkerTextAnalyzer,
  type TextAnalyzer,
} from "@/_pages/analysis/composition"
import {
  type NoteStorageMonitor,
} from "@/_pages/notes/composition"
import {
  IndexedDbAccumulationWriter,
  type AccumulationWriter,
} from "@/features/accumulate-note"
import {
  IndexedDbAccumulatorRepository,
  type AccumulatorRepository,
} from "@/entities/accumulator"
import {
  IndexedDbNoteRepository,
  type NoteRepository,
} from "@/entities/note"
import {
  IndexedDbInteractionPreferencesRepository,
  type InteractionPreferencesRepository,
} from "@/entities/preference"
import {
  IndexedDbTemplateRepository,
  type TemplateRepository,
} from "@/entities/template"
import {
  IndexedDbUsageRepository,
  type OrdinaryCopyUsageWriter,
  type TextUsageReader,
} from "@/entities/usage"
import {
  BrowserClipboardWriter,
  type ClipboardWriter,
} from "@/shared/lib/clipboard"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"

import { PersonalNotesDatabase } from "./indexed-db/PersonalNotesDatabase"

export type LocalApplication = {
  analysis: {
    analyzer: TextAnalyzer
    now(): string
  }
  accumulator: {
    createId(): string
    now(): string
    repository: AccumulatorRepository
    writer: AccumulationWriter
  }
  notes: {
    clipboard: ClipboardWriter
    createId(): string
    now(): string
    repository: NoteRepository
    storageMonitor: NoteStorageMonitor
    usageWriter: OrdinaryCopyUsageWriter
  }
  preferences: {
    now(): string
    repository: InteractionPreferencesRepository
  }
  templates: {
    repository: TemplateRepository
  }
  usage: {
    reader: TextUsageReader
    writer: OrdinaryCopyUsageWriter
  }
  dispose(): void
}

export function createLocalApplication(): LocalApplication {
  const identifiers = new CryptoEntityIdGenerator()
  const database = new PersonalNotesDatabase()
  const analyzer = new WorkerTextAnalyzer(identifiers)
  const now = () => new Date().toISOString()
  const usage = new IndexedDbUsageRepository(
    database,
    identifiers,
    now,
  )

  return {
    analysis: { analyzer, now },
    accumulator: {
      createId: () => identifiers.create(),
      now,
      repository: new IndexedDbAccumulatorRepository(database),
      writer: new IndexedDbAccumulationWriter(database, identifiers),
    },
    dispose: () => {
      analyzer.dispose()
      database.close()
    },
    notes: {
      clipboard: new BrowserClipboardWriter(),
      createId: () => identifiers.create(),
      now,
      repository: new IndexedDbNoteRepository(database),
      storageMonitor: database,
      usageWriter: usage,
    },
    preferences: {
      now,
      repository: new IndexedDbInteractionPreferencesRepository(database),
    },
    templates: {
      repository: new IndexedDbTemplateRepository(database),
    },
    usage: { reader: usage, writer: usage },
  }
}
