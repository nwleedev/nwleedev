export interface IndexedDbConnection {
  get(): Promise<IDBDatabase>
}

export class DatabaseUpgradeBlockedError extends Error {
  constructor() {
    super("A previous database connection is blocking the upgrade")
    this.name = "DatabaseUpgradeBlockedError"
  }
}

type OpenIndexedDatabaseOptions = {
  name: string
  onBlocked?(): void
  onVersionChange?(): void
  upgrade(
    database: IDBDatabase,
    transaction: IDBTransaction,
    oldVersion: number,
  ): void
  version: number
}

export function openIndexedDatabase({
  name,
  onBlocked,
  onVersionChange,
  upgrade,
  version,
}: OpenIndexedDatabaseOptions) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = globalThis.indexedDB.open(name, version)
    let settled = false

    request.onblocked = () => {
      onBlocked?.()

      if (!settled) {
        settled = true
        reject(new DatabaseUpgradeBlockedError())
      }
    }

    request.onerror = () => {
      if (!settled) {
        settled = true
        reject(request.error ?? new Error("Database could not be opened"))
      }
    }

    request.onupgradeneeded = (event) => {
      const transaction = request.transaction

      if (transaction === null) {
        if (!settled) {
          settled = true
          reject(new Error("Database upgrade transaction is unavailable"))
        }

        return
      }

      try {
        upgrade(request.result, transaction, event.oldVersion)
      } catch (error) {
        transaction.abort()

        if (!settled) {
          settled = true
          reject(error)
        }
      }
    }

    request.onsuccess = () => {
      const database = request.result

      if (settled) {
        database.close()
        return
      }

      settled = true
      database.onversionchange = () => {
        database.close()
        onVersionChange?.()
      }
      resolve(database)
    }
  })
}

export function readRequest<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error("Database request failed"))
  })
}

export function waitForTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Database transaction aborted"))
    transaction.onerror = () => undefined
  })
}

export async function abortTransaction(
  transaction: IDBTransaction,
  completion: Promise<void>,
) {
  try {
    transaction.abort()
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "InvalidStateError")) {
      throw error
    }
  }

  try {
    await completion
  } catch {
    return
  }
}
