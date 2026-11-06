import type { Note } from "@/entities/note"
import {
  countTextCopy,
  USAGE_STORE_NAME,
} from "@/entities/usage/index.browser"
import type { EntityIdGenerator } from "@/shared/lib/id-generation"
import {
  abortTransaction,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db/index.browser"

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
      await countTextCopy(store, "batchCopy", {
        id: usageIdentifier,
        note: { id: note.id, contentRevision: note.contentRevision },
        textSnapshot: note.content,
        updatedAt,
      })
      await completion
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }
}
