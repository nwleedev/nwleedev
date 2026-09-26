import { createContext, useContext, useRef, useState } from "react"

import type {
  CollectingMobileBatchCopyDraft,
  ConfirmingMobileBatchCopyDraft,
  MobileBatchCopyDraft,
} from "@/entities/batch-copy"
import type { Note } from "@/entities/note"
import type { ClipboardWriter } from "@/shared/lib/clipboard"

import {
  copyMobileBatchText,
  type CopyMobileBatchTextResult,
} from "./copy-mobile-batch-text"
import type { MobileBatchCopyUsageWriter } from "./mobile-batch-copy-usage-writer"
import {
  addNoteToMobileBatchCopy,
  confirmMobileBatchCopySession,
  duplicateMobileBatchCopySessionEntry,
  moveMobileBatchCopySessionEntry,
  removeMobileBatchCopySessionEntry,
  resetMobileBatchCopySession,
  resumeMobileBatchCopySession,
  startMobileBatchCopy,
  type AddMobileBatchCopyResult,
} from "./mobile-batch-copy-session"

type MobileBatchCopyState = {
  collectionVisible: boolean
  draft: MobileBatchCopyDraft | null
}

type MobileBatchCopyContextValue = MobileBatchCopyState & {
  pending: boolean
  reorderButtonsEnabled: boolean
  add(note: Note): Promise<AddMobileBatchCopyResult>
  cancel(): Promise<void>
  confirm(): Promise<boolean>
  copy(): Promise<CopyMobileBatchTextResult>
  duplicate(entryId: string): Promise<boolean>
  move(entryId: string, index: number): Promise<boolean>
  removeEntry(entryId: string): Promise<boolean>
  reset(): Promise<boolean>
  resumeCollection(): Promise<boolean>
  start(): Promise<void>
}

export type MobileBatchCopyDependencies = {
  clipboard: ClipboardWriter
  createId(): string
  now(): string
  reorderButtonsEnabled: boolean
  writer: MobileBatchCopyUsageWriter
}

export const MobileBatchCopyContext =
  createContext<MobileBatchCopyContextValue | null>(null)

function collectingDraft(
  value: MobileBatchCopyDraft | null,
): CollectingMobileBatchCopyDraft | null {
  if (value === null || value.step !== "collecting") {
    return null
  }

  return { ...value, step: value.step }
}

function confirmingDraft(
  value: MobileBatchCopyDraft | null,
): ConfirmingMobileBatchCopyDraft | null {
  if (value === null || value.step !== "confirming") {
    return null
  }

  return { ...value, step: value.step }
}

export function useMobileBatchCopyState({
  clipboard,
  createId,
  now,
  reorderButtonsEnabled,
  writer,
}: MobileBatchCopyDependencies) {
  const [state, setState] = useState<MobileBatchCopyState>({
    collectionVisible: false,
    draft: null,
  })
  const [pending, setPending] = useState(false)
  const activeOperations = useRef(0)
  const draft = useRef<MobileBatchCopyDraft | null>(null)
  const queue = useRef<Promise<void>>(Promise.resolve())

  function publish(
    nextDraft: MobileBatchCopyDraft | null,
    collectionVisible: boolean,
  ) {
    draft.current = nextDraft
    setState({ collectionVisible, draft: nextDraft })
  }

  function enqueue<Result>(
    operation: () => Promise<Result>,
    blocksActions = true,
  ) {
    if (blocksActions) {
      activeOperations.current += 1
      setPending(true)
    }

    const result = queue.current.then(operation)
    queue.current = result.then(
      () => undefined,
      () => undefined,
    )

    return result.finally(() => {
      if (!blocksActions) {
        return
      }

      activeOperations.current -= 1

      if (activeOperations.current === 0) {
        setPending(false)
      }
    })
  }

  function start() {
    return enqueue(async () => {
      publish(startMobileBatchCopy({ createId, now }), true)
    })
  }

  function add(note: Note) {
    return enqueue(async () => {
      const latestDraft = collectingDraft(draft.current)

      if (latestDraft === null) {
        return { status: "failure" } as const
      }

      const result = await addNoteToMobileBatchCopy(
        { createId, now, writer },
        latestDraft,
        note,
      )

      if (result.status === "added") {
        publish(result.draft, true)
      }

      return result
    }, false)
  }

  function reset() {
    return enqueue(async () => {
      const latestDraft = collectingDraft(draft.current)

      if (latestDraft === null) {
        return false
      }

      publish(resetMobileBatchCopySession(latestDraft, now), true)
      return true
    })
  }

  function confirm() {
    return enqueue(async () => {
      const latestDraft = collectingDraft(draft.current)

      if (latestDraft === null) {
        return false
      }

      publish(confirmMobileBatchCopySession(latestDraft, now), false)
      return true
    })
  }

  function runConfirmationEdit(
    operation: (
      current: ConfirmingMobileBatchCopyDraft,
    ) => ConfirmingMobileBatchCopyDraft,
  ) {
    return enqueue(async () => {
      const latestDraft = confirmingDraft(draft.current)

      if (latestDraft === null) {
        return false
      }

      publish(operation(latestDraft), false)
      return true
    })
  }

  function move(entryId: string, index: number) {
    return runConfirmationEdit((latestDraft) =>
      moveMobileBatchCopySessionEntry(latestDraft, entryId, index, now),
    )
  }

  function duplicate(entryId: string) {
    return runConfirmationEdit((latestDraft) =>
      duplicateMobileBatchCopySessionEntry(
        { createId, now },
        latestDraft,
        entryId,
      ),
    )
  }

  function removeEntry(entryId: string) {
    return runConfirmationEdit((latestDraft) =>
      removeMobileBatchCopySessionEntry(latestDraft, entryId, now),
    )
  }

  function resumeCollection() {
    return enqueue(async () => {
      const latestDraft = confirmingDraft(draft.current)

      if (latestDraft === null) {
        return false
      }

      publish(resumeMobileBatchCopySession(latestDraft, now), true)
      return true
    })
  }

  function copy() {
    const latestDraft = confirmingDraft(draft.current)

    if (latestDraft === null) {
      return Promise.resolve({
        reason: "write-failed",
        status: "clipboard-failure",
      } as const)
    }

    return copyMobileBatchText(clipboard, latestDraft)
  }

  function cancel() {
    return enqueue(async () => {
      publish(null, false)
    })
  }

  return {
    ...state,
    add,
    cancel,
    confirm,
    copy,
    duplicate,
    move,
    pending,
    reorderButtonsEnabled,
    removeEntry,
    reset,
    resumeCollection,
    start,
  }
}

export function useMobileBatchCopy() {
  const context = useContext(MobileBatchCopyContext)

  if (context === null) {
    throw new Error(
      "useMobileBatchCopy must be used within MobileBatchCopyProvider",
    )
  }

  return context
}
