import {
  WorkerTextAnalyzer,
  type TextAnalyzer,
} from "@/_pages/analysis/composition"
import {
  IndexedDbAccumulationWriter,
  type AccumulationWriter,
  type NoteStorageMonitor,
} from "@/_pages/notes/composition"
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
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"

import { PersonalNotesDatabase } from "./indexed-db/PersonalNotesDatabase"

export type LocalApplication = {
  analysis: {
    analyzer: TextAnalyzer
  }
  accumulator: {
    repository: AccumulatorRepository
    writer: AccumulationWriter
  }
  notes: {
    repository: NoteRepository
    storageMonitor: NoteStorageMonitor
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
    analysis: { analyzer },
    accumulator: {
      repository: new IndexedDbAccumulatorRepository(database),
      writer: new IndexedDbAccumulationWriter(database, identifiers),
    },
    dispose: () => {
      analyzer.dispose()
      database.close()
    },
    notes: {
      repository: new IndexedDbNoteRepository(database),
      storageMonitor: database,
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
