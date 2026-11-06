import type { NoteContentReference } from "@/entities/note/@x/usage"
import type { EntityIdGenerator } from "@/shared/lib/id-generation"
import {
  abortTransaction,
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db/index.browser"

import {
  TextUsageRecordSchema,
  type IndividualCopyUsageWriter,
  type TextUsageReader,
} from "../model/text-usage-record"

export const USAGE_STORE_NAME = "usage"
export const USAGE_BY_NOTE_CONTENT_INDEX = "by-note-content"

type UsageInput = {
  note: NoteContentReference
  textSnapshot: string
}

export async function countTextCopy(
  store: IDBObjectStore,
  kind: "individualCopy" | "batchCopy",
  input: UsageInput & { id: string; updatedAt: number },
) {
  const key = [input.note.id, input.note.contentRevision, input.textSnapshot]
  const value: unknown = await readRequest(store.index(USAGE_BY_NOTE_CONTENT_INDEX).get(key))
  const previous = value === undefined ? null : TextUsageRecordSchema.parse(value)
  const counts = previous?.counts ?? { batchCopy: 0, individualCopy: 0 }
  const record = {
    ...input,
    id: previous?.id ?? input.id,
    counts: { ...counts, [kind]: counts[kind] + 1 },
  }
  store.put(TextUsageRecordSchema.parse(record))
}

export class IndexedDbUsageRepository
  implements TextUsageReader, IndividualCopyUsageWriter
{
  readonly #connection: IndexedDbConnection
  readonly #identifiers: EntityIdGenerator
  readonly #now: () => number

  constructor(
    connection: IndexedDbConnection,
    identifiers: EntityIdGenerator,
    now: () => number,
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

    return records.map((value) => TextUsageRecordSchema.parse(value))
  }

  async recordIndividualCopy(input: UsageInput) {
    const newIdentifier = this.#identifiers.create()
    const updatedAt = this.#now()
    const database = await this.#connection.get()
    const transaction = database.transaction(USAGE_STORE_NAME, "readwrite")
    const completion = waitForTransaction(transaction)

    try {
      const store = transaction.objectStore(USAGE_STORE_NAME)
      await countTextCopy(store, "individualCopy", { ...input, id: newIdentifier, updatedAt })
      await completion
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }
}
