import {
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db"

import {
  parseInteractionPreferencesRecord,
  type InteractionPreferences,
  type InteractionPreferencesRepository,
} from "../model/interaction-preferences-record"

export const PREFERENCE_STORE_NAME = "preferences"
const INTERACTION_PREFERENCE_KEY = "interaction"

export class IndexedDbInteractionPreferencesRepository
  implements InteractionPreferencesRepository
{
  readonly #connection: IndexedDbConnection

  constructor(connection: IndexedDbConnection) {
    this.#connection = connection
  }

  async get() {
    const database = await this.#connection.get()
    const transaction = database.transaction(PREFERENCE_STORE_NAME, "readonly")
    const completion = waitForTransaction(transaction)
    const record: unknown = await readRequest(
      transaction
        .objectStore(PREFERENCE_STORE_NAME)
        .get(INTERACTION_PREFERENCE_KEY),
    )
    await completion

    return record === undefined
      ? null
      : parseInteractionPreferencesRecord(record)
  }

  async save(preferences: InteractionPreferences) {
    const record = parseInteractionPreferencesRecord(preferences)
    const database = await this.#connection.get()
    const transaction = database.transaction(
      PREFERENCE_STORE_NAME,
      "readwrite",
    )
    const completion = waitForTransaction(transaction)
    transaction
      .objectStore(PREFERENCE_STORE_NAME)
      .put(record, INTERACTION_PREFERENCE_KEY)
    await completion

    return record
  }
}
