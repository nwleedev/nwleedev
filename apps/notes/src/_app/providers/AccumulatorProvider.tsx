"use client"

import {
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
  type Accumulator,
  type AccumulatorRepository,
  type AccumulatorSession,
} from "@/entities/accumulator"
import type { Note } from "@/entities/note"
import {
  AccumulateNoteProvider,
  accumulateNote,
  type AccumulateNoteResult,
  type AccumulationRequest,
  type AccumulationWriter,
} from "@/features/accumulate-note"
import {
  EditAccumulatedTextProvider,
  copyAccumulatedText,
  moveAccumulatedText,
  redoAccumulatedTextRemoval,
  removeAccumulatedText,
  undoAccumulatedTextRemoval,
  type EditAccumulatorExecution,
  type EditAccumulatorResult,
  type EditAccumulatedTextContextValue,
} from "@/features/edit-accumulated-text"
import type { ClipboardWriter } from "@/shared/lib/clipboard"

type AccumulatorState =
  | { session: AccumulatorSession; status: "ready" }
  | { status: "failure" | "loading" }

type AccumulatorProviderProps = PropsWithChildren<{
  clipboard: ClipboardWriter
  createId(): string
  now(): string
  repository: AccumulatorRepository
  writer: AccumulationWriter
}>

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

  function runEdit(
    operation: (current: AccumulatorSession) => Promise<EditAccumulatorExecution>,
  ) {
    if (session.current === null) {
      return Promise.resolve<EditAccumulatorResult>({ status: "failure" })
    }

    return enqueue(async () => {
      const currentSession = session.current

      if (currentSession === null) {
        return { status: "failure" } as const
      }

      const execution = await operation(currentSession)

      if (execution.session !== undefined) {
        publish(execution.session)
      }

      return execution.result
    })
  }

  const editDependencies = { now, repository }

  function moveItem(itemId: string, index: number) {
    return runEdit((current) =>
      moveAccumulatedText(editDependencies, current, itemId, index),
    )
  }

  function removeItem(itemId: string) {
    return runEdit((current) =>
      removeAccumulatedText(editDependencies, current, itemId),
    )
  }

  function undo() {
    return runEdit((current) =>
      undoAccumulatedTextRemoval(editDependencies, current),
    )
  }

  function redo() {
    return runEdit((current) =>
      redoAccumulatedTextRemoval(editDependencies, current),
    )
  }

  function copyAll() {
    const currentSession = session.current

    if (currentSession === null) {
      return Promise.resolve({
        reason: "write-failed",
        status: "clipboard-failure",
      } as const)
    }

    return copyAccumulatedText(clipboard, currentSession.accumulator)
  }

  let editorState: EditAccumulatedTextContextValue
  let canRedo = false
  let canUndo = false
  let selectedItemByNote: Readonly<Record<string, string>> = {}

  if (state.status === "ready") {
    canRedo = canRedoAccumulatorRemoval(state.session)
    canUndo = canUndoAccumulatorRemoval(state.session)
    selectedItemByNote = state.session.selectedItemByNote
    editorState = {
      accumulator: state.session.accumulator,
      canRedo,
      canUndo,
      copyAll,
      items: state.session.accumulator.content.items,
      moveItem,
      pending,
      redo,
      removeItem,
      retry,
      separator: state.session.accumulator.content.separator,
      status: "ready",
      undo,
    }
  } else {
    editorState = {
      canRedo,
      canUndo,
      copyAll,
      moveItem,
      pending,
      redo,
      removeItem,
      retry,
      status: state.status,
      undo,
    }
  }

  return (
    <AccumulateNoteProvider
      accumulate={accumulate}
      ready={state.status === "ready"}
      selectedItemByNote={selectedItemByNote}
    >
      <EditAccumulatedTextProvider value={editorState}>
        {children}
      </EditAccumulatedTextProvider>
    </AccumulateNoteProvider>
  )
}
