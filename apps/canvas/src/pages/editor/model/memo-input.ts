import { createMemoText, type MemoUpdate } from "@/entities/project"

import { memoSave } from "./memo-save"

const idleDelay = 500

function changedRange(before: string, after: string) {
  const previous = Array.from(before)
  const current = Array.from(after)
  let start = 0
  while (start < previous.length && previous[start] === current[start]) start++

  let end = 0
  while (end < Math.min(previous.length, current.length) - start &&
    previous[previous.length - end - 1] === current[current.length - end - 1]) end++

  return {
    index: previous.slice(0, start).join("").length,
    length: previous.slice(start, previous.length - end).join("").length,
    value: current.slice(start, current.length - end).join(""),
  }
}

export function bindMemoInput(
  input: HTMLTextAreaElement,
  memoId: string,
  save: (update: MemoUpdate) => Promise<void>,
  reportFailure: (failed: boolean) => void,
) {
  const text = createMemoText()
  const writer = memoSave(memoId, text.takeUpdate, save)
  const merged = new Set<string>()
  let composing = false
  let deferred: readonly MemoUpdate[] = []
  let timeout: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  async function persist() {
    if (composing) return
    try {
      await writer.flush()
      if (!disposed) reportFailure(false)
    } catch {
      if (!disposed) reportFailure(true)
    }
  }

  function merge(updates: readonly MemoUpdate[]) {
    if (composing) {
      deferred = updates
      return
    }
    const incoming = updates.filter(({ updateId }) => !merged.has(updateId))
    if (!incoming.length) return
    const start = text.anchor(input.selectionStart)
    const end = text.anchor(input.selectionEnd)
    const direction = input.selectionDirection
    text.merge(incoming.map(({ payload }) => payload))
    for (const { updateId } of incoming) merged.add(updateId)
    const next = text.read()
    if (input.value === next) return
    input.value = next
    input.setSelectionRange(text.resolve(start) ?? 0, text.resolve(end) ?? 0, direction)
  }

  function scheduleSave() {
    clearTimeout(timeout)
    timeout = setTimeout(() => void persist(), idleDelay)
  }

  function accept() {
    const previous = text.read()
    if (composing || input.value === previous) return
    const { index, length, value } = changedRange(previous, input.value)
    text.replace(index, length, value)
    scheduleSave()
  }

  function startComposition() {
    composing = true
    clearTimeout(timeout)
  }

  function endComposition() {
    composing = false
    accept()
    merge(deferred)
    deferred = []
    if (text.hasPending() || writer.hasPending()) scheduleSave()
  }

  input.addEventListener("input", accept)
  input.addEventListener("compositionstart", startComposition)
  input.addEventListener("compositionend", endComposition)

  return {
    merge,
    persist,
    flush() {
      if (composing) return Promise.reject(new Error("Memo composition is active"))
      clearTimeout(timeout)
      return writer.flush()
    },
    unsaved() {
      if (text.hasPending() || writer.hasPending() || input.value !== text.read()) return input.value
      return undefined
    },
    dispose() {
      disposed = true
      clearTimeout(timeout)
      input.removeEventListener("input", accept)
      input.removeEventListener("compositionstart", startComposition)
      input.removeEventListener("compositionend", endComposition)
      void writer.flush().finally(text.destroy).catch(() => undefined)
    },
  }
}
