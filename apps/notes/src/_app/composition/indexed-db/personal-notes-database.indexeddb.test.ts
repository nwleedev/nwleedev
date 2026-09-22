import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  IndexedDbBatchCopyItemWriter,
  IndexedDbMobileBatchCopyEntryWriter,
} from "@/features/add-note-to-batch-copy"
import {
  BATCH_COPY_LIST_STORE_NAME,
  IndexedDbMobileBatchCopyDraftRepository,
  IndexedDbBatchCopyRepository,
  MOBILE_BATCH_COPY_DRAFT_STORE_NAME,
  type BatchCopyItem,
  type MobileBatchCopyDraft,
} from "@/entities/batch-copy"
import {
  IndexedDbNoteDraftRepository,
  IndexedDbNoteRepository,
  type Note,
  type NoteDraft,
} from "@/entities/note"
import { IndexedDbInteractionPreferencesRepository } from "@/entities/preference"
import {
  IndexedDbTemplateRepository,
  type TextTemplate,
} from "@/entities/template"
import {
  IndexedDbUsageRepository,
  USAGE_BY_NOTE_CONTENT_INDEX,
  USAGE_STORE_NAME,
  parseTextUsageRecord,
} from "@/entities/usage"
import {
  CryptoEntityIdGenerator,
  type EntityIdGenerator,
} from "@/shared/lib/id-generation"
import {
  openIndexedDatabase,
  readRequest,
  waitForTransaction,
} from "@/shared/lib/indexed-db"

import {
  DatabaseConnectionClosedError,
  PersonalNotesDatabase,
} from "./personal-notes-database"
import {
  PERSONAL_NOTES_DATABASE_NAME,
  PERSONAL_NOTES_DATABASE_VERSION,
} from "./open-personal-notes-database"

const timestamp = "2026-08-31T01:00:00.000Z"

const note: Note = {
  content: "저장한 메모",
  contentRevision: 0,
  createdAt: timestamp,
  geometry: { height: 240, width: 320, x: 40, y: 60, zIndex: 1 },
  id: "note-1",
  revision: 0,
  tabIndex: 1000,
  updatedAt: timestamp,
}

const template: TextTemplate = {
  createdAt: timestamp,
  id: "template-1",
  revision: 0,
  segments: [{ kind: "literal", value: "저장한 문장" }],
  title: "저장한 템플릿",
  updatedAt: timestamp,
}

const batchCopyItem: BatchCopyItem = {
  addedAt: timestamp,
  id: "item-1",
  sourceNote: { contentRevision: 0, id: "note-1" },
  textSnapshot: "저장한 메모",
}

const noteDraft: NoteDraft = {
  content: "저장 전 메모",
  note: { contentRevision: note.contentRevision, id: note.id },
  updatedAt: timestamp,
}

const mobileBatchCopyEntry = {
  id: "draft-item-1",
  sourceNote: batchCopyItem.sourceNote,
  textSnapshot: batchCopyItem.textSnapshot,
}

const mobileBatchCopyDraft: MobileBatchCopyDraft & { step: "collecting" } = {
  clickCount: 1,
  entries: [mobileBatchCopyEntry],
  id: "mobile-batch-copy-1",
  startedAt: timestamp,
  step: "collecting",
  updatedAt: timestamp,
}

function deleteDatabase(name: string) {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () =>
      reject(request.error ?? new Error("Database could not be deleted"))
    request.onblocked = () =>
      reject(new Error("Database deletion was blocked"))
  })
}

function openDatabase(name: string, version: number) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, version)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error("Database could not be opened"))
    request.onblocked = () =>
      reject(new Error("Database open request was blocked"))
  })
}

function startDatabaseDeletion(name: string) {
  const request = indexedDB.deleteDatabase(name)
  const blocked = new Promise<void>((resolve) => {
    request.onblocked = () => resolve()
  })
  const completed = new Promise<void>((resolve, reject) => {
    request.onsuccess = () => resolve()
    request.onerror = () =>
      reject(request.error ?? new Error("Database could not be deleted"))
  })

  return { blocked, completed }
}

describe("personal notes IndexedDB storage", () => {
  let connections: PersonalNotesDatabase[]

  beforeEach(async () => {
    connections = []
    await deleteDatabase(PERSONAL_NOTES_DATABASE_NAME)
  })

  afterEach(async () => {
    for (const connection of connections) {
      connection.close()
    }

    await deleteDatabase(PERSONAL_NOTES_DATABASE_NAME)
  })

  function createConnection() {
    const connection = new PersonalNotesDatabase()
    connections.push(connection)
    return connection
  }

  it("restores all persistent records through a new connection", async () => {
    const identifiers = new CryptoEntityIdGenerator()
    const firstConnection = createConnection()
    const notes = new IndexedDbNoteRepository(firstConnection)
    const usage = new IndexedDbUsageRepository(
      firstConnection,
      identifiers,
      () => timestamp,
    )
    const templates = new IndexedDbTemplateRepository(firstConnection)
    const noteDrafts = new IndexedDbNoteDraftRepository(firstConnection)
    const mobileBatchCopyWriter = new IndexedDbMobileBatchCopyEntryWriter(
      firstConnection,
      identifiers,
    )
    const preferences = new IndexedDbInteractionPreferencesRepository(
      firstConnection,
    )
    const batchCopyWriter = new IndexedDbBatchCopyItemWriter(
      firstConnection,
      identifiers,
    )

    await notes.save(note)
    await noteDrafts.save(noteDraft)
    await mobileBatchCopyWriter.saveAndRecordUsage(
      mobileBatchCopyDraft,
      mobileBatchCopyEntry,
    )
    await templates.save(template)
    await preferences.save({
      batchCopyReorderButtonsEnabled: false,
      batchCopyShortcutEnabled: true,
      updatedAt: timestamp,
    })
    await usage.recordIndividualCopy({
      note: batchCopyItem.sourceNote,
      textSnapshot: batchCopyItem.textSnapshot,
    })
    await batchCopyWriter.addAndRecordUsage(batchCopyItem)
    firstConnection.close()

    const restoredConnection = createConnection()
    const restoredNotes = new IndexedDbNoteRepository(restoredConnection)
    const restoredBatchCopy = new IndexedDbBatchCopyRepository(
      restoredConnection,
    )
    const restoredUsage = new IndexedDbUsageRepository(
      restoredConnection,
      identifiers,
      () => timestamp,
    )
    const restoredTemplates = new IndexedDbTemplateRepository(
      restoredConnection,
    )
    const restoredNoteDrafts = new IndexedDbNoteDraftRepository(
      restoredConnection,
    )
    const restoredMobileBatchCopyDrafts =
      new IndexedDbMobileBatchCopyDraftRepository(restoredConnection)
    const restoredPreferences =
      new IndexedDbInteractionPreferencesRepository(restoredConnection)

    expect(await restoredNotes.getAll()).toMatchObject([
      { content: note.content, id: note.id },
    ])
    expect(await restoredNoteDrafts.get(noteDraft.note)).toEqual(noteDraft)
    expect(await restoredMobileBatchCopyDrafts.get()).toEqual(
      mobileBatchCopyDraft,
    )
    expect(await restoredBatchCopy.get()).toMatchObject({
      content: { items: [{ id: batchCopyItem.id }] },
    })
    expect(await restoredUsage.getAll()).toMatchObject([
      { counts: { batchCopy: 2, individualCopy: 1 } },
    ])
    expect(await restoredTemplates.getAll()).toMatchObject([
      { id: template.id, title: template.title },
    ])
    expect(await restoredPreferences.get()).toMatchObject({
      batchCopyShortcutEnabled: true,
    })
  })

  it("이전 자료를 옮기며 유효한 너비와 저장된 텍스트 순서를 보존한다", async () => {
    const previousBatchCopyStoreName = "accumulators"
    const previousDatabase = await openIndexedDatabase({
      name: PERSONAL_NOTES_DATABASE_NAME,
      upgrade: (database) => {
        database.createObjectStore("notes", { keyPath: "id" })
        database.createObjectStore(previousBatchCopyStoreName, {
          keyPath: "id",
        })
        const usageStore = database.createObjectStore(USAGE_STORE_NAME, {
          keyPath: "id",
        })
        usageStore.createIndex(
          USAGE_BY_NOTE_CONTENT_INDEX,
          ["note.id", "note.contentRevision", "textSnapshot"],
          { unique: true },
        )
        database.createObjectStore("templates", { keyPath: "id" })
        database.createObjectStore("preferences")
      },
      version: 1,
    })
    const previousNoteFields = {
      content: note.content,
      contentRevision: note.contentRevision,
      createdAt: note.createdAt,
      geometry: note.geometry,
      id: note.id,
      revision: note.revision,
      updatedAt: note.updatedAt,
    }
    const previousNotes = [
      {
        ...previousNoteFields,
        createdAt: "2026-08-31T02:00:00.000Z",
        geometry: {
          height: 100,
          width: 1600,
          x: 0,
          y: 5000,
          zIndex: 2,
        },
        id: "note-a",
      },
      {
        ...previousNoteFields,
        createdAt: "2026-08-31T00:00:00.000Z",
        geometry: { ...note.geometry, zIndex: 2 },
        id: "note-b",
      },
      {
        ...previousNoteFields,
        createdAt: "2026-08-31T03:00:00.000Z",
        geometry: { ...note.geometry, width: 5000, zIndex: 3 },
        id: "note-c",
      },
    ]
    const previousBatchCopyList = {
      content: {
        items: [
          batchCopyItem,
          { ...batchCopyItem, id: "item-2", textSnapshot: "두 번째" },
        ],
        separator: "\n",
      },
      id: "primary",
      revision: 1,
      updatedAt: timestamp,
    }
    const previousUsage = {
      counts: { accumulation: 3, ordinaryCopy: 2 },
      id: "usage-previous",
      note: batchCopyItem.sourceNote,
      textSnapshot: batchCopyItem.textSnapshot,
      updatedAt: timestamp,
    }
    const transaction = previousDatabase.transaction(
      ["notes", previousBatchCopyStoreName, USAGE_STORE_NAME, "preferences"],
      "readwrite",
    )
    const completed = waitForTransaction(transaction)

    for (const previousNote of previousNotes) {
      transaction.objectStore("notes").put(previousNote)
    }

    transaction
      .objectStore(previousBatchCopyStoreName)
      .put(previousBatchCopyList)
    transaction.objectStore(USAGE_STORE_NAME).put(previousUsage)
    transaction.objectStore("preferences").put(
      { metaClickEnabled: false, updatedAt: timestamp },
      "interaction",
    )
    await completed
    previousDatabase.close()

    const connection = createConnection()
    const migratedDatabase = await connection.get()
    const storeNames = Array.from(migratedDatabase.objectStoreNames)
    const migratedNotes = await new IndexedDbNoteRepository(
      connection,
    ).getAll()
    const notesById = new Map(migratedNotes.map((stored) => [stored.id, stored]))
    const migratedBatchCopy = await new IndexedDbBatchCopyRepository(
      connection,
    ).get()
    const migratedUsage = await new IndexedDbUsageRepository(
      connection,
      new CryptoEntityIdGenerator(),
      () => timestamp,
    ).getAll()
    const migratedPreferences =
      await new IndexedDbInteractionPreferencesRepository(connection).get()

    expect(storeNames).toContain(BATCH_COPY_LIST_STORE_NAME)
    expect(storeNames).not.toContain(previousBatchCopyStoreName)
    expect(storeNames).toContain("noteDrafts")
    expect(storeNames).toContain("mobileBatchCopyDrafts")
    expect(migratedBatchCopy?.content.items.map(({ id }) => id)).toEqual([
      "item-1",
      "item-2",
    ])
    expect(migratedUsage).toMatchObject([
      { counts: { batchCopy: 3, individualCopy: 2 } },
    ])
    expect(migratedPreferences).toMatchObject({
      batchCopyShortcutEnabled: false,
    })
    expect(notesById.get("note-b")).toMatchObject({
      geometry: { zIndex: 1 },
      revision: 1,
      tabIndex: 1000,
    })
    expect(notesById.get("note-a")).toMatchObject({
      geometry: { height: 180, width: 1600, x: 0, y: 5000, zIndex: 2 },
      revision: 1,
      tabIndex: 1001,
    })
    expect(notesById.get("note-c")).toMatchObject({
      geometry: { width: 4095, zIndex: 3 },
      revision: 1,
      tabIndex: 1002,
    })
  })

  it("does not append an item when its usage record cannot be read", async () => {
    const identifiers = new CryptoEntityIdGenerator()
    const connection = createConnection()
    const batchCopyWriter = new IndexedDbBatchCopyItemWriter(
      connection,
      identifiers,
    )
    const batchCopy = new IndexedDbBatchCopyRepository(connection)
    await batchCopyWriter.addAndRecordUsage(batchCopyItem)

    const database = await connection.get()
    const transaction = database.transaction(USAGE_STORE_NAME, "readwrite")
    const completion = waitForTransaction(transaction)
    const usageStore = transaction.objectStore(USAGE_STORE_NAME)
    const [storedUsage] = await readRequest<unknown[]>(usageStore.getAll())
    const validUsage = parseTextUsageRecord(storedUsage)
    usageStore.put({
      ...validUsage,
      counts: { batchCopy: -1, individualCopy: 0 },
    })
    await completion

    await expect(
      batchCopyWriter.addAndRecordUsage({
        ...batchCopyItem,
        id: "item-2",
      }),
    ).rejects.toThrow()
    expect(await batchCopy.get()).toMatchObject({
      content: { items: [{ id: "item-1" }] },
    })
  })

  it("rolls back a batch copy write when the following usage write fails", async () => {
    const databaseName = "personal-notes-atomic-write-check"
    const failureIndexName = "usage-by-unique-updated-at"
    await deleteDatabase(databaseName)
    const database = await openIndexedDatabase({
      name: databaseName,
      upgrade: (upgradedDatabase) => {
        upgradedDatabase.createObjectStore(BATCH_COPY_LIST_STORE_NAME, {
          keyPath: "id",
        })
        const usageStore = upgradedDatabase.createObjectStore(
          USAGE_STORE_NAME,
          { keyPath: "id" },
        )
        usageStore.createIndex(
          USAGE_BY_NOTE_CONTENT_INDEX,
          ["note.id", "note.contentRevision", "textSnapshot"],
          { unique: true },
        )
        usageStore.createIndex(failureIndexName, "updatedAt", {
          unique: true,
        })
      },
      version: 1,
    })
    const connection = { get: () => Promise.resolve(database) }
    const identifiers: EntityIdGenerator = {
      create: () => "usage-created-after-batch-copy",
    }
    const existingUsage = {
      counts: { batchCopy: 1, individualCopy: 0 },
      id: "usage-existing",
      note: { contentRevision: 0, id: "note-existing" },
      textSnapshot: "기존 사용 기록",
      updatedAt: timestamp,
    }
    const seedTransaction = database.transaction(
      USAGE_STORE_NAME,
      "readwrite",
    )
    const seeded = waitForTransaction(seedTransaction)
    seedTransaction.objectStore(USAGE_STORE_NAME).put(existingUsage)
    await seeded
    const batchCopyWriter = new IndexedDbBatchCopyItemWriter(
      connection,
      identifiers,
    )
    const batchCopy = new IndexedDbBatchCopyRepository(connection)
    const usage = new IndexedDbUsageRepository(
      connection,
      identifiers,
      () => timestamp,
    )

    await expect(
      batchCopyWriter.addAndRecordUsage(batchCopyItem),
    ).rejects.toThrow()
    expect(await batchCopy.get()).toBeNull()
    expect(await usage.getAll()).toEqual([existingUsage])

    database.close()
    await deleteDatabase(databaseName)
  })

  it("rolls back a mobile draft when its usage write fails", async () => {
    const databaseName = "personal-notes-mobile-draft-atomic-write-check"
    const failureIndexName = "usage-by-unique-updated-at"
    await deleteDatabase(databaseName)
    const database = await openIndexedDatabase({
      name: databaseName,
      upgrade: (upgradedDatabase) => {
        upgradedDatabase.createObjectStore(
          MOBILE_BATCH_COPY_DRAFT_STORE_NAME,
        )
        const usageStore = upgradedDatabase.createObjectStore(
          USAGE_STORE_NAME,
          { keyPath: "id" },
        )
        usageStore.createIndex(
          USAGE_BY_NOTE_CONTENT_INDEX,
          ["note.id", "note.contentRevision", "textSnapshot"],
          { unique: true },
        )
        usageStore.createIndex(failureIndexName, "updatedAt", {
          unique: true,
        })
      },
      version: 1,
    })
    const connection = { get: () => Promise.resolve(database) }
    const identifiers: EntityIdGenerator = {
      create: () => "usage-created-after-mobile-draft",
    }
    const existingUsage = {
      counts: { batchCopy: 1, individualCopy: 0 },
      id: "usage-existing",
      note: { contentRevision: 0, id: "note-existing" },
      textSnapshot: "기존 사용 기록",
      updatedAt: timestamp,
    }
    const seedTransaction = database.transaction(
      USAGE_STORE_NAME,
      "readwrite",
    )
    const seeded = waitForTransaction(seedTransaction)
    seedTransaction.objectStore(USAGE_STORE_NAME).put(existingUsage)
    await seeded
    const writer = new IndexedDbMobileBatchCopyEntryWriter(
      connection,
      identifiers,
    )
    const drafts = new IndexedDbMobileBatchCopyDraftRepository(connection)
    const usage = new IndexedDbUsageRepository(
      connection,
      identifiers,
      () => timestamp,
    )

    await expect(
      writer.saveAndRecordUsage(mobileBatchCopyDraft, mobileBatchCopyEntry),
    ).rejects.toThrow()
    expect(await drafts.get()).toBeNull()
    expect(await usage.getAll()).toEqual([existingUsage])

    database.close()
    await deleteDatabase(databaseName)
  })

  it("closes the current connection when another version opens", async () => {
    const connection = createConnection()
    const event = new Promise<string>((resolve) => {
      connection.subscribe(resolve)
    })
    await connection.get()

    const upgraded = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(
        PERSONAL_NOTES_DATABASE_NAME,
        PERSONAL_NOTES_DATABASE_VERSION + 1,
      )
      request.onsuccess = () => resolve(request.result)
      request.onerror = () =>
        reject(request.error ?? new Error("Database could not be upgraded"))
    })

    expect(await event).toBe("version-changed")
    upgraded.close()
  })

  it("continues an upgrade after the blocking connection closes", async () => {
    const databaseName = "personal-notes-blocked-check"
    await deleteDatabase(databaseName)
    const blocker = await openDatabase(databaseName, 1)
    let resolveBlocked: () => void = () => undefined
    const blockedEvent = new Promise<void>((resolve) => {
      resolveBlocked = resolve
    })
    let settled = false
    const opening = openIndexedDatabase({
      name: databaseName,
      onBlocked: resolveBlocked,
      upgrade: () => undefined,
      version: 2,
    })
    void opening.then(
      () => {
        settled = true
      },
      () => {
        settled = true
      },
    )

    await blockedEvent
    expect(settled).toBe(false)

    blocker.close()
    const upgraded = await opening
    expect(upgraded.version).toBe(2)
    upgraded.close()
    await deleteDatabase(databaseName)
  })

  it("discards an open result invalidated by close", async () => {
    const blocker = await openDatabase(PERSONAL_NOTES_DATABASE_NAME, 1)
    const deletion = startDatabaseDeletion(PERSONAL_NOTES_DATABASE_NAME)
    await deletion.blocked
    const connection = createConnection()
    const staleOpening = connection.get()

    connection.close()
    const currentOpening = connection.get()
    blocker.close()
    await deletion.completed

    await expect(staleOpening).rejects.toBeInstanceOf(
      DatabaseConnectionClosedError,
    )
    await currentOpening
    const notes = new IndexedDbNoteRepository(connection)
    expect(await notes.getAll()).toEqual([])

    connection.close()
    const upgraded = await openDatabase(
      PERSONAL_NOTES_DATABASE_NAME,
      PERSONAL_NOTES_DATABASE_VERSION + 1,
    )
    expect(upgraded.version).toBe(PERSONAL_NOTES_DATABASE_VERSION + 1)
    upgraded.close()
  })
})
