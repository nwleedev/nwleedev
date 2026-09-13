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
  preparePointerCaptureRelease,
  releasePointerCapture,
} from "./support/pointer-capture"
import { readStoredNote } from "./support/read-stored-note"

type Geometry = {
  height: number
  width: number
  x: number
  y: number
  zIndex: number
}

type GeometryDefect = "block-pointer-end" | "none"

type GeometryModel = {
  contentRevision: number
  geometry: Geometry
  observationPending: boolean
  revision: number
}

type GeometryReal = {
  applyX(x: number): Promise<void>
  cancelMove(deltaX: number, deltaY: number): Promise<void>
  inspect(expected: GeometryModel): Promise<void>
  rejectAndCorrectWidth(width: number): Promise<void>
  resizeSouthEast(deltaX: number, deltaY: number): Promise<void>
  move(deltaX: number, deltaY: number): Promise<void>
}

abstract class GeometryCommand
  implements fc.AsyncCommand<GeometryModel, GeometryReal>
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

  abstract check(model: Readonly<GeometryModel>): boolean
  abstract run(model: GeometryModel, real: GeometryReal): Promise<void>
  abstract toString(): string
}

class ApplyGeometryXCommand extends GeometryCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly x: number,
  ) {
    super(counts, phase)
  }

  check(model: Readonly<GeometryModel>) {
    return this.accept(!model.observationPending)
  }

  async run(model: GeometryModel, real: GeometryReal) {
    this.recordExecution()
    await real.applyX(this.x)
    if (model.geometry.x !== this.x) {
      model.geometry = { ...model.geometry, x: this.x }
      model.revision += 1
    }
    model.observationPending = true
  }

  toString() {
    return `apply-x(${this.x})`
  }
}

class MoveGeometryCommand extends GeometryCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly deltaX: number,
    private readonly deltaY: number,
  ) {
    super(counts, phase)
  }

  check(model: Readonly<GeometryModel>) {
    return this.accept(!model.observationPending)
  }

  async run(model: GeometryModel, real: GeometryReal) {
    this.recordExecution()
    await real.move(this.deltaX, this.deltaY)
    model.geometry = {
      ...model.geometry,
      x: model.geometry.x + this.deltaX,
      y: model.geometry.y + this.deltaY,
    }
    model.revision += 1
    model.observationPending = true
  }

  toString() {
    return `pointer-move(mouse;scale=1;start=header;delta=${this.deltaX}:${this.deltaY};end=pointerup)`
  }
}

class ResizeSouthEastCommand extends GeometryCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly deltaX: number,
    private readonly deltaY: number,
  ) {
    super(counts, phase)
  }

  check(model: Readonly<GeometryModel>) {
    return this.accept(!model.observationPending)
  }

  async run(model: GeometryModel, real: GeometryReal) {
    this.recordExecution()
    await real.resizeSouthEast(this.deltaX, this.deltaY)
    model.geometry = {
      ...model.geometry,
      height: model.geometry.height + this.deltaY,
      width: model.geometry.width + this.deltaX,
    }
    model.revision += 1
    model.observationPending = true
  }

  toString() {
    return `pointer-resize-south-east(mouse;scale=1;delta=${this.deltaX}:${this.deltaY};end=pointerup)`
  }
}

class CancelGeometryMoveCommand extends GeometryCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly deltaX: number,
    private readonly deltaY: number,
  ) {
    super(counts, phase)
  }

  check(model: Readonly<GeometryModel>) {
    return this.accept(!model.observationPending)
  }

  async run(model: GeometryModel, real: GeometryReal) {
    this.recordExecution()
    await real.cancelMove(this.deltaX, this.deltaY)
    model.observationPending = true
  }

  toString() {
    return `pointer-move-cancel(mouse;scale=1;delta=${this.deltaX}:${this.deltaY};end=lostpointercapture)`
  }
}

class RejectGeometryWidthCommand extends GeometryCommand {
  check(model: Readonly<GeometryModel>) {
    return this.accept(!model.observationPending)
  }

  async run(model: GeometryModel, real: GeometryReal) {
    this.recordExecution()
    await real.rejectAndCorrectWidth(model.geometry.width)
    model.observationPending = true
  }

  toString() {
    return "reject-width(4096)-then-correct"
  }
}

class InspectGeometryCommand extends GeometryCommand {
  check(model: Readonly<GeometryModel>) {
    return this.accept(model.observationPending)
  }

  async run(model: GeometryModel, real: GeometryReal) {
    this.recordExecution()
    await real.inspect(model)
    model.observationPending = false
  }

  toString() {
    return "inspect-stored-geometry"
  }
}

class InspectGeometryBaselineCommand extends GeometryCommand {
  check(model: Readonly<GeometryModel>) {
    return this.accept(!model.observationPending)
  }

  async run(model: GeometryModel, real: GeometryReal) {
    this.recordExecution()
    await real.inspect(model)
  }

  toString() {
    return "inspect-geometry-baseline"
  }
}

async function visibleBox(locator: Locator) {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("Visible element has no bounding box")
  }
  return box
}

async function noteIdFromArticle(note: Locator) {
  const articleId = await note.getAttribute("id")
  if (articleId === null) {
    throw new Error("Expected a note article id")
  }
  return decodeURIComponent(articleId.slice("note-".length, -"-board".length))
}

async function openProperties(note: Locator) {
  await note.focus()
  await note.press("Enter")
  const properties = note.page().getByRole("complementary", {
    name: "메모 속성",
  })
  await expect(properties).toBeVisible()
  return properties
}

async function installBlockedPointerEnd(page: Page) {
  await page.evaluate(() => {
    let noteGestureActive = false
    window.addEventListener(
      "pointerdown",
      (event) => {
        const target = event.target
        noteGestureActive =
          target instanceof Element && target.closest("article") !== null
      },
      true,
    )
    window.addEventListener(
      "pointerup",
      (event) => {
        if (noteGestureActive) {
          noteGestureActive = false
          event.preventDefault()
          event.stopImmediatePropagation()
        }
      },
      true,
    )
  })
}

async function executeGeometryCommands(
  browser: Browser,
  commands: Iterable<fc.AsyncCommand<GeometryModel, GeometryReal>>,
  defect: GeometryDefect,
) {
  const context = await browser.newContext({
    viewport: { height: 900, width: 1280 },
  })

  try {
    const page = await context.newPage()
    await page.goto("/")
    const content = "위치와 크기 모델 메모"
    const note = await createNoteThroughUi(page, content)
    const noteId = await noteIdFromArticle(note)
    await expect.poll(async () => readStoredNote(page, noteId)).not.toBeNull()
    const initial = await readStoredNote(page, noteId)
    if (initial === null) {
      throw new Error("Expected a stored note")
    }

    if (defect === "block-pointer-end") {
      await installBlockedPointerEnd(page)
    }

    const real: GeometryReal = {
      async applyX(x) {
        const properties = await openProperties(note)
        const field = properties.getByRole("spinbutton", { name: "X" })
        await field.fill(String(x))
        await field.press("Enter")
        await properties.getByRole("button", {
          name: "메모 속성 패널 닫기",
        }).click()
      },
      async cancelMove(deltaX, deltaY) {
        const box = await visibleBox(note)
        await preparePointerCaptureRelease(page)
        await page.mouse.move(box.x + 120, box.y + 14)
        await page.mouse.down()
        await page.mouse.move(box.x + 120 + deltaX, box.y + 14 + deltaY)
        await releasePointerCapture(page)
        await page.mouse.up()
      },
      async inspect(expected) {
        const stored = await readStoredNote(page, noteId)
        const observed =
          stored === null
            ? null
            : {
                content: stored.content,
                contentRevision: stored.contentRevision,
                geometry: stored.geometry,
                revision: stored.revision,
              }
        const wanted = {
          content,
          contentRevision: expected.contentRevision,
          geometry: expected.geometry,
          revision: expected.revision,
        }
        if (JSON.stringify(observed) !== JSON.stringify(wanted)) {
          throw new ExplorationInvariantError(
            "requested-geometry-is-stored-without-content-revision-change",
            wanted,
            observed,
          )
        }
      },
      async rejectAndCorrectWidth(width) {
        const properties = await openProperties(note)
        const field = properties.getByRole("spinbutton", { name: "너비" })
        await field.fill("4096")
        const workspace = page.getByRole("region", { name: "메모 작업 영역" })
        const workspaceBox = await visibleBox(workspace)
        await page.mouse.click(
          workspaceBox.x + workspaceBox.width * 0.72,
          workspaceBox.y + workspaceBox.height * 0.72,
        )
        await expect(properties.getByRole("alert")).toContainText(
          "값의 범위와 위치를 확인하세요.",
        )
        await field.fill(String(width))
        await field.press("Enter")
        await properties.getByRole("button", {
          name: "메모 속성 패널 닫기",
        }).click()
      },
      async resizeSouthEast(deltaX, deltaY) {
        const box = await visibleBox(note)
        await page.mouse.move(box.x + box.width - 1, box.y + box.height - 1)
        await page.mouse.down()
        await page.mouse.move(
          box.x + box.width - 1 + deltaX,
          box.y + box.height - 1 + deltaY,
        )
        await page.mouse.up()
      },
      async move(deltaX, deltaY) {
        const box = await visibleBox(note)
        await page.mouse.move(box.x + 120, box.y + 14)
        await page.mouse.down()
        await page.mouse.move(box.x + 120 + deltaX, box.y + 14 + deltaY)
        await page.mouse.up()
      },
    }

    await fc.asyncModelRun(
      () => ({
        model: {
          contentRevision: initial.contentRevision,
          geometry: initial.geometry,
          observationPending: false,
          revision: initial.revision,
        },
        real,
      }),
      commands,
    )
  } finally {
    await context.close()
  }
}

function geometryCommands(
  counts: ExplorationActionCounts,
  phase: () => ExplorationPhase,
) {
  const inspect = fc.constant(new InspectGeometryCommand(counts, phase))
  const move = fc.constant(new MoveGeometryCommand(counts, phase, 80, 40))

  return [
    fc.constantFrom(80, 500).map(
      (x) => new ApplyGeometryXCommand(counts, phase, x),
    ),
    move,
    fc.constant(new ResizeSouthEastCommand(counts, phase, 48, 32)),
    fc.constant(new CancelGeometryMoveCommand(counts, phase, 45, 40)),
    fc.constant(new RejectGeometryWidthCommand(counts, phase)),
    inspect,
  ]
}

async function checkGeometryExploration(
  browser: Browser,
  defect: GeometryDefect,
) {
  const counts = createExplorationActionCounts()
  let phase: ExplorationPhase = "exploration"
  const currentPhase = () => phase
  const commands = geometryCommands(counts, currentPhase)
  const sequences =
    defect === "none"
      ? fc.commands(commands, { maxCommands: 8, size: "max" })
      : fc
          .array(
            fc.constant(
              new InspectGeometryBaselineCommand(counts, currentPhase),
            ),
            { maxLength: 4, size: "max" },
          )
          .map((prefix) => [
            ...prefix,
            new MoveGeometryCommand(counts, currentPhase, 80, 40),
            new InspectGeometryCommand(counts, currentPhase),
          ])
  const property = fc.asyncProperty(
    sequences,
    async (generatedCommands) => {
      try {
        await executeGeometryCommands(browser, generatedCommands, defect)
      } catch (error) {
        phase = "shrinking"
        throw error
      }
    },
  )
  const startedAt = performance.now()
  const details = await fc.check(property, {
    interruptAfterTimeLimit: Math.max(
      noteModelSettings.interruptAfterTimeLimit,
      30_000,
    ),
    markInterruptAsFailure: true,
    numRuns: 20,
    seed: defect === "none" ? 13 : 15,
    verbose: true,
  })

  return {
    counts,
    details,
    durationMs: Math.round(performance.now() - startedAt),
    sequences,
  }
}

test("위치와 크기의 실패 행동을 줄이고 실제 저장값으로 재현한다", async ({
  browser,
}) => {
  test.slow()
  const normal = await checkGeometryExploration(browser, "none")
  expect(normal.details.failed).toBe(false)
  expect(normal.details.interrupted).toBe(false)
  console.info(
    JSON.stringify({
      actionCounts: normal.counts,
      appRevision: readAppRevision(),
      classification: "normal",
      durationMs: normal.durationMs,
      environment: `${browser.browserType().name()}-desktop-1280x900`,
      feature: "note-geometry",
      layer: "note-card-and-properties-panel",
      modelRevision: "geometry-v1",
      profile: noteModelProfile,
      runs: normal.details.numRuns,
      seed: normal.details.seed,
      termination: "completed",
      toolVersions: { fastCheck: fc.__version, playwright: "1.62.1" },
    }),
  )

  const faulty = await checkGeometryExploration(browser, "block-pointer-end")
  expect(faulty.details.failed).toBe(true)
  expect(faulty.details.interrupted).toBe(false)
  const report = createExplorationReport(faulty.details, {
    actionCounts: faulty.counts,
    appRevision: readAppRevision(),
    classification: "controlled-defect",
    durationMs: faulty.durationMs,
    environment: `${browser.browserType().name()}-desktop-1280x900`,
    feature: "note-geometry",
    initialState: {
      content: "위치와 크기 모델 메모",
      pointer: "mouse",
      scale: 1,
      viewport: { height: 900, width: 1280 },
    },
    layer: "note-card-and-properties-panel",
    modelRevision: "geometry-v1",
    profile: noteModelProfile,
    toolVersions: { fastCheck: fc.__version, playwright: "1.62.1" },
  })

  expect(report.invariant).toBe(
    "requested-geometry-is-stored-without-content-revision-change",
  )
  expect(report.originalActions.length).toBeGreaterThan(
    report.minimalActions.length,
  )
  expect(report.minimalActions).toEqual([
    "pointer-move(mouse;scale=1;start=header;delta=80:40;end=pointerup)",
    "inspect-stored-geometry",
  ])
  expect(report.replayPath).toBeNull()

  const replay = await fc.check(
    fc.asyncProperty(
      faulty.sequences,
      async (generatedCommands) => {
        await executeGeometryCommands(
          browser,
          generatedCommands,
          "block-pointer-end",
        )
      },
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

  const directCounts = createExplorationActionCounts()
  const directPhase = () => "exploration" as const
  const moveAndInspect = [
    new MoveGeometryCommand(directCounts, directPhase, 80, 40),
    new InspectGeometryCommand(directCounts, directPhase),
  ]
  await expect(
    executeGeometryCommands(browser, moveAndInspect, "block-pointer-end"),
  ).rejects.toMatchObject({ invariant: report.invariant })
  await expect(
    executeGeometryCommands(browser, moveAndInspect, "none"),
  ).resolves.toBeUndefined()

  const requiredCounts = createExplorationActionCounts()
  const requiredPhase = () => "exploration" as const
  const propertyAndResize = [
    new RejectGeometryWidthCommand(requiredCounts, requiredPhase),
    new InspectGeometryCommand(requiredCounts, requiredPhase),
    new ApplyGeometryXCommand(requiredCounts, requiredPhase, 5000),
    new InspectGeometryCommand(requiredCounts, requiredPhase),
  ]
  await expect(
    executeGeometryCommands(browser, propertyAndResize, "none"),
  ).resolves.toBeUndefined()

  const gestureSequence = [
    new CancelGeometryMoveCommand(requiredCounts, requiredPhase, 45, 40),
    new InspectGeometryCommand(requiredCounts, requiredPhase),
    new ResizeSouthEastCommand(requiredCounts, requiredPhase, 48, 32),
    new InspectGeometryCommand(requiredCounts, requiredPhase),
  ]
  await expect(
    executeGeometryCommands(browser, gestureSequence, "none"),
  ).resolves.toBeUndefined()

  console.info(JSON.stringify(report))
  console.info(
    JSON.stringify({
      actionCounts: requiredCounts,
      classification: "required-sequences",
      environment: `${browser.browserType().name()}-desktop-1280x900`,
      feature: "note-geometry",
      layer: "note-card-and-properties-panel",
      termination: "completed",
    }),
  )
})
