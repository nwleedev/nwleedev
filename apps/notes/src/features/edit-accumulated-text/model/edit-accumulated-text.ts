import {
  redoAccumulatorRemoval,
  removeFromAccumulatorSession,
  reorderAccumulatorSession,
  undoAccumulatorRemoval,
  type AccumulatorRepository,
  type AccumulatorSession,
} from "@/entities/accumulator"

export type EditAccumulatorResult =
  | { status: "failure" }
  | { status: "saved" }
  | { status: "unchanged" }

export type EditAccumulatorExecution = {
  result: EditAccumulatorResult
  session?: AccumulatorSession
}

type EditAccumulatorDependencies = {
  now(): string
  repository: AccumulatorRepository
}

type AccumulatorTransition = (
  session: AccumulatorSession,
  updatedAt: string,
) => AccumulatorSession | null

async function saveTransition(
  dependencies: EditAccumulatorDependencies,
  session: AccumulatorSession,
  transition: AccumulatorTransition,
): Promise<EditAccumulatorExecution> {
  const nextSession = transition(session, dependencies.now())

  if (nextSession === null) {
    return { result: { status: "unchanged" } }
  }

  try {
    const accumulator = await dependencies.repository.save(
      nextSession.accumulator,
    )
    return {
      result: { status: "saved" },
      session: { ...nextSession, accumulator },
    }
  } catch {
    return { result: { status: "failure" } }
  }
}

export function moveAccumulatedText(
  dependencies: EditAccumulatorDependencies,
  session: AccumulatorSession,
  itemId: string,
  index: number,
) {
  return saveTransition(dependencies, session, (current, updatedAt) =>
    reorderAccumulatorSession(current, itemId, index, updatedAt),
  )
}

export function removeAccumulatedText(
  dependencies: EditAccumulatorDependencies,
  session: AccumulatorSession,
  itemId: string,
) {
  return saveTransition(dependencies, session, (current, updatedAt) =>
    removeFromAccumulatorSession(current, itemId, updatedAt),
  )
}

export function undoAccumulatedTextRemoval(
  dependencies: EditAccumulatorDependencies,
  session: AccumulatorSession,
) {
  return saveTransition(dependencies, session, undoAccumulatorRemoval)
}

export function redoAccumulatedTextRemoval(
  dependencies: EditAccumulatorDependencies,
  session: AccumulatorSession,
) {
  return saveTransition(dependencies, session, redoAccumulatorRemoval)
}
