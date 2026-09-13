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
import { noteModelSettings } from "@/shared/lib/note-model-settings"

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
  | null

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
  assert.deepEqual(snapshotDraft(real.draft), model.draft)
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

    assert.deepEqual(snapshotRequest(result.request), expected)
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
    real.state =
      result.status === "failure"
        ? failNoteContentSave(real.state)
        : completeNoteContentSave(real.state, result.note)

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
  fc.constant(new FailNextSaveCommand("note-save")),
]

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

describe("메모 저장 모델", () => {
  it("저장과 초안 복구의 행동 순서를 실제 명령으로 탐색한다", async () => {
    let executedCommands = 0
    const details = await fc.check(
      fc.asyncProperty(
        fc.commands(commands, { maxCommands: noteModelSettings.maxCommands }),
        async (commandsToRun) => {
          executedCommands += await runCommands(commandsToRun)
        },
      ),
      {
        interruptAfterTimeLimit: noteModelSettings.interruptAfterTimeLimit,
        markInterruptAsFailure: true,
        numRuns: noteModelSettings.numRuns,
      },
    )

    assert.equal(details.failed, false)
    assert.equal(details.interrupted, false)
    assert.equal(details.numRuns, noteModelSettings.numRuns)
    assert.ok(details.numSkips >= 0)
    assert.ok(executedCommands > 0)
    process.stdout.write(
      `note-content-model profile=local-fast generated=${details.numRuns} executed=${executedCommands} skipped=${details.numSkips}\n`,
    )
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

  it("메모 저장 실패 뒤 초안을 버리는 결함을 검출한다", async () => {
    await expect(runSequence([
      new EditCommand("복구할 원문"),
      new FailNextSaveCommand("note-save"),
      new RequestSaveCommand(),
      new CompleteSaveCommand(),
    ], "discard-draft-after-note-failure")).rejects.toThrow()
  })

  it("새 입력을 이전 저장값으로 되돌리는 결함을 검출한다", async () => {
    await expect(runSequence([
      ...saveSequence("A"),
      ...saveSequence("B"),
    ], "keep-previous-note-after-first-save")).rejects.toThrow()
  })
})
