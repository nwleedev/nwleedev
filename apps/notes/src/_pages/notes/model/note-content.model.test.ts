import assert from "node:assert/strict"

import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  isRecoverableNoteDraft,
  type Note,
  type NoteDraft,
  type NoteDraftRepository,
  type NoteRepository,
} from "@/entities/note"
import {
  createExplorationActionCounts,
  createExplorationReport,
  ExplorationInvariantError,
  recordExplorationActionCheck,
  recordExplorationActionExecution,
  type ExplorationActionCounts,
  type ExplorationPhase,
} from "@/shared/lib/note-model-exploration"
import {
  noteModelProfile,
  noteModelSettings,
} from "@/shared/lib/note-model-settings"

import {
  beginNoteContentSave,
  completeNoteContentSave,
  createNoteContentSaveState,
  failNoteContentSave,
  type NoteContentSaveRequest,
} from "./note-content-save-state"
import { saveNoteContent } from "./save-note-content"

const initialNote: Note = {
  content: "저장된 원문",
  contentRevision: 0,
  createdAt: "2026-09-01T00:00:00.000Z",
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: "note-model",
  revision: 0,
  tabIndex: 1000,
  updatedAt: "2026-09-01T00:00:00.000Z",
}

type Failure = "draft-remove" | "draft-save" | "note-save" | null
type Defect =
  | "discard-draft-after-note-failure"
  | "keep-previous-note"
  | "keep-previous-note-after-first-save"
  | "skip-draft-cleanup-retry"
  | null

declare const __NOTES_GIT_REVISION__: string

type ContentSnapshot = {
  content: string
  contentRevision: number
}

type DraftSnapshot = ContentSnapshot

type Model = {
  currentInput: string
  draft: DraftSnapshot | null
  nextFailure: Failure
  pending: ContentSnapshot | null
  saved: ContentSnapshot
}

type Real = ReturnType<typeof createReal>

function createReal(defect: Defect = null) {
  let draft: NoteDraft | null = null
  let nextFailure: Failure = null
  let note = initialNote
  let successfulSaves = 0

  const drafts: NoteDraftRepository = {
    get: async () => draft,
    remove: async () => {
      if (nextFailure === "draft-remove") {
        nextFailure = null
        throw new Error("draft storage failed")
      }
      draft = null
    },
    save: async (nextDraft) => {
      if (nextFailure === "draft-save") {
        nextFailure = null
        throw new Error("draft storage failed")
      }
      draft = nextDraft
      return nextDraft
    },
  }
  const notes: Pick<NoteRepository, "save"> = {
    save: async (nextNote) => {
      if (nextFailure === "note-save") {
        nextFailure = null
        if (defect === "discard-draft-after-note-failure") {
          draft = null
        }
        throw new Error("note storage failed")
      }
      if (
        defect === "keep-previous-note" ||
        (defect === "keep-previous-note-after-first-save" &&
          successfulSaves > 0)
      ) {
        return note
      }
      successfulSaves += 1
      note = nextNote
      return nextNote
    },
  }

  return {
    begin(content: string) {
      return beginNoteContentSave(this.state, content)
    },
    complete(request: NoteContentSaveRequest) {
      return saveNoteContent(
        { drafts, notes, now: () => "2026-09-01T00:00:01.000Z" },
        request.note,
        request.content,
      )
    },
    accept(result: Awaited<ReturnType<typeof saveNoteContent>>) {
      this.state =
        result.status === "failure"
          ? failNoteContentSave(this.state)
          : completeNoteContentSave(
              this.state,
              result.note,
              defect === "skip-draft-cleanup-retry"
                ? false
                : result.draftCleanupRequired,
            )
    },
    get draft() {
      return draft
    },
    get note() {
      return note
    },
    recordCommand() {},
    set failure(value: Failure) {
      nextFailure = value
    },
    state: createNoteContentSaveState(initialNote),
  }
}

function snapshotDraft(draft: NoteDraft | null): DraftSnapshot | null {
  if (draft === null) {
    return null
  }

  return {
    content: draft.content,
    contentRevision: draft.note.contentRevision,
  }
}

function snapshotRequest(
  request: NoteContentSaveRequest | null,
): ContentSnapshot | null {
  if (request === null) {
    return null
  }

  return {
    content: request.content,
    contentRevision: request.note.contentRevision,
  }
}

function canRecover(draft: DraftSnapshot | null, saved: ContentSnapshot) {
  return (
    draft !== null &&
    draft.contentRevision === saved.contentRevision &&
    draft.content !== saved.content
  )
}

function expectedRequest(model: Model): ContentSnapshot | null {
  if (model.pending !== null) {
    return null
  }

  if (model.currentInput === model.saved.content && model.draft === null) {
    return null
  }

  return {
    content: model.currentInput,
    contentRevision: model.saved.contentRevision,
  }
}

function assertObservation(model: Model, real: Real) {
  assert.deepEqual(
    {
      content: real.note.content,
      contentRevision: real.note.contentRevision,
    },
    model.saved,
  )
  const observedDraft = snapshotDraft(real.draft)
  try {
    assert.deepEqual(observedDraft, model.draft)
  } catch {
    throw new ExplorationInvariantError(
      "draft-state-matches-save-outcome",
      model.draft,
      observedDraft,
    )
  }
  assert.equal(
    real.draft === null ? false : isRecoverableNoteDraft(real.draft, real.note),
    canRecover(model.draft, model.saved),
  )
}

class EditCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly content: string) {}

  check = () => true

  async run(model: Model, real: Real) {
    real.recordCommand()
    model.currentInput = this.content
  }

  toString = () => `edit(${JSON.stringify(this.content)})`
}

class FailNextSaveCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly failure: Exclude<Failure, null>) {}

  check = () => true

  async run(model: Model, real: Real) {
    real.recordCommand()
    model.nextFailure = this.failure
    real.failure = this.failure
  }

  toString = () => `fail-next-${this.failure}`
}

class RequestSaveCommand implements fc.AsyncCommand<Model, Real> {
  check = (model: Readonly<Model>) => model.pending === null

  async run(model: Model, real: Real) {
    real.recordCommand()
    const expected = expectedRequest(model)
    const result = real.begin(model.currentInput)

    const observed = snapshotRequest(result.request)
    try {
      assert.deepEqual(observed, expected)
    } catch {
      throw new ExplorationInvariantError(
        "draft-cleanup-retried-on-next-save",
        expected,
        observed,
      )
    }
    real.state = result.state
    model.pending = expected
    assertObservation(model, real)
  }

  toString = () => "request-save"
}

class RequestWhileSavingCommand implements fc.AsyncCommand<Model, Real> {
  check = (model: Readonly<Model>) => model.pending !== null

  async run(model: Model, real: Real) {
    real.recordCommand()
    const result = real.begin(model.currentInput)

    assert.equal(result.request, null)
    real.state = result.state
    assertObservation(model, real)
  }

  toString = () => "request-save-while-saving"
}

class CompleteSaveCommand implements fc.AsyncCommand<Model, Real> {
  check = (model: Readonly<Model>) => model.pending !== null

  async run(model: Model, real: Real) {
    real.recordCommand()
    const pending = model.pending
    if (pending === null) {
      throw new Error("A pending save is required")
    }

    const changed = pending.content !== model.saved.content
    const failure = model.nextFailure
    model.nextFailure = null
    model.pending = null

    if (failure === "draft-save") {
      model.draft = null
    } else if (failure === "note-save") {
      model.draft = pending
    } else {
      if (changed) {
        model.saved = {
          content: pending.content,
          contentRevision: pending.contentRevision + 1,
        }
      }
      model.draft = failure === "draft-remove" ? pending : null
    }

    const request: NoteContentSaveRequest = {
      content: pending.content,
      note: {
        ...real.note,
        contentRevision: pending.contentRevision,
      },
    }
    const result = await real.complete(request)
    real.accept(result)

    assertObservation(model, real)
  }

  toString = () => "complete-save"
}

class InspectRecoveryCommand implements fc.AsyncCommand<Model, Real> {
  check = () => true

  async run(model: Model, real: Real) {
    real.recordCommand()
    assertObservation(model, real)
  }

  toString = () => "inspect-recovery"
}

const commands = [
  fc.string({ maxLength: 24 }).map((content) => new EditCommand(content)),
  fc.constant(new RequestSaveCommand()),
  fc.constant(new RequestWhileSavingCommand()),
  fc.constant(new CompleteSaveCommand()),
  fc.constant(new InspectRecoveryCommand()),
  fc.constant(new FailNextSaveCommand("draft-save")),
  fc.constant(new FailNextSaveCommand("draft-remove")),
  fc.constant(new FailNextSaveCommand("note-save")),
]

class RecordedCommand implements fc.AsyncCommand<Model, Real> {
  constructor(
    private readonly command: fc.AsyncCommand<Model, Real>,
    private readonly counts: ExplorationActionCounts,
    private readonly phase: () => ExplorationPhase,
  ) {}

  check(model: Readonly<Model>) {
    const accepted = this.command.check(model)
    recordExplorationActionCheck(
      this.counts,
      this.phase(),
      this.actionName(),
      accepted,
    )
    return accepted
  }

  async run(model: Model, real: Real) {
    recordExplorationActionExecution(
      this.counts,
      this.phase(),
      this.actionName(),
    )
    await this.command.run(model, real)
  }

  toString() {
    return this.command.toString()
  }

  private actionName() {
    return this.toString().replace(/\(.*$/u, "")
  }
}

function recordedCommands(
  candidates: readonly fc.Arbitrary<fc.AsyncCommand<Model, Real>>[],
  counts: ExplorationActionCounts,
  phase: () => ExplorationPhase,
) {
  return candidates.map((candidate) =>
    candidate.map((command) => new RecordedCommand(command, counts, phase)),
  )
}

function createState(defect: Defect = null) {
  return {
    model: {
      currentInput: initialNote.content,
      draft: null,
      nextFailure: null,
      pending: null,
      saved: {
        content: initialNote.content,
        contentRevision: initialNote.contentRevision,
      },
    },
    real: createReal(defect),
  }
}

async function runCommands(
  commandsToRun: Iterable<fc.AsyncCommand<Model, Real>>,
  defect: Defect = null,
) {
  let executedCommands = 0

  await fc.asyncModelRun(
    () => {
      const state = createState(defect)
      const record = state.real.recordCommand.bind(state.real)
      state.real.recordCommand = () => {
        executedCommands += 1
        record()
      }
      return state
    },
    commandsToRun,
  )

  return executedCommands
}

async function runSequence(
  commandsToRun: readonly fc.AsyncCommand<Model, Real>[],
  defect: Defect = null,
) {
  const { model, real } = createState(defect)

  for (const command of commandsToRun) {
    assert.equal(command.check(model), true)
    await command.run(model, real)
  }
}

function saveSequence(content: string) {
  return [
    new EditCommand(content),
    new RequestSaveCommand(),
    new CompleteSaveCommand(),
  ] as const
}

async function checkDraftSaveExploration(
  defect: Defect,
  failure: "draft-remove" | "note-save",
  seed: number,
) {
  const counts = createExplorationActionCounts()
  let phase: ExplorationPhase = "exploration"
  const currentPhase = () => phase
  const candidates = recordedCommands(
    [
      fc.constant(new EditCommand("A")),
      fc.constant(new EditCommand("B")),
      fc.constant(new FailNextSaveCommand(failure)),
      fc.constant(new RequestSaveCommand()),
      fc.constant(new CompleteSaveCommand()),
      fc.constant(new InspectRecoveryCommand()),
    ],
    counts,
    currentPhase,
  )
  const property = fc.asyncProperty(
    fc.commands(candidates, { maxCommands: 12 }),
    async (generatedCommands) => {
      try {
        await runCommands(generatedCommands, defect)
      } catch (error) {
        phase = "shrinking"
        throw error
      }
    },
  )
  const startedAt = performance.now()
  const details = await fc.check(property, {
    interruptAfterTimeLimit: noteModelSettings.interruptAfterTimeLimit,
    markInterruptAsFailure: true,
    numRuns: noteModelSettings.numRuns,
    seed,
    verbose: true,
  })

  return {
    candidates,
    counts,
    details,
    durationMs: Math.round(performance.now() - startedAt),
  }
}

describe("메모 저장 모델", () => {
  it("저장과 초안 복구의 행동 순서를 실제 명령으로 탐색한다", async () => {
    const counts = createExplorationActionCounts()
    const phase = () => "exploration" as const
    const startedAt = performance.now()
    const details = await fc.check(
      fc.asyncProperty(
        fc.commands(recordedCommands(commands, counts, phase), {
          maxCommands: noteModelSettings.maxCommands,
        }),
        async (commandsToRun) => {
          await runCommands(commandsToRun)
        },
      ),
      {
        interruptAfterTimeLimit: noteModelSettings.interruptAfterTimeLimit,
        markInterruptAsFailure: true,
        numRuns: noteModelSettings.numRuns,
        seed: 12,
      },
    )

    assert.equal(details.failed, false)
    assert.equal(details.interrupted, false)
    assert.equal(details.numRuns, noteModelSettings.numRuns)
    assert.ok(details.numSkips >= 0)
    assert.ok(counts.exploration.executed > 0)
    process.stdout.write(
      `${JSON.stringify({
        actionCounts: counts,
        appRevision: __NOTES_GIT_REVISION__,
        classification: "normal",
        durationMs: Math.round(performance.now() - startedAt),
        environment: "vitest-node",
        feature: "note-draft-recovery",
        layer: "note-content-save-command",
        modelRevision: "draft-recovery-v1",
        profile: noteModelProfile,
        runs: details.numRuns,
        seed: details.seed,
        termination: "completed",
        toolVersions: { fastCheck: fc.__version, vitest: "4.1.11" },
      })}\n`,
    )
  })

  it("초안 제거 재시도 누락을 축소하고 같은 순서로 재현한다", async () => {
    const normal = await checkDraftSaveExploration(null, "draft-remove", 7)
    assert.equal(normal.details.failed, false)
    assert.equal(normal.details.interrupted, false)

    const faulty = await checkDraftSaveExploration(
      "skip-draft-cleanup-retry",
      "draft-remove",
      8,
    )
    assert.equal(faulty.details.failed, true)
    assert.equal(faulty.details.interrupted, false)

    const report = createExplorationReport(faulty.details, {
      actionCounts: faulty.counts,
      appRevision: __NOTES_GIT_REVISION__,
      classification: "controlled-defect",
      durationMs: faulty.durationMs,
      environment: "vitest-node",
      feature: "note-draft-recovery",
      initialState: {
        draft: null,
        note: {
          content: initialNote.content,
          contentRevision: initialNote.contentRevision,
          id: initialNote.id,
        },
      },
      layer: "note-content-save-command",
      modelRevision: "draft-recovery-v1",
      profile: noteModelProfile,
      toolVersions: { fastCheck: fc.__version, vitest: "4.1.11" },
    })

    assert.equal(report.invariant, "draft-cleanup-retried-on-next-save")
    assert.ok(report.originalActions.length > report.minimalActions.length)
    assert.deepEqual(report.minimalActions, [
      "fail-next-draft-remove",
      "edit(\"A\")",
      "request-save",
      "complete-save",
      "request-save",
    ])
    assert.notEqual(report.replayPath, null)

    const replay = await fc.check(
      fc.asyncProperty(
        fc.commands(faulty.candidates, {
          maxCommands: 12,
          replayPath: report.replayPath ?? undefined,
        }),
        async (generatedCommands) => {
          await runCommands(generatedCommands, "skip-draft-cleanup-retry")
        },
      ),
      {
        endOnFailure: true,
        numRuns: 1,
        path: report.path,
        seed: report.seed,
      },
    )
    assert.equal(replay.failed, true)
    assert.equal(
      replay.errorInstance instanceof ExplorationInvariantError,
      true,
    )

    const direct = [
      new FailNextSaveCommand("draft-remove"),
      new EditCommand("A"),
      new RequestSaveCommand(),
      new CompleteSaveCommand(),
      new RequestSaveCommand(),
    ]
    await expect(
      runSequence(direct, "skip-draft-cleanup-retry"),
    ).rejects.toMatchObject({ invariant: report.invariant })
    await expect(runSequence(direct)).resolves.toBeUndefined()
    process.stdout.write(`${JSON.stringify(report)}\n`)
  })

  it("저장 중 새 입력, 저장 실패와 초안 정리를 구분한다", async () => {
    await expect(runSequence([
      new EditCommand("A"),
      new RequestSaveCommand(),
      new EditCommand("B"),
      new RequestWhileSavingCommand(),
      new CompleteSaveCommand(),
      new FailNextSaveCommand("note-save"),
      new RequestSaveCommand(),
      new CompleteSaveCommand(),
      new InspectRecoveryCommand(),
      new RequestSaveCommand(),
      new CompleteSaveCommand(),
      new EditCommand("C"),
      new FailNextSaveCommand("draft-remove"),
      new RequestSaveCommand(),
      new CompleteSaveCommand(),
      new InspectRecoveryCommand(),
    ])).resolves.toBeUndefined()
  })

  it("저장을 빠뜨리는 결함을 축소, seed 재실행과 직접 입력으로 검출한다", async () => {
    const property = fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 24 }),
      (content) => runSequence(saveSequence(content), "keep-previous-note"),
    )
    const details = await fc.check(property, {
      interruptAfterTimeLimit: noteModelSettings.interruptAfterTimeLimit,
      markInterruptAsFailure: true,
      numRuns: noteModelSettings.numRuns,
      seed: 20_260_913,
    })

    assert.equal(details.failed, true)
    assert.equal(details.interrupted, false)
    assert.ok(details.counterexample !== null)
    assert.ok(details.counterexamplePath !== null)

    const replay = await fc.check(property, {
      endOnFailure: true,
      path: details.counterexamplePath ?? undefined,
      seed: details.seed,
    })
    assert.equal(replay.failed, true)

    const [content] = details.counterexample
    process.stdout.write(
      `note-content-model defect=keep-previous-note seed=${details.seed} path=${details.counterexamplePath} shrinks=${details.numShrinks} input=${JSON.stringify(content)}\n`,
    )
    await expect(
      runSequence(saveSequence(content), "keep-previous-note"),
    ).rejects.toThrow()
  })

  it("메모 저장 실패 뒤의 초안 손실을 축소하고 재현한다", async () => {
    const faulty = await checkDraftSaveExploration(
      "discard-draft-after-note-failure",
      "note-save",
      10,
    )
    assert.equal(faulty.details.failed, true)
    assert.equal(faulty.details.interrupted, false)

    const report = createExplorationReport(faulty.details, {
      actionCounts: faulty.counts,
      appRevision: __NOTES_GIT_REVISION__,
      classification: "controlled-defect",
      durationMs: faulty.durationMs,
      environment: "vitest-node",
      feature: "note-draft-recovery",
      initialState: {
        draft: null,
        note: {
          content: initialNote.content,
          contentRevision: initialNote.contentRevision,
          id: initialNote.id,
        },
      },
      layer: "note-content-save-command",
      modelRevision: "draft-recovery-v1",
      profile: noteModelProfile,
      toolVersions: { fastCheck: fc.__version, vitest: "4.1.11" },
    })

    assert.equal(report.invariant, "draft-state-matches-save-outcome")
    assert.ok(report.originalActions.length > report.minimalActions.length)
    assert.deepEqual(report.minimalActions, [
      "fail-next-note-save",
      "edit(\"A\")",
      "request-save",
      "complete-save",
    ])
    assert.notEqual(report.replayPath, null)

    const replay = await fc.check(
      fc.asyncProperty(
        fc.commands(faulty.candidates, {
          maxCommands: 12,
          replayPath: report.replayPath ?? undefined,
        }),
        async (generatedCommands) => {
          await runCommands(
            generatedCommands,
            "discard-draft-after-note-failure",
          )
        },
      ),
      {
        endOnFailure: true,
        numRuns: 1,
        path: report.path,
        seed: report.seed,
      },
    )
    assert.equal(replay.failed, true)
    assert.equal(
      replay.errorInstance instanceof ExplorationInvariantError,
      true,
    )

    const direct = [
      new FailNextSaveCommand("note-save"),
      new EditCommand("A"),
      new RequestSaveCommand(),
      new CompleteSaveCommand(),
    ]
    await expect(
      runSequence(direct, "discard-draft-after-note-failure"),
    ).rejects.toMatchObject({ invariant: report.invariant })
    await expect(runSequence(direct)).resolves.toBeUndefined()
    process.stdout.write(`${JSON.stringify(report)}\n`)
  })

  it("새 입력을 이전 저장값으로 되돌리는 결함을 검출한다", async () => {
    await expect(runSequence([
      ...saveSequence("A"),
      ...saveSequence("B"),
    ], "keep-previous-note-after-first-save")).rejects.toThrow()
  })
})
