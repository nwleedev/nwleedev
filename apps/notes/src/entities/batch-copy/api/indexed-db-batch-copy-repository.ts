import { z } from "zod"

import { StoredTimestampSchema } from "@/shared/lib/entity-metadata"
import {
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db/index.browser"

import {
  BatchCopyItemSchema,
  BatchCopyListSchema,
  PRIMARY_BATCH_COPY_LIST_ID,
  parseBatchCopyList,
  type BatchCopyList,
  type BatchCopyRepository,
} from "../model/batch-copy-list"

export const BATCH_COPY_LIST_STORE_NAME = "batches"

const StoredBatchSchema = BatchCopyListSchema.extend({
  content: z.strictObject({
    ...BatchCopyListSchema.shape.content.shape,
    items: z.array(BatchCopyItemSchema.extend({ addedAt: StoredTimestampSchema })),
  }),
  updatedAt: StoredTimestampSchema,
})

export function readStoredBatch(value: unknown) {
  return parseBatchCopyList(StoredBatchSchema.parse(value))
}

export function storeBatch(list: BatchCopyList) {
  return StoredBatchSchema.encode(list)
}

export class IndexedDbBatchCopyRepository
  implements BatchCopyRepository
{
  readonly #connection: IndexedDbConnection

  constructor(connection: IndexedDbConnection) {
    this.#connection = connection
  }

  async get() {
    const database = await this.#connection.get()
    const transaction = database.transaction(
      BATCH_COPY_LIST_STORE_NAME,
      "readonly",
    )
    const completion = waitForTransaction(transaction)
    const record: unknown = await readRequest(
      transaction
        .objectStore(BATCH_COPY_LIST_STORE_NAME)
        .get(PRIMARY_BATCH_COPY_LIST_ID),
    )
    await completion

    return record === undefined ? null : readStoredBatch(record)
  }

  async save(list: BatchCopyList) {
    const record = parseBatchCopyList(list)
    const database = await this.#connection.get()
    const transaction = database.transaction(
      BATCH_COPY_LIST_STORE_NAME,
      "readwrite",
    )
    const completion = waitForTransaction(transaction)
    transaction.objectStore(BATCH_COPY_LIST_STORE_NAME).put(storeBatch(record))
    await completion

    return record
  }
}
