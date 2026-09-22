import assert from "node:assert/strict"

import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

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
  NOTE_HEIGHT_MAX,
  NOTE_HEIGHT_MIN,
  NOTE_WIDTH_MAX,
  NOTE_WIDTH_MIN,
  reviseNote,
  type Note,
  type NoteGeometry,
} from "./note"
import { findNewNoteGeometry } from "./note-geometry"
import { sendNoteToBack, sendNoteToFront } from "./note-order"
import {
  createNoteRemovalHistory,
  expireNoteRemoval,
  rememberRemovedNote,
  restoreMostRecentlyRemovedNote,
  type NoteRemovalHistory,
  type RemovedNoteSnapshot,
} from "./note-removal-history"

declare const __NOTES_GIT_REVISION__: string

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

type Defect = "change-restored-z-index" | null

type Model = {
  notes: Note[]
  removed: RemovedNoteSnapshot[]
}

type Real = {
  defect: Defect
  history: NoteRemovalHistory
  notes: Note[]
  recordCommand: () => void
}

const operationTimestamp = "2026-09-01T00:00:10.000Z"

function cloneNotes(notes: readonly Note[]) {
  return notes.map((note) => ({ ...note, geometry: { ...note.geometry } }))
}

function initialNoteAt(index: number) {
  return noteAt(initialNotes, index)
}

function noteAt(notes: readonly Note[], index: number) {
  const note = notes[index]
  if (note === undefined) {
    throw new Error("Expected a note")
  }

  return note
}

function latestRemoval(history: NoteRemovalHistory) {
  const snapshot = history.entries.at(-1)
  if (snapshot === undefined) {
    throw new Error("Expected a removed note")
  }

  return snapshot
}

function restoreRequired(history: NoteRemovalHistory) {
  const restored = restoreMostRecentlyRemovedNote(history)
  if (restored === null) {
    throw new Error("Expected a restored note")
  }

  return restored
}

function createState(defect: Defect = null) {
  return {
    model: { notes: cloneNotes(initialNotes), removed: [] },
    real: {
      defect,
      history: createNoteRemovalHistory(),
      notes: cloneNotes(initialNotes),
      recordCommand() {},
    },
  }
}

function orderById(notes: readonly Note[]) {
  return [...notes].sort((left, right) => left.id.localeCompare(right.id))
}

function noteObservation(note: Note) {
  return {
    content: note.content,
    contentRevision: note.contentRevision,
    createdAt: note.createdAt,
    geometry: note.geometry,
    id: note.id,
    tabIndex: note.tabIndex,
  }
}

function removalObservation(snapshot: RemovedNoteSnapshot) {
  return { note: noteObservation(snapshot.note), removedAt: snapshot.removedAt }
}

function orderForStack(notes: readonly Note[]) {
  return [...notes].sort((left, right) => {
    const zIndexOrder = left.geometry.zIndex - right.geometry.zIndex
    if (zIndexOrder !== 0) {
      return zIndexOrder
    }

    const createdAtOrder = left.createdAt.localeCompare(right.createdAt)
    return createdAtOrder === 0 ? left.id.localeCompare(right.id) : createdAtOrder
  })
}

function hasSameGeometry(left: NoteGeometry, right: NoteGeometry) {
  return (
    left.height === right.height &&
    left.width === right.width &&
    left.x === right.x &&
    left.y === right.y &&
    left.zIndex === right.zIndex
  )
}

function reviseModelGeometry(note: Note, geometry: NoteGeometry) {
  if (hasSameGeometry(note.geometry, geometry)) {
    return note
  }

  return {
    ...note,
    geometry,
    revision: note.revision + 1,
    updatedAt: operationTimestamp,
  }
}

function moveModelNoteToStackEdge(
  notes: readonly Note[],
  noteId: string,
  edge: "back" | "front",
) {
  const ordered = orderForStack(notes)
  const targetIndex = ordered.findIndex((note) => note.id === noteId)

  if (targetIndex < 0) {
    return [...notes]
  }

  const [target] = ordered.splice(targetIndex, 1)
  if (target === undefined) {
    throw new Error("Expected a note to move")
  }

  if (edge === "front") {
    ordered.push(target)
  } else {
    ordered.unshift(target)
  }

  return ordered.map((note, index) =>
    reviseModelGeometry(note, { ...note.geometry, zIndex: index + 1 }),
  )
}

function assertState(model: Model, real: Real) {
  assert.deepEqual(
    orderById(real.notes).map(noteObservation),
    orderById(model.notes).map(noteObservation),
  )
  assert.deepEqual(
    real.history.entries.map(removalObservation),
    model.removed.map(removalObservation),
  )
  assert.equal(
    real.notes.every(({ geometry }) =>
      Number.isSafeInteger(geometry.zIndex) && geometry.zIndex > 0,
    ),
    true,
  )
}

class MoveToFrontCommand implements fc.Command<Model, Real> {
  constructor(readonly position: number) {}

  check = (model: Readonly<Model>) => model.notes.length > 0

  run(model: Model, real: Real) {
    real.recordCommand()
    const note = model.notes[this.position % model.notes.length]
    if (note === undefined) {
      throw new Error("Expected a note to move")
    }

    model.notes = moveModelNoteToStackEdge(model.notes, note.id, "front")
    real.notes = sendNoteToFront(real.notes, note.id, operationTimestamp)
    assertState(model, real)
  }

  toString = () => `move-to-front(${this.position})`
}

class MoveToBackCommand implements fc.Command<Model, Real> {
  constructor(readonly position: number) {}

  check = (model: Readonly<Model>) => model.notes.length > 0

  run(model: Model, real: Real) {
    real.recordCommand()
    const note = model.notes[this.position % model.notes.length]
    if (note === undefined) {
      throw new Error("Expected a note to move")
    }

    model.notes = moveModelNoteToStackEdge(model.notes, note.id, "back")
    real.notes = sendNoteToBack(real.notes, note.id, operationTimestamp)
    assertState(model, real)
  }

  toString = () => `move-to-back(${this.position})`
}

class UpdateGeometryCommand implements fc.Command<Model, Real> {
  constructor(
    readonly position: number,
    readonly x: number,
    readonly y: number,
    readonly width: number,
    readonly height: number,
  ) {}

  check = (model: Readonly<Model>) => model.notes.length > 0

  run(model: Model, real: Real) {
    real.recordCommand()
    const note = model.notes[this.position % model.notes.length]
    if (note === undefined) {
      throw new Error("Expected a note to move")
    }

    const geometry = {
      ...note.geometry,
      height: this.height,
      width: this.width,
      x: this.x,
      y: this.y,
    }
    model.notes = model.notes.map((current) =>
      current.id === note.id ? reviseModelGeometry(current, geometry) : current,
    )
    real.notes = real.notes.map((current) =>
      current.id === note.id
        ? reviseNote(current, { geometry, updatedAt: operationTimestamp })
        : current,
    )
    assertState(model, real)
  }

  toString = () =>
    `update-geometry(${this.position}, ${this.x}, ${this.y}, ${this.width}, ${this.height})`
}

class RemoveCommand implements fc.Command<Model, Real> {
  constructor(readonly position: number) {}

  check = (model: Readonly<Model>) => model.notes.length > 0

  run(model: Model, real: Real) {
    real.recordCommand()
    const index = this.position % model.notes.length
    const note = model.notes[index]
    if (note === undefined) {
      throw new Error("Expected a note to remove")
    }

    model.notes.splice(index, 1)
    model.removed.push({ note, removedAt: operationTimestamp })
    real.notes = real.notes.filter((current) => current.id !== note.id)
    real.history = rememberRemovedNote(real.history, note, operationTimestamp)
    assertState(model, real)
  }

  toString = () => `remove(${this.position})`
}

class RestoreCommand implements fc.Command<Model, Real> {
  check = (model: Readonly<Model>) => model.removed.length > 0

  run(model: Model, real: Real) {
    real.recordCommand()
    const expected = model.removed.pop()
    const restored = restoreMostRecentlyRemovedNote(real.history)
    if (expected === undefined || restored === null) {
      throw new Error("Expected a note to restore")
    }

    model.notes.push(expected.note)
    real.history = restored.history
    real.notes.push(
      real.defect === "change-restored-z-index"
        ? {
            ...restored.note,
            geometry: {
              ...restored.note.geometry,
              zIndex: restored.note.geometry.zIndex + 1,
            },
          }
        : restored.note,
    )
    assertState(model, real)
  }

  toString = () => "restore-most-recent"
}

class ExpireLatestRemovalCommand implements fc.Command<Model, Real> {
  check = (model: Readonly<Model>) => model.removed.length > 0

  run(model: Model, real: Real) {
    real.recordCommand()
    const snapshot = model.removed.at(-1)
    const realSnapshot = real.history.entries.at(-1)
    if (snapshot === undefined || realSnapshot === undefined) {
      throw new Error("Expected a removed note to expire")
    }

    model.removed = []
    real.history = expireNoteRemoval(
      real.history,
      realSnapshot,
      Date.parse(snapshot.removedAt) + 5_000,
    )
    assertState(model, real)
  }

  toString = () => "expire-latest-removal"
}

class RestoreWithoutHistoryCommand implements fc.Command<Model, Real> {
  check = (model: Readonly<Model>) => model.removed.length === 0

  run(model: Model, real: Real) {
    real.recordCommand()
    assert.equal(restoreMostRecentlyRemovedNote(real.history), null)
    assertState(model, real)
  }

  toString = () => "restore-without-history"
}

const commands = [
  fc.nat().map((position) => new MoveToFrontCommand(position)),
  fc.nat().map((position) => new MoveToBackCommand(position)),
  fc
    .tuple(
      fc.nat(),
      fc.integer({ min: -10_000, max: 10_000 }),
      fc.integer({ min: -10_000, max: 10_000 }),
      fc.integer({ min: NOTE_WIDTH_MIN, max: NOTE_WIDTH_MAX }),
      fc.integer({ min: NOTE_HEIGHT_MIN, max: NOTE_HEIGHT_MAX }),
    )
    .map(([position, x, y, width, height]) =>
      new UpdateGeometryCommand(position, x, y, width, height),
    ),
  fc.nat().map((position) => new RemoveCommand(position)),
  fc.constant(new RestoreCommand()),
  fc.constant(new ExpireLatestRemovalCommand()),
  fc.constant(new RestoreWithoutHistoryCommand()),
]

function runCommands(
  commandsToRun: Iterable<fc.Command<Model, Real>>,
  defect: Defect = null,
) {
  let executedCommands = 0

  fc.modelRun(() => {
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

function runSequence(
  commandsToRun: readonly fc.Command<Model, Real>[],
  defect: Defect = null,
) {
  const { model, real } = createState(defect)

  for (const command of commandsToRun) {
    assert.equal(command.check(model), true)
    command.run(model, real)
  }
}

describe("메모 생명 주기 모델", () => {
  it("배치, 삭제와 복원의 행동 순서를 실제 도메인 규칙으로 탐색한다", () => {
    let executedCommands = 0
    const details = fc.check(
      fc.property(
        fc.commands(commands, { maxCommands: noteModelSettings.maxCommands }),
        (commandsToRun) => {
          executedCommands += runCommands(commandsToRun)
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
      `note-lifecycle-model profile=local-fast generated=${details.numRuns} executed=${executedCommands} skipped=${details.numSkips}\n`,
    )
  })

  it("삭제 뒤 순서를 바꾸고 복원해도 삭제 전 겹침 값을 보존한다", () => {
    const notes = cloneNotes(initialNotes)
    const first = noteAt(notes, 0)
    const removed = noteAt(notes, 1)
    const third = noteAt(notes, 2)

    const history = rememberRemovedNote(
      createNoteRemovalHistory(),
      removed,
      operationTimestamp,
    )
    const afterMove = sendNoteToFront(
      [first, third],
      "note-1",
      operationTimestamp,
    )
    const restored = restoreRequired(history)

    expect(afterMove.map(({ id, geometry }) => [id, geometry.zIndex])).toEqual([
      ["note-3", 1],
      ["note-1", 2],
    ])
    expect(restored.note.geometry.zIndex).toBe(2)

    const duplicateStack = [...afterMove, restored.note]
    const afterSecondMove = sendNoteToFront(
      duplicateStack,
      "note-2",
      operationTimestamp,
    )

    expect(duplicateStack.map(({ id, geometry }) => [id, geometry.zIndex])).toEqual([
      ["note-3", 1],
      ["note-1", 2],
      ["note-2", 2],
    ])
    expect(
      afterSecondMove.map(({ id, geometry }) => [id, geometry.zIndex]),
    ).toEqual([
      ["note-3", 1],
      ["note-1", 2],
      ["note-2", 3],
    ])
  })

  it("새 메모의 기본 위치와 만료된 삭제 이력을 구분한다", () => {
    const geometry = findNewNoteGeometry(initialNotes.map(({ geometry }) => geometry))
    const history = rememberRemovedNote(
      createNoteRemovalHistory(),
      initialNoteAt(0),
      "2026-09-01T00:00:00.000Z",
    )
    const snapshot = latestRemoval(history)

    expect(geometry).toMatchObject({ height: 240, width: 320, zIndex: 4 })
    expect(expireNoteRemoval(history, snapshot, 1_788_307_205_000).entries).toEqual(
      [],
    )
  })

  it("복원한 겹침 값을 바꾸는 결함을 축소와 seed 재실행으로 검출한다", () => {
    const property = fc.property(
      fc.tuple(fc.nat(), fc.nat()),
      ([removePosition, movePosition]) =>
        runSequence(
          [
            new RemoveCommand(removePosition),
            new MoveToFrontCommand(movePosition),
            new RestoreCommand(),
          ],
          "change-restored-z-index",
        ),
    )
    const details = fc.check(property, {
      interruptAfterTimeLimit: noteModelSettings.interruptAfterTimeLimit,
      markInterruptAsFailure: true,
      numRuns: noteModelSettings.numRuns,
      seed: 20_260_913,
    })

    assert.equal(details.failed, true)
    assert.equal(details.interrupted, false)
    assert.ok(details.counterexample !== null)
    assert.ok(details.counterexamplePath !== null)

    const replay = fc.check(property, {
      endOnFailure: true,
      path: details.counterexamplePath ?? undefined,
      seed: details.seed,
    })
    assert.equal(replay.failed, true)

    const [positions] = details.counterexample
    process.stdout.write(
      `note-lifecycle-model defect=change-restored-z-index seed=${details.seed} path=${details.counterexamplePath} shrinks=${details.numShrinks} input=${JSON.stringify(positions)}\n`,
    )
    assert.throws(() =>
      runSequence(
        [
          new RemoveCommand(positions[0]),
          new MoveToFrontCommand(positions[1]),
          new RestoreCommand(),
        ],
        "change-restored-z-index",
      ),
    )
  })
})

type ContentRevisionDefect =
  | "content-revision-on-geometry"
  | "none"
  | "trim-content"

type ContentRevisionModel = {
  content: string
  contentRevision: number
  geometryX: number
  revision: number
}

type ContentRevisionReal = {
  defect: ContentRevisionDefect
  note: Note
}

const contentRevisionInitialNote: Note = {
  content: "원래 메모",
  contentRevision: 2,
  createdAt: "2026-09-01T00:00:00.000Z",
  geometry: { height: 240, width: 320, x: 32, y: 32, zIndex: 1 },
  id: "content-note",
  revision: 4,
  tabIndex: 1000,
  updatedAt: "2026-09-01T00:00:00.000Z",
}

function createContentRevisionState(defect: ContentRevisionDefect) {
  return {
    model: {
      content: contentRevisionInitialNote.content,
      contentRevision: contentRevisionInitialNote.contentRevision,
      geometryX: contentRevisionInitialNote.geometry.x,
      revision: contentRevisionInitialNote.revision,
    },
    real: {
      defect,
      note: { ...contentRevisionInitialNote, geometry: { ...contentRevisionInitialNote.geometry } },
    },
  }
}

function contentRevisionObservation(model: ContentRevisionModel) {
  return {
    content: model.content,
    contentRevision: model.contentRevision,
    geometryX: model.geometryX,
    revision: model.revision,
  }
}

function realContentRevisionObservation(real: ContentRevisionReal) {
  return {
    content: real.note.content,
    contentRevision: real.note.contentRevision,
    geometryX: real.note.geometry.x,
    revision: real.note.revision,
  }
}

function assertContentRevisionState(
  model: ContentRevisionModel,
  real: ContentRevisionReal,
) {
  const expected = contentRevisionObservation(model)
  const observed = realContentRevisionObservation(real)

  try {
    assert.deepEqual(observed, expected)
  } catch {
    throw new ExplorationInvariantError(
      "content-revision-changes-only-for-content",
      expected,
      observed,
    )
  }
}

function applyModelContent(model: ContentRevisionModel, content: string) {
  if (content === model.content) {
    return
  }

  model.content = content
  model.contentRevision += 1
  model.revision += 1
}

function applyModelGeometryX(model: ContentRevisionModel, geometryX: number) {
  if (geometryX === model.geometryX) {
    return
  }

  model.geometryX = geometryX
  model.revision += 1
}

abstract class ContentRevisionCommand
  implements fc.Command<ContentRevisionModel, ContentRevisionReal>
{
  constructor(
    private readonly counts: ExplorationActionCounts,
    private readonly phase: () => ExplorationPhase,
  ) {}

  check() {
    recordExplorationActionCheck(
      this.counts,
      this.phase(),
      this.toString(),
      true,
    )
    return true
  }

  protected recordExecution() {
    recordExplorationActionExecution(
      this.counts,
      this.phase(),
      this.toString(),
    )
  }

  abstract run(model: ContentRevisionModel, real: ContentRevisionReal): void
  abstract toString(): string
}

class EditContentRevisionCommand extends ContentRevisionCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly label: string,
    private readonly content: string,
  ) {
    super(counts, phase)
  }

  run(model: ContentRevisionModel, real: ContentRevisionReal) {
    this.recordExecution()
    applyModelContent(model, this.content)
    real.note = reviseNote(real.note, {
      content: real.defect === "trim-content" ? this.content.trim() : this.content,
      updatedAt: operationTimestamp,
    })
    assertContentRevisionState(model, real)
  }

  toString() {
    return this.label
  }
}

class MoveContentRevisionCommand extends ContentRevisionCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly geometryX: number,
  ) {
    super(counts, phase)
  }

  run(model: ContentRevisionModel, real: ContentRevisionReal) {
    this.recordExecution()
    const changed = model.geometryX !== this.geometryX
    applyModelGeometryX(model, this.geometryX)
    real.note = reviseNote(real.note, {
      geometry: { ...real.note.geometry, x: this.geometryX },
      updatedAt: operationTimestamp,
    })
    if (real.defect === "content-revision-on-geometry" && changed) {
      real.note = {
        ...real.note,
        contentRevision: real.note.contentRevision + 1,
      }
    }
    assertContentRevisionState(model, real)
  }

  toString() {
    return `move-x(${this.geometryX})`
  }
}

class InspectContentRevisionCommand extends ContentRevisionCommand {
  run(model: ContentRevisionModel, real: ContentRevisionReal) {
    this.recordExecution()
    assertContentRevisionState(model, real)
  }

  toString() {
    return "inspect"
  }
}

function executeContentRevisionCommands(
  commands: Iterable<fc.Command<ContentRevisionModel, ContentRevisionReal>>,
  defect: ContentRevisionDefect,
) {
  fc.modelRun(() => createContentRevisionState(defect), commands)
}

function checkContentRevisionExploration(
  defect: ContentRevisionDefect,
  seed: number,
) {
  const counts = createExplorationActionCounts()
  let phase: ExplorationPhase = "exploration"
  const currentPhase = () => phase
  const commands = [
    fc.constant(
      new EditContentRevisionCommand(counts, currentPhase, "edit-blank", " "),
    ),
    fc.constant(
      new EditContentRevisionCommand(
        counts,
        currentPhase,
        "edit-lines",
        "첫 줄\n둘째 줄",
      ),
    ),
    fc.constant(
      new EditContentRevisionCommand(
        counts,
        currentPhase,
        "edit-unicode",
        "한글 😀 café",
      ),
    ),
    fc.constant(
      new EditContentRevisionCommand(
        counts,
        currentPhase,
        "paste-url",
        "https://example.com?q=메모",
      ),
    ),
    fc.constant(
      new EditContentRevisionCommand(
        counts,
        currentPhase,
        "restore-original",
        contentRevisionInitialNote.content,
      ),
    ),
    fc
      .integer({ min: 30, max: 36 })
      .map(
        (geometryX) =>
          new MoveContentRevisionCommand(counts, currentPhase, geometryX),
      ),
    fc.constant(new InspectContentRevisionCommand(counts, currentPhase)),
  ]
  const property = fc.property(
    fc.commands(commands, { maxCommands: 12 }),
    (generatedCommands) => {
      try {
        executeContentRevisionCommands(generatedCommands, defect)
      } catch (error) {
        phase = "shrinking"
        throw error
      }
    },
  )
  const startedAt = performance.now()
  const details = fc.check(property, {
    interruptAfterTimeLimit: noteModelSettings.interruptAfterTimeLimit,
    markInterruptAsFailure: true,
    numRuns: noteModelSettings.numRuns,
    seed,
    verbose: true,
  })

  return {
    commands,
    counts,
    details,
    durationMs: Math.round(performance.now() - startedAt),
  }
}

function contentRevisionReport(
  result: ReturnType<typeof checkContentRevisionExploration>,
  modelRevision: string,
) {
  return createExplorationReport(result.details, {
    actionCounts: result.counts,
    appRevision: __NOTES_GIT_REVISION__,
    classification: "controlled-defect",
    durationMs: result.durationMs,
    environment: "vitest-node",
    feature: "note-content-revision",
    initialState: contentRevisionObservation(
      createContentRevisionState("none").model,
    ),
    layer: "note-domain",
    modelRevision,
    profile: noteModelProfile,
    toolVersions: { fastCheck: fc.__version, vitest: "4.1.11" },
  })
}

describe("메모 본문과 원문 revision 모델", () => {
  it("본문과 위치 변경을 생성하고 정상 revision 규칙을 유지한다", () => {
    const normal = checkContentRevisionExploration("none", 1)

    expect(normal.details.failed).toBe(false)
    expect(normal.details.interrupted).toBe(false)
    expect(normal.details.numRuns).toBe(noteModelSettings.numRuns)
    expect(normal.counts.exploration.executed).toBeGreaterThan(0)
    process.stdout.write(
      `${JSON.stringify({
        actionCounts: normal.counts,
        appRevision: __NOTES_GIT_REVISION__,
        classification: "normal",
        durationMs: normal.durationMs,
        environment: "vitest-node",
        feature: "note-content-revision",
        layer: "note-domain",
        modelRevision: "content-revision-v1",
        profile: noteModelProfile,
        runs: normal.details.numRuns,
        seed: normal.details.seed,
        termination: "completed",
        toolVersions: { fastCheck: fc.__version, vitest: "4.1.11" },
      })}\n`,
    )
  })

  it("공백 손실과 위치 변경 revision 결함을 축소하고 재현한다", () => {
    const trimmed = checkContentRevisionExploration("trim-content", 2)
    const geometry = checkContentRevisionExploration(
      "content-revision-on-geometry",
      2,
    )

    expect(trimmed.details.failed).toBe(true)
    expect(geometry.details.failed).toBe(true)
    expect(trimmed.details.interrupted).toBe(false)
    expect(geometry.details.interrupted).toBe(false)

    const trimmedReport = contentRevisionReport(trimmed, "content-revision-v1")
    const geometryReport = contentRevisionReport(geometry, "content-revision-v1")
    expect(trimmedReport.originalActions.length).toBeGreaterThan(
      trimmedReport.minimalActions.length,
    )
    expect(geometryReport.originalActions.length).toBeGreaterThan(
      geometryReport.minimalActions.length,
    )
    expect(trimmedReport.invariant).toBe(
      "content-revision-changes-only-for-content",
    )
    expect(geometryReport.invariant).toBe(
      "content-revision-changes-only-for-content",
    )

    for (const [result, report, defect] of [
      [trimmed, trimmedReport, "trim-content"],
      [geometry, geometryReport, "content-revision-on-geometry"],
    ] as const) {
      const replay = fc.check(
        fc.property(
          fc.commands(result.commands, {
            maxCommands: 12,
            replayPath: report.replayPath ?? undefined,
          }),
          (generatedCommands) =>
            executeContentRevisionCommands(generatedCommands, defect),
        ),
        {
          endOnFailure: true,
          numRuns: 1,
          path: report.path,
          seed: report.seed,
        },
      )
      expect(replay.failed).toBe(true)
      expect(replay.errorInstance).toBeInstanceOf(ExplorationInvariantError)
    }

    const directCounts = createExplorationActionCounts()
    const directPhase = () => "exploration" as const
    const spacedEdit = new EditContentRevisionCommand(
      directCounts,
      directPhase,
      "edit-blank",
      " ",
    )
    const geometryMove = new MoveContentRevisionCommand(
      directCounts,
      directPhase,
      30,
    )

    expect(() =>
      executeContentRevisionCommands([spacedEdit], "trim-content"),
    ).toThrowError(ExplorationInvariantError)
    expect(() =>
      executeContentRevisionCommands(
        [geometryMove],
        "content-revision-on-geometry",
      ),
    ).toThrowError(ExplorationInvariantError)
    expect(() =>
      executeContentRevisionCommands([spacedEdit, geometryMove], "none"),
    ).not.toThrow()

    process.stdout.write(`${JSON.stringify(trimmedReport)}\n`)
    process.stdout.write(`${JSON.stringify(geometryReport)}\n`)
  })
})
