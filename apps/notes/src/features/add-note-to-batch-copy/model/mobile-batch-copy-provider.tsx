"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react"

import type {
  CollectingMobileBatchCopyDraft,
  ConfirmingMobileBatchCopyDraft,
  MobileBatchCopyDraft,
  MobileBatchCopyDraftRepository,
} from "@/entities/batch-copy"
import type { Note } from "@/entities/note"
import type { ClipboardWriter } from "@/shared/lib/clipboard"

import {
  copyMobileBatchText,
  type CopyMobileBatchTextResult,
} from "./copy-mobile-batch-text"
import type { MobileBatchCopyEntryWriter } from "./mobile-batch-copy-entry-writer"
import {
  addNoteToMobileBatchCopy,
  cancelMobileBatchCopy,
  confirmMobileBatchCopySession,
  duplicateMobileBatchCopySessionEntry,
  loadMobileBatchCopy,
  moveMobileBatchCopySessionEntry,
  removeMobileBatchCopySessionEntry,
  resetMobileBatchCopySession,
  resumeMobileBatchCopySession,
  startMobileBatchCopy,
  type MobileBatchCopyRemoveResult,
  type MobileBatchCopySaveResult,
} from "./mobile-batch-copy-session"

type MobileBatchCopyState =
  | { status: "failure" | "loading" }
  | { draft: MobileBatchCopyDraft | null; status: "ready" }

type MobileBatchCopyContextValue = MobileBatchCopyState & {
  pending: boolean
  reorderButtonsEnabled: boolean
  add(note: Note): Promise<MobileBatchCopySaveResult>
  cancel(): Promise<MobileBatchCopyRemoveResult>
  confirm(): Promise<MobileBatchCopySaveResult>
  copy(): Promise<CopyMobileBatchTextResult>
  duplicate(entryId: string): Promise<MobileBatchCopySaveResult>
  move(entryId: string, index: number): Promise<MobileBatchCopySaveResult>
  removeEntry(entryId: string): Promise<MobileBatchCopySaveResult>
  reset(): Promise<MobileBatchCopySaveResult>
  resumeCollection(): Promise<MobileBatchCopySaveResult>
  retry(): void
  start(): Promise<MobileBatchCopySaveResult>
}

type MobileBatchCopyProviderProps = PropsWithChildren<{
  clipboard: ClipboardWriter
  createId(): string
  now(): string
  reorderButtonsEnabled: boolean
  repository: MobileBatchCopyDraftRepository
  writer: MobileBatchCopyEntryWriter
}>

const MobileBatchCopyContext =
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

export function MobileBatchCopyProvider({
  children,
  clipboard,
  createId,
  now,
  reorderButtonsEnabled,
  repository,
  writer,
}: MobileBatchCopyProviderProps) {
  const [state, setState] = useState<MobileBatchCopyState>({
    status: "loading",
  })
  const [pending, setPending] = useState(false)
  const activeOperations = useRef(0)
  const draft = useRef<MobileBatchCopyDraft | null>(null)
  const loadSequence = useRef(0)
  const queue = useRef<Promise<void>>(Promise.resolve())

  const publish = useCallback((nextDraft: MobileBatchCopyDraft | null) => {
    draft.current = nextDraft
    setState({ draft: nextDraft, status: "ready" })
  }, [])

  function enqueue<Result>(operation: () => Promise<Result>) {
    activeOperations.current += 1
    setPending(true)
    const result = queue.current.then(operation)
    queue.current = result.then(
      () => undefined,
      () => undefined,
    )

    return result.finally(() => {
      activeOperations.current -= 1

      if (activeOperations.current === 0) {
        setPending(false)
      }
    })
  }

  const load = useCallback((sequence: number, active: () => boolean) => {
    void loadMobileBatchCopy(repository).then((result) => {
      if (!active() || loadSequence.current !== sequence) {
        return
      }

      if (result.status === "failure") {
        draft.current = null
        setState({ status: "failure" })
        return
      }

      publish(result.draft)
    })
  }, [publish, repository])

  useEffect(() => {
    let active = true
    const sequence = ++loadSequence.current
    load(sequence, () => active)

    return () => {
      active = false
    }
  }, [load])

  function retry() {
    const sequence = ++loadSequence.current
    setState({ status: "loading" })
    load(sequence, () => true)
  }

  function start() {
    return enqueue(async () => {
      const result = await startMobileBatchCopy({
        createId,
        now,
        repository,
      })

      if (result.status === "saved") {
        publish(result.draft)
      }

      return result
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

      if (result.status === "saved") {
        publish(result.draft)
      }

      return result
    })
  }

  function reset() {
    return enqueue(async () => {
      const latestDraft = collectingDraft(draft.current)

      if (latestDraft === null) {
        return { status: "failure" } as const
      }

      const result = await resetMobileBatchCopySession(
        { now, repository },
        latestDraft,
      )

      if (result.status === "saved") {
        publish(result.draft)
      }

      return result
    })
  }

  function confirm() {
    return enqueue(async () => {
      const latestDraft = collectingDraft(draft.current)

      if (latestDraft === null) {
        return { status: "failure" } as const
      }

      const result = await confirmMobileBatchCopySession(
        { now, repository },
        latestDraft,
      )

      if (result.status === "saved") {
        publish(result.draft)
      }

      return result
    })
  }

  function runConfirmationEdit(
    operation: (
      current: ConfirmingMobileBatchCopyDraft,
    ) => Promise<MobileBatchCopySaveResult<ConfirmingMobileBatchCopyDraft>>,
  ) {
    return enqueue(async () => {
      const latestDraft = confirmingDraft(draft.current)

      if (latestDraft === null) {
        return { status: "failure" } as const
      }

      const result = await operation(latestDraft)

      if (result.status === "saved") {
        publish(result.draft)
      }

      return result
    })
  }

  function move(entryId: string, index: number) {
    return runConfirmationEdit((latestDraft) =>
      moveMobileBatchCopySessionEntry(
        { now, repository },
        latestDraft,
        entryId,
        index,
      ),
    )
  }

  function duplicate(entryId: string) {
    return runConfirmationEdit((latestDraft) =>
      duplicateMobileBatchCopySessionEntry(
        { createId, now, repository },
        latestDraft,
        entryId,
      ),
    )
  }

  function removeEntry(entryId: string) {
    return runConfirmationEdit((latestDraft) =>
      removeMobileBatchCopySessionEntry(
        { now, repository },
        latestDraft,
        entryId,
      ),
    )
  }

  function resumeCollection() {
    return enqueue(async () => {
      const latestDraft = confirmingDraft(draft.current)

      if (latestDraft === null) {
        return { status: "failure" } as const
      }

      const result = await resumeMobileBatchCopySession(
        { now, repository },
        latestDraft,
      )

      if (result.status === "saved") {
        publish(result.draft)
      }

      return result
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
      const result = await cancelMobileBatchCopy(repository)

      if (result.status === "removed") {
        publish(null)
      }

      return result
    })
  }

  return (
    <MobileBatchCopyContext
      value={{
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
        retry,
        start,
      }}
    >
      {children}
    </MobileBatchCopyContext>
  )
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
