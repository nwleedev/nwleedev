import {
  abortTransaction,
  readRequest,
  waitForTransaction,
  type IndexedDbConnection,
} from "@/shared/lib/indexed-db"

import { parseNoteRecord } from "../model/note"
import {
  MobileNoteOrderSchema,
  moveMobileNoteId,
  reconcileMobileNoteIds,
  type MobileNoteOrder,
  type MoveMobileNoteInput,
  type MoveMobileNoteResult,
} from "../model/mobile-note-order"

export const MOBILE_NOTE_ORDER_STORE_NAME = "mobileNoteOrder"
const ORDER_KEY = "current"

export async function readMobileNoteOrder(transaction: IDBTransaction): Promise<MobileNoteOrder> {
  const records: unknown[] = await readRequest(transaction.objectStore("notes").getAll())
  const stored: unknown = await readRequest(transaction.objectStore(MOBILE_NOTE_ORDER_STORE_NAME).get(ORDER_KEY))
  const notes = records.map(parseNoteRecord).sort((left, right) => left.tabIndex - right.tabIndex)
  const order = stored === undefined ? { ids: [], revision: 0 } : MobileNoteOrderSchema.parse(stored)
  return { ...order, ids: reconcileMobileNoteIds(order.ids, notes.map(({ id }) => id)) }
}

export function writeMobileNoteOrder(transaction: IDBTransaction, order: MobileNoteOrder, ids: string[]) {
  const changed = ids.some((id, index) => order.ids[index] !== id)
  if (!changed && ids.length === order.ids.length) return order
  const next = MobileNoteOrderSchema.parse({ ids, revision: order.revision + 1 })
  transaction.objectStore(MOBILE_NOTE_ORDER_STORE_NAME).put(next, ORDER_KEY)
  return next
}

export class IndexedDbMobileNoteOrderRepository {
  readonly #connection: IndexedDbConnection

  constructor(connection: IndexedDbConnection) {
    this.#connection = connection
  }

  async read() {
    const database = await this.#connection.get()
    const transaction = database.transaction(["notes", MOBILE_NOTE_ORDER_STORE_NAME], "readonly")
    const completion = waitForTransaction(transaction)
    try {
      const order = await readMobileNoteOrder(transaction)
      await completion
      return order
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }

  async move(input: MoveMobileNoteInput): Promise<MoveMobileNoteResult> {
    const database = await this.#connection.get()
    const transaction = database.transaction(["notes", MOBILE_NOTE_ORDER_STORE_NAME], "readwrite")
    const completion = waitForTransaction(transaction)
    try {
      const order = await readMobileNoteOrder(transaction)
      if (order.revision !== input.expectedRevision) {
        await completion
        return { order, status: "conflict" }
      }
      const ids = moveMobileNoteId(order.ids, input.noteId, input.targetIndex)
      const saved = writeMobileNoteOrder(transaction, order, ids)
      await completion
      return { order: saved, status: "saved" }
    } catch (error) {
      await abortTransaction(transaction, completion)
      throw error
    }
  }
}
