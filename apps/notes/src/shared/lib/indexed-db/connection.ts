export interface IndexedDbConnection {
  get(): Promise<IDBDatabase>
}

export type IndexedDbEvent = "blocked" | "version-changed"

export interface IndexedDbMonitor {
  subscribe(listener: (event: IndexedDbEvent) => void): () => void
}
