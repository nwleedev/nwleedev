import {
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db"

import {
  parseMobileBatchCopyDraft,
  type MobileBatchCopyDraft,
  type MobileBatchCopyDraftRepository,
} from "../model/mobile-batch-copy-draft"

export const MOBILE_BATCH_COPY_DRAFT_STORE_NAME = "mobileBatchCopyDrafts"
export const ACTIVE_MOBILE_BATCH_COPY_DRAFT_KEY = "active"

export class IndexedDbMobileBatchCopyDraftRepository
  implements MobileBatchCopyDraftRepository
{
  readonly #connection: IndexedDbConnection

  constructor(connection: IndexedDbConnection) {
    this.#connection = connection
  }

  async get() {
    const database = await this.#connection.get()
    const transaction = database.transaction(
      MOBILE_BATCH_COPY_DRAFT_STORE_NAME,
      "readonly",
    )
    const completion = waitForTransaction(transaction)
    const stored: unknown = await readRequest(
      transaction
        .objectStore(MOBILE_BATCH_COPY_DRAFT_STORE_NAME)
        .get(ACTIVE_MOBILE_BATCH_COPY_DRAFT_KEY),
    )
    await completion

    return stored === undefined ? null : parseMobileBatchCopyDraft(stored)
  }

  async save(draft: MobileBatchCopyDraft) {
    const record = parseMobileBatchCopyDraft(draft)
    const database = await this.#connection.get()
    const transaction = database.transaction(
      MOBILE_BATCH_COPY_DRAFT_STORE_NAME,
      "readwrite",
    )
    const completion = waitForTransaction(transaction)
    transaction
      .objectStore(MOBILE_BATCH_COPY_DRAFT_STORE_NAME)
      .put(record, ACTIVE_MOBILE_BATCH_COPY_DRAFT_KEY)
    await completion
    return record
  }

  async remove() {
    const database = await this.#connection.get()
    const transaction = database.transaction(
      MOBILE_BATCH_COPY_DRAFT_STORE_NAME,
      "readwrite",
    )
    const completion = waitForTransaction(transaction)
    transaction
      .objectStore(MOBILE_BATCH_COPY_DRAFT_STORE_NAME)
      .delete(ACTIVE_MOBILE_BATCH_COPY_DRAFT_KEY)
    await completion
  }
}
