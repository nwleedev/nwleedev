"use client"

import {
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react"

import {
  PRIMARY_BATCH_COPY_LIST_ID,
  applyBatchCopyItem,
  canRedoBatchCopyItemRemoval,
  canUndoBatchCopyItemRemoval,
  createBatchCopySession,
  type BatchCopyList,
  type BatchCopyRepository,
  type BatchCopySession,
} from "@/entities/batch-copy"
import type { Note } from "@/entities/note"
import {
  AddNoteToBatchCopyProvider,
  addNoteToBatchCopy,
  type AddNoteToBatchCopyResult,
  type BatchCopyItemWriter,
} from "@/features/add-note-to-batch-copy"
import {
  EditBatchCopyProvider,
  copyBatchText,
  redoBatchCopyItemRemoval,
  removeBatchCopyItem,
  saveBatchCopyItemPosition,
  undoBatchCopyItemRemoval,
  type EditBatchCopyContextValue,
  type EditBatchCopyExecution,
  type EditBatchCopyResult,
} from "@/features/edit-batch-copy"
import type { ClipboardWriter } from "@/shared/lib/clipboard"

type BatchCopyState =
  | { session: BatchCopySession; status: "ready" }
  | { status: "failure" | "loading" }

type BatchCopyProviderProps = PropsWithChildren<{
  clipboard: ClipboardWriter
  createId(): string
  now(): string
  onItemRemoved(itemId: string): void
  repository: BatchCopyRepository
  writer: BatchCopyItemWriter
}>

function emptyBatchCopyList(updatedAt: string): BatchCopyList {
  return {
    content: { items: [], separator: "\n" },
    id: PRIMARY_BATCH_COPY_LIST_ID,
    revision: 0,
    updatedAt,
  }
}

async function readBatchCopy(
  repository: BatchCopyRepository,
  now: () => string,
): Promise<BatchCopyState> {
  try {
    const list = (await repository.get()) ?? emptyBatchCopyList(now())
    return { session: createBatchCopySession(list), status: "ready" }
  } catch {
    return { status: "failure" }
  }
}

export function BatchCopyProvider({
  children,
  clipboard,
  createId,
  now,
  onItemRemoved,
  repository,
  writer,
}: BatchCopyProviderProps) {
  const [state, setState] = useState<BatchCopyState>({ status: "loading" })
  const [pending, setPending] = useState(false)
  const session = useRef<BatchCopySession | null>(null)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const activeOperations = useRef(0)

  useEffect(() => {
    let active = true
    void readBatchCopy(repository, now).then((nextState) => {
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

  function publish(nextSession: BatchCopySession) {
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
    void readBatchCopy(repository, now).then((nextState) => {
      session.current = nextState.status === "ready" ? nextState.session : null
      setState(nextState)
    })
  }

  function add(note: Note) {
    if (session.current === null) {
      return Promise.resolve<AddNoteToBatchCopyResult>({ status: "failure" })
    }

    return enqueue(async () => {
      const currentSession = session.current

      if (currentSession === null) {
        return { status: "failure" } as const
      }

      const result = await addNoteToBatchCopy({ createId, now, writer }, note)

      if (result.status !== "added") {
        return result
      }

      const nextSession = applyBatchCopyItem(currentSession, result.list)
      publish(nextSession)
      return result
    })
  }

  function runEdit(
    operation: (current: BatchCopySession) => Promise<EditBatchCopyExecution>,
  ) {
    if (session.current === null) {
      return Promise.resolve<EditBatchCopyResult>({ status: "failure" })
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

      if (
        execution.result.status === "saved" &&
        execution.result.removedItemId !== undefined
      ) {
        onItemRemoved(execution.result.removedItemId)
      }

      return execution.result
    })
  }

  const editDependencies = { now, repository }

  function moveItem(itemId: string, index: number) {
    return runEdit((current) =>
      saveBatchCopyItemPosition(editDependencies, current, itemId, index),
    )
  }

  function removeItem(itemId: string) {
    return runEdit((current) =>
      removeBatchCopyItem(editDependencies, current, itemId),
    )
  }

  function undo() {
    return runEdit((current) =>
      undoBatchCopyItemRemoval(editDependencies, current),
    )
  }

  function redo() {
    return runEdit((current) =>
      redoBatchCopyItemRemoval(editDependencies, current),
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

    return copyBatchText(clipboard, currentSession.list)
  }

  let editorState: EditBatchCopyContextValue
  let canRedo = false
  let canUndo = false

  if (state.status === "ready") {
    canRedo = canRedoBatchCopyItemRemoval(state.session)
    canUndo = canUndoBatchCopyItemRemoval(state.session)
    editorState = {
      canRedo,
      canUndo,
      copyAll,
      items: state.session.list.content.items,
      list: state.session.list,
      moveItem,
      pending,
      redo,
      removeItem,
      retry,
      separator: state.session.list.content.separator,
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
    <AddNoteToBatchCopyProvider
      add={add}
      ready={state.status === "ready"}
    >
      <EditBatchCopyProvider value={editorState}>
        {children}
      </EditBatchCopyProvider>
    </AddNoteToBatchCopyProvider>
  )
}
