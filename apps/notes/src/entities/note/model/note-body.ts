import { applyUpdate, createAbsolutePositionFromRelativePosition, createRelativePositionFromTypeIndex, Doc, encodeStateAsUpdate, encodeStateVector } from "yjs"

import type { Note } from "./note"

type StoredBody = { bytes: Uint8Array; restoration?: string }
const snapshots = new WeakMap<Note, StoredBody>()

export function rememberNoteBody(note: Note, snapshot: StoredBody) {
  snapshots.set(note, snapshot)
}

export function savedNoteBody(note: Note) {
  return snapshots.get(note)
}

export function openNoteBody(note: Note) {
  const snapshot = snapshots.get(note)
  return snapshot ? new NoteBody(snapshot.bytes) : null
}

export function changedNoteText(original: string, value: string) {
  const before = Array.from(original)
  const after = Array.from(value)
  const limit = Math.min(before.length, after.length)
  let prefix = 0
  let start = 0
  while (prefix < limit && before[prefix] === after[prefix]) {
    start += before[prefix].length
    prefix += 1
  }
  let suffix = 0
  let trailingLength = 0
  while (suffix < limit - prefix && before.at(-1 - suffix) === after.at(-1 - suffix)) {
    trailingLength += before[before.length - suffix - 1].length
    suffix += 1
  }
  return {
    start,
    removed: original.slice(start, original.length - trailingLength),
    inserted: value.slice(start, value.length - trailingLength),
  }
}

export class NoteBody {
  readonly #document = new Doc()
  readonly #text = this.#document.getText("body")

  constructor(snapshot?: Uint8Array) {
    if (snapshot) this.receive(snapshot)
  }

  static fromText(value: string) {
    const body = new NoteBody()
    body.#text.insert(0, value)
    return body
  }

  static restore(value: string) {
    const body = NoteBody.fromText(value)
    body.#document.getMap("metadata").set("restoration", crypto.randomUUID())
    return body
  }

  get restoration() {
    return this.#document.getMap<string>("metadata").get("restoration")
  }

  get text() {
    return this.#text.toString()
  }

  replace(start: number, end: number, insertion: string) {
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)
      || start < 0 || start > end || end > this.#text.length) {
      throw new RangeError("Invalid note selection")
    }

    const before = encodeStateVector(this.#document)
    this.#document.transact(() => {
      if (end > start) this.#text.delete(start, end - start)
      if (insertion.length > 0) this.#text.insert(start, insertion)
    })
    return encodeStateAsUpdate(this.#document, before)
  }

  updateText(value: string) {
    const change = changedNoteText(this.text, value)
    return this.replace(change.start, change.start + change.removed.length, change.inserted)
  }

  selectionIn(next: NoteBody, start: number, end: number) {
    const translate = (index: number) => {
      const relative = createRelativePositionFromTypeIndex(this.#text, index)
      return createAbsolutePositionFromRelativePosition(relative, next.#document)?.index ?? index
    }
    const first = translate(start)
    return { start: first, end: end === start ? first : translate(end) }
  }

  receive(update: Uint8Array) {
    applyUpdate(this.#document, update)
  }

  snapshot() {
    return encodeStateAsUpdate(this.#document)
  }
}
