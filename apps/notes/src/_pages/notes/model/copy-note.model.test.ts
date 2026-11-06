import assert from "node:assert/strict"

import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { reviseNote, type Note } from "@/entities/note"
import type { ClipboardWriter } from "@/shared/lib/clipboard"
import { noteModelSettings } from "@/shared/lib/note-model-settings"

import { copyNote } from "./copy-note"

const initialNote: Note = {
  content: "복사할 원문",
  createdAt: Date.parse("2026-09-01T00:00:00.000Z"),
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: "note-copy-model",
  tabIndex: 1000,
  updatedAt: Date.parse("2026-09-01T00:00:00.000Z"),
}

type Defect = "write-empty-content" | null
type Failure = "clipboard" | null

type CopySnapshot = {
  content: string
  id: string
}

type Model = {
  copied: CopySnapshot[]
  failure: Failure
  note: CopySnapshot
}

type Real = ReturnType<typeof createReal>

function snapshotNote(note: Note): CopySnapshot {
  return {
    content: note.content,
    id: note.id,
  }
}

function createReal(defect: Defect = null) {
  let nextFailure: Failure = null
  let note = { ...initialNote, geometry: { ...initialNote.geometry } }
  const copied: string[] = []
  const clipboard: ClipboardWriter = {
    writeText: async (text) => {
      if (nextFailure === "clipboard") {
        nextFailure = null
        return { reason: "write-failed", status: "failed" }
      }
      copied.push(defect === "write-empty-content" ? "" : text)
      return { status: "written" }
    },
  }
  return {
    clipboard,
    copied,
    get note() {
      return note
    },
    recordCommand() {},
    set failure(value: Failure) {
      nextFailure = value
    },
    set note(value: Note) {
      note = value
    },
  }
}

function createState(defect: Defect = null) {
  return {
    model: {
      copied: [],
      failure: null,
      note: snapshotNote(initialNote),
    },
    real: createReal(defect),
  }
}

function assertState(model: Model, real: Real) {
  assert.deepEqual(snapshotNote(real.note), model.note)
  assert.deepEqual(real.copied, model.copied.map(({ content }) => content))
}

class EditCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly content: string) {}

  check = () => true

  async run(model: Model, real: Real) {
    real.recordCommand()
    if (this.content !== model.note.content) {
      model.note = {
        ...model.note,
        content: this.content,
      }
    }
    real.note = reviseNote(real.note, {
      content: this.content,
      updatedAt: Date.parse("2026-09-01T00:00:01.000Z"),
    })
    assertState(model, real)
  }

  toString = () => `edit(${JSON.stringify(this.content)})`
}

class MoveNoteCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly x: number, readonly y: number) {}

  check = () => true

  async run(model: Model, real: Real) {
    real.recordCommand()
    real.note = reviseNote(real.note, {
      geometry: { ...real.note.geometry, x: this.x, y: this.y },
      updatedAt: Date.parse("2026-09-01T00:00:02.000Z"),
    })
    assertState(model, real)
  }

  toString = () => `move(${this.x}, ${this.y})`
}

class FailNextCopyCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly failure: Exclude<Failure, null>) {}

  check = () => true

  async run(model: Model, real: Real) {
    real.recordCommand()
    model.failure = this.failure
    real.failure = this.failure
  }

  toString = () => `fail-next-${this.failure}`
}

class CopyCommand implements fc.AsyncCommand<Model, Real> {
  check = () => true

  async run(model: Model, real: Real) {
    real.recordCommand()
    const copy = { ...model.note }
    const failure = model.failure
    const result = await copyNote(
      real.clipboard,
      real.note,
    )

    if (failure === "clipboard") {
      assert.deepEqual(result, { reason: "write-failed", status: "clipboard-failure" })
    } else {
      model.copied.push(copy)
      assert.deepEqual(result, { status: "copied" })
    }

    model.failure = null
    assertState(model, real)
  }

  toString = () => "copy"
}

const commands = [
  fc.string({ maxLength: 24 }).map((content) => new EditCommand(content)),
  fc
    .tuple(
      fc.integer({ min: -10_000, max: 10_000 }),
      fc.integer({ min: -10_000, max: 10_000 }),
    )
    .map(([x, y]) => new MoveNoteCommand(x, y)),
  fc.constant(new CopyCommand()),
  fc.constant(new FailNextCopyCommand("clipboard")),
]

async function runCommands(
  commandsToRun: Iterable<fc.AsyncCommand<Model, Real>>,
  defect: Defect = null,
) {
  let executedCommands = 0

  await fc.asyncModelRun(() => {
    const state = createState(defect)
    const record = state.real.recordCommand.bind(state.real)
    state.real.recordCommand = () => {
      executedCommands += 1
      record()
    }
    return state
  }, commandsToRun)

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

function copySequence(content: string) {
  return [new EditCommand(content), new CopyCommand()] as const
}

describe("메모 개별 복사 모델", () => {
  it("편집과 이동 뒤에 복사한 원문과 복사 실패를 확인한다", async () => {
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
      `copy-note-model profile=local-fast generated=${details.numRuns} executed=${executedCommands} skipped=${details.numSkips}\n`,
    )
  })

  it("메모를 이동한 뒤에도 복사할 수 있고 실패한 복사를 재시도할 수 있다", async () => {
    await expect(
      runSequence([
        ...copySequence("A"),
        new MoveNoteCommand(100, -80),
        new CopyCommand(),
        new EditCommand("B"),
        new FailNextCopyCommand("clipboard"),
        new CopyCommand(),
        new CopyCommand(),
        new CopyCommand(),
      ]),
    ).resolves.toBeUndefined()
  })

  it("빈 원문을 복사하는 결함을 축소와 seed 재실행으로 검출한다", async () => {
    const property = fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 24 }),
      (content) => runSequence(copySequence(content), "write-empty-content"),
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
      `copy-note-model defect=write-empty-content seed=${details.seed} path=${details.counterexamplePath} shrinks=${details.numShrinks} input=${JSON.stringify(content)}\n`,
    )
    await expect(
      runSequence(copySequence(content), "write-empty-content"),
    ).rejects.toThrow()
  })
})
