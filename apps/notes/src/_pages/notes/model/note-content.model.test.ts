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
} from "./note-content-save-state"
import { saveNoteContent } from "./save-note-content"

const initialTimestamp = new Date().toISOString()
const initialNote: Note = {
  content: "저장된 원문",
  contentRevision: 0,
  createdAt: initialTimestamp,
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: crypto.randomUUID(),
  revision: 0,
  tabIndex: 1000,
  updatedAt: initialTimestamp,
}

type Failure = "draft-remove" | "draft-save" | "note-save" | null
type Defect =
  | "discard-draft-after-note-failure"
  | "skip-draft-cleanup-retry"
  | null

declare const __NOTES_GIT_REVISION__: string

type ContentSnapshot = {
  content: string
  contentRevision: number
  revision: number
}

type DraftSnapshot = Pick<ContentSnapshot, "content" | "contentRevision">

type Model = {
  currentInput: string
  draft: DraftSnapshot | null
  nextFailure: Failure
  saved: ContentSnapshot
}

type Real = ReturnType<typeof createReal>

function createReal(defect: Defect = null) {
  let draft: NoteDraft | null = null
  let nextFailure: Failure = null
  let note = initialNote

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
      note = nextNote
      return nextNote
    },
  }

  return {
    async save(content: string) {
      const started = beginNoteContentSave(this.state, content)
      this.state = started.state

      if (started.request === null) {
        return
      }

      const result = await saveNoteContent(
        { drafts, notes, now: () => new Date().toISOString() },
        started.request.note,
        started.request.content,
      )
      this.state = result.status === "failure"
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

function canRecover(draft: DraftSnapshot | null, saved: ContentSnapshot) {
  return (
    draft !== null &&
    draft.contentRevision === saved.contentRevision &&
    draft.content !== saved.content
  )
}

function assertObservation(model: Model, real: Real) {
  assert.deepEqual(
    {
      content: real.note.content,
      contentRevision: real.note.contentRevision,
      revision: real.note.revision,
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

class SaveCommand implements fc.AsyncCommand<Model, Real> {
  check = () => true

  async run(model: Model, real: Real) {
    real.recordCommand()
    const changed = model.currentInput !== model.saved.content
    const failure = model.nextFailure

    if (changed) {
      if (failure === "draft-save") {
        model.nextFailure = null
      } else {
        const nextDraft = {
          content: model.currentInput,
          contentRevision: model.saved.contentRevision,
        }
        model.draft = nextDraft

        if (failure === "note-save") {
          model.nextFailure = null
        } else {
          model.saved = {
            content: model.currentInput,
            contentRevision: model.saved.contentRevision + 1,
            revision: model.saved.revision + 1,
          }
          if (failure === "draft-remove") {
            model.nextFailure = null
          } else {
            model.draft = null
          }
        }
      }
    } else if (model.draft !== null) {
      if (failure === "draft-remove") {
        model.nextFailure = null
      } else {
        model.draft = null
      }
    }

    await real.save(model.currentInput)
    assertObservation(model, real)
  }

  toString = () => "save"
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
  fc.constant(new SaveCommand()),
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
      saved: {
        content: initialNote.content,
        contentRevision: initialNote.contentRevision,
        revision: initialNote.revision,
      },
    },
    real: createReal(defect),
  }
}

async function runCommands(
  commandsToRun: Iterable<fc.AsyncCommand<Model, Real>>,
  defect: Defect = null,
) {
  await fc.asyncModelRun(() => createState(defect), commandsToRun)
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
      fc.string({ maxLength: 24 }).map((content) => new EditCommand(content)),
      fc.constant(new FailNextSaveCommand(failure)),
      fc.constant(new SaveCommand()),
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

async function confirmControlledFailure(
  defect: Exclude<Defect, null>,
  failure: "draft-remove" | "note-save",
  seed: number,
) {
  const normal = await checkDraftSaveExploration(null, failure, seed)
  assert.equal(normal.details.failed, false)
  assert.equal(normal.details.interrupted, false)

  const faulty = await checkDraftSaveExploration(defect, failure, seed)
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
    modelRevision: "draft-recovery-v2",
    profile: noteModelProfile,
    toolVersions: { fastCheck: fc.__version, vitest: "4.1.11" },
  })
  assert.equal(report.invariant, "draft-state-matches-save-outcome")
  assert.ok(report.originalActions.length >= report.minimalActions.length)

  const replay = await fc.check(
    fc.asyncProperty(
      fc.commands(faulty.candidates, {
        maxCommands: 12,
        replayPath: report.replayPath ?? undefined,
      }),
      async (generatedCommands) => {
        await runCommands(generatedCommands, defect)
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

  const minimalCommands = faulty.details.counterexample?.[0]
  assert.ok(minimalCommands)
  await expect(runCommands(minimalCommands, defect)).rejects.toMatchObject({
    invariant: report.invariant,
  })
  await expect(runCommands(minimalCommands)).resolves.toBeUndefined()
  process.stdout.write(`${JSON.stringify(report)}\n`)
  return report
}

describe("메모 저장과 초안 복구", () => {
  it("편집, 저장 및 저장 실패를 조합해 저장값과 복구 가능성을 확인한다", async () => {
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
        modelRevision: "draft-recovery-v2",
        profile: noteModelProfile,
        runs: details.numRuns,
        seed: details.seed,
        termination: "completed",
        toolVersions: { fastCheck: fc.__version, vitest: "4.1.11" },
      })}\n`,
    )
  })

  it("초안 제거 실패 뒤 다음 저장에서 정리를 완료한다", async () => {
    const report = await confirmControlledFailure(
      "skip-draft-cleanup-retry",
      "draft-remove",
      8,
    )
    expect(report.expected).not.toEqual(report.observed)
  })

  it("초안 제거가 두 번 실패해도 다음 저장에서 정리를 완료한다", async () => {
    const details = await fc.check(
      fc.asyncProperty(
        fc.string({ maxLength: 24 }).filter(
          (content) => content !== initialNote.content,
        ),
        async (content) => {
          await runCommands([
            new EditCommand(content),
            new FailNextSaveCommand("draft-remove"),
            new SaveCommand(),
            new FailNextSaveCommand("draft-remove"),
            new SaveCommand(),
            new SaveCommand(),
          ])
        },
      ),
      { numRuns: noteModelSettings.numRuns },
    )
    expect(details.failed).toBe(false)
    expect(details.interrupted).toBe(false)
  })

  it("메모 저장 실패 뒤 복구 가능한 초안을 유지한다", async () => {
    const report = await confirmControlledFailure(
      "discard-draft-after-note-failure",
      "note-save",
      10,
    )
    expect(report.expected).not.toEqual(report.observed)
  })
})
