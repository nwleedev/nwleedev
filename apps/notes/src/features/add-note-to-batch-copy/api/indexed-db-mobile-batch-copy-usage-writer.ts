import type { Note } from "@/entities/note"
import {
  TextUsageRecordSchema,
  USAGE_BY_NOTE_CONTENT_INDEX,
  USAGE_STORE_NAME,
  parseTextUsageRecord,
} from "@/entities/usage"
import type { EntityIdGenerator } from "@/shared/lib/id-generation"
import {
  abortTransaction,
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db"

import type { MobileBatchCopyUsageWriter } from "../model/mobile-batch-copy-usage-writer"

export class IndexedDbMobileBatchCopyUsageWriter
  implements MobileBatchCopyUsageWriter
{
  readonly #connection: IndexedDbConnection
  readonly #identifiers: EntityIdGenerator

  constructor(
    connection: IndexedDbConnection,
    identifiers: EntityIdGenerator,
  ) {
    this.#connection = connection
    this.#identifiers = identifiers
  }

  async record(note: Note, updatedAt: string) {
    const usageIdentifier = this.#identifiers.create()
    const database = await this.#connection.get()
    const transaction = database.transaction(USAGE_STORE_NAME, "readwrite")
    const completion = waitForTransaction(transaction)

    try {
      const store = transaction.objectStore(USAGE_STORE_NAME)
      const storedUsage: unknown = await readRequest(
        store
          .index(USAGE_BY_NOTE_CONTENT_INDEX)
          .get([note.id, note.contentRevision, note.content]),
      )
      const currentUsage =
        storedUsage === undefined ? null : parseTextUsageRecord(storedUsage)
      const usage = TextUsageRecordSchema.parse(
        currentUsage === null
          ? {
              counts: { batchCopy: 1, individualCopy: 0 },
              id: usageIdentifier,
              note: { contentRevision: note.contentRevision, id: note.id },
              textSnapshot: note.content,
              updatedAt,
            }
          : {
              ...currentUsage,
              counts: {
                ...currentUsage.counts,
                batchCopy: currentUsage.counts.batchCopy + 1,
              },
              updatedAt,
            },
      )

      store.put(usage)
      await completion
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }
}
