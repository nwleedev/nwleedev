import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { NoteRecordSchema, reviseNote, type Note, type NoteRevision } from "./note"

const originalNote = {
  content: "첫 메모",
  contentRevision: 2,
  createdAt: "2026-08-31T01:00:00.000Z",
  geometry: {
    height: 240,
    width: 320,
    x: 40,
    y: 60,
    zIndex: 1,
  },
  id: "note-1",
  revision: 4,
  tabIndex: 1000,
  updatedAt: "2026-08-31T01:00:00.000Z",
}

describe("reviseNote", () => {
  it("increments both revisions when content changes", () => {
    const revised = reviseNote(originalNote, {
      content: "수정한 메모",
      updatedAt: "2026-08-31T02:00:00.000Z",
    })

    expect(revised).toMatchObject({
      contentRevision: 3,
      revision: 5,
    })
  })

  it("keeps the content revision when only geometry changes", () => {
    const revised = reviseNote(originalNote, {
      geometry: { ...originalNote.geometry, x: 80 },
      updatedAt: "2026-08-31T02:00:00.000Z",
    })

    expect(revised).toMatchObject({
      contentRevision: 2,
      revision: 5,
    })
  })

  it("increments each revision once when content and geometry change together", () => {
    const revised = reviseNote(originalNote, {
      content: "수정한 메모",
      geometry: { ...originalNote.geometry, width: 400 },
      updatedAt: "2026-08-31T02:00:00.000Z",
    })

    expect(revised).toMatchObject({
      contentRevision: 3,
      revision: 5,
    })
  })

  it("does not create a revision for an unchanged value", () => {
    const revised = reviseNote(originalNote, {
      content: originalNote.content,
      geometry: originalNote.geometry,
      updatedAt: "2026-08-31T02:00:00.000Z",
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
      contentRevision: originalNote.contentRevision,
      createdAt: originalNote.createdAt,
      id: originalNote.id,
      revision: originalNote.revision,
      updatedAt: originalNote.updatedAt,
    }

    expect(NoteRecordSchema.safeParse(incompleteRecord).success).toBe(false)
  })

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects an invalid revision",
    (revision) => {
      expect(
        NoteRecordSchema.safeParse({ ...originalNote, revision }).success,
      ).toBe(false)
    },
  )

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

type RevisionExpectation = {
  content: string
  contentRevision: number
  revision: number
  x: number
}

type RevisionExecution = {
  actions: string[]
  note: Note
  revise: typeof reviseNote
}

class RevisionMismatch extends Error {
  constructor(
    readonly expected: RevisionExpectation,
    readonly observed: RevisionExpectation,
  ) {
    super("Note content or revision differs from the applied inputs")
  }
}

function expectRevision(model: RevisionExpectation, real: RevisionExecution) {
  const observed = {
    content: real.note.content,
    contentRevision: real.note.contentRevision,
    revision: real.note.revision,
    x: real.note.geometry.x,
  }

  if (
    observed.content !== model.content ||
    observed.contentRevision !== model.contentRevision ||
    observed.revision !== model.revision ||
    observed.x !== model.x
  ) {
    throw new RevisionMismatch({ ...model }, observed)
  }
}

class ReplaceContent implements fc.Command<RevisionExpectation, RevisionExecution> {
  constructor(private readonly content: string) {}

  check() {
    return true
  }

  run(model: RevisionExpectation, real: RevisionExecution) {
    real.actions.push(this.toString())
    const changed = this.content !== model.content
    real.note = real.revise(real.note, {
      content: this.content,
      updatedAt: originalNote.updatedAt,
    })
    model.content = this.content
    if (changed) {
      model.contentRevision += 1
      model.revision += 1
    }
    expectRevision(model, real)
  }

  toString() {
    return `replace(${JSON.stringify(this.content)})`
  }
}

class MoveX implements fc.Command<RevisionExpectation, RevisionExecution> {
  constructor(private readonly x: number) {}

  check() {
    return true
  }

  run(model: RevisionExpectation, real: RevisionExecution) {
    real.actions.push(this.toString())
    const changed = this.x !== model.x
    real.note = real.revise(real.note, {
      geometry: { ...real.note.geometry, x: this.x },
      updatedAt: originalNote.updatedAt,
    })
    model.x = this.x
    if (changed) {
      model.revision += 1
    }
    expectRevision(model, real)
  }

  toString() {
    return `move-x(${this.x})`
  }
}

class ReapplyContent implements fc.Command<RevisionExpectation, RevisionExecution> {
  check() {
    return true
  }

  run(model: RevisionExpectation, real: RevisionExecution) {
    real.actions.push(this.toString())
    real.note = real.revise(real.note, {
      content: model.content,
      updatedAt: originalNote.updatedAt,
    })
    expectRevision(model, real)
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
const revisionActions = [
  contentAction,
  spacedAction,
  multilineAction,
  fc.webUrl().map((content) => new ReplaceContent(content)),
  fc.constant(new ReplaceContent(originalNote.content)),
  fc.constant(new ReapplyContent()),
  fc.integer({ min: -50, max: 50 }).map((x) => new MoveX(x)),
]
const maxRevisionCommands = 8

function runRevisionCommands(
  commands: Iterable<fc.Command<RevisionExpectation, RevisionExecution>>,
  revise: typeof reviseNote,
  failures?: {
    actions: string[]
    expected: RevisionExpectation
    observed: RevisionExpectation
  }[],
) {
  const note = NoteRecordSchema.parse(originalNote)
  const model: RevisionExpectation = {
    content: note.content,
    contentRevision: note.contentRevision,
    revision: note.revision,
    x: note.geometry.x,
  }
  const real: RevisionExecution = { actions: [], note, revise }

  try {
    fc.modelRun(() => ({ model, real }), commands)
  } catch (error) {
    if (error instanceof RevisionMismatch) {
      failures?.push({
        actions: [...real.actions],
        expected: error.expected,
        observed: error.observed,
      })
    }
    throw error
  }
}

function revisionReplay(
  details: fc.RunDetails<[
    Iterable<fc.Command<RevisionExpectation, RevisionExecution>>,
  ]>,
) {
  const commands = details.counterexample?.[0]
  const path = details.counterexamplePath
  if (commands === undefined || path === null) {
    throw new Error("Missing reduced revision sequence")
  }

  const replayPath = String(commands).match(/\/\*replayPath="([^"]+)"\*\//u)?.[1]
  if (replayPath === undefined) {
    throw new Error("Missing revision command replay path")
  }

  return { commands, path, replayPath }
}

const trimRevision: typeof reviseNote = (note, change: NoteRevision) =>
  reviseNote(note, {
    ...change,
    content: change.content?.trim(),
  })

const geometryRevision: typeof reviseNote = (note, change: NoteRevision) => {
  const revised = reviseNote(note, change)
  if (change.geometry === undefined || revised.revision === note.revision) {
    return revised
  }
  return { ...revised, contentRevision: revised.contentRevision + 1 }
}

describe("content and revision action sequences", () => {
  it("preserves the chosen content and changes its revision only for edits", () => {
    const details = fc.check(
      fc.property(
        fc.commands(revisionActions, { maxCommands: maxRevisionCommands }),
        (commands) => runRevisionCommands(commands, reviseNote),
      ),
      { numRuns: 100 },
    )
    expect(details.failed).toBe(false)
  })

  it("shrinks content loss and geometry-only revision changes", () => {
    for (const [name, defectiveRevision] of [
      ["trim-content", trimRevision],
      ["geometry-revision", geometryRevision],
    ] as const) {
      const failures: {
        actions: string[]
        expected: RevisionExpectation
        observed: RevisionExpectation
      }[] = []
      const details = fc.check(
        fc.property(
          fc.commands(revisionActions, { maxCommands: maxRevisionCommands }),
          (commands) => runRevisionCommands(commands, defectiveRevision, failures),
        ),
        { numRuns: 100 },
      )

      expect(details.failed).toBe(true)
      expect(details.errorInstance).toBeInstanceOf(RevisionMismatch)
      expect(details.numShrinks).toBeGreaterThan(0)
      const reduced = revisionReplay(details)
      const replay = fc.check(
        fc.property(
          fc.commands(revisionActions, {
            maxCommands: maxRevisionCommands,
            replayPath: reduced.replayPath,
          }),
          (commands) => runRevisionCommands(commands, defectiveRevision),
        ),
        {
          endOnFailure: true,
          numRuns: 1,
          path: reduced.path,
          seed: details.seed,
        },
      )

      expect(replay.failed).toBe(true)
      expect(replay.errorInstance).toBeInstanceOf(RevisionMismatch)
      const directCommands = [...reduced.commands]
      expect(() => runRevisionCommands(directCommands, defectiveRevision)).toThrowError(
        RevisionMismatch,
      )
      expect(() => runRevisionCommands(directCommands, reviseNote)).not.toThrow()
      process.stdout.write(`${JSON.stringify({
        classification: "controlled-domain-defect",
        feature: "note-content-revision",
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
