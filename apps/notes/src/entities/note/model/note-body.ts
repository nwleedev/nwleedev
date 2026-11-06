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

  updateText(value: string) {
    const original = this.text
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
    return this.replace(start, original.length - trailingLength, value.slice(start, value.length - trailingLength))
  }

  receive(update: Uint8Array) {
    applyUpdate(this.#document, update)
  }

  snapshot() {
    return encodeStateAsUpdate(this.#document)
  }
}
