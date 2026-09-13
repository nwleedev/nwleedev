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
  type NoteContentSaveState,
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

type Failure = "draft" | "note" | null

type Model = {
  content: string
  contentRevision: number
  currentInput: string
  draft: string | null
  failure: Failure
  pending: NoteContentSaveRequest | null
  status: NoteContentSaveState["status"]
}

type Real = ReturnType<typeof createReal>

function createReal() {
  let draft: NoteDraft | null = null
  let nextFailure: Failure = null
  let note = initialNote

  const drafts: NoteDraftRepository = {
    get: async () => draft,
    remove: async () => {
      if (nextFailure === "draft") {
        nextFailure = null
        throw new Error("draft storage failed")
      }
      draft = null
    },
    save: async (nextDraft) => {
      if (nextFailure === "draft") {
        nextFailure = null
        throw new Error("draft storage failed")
      }
      draft = nextDraft
      return nextDraft
    },
  }
  const notes: Pick<NoteRepository, "save"> = {
    save: async (nextNote) => {
      if (nextFailure === "note") {
        nextFailure = null
        throw new Error("note storage failed")
      }
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
    set failure(value: Failure) {
      nextFailure = value
    },
    state: createNoteContentSaveState(initialNote),
  }
}

function assertState(model: Model, real: Real) {
  assert.deepEqual(
    {
      content: real.note.content,
      contentRevision: real.note.contentRevision,
    },
    {
    content: model.content,
    contentRevision: model.contentRevision,
    },
  )
  assert.equal(real.state.status, model.status)
  assert.equal(real.state.pendingContent, model.pending?.content ?? null)
  assert.equal(real.draft?.content ?? null, model.draft)
}

class EditCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly content: string) {}

  check = () => true

  async run(model: Model) {
    model.currentInput = this.content
  }

  toString = () => `edit(${JSON.stringify(this.content)})`
}

class FailNextSaveCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly failure: Exclude<Failure, null>) {}

  check = (model: Readonly<Model>) => model.pending === null

  async run(model: Model, real: Real) {
    model.failure = this.failure
    real.failure = this.failure
  }

  toString = () => `fail-next-${this.failure}-save`
}

class RequestSaveCommand implements fc.AsyncCommand<Model, Real> {
  check = (model: Readonly<Model>) => model.pending === null

  async run(model: Model, real: Real) {
    const result = real.begin(model.currentInput)
    real.state = result.state
    model.status = result.state.status
    model.pending = result.request
    assertState(model, real)
  }

  toString = () => "request-save"
}

class CompleteSaveCommand implements fc.AsyncCommand<Model, Real> {
  check = (model: Readonly<Model>) => model.pending !== null

  async run(model: Model, real: Real) {
    const pending = model.pending
    if (pending === null) {
      throw new Error("A pending save is required")
    }

    const result = await real.complete(pending)
    model.pending = null

    if (result.status === "failure") {
      real.state = failNoteContentSave(real.state)
      model.status = "failure"
      model.draft = result.reason === "note-storage" ? pending.content : null
    } else {
      real.state = completeNoteContentSave(real.state, result.note)
      model.status = "idle"
      model.draft = null
      if (result.status === "saved") {
        model.content = pending.content
        model.contentRevision += 1
      }
    }

    assertState(model, real)
  }

  toString = () => "complete-save"
}

class InspectRecoveryCommand implements fc.AsyncCommand<Model, Real> {
  check = () => true

  async run(model: Model, real: Real) {
    if (real.draft === null) {
      assert.equal(model.draft, null)
      return
    }

    assert.equal(
      isRecoverableNoteDraft(real.draft, real.note),
      model.draft !== null,
    )
  }

  toString = () => "inspect-recovery"
}

const commands = [
  fc.string({ maxLength: 24 }).map((content) => new EditCommand(content)),
  fc.constant(new RequestSaveCommand()),
  fc.constant(new CompleteSaveCommand()),
  fc.constant(new InspectRecoveryCommand()),
  fc.constant(new FailNextSaveCommand("draft")),
  fc.constant(new FailNextSaveCommand("note")),
]

function createState() {
  return {
    model: {
      content: initialNote.content,
      contentRevision: initialNote.contentRevision,
      currentInput: initialNote.content,
      draft: null,
      failure: null,
      pending: null,
      status: "idle" as const,
    },
    real: createReal(),
  }
}

function run(commandsToRun: Iterable<fc.AsyncCommand<Model, Real>>) {
  return fc.asyncModelRun(
    createState,
    commandsToRun,
  )
}

async function runSequence(commandsToRun: readonly fc.AsyncCommand<Model, Real>[]) {
  const { model, real } = createState()

  for (const command of commandsToRun) {
    assert.equal(command.check(model), true)
    await command.run(model, real)
  }
}

describe("메모 저장 모델", () => {
  it("저장과 초안 복구의 행동 순서를 실제 명령으로 탐색한다", async () => {
    await expect(
      fc.assert(
        fc.asyncProperty(
          fc.commands(commands, { maxCommands: noteModelSettings.maxCommands }),
          run,
        ),
        {
          interruptAfterTimeLimit: noteModelSettings.interruptAfterTimeLimit,
          numRuns: noteModelSettings.numRuns,
        },
      ),
    ).resolves.toBeUndefined()
  })

  it("저장 중 새 입력, 메모 저장 실패와 재시도를 구분한다", async () => {
    await expect(runSequence([
      new EditCommand("A"),
      new RequestSaveCommand(),
      new EditCommand("B"),
      new CompleteSaveCommand(),
      new FailNextSaveCommand("note"),
      new RequestSaveCommand(),
      new CompleteSaveCommand(),
      new InspectRecoveryCommand(),
      new RequestSaveCommand(),
      new CompleteSaveCommand(),
    ])).resolves.toBeUndefined()
  })
})
