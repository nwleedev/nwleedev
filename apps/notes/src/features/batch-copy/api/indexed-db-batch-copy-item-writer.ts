import {
  BatchCopyItemSchema,
  BatchCopyListSchema,
  PRIMARY_BATCH_COPY_LIST_ID,
  type BatchCopyItem,
} from "@/entities/batch-copy"
import { BATCH_COPY_LIST_STORE_NAME } from "@/entities/batch-copy/index.browser"
import {
  abortTransaction,
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db/index.browser"

import type { BatchCopyItemWriter } from "../model/batch-copy-item-writer"

export class IndexedDbBatchCopyItemWriter implements BatchCopyItemWriter {
  readonly #connection: IndexedDbConnection

  constructor(connection: IndexedDbConnection) {
    this.#connection = connection
  }

  async add(input: BatchCopyItem) {
    const item = BatchCopyItemSchema.parse(input)
    const database = await this.#connection.get()
    const transaction = database.transaction(
      BATCH_COPY_LIST_STORE_NAME,
      "readwrite",
    )
    const completion = waitForTransaction(transaction)

    try {
      const listStore = transaction.objectStore(
        BATCH_COPY_LIST_STORE_NAME,
      )
      const storedList = await readRequest(listStore.get(PRIMARY_BATCH_COPY_LIST_ID))
      const currentList = storedList === undefined ? null : BatchCopyListSchema.parse(storedList)
      const list = BatchCopyListSchema.parse(
        currentList === null
          ? {
              content: { items: [item], separator: "\n" },
              id: PRIMARY_BATCH_COPY_LIST_ID,
              updatedAt: item.addedAt,
            }
          : {
              ...currentList,
              content: {
                ...currentList.content,
                items: [...currentList.content.items, item],
              },
              updatedAt: item.addedAt,
            },
      )
      listStore.put(list)
      await completion
      return list
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }
}
