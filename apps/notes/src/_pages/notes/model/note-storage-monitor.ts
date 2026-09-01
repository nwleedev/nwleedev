export type NoteStorageEvent = "blocked" | "version-changed"

export interface NoteStorageMonitor {
  subscribe(listener: (event: NoteStorageEvent) => void): () => void
}
