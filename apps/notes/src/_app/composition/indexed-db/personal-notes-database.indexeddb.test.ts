import * as fc from "fast-check"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  IndexedDbBatchCopyItemWriter,
  IndexedDbMobileBatchCopyUsageWriter,
} from "@/features/add-note-to-batch-copy"
import {
  BATCH_COPY_LIST_STORE_NAME,
  IndexedDbBatchCopyRepository,
  PRIMARY_BATCH_COPY_LIST_ID,
  type BatchCopyItem,
} from "@/entities/batch-copy"
import {
  NOTE_DRAFT_STORE_NAME,
  NOTE_STORE_NAME,
  IndexedDbNoteDraftRepository,
  IndexedDbNoteRepository,
  type Note,
  type NoteDraft,
} from "@/entities/note"
import {
  PREFERENCE_STORE_NAME,
  IndexedDbInteractionPreferencesRepository,
} from "@/entities/preference"
import {
  TEMPLATE_STORE_NAME,
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
import { ExplorationInvariantError } from "@/shared/lib/note-model-exploration"

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
    const mobileBatchCopyWriter = new IndexedDbMobileBatchCopyUsageWriter(
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
    await mobileBatchCopyWriter.record(note, timestamp)
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
    const restoredPreferences =
      new IndexedDbInteractionPreferencesRepository(restoredConnection)

    expect(await restoredNotes.getAll()).toMatchObject([
      { content: note.content, id: note.id },
    ])
    expect(await restoredNoteDrafts.get(noteDraft.note)).toEqual(noteDraft)
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

  it("복사 당시 원문 버전별 횟수를 새 연결에서도 유지한다", async () => {
    type UsageScenario = {
      firstCopies: number
      firstText: string
      revision: number
      secondCopies: number
      suffix: string
    }
    const scenario = fc.record({
      firstCopies: fc.integer({ min: 1, max: 3 }),
      firstText: fc.string({ minLength: 1, maxLength: 16 }),
      revision: fc.integer({ min: 0, max: 100 }),
      secondCopies: fc.integer({ min: 1, max: 3 }),
      suffix: fc.string({ minLength: 1, maxLength: 16 }),
    })

    async function run(
      input: UsageScenario,
      wrongRevision: boolean,
    ) {
      const firstConnection = createConnection()
      const identifiers = new CryptoEntityIdGenerator()
      const notes = new IndexedDbNoteRepository(firstConnection)
      const usage = new IndexedDbUsageRepository(
        firstConnection,
        identifiers,
        () => timestamp,
      )
      const batch = new IndexedDbBatchCopyItemWriter(
        firstConnection,
        identifiers,
      )
      const noteId = crypto.randomUUID()
      const firstReference = {
        contentRevision: input.revision,
        id: noteId,
      }
      const secondReference = {
        contentRevision: input.revision + 1,
        id: noteId,
      }
      const secondText = input.firstText + input.suffix

      await notes.save({
        ...note,
        content: input.firstText,
        contentRevision: input.revision,
        id: noteId,
      })
      for (let copy = 0; copy < input.firstCopies; copy += 1) {
        await usage.recordIndividualCopy({
          note: firstReference,
          textSnapshot: input.firstText,
        })
      }
      await batch.addAndRecordUsage({
        ...batchCopyItem,
        id: crypto.randomUUID(),
        sourceNote: firstReference,
        textSnapshot: input.firstText,
      })
      await notes.save({
        ...note,
        content: secondText,
        contentRevision: secondReference.contentRevision,
        id: noteId,
        revision: note.revision + 1,
      })
      for (let copy = 0; copy < input.secondCopies; copy += 1) {
        await usage.recordIndividualCopy({
          note: wrongRevision ? firstReference : secondReference,
          textSnapshot: secondText,
        })
      }
      firstConnection.close()

      const restoredConnection = createConnection()
      const restoredUsage = new IndexedDbUsageRepository(
        restoredConnection,
        identifiers,
        () => timestamp,
      )
      const observed = (await restoredUsage.getAll())
        .filter((record) => record.note.id === noteId)
        .map((record) => ({
          counts: record.counts,
          revision: record.note.contentRevision,
          text: record.textSnapshot,
        }))
        .sort((left, right) => left.revision - right.revision)
      const expected = [
        {
          counts: { batchCopy: 1, individualCopy: input.firstCopies },
          revision: input.revision,
          text: input.firstText,
        },
        {
          counts: { batchCopy: 0, individualCopy: input.secondCopies },
          revision: input.revision + 1,
          text: secondText,
        },
      ]

      if (JSON.stringify(observed) !== JSON.stringify(expected)) {
        throw new ExplorationInvariantError(
          "usage-counts-follow-content-revision",
          expected,
          observed,
        )
      }
    }

    let normalRuns = 0
    await fc.assert(
      fc.asyncProperty(scenario, async (input) => {
        normalRuns += 1
        await run(input, false)
      }),
      { numRuns: 5, verbose: true },
    )

    const faulty = await fc.check(
      fc.asyncProperty(scenario, async (input) => run(input, true)),
      { numRuns: 10, verbose: true },
    )
    expect(faulty.failed).toBe(true)
    expect(faulty.errorInstance).toBeInstanceOf(ExplorationInvariantError)
    expect(faulty.counterexample).not.toBeNull()
    const reduced = faulty.counterexample![0]

    const replay = await fc.check(
      fc.asyncProperty(scenario, async (input) => run(input, true)),
      {
        endOnFailure: true,
        numRuns: 1,
        path: faulty.counterexamplePath ?? undefined,
        seed: faulty.seed,
      },
    )
    expect(replay.errorInstance).toBeInstanceOf(ExplorationInvariantError)
    await expect(run(reduced, true)).rejects.toMatchObject({
      invariant: "usage-counts-follow-content-revision",
    })
    await expect(run(reduced, false)).resolves.toBeUndefined()

    const failure = faulty.errorInstance as ExplorationInvariantError
    console.info(JSON.stringify({
      expected: failure.expected,
      feature: "usage-projection",
      initial: faulty.failures[0]?.[0] ?? null,
      observed: failure.observed,
      path: faulty.counterexamplePath,
      reduced,
      runs: normalRuns,
      seed: faulty.seed,
      shrinks: faulty.numShrinks,
    }))
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
      [
        "notes",
        previousBatchCopyStoreName,
        USAGE_STORE_NAME,
        "preferences",
      ],
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

  it("이전 schema로 열어도 사용자가 저장한 자료를 보존한다", async () => {
    const previousDatabase = await openIndexedDatabase({
      name: PERSONAL_NOTES_DATABASE_NAME,
      upgrade: (database) => {
        database.createObjectStore(NOTE_STORE_NAME, { keyPath: "id" })
        database.createObjectStore(NOTE_DRAFT_STORE_NAME, {
          keyPath: "note.id",
        })
        database.createObjectStore(BATCH_COPY_LIST_STORE_NAME, {
          keyPath: "id",
        })
        database.createObjectStore("mobileBatchCopyDrafts")
        const usageStore = database.createObjectStore(USAGE_STORE_NAME, {
          keyPath: "id",
        })
        usageStore.createIndex(
          USAGE_BY_NOTE_CONTENT_INDEX,
          ["note.id", "note.contentRevision", "textSnapshot"],
          { unique: true },
        )
        database.createObjectStore(TEMPLATE_STORE_NAME, { keyPath: "id" })
        database.createObjectStore(PREFERENCE_STORE_NAME)
      },
      version: 2,
    })
    const batchCopyList = {
      content: { items: [batchCopyItem], separator: "\n" },
      id: PRIMARY_BATCH_COPY_LIST_ID,
      revision: 2,
      updatedAt: timestamp,
    }
    const usageRecord = {
      counts: { batchCopy: 3, individualCopy: 2 },
      id: "usage-preserved",
      note: { contentRevision: note.contentRevision, id: note.id },
      textSnapshot: note.content,
      updatedAt: timestamp,
    }
    const preferences = {
      batchCopyReorderButtonsEnabled: true,
      batchCopyShortcutEnabled: false,
      updatedAt: timestamp,
    }
    const transaction = previousDatabase.transaction(
      [
        NOTE_STORE_NAME,
        NOTE_DRAFT_STORE_NAME,
        BATCH_COPY_LIST_STORE_NAME,
        "mobileBatchCopyDrafts",
        USAGE_STORE_NAME,
        TEMPLATE_STORE_NAME,
        PREFERENCE_STORE_NAME,
      ],
      "readwrite",
    )
    const completed = waitForTransaction(transaction)

    transaction.objectStore(NOTE_STORE_NAME).put(note)
    transaction.objectStore(NOTE_DRAFT_STORE_NAME).put(noteDraft)
    transaction.objectStore(BATCH_COPY_LIST_STORE_NAME).put(batchCopyList)
    transaction.objectStore("mobileBatchCopyDrafts").put(
      { id: "active" },
      "active",
    )
    transaction.objectStore(USAGE_STORE_NAME).put(usageRecord)
    transaction.objectStore(TEMPLATE_STORE_NAME).put(template)
    transaction.objectStore(PREFERENCE_STORE_NAME).put(
      preferences,
      "interaction",
    )
    await completed
    previousDatabase.close()

    const connection = createConnection()
    await expect(new IndexedDbNoteRepository(connection).getAll()).resolves
      .toEqual([note])
    await expect(
      new IndexedDbNoteDraftRepository(connection).get(noteDraft.note),
    ).resolves.toEqual(noteDraft)
    await expect(new IndexedDbBatchCopyRepository(connection).get()).resolves
      .toEqual(batchCopyList)
    await expect(new IndexedDbUsageRepository(
      connection,
      new CryptoEntityIdGenerator(),
      () => timestamp,
    ).getAll()).resolves.toEqual([usageRecord])
    await expect(new IndexedDbTemplateRepository(connection).getAll()).resolves
      .toEqual([template])
    await expect(
      new IndexedDbInteractionPreferencesRepository(connection).get(),
    ).resolves.toEqual(preferences)
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

  it("keeps usage data unchanged when a mobile usage update fails", async () => {
    const databaseName = "personal-notes-mobile-usage-atomic-write-check"
    const failureIndexName = "usage-by-unique-updated-at"
    await deleteDatabase(databaseName)
    const database = await openIndexedDatabase({
      name: databaseName,
      upgrade: (upgradedDatabase) => {
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
      create: () => "usage-created-after-mobile-copy",
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
    const writer = new IndexedDbMobileBatchCopyUsageWriter(
      connection,
      identifiers,
    )
    const usage = new IndexedDbUsageRepository(
      connection,
      identifiers,
      () => timestamp,
    )

    await expect(
      writer.record(note, timestamp),
    ).rejects.toThrow()
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
