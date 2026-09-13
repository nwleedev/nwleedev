import type * as fc from "fast-check"

type ExplorationActionCount = {
  attempted: number
  executed: number
  rejected: number
}

type ExplorationPhaseCounts = ExplorationActionCount & {
  byAction: Record<string, ExplorationActionCount>
}

export type ExplorationActionCounts = {
  exploration: ExplorationPhaseCounts
  shrinking: ExplorationPhaseCounts
}

export type ExplorationPhase = keyof ExplorationActionCounts

export function createExplorationActionCounts(): ExplorationActionCounts {
  return {
    exploration: { attempted: 0, byAction: {}, executed: 0, rejected: 0 },
    shrinking: { attempted: 0, byAction: {}, executed: 0, rejected: 0 },
  }
}

function actionCount(
  counts: ExplorationActionCounts,
  phase: ExplorationPhase,
  action: string,
) {
  const existing = counts[phase].byAction[action]
  if (existing !== undefined) {
    return existing
  }

  const created = { attempted: 0, executed: 0, rejected: 0 }
  counts[phase].byAction[action] = created
  return created
}

export function recordExplorationActionCheck(
  counts: ExplorationActionCounts,
  phase: ExplorationPhase,
  action: string,
  accepted: boolean,
) {
  counts[phase].attempted += 1
  const actionCounts = actionCount(counts, phase, action)
  actionCounts.attempted += 1
  if (!accepted) {
    counts[phase].rejected += 1
    actionCounts.rejected += 1
  }
}

export function recordExplorationActionExecution(
  counts: ExplorationActionCounts,
  phase: ExplorationPhase,
  action: string,
) {
  counts[phase].executed += 1
  actionCount(counts, phase, action).executed += 1
}

type ExplorationReportOptions = {
  actionCounts: ExplorationActionCounts
  appRevision: string
  classification: "controlled-defect" | "service-defect"
  durationMs: number
  environment: string
  feature: string
  initialState: unknown
  layer: string
  modelRevision: string
  profile: string
  toolVersions: Readonly<Record<string, string>>
}

type PrintableSequence = {
  toString(): string
}

export class ExplorationInvariantError extends Error {
  constructor(
    readonly invariant: string,
    readonly expected: unknown,
    readonly observed: unknown,
  ) {
    super(`${invariant}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(observed)}`)
    this.name = "ExplorationInvariantError"
  }
}

function describeSequence(sequence: PrintableSequence) {
  const printed = sequence.toString()
  const replayPath = printed.match(/\/\*replayPath="([^"]+)"\*\//)?.[1] ?? null
  const actionsText = printed.replace(/\s*\/\*replayPath="[^"]+"\*\/$/, "")

  return {
    actions: actionsText === "" ? [] : actionsText.split(","),
    replayPath,
  }
}

export function createExplorationReport<Sequence extends PrintableSequence>(
  details: fc.RunDetails<[Sequence]>,
  options: ExplorationReportOptions,
) {
  if (
    !details.failed ||
    details.counterexample === null ||
    details.counterexamplePath === null
  ) {
    throw new Error("A property failure is required to create an exploration report")
  }

  const failure = details.errorInstance
  if (!(failure instanceof ExplorationInvariantError)) {
    throw new Error("The property did not fail with an exploration invariant")
  }

  const firstFailure = details.failures[0]
  if (firstFailure === undefined) {
    throw new Error("Verbose failure history is required for an exploration report")
  }

  const original = describeSequence(firstFailure[0])
  const minimal = describeSequence(details.counterexample[0])

  return {
    actionCounts: {
      exploration: structuredClone(options.actionCounts.exploration),
      shrinking: structuredClone(options.actionCounts.shrinking),
    },
    appRevision: options.appRevision,
    classification: options.classification,
    durationMs: options.durationMs,
    environment: options.environment,
    expected: failure.expected,
    feature: options.feature,
    initialState: options.initialState,
    invariant: failure.invariant,
    layer: options.layer,
    minimalActions: minimal.actions,
    modelRevision: options.modelRevision,
    observed: failure.observed,
    originalActions: original.actions,
    path: details.counterexamplePath,
    profile: options.profile,
    replayPath: minimal.replayPath,
    runs: details.numRuns,
    seed: details.seed,
    shrinks: details.numShrinks,
    termination: "property-failure" as const,
    toolVersions: options.toolVersions,
  }
}
