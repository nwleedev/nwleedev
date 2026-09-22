import type { NoteContentReference } from "@/entities/note/@x/usage"
import type { EntityIdGenerator } from "@/shared/lib/id-generation"
import {
  abortTransaction,
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db"

import {
  TextUsageRecordSchema,
  parseTextUsageRecord,
  type IndividualCopyUsageWriter,
  type TextUsageReader,
} from "../model/text-usage-record"

export const USAGE_STORE_NAME = "usage"
export const USAGE_BY_NOTE_CONTENT_INDEX = "by-note-content"

type UsageInput = {
  note: NoteContentReference
  textSnapshot: string
}

export class IndexedDbUsageRepository
  implements TextUsageReader, IndividualCopyUsageWriter
{
  readonly #connection: IndexedDbConnection
  readonly #identifiers: EntityIdGenerator
  readonly #now: () => string

  constructor(
    connection: IndexedDbConnection,
    identifiers: EntityIdGenerator,
    now: () => string,
  ) {
    this.#connection = connection
    this.#identifiers = identifiers
    this.#now = now
  }

  async getAll() {
    const database = await this.#connection.get()
    const transaction = database.transaction(USAGE_STORE_NAME, "readonly")
    const completion = waitForTransaction(transaction)
    const records: unknown[] = await readRequest(
      transaction.objectStore(USAGE_STORE_NAME).getAll(),
    )
    await completion

    return records.map(parseTextUsageRecord)
  }

  async recordIndividualCopy(input: UsageInput) {
    const newIdentifier = this.#identifiers.create()
    const updatedAt = this.#now()
    const database = await this.#connection.get()
    const transaction = database.transaction(USAGE_STORE_NAME, "readwrite")
    const completion = waitForTransaction(transaction)

    try {
      const store = transaction.objectStore(USAGE_STORE_NAME)
      const current: unknown = await readRequest(
        store
          .index(USAGE_BY_NOTE_CONTENT_INDEX)
          .get([
            input.note.id,
            input.note.contentRevision,
            input.textSnapshot,
          ]),
      )
      const currentUsage =
        current === undefined ? null : parseTextUsageRecord(current)
      const record = TextUsageRecordSchema.parse(
        currentUsage === null
          ? {
              counts: { batchCopy: 0, individualCopy: 1 },
              id: newIdentifier,
              note: input.note,
              textSnapshot: input.textSnapshot,
              updatedAt,
            }
          : {
              ...currentUsage,
              counts: {
                ...currentUsage.counts,
                individualCopy: currentUsage.counts.individualCopy + 1,
              },
              updatedAt,
            },
      )
      store.put(record)
      await completion
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }
}
