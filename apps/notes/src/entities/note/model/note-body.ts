import { applyUpdate, Doc, encodeStateAsUpdate, encodeStateVector } from "yjs"

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

  receive(update: Uint8Array) {
    applyUpdate(this.#document, update)
  }

  snapshot() {
    return encodeStateAsUpdate(this.#document)
  }
}
