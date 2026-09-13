import type { Page } from "@playwright/test"

export type StoredNoteObservation = {
  content: string
  contentRevision: number
  geometry: {
    height: number
    width: number
    x: number
    y: number
    zIndex: number
  }
  geometryX: number
  revision: number
}

export type StoredNoteDraftObservation = {
  content: string
  note: {
    contentRevision: number
    id: string
  }
  updatedAt: string
}

export function noteIdFromHref(href: string | null) {
  const match = href?.match(/^\/notes\/([^/]+)\/$/u)
  if (match?.[1] === undefined) {
    throw new Error("Expected a mobile note link")
  }

  return decodeURIComponent(match[1])
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
                  geometry: {
                    height: number
                    width: number
                    x: number
                    y: number
                    zIndex: number
                  }
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
                    geometry: note.geometry,
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

export async function readStoredNoteDraft(
  page: Page,
  noteId: string,
): Promise<StoredNoteDraftObservation | null> {
  return page.evaluate(
    ({ databaseName, id, storeName }) =>
      new Promise<StoredNoteDraftObservation | null>((resolve, reject) => {
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
            const draft = request.result as
              | StoredNoteDraftObservation
              | undefined
            database.close()
            resolve(draft ?? null)
          }
        }
      }),
    { databaseName: "personal-notes", id: noteId, storeName: "noteDrafts" },
  )
}

export async function writeStoredNoteDraft(
  page: Page,
  draft: StoredNoteDraftObservation,
) {
  await page.evaluate(
    ({ databaseName, record, storeName }) =>
      new Promise<void>((resolve, reject) => {
        const openRequest = indexedDB.open(databaseName)
        openRequest.onerror = () => reject(openRequest.error)
        openRequest.onsuccess = () => {
          const database = openRequest.result
          const transaction = database.transaction(storeName, "readwrite")
          transaction.onabort = () => {
            database.close()
            reject(transaction.error)
          }
          transaction.onerror = () => reject(transaction.error)
          transaction.oncomplete = () => {
            database.close()
            resolve()
          }
          transaction.objectStore(storeName).put(record)
        }
      }),
    {
      databaseName: "personal-notes",
      record: draft,
      storeName: "noteDrafts",
    },
  )
}
