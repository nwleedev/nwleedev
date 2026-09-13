import type { Page } from "@playwright/test"

export type StoredNoteObservation = {
  content: string
  contentRevision: number
  geometryX: number
  revision: number
}

export async function readStoredNote(
  page: Page,
  noteId: string,
): Promise<StoredNoteObservation | null> {
  return page.evaluate(
    ({ databaseName, id, storeName }) =>
      new Promise<StoredNoteObservation | null>((resolve, reject) => {
        const openRequest = indexedDB.open(databaseName)
        openRequest.onerror = () => reject(openRequest.error)
        openRequest.onsuccess = () => {
          const database = openRequest.result
          const request = database
            .transaction(storeName, "readonly")
            .objectStore(storeName)
            .get(id)
          request.onerror = () => {
            database.close()
            reject(request.error)
          }
          request.onsuccess = () => {
            const note = request.result as
              | {
                  content: string
                  contentRevision: number
                  geometry: { x: number }
                  revision: number
                }
              | undefined
            database.close()
            resolve(
              note === undefined
                ? null
                : {
                    content: note.content,
                    contentRevision: note.contentRevision,
                    geometryX: note.geometry.x,
                    revision: note.revision,
                  },
            )
          }
        }
      }),
    { databaseName: "personal-notes", id: noteId, storeName: "notes" },
  )
}
