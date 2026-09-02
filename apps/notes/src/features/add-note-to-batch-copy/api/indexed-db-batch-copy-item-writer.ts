import {
  BATCH_COPY_LIST_STORE_NAME,
  BatchCopyItemSchema,
  BatchCopyListSchema,
  PRIMARY_BATCH_COPY_LIST_ID,
  parseBatchCopyList,
  type BatchCopyItem,
} from "@/entities/batch-copy"
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
      const [storedList, storedUsage]: [unknown, unknown] =
        await Promise.all([
          readRequest(listStore.get(PRIMARY_BATCH_COPY_LIST_ID)),
          readRequest(
            usageStore
              .index(USAGE_BY_NOTE_CONTENT_INDEX)
              .get([
                item.sourceNote.id,
                item.sourceNote.contentRevision,
                item.textSnapshot,
              ]),
          ),
        ])
      const currentList =
        storedList === undefined ? null : parseBatchCopyList(storedList)
      const currentUsage =
        storedUsage === undefined ? null : parseTextUsageRecord(storedUsage)

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
      const usage = TextUsageRecordSchema.parse(
        currentUsage === null
          ? {
              counts: { batchCopy: 1, individualCopy: 0 },
              id: usageIdentifier,
              note: item.sourceNote,
              textSnapshot: item.textSnapshot,
              updatedAt: item.addedAt,
            }
          : {
              ...currentUsage,
              counts: {
                ...currentUsage.counts,
                batchCopy: currentUsage.counts.batchCopy + 1,
              },
              updatedAt: item.addedAt,
            },
      )

      listStore.put(list)
      usageStore.put(usage)
      await completion
      return list
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }
}
