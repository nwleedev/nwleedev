import {
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db"

import {
  parseBatchCopyList,
  type BatchCopyList,
  type BatchCopyRepository,
} from "../model/batch-copy-list"

export const BATCH_COPY_LIST_STORE_NAME = "batchCopyLists"
export const PRIMARY_BATCH_COPY_LIST_ID = "primary"

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

    return record === undefined ? null : parseBatchCopyList(record)
  }

  async save(list: BatchCopyList) {
    const record = parseBatchCopyList(list)
    const database = await this.#connection.get()
    const transaction = database.transaction(
      BATCH_COPY_LIST_STORE_NAME,
      "readwrite",
    )
    const completion = waitForTransaction(transaction)
    transaction.objectStore(BATCH_COPY_LIST_STORE_NAME).put(record)
    await completion

    return record
  }
}
