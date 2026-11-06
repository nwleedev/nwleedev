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
