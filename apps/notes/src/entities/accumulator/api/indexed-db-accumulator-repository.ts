import {
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db"

import {
  parseAccumulatorRecord,
  type Accumulator,
  type AccumulatorRepository,
} from "../model/accumulator-record"

export const ACCUMULATOR_STORE_NAME = "accumulators"
export const PRIMARY_ACCUMULATOR_ID = "primary"

export class IndexedDbAccumulatorRepository
  implements AccumulatorRepository
{
  readonly #connection: IndexedDbConnection

  constructor(connection: IndexedDbConnection) {
    this.#connection = connection
  }

  async get() {
    const database = await this.#connection.get()
    const transaction = database.transaction(
      ACCUMULATOR_STORE_NAME,
      "readonly",
    )
    const completion = waitForTransaction(transaction)
    const record: unknown = await readRequest(
      transaction
        .objectStore(ACCUMULATOR_STORE_NAME)
        .get(PRIMARY_ACCUMULATOR_ID),
    )
    await completion

    return record === undefined ? null : parseAccumulatorRecord(record)
  }

  async save(accumulator: Accumulator) {
    const record = parseAccumulatorRecord(accumulator)
    const database = await this.#connection.get()
    const transaction = database.transaction(
      ACCUMULATOR_STORE_NAME,
      "readwrite",
    )
    const completion = waitForTransaction(transaction)
    transaction.objectStore(ACCUMULATOR_STORE_NAME).put(record)
    await completion

    return record
  }
}
