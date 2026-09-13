import assert from "node:assert/strict"

import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  createExplorationActionCounts,
  recordExplorationActionCheck,
  recordExplorationActionExecution,
  type ExplorationActionCounts,
} from "@/shared/lib/note-model-exploration"
import {
  noteModelProfile,
  noteModelSettings,
} from "@/shared/lib/note-model-settings"

import type { Note } from "./note"
import { NoteDraftSchema, isRecoverableNoteDraft } from "./note-draft"

const note: Note = {
  content: "저장한 원문",
  contentRevision: 2,
  createdAt: "2026-09-01T01:00:00.000Z",
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: "note-1",
  revision: 4,
  tabIndex: 1000,
  updatedAt: "2026-09-01T02:00:00.000Z",
}

const draft = {
  content: "저장하지 않은 원문",
  note: { contentRevision: 2, id: "note-1" },
  updatedAt: "2026-09-01T03:00:00.000Z",
}

declare const __NOTES_GIT_REVISION__: string

type RecoveryModel = {
  draft: typeof draft | null
  input: string
}

type RecoveryReal = RecoveryModel

abstract class RecoveryCommand implements fc.Command<RecoveryModel, RecoveryReal> {
  constructor(
    private readonly action: string,
    private readonly counts: ExplorationActionCounts,
  ) {}

  check() {
    recordExplorationActionCheck(
      this.counts,
      "exploration",
      this.action,
      true,
    )
    return true
  }

  protected recordExecution() {
    recordExplorationActionExecution(
      this.counts,
      "exploration",
      this.action,
    )
  }

  toString() {
    return this.action
  }

  abstract run(model: RecoveryModel, real: RecoveryReal): void
}

class PrepareDraftCommand extends RecoveryCommand {
  constructor(
    counts: ExplorationActionCounts,
    private readonly kind:
      | "matching-content"
      | "recoverable"
      | "stale-revision"
      | "wrong-note",
  ) {
    super(`prepare-${kind}`, counts)
  }

  run(model: RecoveryModel, real: RecoveryReal) {
    this.recordExecution()
    const prepared = {
      ...draft,
      content: this.kind === "matching-content" ? note.content : draft.content,
      note: {
        contentRevision:
          this.kind === "stale-revision"
            ? note.contentRevision - 1
            : note.contentRevision,
        id: this.kind === "wrong-note" ? "note-2" : note.id,
      },
    }
    model.draft = prepared
    real.draft = prepared
  }
}

class AttemptRecoveryCommand extends RecoveryCommand {
  constructor(counts: ExplorationActionCounts) {
    super("attempt-recovery", counts)
  }

  run(model: RecoveryModel, real: RecoveryReal) {
    this.recordExecution()
    const expected =
      model.draft !== null &&
      model.draft.note.id === note.id &&
      model.draft.note.contentRevision === note.contentRevision &&
      model.draft.content !== note.content
        ? model.draft.content
        : note.content
    model.input = expected
    real.input =
      real.draft !== null && isRecoverableNoteDraft(real.draft, note)
        ? real.draft.content
        : note.content
    assert.equal(real.input, model.input)
  }
}

class InspectRecoveryCommand extends RecoveryCommand {
  constructor(counts: ExplorationActionCounts) {
    super("inspect-input", counts)
  }

  run(model: RecoveryModel, real: RecoveryReal) {
    this.recordExecution()
    assert.equal(real.input, model.input)
  }
}

describe("메모 원문 복구 초안", () => {
  it("복구 가능한 초안과 거절할 초안을 행동 순서로 탐색한다", () => {
    const counts = createExplorationActionCounts()
    const commands = [
      fc.constant(new PrepareDraftCommand(counts, "recoverable")),
      fc.constant(new PrepareDraftCommand(counts, "stale-revision")),
      fc.constant(new PrepareDraftCommand(counts, "wrong-note")),
      fc.constant(new PrepareDraftCommand(counts, "matching-content")),
      fc.constant(new AttemptRecoveryCommand(counts)),
      fc.constant(new InspectRecoveryCommand(counts)),
    ]
    const startedAt = performance.now()
    const details = fc.check(
      fc.property(
        fc.commands(commands, { maxCommands: 12 }),
        (generatedCommands) => {
          fc.modelRun(
            () => ({
              model: { draft: null, input: note.content },
              real: { draft: null, input: note.content },
            }),
            generatedCommands,
          )
        },
      ),
      {
        interruptAfterTimeLimit: noteModelSettings.interruptAfterTimeLimit,
        markInterruptAsFailure: true,
        numRuns: noteModelSettings.numRuns,
        seed: 11,
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
        layer: "note-draft-classification",
        modelRevision: "draft-recovery-v1",
        profile: noteModelProfile,
        runs: details.numRuns,
        seed: details.seed,
        termination: "completed",
        toolVersions: { fastCheck: fc.__version, vitest: "4.1.11" },
      })}\n`,
    )
  })

  it("기준 원문과 다른 최신 초안을 복구 후보로 판정한다", () => {
    expect(NoteDraftSchema.safeParse(draft).success).toBe(true)
    expect(isRecoverableNoteDraft(draft, note)).toBe(true)
  })

  it("다른 메모나 이미 바뀐 원문을 기준으로 만든 초안은 사용하지 않는다", () => {
    expect(
      isRecoverableNoteDraft(
        { ...draft, note: { ...draft.note, id: "note-2" } },
        note,
      ),
    ).toBe(false)
    expect(
      isRecoverableNoteDraft(
        { ...draft, note: { ...draft.note, contentRevision: 1 } },
        note,
      ),
    ).toBe(false)
  })

  it("저장된 원문과 같은 초안은 복구 후보로 표시하지 않는다", () => {
    expect(isRecoverableNoteDraft({ ...draft, content: note.content }, note)).toBe(
      false,
    )
  })
})
