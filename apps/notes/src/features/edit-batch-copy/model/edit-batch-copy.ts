import {
  redoBatchCopyItemRemoval as redoRemoval,
  removeFromBatchCopySession,
  reorderBatchCopySession,
  undoBatchCopyItemRemoval as undoRemoval,
  type BatchCopyRepository,
  type BatchCopySession,
} from "@/entities/batch-copy"

export type EditBatchCopyResult =
  | { status: "failure" }
  | { removedItemId?: string; status: "saved" }
  | { status: "unchanged" }

export type EditBatchCopyExecution = {
  result: EditBatchCopyResult
  session?: BatchCopySession
}

type EditBatchCopyDependencies = {
  now(): string
  repository: BatchCopyRepository
}

type BatchCopyTransition = (
  session: BatchCopySession,
  updatedAt: string,
) => BatchCopySession | null

async function saveTransition(
  dependencies: EditBatchCopyDependencies,
  session: BatchCopySession,
  transition: BatchCopyTransition,
): Promise<EditBatchCopyExecution> {
  const nextSession = transition(session, dependencies.now())

  if (nextSession === null) {
    return { result: { status: "unchanged" } }
  }

  try {
    const list = await dependencies.repository.save(nextSession.list)
    return {
      result: { status: "saved" },
      session: { ...nextSession, list },
    }
  } catch {
    return { result: { status: "failure" } }
  }
}

export function saveBatchCopyItemPosition(
  dependencies: EditBatchCopyDependencies,
  session: BatchCopySession,
  itemId: string,
  index: number,
) {
  return saveTransition(dependencies, session, (current, updatedAt) =>
    reorderBatchCopySession(current, itemId, index, updatedAt),
  )
}

export function removeBatchCopyItem(
  dependencies: EditBatchCopyDependencies,
  session: BatchCopySession,
  itemId: string,
) {
  return saveTransition(dependencies, session, (current, updatedAt) =>
    removeFromBatchCopySession(current, itemId, updatedAt),
  )
}

export function undoBatchCopyItemRemoval(
  dependencies: EditBatchCopyDependencies,
  session: BatchCopySession,
) {
  return saveTransition(dependencies, session, undoRemoval)
}

export async function redoBatchCopyItemRemoval(
  dependencies: EditBatchCopyDependencies,
  session: BatchCopySession,
) {
  const removedItemId = session.history.redo.at(-1)?.item.id
  const execution = await saveTransition(
    dependencies,
    session,
    redoRemoval,
  )

  if (execution.result.status !== "saved" || removedItemId === undefined) {
    return execution
  }

  return {
    ...execution,
    result: { removedItemId, status: "saved" } as const,
  }
}
