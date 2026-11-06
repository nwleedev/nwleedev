import { applyUpdate, Doc } from "yjs"
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
  tabIndex: number
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
  type StoredFields = Omit<StoredNoteObservation, "content" | "geometryX">
  type BodyObservation = StoredFields & { body: number[]; updates: number[][] }
  const stored = await page.evaluate((id) => new Promise<BodyObservation | null>((resolve, reject) => {
    const open = indexedDB.open("personal-notes")
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const database = open.result
      const transaction = database.transaction(["notes", "updates"])
      const note = transaction.objectStore("notes").get(id)
      const updates = transaction.objectStore("updates").index("noteId").getAll(id)
      transaction.onabort = () => {
        database.close()
        reject(transaction.error)
      }
      transaction.oncomplete = () => {
        database.close()
        const value = note.result as (StoredFields & { body: Uint8Array }) | undefined
        if (!value) {
          resolve(null)
          return
        }
        resolve({
          body: Array.from(value.body),
          contentRevision: value.contentRevision,
          geometry: value.geometry,
          revision: value.revision,
          tabIndex: value.tabIndex,
          updates: updates.result.map(({ payload }) => Array.from(payload as Uint8Array)),
        })
      }
    }
  }), noteId)
  if (!stored) return null
  const { body, updates, ...fields } = stored
  const document = new Doc()
  applyUpdate(document, Uint8Array.from(body))
  for (const update of updates) applyUpdate(document, Uint8Array.from(update))
  return { ...fields, content: document.getText("body").toString(), geometryX: fields.geometry.x }
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
