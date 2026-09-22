import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test"
import * as fc from "fast-check"

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

import { readAppRevision } from "../test-app-revision.js"
import { createNoteThroughUi } from "./support/create-note-through-ui"
import {
  readStoredNote,
  type StoredNoteObservation,
} from "./support/read-stored-note"
import { runNoteAction } from "./support/run-note-action"

const initialTime = Date.parse("2026-09-13T01:00:00.000Z")
const undoDurationMs = 5_000

type RemovalDefect = "change-restored-z-index" | "none"

type RemovalNote = {
  createdOrder: number
  id: string
  revisionComparable: boolean
  stored: StoredNoteObservation
}

type RemovalSnapshot = {
  note: RemovalNote
  removedAtMs: number
}

type RemovalModel = {
  active: RemovalNote[]
  expectedFocus: string | null
  nowMs: number
  observationPending: boolean
  removed: RemovalSnapshot[]
}

type RemovalReal = {
  advanceTime(milliseconds: number): Promise<void>
  flushAnimationFrame(): Promise<void>
  inspect(expected: RemovalModel): Promise<void>
  moveToFront(noteId: string): Promise<void>
  reload(): Promise<void>
  remove(noteId: string): Promise<void>
  restore(expected: RemovalNote): Promise<void>
  routeRoundTrip(): Promise<void>
}

function cloneNote(note: RemovalNote): RemovalNote {
  return {
    ...note,
    stored: {
      ...note.stored,
      geometry: { ...note.stored.geometry },
    },
  }
}

function cloneNotes(notes: readonly RemovalNote[]) {
  return notes.map(cloneNote)
}

function stackingOrder(notes: readonly RemovalNote[]) {
  return [...notes].sort((left, right) => {
    const zIndexOrder = left.stored.geometry.zIndex - right.stored.geometry.zIndex
    if (zIndexOrder !== 0) {
      return zIndexOrder
    }
    return left.createdOrder - right.createdOrder
  })
}

function moveModelNoteToFront(
  notes: readonly RemovalNote[],
  noteId: string,
) {
  const ordered = stackingOrder(notes)
  const hasDuplicate = new Set(
    ordered.map((note) => note.stored.geometry.zIndex),
  ).size !== ordered.length
  const targetIndex = ordered.findIndex((note) => note.id === noteId)
  if (targetIndex < 0) {
    throw new Error("Expected a note to move")
  }
  const [target] = ordered.splice(targetIndex, 1)
  if (target === undefined) {
    throw new Error("Expected a stack target")
  }
  ordered.push(target)
  return ordered.map((note, index) => {
    const zIndex = index + 1
    return {
      ...cloneNote(note),
      revisionComparable: note.revisionComparable && !hasDuplicate,
      stored: {
        ...note.stored,
        geometry: { ...note.stored.geometry, zIndex },
        revision: hasDuplicate || note.stored.geometry.zIndex === zIndex
          ? note.stored.revision
          : note.stored.revision + 1,
      },
    }
  })
}

function latestRemoval(model: Readonly<RemovalModel>) {
  return model.removed.at(-1) ?? null
}

function removalIsAvailable(model: Readonly<RemovalModel>) {
  const latest = latestRemoval(model)
  return latest !== null && model.nowMs < latest.removedAtMs + undoDurationMs
}

function expireRemovalHistory(model: RemovalModel) {
  const latest = latestRemoval(model)
  if (
    latest !== null &&
    model.nowMs >= latest.removedAtMs + undoDurationMs
  ) {
    model.removed = []
  }
}

function comparableStored(note: StoredNoteObservation) {
  return {
    content: note.content,
    contentRevision: note.contentRevision,
    geometry: note.geometry,
    tabIndex: note.tabIndex,
  }
}

function comparableExpected(note: RemovalNote) {
  return comparableStored(note.stored)
}

function comparableRestoredSnapshot(
  note: StoredNoteObservation,
  includeRevision: boolean,
) {
  return {
    content: note.content,
    contentRevision: note.contentRevision,
    geometry: {
      height: note.geometry.height,
      width: note.geometry.width,
      x: note.geometry.x,
      y: note.geometry.y,
    },
    ...(includeRevision ? { revision: note.revision } : {}),
    tabIndex: note.tabIndex,
  }
}

abstract class RemovalCommand
  implements fc.AsyncCommand<RemovalModel, RemovalReal>
{
  constructor(
    protected readonly counts: ExplorationActionCounts,
    protected readonly phase: () => ExplorationPhase,
  ) {}

  protected accept(accepted: boolean) {
    recordExplorationActionCheck(
      this.counts,
      this.phase(),
      this.toString(),
      accepted,
    )
    return accepted
  }

  protected recordExecution() {
    recordExplorationActionExecution(
      this.counts,
      this.phase(),
      this.toString(),
    )
  }

  abstract check(model: Readonly<RemovalModel>): boolean
  abstract run(model: RemovalModel, real: RemovalReal): Promise<void>
  abstract toString(): string
}

class RemoveNoteCommand extends RemovalCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly position: number,
  ) {
    super(counts, phase)
  }

  check(model: Readonly<RemovalModel>) {
    return this.accept(model.active.length > 0)
  }

  async run(model: RemovalModel, real: RemovalReal) {
    this.recordExecution()
    const ordered = [...model.active].sort(
      (left, right) => left.stored.tabIndex - right.stored.tabIndex,
    )
    const index = this.position % ordered.length
    const note = ordered[index]
    if (note === undefined) {
      throw new Error("Expected a note to remove")
    }
    const next = ordered[index + 1]
    const previous = ordered[index - 1]

    await real.remove(note.id)
    model.active = model.active.filter((current) => current.id !== note.id)
    model.removed.push({ note: cloneNote(note), removedAtMs: model.nowMs })
    await real.flushAnimationFrame()
    model.nowMs += 16
    expireRemovalHistory(model)
    model.expectedFocus = next?.id ?? previous?.id ?? "new-note"
    model.observationPending = true
  }

  toString() {
    return `remove(${this.position})`
  }
}

class MoveRemovalNoteToFrontCommand extends RemovalCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly position: number,
  ) {
    super(counts, phase)
  }

  check(model: Readonly<RemovalModel>) {
    const ordered = stackingOrder(model.active)
    const targetIndex = this.position % ordered.length
    const hasDuplicate = new Set(
      ordered.map((note) => note.stored.geometry.zIndex),
    ).size !== ordered.length
    return this.accept(
      ordered.length > 1 &&
        (hasDuplicate || targetIndex !== ordered.length - 1),
    )
  }

  async run(model: RemovalModel, real: RemovalReal) {
    this.recordExecution()
    const ordered = stackingOrder(model.active)
    const target = ordered[this.position % ordered.length]
    if (target === undefined) {
      throw new Error("Expected a note to move")
    }

    await real.moveToFront(target.id)
    model.active = moveModelNoteToFront(model.active, target.id)
    model.expectedFocus = target.id
    model.observationPending = true
  }

  toString() {
    return `move-front(${this.position})`
  }
}

class RestoreLatestRemovalCommand extends RemovalCommand {
  check(model: Readonly<RemovalModel>) {
    return this.accept(removalIsAvailable(model))
  }

  async run(model: RemovalModel, real: RemovalReal) {
    this.recordExecution()
    const snapshot = model.removed.pop()
    if (snapshot === undefined) {
      throw new Error("Expected a note to restore")
    }

    await real.restore(snapshot.note)
    model.active.push(cloneNote(snapshot.note))
    await real.flushAnimationFrame()
    model.nowMs += 16
    expireRemovalHistory(model)
    model.expectedFocus = snapshot.note.id
    model.observationPending = true
  }

  toString() {
    return "restore-latest"
  }
}

class AdvanceRemovalTimeCommand extends RemovalCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly milliseconds: number,
  ) {
    super(counts, phase)
  }

  check(model: Readonly<RemovalModel>) {
    return this.accept(model.removed.length > 0)
  }

  async run(model: RemovalModel, real: RemovalReal) {
    this.recordExecution()
    await real.advanceTime(this.milliseconds)
    model.nowMs += this.milliseconds
    expireRemovalHistory(model)
    model.observationPending = true
  }

  toString() {
    return `advance-time(${this.milliseconds})`
  }
}

class RouteRoundTripCommand extends RemovalCommand {
  check(model: Readonly<RemovalModel>) {
    return this.accept(removalIsAvailable(model))
  }

  async run(model: RemovalModel, real: RemovalReal) {
    this.recordExecution()
    await real.routeRoundTrip()
    model.expectedFocus = null
    model.observationPending = true
  }

  toString() {
    return "route-round-trip"
  }
}

class ReloadRemovalSessionCommand extends RemovalCommand {
  check(model: Readonly<RemovalModel>) {
    return this.accept(model.removed.length > 0)
  }

  async run(model: RemovalModel, real: RemovalReal) {
    this.recordExecution()
    await real.reload()
    model.removed = []
    model.expectedFocus = null
    model.observationPending = true
  }

  toString() {
    return "reload-session"
  }
}

class InspectRemovalCommand extends RemovalCommand {
  check(model: Readonly<RemovalModel>) {
    return this.accept(model.observationPending)
  }

  async run(model: RemovalModel, real: RemovalReal) {
    this.recordExecution()
    await real.inspect(model)
    model.observationPending = false
  }

  toString() {
    return "inspect-removal-state"
  }
}

class InspectRemovalBaselineCommand extends RemovalCommand {
  check(model: Readonly<RemovalModel>) {
    return this.accept(!model.observationPending)
  }

  async run(model: RemovalModel, real: RemovalReal) {
    this.recordExecution()
    await real.inspect(model)
  }

  toString() {
    return "inspect-removal-baseline"
  }
}

function noteIdFromArticle(note: Locator) {
  return note.getAttribute("id").then((articleId) => {
    if (articleId === null) {
      throw new Error("Expected a note article id")
    }
    return decodeURIComponent(
      articleId.slice("note-".length, -"-board".length),
    )
  })
}

function articleForId(page: Page, noteId: string) {
  return page.locator(`[id="note-${encodeURIComponent(noteId)}-board"]`)
}

async function focusTarget(page: Page) {
  return page.evaluate(() => {
    const active = document.activeElement
    const article = active?.closest("article")
    const articleId = article?.id
    if (articleId?.startsWith("note-") && articleId.endsWith("-board")) {
      return decodeURIComponent(articleId.slice(5, -6))
    }
    if (active?.textContent?.trim() === "새 메모") {
      return "new-note"
    }
    return null
  })
}

async function installChangedRestoredZIndex(page: Page, noteId: string) {
  await page.evaluate((controlledNoteId) => {
    const originalPut = IDBObjectStore.prototype.put
    Reflect.set(window, "controlledRemovalOrderChanged", false)
    IDBObjectStore.prototype.put = function changeRestoredZIndex(
      value: unknown,
      key?: IDBValidKey,
    ) {
      if (
        this.name !== "notes" ||
        typeof value !== "object" ||
        value === null ||
        Reflect.get(value, "id") !== controlledNoteId ||
        Reflect.get(window, "controlledRemovalOrderChanged") !== true
      ) {
        return originalPut.call(this, value, key)
      }
      const geometry = Reflect.get(value, "geometry") as
        | Record<string, unknown>
        | undefined
      if (geometry === undefined) {
        return originalPut.call(this, value, key)
      }
      Reflect.set(window, "controlledRemovalOrderChanged", false)
      return originalPut.call(
        this,
        {
          ...value,
          geometry: {
            ...geometry,
            zIndex: Number(geometry.zIndex) + 1,
          },
        },
        key,
      )
    }
  }, noteId)
}

async function storedStackSignature(page: Page, noteIds: readonly string[]) {
  const observations = await Promise.all(
    noteIds.map((noteId) => readStoredNote(page, noteId)),
  )
  return observations.map((note) => note?.geometry.zIndex ?? null).join(":")
}

async function executeRemovalCommands(
  browser: Browser,
  commands: Iterable<fc.AsyncCommand<RemovalModel, RemovalReal>>,
  defect: RemovalDefect,
) {
  const context = await browser.newContext({
    viewport: { height: 900, width: 1280 },
  })

  try {
    const page = await context.newPage()
    await page.clock.install({ time: new Date(initialTime - 60_000) })
    await page.goto("/")
    const contents = ["첫 번째 삭제 메모", "두 번째 삭제 메모", "세 번째 삭제 메모"]
    const noteIds: string[] = []
    for (const content of contents) {
      const note = await createNoteThroughUi(page, content)
      noteIds.push(await noteIdFromArticle(note))
    }
    await expect(
      page.getByRole("article", { exact: true, name: "메모" }),
    ).toHaveCount(3)

    const initialNotes: RemovalNote[] = []
    for (const [createdOrder, noteId] of noteIds.entries()) {
      const stored = await readStoredNote(page, noteId)
      if (stored === null) {
        throw new Error("Expected a stored note")
      }
      initialNotes.push({
        createdOrder,
        id: noteId,
        revisionComparable: true,
        stored,
      })
    }
    await page.clock.pauseAt(new Date(initialTime))

    if (defect === "change-restored-z-index") {
      const controlledNoteId = noteIds[1]
      if (controlledNoteId === undefined) {
        throw new Error("Expected a controlled note")
      }
      await installChangedRestoredZIndex(page, controlledNoteId)
    }

    const real: RemovalReal = {
      async advanceTime(milliseconds) {
        await page.clock.fastForward(milliseconds)
      },
      async flushAnimationFrame() {
        await page.clock.runFor(16)
      },
      async inspect(expected) {
        await expect(
          page.getByRole("article", { exact: true, name: "메모" }),
        ).toHaveCount(expected.active.length)
        const expectedById = new Map(
          expected.active.map((note) => [note.id, comparableExpected(note)]),
        )
        const storedById: Record<string, unknown> = {}
        const renderedById: Record<string, unknown> = {}

        for (const noteId of noteIds) {
          const stored = await readStoredNote(page, noteId)
          storedById[noteId] = stored === null ? null : comparableStored(stored)
          const article = articleForId(page, noteId)
          if (!expectedById.has(noteId)) {
            renderedById[noteId] = null
            continue
          }
          await expect(article).toBeVisible()
          renderedById[noteId] = {
            content: await article
              .getByRole("textbox", { name: "메모 내용" })
              .inputValue(),
            tabIndex: Number(await article.getAttribute("tabindex")),
            zIndex: Number(
              await article.evaluate((element) =>
                getComputedStyle(element).zIndex,
              ),
            ),
          }
        }

        const expectedStoredById = Object.fromEntries(
          noteIds.map((noteId) => [noteId, expectedById.get(noteId) ?? null]),
        )
        const expectedRenderedById = Object.fromEntries(
          noteIds.map((noteId) => {
            const note = expected.active.find((candidate) => candidate.id === noteId)
            return [
              noteId,
              note === undefined
                ? null
                : {
                    content: note.stored.content,
                    tabIndex: note.stored.tabIndex,
                    zIndex: note.stored.geometry.zIndex,
                  },
            ]
          }),
        )
        const removalNotice = page.getByRole("status").filter({
          hasText: "메모를 삭제했습니다.",
        })
        const observed = {
          focus: expected.expectedFocus === null
            ? null
            : await focusTarget(page),
          renderedById,
          storedById,
          toastVisible: await removalNotice.isVisible().catch(() => false),
        }
        const wanted = {
          focus: expected.expectedFocus,
          renderedById: expectedRenderedById,
          storedById: expectedStoredById,
          toastVisible: removalIsAvailable(expected),
        }
        if (JSON.stringify(observed) !== JSON.stringify(wanted)) {
          throw new ExplorationInvariantError(
            "removal-restores-snapshot-focus-and-absolute-expiry",
            wanted,
            observed,
          )
        }
      },
      async moveToFront(noteId) {
        const before = await storedStackSignature(page, noteIds)
        await runNoteAction(articleForId(page, noteId), "메모를 맨 앞으로")
        await expect
          .poll(() => storedStackSignature(page, noteIds))
          .not.toBe(before)
        await page.evaluate(() => {
          Reflect.set(window, "controlledRemovalOrderChanged", true)
        })
      },
      async reload() {
        await page.reload()
        await expect(page.getByRole("button", { name: "새 메모" })).toBeVisible()
      },
      async remove(noteId) {
        const article = articleForId(page, noteId)
        await article.hover()
        await runNoteAction(article, "메모 삭제")
        await expect(article).toHaveCount(0)
        await expect.poll(() => readStoredNote(page, noteId)).toBeNull()
      },
      async restore(expected) {
        const removalNotice = page.getByRole("status").filter({
          hasText: "메모를 삭제했습니다.",
        })
        await removalNotice.getByRole("button", { name: "실행 취소" }).click()
        await expect.poll(() => readStoredNote(page, expected.id)).not.toBeNull()
        const stored = await readStoredNote(page, expected.id)
        if (stored === null) {
          throw new Error("Expected a restored note")
        }
        const wanted = comparableRestoredSnapshot(
          expected.stored,
          expected.revisionComparable,
        )
        const observed = comparableRestoredSnapshot(
          stored,
          expected.revisionComparable,
        )
        if (JSON.stringify(observed) !== JSON.stringify(wanted)) {
          throw new ExplorationInvariantError(
            "removal-restores-original-revision-and-geometry",
            wanted,
            observed,
          )
        }
      },
      async routeRoundTrip() {
        await page.getByRole("link", { exact: true, name: "설정" }).click()
        await expect(page).toHaveURL("/settings/")
        await page.getByRole("link", { exact: true, name: "메모" }).click()
        await expect(page).toHaveURL("/")
      },
    }

    await fc.asyncModelRun(
      () => ({
        model: {
          active: cloneNotes(initialNotes),
          expectedFocus: null,
          nowMs: initialTime,
          observationPending: false,
          removed: [],
        },
        real,
      }),
      commands,
    )
  } finally {
    await context.close()
  }
}

function removalCommands(
  counts: ExplorationActionCounts,
  phase: () => ExplorationPhase,
) {
  return [
    fc.integer({ max: 2, min: 0 }).map(
      (position) => new RemoveNoteCommand(counts, phase, position),
    ),
    fc.integer({ max: 2, min: 0 }).map(
      (position) => new MoveRemovalNoteToFrontCommand(counts, phase, position),
    ),
    fc.constant(new RestoreLatestRemovalCommand(counts, phase)),
    fc.constantFrom(1, 499, 4_499, 4_999, 5_000).map(
      (milliseconds) =>
        new AdvanceRemovalTimeCommand(counts, phase, milliseconds),
    ),
    fc.constant(new RouteRoundTripCommand(counts, phase)),
    fc.constant(new ReloadRemovalSessionCommand(counts, phase)),
    fc.constant(new InspectRemovalCommand(counts, phase)),
  ]
}

async function checkRemovalExploration(
  browser: Browser,
  defect: RemovalDefect,
) {
  const counts = createExplorationActionCounts()
  let phase: ExplorationPhase = "exploration"
  const currentPhase = () => phase
  const sequences = defect === "none"
    ? fc.commands(removalCommands(counts, currentPhase), { maxCommands: 10 })
    : fc
        .array(
          fc.constant(
            new InspectRemovalBaselineCommand(counts, currentPhase),
          ),
          { maxLength: 4, size: "max" },
        )
        .map((prefix) => [
          ...prefix,
          new RemoveNoteCommand(counts, currentPhase, 1),
          new MoveRemovalNoteToFrontCommand(counts, currentPhase, 0),
          new RestoreLatestRemovalCommand(counts, currentPhase),
          new InspectRemovalCommand(counts, currentPhase),
        ])
  const property = fc.asyncProperty(sequences, async (generatedCommands) => {
    try {
      await executeRemovalCommands(browser, generatedCommands, defect)
    } catch (error) {
      phase = "shrinking"
      throw error
    }
  })
  const startedAt = performance.now()
  const details = await fc.check(property, {
    interruptAfterTimeLimit: Math.max(
      noteModelSettings.interruptAfterTimeLimit,
      30_000,
    ),
    markInterruptAsFailure: true,
    numRuns: defect === "none" ? 10 : 20,
    seed: defect === "none" ? 19 : 20,
    verbose: true,
  })

  return {
    counts,
    details,
    durationMs: Math.round(performance.now() - startedAt),
    sequences,
  }
}

test("삭제 실패를 줄이고 스냅샷, 포커스와 만료 시각으로 재현한다", async ({
  browser,
}) => {
  test.slow()
  const normal = await checkRemovalExploration(browser, "none")
  expect(normal.details.failed).toBe(false)
  expect(normal.details.interrupted).toBe(false)
  console.info(
    JSON.stringify({
      actionCounts: normal.counts,
      appRevision: readAppRevision(),
      classification: "normal",
      durationMs: normal.durationMs,
      environment: `${browser.browserType().name()}-desktop-1280x900`,
      feature: "note-removal-recovery",
      layer: "note-card-session-and-indexed-db",
      modelRevision: "removal-recovery-v1",
      profile: noteModelProfile,
      runs: normal.details.numRuns,
      seed: normal.details.seed,
      termination: "completed",
      toolVersions: { fastCheck: fc.__version, playwright: "1.62.1" },
    }),
  )

  const faulty = await checkRemovalExploration(
    browser,
    "change-restored-z-index",
  )
  expect(faulty.details.failed).toBe(true)
  expect(faulty.details.interrupted).toBe(false)
  const report = createExplorationReport(faulty.details, {
    actionCounts: faulty.counts,
    appRevision: readAppRevision(),
    classification: "controlled-defect",
    durationMs: faulty.durationMs,
    environment: `${browser.browserType().name()}-desktop-1280x900`,
    feature: "note-removal-recovery",
    initialState: {
      contents: ["첫 번째 삭제 메모", "두 번째 삭제 메모", "세 번째 삭제 메모"],
      now: new Date(initialTime).toISOString(),
      zIndexes: [1, 2, 3],
    },
    layer: "note-card-session-and-indexed-db",
    modelRevision: "removal-recovery-v1",
    profile: noteModelProfile,
    toolVersions: { fastCheck: fc.__version, playwright: "1.62.1" },
  })

  expect(report.invariant).toBe(
    "removal-restores-snapshot-focus-and-absolute-expiry",
  )
  expect(report.originalActions.length).toBeGreaterThan(
    report.minimalActions.length,
  )
  expect(report.minimalActions).toEqual([
    "remove(1)",
    "move-front(0)",
    "restore-latest",
    "inspect-removal-state",
  ])

  const replay = await fc.check(
    fc.asyncProperty(faulty.sequences, async (generatedCommands) => {
      await executeRemovalCommands(
        browser,
        generatedCommands,
        "change-restored-z-index",
      )
    }),
    {
      endOnFailure: true,
      numRuns: 1,
      path: report.path,
      seed: report.seed,
    },
  )
  expect(replay.failed).toBe(true)
  expect(replay.errorInstance).toBeInstanceOf(ExplorationInvariantError)

  const directCounts = createExplorationActionCounts()
  const directPhase = () => "exploration" as const
  const duplicateRestore = [
    new RemoveNoteCommand(directCounts, directPhase, 1),
    new MoveRemovalNoteToFrontCommand(directCounts, directPhase, 0),
    new RestoreLatestRemovalCommand(directCounts, directPhase),
    new InspectRemovalCommand(directCounts, directPhase),
  ]
  await expect(
    executeRemovalCommands(
      browser,
      duplicateRestore,
      "change-restored-z-index",
    ),
  ).rejects.toMatchObject({ invariant: report.invariant })
  await expect(
    executeRemovalCommands(browser, duplicateRestore, "none"),
  ).resolves.toBeUndefined()

  const requiredCounts = createExplorationActionCounts()
  const requiredPhase = () => "exploration" as const
  await executeRemovalCommands(
    browser,
    [
      new RemoveNoteCommand(requiredCounts, requiredPhase, 1),
      new MoveRemovalNoteToFrontCommand(requiredCounts, requiredPhase, 0),
      new RestoreLatestRemovalCommand(requiredCounts, requiredPhase),
      new InspectRemovalCommand(requiredCounts, requiredPhase),
      new MoveRemovalNoteToFrontCommand(requiredCounts, requiredPhase, 2),
      new InspectRemovalCommand(requiredCounts, requiredPhase),
    ],
    "none",
  )
  await executeRemovalCommands(
    browser,
    [
      new RemoveNoteCommand(requiredCounts, requiredPhase, 0),
      new AdvanceRemovalTimeCommand(requiredCounts, requiredPhase, 4_384),
      new RouteRoundTripCommand(requiredCounts, requiredPhase),
      new AdvanceRemovalTimeCommand(requiredCounts, requiredPhase, 599),
      new InspectRemovalCommand(requiredCounts, requiredPhase),
      new AdvanceRemovalTimeCommand(requiredCounts, requiredPhase, 1),
      new InspectRemovalCommand(requiredCounts, requiredPhase),
    ],
    "none",
  )
  await executeRemovalCommands(
    browser,
    [
      new RemoveNoteCommand(requiredCounts, requiredPhase, 0),
      new RemoveNoteCommand(requiredCounts, requiredPhase, 0),
      new RestoreLatestRemovalCommand(requiredCounts, requiredPhase),
      new InspectRemovalCommand(requiredCounts, requiredPhase),
      new RestoreLatestRemovalCommand(requiredCounts, requiredPhase),
      new InspectRemovalCommand(requiredCounts, requiredPhase),
    ],
    "none",
  )
  await executeRemovalCommands(
    browser,
    [
      new RemoveNoteCommand(requiredCounts, requiredPhase, 0),
      new ReloadRemovalSessionCommand(requiredCounts, requiredPhase),
      new InspectRemovalCommand(requiredCounts, requiredPhase),
    ],
    "none",
  )

  console.info(JSON.stringify(report))
  console.info(
    JSON.stringify({
      actionCounts: requiredCounts,
      classification: "required-sequences",
      environment: `${browser.browserType().name()}-desktop-1280x900`,
      feature: "note-removal-recovery",
      layer: "note-card-session-and-indexed-db",
      termination: "completed",
    }),
  )
})
