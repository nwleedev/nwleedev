import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { IndexedDbAccumulationWriter } from "@/features/accumulate-note"
import {
  ACCUMULATOR_STORE_NAME,
  IndexedDbAccumulatorRepository,
  type AccumulatedTextItem,
} from "@/entities/accumulator"
import { IndexedDbNoteRepository, type Note } from "@/entities/note"
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

const accumulatedItem: AccumulatedTextItem = {
  addedAt: timestamp,
  id: "item-1",
  sourceNote: { contentRevision: 0, id: "note-1" },
  textSnapshot: "저장한 메모",
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
    const preferences = new IndexedDbInteractionPreferencesRepository(
      firstConnection,
    )
    const accumulation = new IndexedDbAccumulationWriter(
      firstConnection,
      identifiers,
    )

    await notes.save(note)
    await templates.save(template)
    await preferences.save({ metaClickEnabled: true, updatedAt: timestamp })
    await usage.recordOrdinaryCopy({
      note: accumulatedItem.sourceNote,
      textSnapshot: accumulatedItem.textSnapshot,
    })
    await accumulation.addAndRecordUsage(accumulatedItem)
    firstConnection.close()

    const restoredConnection = createConnection()
    const restoredNotes = new IndexedDbNoteRepository(restoredConnection)
    const restoredAccumulators = new IndexedDbAccumulatorRepository(
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
    const restoredPreferences =
      new IndexedDbInteractionPreferencesRepository(restoredConnection)

    expect(await restoredNotes.getAll()).toMatchObject([
      { content: note.content, id: note.id },
    ])
    expect(await restoredAccumulators.get()).toMatchObject({
      content: { items: [{ id: accumulatedItem.id }] },
    })
    expect(await restoredUsage.getAll()).toMatchObject([
      { counts: { accumulation: 1, ordinaryCopy: 1 } },
    ])
    expect(await restoredTemplates.getAll()).toMatchObject([
      { id: template.id, title: template.title },
    ])
    expect(await restoredPreferences.get()).toMatchObject({
      metaClickEnabled: true,
    })
  })

  it("does not append an item when its usage record cannot be read", async () => {
    const identifiers = new CryptoEntityIdGenerator()
    const connection = createConnection()
    const accumulation = new IndexedDbAccumulationWriter(
      connection,
      identifiers,
    )
    const accumulators = new IndexedDbAccumulatorRepository(connection)
    await accumulation.addAndRecordUsage(accumulatedItem)

    const database = await connection.get()
    const transaction = database.transaction(USAGE_STORE_NAME, "readwrite")
    const completion = waitForTransaction(transaction)
    const usageStore = transaction.objectStore(USAGE_STORE_NAME)
    const [storedUsage] = await readRequest<unknown[]>(usageStore.getAll())
    const validUsage = parseTextUsageRecord(storedUsage)
    usageStore.put({
      ...validUsage,
      counts: { accumulation: -1, ordinaryCopy: 0 },
    })
    await completion

    await expect(
      accumulation.addAndRecordUsage({
        ...accumulatedItem,
        id: "item-2",
      }),
    ).rejects.toThrow()
    expect(await accumulators.get()).toMatchObject({
      content: { items: [{ id: "item-1" }] },
    })
  })

  it("rolls back an accumulator write when the following usage write fails", async () => {
    const databaseName = "personal-notes-atomic-write-check"
    const failureIndexName = "usage-by-unique-updated-at"
    await deleteDatabase(databaseName)
    const database = await openIndexedDatabase({
      name: databaseName,
      upgrade: (upgradedDatabase) => {
        upgradedDatabase.createObjectStore(ACCUMULATOR_STORE_NAME, {
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
      create: () => "usage-created-after-accumulator",
    }
    const existingUsage = {
      counts: { accumulation: 1, ordinaryCopy: 0 },
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
    const accumulation = new IndexedDbAccumulationWriter(
      connection,
      identifiers,
    )
    const accumulators = new IndexedDbAccumulatorRepository(connection)
    const usage = new IndexedDbUsageRepository(
      connection,
      identifiers,
      () => timestamp,
    )

    await expect(
      accumulation.addAndRecordUsage(accumulatedItem),
    ).rejects.toThrow()
    expect(await accumulators.get()).toBeNull()
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
