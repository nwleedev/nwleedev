import * as Y from "yjs"

const bodyName = "body"

export function createMemoText(updates: Iterable<Uint8Array> = []) {
  const doc = new Y.Doc()
  const body = doc.getText(bodyName)
  const local = Symbol()
  let pending: Uint8Array[] = []

  doc.on("update", (payload: Uint8Array, origin: unknown) => {
    if (origin === local) pending.push(payload)
  })

  function merge(payloads: Iterable<Uint8Array>) {
    for (const payload of payloads) Y.applyUpdate(doc, payload)
  }
  merge(updates)

  return {
    read: () => body.toString(),
    hasPending: () => pending.length > 0,
    merge,
    replace(index: number, length: number, value: string) {
      doc.transact(() => {
        if (length > 0) body.delete(index, length)
        if (value.length > 0) body.insert(index, value)
      }, local)
    },
    takeUpdate() {
      if (!pending.length) return undefined
      const payload = Y.mergeUpdates(pending)
      pending = []
      return payload
    },
    anchor: (index: number) => Y.createRelativePositionFromTypeIndex(body, index),
    resolve(position: Y.RelativePosition) {
      const absolute = Y.createAbsolutePositionFromRelativePosition(position, doc)
      return absolute?.index
    },
    destroy: () => doc.destroy(),
  }
}

export function readMemoBodies(updates: Iterable<{ memoId: string; payload: Uint8Array }>) {
  const groups = new Map<string, Uint8Array[]>()
  for (const { memoId, payload } of updates) {
    const group = groups.get(memoId)
    if (group) group.push(payload)
    else groups.set(memoId, [payload])
  }

  const bodies = new Map<string, string>()
  for (const [memoId, payloads] of groups) {
    const text = createMemoText(payloads)
    try {
      bodies.set(memoId, text.read())
    } finally {
      text.destroy()
    }
  }
  return bodies
}
