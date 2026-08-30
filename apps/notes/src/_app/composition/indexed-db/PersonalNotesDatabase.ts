import type { NoteStorageMonitor } from "@/_pages/notes/composition"
import type { IndexedDbConnection } from "@/shared/lib/indexed-db"

import { openPersonalNotesDatabase } from "./openPersonalNotesDatabase"

export class PersonalNotesDatabase
  implements IndexedDbConnection, NoteStorageMonitor
{
  readonly #listeners = new Set<
    (event: "blocked" | "version-changed") => void
  >()
  #database: IDBDatabase | null = null
  #opening: Promise<IDBDatabase> | null = null

  get() {
    if (this.#database !== null) {
      return Promise.resolve(this.#database)
    }

    if (this.#opening !== null) {
      return this.#opening
    }

    this.#opening = openPersonalNotesDatabase({
      onBlocked: () => this.#emit("blocked"),
      onVersionChange: () => {
        this.#database = null
        this.#opening = null
        this.#emit("version-changed")
      },
    })
      .then((database) => {
        this.#database = database
        this.#opening = null
        return database
      })
      .catch((error: unknown) => {
        this.#opening = null
        throw error
      })

    return this.#opening
  }

  subscribe(listener: (event: "blocked" | "version-changed") => void) {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  close() {
    this.#database?.close()
    this.#database = null
    this.#opening = null
  }

  #emit(event: "blocked" | "version-changed") {
    for (const listener of this.#listeners) {
      listener(event)
    }
  }
}
