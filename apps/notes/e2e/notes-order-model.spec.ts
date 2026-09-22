import { expect, test, type Browser, type Locator, type Page } from "@playwright/test"
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
import { readStoredNote } from "./support/read-stored-note"
import { runNoteAction } from "./support/run-note-action"

type StackDefect = "block-stack-move" | "none" | "partial-stack-save"

type StackNote = {
  contentRevision: number
  createdOrder: number
  id: string
  tabIndex: number
  zIndex: number
}

type StackModel = {
  notes: StackNote[]
  observationPending: boolean
  requiresMove: boolean
}

type StackReal = {
  inspect(expected: StackModel): Promise<void>
  move(noteId: string, edge: "back" | "front"): Promise<void>
  reload(): Promise<void>
  seedDuplicateStack(): Promise<void>
}

function stackOrder(notes: readonly StackNote[]) {
  return [...notes].sort((left, right) => {
    const zIndexOrder = left.zIndex - right.zIndex
    return zIndexOrder === 0
      ? left.createdOrder - right.createdOrder
      : zIndexOrder
  })
}

function moveToStackEdge(
  notes: readonly StackNote[],
  noteId: string,
  edge: "back" | "front",
) {
  const ordered = stackOrder(notes)
  const targetIndex = ordered.findIndex((note) => note.id === noteId)
  if (targetIndex < 0) {
    throw new Error("Expected a note to move")
  }
  const [target] = ordered.splice(targetIndex, 1)
  if (target === undefined) {
    throw new Error("Expected a stack target")
  }
  if (edge === "front") {
    ordered.push(target)
  } else {
    ordered.unshift(target)
  }
  return ordered.map((note, index) => {
    return {
      ...note,
      zIndex: index + 1,
    }
  })
}

abstract class StackCommand implements fc.AsyncCommand<StackModel, StackReal> {
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

  abstract check(model: Readonly<StackModel>): boolean
  abstract run(model: StackModel, real: StackReal): Promise<void>
  abstract toString(): string
}

class MoveStackCommand extends StackCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly edge: "back" | "front",
    private readonly position: number,
  ) {
    super(counts, phase)
  }

  check(model: Readonly<StackModel>) {
    const ordered = stackOrder(model.notes)
    const targetIndex = this.position % ordered.length
    const edgeIndex = this.edge === "front" ? ordered.length - 1 : 0
    return this.accept(
      model.notes.length > 0 &&
        (model.requiresMove || targetIndex !== edgeIndex),
    )
  }

  async run(model: StackModel, real: StackReal) {
    this.recordExecution()
    const ordered = stackOrder(model.notes)
    const target = ordered[this.position % ordered.length]
    if (target === undefined) {
      throw new Error("Expected a note to move")
    }
    await real.move(target.id, this.edge)
    model.notes = moveToStackEdge(model.notes, target.id, this.edge)
    model.observationPending = true
    model.requiresMove = false
  }

  toString() {
    return `move-${this.edge}(${this.position})`
  }
}

class ReloadStackCommand extends StackCommand {
  check(model: Readonly<StackModel>) {
    return this.accept(model.observationPending && !model.requiresMove)
  }

  async run(_model: StackModel, real: StackReal) {
    this.recordExecution()
    await real.reload()
  }

  toString() {
    return "reload-stack"
  }
}

class SeedDuplicateStackCommand extends StackCommand {
  check(model: Readonly<StackModel>) {
    return this.accept(!model.observationPending && !model.requiresMove)
  }

  async run(model: StackModel, real: StackReal) {
    this.recordExecution()
    await real.seedDuplicateStack()
    model.notes = model.notes.map((note) => ({ ...note, zIndex: 2 }))
    model.requiresMove = true
  }

  toString() {
    return "seed-duplicate-stack(2)"
  }
}

class InspectStackCommand extends StackCommand {
  check(model: Readonly<StackModel>) {
    return this.accept(model.observationPending && !model.requiresMove)
  }

  async run(model: StackModel, real: StackReal) {
    this.recordExecution()
    await real.inspect(model)
    model.observationPending = false
  }

  toString() {
    return "inspect-stored-stack"
  }
}

class InspectStackBaselineCommand extends StackCommand {
  check(model: Readonly<StackModel>) {
    return this.accept(!model.observationPending && !model.requiresMove)
  }

  async run(model: StackModel, real: StackReal) {
    this.recordExecution()
    await real.inspect(model)
  }

  toString() {
    return "inspect-stack-baseline"
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

async function installBlockedStackMove(page: Page) {
  await page.evaluate(() => {
    window.addEventListener(
      "click",
      (event) => {
        const button = (event.target as Element | null)?.closest("button")
        const label = button?.getAttribute("aria-label")
        if (label !== "메모를 맨 앞으로" && label !== "메모를 맨 뒤로") {
          return
        }
        Reflect.set(window, "controlledStackMoveBlocked", true)
        const popover = button?.closest<HTMLElement>("[popover]")

        if (popover?.matches(":popover-open")) {
          popover.hidePopover()
        }
        event.preventDefault()
        event.stopImmediatePropagation()
      },
      true,
    )
  })
}

async function installPartialStackSave(page: Page) {
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put
    let noteWriteCount = 0
    IDBObjectStore.prototype.put = function putWithOneStaleStackValue(
      value: unknown,
      key?: IDBValidKey,
    ) {
      if (this.name !== "notes") {
        return originalPut.call(this, value, key)
      }
      noteWriteCount += 1
      if (noteWriteCount !== 2 || typeof value !== "object" || value === null) {
        return originalPut.call(this, value, key)
      }
      const note = value as { geometry?: { zIndex?: unknown } }
      if (typeof note.geometry?.zIndex !== "number") {
        return originalPut.call(this, value, key)
      }
      return originalPut.call(
        this,
        {
          ...note,
          geometry: {
            ...note.geometry,
            zIndex: note.geometry.zIndex + 1,
          },
        },
        key,
      )
    }
  })
}

async function storedStackSignature(page: Page, noteIds: readonly string[]) {
  const observations = await Promise.all(
    noteIds.map((noteId) => readStoredNote(page, noteId)),
  )
  return observations.map((note) => note?.geometry.zIndex ?? null).join(":")
}

async function writeDuplicateStack(page: Page, noteIds: readonly string[]) {
  await page.evaluate(
    ({ databaseName, ids, storeName }) =>
      new Promise<void>((resolve, reject) => {
        const openRequest = indexedDB.open(databaseName)
        openRequest.onerror = () => reject(openRequest.error)
        openRequest.onsuccess = () => {
          const database = openRequest.result
          const transaction = database.transaction(storeName, "readwrite")
          const store = transaction.objectStore(storeName)
          transaction.onabort = () => {
            database.close()
            reject(transaction.error)
          }
          transaction.onerror = () => reject(transaction.error)
          transaction.oncomplete = () => {
            database.close()
            resolve()
          }
          for (const id of ids) {
            const request = store.get(id)
            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
              const note = request.result as
                | { geometry: { zIndex: number } }
                | undefined
              if (note === undefined) {
                transaction.abort()
                return
              }
              store.put({
                ...note,
                geometry: { ...note.geometry, zIndex: 2 },
              })
            }
          }
        }
      }),
    {
      databaseName: "personal-notes",
      ids: noteIds,
      storeName: "notes",
    },
  )
}

async function executeStackCommands(
  browser: Browser,
  commands: Iterable<fc.AsyncCommand<StackModel, StackReal>>,
  defect: StackDefect,
) {
  const context = await browser.newContext({
    viewport: { height: 900, width: 1280 },
  })

  try {
    const page = await context.newPage()
    await page.goto("/")
    const contents = ["첫 번째 겹침 메모", "두 번째 겹침 메모", "세 번째 겹침 메모"]
    const noteIds: string[] = []
    for (const content of contents) {
      const note = await createNoteThroughUi(page, content)
      noteIds.push(await noteIdFromArticle(note))
    }
    await expect(page.getByRole("article", { exact: true, name: "메모" })).toHaveCount(3)

    const initialNotes: StackNote[] = []
    for (const [createdOrder, noteId] of noteIds.entries()) {
      const stored = await readStoredNote(page, noteId)
      if (stored === null) {
        throw new Error("Expected a stored note")
      }
      initialNotes.push({
        contentRevision: stored.contentRevision,
        createdOrder,
        id: noteId,
        tabIndex: stored.tabIndex,
        zIndex: stored.geometry.zIndex,
      })
    }

    if (defect === "block-stack-move") {
      await installBlockedStackMove(page)
    } else if (defect === "partial-stack-save") {
      await installPartialStackSave(page)
    }

    const real: StackReal = {
      async inspect(expected) {
        const expectedById = [...expected.notes]
          .sort((left, right) => left.id.localeCompare(right.id))
          .map(({ contentRevision, id, tabIndex, zIndex }) => ({
            contentRevision,
            id,
            tabIndex,
            zIndex,
          }))
        const storedById = []
        const renderedById = []
        for (const noteId of noteIds) {
          const stored = await readStoredNote(page, noteId)
          const article = articleForId(page, noteId)
          await expect(article).toBeVisible()
          storedById.push(
            stored === null
              ? null
              : {
                  contentRevision: stored.contentRevision,
                  id: noteId,
                  tabIndex: stored.tabIndex,
                  zIndex: stored.geometry.zIndex,
                },
          )
          renderedById.push({
            id: noteId,
            tabIndex: Number(await article.getAttribute("tabindex")),
            zIndex: Number(await article.evaluate((element) =>
              getComputedStyle(element).zIndex,
            )),
          })
        }
        storedById.sort((left, right) =>
          (left?.id ?? "").localeCompare(right?.id ?? ""),
        )
        renderedById.sort((left, right) => left.id.localeCompare(right.id))
        const expectedRendered = expectedById.map(({ id, tabIndex, zIndex }) => ({
          id,
          tabIndex,
          zIndex,
        }))
        const observed = { renderedById, storedById }
        const wanted = {
          renderedById: expectedRendered,
          storedById: expectedById,
        }
        if (JSON.stringify(observed) !== JSON.stringify(wanted)) {
          throw new ExplorationInvariantError(
            "stack-move-persists-one-to-n-with-stable-tab-and-content-revision",
            wanted,
            observed,
          )
        }
      },
      async move(noteId, edge) {
        const label = edge === "front" ? "메모를 맨 앞으로" : "메모를 맨 뒤로"
        const before = await storedStackSignature(page, noteIds)
        await page.evaluate(() => {
          Reflect.set(window, "controlledStackMoveBlocked", false)
        })
        await runNoteAction(articleForId(page, noteId), label)
        if (defect === "block-stack-move") {
          await page.waitForFunction(
            () => Reflect.get(window, "controlledStackMoveBlocked") === true,
          )
          return
        }
        await expect
          .poll(() => storedStackSignature(page, noteIds))
          .not.toBe(before)
      },
      async reload() {
        await page.reload()
        await expect(page.getByRole("article", { exact: true, name: "메모" })).toHaveCount(3)
      },
      async seedDuplicateStack() {
        await writeDuplicateStack(page, noteIds)
        await page.reload()
        await expect(page.getByRole("article", { exact: true, name: "메모" })).toHaveCount(3)
      },
    }

    await fc.asyncModelRun(
      () => ({
        model: {
          notes: initialNotes,
          observationPending: false,
          requiresMove: false,
        },
        real,
      }),
      commands,
    )
  } finally {
    await context.close()
  }
}

function stackCommands(
  counts: ExplorationActionCounts,
  phase: () => ExplorationPhase,
) {
  return [
    fc.integer({ max: 2, min: 0 }).map(
      (position) => new MoveStackCommand(counts, phase, "front", position),
    ),
    fc.integer({ max: 2, min: 0 }).map(
      (position) => new MoveStackCommand(counts, phase, "back", position),
    ),
    fc.constant(new ReloadStackCommand(counts, phase)),
    fc.constant(new SeedDuplicateStackCommand(counts, phase)),
    fc.constant(new InspectStackCommand(counts, phase)),
  ]
}

async function checkStackExploration(browser: Browser, defect: StackDefect) {
  const counts = createExplorationActionCounts()
  let phase: ExplorationPhase = "exploration"
  const currentPhase = () => phase
  const commands = stackCommands(counts, currentPhase)
  const sequences =
    defect === "none"
      ? fc.commands(commands, { maxCommands: 9 })
      : fc
          .array(
            fc.constant(new InspectStackBaselineCommand(counts, currentPhase)),
            { maxLength: 4, size: "max" },
          )
          .map((prefix) => [
            ...prefix,
            new MoveStackCommand(counts, currentPhase, "front", 0),
            new InspectStackCommand(counts, currentPhase),
          ])
  const property = fc.asyncProperty(sequences, async (generatedCommands) => {
    try {
      await executeStackCommands(browser, generatedCommands, defect)
    } catch (error) {
      phase = "shrinking"
      throw error
    }
  })
  const startedAt = performance.now()
  const details = await fc.check(property, {
    interruptAfterTimeLimit: Math.max(
      noteModelSettings.interruptAfterTimeLimit,
      60_000,
    ),
    markInterruptAsFailure: true,
    numRuns: 20,
    seed:
      defect === "none" ? 16 : defect === "block-stack-move" ? 17 : 18,
    verbose: true,
  })

  return {
    counts,
    details,
    durationMs: Math.round(performance.now() - startedAt),
    sequences,
  }
}

test("겹침 순서의 실패 행동을 줄이고 저장 및 화면 순서로 재현한다", async ({
  browser,
}) => {
  test.setTimeout(180_000)
  const normal = await checkStackExploration(browser, "none")
  expect(normal.details.failed).toBe(false)
  expect(normal.details.interrupted).toBe(false)
  console.info(
    JSON.stringify({
      actionCounts: normal.counts,
      appRevision: readAppRevision(),
      classification: "normal",
      durationMs: normal.durationMs,
      environment: `${browser.browserType().name()}-desktop-1280x900`,
      feature: "note-stacking-order",
      layer: "note-card-and-indexed-db",
      modelRevision: "stack-order-v1",
      profile: noteModelProfile,
      runs: normal.details.numRuns,
      seed: normal.details.seed,
      termination: "completed",
      toolVersions: { fastCheck: fc.__version, playwright: "1.62.1" },
    }),
  )

  const faulty = await checkStackExploration(browser, "block-stack-move")
  expect(faulty.details.failed).toBe(true)
  expect(faulty.details.interrupted).toBe(false)
  const report = createExplorationReport(faulty.details, {
    actionCounts: faulty.counts,
    appRevision: readAppRevision(),
    classification: "controlled-defect",
    durationMs: faulty.durationMs,
    environment: `${browser.browserType().name()}-desktop-1280x900`,
    feature: "note-stacking-order",
    initialState: {
      contents: ["첫 번째 겹침 메모", "두 번째 겹침 메모", "세 번째 겹침 메모"],
      zIndexes: [1, 2, 3],
    },
    layer: "note-card-and-indexed-db",
    modelRevision: "stack-order-v1",
    profile: noteModelProfile,
    toolVersions: { fastCheck: fc.__version, playwright: "1.62.1" },
  })

  expect(report.invariant).toBe(
    "stack-move-persists-one-to-n-with-stable-tab-and-content-revision",
  )
  expect(report.originalActions.length).toBeGreaterThan(
    report.minimalActions.length,
  )
  expect(report.minimalActions).toEqual([
    "move-front(0)",
    "inspect-stored-stack",
  ])
  expect(report.replayPath).toBeNull()

  const replay = await fc.check(
    fc.asyncProperty(faulty.sequences, async (generatedCommands) => {
      await executeStackCommands(
        browser,
        generatedCommands,
        "block-stack-move",
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
  const moveAndInspect = [
    new MoveStackCommand(directCounts, directPhase, "front", 0),
    new InspectStackCommand(directCounts, directPhase),
  ]
  await expect(
    executeStackCommands(browser, moveAndInspect, "block-stack-move"),
  ).rejects.toMatchObject({ invariant: report.invariant })
  await expect(
    executeStackCommands(browser, moveAndInspect, "none"),
  ).resolves.toBeUndefined()

  const partial = await checkStackExploration(browser, "partial-stack-save")
  expect(partial.details.failed).toBe(true)
  expect(partial.details.interrupted).toBe(false)
  const partialReport = createExplorationReport(partial.details, {
    actionCounts: partial.counts,
    appRevision: readAppRevision(),
    classification: "controlled-defect",
    durationMs: partial.durationMs,
    environment: `${browser.browserType().name()}-desktop-1280x900`,
    feature: "note-stacking-order",
    initialState: {
      contents: ["첫 번째 겹침 메모", "두 번째 겹침 메모", "세 번째 겹침 메모"],
      zIndexes: [1, 2, 3],
    },
    layer: "note-card-and-indexed-db",
    modelRevision: "stack-order-v1",
    profile: noteModelProfile,
    toolVersions: { fastCheck: fc.__version, playwright: "1.62.1" },
  })
  expect(partialReport.invariant).toBe(report.invariant)
  expect(partialReport.originalActions.length).toBeGreaterThan(
    partialReport.minimalActions.length,
  )
  expect(partialReport.minimalActions).toEqual(report.minimalActions)

  const partialReplay = await fc.check(
    fc.asyncProperty(partial.sequences, async (generatedCommands) => {
      await executeStackCommands(
        browser,
        generatedCommands,
        "partial-stack-save",
      )
    }),
    {
      endOnFailure: true,
      numRuns: 1,
      path: partialReport.path,
      seed: partialReport.seed,
    },
  )
  expect(partialReplay.failed).toBe(true)
  expect(partialReplay.errorInstance).toBeInstanceOf(ExplorationInvariantError)
  await expect(
    executeStackCommands(browser, moveAndInspect, "partial-stack-save"),
  ).rejects.toMatchObject({ invariant: partialReport.invariant })

  const requiredCounts = createExplorationActionCounts()
  const requiredPhase = () => "exploration" as const
  const duplicateAndReload = [
    new SeedDuplicateStackCommand(requiredCounts, requiredPhase),
    new MoveStackCommand(requiredCounts, requiredPhase, "front", 1),
    new ReloadStackCommand(requiredCounts, requiredPhase),
    new InspectStackCommand(requiredCounts, requiredPhase),
    new MoveStackCommand(requiredCounts, requiredPhase, "back", 2),
    new InspectStackCommand(requiredCounts, requiredPhase),
  ]
  await expect(
    executeStackCommands(browser, duplicateAndReload, "none"),
  ).resolves.toBeUndefined()

  console.info(JSON.stringify(report))
  console.info(JSON.stringify(partialReport))
  console.info(
    JSON.stringify({
      actionCounts: requiredCounts,
      classification: "required-sequence",
      environment: `${browser.browserType().name()}-desktop-1280x900`,
      feature: "note-stacking-order",
      layer: "note-card-and-indexed-db",
      termination: "completed",
    }),
  )
})
