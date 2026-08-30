import {
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db"

import {
  parseTemplateRecord,
  type TemplateRepository,
  type TextTemplate,
} from "../model/templateRecord"

export const TEMPLATE_STORE_NAME = "templates"

export class IndexedDbTemplateRepository implements TemplateRepository {
  readonly #connection: IndexedDbConnection

  constructor(connection: IndexedDbConnection) {
    this.#connection = connection
  }

  async getAll() {
    const database = await this.#connection.get()
    const transaction = database.transaction(TEMPLATE_STORE_NAME, "readonly")
    const completion = waitForTransaction(transaction)
    const records: unknown[] = await readRequest(
      transaction.objectStore(TEMPLATE_STORE_NAME).getAll(),
    )
    await completion

    return records.map(parseTemplateRecord)
  }

  async save(template: TextTemplate) {
    const record = parseTemplateRecord(template)
    const database = await this.#connection.get()
    const transaction = database.transaction(TEMPLATE_STORE_NAME, "readwrite")
    const completion = waitForTransaction(transaction)
    transaction.objectStore(TEMPLATE_STORE_NAME).put(record)
    await completion

    return record
  }

  async remove(id: string) {
    const database = await this.#connection.get()
    const transaction = database.transaction(TEMPLATE_STORE_NAME, "readwrite")
    const completion = waitForTransaction(transaction)
    transaction.objectStore(TEMPLATE_STORE_NAME).delete(id)
    await completion
  }
}
