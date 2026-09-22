import type { NoteStorageMonitor } from "@/_pages/notes/composition"
import type { IndexedDbConnection } from "@/shared/lib/indexed-db"

import { openPersonalNotesDatabase } from "./open-personal-notes-database"

export class DatabaseConnectionClosedError extends Error {
  constructor() {
    super("Database connection was closed before opening completed")
    this.name = "DatabaseConnectionClosedError"
  }
}

export class PersonalNotesDatabase
  implements IndexedDbConnection, NoteStorageMonitor
{
  readonly #listeners = new Set<
    (event: "blocked" | "version-changed") => void
  >()
  #database: IDBDatabase | null = null
  #generation = 0
  #opening: Promise<IDBDatabase> | null = null

  get() {
    if (this.#database !== null) {
      return Promise.resolve(this.#database)
    }

    if (this.#opening !== null) {
      return this.#opening
    }

    const generation = this.#generation
    const opening = openPersonalNotesDatabase({
      onBlocked: () => {
        if (generation === this.#generation) {
          this.#emit("blocked")
        }
      },
      onVersionChange: () => {
        if (generation !== this.#generation) {
          return
        }

        this.#generation += 1
        this.#database = null
        this.#opening = null
        this.#emit("version-changed")
      },
    })
      .then((database) => {
        if (generation !== this.#generation) {
          database.close()
          throw new DatabaseConnectionClosedError()
        }

        this.#database = database
        this.#opening = null
        return database
      })
      .catch((error: unknown) => {
        if (generation === this.#generation) {
          this.#opening = null
        }

        throw error
      })

    this.#opening = opening
    return opening
  }

  subscribe(listener: (event: "blocked" | "version-changed") => void) {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  close() {
    this.#generation += 1
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
