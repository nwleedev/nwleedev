import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { NoteRecordSchema, reviseNote, type Note, type NoteChange } from "./note"

const originalNote = {
  content: "첫 메모",
  createdAt: Date.parse("2026-08-31T01:00:00.000Z"),
  geometry: {
    height: 240,
    width: 320,
    x: 40,
    y: 60,
    zIndex: 1,
  },
  id: "note-1",
  tabIndex: 1000,
  updatedAt: Date.parse("2026-08-31T01:00:00.000Z"),
}

describe("reviseNote", () => {
  it("records the changed text", () => {
    const revised = reviseNote(originalNote, {
      content: "수정한 메모",
      updatedAt: Date.parse("2026-08-31T02:00:00.000Z"),
    })

    expect(revised).toMatchObject({
      content: "수정한 메모",
    })
  })

  it("preserves content when only geometry changes", () => {
    const revised = reviseNote(originalNote, {
      geometry: { ...originalNote.geometry, x: 80 },
      updatedAt: Date.parse("2026-08-31T02:00:00.000Z"),
    })

    expect(revised).toMatchObject({
      geometry: { x: 80 },
      content: originalNote.content,
    })
  })

  it("records a text edit together with its new geometry", () => {
    const revised = reviseNote(originalNote, {
      content: "수정한 메모",
      geometry: { ...originalNote.geometry, width: 400 },
      updatedAt: Date.parse("2026-08-31T02:00:00.000Z"),
    })

    expect(revised).toMatchObject({
      content: "수정한 메모",
    })
  })

  it("returns the original note for an unchanged value", () => {
    const revised = reviseNote(originalNote, {
      content: originalNote.content,
      geometry: originalNote.geometry,
      updatedAt: Date.parse("2026-08-31T02:00:00.000Z"),
    })

    expect(revised).toEqual(originalNote)
  })
})

describe("NoteRecordSchema", () => {
  it("accepts a complete note record", () => {
    expect(NoteRecordSchema.safeParse(originalNote).success).toBe(true)
  })

  it("rejects a record with a missing field", () => {
    const incompleteRecord = {
      content: originalNote.content,
      createdAt: originalNote.createdAt,
      id: originalNote.id,
      updatedAt: originalNote.updatedAt,
    }

    expect(NoteRecordSchema.safeParse(incompleteRecord).success).toBe(false)
  })

  it("rejects a blank identifier", () => {
    expect(
      NoteRecordSchema.safeParse({ ...originalNote, id: "   " }).success,
    ).toBe(false)
  })

  it.each([999, 32768, 1000.5])(
    "rejects a keyboard order outside the note range",
    (tabIndex) => {
      expect(
        NoteRecordSchema.safeParse({ ...originalNote, tabIndex }).success,
      ).toBe(false)
    },
  )

  it("accepts positions outside the logical canvas", () => {
    expect(
      NoteRecordSchema.safeParse({
        ...originalNote,
        geometry: { ...originalNote.geometry, x: 0, y: -5000 },
      }).success,
    ).toBe(true)
  })

  it("rejects geometry with a dimension outside its supported range", () => {
    expect(
      NoteRecordSchema.safeParse({
        ...originalNote,
        geometry: { ...originalNote.geometry, width: 4096 },
      }).success,
    ).toBe(false)
  })
})

type EditExpectation = {
  content: string
  x: number
}

type EditExecution = {
  actions: string[]
  note: Note
  revise: typeof reviseNote
}

class EditMismatch extends Error {
  constructor(
    readonly expected: EditExpectation,
    readonly observed: EditExpectation,
  ) {
    super("Note content or position differs from the applied inputs")
  }
}

function expectEdit(model: EditExpectation, real: EditExecution) {
  const observed = {
    content: real.note.content,
    x: real.note.geometry.x,
  }

  if (
    observed.content !== model.content ||
    observed.x !== model.x
  ) {
    throw new EditMismatch({ ...model }, observed)
  }
}

class ReplaceContent implements fc.Command<EditExpectation, EditExecution> {
  constructor(private readonly content: string) {}

  check() {
    return true
  }

  run(model: EditExpectation, real: EditExecution) {
    real.actions.push(this.toString())
    real.note = real.revise(real.note, {
      content: this.content,
      updatedAt: originalNote.updatedAt,
    })
    model.content = this.content
    expectEdit(model, real)
  }

  toString() {
    return `replace(${JSON.stringify(this.content)})`
  }
}

class MoveX implements fc.Command<EditExpectation, EditExecution> {
  constructor(private readonly x: number) {}

  check() {
    return true
  }

  run(model: EditExpectation, real: EditExecution) {
    real.actions.push(this.toString())
    real.note = real.revise(real.note, {
      geometry: { ...real.note.geometry, x: this.x },
      updatedAt: originalNote.updatedAt,
    })
    model.x = this.x
    expectEdit(model, real)
  }

  toString() {
    return `move-x(${this.x})`
  }
}

class ReapplyContent implements fc.Command<EditExpectation, EditExecution> {
  check() {
    return true
  }

  run(model: EditExpectation, real: EditExecution) {
    real.actions.push(this.toString())
    real.note = real.revise(real.note, {
      content: model.content,
      updatedAt: originalNote.updatedAt,
    })
    expectEdit(model, real)
  }

  toString() {
    return "reapply-content"
  }
}

const contentAction = fc.string({ maxLength: 16 }).map(
  (content) => new ReplaceContent(content),
)
const spacedAction = fc.string({ maxLength: 16 }).map(
  (content) => new ReplaceContent(` ${content} `),
)
const multilineAction = fc
  .tuple(fc.string({ maxLength: 8 }), fc.string({ maxLength: 8 }))
  .map(([first, second]) => new ReplaceContent(`${first}\n${second}`))
const editActions = [
  contentAction,
  spacedAction,
  multilineAction,
  fc.webUrl().map((content) => new ReplaceContent(content)),
  fc.constant(new ReplaceContent(originalNote.content)),
  fc.constant(new ReapplyContent()),
  fc.integer({ min: -50, max: 50 }).map((x) => new MoveX(x)),
]
const maxEditCommands = 8

function runEditCommands(
  commands: Iterable<fc.Command<EditExpectation, EditExecution>>,
  revise: typeof reviseNote,
  failures?: {
    actions: string[]
    expected: EditExpectation
    observed: EditExpectation
  }[],
) {
  const note = NoteRecordSchema.parse(originalNote)
  const model: EditExpectation = {
    content: note.content,
    x: note.geometry.x,
  }
  const real: EditExecution = { actions: [], note, revise }

  try {
    fc.modelRun(() => ({ model, real }), commands)
  } catch (error) {
    if (error instanceof EditMismatch) {
      failures?.push({
        actions: [...real.actions],
        expected: error.expected,
        observed: error.observed,
      })
    }
    throw error
  }
}

function editReplay(
  details: fc.RunDetails<[
    Iterable<fc.Command<EditExpectation, EditExecution>>,
  ]>,
) {
  const commands = details.counterexample?.[0]
  const path = details.counterexamplePath
  if (commands === undefined || path === null) {
    throw new Error("Missing reduced edit sequence")
  }

  const replayPath = String(commands).match(/\/\*replayPath="([^"]+)"\*\//u)?.[1]
  if (replayPath === undefined) {
    throw new Error("Missing edit command replay path")
  }

  return { commands, path, replayPath }
}

const trimEdit: typeof reviseNote = (note, change: NoteChange) =>
  reviseNote(note, {
    ...change,
    content: change.content?.trim(),
  })

const geometryEdit: typeof reviseNote = (note, change: NoteChange) => {
  const revised = reviseNote(note, change)
  if (change.geometry === undefined || revised === note) {
    return revised
  }
  return { ...revised, content: "" }
}

describe("text and movement action sequences", () => {
  it("preserves the chosen content when moving the note", () => {
    const details = fc.check(
      fc.property(
        fc.commands(editActions, { maxCommands: maxEditCommands }),
        (commands) => runEditCommands(commands, reviseNote),
      ),
      { numRuns: 100 },
    )
    expect(details.failed).toBe(false)
  })

  it("shrinks text loss during editing and movement", () => {
    for (const [name, defectiveEdit] of [
      ["trim-content", trimEdit],
      ["geometry-clears-content", geometryEdit],
    ] as const) {
      const failures: {
        actions: string[]
        expected: EditExpectation
        observed: EditExpectation
      }[] = []
      const details = fc.check(
        fc.property(
          fc.commands(editActions, { maxCommands: maxEditCommands }),
          (commands) => runEditCommands(commands, defectiveEdit, failures),
        ),
        { numRuns: 100 },
      )

      expect(details.failed).toBe(true)
      expect(details.errorInstance).toBeInstanceOf(EditMismatch)
      const reduced = editReplay(details)
      const replay = fc.check(
        fc.property(
          fc.commands(editActions, {
            maxCommands: maxEditCommands,
            replayPath: reduced.replayPath,
          }),
          (commands) => runEditCommands(commands, defectiveEdit),
        ),
        {
          endOnFailure: true,
          numRuns: 1,
          path: reduced.path,
          seed: details.seed,
        },
      )

      expect(replay.failed).toBe(true)
      expect(replay.errorInstance).toBeInstanceOf(EditMismatch)
      const directCommands = [...reduced.commands]
      const reproduced: typeof failures = []
      expect(() => runEditCommands(directCommands, defectiveEdit, reproduced)).toThrowError(
        EditMismatch,
      )
      expect(reproduced).toHaveLength(1)
      expect(reproduced[0].actions.length).toBeLessThanOrEqual(failures[0].actions.length)
      expect(() => runEditCommands(directCommands, reviseNote)).not.toThrow()
      process.stdout.write(`${JSON.stringify({
        classification: "controlled-domain-defect",
        feature: "note-content-editing",
        firstFailure: failures[0],
        layer: "note-domain",
        name,
        path: reduced.path,
        reducedFailure: failures.at(-1),
        replayPath: reduced.replayPath,
        seed: details.seed,
        shrinks: details.numShrinks,
        toolVersion: fc.__version,
      })}\n`)
    }
  })
})
