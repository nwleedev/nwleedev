import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { IndexedDbAccumulationWriter } from "@/_pages/notes/composition"
import {
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
  USAGE_STORE_NAME,
  parseTextUsageRecord,
} from "@/entities/usage"
import { CryptoEntityIdGenerator } from "@/shared/lib/id-generation"
import {
  DatabaseUpgradeBlockedError,
  openIndexedDatabase,
  readRequest,
  waitForTransaction,
} from "@/shared/lib/indexed-db"

import { PersonalNotesDatabase } from "./PersonalNotesDatabase"
import {
  PERSONAL_NOTES_DATABASE_NAME,
  PERSONAL_NOTES_DATABASE_VERSION,
} from "./openPersonalNotesDatabase"

const timestamp = "2026-08-31T01:00:00.000Z"

const note: Note = {
  content: "저장한 메모",
  contentRevision: 0,
  createdAt: timestamp,
  geometry: { height: 240, width: 320, x: 40, y: 60, zIndex: 0 },
  id: "note-1",
  revision: 0,
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

  it("reports an upgrade blocked by an older open connection", async () => {
    const databaseName = "personal-notes-blocked-check"
    await deleteDatabase(databaseName)
    const blocker = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () =>
        reject(request.error ?? new Error("Blocking database could not open"))
    })
    let blocked = false

    await expect(
      openIndexedDatabase({
        name: databaseName,
        onBlocked: () => {
          blocked = true
        },
        upgrade: () => undefined,
        version: 2,
      }),
    ).rejects.toBeInstanceOf(DatabaseUpgradeBlockedError)
    expect(blocked).toBe(true)

    blocker.close()
    await deleteDatabase(databaseName)
  })
})
