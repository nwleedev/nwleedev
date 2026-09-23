import { ok } from "node:assert/strict"

import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test"
import * as fc from "fast-check"

import {
  NOTE_CANVAS_SIZE,
  NOTE_HEIGHT_MAX,
  NOTE_HEIGHT_MIN,
  NOTE_WIDTH_MAX,
  NOTE_WIDTH_MIN,
} from "@/entities/note"
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
type PointerDelta = { x: number; y: number }
type ResizeDirection =
  | "east"
  | "north"
  | "north-east"
  | "north-west"
  | "south"
  | "south-east"
  | "south-west"
  | "west"

const resizeDirections: readonly ResizeDirection[] = [
  "north",
  "south",
  "west",
  "east",
  "north-west",
  "north-east",
  "south-west",
  "south-east",
]

function bounded(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

function expectedResize(
  geometry: Geometry,
  direction: ResizeDirection,
  deltaX: number,
  deltaY: number,
): Geometry {
  const right = geometry.x + geometry.width
  const bottom = geometry.y + geometry.height
  let width = geometry.width
  let height = geometry.height

  if (direction.includes("west")) {
    width = bounded(geometry.width - deltaX, NOTE_WIDTH_MIN, NOTE_WIDTH_MAX)
  } else if (direction.includes("east")) {
    width = bounded(geometry.width + deltaX, NOTE_WIDTH_MIN, NOTE_WIDTH_MAX)
  }

  if (direction.includes("north")) {
    height = bounded(geometry.height - deltaY, NOTE_HEIGHT_MIN, NOTE_HEIGHT_MAX)
  } else if (direction.includes("south")) {
    height = bounded(geometry.height + deltaY, NOTE_HEIGHT_MIN, NOTE_HEIGHT_MAX)
  }

  return {
    ...geometry,
    height,
    width,
    x: direction.includes("west") ? right - width : geometry.x,
    y: direction.includes("north") ? bottom - height : geometry.y,
  }
}

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
  resize(
    direction: ResizeDirection,
    deltaX: number,
    deltaY: number,
  ): Promise<PointerDelta>
  move(deltaX: number, deltaY: number): Promise<PointerDelta>
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
    const delivered = await real.move(this.deltaX, this.deltaY)
    model.geometry = {
      ...model.geometry,
      x: model.geometry.x + delivered.x,
      y: model.geometry.y + delivered.y,
    }
    model.revision += 1
    model.observationPending = true
  }

  toString() {
    return `pointer-move(mouse;scale=1;start=move-handle;delta=${this.deltaX}:${this.deltaY};end=pointerup)`
  }
}

class ResizeGeometryCommand extends GeometryCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly direction: ResizeDirection,
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
    const delivered = await real.resize(this.direction, this.deltaX, this.deltaY)
    const nextGeometry = expectedResize(
      model.geometry,
      this.direction,
      delivered.x,
      delivered.y,
    )
    const changed =
      nextGeometry.x !== model.geometry.x ||
      nextGeometry.y !== model.geometry.y ||
      nextGeometry.width !== model.geometry.width ||
      nextGeometry.height !== model.geometry.height
    if (changed) {
      model.revision += 1
    }
    model.geometry = nextGeometry
    model.observationPending = true
  }

  toString() {
    return `pointer-resize-${this.direction}(mouse;scale=1;delta=${this.deltaX}:${this.deltaY};end=pointerup)`
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
    return `reject-width(${NOTE_WIDTH_MAX + 1})-then-correct`
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

function resizePoint(
  box: { height: number; width: number; x: number; y: number },
  direction: ResizeDirection,
) {
  let x = box.x + box.width / 2
  let y = box.y + box.height / 2

  if (direction.includes("west")) {
    x = box.x + 1
  } else if (direction.includes("east")) {
    x = box.x + box.width - 1
  }

  if (direction.includes("north")) {
    y = box.y + 1
  } else if (direction.includes("south")) {
    y = box.y + box.height - 1
  }

  return { x, y }
}

async function dragPointer(
  page: Page,
  start: { x: number; y: number },
  requested: PointerDelta,
  scale: number,
): Promise<PointerDelta> {
  await page.mouse.move(start.x, start.y)
  const recorder = await page.evaluateHandle(() => {
    let down: { x: number; y: number } | null = null
    let moved: { x: number; y: number } | null = null
    const onDown = (event: PointerEvent) => {
      down = { x: event.clientX, y: event.clientY }
    }
    const onMove = (event: PointerEvent) => {
      if (down !== null && event.buttons !== 0) {
        moved = { x: event.clientX, y: event.clientY }
      }
    }
    window.addEventListener("pointerdown", onDown, true)
    window.addEventListener("pointermove", onMove, true)

    return {
      read: () => ({ down, moved }),
      stop: () => {
        window.removeEventListener("pointerdown", onDown, true)
        window.removeEventListener("pointermove", onMove, true)
      },
    }
  })

  try {
    await page.mouse.down()
    await page.mouse.move(
      start.x + requested.x * scale,
      start.y + requested.y * scale,
    )
    await page.mouse.up()
    const points = await recorder.evaluate((value) => value.read())
    if (points.down === null || points.moved === null) {
      throw new Error("Expected a delivered pointer drag")
    }
    return {
      x: Math.round((points.moved.x - points.down.x) / scale),
      y: Math.round((points.moved.y - points.down.y) / scale),
    }
  } finally {
    await recorder.evaluate((value) => value.stop())
    await recorder.dispose()
  }
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
  zoomed = false,
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

    if (zoomed) {
      const controls = page.getByRole("group", { name: "캔버스 보기" })
      await controls.getByRole("button", { name: "확대" }).click()
      await expect.poll(async () => (await visibleBox(note)).width)
        .toBeGreaterThan(initial.geometry.width)
      await expect.poll(async () => {
        const firstWidth = (await visibleBox(note)).width
        await page.evaluate(() => new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        }))
        return Math.abs((await visibleBox(note)).width - firstWidth)
      }).toBeLessThan(0.01)
      await controls.getByRole("button", { name: "왼쪽 보기" }).click()
      const handle = note.getByRole("button", { name: "메모 이동" })
      const workspace = page.getByRole("region", { name: "메모 작업 영역" })
      const workspaceBox = await visibleBox(workspace)
      await expect.poll(async () => {
        const box = await visibleBox(handle)
        return box.x + box.width / 2
      }).toBeGreaterThan(workspaceBox.x)
    }
    const pointerScale = (await visibleBox(note)).width / initial.geometry.width

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
        const handle = await visibleBox(
          note.getByRole("button", { name: "메모 이동" }),
        )
        const startX = handle.x + handle.width / 2
        const startY = handle.y + handle.height / 2
        await preparePointerCaptureRelease(page)
        await page.mouse.move(startX, startY)
        await page.mouse.down()
        await page.mouse.move(
          startX + deltaX * pointerScale,
          startY + deltaY * pointerScale,
        )
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
        await field.fill(String(NOTE_WIDTH_MAX + 1))
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
      async resize(direction, deltaX, deltaY) {
        const box = await visibleBox(note)
        const start = resizePoint(box, direction)
        return dragPointer(
          page,
          start,
          { x: deltaX, y: deltaY },
          pointerScale,
        )
      },
      async move(deltaX, deltaY) {
        const handle = await visibleBox(
          note.getByRole("button", { name: "메모 이동" }),
        )
        const startX = handle.x + handle.width / 2
        const startY = handle.y + handle.height / 2
        return dragPointer(
          page,
          { x: startX, y: startY },
          { x: deltaX, y: deltaY },
          pointerScale,
        )
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

  return [
    fc.integer({ min: 20, max: 500 }).map(
      (x) => new ApplyGeometryXCommand(counts, phase, x),
    ),
    fc.tuple(
      fc.integer({ min: 12, max: 60 }),
      fc.integer({ min: 12, max: 60 }),
    ).map(([x, y]) => new MoveGeometryCommand(counts, phase, x, y)),
    fc.tuple(
      fc.constantFrom(...resizeDirections),
      fc.integer({ min: 12, max: 48 }),
      fc.integer({ min: 12, max: 48 }),
    ).map(([direction, x, y]) =>
      new ResizeGeometryCommand(counts, phase, direction, x, y),
    ),
    fc.tuple(
      fc.integer({ min: 12, max: 60 }),
      fc.integer({ min: 12, max: 60 }),
    ).map(([x, y]) => new CancelGeometryMoveCommand(counts, phase, x, y)),
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
      : fc.tuple(
          fc.array(
            fc.constant(
              new InspectGeometryBaselineCommand(counts, currentPhase),
            ),
            { maxLength: 4, size: "max" },
          ),
          fc.integer({ min: 12, max: 96 }),
          fc.integer({ min: 12, max: 96 }),
        ).map(([prefix, x, y]) => [
          ...prefix,
          new MoveGeometryCommand(counts, currentPhase, x, y),
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
  expect(report.minimalActions.some(
    (action) => action.startsWith("pointer-move("),
  )).toBe(true)
  expect(report.minimalActions.at(-1)).toBe("inspect-stored-geometry")

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

  const moveAndInspect = faulty.details.counterexample?.[0]
  ok(moveAndInspect, "Expected a reduced pointer sequence")
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
    new ApplyGeometryXCommand(
      requiredCounts,
      requiredPhase,
      NOTE_CANVAS_SIZE + 1,
    ),
    new InspectGeometryCommand(requiredCounts, requiredPhase),
  ]
  await expect(
    executeGeometryCommands(browser, propertyAndResize, "none"),
  ).resolves.toBeUndefined()

  const gestureSequence = [
    new CancelGeometryMoveCommand(requiredCounts, requiredPhase, 45, 40),
    new InspectGeometryCommand(requiredCounts, requiredPhase),
    new ResizeGeometryCommand(
      requiredCounts,
      requiredPhase,
      "south-east",
      48,
      32,
    ),
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

test("여덟 방향의 크기 조절은 반대편 변과 저장 원문을 유지한다", async ({
  browser,
}) => {
  test.setTimeout(180_000)
  const reports: { direction: ResizeDirection; runs: number; seed: number }[] = []

  for (const direction of resizeDirections) {
    const directionBrowser = await browser.browserType().launch()
    try {
      const counts = createExplorationActionCounts()
      const phase = () => "exploration" as const
      const details = await fc.check(
        fc.asyncProperty(
          fc.integer({ min: 12, max: 160 }),
          fc.integer({ min: 12, max: 120 }),
          async (deltaX, deltaY) => {
            await executeGeometryCommands(directionBrowser, [
              new ResizeGeometryCommand(
                counts,
                phase,
                direction,
                deltaX,
                deltaY,
              ),
              new InspectGeometryCommand(counts, phase),
            ], "none")
          },
        ),
        { numRuns: 3 },
      )
      const failure = details.errorInstance
      expect(
        details.failed,
        `${direction}: ${failure instanceof Error ? failure.stack : String(failure)}`,
      ).toBe(false)
      reports.push({ direction, runs: details.numRuns, seed: details.seed })
    } finally {
      await directionBrowser.close()
    }
  }

  console.info(JSON.stringify({
    browser: browser.browserType().name(),
    feature: "note-geometry-resize-directions",
    reports,
  }))
})

test("확대 뒤 이동과 크기 조절량을 메모 좌표로 저장한다", async ({ browser }) => {
  test.setTimeout(90_000)
  const counts = createExplorationActionCounts()
  const phase = () => "exploration" as const
  const details = await fc.check(
    fc.asyncProperty(
      fc.integer({ min: 12, max: 72 }),
      fc.integer({ min: 12, max: 72 }),
      async (deltaX, deltaY) => {
        await executeGeometryCommands(browser, [
          new MoveGeometryCommand(counts, phase, deltaX, deltaY),
          new InspectGeometryCommand(counts, phase),
          new ResizeGeometryCommand(
            counts,
            phase,
            "south-east",
            deltaX,
            deltaY,
          ),
          new InspectGeometryCommand(counts, phase),
        ], "none", true)
      },
    ),
    { numRuns: 3 },
  )
  const failure = details.errorInstance
  expect(
    details.failed,
    failure instanceof Error ? failure.stack : String(failure),
  ).toBe(false)
  console.info(JSON.stringify({
    browser: browser.browserType().name(),
    feature: "note-geometry-zoomed-gesture",
    runs: details.numRuns,
    seed: details.seed,
  }))
})
