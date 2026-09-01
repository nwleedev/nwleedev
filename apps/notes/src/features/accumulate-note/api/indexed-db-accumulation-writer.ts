import {
  ACCUMULATOR_STORE_NAME,
  AccumulatedTextItemSchema,
  AccumulatorRecordSchema,
  PRIMARY_ACCUMULATOR_ID,
  parseAccumulatorRecord,
  type AccumulatedTextItem,
} from "@/entities/accumulator"
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

import type { AccumulationWriter } from "../model/accumulation-writer"

export class IndexedDbAccumulationWriter implements AccumulationWriter {
  readonly #connection: IndexedDbConnection
  readonly #identifiers: EntityIdGenerator

  constructor(
    connection: IndexedDbConnection,
    identifiers: EntityIdGenerator,
  ) {
    this.#connection = connection
    this.#identifiers = identifiers
  }

  async addAndRecordUsage(input: AccumulatedTextItem) {
    const item = AccumulatedTextItemSchema.parse(input)
    const usageIdentifier = this.#identifiers.create()
    const database = await this.#connection.get()
    const transaction = database.transaction(
      [ACCUMULATOR_STORE_NAME, USAGE_STORE_NAME],
      "readwrite",
    )
    const completion = waitForTransaction(transaction)

    try {
      const accumulatorStore = transaction.objectStore(
        ACCUMULATOR_STORE_NAME,
      )
      const usageStore = transaction.objectStore(USAGE_STORE_NAME)
      const [storedAccumulator, storedUsage]: [unknown, unknown] =
        await Promise.all([
          readRequest(accumulatorStore.get(PRIMARY_ACCUMULATOR_ID)),
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
      const currentAccumulator =
        storedAccumulator === undefined
          ? null
          : parseAccumulatorRecord(storedAccumulator)
      const currentUsage =
        storedUsage === undefined ? null : parseTextUsageRecord(storedUsage)

      const accumulator = AccumulatorRecordSchema.parse(
        currentAccumulator === null
          ? {
              content: { items: [item], separator: "\n" },
              id: PRIMARY_ACCUMULATOR_ID,
              revision: 0,
              updatedAt: item.addedAt,
            }
          : {
              ...currentAccumulator,
              content: {
                ...currentAccumulator.content,
                items: [...currentAccumulator.content.items, item],
              },
              revision: currentAccumulator.revision + 1,
              updatedAt: item.addedAt,
            },
      )
      const usage = TextUsageRecordSchema.parse(
        currentUsage === null
          ? {
              counts: { accumulation: 1, ordinaryCopy: 0 },
              id: usageIdentifier,
              note: item.sourceNote,
              textSnapshot: item.textSnapshot,
              updatedAt: item.addedAt,
            }
          : {
              ...currentUsage,
              counts: {
                ...currentUsage.counts,
                accumulation: currentUsage.counts.accumulation + 1,
              },
              updatedAt: item.addedAt,
            },
      )

      accumulatorStore.put(accumulator)
      usageStore.put(usage)
      await completion
      return accumulator
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }
}
