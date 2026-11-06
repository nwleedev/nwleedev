import {
  BatchCopyItemSchema,
  BatchCopyListSchema,
  PRIMARY_BATCH_COPY_LIST_ID,
  type BatchCopyItem,
} from "@/entities/batch-copy"
import { BATCH_COPY_LIST_STORE_NAME, readStoredBatch, storeBatch } from "@/entities/batch-copy/index.browser"
import {
  countTextCopy,
  USAGE_STORE_NAME,
} from "@/entities/usage/index.browser"
import type { EntityIdGenerator } from "@/shared/lib/id-generation"
import {
  abortTransaction,
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db/index.browser"

import type { BatchCopyItemWriter } from "../model/batch-copy-item-writer"

export class IndexedDbBatchCopyItemWriter implements BatchCopyItemWriter {
  readonly #connection: IndexedDbConnection
  readonly #identifiers: EntityIdGenerator

  constructor(
    connection: IndexedDbConnection,
    identifiers: EntityIdGenerator,
  ) {
    this.#connection = connection
    this.#identifiers = identifiers
  }

  async addAndRecordUsage(input: BatchCopyItem) {
    const item = BatchCopyItemSchema.parse(input)
    const usageIdentifier = this.#identifiers.create()
    const database = await this.#connection.get()
    const transaction = database.transaction(
      [BATCH_COPY_LIST_STORE_NAME, USAGE_STORE_NAME],
      "readwrite",
    )
    const completion = waitForTransaction(transaction)

    try {
      const listStore = transaction.objectStore(
        BATCH_COPY_LIST_STORE_NAME,
      )
      const usageStore = transaction.objectStore(USAGE_STORE_NAME)
      const [storedList] = await Promise.all([
        readRequest(listStore.get(PRIMARY_BATCH_COPY_LIST_ID)),
        countTextCopy(usageStore, "batchCopy", {
          id: usageIdentifier,
          note: item.sourceNote,
          textSnapshot: item.textSnapshot,
          updatedAt: item.addedAt,
        }),
      ])
      const currentList = storedList === undefined ? null : readStoredBatch(storedList)
      const list = BatchCopyListSchema.parse(
        currentList === null
          ? {
              content: { items: [item], separator: "\n" },
              id: PRIMARY_BATCH_COPY_LIST_ID,
              revision: 0,
              updatedAt: item.addedAt,
            }
          : {
              ...currentList,
              content: {
                ...currentList.content,
                items: [...currentList.content.items, item],
              },
              revision: currentList.revision + 1,
              updatedAt: item.addedAt,
            },
      )
      listStore.put(storeBatch(list))
      await completion
      return list
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }
}
