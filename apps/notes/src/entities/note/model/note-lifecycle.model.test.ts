import assert from "node:assert/strict"

import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { noteModelSettings } from "@/shared/lib/note-model-settings"

import type { Note } from "./note"
import { reviseNote } from "./note"
import { findNewNoteGeometry } from "./note-geometry"
import { sendNoteToBack, sendNoteToFront } from "./note-order"
import {
  createNoteRemovalHistory,
  expireNoteRemoval,
  rememberRemovedNote,
  restoreMostRecentlyRemovedNote,
  type NoteRemovalHistory,
} from "./note-removal-history"

const initialNotes: readonly Note[] = [
  {
    content: "첫 번째",
    contentRevision: 0,
    createdAt: "2026-09-01T00:00:00.000Z",
    geometry: { height: 240, width: 320, x: 32, y: 32, zIndex: 1 },
    id: "note-1",
    revision: 0,
    tabIndex: 1000,
    updatedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    content: "두 번째",
    contentRevision: 0,
    createdAt: "2026-09-01T00:00:01.000Z",
    geometry: { height: 240, width: 320, x: 384, y: 32, zIndex: 2 },
    id: "note-2",
    revision: 0,
    tabIndex: 1001,
    updatedAt: "2026-09-01T00:00:01.000Z",
  },
  {
    content: "세 번째",
    contentRevision: 0,
    createdAt: "2026-09-01T00:00:02.000Z",
    geometry: { height: 240, width: 320, x: 736, y: 32, zIndex: 3 },
    id: "note-3",
    revision: 0,
    tabIndex: 1002,
    updatedAt: "2026-09-01T00:00:02.000Z",
  },
]

type Model = {
  notes: Array<Pick<Note, "contentRevision" | "id" | "tabIndex">>
  removed: Array<Pick<Note, "contentRevision" | "id" | "tabIndex">>
}

type Real = {
  history: NoteRemovalHistory
  notes: Note[]
}

function timestamp() {
  return "2026-09-01T00:00:10.000Z"
}

function createState() {
  return {
    model: {
      notes: initialNotes.map(({ contentRevision, id, tabIndex }) => ({
        contentRevision,
        id,
        tabIndex,
      })),
      removed: [],
    },
    real: { history: createNoteRemovalHistory(), notes: [...initialNotes] },
  }
}

function assertState(model: Model, real: Real) {
  assert.deepEqual(
    real.notes
      .map(({ contentRevision, id, tabIndex }) => ({
        contentRevision,
        id,
        tabIndex,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    [...model.notes].sort((left, right) => left.id.localeCompare(right.id)),
  )
  const zIndexes = real.notes.map(({ geometry }) => geometry.zIndex)
  assert.equal(zIndexes.every((value) => value > 0), true)
  assert.deepEqual(
    real.history.entries.map(({ note }) => note.id),
    model.removed.map(({ id }) => id),
  )
}

class MoveToFrontCommand implements fc.Command<Model, Real> {
  constructor(readonly position: number) {}

  check = (model: Readonly<Model>) => model.notes.length > 0

  run(model: Model, real: Real) {
    const note = model.notes[this.position % model.notes.length]
    if (note === undefined) {
      throw new Error("Expected a note to move")
    }
    real.notes = sendNoteToFront(real.notes, note.id, timestamp())
    assert.equal(
      real.notes.find(({ id }) => id === note.id)?.geometry.zIndex,
      real.notes.length,
    )
    assertState(model, real)
  }

  toString = () => `move-to-front(${this.position})`
}

class MoveToBackCommand implements fc.Command<Model, Real> {
  constructor(readonly position: number) {}

  check = (model: Readonly<Model>) => model.notes.length > 0

  run(model: Model, real: Real) {
    const note = model.notes[this.position % model.notes.length]
    if (note === undefined) {
      throw new Error("Expected a note to move")
    }
    real.notes = sendNoteToBack(real.notes, note.id, timestamp())
    assert.equal(real.notes.find(({ id }) => id === note.id)?.geometry.zIndex, 1)
    assertState(model, real)
  }

  toString = () => `move-to-back(${this.position})`
}

class MoveGeometryCommand implements fc.Command<Model, Real> {
  constructor(readonly position: number, readonly x: number, readonly y: number) {}

  check = (model: Readonly<Model>) => model.notes.length > 0

  run(model: Model, real: Real) {
    const note = real.notes[this.position % real.notes.length]
    if (note === undefined) {
      throw new Error("Expected a note to move")
    }
    real.notes = real.notes.map((current) =>
      current.id === note.id
        ? reviseNote(current, {
            geometry: { ...current.geometry, x: this.x, y: this.y },
            updatedAt: timestamp(),
          })
        : current,
    )
    assertState(model, real)
  }

  toString = () => `move-geometry(${this.position}, ${this.x}, ${this.y})`
}

class RemoveCommand implements fc.Command<Model, Real> {
  constructor(readonly position: number) {}

  check = (model: Readonly<Model>) => model.notes.length > 0

  run(model: Model, real: Real) {
    const index = this.position % model.notes.length
    const modelNote = model.notes[index]
    const note = real.notes.find(({ id }) => id === modelNote?.id)
    if (modelNote === undefined || note === undefined) {
      throw new Error("Expected a note to remove")
    }
    model.notes.splice(index, 1)
    model.removed.push(modelNote)
    real.notes = real.notes.filter(({ id }) => id !== note.id)
    real.history = rememberRemovedNote(real.history, note, timestamp())
    assertState(model, real)
  }

  toString = () => `remove(${this.position})`
}

class RestoreCommand implements fc.Command<Model, Real> {
  check = (model: Readonly<Model>) => model.removed.length > 0

  run(model: Model, real: Real) {
    const expected = model.removed.pop()
    const restored = restoreMostRecentlyRemovedNote(real.history)
    if (expected === undefined || restored === null) {
      throw new Error("Expected a note to restore")
    }
    model.notes.push(expected)
    real.history = restored.history
    real.notes.push(restored.note)
    assertState(model, real)
  }

  toString = () => "restore-most-recent"
}

const commands = [
  fc.nat().map((position) => new MoveToFrontCommand(position)),
  fc.nat().map((position) => new MoveToBackCommand(position)),
  fc
    .tuple(fc.nat(), fc.integer(), fc.integer())
    .map(([position, x, y]) => new MoveGeometryCommand(position, x, y)),
  fc.nat().map((position) => new RemoveCommand(position)),
  fc.constant(new RestoreCommand()),
]

describe("메모 생명 주기 모델", () => {
  it("배치, 삭제와 복원의 행동 순서를 실제 도메인 규칙으로 탐색한다", () => {
    fc.assert(
      fc.property(
        fc.commands(commands, { maxCommands: noteModelSettings.maxCommands }),
        (commandsToRun) => fc.modelRun(createState, commandsToRun),
      ),
      {
        interruptAfterTimeLimit: noteModelSettings.interruptAfterTimeLimit,
        numRuns: noteModelSettings.numRuns,
      },
    )
    expect(true).toBe(true)
  })

  it("새 메모의 기본 위치와 만료된 삭제 이력을 구분한다", () => {
    const geometry = findNewNoteGeometry(initialNotes.map(({ geometry }) => geometry))
    const history = rememberRemovedNote(
      createNoteRemovalHistory(),
      initialNotes[0],
      "2026-09-01T00:00:00.000Z",
    )
    const snapshot = history.entries[0]

    expect(geometry).toMatchObject({ height: 240, width: 320, zIndex: 4 })
    expect(expireNoteRemoval(history, snapshot, 1_788_307_205_000).entries).toEqual(
      [],
    )
  })
})
