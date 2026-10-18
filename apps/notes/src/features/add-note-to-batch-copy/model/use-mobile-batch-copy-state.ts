import { createContext, useContext, useRef, useState } from "react"

import type { MobileBatchCopyDraft } from "@/entities/batch-copy"
import type { Note } from "@/entities/note"
import type { ClipboardWriter } from "@/shared/lib/clipboard"

import { copyMobileBatchText, type CopyMobileBatchTextResult } from "./copy-mobile-batch-text"
import type { MobileBatchCopyUsageWriter } from "./mobile-batch-copy-usage-writer"
import {
  addNoteToMobileBatchCopy,
  duplicateMobileBatchCopySessionEntry,
  moveMobileBatchCopySessionEntry,
  removeMobileBatchCopySessionEntry,
  resetMobileBatchCopySession,
  type AddMobileBatchCopyResult,
} from "./mobile-batch-copy-session"

type MobileBatchCopyContextValue = {
  draft: MobileBatchCopyDraft | null
  pending: boolean
  reorderButtonsEnabled: boolean
  add(note: Note): Promise<AddMobileBatchCopyResult>
  cancel(): Promise<void>
  copy(): Promise<CopyMobileBatchTextResult>
  duplicate(entryId: string): Promise<boolean>
  flush(): Promise<boolean>
  move(entryId: string, index: number): Promise<boolean>
  removeEntry(entryId: string): Promise<boolean>
  reset(): Promise<boolean>
}

export type MobileBatchCopyDependencies = {
  clipboard: ClipboardWriter
  createId(): string
  now(): string
  reorderButtonsEnabled: boolean
  writer: MobileBatchCopyUsageWriter
}

export const MobileBatchCopyContext = createContext<MobileBatchCopyContextValue | null>(null)

export function useMobileBatchCopyState({ clipboard, createId, now, reorderButtonsEnabled, writer }: MobileBatchCopyDependencies) {
  const [draft, setDraft] = useState<MobileBatchCopyDraft | null>(null)
  const [pending, setPending] = useState(false)
  const current = useRef<MobileBatchCopyDraft | null>(null)
  const activeOperations = useRef(0)
  const queue = useRef<Promise<void>>(Promise.resolve())

  function publish(next: MobileBatchCopyDraft | null) {
    current.current = next
    setDraft(next)
  }

  function enqueue<Result>(operation: () => Promise<Result>, blocksActions = true) {
    if (blocksActions) {
      activeOperations.current += 1
      setPending(true)
    }
    const result = queue.current.then(operation)
    queue.current = result.then(() => undefined, () => undefined)
    return result.finally(() => {
      if (!blocksActions) return
      activeOperations.current -= 1
      if (activeOperations.current === 0) setPending(false)
    })
  }

  function add(note: Note) {
    return enqueue(async () => {
      const result = await addNoteToMobileBatchCopy({ createId, now, writer }, current.current, note)
      if (result.status === "added") publish(result.draft)
      return result
    }, false)
  }

  function edit(operation: (draft: MobileBatchCopyDraft) => MobileBatchCopyDraft) {
    return enqueue(async () => {
      const latest = current.current
      if (latest === null) return false
      publish(operation(latest))
      return true
    })
  }

  function reset() {
    return edit((latest) => resetMobileBatchCopySession(latest, now))
  }

  function move(entryId: string, index: number) {
    return edit((latest) => moveMobileBatchCopySessionEntry(latest, entryId, index, now))
  }

  function duplicate(entryId: string) {
    return edit((latest) => duplicateMobileBatchCopySessionEntry({ createId, now }, latest, entryId))
  }

  function removeEntry(entryId: string) {
    return edit((latest) => removeMobileBatchCopySessionEntry(latest, entryId, now))
  }

  async function flush() {
    await queue.current
    return (current.current?.entries.length ?? 0) > 0
  }

  function copy() {
    const latest = current.current
    if (latest === null) return Promise.resolve({ reason: "write-failed", status: "clipboard-failure" } as const)
    return copyMobileBatchText(clipboard, latest)
  }

  function cancel() {
    return enqueue(async () => publish(null))
  }

  return { add, cancel, copy, draft, duplicate, flush, move, pending, removeEntry, reorderButtonsEnabled, reset }
}

export function useMobileBatchCopy() {
  const context = useContext(MobileBatchCopyContext)
  if (context === null) throw new Error("useMobileBatchCopy must be used within MobileBatchCopyProvider")
  return context
}
