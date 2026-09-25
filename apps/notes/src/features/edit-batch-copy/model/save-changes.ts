import {
  duplicateBatchCopyItem as duplicateItem,
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

type DuplicateBatchCopyDependencies = EditBatchCopyDependencies & {
  createId(): string
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

async function saveRemovalTransition(
  dependencies: EditBatchCopyDependencies,
  session: BatchCopySession,
  transition: BatchCopyTransition,
  removedItemId: string | undefined,
): Promise<EditBatchCopyExecution> {
  const execution = await saveTransition(dependencies, session, transition)

  if (execution.result.status !== "saved" || removedItemId === undefined) {
    return execution
  }

  return {
    ...execution,
    result: { removedItemId, status: "saved" },
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

export function duplicateBatchCopyItem(
  dependencies: DuplicateBatchCopyDependencies,
  session: BatchCopySession,
  itemId: string,
) {
  return saveTransition(dependencies, session, (current, updatedAt) => {
    const list = duplicateItem(
      current.list,
      itemId,
      dependencies.createId(),
      updatedAt,
    )

    return list === null ? null : { ...current, list }
  })
}

export function removeBatchCopyItem(
  dependencies: EditBatchCopyDependencies,
  session: BatchCopySession,
  itemId: string,
) {
  return saveRemovalTransition(
    dependencies,
    session,
    (current, updatedAt) =>
      removeFromBatchCopySession(current, itemId, updatedAt),
    itemId,
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
  return saveRemovalTransition(
    dependencies,
    session,
    redoRemoval,
    removedItemId,
  )
}
