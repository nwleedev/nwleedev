import {
  WorkerTextAnalyzer,
  type TextAnalyzer,
} from "@/_pages/analysis/composition"
import {
  type NoteStorageMonitor,
} from "@/_pages/notes/composition"
import {
  IndexedDbBatchCopyItemWriter,
  IndexedDbMobileBatchCopyEntryWriter,
  type BatchCopyItemWriter,
  type MobileBatchCopyEntryWriter,
} from "@/features/add-note-to-batch-copy"
import {
  IndexedDbMobileBatchCopyDraftRepository,
  IndexedDbBatchCopyRepository,
  type BatchCopyRepository,
  type MobileBatchCopyDraftRepository,
} from "@/entities/batch-copy"
import {
  IndexedDbNoteDraftRepository,
  IndexedDbNoteRepository,
  type NoteDraftRepository,
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
  type IndividualCopyUsageWriter,
  type TextUsageReader,
} from "@/entities/usage"
import {
  BrowserClipboardWriter,
  type ClipboardWriter,
} from "@/shared/lib/clipboard"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"

import { PersonalNotesDatabase } from "./indexed-db/personal-notes-database"

export type LocalApplication = {
  analysis: {
    analyzer: TextAnalyzer
    now(): string
  }
  batchCopy: {
    createId(): string
    draftRepository: MobileBatchCopyDraftRepository
    mobileWriter: MobileBatchCopyEntryWriter
    now(): string
    repository: BatchCopyRepository
    writer: BatchCopyItemWriter
  }
  notes: {
    clipboard: ClipboardWriter
    createId(): string
    draftRepository: NoteDraftRepository
    now(): string
    repository: NoteRepository
    storageMonitor: NoteStorageMonitor
    usageWriter: IndividualCopyUsageWriter
  }
  preferences: {
    now(): string
    repository: InteractionPreferencesRepository
  }
  templates: {
    clipboard: ClipboardWriter
    createId(): string
    now(): string
    repository: TemplateRepository
  }
  usage: {
    reader: TextUsageReader
    writer: IndividualCopyUsageWriter
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
    batchCopy: {
      createId: () => identifiers.create(),
      draftRepository: new IndexedDbMobileBatchCopyDraftRepository(database),
      mobileWriter: new IndexedDbMobileBatchCopyEntryWriter(
        database,
        identifiers,
      ),
      now,
      repository: new IndexedDbBatchCopyRepository(database),
      writer: new IndexedDbBatchCopyItemWriter(database, identifiers),
    },
    dispose: () => {
      analyzer.dispose()
      database.close()
    },
    notes: {
      clipboard: new BrowserClipboardWriter(),
      createId: () => identifiers.create(),
      draftRepository: new IndexedDbNoteDraftRepository(database),
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
      clipboard: new BrowserClipboardWriter(),
      createId: () => identifiers.create(),
      now,
      repository: new IndexedDbTemplateRepository(database),
    },
    usage: { reader: usage, writer: usage },
  }
}
