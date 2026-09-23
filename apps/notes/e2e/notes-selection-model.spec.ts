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
import { readStoredNote } from "./support/read-stored-note"

type NotePosition = 0 | 1
type ClearMethod = "blank" | "command" | "escape"
type SelectionDefect = "none" | "retarget-properties-after-clear"
type FocusTarget =
  | `editor:${NotePosition}`
  | `header-action:${NotePosition}`
  | `note:${NotePosition}`
  | "canvas"
  | "other"
  | "properties-width"
  | "properties-x"

type SelectionModel = {
  draftWidth: string | null
  focus: FocusTarget
  initialWidths: [string, string]
  observationPending: boolean
  panelOpen: boolean
  propertiesTarget: NotePosition | null
  selected: NotePosition | null
}

type SelectionReal = {
  clear(method: ClearMethod, notePosition: NotePosition): Promise<void>
  clickHeader(notePosition: NotePosition): Promise<void>
  closeProperties(): Promise<void>
  editInvalidWidth(): Promise<void>
  enterHeaderAction(notePosition: NotePosition): Promise<void>
  enterNote(notePosition: NotePosition): Promise<void>
  enterTextarea(notePosition: NotePosition): Promise<void>
  inspect(expected: SelectionModel): Promise<void>
  openFromHeader(notePosition: NotePosition): Promise<void>
  tabToNote(notePosition: NotePosition): Promise<void>
}

function noteFocus(position: NotePosition): FocusTarget {
  return `note:${position}`
}

function activateProperties(
  model: SelectionModel,
  position: NotePosition,
  focus: "first-field" | "preserve",
) {
  if (model.propertiesTarget !== position) {
    model.draftWidth = model.initialWidths[position]
  }
  model.selected = position
  model.propertiesTarget = position
  model.panelOpen = true
  if (focus === "first-field") {
    model.focus = "properties-x"
  }
  model.observationPending = true
}

abstract class SelectionCommand
  implements fc.AsyncCommand<SelectionModel, SelectionReal>
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

  abstract check(model: Readonly<SelectionModel>): boolean
  abstract run(model: SelectionModel, real: SelectionReal): Promise<void>
  abstract toString(): string
}

class TabSelectCommand extends SelectionCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly position: NotePosition,
  ) {
    super(counts, phase)
  }

  check(model: Readonly<SelectionModel>) {
    return this.accept(
      model.selected !== this.position ||
        model.focus !== noteFocus(this.position),
    )
  }

  async run(model: SelectionModel, real: SelectionReal) {
    this.recordExecution()
    await real.tabToNote(this.position)
    model.selected = this.position
    model.focus = noteFocus(this.position)
    model.observationPending = true
  }

  toString() {
    return `select-tab(${this.position})`
  }
}

class ClickHeaderCommand extends SelectionCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly position: NotePosition,
  ) {
    super(counts, phase)
  }

  check(model: Readonly<SelectionModel>) {
    return this.accept(model.selected !== this.position)
  }

  async run(model: SelectionModel, real: SelectionReal) {
    this.recordExecution()
    await real.clickHeader(this.position)
    model.selected = this.position
    model.observationPending = true
  }

  toString() {
    return `select-header-click(${this.position})`
  }
}

class OpenPropertiesFromHeaderCommand extends SelectionCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly position: NotePosition,
  ) {
    super(counts, phase)
  }

  check(model: Readonly<SelectionModel>) {
    return this.accept(
      !model.panelOpen || model.propertiesTarget !== this.position,
    )
  }

  async run(model: SelectionModel, real: SelectionReal) {
    this.recordExecution()
    await real.openFromHeader(this.position)
    activateProperties(model, this.position, "preserve")
  }

  toString() {
    return `open-properties-pointer(${this.position})`
  }
}

class EnterNoteCommand extends SelectionCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly position: NotePosition,
  ) {
    super(counts, phase)
  }

  check(model: Readonly<SelectionModel>) {
    return this.accept(model.focus === noteFocus(this.position))
  }

  async run(model: SelectionModel, real: SelectionReal) {
    this.recordExecution()
    await real.enterNote(this.position)
    if (model.selected === this.position) {
      activateProperties(model, this.position, "first-field")
      return
    }
    model.observationPending = true
  }

  toString() {
    return `press-note-enter(${this.position})`
  }
}

class EditInvalidWidthCommand extends SelectionCommand {
  check(model: Readonly<SelectionModel>) {
    return this.accept(model.panelOpen && model.draftWidth !== "4096")
  }

  async run(model: SelectionModel, real: SelectionReal) {
    this.recordExecution()
    await real.editInvalidWidth()
    model.draftWidth = "4096"
    model.focus = "properties-width"
    model.observationPending = true
  }

  toString() {
    return "edit-width(4096)"
  }
}

class ClearSelectionCommand extends SelectionCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly method: ClearMethod,
    private readonly position: NotePosition,
  ) {
    super(counts, phase)
  }

  check(model: Readonly<SelectionModel>) {
    return this.accept(model.selected !== null)
  }

  async run(model: SelectionModel, real: SelectionReal) {
    this.recordExecution()
    await real.clear(this.method, this.position)
    model.selected = null
    if (this.method === "blank") {
      model.focus = "canvas"
    } else if (this.method === "command") {
      model.focus = noteFocus(this.position)
    }
    model.observationPending = true
  }

  toString() {
    return `clear-selection(${this.method})`
  }
}

class ClosePropertiesCommand extends SelectionCommand {
  check(model: Readonly<SelectionModel>) {
    return this.accept(model.panelOpen && model.draftWidth !== "4096")
  }

  async run(model: SelectionModel, real: SelectionReal) {
    this.recordExecution()
    await real.closeProperties()
    model.panelOpen = false
    model.focus = "other"
    model.observationPending = true
  }

  toString() {
    return "close-properties"
  }
}

class EnterTextareaCommand extends SelectionCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly position: NotePosition,
  ) {
    super(counts, phase)
  }

  check() {
    return this.accept(true)
  }

  async run(model: SelectionModel, real: SelectionReal) {
    this.recordExecution()
    await real.enterTextarea(this.position)
    model.focus = `editor:${this.position}`
    model.observationPending = true
  }

  toString() {
    return `press-editor-enter(${this.position})`
  }
}

class EnterHeaderActionCommand extends SelectionCommand {
  constructor(
    counts: ExplorationActionCounts,
    phase: () => ExplorationPhase,
    private readonly position: NotePosition,
  ) {
    super(counts, phase)
  }

  check() {
    return this.accept(true)
  }

  async run(model: SelectionModel, real: SelectionReal) {
    this.recordExecution()
    await real.enterHeaderAction(this.position)
    model.focus = `header-action:${this.position}`
    model.observationPending = true
  }

  toString() {
    return `press-header-action-enter(${this.position})`
  }
}

class InspectSelectionCommand extends SelectionCommand {
  check(model: Readonly<SelectionModel>) {
    return this.accept(model.observationPending)
  }

  async run(model: SelectionModel, real: SelectionReal) {
    this.recordExecution()
    await real.inspect(model)
    model.observationPending = false
  }

  toString() {
    return "inspect-selection-state"
  }
}

class InspectSelectionBaselineCommand extends SelectionCommand {
  check(model: Readonly<SelectionModel>) {
    return this.accept(!model.observationPending)
  }

  async run(model: SelectionModel, real: SelectionReal) {
    this.recordExecution()
    await real.inspect(model)
  }

  toString() {
    return "inspect-selection-baseline"
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

async function visibleBox(locator: Locator) {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("Expected a visible element box")
  }
  return box
}

async function clickBlankCanvas(page: Page) {
  const workspace = page.getByRole("region", { name: "메모 작업 영역" })
  const box = await visibleBox(workspace)
  await page.mouse.click(box.x + box.width * 0.72, box.y + box.height * 0.72)
}

async function settleFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
  )
}

async function activeFocus(
  page: Page,
  noteIds: readonly string[],
): Promise<FocusTarget> {
  return page.evaluate<FocusTarget, string[]>((ids): FocusTarget => {
    const active = document.activeElement
    if (!(active instanceof HTMLElement)) {
      return "other"
    }
    const article = active.closest("article")
    if (article instanceof HTMLElement) {
      const articleId = article.id
      const noteId = articleId.startsWith("note-") && articleId.endsWith("-board")
        ? decodeURIComponent(articleId.slice(5, -6))
        : null
      const position = noteId === null ? -1 : ids.indexOf(noteId)
      if (position === 0 || position === 1) {
        if (active === article) {
          return `note:${position}`
        }
        if (active.matches("textarea")) {
          return `editor:${position}`
        }
        if (active.getAttribute("aria-label") === "메모 동작") {
          return `header-action:${position}`
        }
      }
    }

    const properties = active.closest('[aria-label="메모 속성"]')
    if (properties !== null) {
      const label = active.closest("label")?.textContent?.trim()
      if (label === "X") {
        return "properties-x"
      }
      if (label === "너비") {
        return "properties-width"
      }
    }

    const firstArticle = document.getElementById(
      `note-${encodeURIComponent(ids[0] ?? "")}-board`,
    )
    const canvas = firstArticle?.parentElement?.parentElement
    return active === canvas ? "canvas" : "other"
  }, [...noteIds])
}

async function selectedVisible(article: Locator) {
  return article.evaluate((element) => {
    const selection = getComputedStyle(element, "::after")
    return (
      selection.content !== "none" &&
      Number.parseFloat(selection.borderTopWidth) > 0 &&
      selection.borderTopStyle !== "none"
    )
  })
}

async function installRetargetAfterCanvasClear(page: Page, noteId: string) {
  await page.evaluate((controlledNoteId) => {
    const article = document.getElementById(
      `note-${encodeURIComponent(controlledNoteId)}-board`,
    )
    const moveHandle = article?.querySelector('[aria-label="메모 이동"]')
    const board = article?.parentElement
    const viewport = board?.parentElement
    if (
      !(moveHandle instanceof HTMLElement) ||
      !(viewport instanceof HTMLElement)
    ) {
      throw new Error("Expected note canvas elements")
    }

    viewport.addEventListener("pointerup", (event) => {
      if (event.target !== viewport && event.target !== board) {
        return
      }
      requestAnimationFrame(() => {
        moveHandle.dispatchEvent(
          new MouseEvent("dblclick", {
            bubbles: true,
            button: 0,
            composed: true,
          }),
        )
      })
    })
  }, noteId)
}

async function executeSelectionCommands(
  browser: Browser,
  commands: Iterable<fc.AsyncCommand<SelectionModel, SelectionReal>>,
  defect: SelectionDefect,
) {
  const context = await browser.newContext({
    viewport: { height: 900, width: 1280 },
  })

  try {
    const page = await context.newPage()
    await page.goto("/")
    const contents = ["첫 번째 선택 메모", "두 번째 선택 메모"] as const
    const noteIds: [string, string] = ["", ""]
    for (const [position, content] of contents.entries()) {
      const note = await createNoteThroughUi(page, content)
      noteIds[position as NotePosition] = await noteIdFromArticle(note)
    }

    const storedNotes = await Promise.all(
      noteIds.map((noteId) => readStoredNote(page, noteId)),
    )
    if (storedNotes.some((note) => note === null)) {
      throw new Error("Expected stored notes")
    }
    const initialWidths: [string, string] = [
      String(storedNotes[0]?.geometry.width),
      String(storedNotes[1]?.geometry.width),
    ]

    await clickBlankCanvas(page)
    await settleFrames(page)
    if (defect === "retarget-properties-after-clear") {
      await installRetargetAfterCanvasClear(page, noteIds[1])
    }

    const notes = noteIds.map((noteId) => articleForId(page, noteId)) as [
      Locator,
      Locator,
    ]
    const properties = page.getByRole("complementary", {
      name: "메모 속성",
    })
    const real: SelectionReal = {
      async clear(method, notePosition) {
        if (method === "blank") {
          await clickBlankCanvas(page)
        } else if (method === "escape") {
          await page.keyboard.press("Escape")
        } else {
          const action = notes[notePosition].getByRole("button", {
            name: "메모 동작",
          })
          await action.focus()
          await page.keyboard.down("Meta")
          await expect(action).toBeHidden()
          await page.keyboard.up("Meta")
          await expect(action).toBeVisible()
        }
        await settleFrames(page)
      },
      async clickHeader(notePosition) {
        await notes[notePosition].click({ position: { x: 12, y: 14 } })
      },
      async closeProperties() {
        await properties
          .getByRole("button", { name: "메모 속성 패널 닫기" })
          .click()
        await expect(properties).toHaveCount(0)
      },
      async editInvalidWidth() {
        await properties
          .getByRole("spinbutton", { name: "너비" })
          .fill("4096")
      },
      async enterHeaderAction(notePosition) {
        const action = notes[notePosition].getByRole("button", {
          name: "메모 동작",
        })
        await action.focus()
        await action.press("Enter")
        await expect(action).toHaveAttribute("aria-expanded", "true")
        await action.focus()
        await action.press("Enter")
        await expect(action).toHaveAttribute("aria-expanded", "false")
        await expect(action).toBeFocused()
      },
      async enterNote(notePosition) {
        await notes[notePosition].press("Enter")
      },
      async enterTextarea(notePosition) {
        const editor = notes[notePosition].getByRole("textbox", {
          name: "메모 내용",
        })
        await editor.focus()
        await editor.press("Enter")
      },
      async inspect(expected) {
        await settleFrames(page)
        const panelOpen = await properties.isVisible().catch(() => false)
        const panelTitle = panelOpen
          ? await properties.getByRole("heading").textContent()
          : null
        const panelWidth = panelOpen
          ? await properties
              .getByRole("spinbutton", { name: "너비" })
              .inputValue()
          : null
        const observed = {
          focus: await activeFocus(page, noteIds),
          headerVisible: await Promise.all(
            notes.map((note) =>
              note
                .getByRole("button", { name: "메모 동작" })
                .isVisible(),
            ),
          ),
          panel: {
            open: panelOpen,
            title: panelTitle,
            width: panelWidth,
          },
          selected: await Promise.all(notes.map(selectedVisible)),
        }
        const wanted = {
          focus: expected.focus,
          headerVisible: [true, true],
          panel: {
            open: expected.panelOpen,
            title:
              expected.panelOpen && expected.propertiesTarget !== null
                ? contents[expected.propertiesTarget]
                : null,
            width: expected.panelOpen ? expected.draftWidth : null,
          },
          selected: [expected.selected === 0, expected.selected === 1],
        }
        if (JSON.stringify(observed) !== JSON.stringify(wanted)) {
          throw new ExplorationInvariantError(
            "selection-focus-and-properties-target-stay-independent",
            wanted,
            observed,
          )
        }
      },
      async openFromHeader(notePosition) {
        await notes[notePosition].dblclick({ position: { x: 12, y: 14 } })
        await expect(properties).toBeVisible()
      },
      async tabToNote(notePosition) {
        const batchCopy = page.getByRole("button", {
          name: /^일괄 복사 \d+개$/u,
        })
        await batchCopy.focus()
        for (let index = 0; index <= notePosition; index += 1) {
          await page.keyboard.press("Tab")
        }
        await expect(notes[notePosition]).toBeFocused()
      },
    }

    const initialModel: SelectionModel = {
      draftWidth: null,
      focus: "canvas",
      initialWidths,
      observationPending: false,
      panelOpen: false,
      propertiesTarget: null,
      selected: null,
    }
    await fc.asyncModelRun(
      () => ({
        model: initialModel,
        real,
      }),
      commands,
    )
    await real.inspect(initialModel)
  } finally {
    await context.close()
  }
}

function selectionCommands(
  counts: ExplorationActionCounts,
  phase: () => ExplorationPhase,
) {
  return [
    fc.constantFrom<NotePosition>(0, 1).map(
      (position) => new TabSelectCommand(counts, phase, position),
    ),
    fc.constantFrom<NotePosition>(0, 1).map(
      (position) => new ClickHeaderCommand(counts, phase, position),
    ),
    fc.constantFrom<NotePosition>(0, 1).map(
      (position) =>
        new OpenPropertiesFromHeaderCommand(counts, phase, position),
    ),
    fc.constantFrom<NotePosition>(0, 1).map(
      (position) => new EnterNoteCommand(counts, phase, position),
    ),
    fc.constant(new EditInvalidWidthCommand(counts, phase)),
    fc.constantFrom<ClearMethod>("blank", "command", "escape").chain(
      (method) =>
        fc.constantFrom<NotePosition>(0, 1).map(
          (position) =>
            new ClearSelectionCommand(counts, phase, method, position),
        ),
    ),
    fc.constant(new ClosePropertiesCommand(counts, phase)),
    fc.constantFrom<NotePosition>(0, 1).map(
      (position) => new EnterTextareaCommand(counts, phase, position),
    ),
    fc.constantFrom<NotePosition>(0, 1).map(
      (position) => new EnterHeaderActionCommand(counts, phase, position),
    ),
    fc.constant(new InspectSelectionCommand(counts, phase)),
  ]
}

async function checkSelectionExploration(
  browser: Browser,
  defect: SelectionDefect,
) {
  const counts = createExplorationActionCounts()
  let phase: ExplorationPhase = "exploration"
  const currentPhase = () => phase
  const sequences = defect === "none"
    ? fc.commands(selectionCommands(counts, currentPhase), { maxCommands: 10 })
    : fc
        .array(
          fc.constant(
            new InspectSelectionBaselineCommand(counts, currentPhase),
          ),
          { maxLength: 4, size: "max" },
        )
        .map((prefix) => [
          ...prefix,
          new OpenPropertiesFromHeaderCommand(counts, currentPhase, 0),
          new EditInvalidWidthCommand(counts, currentPhase),
          new ClickHeaderCommand(counts, currentPhase, 1),
          new ClearSelectionCommand(counts, currentPhase, "blank", 1),
          new InspectSelectionCommand(counts, currentPhase),
        ])
  const property = fc.asyncProperty(sequences, async (generatedCommands) => {
    try {
      await executeSelectionCommands(browser, generatedCommands, defect)
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
    numRuns: defect === "none" ? 10 : 20,
    seed: defect === "none" ? 21 : 24,
    verbose: true,
  })

  return {
    counts,
    details,
    durationMs: Math.round(performance.now() - startedAt),
    sequences,
  }
}

test("선택과 속성 대상의 실패를 줄이고 실제 포커스로 재현한다", async ({
  browser,
}) => {
  test.setTimeout(180_000)
  const normal = await checkSelectionExploration(browser, "none")
  expect(normal.details.failed, fc.defaultReportMessage(normal.details)).toBe(false)
  expect(normal.details.interrupted).toBe(false)
  console.info(
    JSON.stringify({
      actionCounts: normal.counts,
      appRevision: readAppRevision(),
      classification: "normal",
      durationMs: normal.durationMs,
      environment: `${browser.browserType().name()}-desktop-1280x900`,
      feature: "note-selection-focus-properties-target",
      layer: "note-card-session-and-properties-panel",
      modelRevision: "selection-focus-v1",
      profile: noteModelProfile,
      runs: normal.details.numRuns,
      seed: normal.details.seed,
      termination: "completed",
      toolVersions: { fastCheck: fc.__version, playwright: "1.62.1" },
    }),
  )

  const faulty = await checkSelectionExploration(
    browser,
    "retarget-properties-after-clear",
  )
  expect(faulty.details.failed).toBe(true)
  expect(faulty.details.interrupted).toBe(false)
  const report = createExplorationReport(faulty.details, {
    actionCounts: faulty.counts,
    appRevision: readAppRevision(),
    classification: "controlled-defect",
    durationMs: faulty.durationMs,
    environment: `${browser.browserType().name()}-desktop-1280x900`,
    feature: "note-selection-focus-properties-target",
    initialState: {
      contents: ["첫 번째 선택 메모", "두 번째 선택 메모"],
      focus: "canvas",
      propertiesTarget: null,
      selected: null,
    },
    layer: "note-card-session-and-properties-panel",
    modelRevision: "selection-focus-v1",
    profile: noteModelProfile,
    toolVersions: { fastCheck: fc.__version, playwright: "1.62.1" },
  })

  expect(report.invariant).toBe(
    "selection-focus-and-properties-target-stay-independent",
  )
  expect(report.originalActions.length).toBeGreaterThan(
    report.minimalActions.length,
  )
  expect(report.minimalActions).toEqual([
    "open-properties-pointer(0)",
    "edit-width(4096)",
    "select-header-click(1)",
    "clear-selection(blank)",
    "inspect-selection-state",
  ])

  const replay = await fc.check(
    fc.asyncProperty(faulty.sequences, async (generatedCommands) => {
      await executeSelectionCommands(
        browser,
        generatedCommands,
        "retarget-properties-after-clear",
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
  const retargetAfterClear = [
    new OpenPropertiesFromHeaderCommand(directCounts, directPhase, 0),
    new EditInvalidWidthCommand(directCounts, directPhase),
    new ClickHeaderCommand(directCounts, directPhase, 1),
    new ClearSelectionCommand(directCounts, directPhase, "blank", 1),
    new InspectSelectionCommand(directCounts, directPhase),
  ]
  await expect(
    executeSelectionCommands(
      browser,
      retargetAfterClear,
      "retarget-properties-after-clear",
    ),
  ).rejects.toMatchObject({ invariant: report.invariant })
  await expect(
    executeSelectionCommands(browser, retargetAfterClear, "none"),
  ).resolves.toBeUndefined()

  const requiredCounts = createExplorationActionCounts()
  const requiredPhase = () => "exploration" as const
  await executeSelectionCommands(
    browser,
    [
      new TabSelectCommand(requiredCounts, requiredPhase, 0),
      new InspectSelectionCommand(requiredCounts, requiredPhase),
      new EnterNoteCommand(requiredCounts, requiredPhase, 0),
      new InspectSelectionCommand(requiredCounts, requiredPhase),
      new ClosePropertiesCommand(requiredCounts, requiredPhase),
      new InspectSelectionCommand(requiredCounts, requiredPhase),
    ],
    "none",
  )
  await executeSelectionCommands(
    browser,
    [
      new TabSelectCommand(requiredCounts, requiredPhase, 0),
      new ClearSelectionCommand(requiredCounts, requiredPhase, "escape", 0),
      new EnterNoteCommand(requiredCounts, requiredPhase, 0),
      new InspectSelectionCommand(requiredCounts, requiredPhase),
    ],
    "none",
  )
  await executeSelectionCommands(
    browser,
    [
      new OpenPropertiesFromHeaderCommand(requiredCounts, requiredPhase, 0),
      new EditInvalidWidthCommand(requiredCounts, requiredPhase),
      new ClickHeaderCommand(requiredCounts, requiredPhase, 1),
      new ClearSelectionCommand(requiredCounts, requiredPhase, "blank", 1),
      new InspectSelectionCommand(requiredCounts, requiredPhase),
    ],
    "none",
  )
  await executeSelectionCommands(
    browser,
    [
      new OpenPropertiesFromHeaderCommand(requiredCounts, requiredPhase, 0),
      new EditInvalidWidthCommand(requiredCounts, requiredPhase),
      new ClickHeaderCommand(requiredCounts, requiredPhase, 1),
      new ClearSelectionCommand(requiredCounts, requiredPhase, "escape", 1),
      new InspectSelectionCommand(requiredCounts, requiredPhase),
    ],
    "none",
  )
  await executeSelectionCommands(
    browser,
    [
      new ClickHeaderCommand(requiredCounts, requiredPhase, 0),
      new InspectSelectionCommand(requiredCounts, requiredPhase),
      new EnterTextareaCommand(requiredCounts, requiredPhase, 1),
      new InspectSelectionCommand(requiredCounts, requiredPhase),
      new EnterHeaderActionCommand(requiredCounts, requiredPhase, 1),
      new InspectSelectionCommand(requiredCounts, requiredPhase),
      new ClearSelectionCommand(requiredCounts, requiredPhase, "command", 1),
      new InspectSelectionCommand(requiredCounts, requiredPhase),
    ],
    "none",
  )

  console.info(JSON.stringify(report))
  console.info(
    JSON.stringify({
      actionCounts: requiredCounts,
      classification: "required-sequences",
      environment: `${browser.browserType().name()}-desktop-1280x900`,
      feature: "note-selection-focus-properties-target",
      layer: "note-card-session-and-properties-panel",
      termination: "completed",
    }),
  )
})
