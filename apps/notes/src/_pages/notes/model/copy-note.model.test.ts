import assert from "node:assert/strict"

import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { reviseNote, type Note } from "@/entities/note"
import type { IndividualCopyUsageWriter } from "@/entities/usage"
import type { ClipboardWriter } from "@/shared/lib/clipboard"
import { noteModelSettings } from "@/shared/lib/note-model-settings"

import { copyNote } from "./copy-note"

const initialNote: Note = {
  content: "복사할 원문",
  contentRevision: 0,
  createdAt: "2026-09-01T00:00:00.000Z",
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: "note-copy-model",
  revision: 0,
  tabIndex: 1000,
  updatedAt: "2026-09-01T00:00:00.000Z",
}

type Failure = "clipboard" | "usage" | null

type Model = {
  copied: readonly { content: string; contentRevision: number }[]
  failure: Failure
  note: Note
  usageCount: number
}

type Real = ReturnType<typeof createReal>

function createReal() {
  let nextFailure: Failure = null
  const copied: string[] = []
  const usage: Parameters<IndividualCopyUsageWriter["recordIndividualCopy"]>[0][] = []
  const clipboard: ClipboardWriter = {
    writeText: async (text) => {
      if (nextFailure === "clipboard") {
        nextFailure = null
        return { reason: "write-failed", status: "failed" }
      }
      copied.push(text)
      return { status: "written" }
    },
  }
  const usageWriter: IndividualCopyUsageWriter = {
    recordIndividualCopy: async (input) => {
      if (nextFailure === "usage") {
        nextFailure = null
        throw new Error("usage storage failed")
      }
      usage.push(input)
    },
  }

  return {
    clipboard,
    copied,
    set failure(value: Failure) {
      nextFailure = value
    },
    usage,
    usageWriter,
  }
}

function createState() {
  return {
    model: { copied: [], failure: null, note: initialNote, usageCount: 0 },
    real: createReal(),
  }
}

function assertState(model: Model, real: Real) {
  assert.deepEqual(
    real.copied,
    model.copied.map(({ content }) => content),
  )
  assert.equal(real.usage.length, model.usageCount)
  for (const usage of real.usage) {
    assert.equal(usage.note.id, model.note.id)
    assert.equal(usage.note.contentRevision <= model.note.contentRevision, true)
  }
}

class EditCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly content: string) {}

  check = () => true

  async run(model: Model) {
    model.note = reviseNote(model.note, {
      content: this.content,
      updatedAt: "2026-09-01T00:00:01.000Z",
    })
  }

  toString = () => `edit(${JSON.stringify(this.content)})`
}

class FailNextCopyCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly failure: Exclude<Failure, null>) {}

  check = () => true

  async run(model: Model, real: Real) {
    model.failure = this.failure
    real.failure = this.failure
  }

  toString = () => `fail-next-${this.failure}`
}

class CopyCommand implements fc.AsyncCommand<Model, Real> {
  check = () => true

  async run(model: Model, real: Real) {
    const result = await copyNote(
      { clipboard: real.clipboard, usage: real.usageWriter },
      model.note,
    )

    if (model.failure === "clipboard") {
      assert.deepEqual(result, { reason: "write-failed", status: "clipboard-failure" })
    } else {
      model.copied = [
        ...model.copied,
        { content: model.note.content, contentRevision: model.note.contentRevision },
      ]
      if (model.failure === "usage") {
        assert.deepEqual(result, { status: "usage-failure" })
      } else {
        assert.deepEqual(result, { status: "copied" })
        model.usageCount += 1
      }
    }

    model.failure = null
    assertState(model, real)
  }

  toString = () => "copy"
}

const commands = [
  fc.string({ maxLength: 24 }).map((content) => new EditCommand(content)),
  fc.constant(new CopyCommand()),
  fc.constant(new FailNextCopyCommand("clipboard")),
  fc.constant(new FailNextCopyCommand("usage")),
]

describe("메모 개별 복사 모델", () => {
  it("원문, 원문 revision과 부분 실패를 실제 복사 명령으로 탐색한다", async () => {
    await expect(
      fc.assert(
        fc.asyncProperty(
          fc.commands(commands, { maxCommands: noteModelSettings.maxCommands }),
          (commandsToRun) => fc.asyncModelRun(createState, commandsToRun),
        ),
        {
          interruptAfterTimeLimit: noteModelSettings.interruptAfterTimeLimit,
          numRuns: noteModelSettings.numRuns,
        },
      ),
    ).resolves.toBeUndefined()
  })
})
