"use client"

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react"

import {
  PRIMARY_ACCUMULATOR_ID,
  applyAccumulation,
  canRedoAccumulatorRemoval,
  canUndoAccumulatorRemoval,
  createAccumulatorSession,
  redoAccumulatorRemoval,
  removeFromAccumulatorSession,
  reorderAccumulatorSession,
  undoAccumulatorRemoval,
  type AccumulatedTextItem,
  type Accumulator,
  type AccumulatorRepository,
  type AccumulatorSession,
} from "@/entities/accumulator"
import type { Note } from "@/entities/note"
import type { ClipboardWriter } from "@/shared/lib/clipboard"

import type { AccumulationWriter } from "./AccumulationWriter"
import {
  accumulateNote,
  type AccumulateNoteResult,
} from "./accumulateNote"
import {
  copyAccumulatedText,
  type CopyAccumulatedTextResult,
} from "./copyAccumulatedText"

type AccumulatorState =
  | { session: AccumulatorSession; status: "ready" }
  | { status: "loading" | "failure" }

export type AccumulationRequest = {
  selectForMobile: boolean
}

export type EditAccumulatorResult =
  | { status: "saved" }
  | { status: "unchanged" }
  | { status: "failure" }

type ReadyAccumulatorContext = {
  accumulator: Accumulator
  items: readonly AccumulatedTextItem[]
  separator: string
  status: "ready"
}

type UnavailableAccumulatorContext =
  | { status: "loading" }
  | { status: "failure" }

type AccumulatorContextValue = (
  | ReadyAccumulatorContext
  | UnavailableAccumulatorContext
) & {
  canRedo: boolean
  canUndo: boolean
  pending: boolean
  selectedItemByNote: Readonly<Record<string, string>>
  accumulate(
    note: Note,
    request: AccumulationRequest,
  ): Promise<AccumulateNoteResult>
  copyAll(): Promise<CopyAccumulatedTextResult>
  moveItem(itemId: string, index: number): Promise<EditAccumulatorResult>
  redo(): Promise<EditAccumulatorResult>
  removeItem(itemId: string): Promise<EditAccumulatorResult>
  retry(): void
  undo(): Promise<EditAccumulatorResult>
}

const AccumulatorContext = createContext<AccumulatorContextValue | null>(null)

function emptyAccumulator(updatedAt: string): Accumulator {
  return {
    content: { items: [], separator: "\n" },
    id: PRIMARY_ACCUMULATOR_ID,
    revision: 0,
    updatedAt,
  }
}

async function readAccumulator(
  repository: AccumulatorRepository,
  now: () => string,
): Promise<AccumulatorState> {
  try {
    const accumulator = (await repository.get()) ?? emptyAccumulator(now())
    return { session: createAccumulatorSession(accumulator), status: "ready" }
  } catch {
    return { status: "failure" }
  }
}

type AccumulatorProviderProps = PropsWithChildren<{
  clipboard: ClipboardWriter
  createId(): string
  now(): string
  repository: AccumulatorRepository
  writer: AccumulationWriter
}>

export function AccumulatorProvider({
  children,
  clipboard,
  createId,
  now,
  repository,
  writer,
}: AccumulatorProviderProps) {
  const [state, setState] = useState<AccumulatorState>({ status: "loading" })
  const [pending, setPending] = useState(false)
  const session = useRef<AccumulatorSession | null>(null)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const activeOperations = useRef(0)

  useEffect(() => {
    let active = true
    void readAccumulator(repository, now).then((nextState) => {
      if (!active) {
        return
      }

      session.current = nextState.status === "ready" ? nextState.session : null
      setState(nextState)
    })

    return () => {
      active = false
    }
  }, [now, repository])

  function publish(nextSession: AccumulatorSession) {
    session.current = nextSession
    setState({ session: nextSession, status: "ready" })
  }

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

  function retry() {
    session.current = null
    setState({ status: "loading" })
    void readAccumulator(repository, now).then((nextState) => {
      session.current = nextState.status === "ready" ? nextState.session : null
      setState(nextState)
    })
  }

  function accumulate(note: Note, request: AccumulationRequest) {
    if (session.current === null) {
      return Promise.resolve<AccumulateNoteResult>({ status: "failure" })
    }

    return enqueue(async () => {
      const currentSession = session.current

      if (currentSession === null) {
        return { status: "failure" } as const
      }

      const result = await accumulateNote({ createId, now, writer }, note)

      if (result.status !== "accumulated") {
        return result
      }

      const selectedNoteId = request.selectForMobile ? note.id : null
      const nextSession = applyAccumulation(
        currentSession,
        result.accumulator,
        result.item,
        selectedNoteId,
      )
      publish(nextSession)
      return result
    })
  }

  function saveTransition(
    transition: (current: AccumulatorSession) => AccumulatorSession | null,
  ) {
    if (session.current === null) {
      return Promise.resolve<EditAccumulatorResult>({ status: "failure" })
    }

    return enqueue(async (): Promise<EditAccumulatorResult> => {
      const currentSession = session.current

      if (currentSession === null) {
        return { status: "failure" }
      }

      const nextSession = transition(currentSession)

      if (nextSession === null) {
        return { status: "unchanged" }
      }

      try {
        const accumulator = await repository.save(nextSession.accumulator)
        publish({ ...nextSession, accumulator })
        return { status: "saved" }
      } catch {
        return { status: "failure" }
      }
    })
  }

  function moveItem(itemId: string, index: number) {
    return saveTransition((current) =>
      reorderAccumulatorSession(current, itemId, index, now()),
    )
  }

  function removeItem(itemId: string) {
    return saveTransition((current) =>
      removeFromAccumulatorSession(current, itemId, now()),
    )
  }

  function undo() {
    return saveTransition((current) =>
      undoAccumulatorRemoval(current, now()),
    )
  }

  function redo() {
    return saveTransition((current) =>
      redoAccumulatorRemoval(current, now()),
    )
  }

  function copyAll() {
    const currentSession = session.current

    if (currentSession === null) {
      return Promise.resolve<CopyAccumulatedTextResult>({
        status: "clipboard-failure",
      })
    }

    return copyAccumulatedText(clipboard, currentSession.accumulator)
  }

  let contextState: ReadyAccumulatorContext | UnavailableAccumulatorContext
  let canRedo = false
  let canUndo = false
  let selectedItemByNote: Readonly<Record<string, string>> = {}

  if (state.status === "ready") {
    contextState = {
      accumulator: state.session.accumulator,
      items: state.session.accumulator.content.items,
      separator: state.session.accumulator.content.separator,
      status: "ready",
    }
    canRedo = canRedoAccumulatorRemoval(state.session)
    canUndo = canUndoAccumulatorRemoval(state.session)
    selectedItemByNote = state.session.selectedItemByNote
  } else {
    contextState = { status: state.status }
  }

  return (
    <AccumulatorContext
      value={{
        ...contextState,
        accumulate,
        canRedo,
        canUndo,
        copyAll,
        moveItem,
        pending,
        redo,
        removeItem,
        retry,
        selectedItemByNote,
        undo,
      }}
    >
      {children}
    </AccumulatorContext>
  )
}

export function useAccumulator() {
  const context = useContext(AccumulatorContext)

  if (context === null) {
    throw new Error("useAccumulator must be used within AccumulatorProvider")
  }

  return context
}
