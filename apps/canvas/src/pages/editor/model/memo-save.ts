import type { MemoUpdate } from "@/entities/project"

type Save = (update: MemoUpdate) => Promise<void>

export function memoSave(memoId: string, takeUpdate: () => Uint8Array | undefined, save: Save) {
  let queued: MemoUpdate | undefined
  let inFlight: Promise<void> | undefined

  async function drain() {
    for (;;) {
      if (!queued) {
        const payload = takeUpdate()
        if (!payload) return
        queued = { memoId, updateId: crypto.randomUUID(), payload }
      }

      await save(queued)
      queued = undefined
    }
  }

  return function flush() {
    inFlight ??= drain().finally(() => {
      inFlight = undefined
    })
    return inFlight
  }
}
