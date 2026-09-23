import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test"
import * as fc from "fast-check"

import {
  createMobileNoteThroughUi,
  createNoteThroughUi,
} from "./support/create-note-through-ui"
import {
  preparePointerCaptureRelease,
  releasePointerCapture,
} from "./support/pointer-capture"
import {
  noteIdFromHref,
  readStoredNote,
  readStoredNoteDraft,
  writeStoredNoteDraft,
} from "./support/read-stored-note"
import { runNoteAction } from "./support/run-note-action"

async function visibleBox(locator: Locator) {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error("Visible element has no bounding box")
  }

  return box
}

async function createUntilFirstNoteLeavesView(
  page: Page,
  firstNote: Locator,
  controls: Locator,
  workspace: Locator,
) {
  const firstBox = await visibleBox(firstNote)
  const workspaceBox = await visibleBox(workspace)
  const visibleCapacity =
    Math.ceil(workspaceBox.width / firstBox.width) *
    Math.ceil(workspaceBox.height / firstBox.height)

  for (let attempt = 0; attempt < visibleCapacity; attempt += 1) {
    const latestNote = await createNoteThroughUi(
      page,
      `추가 메모-${crypto.randomUUID()}`,
    )
    await expect(latestNote).toBeInViewport()
    await expect(controls).toBeInViewport()
    const currentFirstBox = await visibleBox(firstNote)

    if (currentFirstBox.x + currentFirstBox.width < workspaceBox.x) {
      return latestNote
    }
  }

  throw new Error("A newly focused note did not move the first note out of view")
}

async function openPropertiesWithKeyboard(note: Locator) {
  await note.focus()
  await expect(note).toBeFocused()
  await note.press("Enter")
  return note.page().getByRole("complementary", { name: "메모 속성" })
}

async function clickBlankCanvas(page: Page) {
  const workspace = page.getByRole("region", { name: "메모 작업 영역" })
  const box = await visibleBox(workspace)

  await page.mouse.click(box.x + box.width * 0.72, box.y + box.height * 0.72)
}

async function readTopControlTabIndex(locator: Locator) {
  const attribute = await locator.getAttribute("tabindex")

  if (attribute === null) {
    throw new Error("Top control has no tabindex")
  }

  const value = Number(attribute)
  expect(Number.isInteger(value)).toBe(true)
  expect(value).toBeGreaterThan(0)
  expect(value).toBeLessThan(1000)
  return value
}

type NoteCreationModel = {
  contents: string[]
}

type NoteCreationReal = {
  actions?: string[]
  page: Page
}

type StoredCreationState = {
  contents: string[]
  distinctIds: number
}

type CreationFailure = {
  actions: string[]
  expectedContents: string[]
  observed: StoredCreationState
}

async function readStoredCreationState(page: Page): Promise<StoredCreationState> {
  return page.evaluate(
    () =>
      new Promise<StoredCreationState>((resolve, reject) => {
        const openRequest = indexedDB.open("personal-notes")
        openRequest.onerror = () => reject(openRequest.error)
        openRequest.onsuccess = () => {
          const database = openRequest.result
          const transaction = database.transaction("notes", "readonly")
          const request = transaction.objectStore("notes").getAll()

          transaction.onerror = () => {
            database.close()
            reject(transaction.error)
          }
          transaction.oncomplete = () => {
            const records = request.result as {
              content: string
              id: string
            }[]
            database.close()
            resolve({
              contents: records.map(({ content }) => content).sort(),
              distinctIds: new Set(records.map(({ id }) => id)).size,
            })
          }
        }
      }),
  )
}

async function expectStoredCreationState(page: Page, contents: string[]) {
  await expect
    .poll(() => readStoredCreationState(page))
    .toEqual({ contents: [...contents].sort(), distinctIds: contents.length })
}

async function expectVisibleNoteContents(page: Page, expected: string[]) {
  const editors = page.getByRole("textbox", { name: "메모 내용" })
  await expect(editors).toHaveCount(expected.length)
  const contents = await Promise.all(
    (await editors.all()).map((editor) => editor.inputValue()),
  )
  expect(contents).toEqual(expected)
}

class CreateNoteThroughUiCommand
  implements fc.AsyncCommand<NoteCreationModel, NoteCreationReal>
{
  constructor(private readonly content: string) {}

  check() {
    return true
  }

  async run(model: NoteCreationModel, { actions, page }: NoteCreationReal) {
    actions?.push(this.toString())
    await createNoteThroughUi(page, this.content)
    model.contents.push(this.content)
    await expectVisibleNoteContents(page, model.contents)
    await expectStoredCreationState(page, model.contents)
  }

  toString() {
    return `create(${JSON.stringify(this.content)})`
  }
}

class FailNoteCreationThroughUiCommand
  implements fc.AsyncCommand<NoteCreationModel, NoteCreationReal>
{
  check() {
    return true
  }

  async run(model: NoteCreationModel, { actions, page }: NoteCreationReal) {
    actions?.push(this.toString())
    await page.getByRole("button", { name: "새 메모" }).click()
    await expect(
      page.getByRole("alert").filter({
        hasText: "메모를 만들지 못했습니다. 다시 시도하세요.",
      }),
    ).toBeVisible()
    await expect(
      page.getByRole("textbox", { name: "메모 내용" }),
    ).toHaveCount(model.contents.length)
    await expect(page.getByRole("button", { name: "새 메모" })).toBeEnabled()
  }

  toString() {
    return "fail-create"
  }
}

class ReloadNotesThroughUiCommand
  implements fc.AsyncCommand<NoteCreationModel, NoteCreationReal>
{
  check(model: Readonly<NoteCreationModel>) {
    return model.contents.length > 0
  }

  async run(model: NoteCreationModel, { actions, page }: NoteCreationReal) {
    actions?.push(this.toString())
    await page.reload()
    await expectVisibleNoteContents(page, model.contents)
    await expectStoredCreationState(page, model.contents)
  }

  toString() {
    return "reload"
  }
}

const noteCreationContent = fc.string({
  maxLength: 32,
  minLength: 1,
  unit: "grapheme-ascii",
})

const noteCreationCommands = fc.commands(
  [
    noteCreationContent.map((content) => new CreateNoteThroughUiCommand(content)),
    fc.constant(new ReloadNotesThroughUiCommand()),
  ],
  { maxCommands: 4 },
)

async function contextWithoutSecondCreatedNote(browser: Browser) {
  const context = await browser.newContext()
  await context.addInitScript(() => {
    const originalPut = IDBObjectStore.prototype.put
    let createdCount = 0
    let omittedNoteId: string | null = null

    IDBObjectStore.prototype.put = function (value, key) {
      const record = value as {
        content: string
        contentRevision: number
        id: string
      }

      if (
        this.name === "notes" &&
        record.content === "" &&
        record.contentRevision === 0
      ) {
        createdCount += 1

        if (createdCount === 2) {
          omittedNoteId = record.id
        }
      }

      if (this.name === "notes" && record.id === omittedNoteId) {
        return this.get(record.id)
      }

      return key === undefined
        ? originalPut.call(this, value)
        : originalPut.call(this, value, key)
    }
  })
  return context
}

function replaySequence<Model extends object, Real>(
  details: fc.RunDetails<[Iterable<fc.AsyncCommand<Model, Real>>]>,
) {
  const commands = details.counterexample?.[0]
  const path = details.counterexamplePath

  if (commands === undefined || path === null) {
    throw new Error("Missing reduced command sequence")
  }

  const printed = String(commands)
  const replayPath = printed.match(/\/\*replayPath="([^"]+)"\*\//u)?.[1]

  if (replayPath === undefined) {
    throw new Error("Missing command replay path")
  }

  return { commands, path, printed, replayPath }
}

function expectMissingCreatedNote(failure: CreationFailure | undefined) {
  if (failure === undefined) {
    throw new Error("Missing creation failure observation")
  }

  expect(failure.observed.distinctIds).toBeLessThan(
    failure.expectedContents.length,
  )
  expect(failure.observed.contents).not.toEqual(
    [...failure.expectedContents].sort(),
  )
}

type AutosaveModel = {
  elapsedSinceInput: number
  input: string
  stored: string
}

type AutosaveReal = {
  actions: string[]
  editor: Locator
  noteId: string
  page: Page
}

type AutosaveFailure = {
  actions: string[]
  expectedContent: string
  observedContent: string | null
}

async function expectAutosaveStored(real: AutosaveReal, content: string) {
  await expect
    .poll(async () => (await readStoredNote(real.page, real.noteId))?.content)
    .toBe(content)
}

class EnterAutosaveContent implements fc.AsyncCommand<AutosaveModel, AutosaveReal> {
  constructor(private readonly content: string) {}

  check() {
    return true
  }

  async run(model: AutosaveModel, real: AutosaveReal) {
    real.actions.push(this.toString())
    await real.editor.fill(this.content)
    model.input = this.content
    model.elapsedSinceInput = 0
    await expect(real.editor).toHaveValue(model.input)
  }

  toString() {
    return `enter(${JSON.stringify(this.content)})`
  }
}

class AdvanceAutosaveClock implements fc.AsyncCommand<AutosaveModel, AutosaveReal> {
  constructor(private readonly durationMs: number) {}

  check(model: Readonly<AutosaveModel>) {
    return model.input !== model.stored
  }

  async run(model: AutosaveModel, real: AutosaveReal) {
    real.actions.push(this.toString())
    await real.page.clock.runFor(this.durationMs)
    model.elapsedSinceInput += this.durationMs

    if (model.elapsedSinceInput >= 800) {
      model.stored = model.input
      await expectAutosaveStored(real, model.stored)
      return
    }

    const observed = await readStoredNote(real.page, real.noteId)
    expect(observed?.content).toBe(model.stored)
  }

  toString() {
    return `advance(${this.durationMs})`
  }
}

class BlurAutosaveEditor implements fc.AsyncCommand<AutosaveModel, AutosaveReal> {
  check(model: Readonly<AutosaveModel>) {
    return model.input !== model.stored
  }

  async run(model: AutosaveModel, real: AutosaveReal) {
    real.actions.push(this.toString())
    await real.editor.press("Tab")
    model.stored = model.input
    await expectAutosaveStored(real, model.stored)
  }

  toString() {
    return "blur"
  }
}

class SignalAutosaveExit implements fc.AsyncCommand<AutosaveModel, AutosaveReal> {
  constructor(private readonly signal: "hidden" | "pagehide") {}

  check(model: Readonly<AutosaveModel>) {
    return model.input !== model.stored
  }

  async run(model: AutosaveModel, real: AutosaveReal) {
    real.actions.push(this.toString())
    await real.page.evaluate((signal) => {
      if (signal === "pagehide") {
        window.dispatchEvent(new Event("pagehide"))
        return
      }

      const visibility = Object.getOwnPropertyDescriptor(
        document,
        "visibilityState",
      )
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      })
      document.dispatchEvent(new Event("visibilitychange"))

      if (visibility === undefined) {
        Reflect.deleteProperty(document, "visibilityState")
        return
      }

      Object.defineProperty(document, "visibilityState", visibility)
    }, this.signal)
    model.stored = model.input
    await expectAutosaveStored(real, model.stored)
  }

  toString() {
    return this.signal
  }
}

const autosaveContent = fc.string({
  maxLength: 12,
  minLength: 1,
  unit: "grapheme-ascii",
})
const autosaveActions = [
  autosaveContent.map((content) => new EnterAutosaveContent(content)),
  fc.constant(new AdvanceAutosaveClock(799)),
  fc.constant(new AdvanceAutosaveClock(1)),
  fc.constant(new AdvanceAutosaveClock(800)),
  fc.constant(new BlurAutosaveEditor()),
  fc.constant(new SignalAutosaveExit("hidden")),
  fc.constant(new SignalAutosaveExit("pagehide")),
]

async function runAutosaveCommands(
  commands: Iterable<fc.AsyncCommand<AutosaveModel, AutosaveReal>>,
  openContext: () => Promise<BrowserContext>,
  failures?: AutosaveFailure[],
) {
  const context = await openContext()

  try {
    const page = await context.newPage()
    await page.clock.install()
    await page.goto("/")
    const initialContent = "저장된 메모"
    const note = await createNoteThroughUi(page, initialContent)
    const articleId = await note.getAttribute("id")
    expect(articleId).not.toBeNull()
    const noteId = decodeURIComponent(
      articleId!.slice("note-".length, -"-board".length),
    )
    const real: AutosaveReal = {
      actions: [],
      editor: note.getByRole("textbox", { name: "메모 내용" }),
      noteId,
      page,
    }
    await expectAutosaveStored(real, initialContent)
    await page.clock.pauseAt(Date.now() + 60_000)
    const model: AutosaveModel = {
      elapsedSinceInput: 0,
      input: initialContent,
      stored: initialContent,
    }

    try {
      await fc.asyncModelRun(() => ({ model, real }), commands)
      await expect(real.editor).toHaveValue(model.input)
    } catch (error) {
      const observed = await readStoredNote(page, noteId)
      failures?.push({
        actions: [...real.actions],
        expectedContent: model.stored,
        observedContent: observed?.content ?? null,
      })
      throw error
    }
    return { actions: real.actions, input: model.input, stored: model.stored }
  } finally {
    await context.close()
  }
}

async function contextWithoutEditedSave(browser: Browser) {
  const context = await browser.newContext()
  await context.addInitScript(() => {
    const originalPut = IDBObjectStore.prototype.put

    IDBObjectStore.prototype.put = function (value, key) {
      const record = value as { contentRevision: number; id: string }

      if (this.name === "notes" && record.contentRevision >= 2) {
        return this.get(record.id)
      }

      return key === undefined
        ? originalPut.call(this, value)
        : originalPut.call(this, value, key)
    }
  })
  return context
}

type MobileSaveModel = {
  input: string
  stored: string
  view: "confirming" | "detail" | "list"
}

type MobileSaveReal = {
  actions: string[]
  noteId: string
  page: Page
}

type MobileSaveFailure = {
  actions: string[]
  expectedContent: string
  observedContent: string | null
  observedInput: string | null
  saveLabel: string | null
  view: MobileSaveModel["view"]
}

async function expectMobileSaveState(model: MobileSaveModel, real: MobileSaveReal) {
  await expect
    .poll(async () => (await readStoredNote(real.page, real.noteId))?.content, {
      timeout: 2_000,
    })
    .toBe(model.stored)

  if (model.view === "list") {
    await expect(real.page).toHaveURL("/")
    return
  }

  const editor = real.page.getByRole("textbox", { name: "메모 내용" })
  await expect(editor).toHaveValue(model.input)

  if (model.view === "confirming") {
    await expect(
      real.page.getByRole("dialog", { name: "저장하지 않은 변경사항" }),
    ).toBeVisible()
  }
}

class EditMobileContent implements fc.AsyncCommand<MobileSaveModel, MobileSaveReal> {
  constructor(private readonly content: string) {}

  check(model: Readonly<MobileSaveModel>) {
    return model.view === "detail"
  }

  async run(model: MobileSaveModel, real: MobileSaveReal) {
    real.actions.push(this.toString())
    await real.page.getByRole("textbox", { name: "메모 내용" }).fill(this.content)
    model.input = this.content
    await expectMobileSaveState(model, real)
  }

  toString() {
    return `edit(${JSON.stringify(this.content)})`
  }
}

class SaveMobileContent implements fc.AsyncCommand<MobileSaveModel, MobileSaveReal> {
  check(model: Readonly<MobileSaveModel>) {
    return model.view === "detail" && model.input !== model.stored
  }

  async run(model: MobileSaveModel, real: MobileSaveReal) {
    real.actions.push(this.toString())
    await real.page.getByRole("button", { exact: true, name: "저장" }).click()
    model.stored = model.input
    await expectMobileSaveState(model, real)
  }

  toString() {
    return "save"
  }
}

class LeaveMobileDetail implements fc.AsyncCommand<MobileSaveModel, MobileSaveReal> {
  check(model: Readonly<MobileSaveModel>) {
    return model.view === "detail" && model.input !== model.stored
  }

  async run(model: MobileSaveModel, real: MobileSaveReal) {
    real.actions.push(this.toString())
    await real.page.getByRole("link", { exact: true, name: "메모 목록" }).click()
    model.view = "confirming"
    await expectMobileSaveState(model, real)
  }

  toString() {
    return "attempt-leave"
  }
}

class ContinueMobileDetail implements fc.AsyncCommand<MobileSaveModel, MobileSaveReal> {
  check(model: Readonly<MobileSaveModel>) {
    return model.view === "confirming"
  }

  async run(model: MobileSaveModel, real: MobileSaveReal) {
    real.actions.push(this.toString())
    await real.page
      .getByRole("dialog", { name: "저장하지 않은 변경사항" })
      .getByRole("button", { name: "계속 편집" })
      .click()
    model.view = "detail"
    await expectMobileSaveState(model, real)
  }

  toString() {
    return "continue-editing"
  }
}

class DiscardMobileContent implements fc.AsyncCommand<MobileSaveModel, MobileSaveReal> {
  check(model: Readonly<MobileSaveModel>) {
    return model.view === "confirming"
  }

  async run(model: MobileSaveModel, real: MobileSaveReal) {
    real.actions.push(this.toString())
    await real.page
      .getByRole("dialog", { name: "저장하지 않은 변경사항" })
      .getByRole("button", { name: "변경사항 버리기" })
      .click()
    model.input = model.stored
    model.view = "list"
    await expectMobileSaveState(model, real)
    await expect
      .poll(() => readStoredNoteDraft(real.page, real.noteId))
      .toBeNull()
  }

  toString() {
    return "discard-changes"
  }
}

class ReopenMobileDetail implements fc.AsyncCommand<MobileSaveModel, MobileSaveReal> {
  check(model: Readonly<MobileSaveModel>) {
    return model.view === "list"
  }

  async run(model: MobileSaveModel, real: MobileSaveReal) {
    real.actions.push(this.toString())
    await real.page.getByRole("link", { name: /수정$/u }).click()
    model.input = model.stored
    model.view = "detail"
    await expectMobileSaveState(model, real)
  }

  toString() {
    return "reopen"
  }
}

const mobileSaveContent = fc.string({
  maxLength: 12,
  minLength: 1,
  unit: "grapheme-ascii",
})
const mobileSavePair = fc
  .tuple(mobileSaveContent, mobileSaveContent)
  .filter(([first, second]) => first !== second)
const mobileSaveActions = [
  mobileSaveContent.map((content) => new EditMobileContent(content)),
  fc.constant(new SaveMobileContent()),
  fc.constant(new LeaveMobileDetail()),
  fc.constant(new ContinueMobileDetail()),
  fc.constant(new DiscardMobileContent()),
  fc.constant(new ReopenMobileDetail()),
]

async function runMobileSaveCommands(
  commands: Iterable<fc.AsyncCommand<MobileSaveModel, MobileSaveReal>>,
  openContext: () => Promise<BrowserContext>,
  failures?: MobileSaveFailure[],
  blockSave = false,
) {
  const context = await openContext()

  try {
    const page = await context.newPage()
    await page.goto("/")
    const initialContent = "저장된 메모"
    const note = await createMobileNoteThroughUi(page, initialContent)
    const noteId = noteIdFromHref(
      await note.getByRole("link", { name: /수정$/u }).getAttribute("href"),
    )
    await note.getByRole("link", { name: /수정$/u }).click()

    if (blockSave) {
      await page.evaluate(() => {
        window.addEventListener(
          "click",
          (event) => {
            const button = (event.target as Element | null)?.closest("button")

            if (button?.textContent?.trim() !== "저장") {
              return
            }

            event.preventDefault()
            event.stopImmediatePropagation()
          },
          true,
        )
      })
    }

    const model: MobileSaveModel = {
      input: initialContent,
      stored: initialContent,
      view: "detail",
    }
    const real: MobileSaveReal = { actions: [], noteId, page }
    await expectMobileSaveState(model, real)

    try {
      await fc.asyncModelRun(() => ({ model, real }), commands)
      await expectMobileSaveState(model, real)
    } catch (error) {
      const observed = await readStoredNote(page, noteId)
      failures?.push({
        actions: [...real.actions],
        expectedContent: model.stored,
        observedContent: observed?.content ?? null,
        observedInput: await page
          .getByRole("textbox", { name: "메모 내용" })
          .inputValue()
          .catch(() => null),
        saveLabel: await page
          .getByRole("button", { name: /^저장/u })
          .textContent()
          .catch(() => null),
        view: model.view,
      })
      throw error
    }

    return { actions: real.actions, content: model.stored, view: model.view }
  } finally {
    await context.close()
  }
}

function createMobileSaveContext(browser: Browser) {
  return browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { height: 720, width: 320 },
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("초기 화면을 hydration 오류 없이 연다", async ({ page }) => {
  const consoleMessages: string[] = []
  const pageErrors: string[] = []

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleMessages.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on("pageerror", (error) => pageErrors.push(error.message))

  await page.reload()
  await expect(page.getByRole("main")).toBeVisible()
  await expect(
    page.getByRole("region", { name: "메모 작업 영역" }),
  ).toBeVisible()
  expect(consoleMessages).toEqual([])
  const observedPageErrors = [...pageErrors]
  const knownPrefetchErrors = observedPageErrors.filter((message) =>
    /^\/localhost:4173\/\S*\?_rsc=\S+ due to access control checks\.$/u.test(
      message,
    ),
  )
  expect(knownPrefetchErrors).toEqual(observedPageErrors)
})

test("사용자의 메모 생성과 다시 열기 행동을 조합한다", async ({ browser }) => {
  await fc.assert(
    fc.asyncProperty(
      noteCreationContent,
      noteCreationContent,
      noteCreationCommands,
      async (firstContent, secondContent, generatedCommands) => {
        const context = await browser.newContext()

        try {
          const page = await context.newPage()
          await page.goto("/")
          const model: NoteCreationModel = { contents: [] }
          await fc.asyncModelRun(
            () => ({
              model,
              real: { page },
            }),
            [
              new CreateNoteThroughUiCommand(firstContent),
              new CreateNoteThroughUiCommand(secondContent),
              ...generatedCommands,
            ],
          )
          await expect(
            page.getByRole("textbox", { name: "메모 내용" }),
          ).toHaveCount(model.contents.length)
        } finally {
          await context.close()
        }
      },
    ),
    { numRuns: 3 },
  )
})

test("메모 생성 실패를 알리고 다음 생성 시도를 저장한다", async ({
  browser,
}) => {
  const context = await browser.newContext()
  await context.addInitScript(() => {
    const originalPut = IDBObjectStore.prototype.put
    let failurePending = true

    IDBObjectStore.prototype.put = function (value, key) {
      if (failurePending && this.name === "notes") {
        failurePending = false
        this.transaction.abort()
        throw new DOMException("Unable to save the note", "AbortError")
      }

      return key === undefined
        ? originalPut.call(this, value)
        : originalPut.call(this, value, key)
    }
  })

  try {
    const page = await context.newPage()
    await page.goto("/")
    const model: NoteCreationModel = { contents: [] }
    await fc.asyncModelRun(
      () => ({
        model,
        real: { page },
      }),
      [
        new FailNoteCreationThroughUiCommand(),
        new CreateNoteThroughUiCommand("다시 시도해 저장한 메모"),
        new ReloadNotesThroughUiCommand(),
      ],
    )
    await expect(
      page.getByRole("textbox", { name: "메모 내용" }),
    ).toHaveValue("다시 시도해 저장한 메모")
  } finally {
    await context.close()
  }
})

test("두 번째 메모의 쓰기가 누락되면 화면과 저장 결과의 차이를 찾는다", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000)
  const failedCandidates: CreationFailure[] = []
  const actionArbitraries = [
    noteCreationContent.map(
      (content) => new CreateNoteThroughUiCommand(content),
    ),
    noteCreationContent.map(
      (content) => new CreateNoteThroughUiCommand(content),
    ),
    fc.constant(new ReloadNotesThroughUiCommand()),
  ]
  const maxCommands = 6
  const runSequence = async (
    commands: Iterable<fc.AsyncCommand<NoteCreationModel, NoteCreationReal>>,
    openContext: () => Promise<BrowserContext>,
  ) => {
    const context = await openContext()

    try {
      const page = await context.newPage()
      await page.goto("/")
      const model: NoteCreationModel = { contents: [] }
      const actions: string[] = []

      try {
        await fc.asyncModelRun(
          () => ({ model, real: { actions, page } }),
          commands,
        )
        await expectVisibleNoteContents(page, model.contents)
        await expectStoredCreationState(page, model.contents)
      } catch (error) {
        failedCandidates.push({
          actions: [...actions],
          expectedContents: [...model.contents],
          observed: await readStoredCreationState(page),
        })
        throw error
      }
    } finally {
      await context.close()
    }
  }
  const failureCommands = fc.commands(actionArbitraries, { maxCommands })
  const details = await fc.check(
    fc.asyncProperty(failureCommands, async (commands) => {
      await runSequence(commands, () => contextWithoutSecondCreatedNote(browser))
    }),
    { numRuns: 12 },
  )

  expect(details.failed).toBe(true)
  expect(details.interrupted).toBe(false)
  expect(details.numShrinks).toBeGreaterThan(0)
  expect(failedCandidates.length).toBeGreaterThan(0)
  const reducedSequence = replaySequence(details)

  const reduced = failedCandidates.at(-1)
  const replay = await fc.check(
    fc.asyncProperty(
      fc.commands(actionArbitraries, {
        maxCommands,
        replayPath: reducedSequence.replayPath,
      }),
      async (commands) => {
        await runSequence(commands, () => contextWithoutSecondCreatedNote(browser))
      },
    ),
    {
      endOnFailure: true,
      numRuns: 1,
      path: reducedSequence.path,
      seed: details.seed,
    },
  )
  expect(replay.failed).toBe(true)
  const replayFailure = failedCandidates.at(-1)
  expectMissingCreatedNote(replayFailure)

  const directCommands = [...reducedSequence.commands]
  await runSequence(
    directCommands.slice(0, -1),
    () => contextWithoutSecondCreatedNote(browser),
  )
  await expect(
    runSequence(directCommands, () => contextWithoutSecondCreatedNote(browser)),
  ).rejects.toThrow()
  const directFailure = failedCandidates.at(-1)
  expectMissingCreatedNote(directFailure)
  await runSequence(directCommands, () => browser.newContext())

  const report = {
    browser: browser.browserType().name(),
    classification: "controlled-storage-omission",
    feature: "note-creation",
    initialContents: [],
    layer: "note-board-and-indexeddb",
    minimalCommands: reducedSequence.printed,
    original: failedCandidates[0],
    path: reducedSequence.path,
    reduced,
    replay: {
      failed: replay.failed,
      observed: replayFailure?.observed,
    },
    replayPath: reducedSequence.replayPath,
    runs: details.numRuns,
    seed: details.seed,
    shrinks: details.numShrinks,
    toolVersion: fc.__version,
  }
  await testInfo.attach("note-creation-exploration.json", {
    body: Buffer.from(JSON.stringify(report)),
    contentType: "application/json",
  })
  console.info(JSON.stringify(report))
})

test("해시로 연 메모의 자동 저장이 편집기 초점을 유지한다", async ({
  page,
}) => {
  const initialContent = "해시로 열 메모"
  const revisedContent = "자동 저장 뒤에도 이어서 편집할 메모"
  const note = await createNoteThroughUi(page, initialContent)
  const articleId = await note.getAttribute("id")
  expect(articleId).not.toBeNull()

  const encodedNoteId = articleId!.slice("note-".length, -"-board".length)
  const noteId = decodeURIComponent(encodedNoteId)

  await page.goto(`/#note-${encodeURIComponent(noteId)}`)
  const linkedNote = page.getByRole("article", { exact: true, name: "메모" })
  const editor = linkedNote.getByRole("textbox", { name: "메모 내용" })
  await expect(linkedNote).toBeFocused()

  await page.clock.install()
  await editor.fill(revisedContent)
  await page.clock.fastForward(800)
  await expect(editor).toBeFocused()
  await expect(editor).toHaveValue(revisedContent)
})

test("저장 기한 전 내부 이동에서도 최신 원문을 보존한다", async ({ page }) => {
  const initialContent = "이동 전 메모"
  const changedContent = "이동 직전의 최신 원문"
  const note = await createNoteThroughUi(page, initialContent)
  const articleId = await note.getAttribute("id")
  expect(articleId).not.toBeNull()
  const noteId = decodeURIComponent(
    articleId!.slice("note-".length, -"-board".length),
  )
  const editor = note.getByRole("textbox", { name: "메모 내용" })
  await page.clock.install()
  await page.clock.pauseAt(Date.now() + 60_000)
  await editor.fill(changedContent)
  await page.getByRole("link", { exact: true, name: "설정" }).click()
  await expect(page).toHaveURL(/\/settings\/?$/u)
  await expect
    .poll(async () => (await readStoredNote(page, noteId))?.content)
    .toBe(changedContent)
})

test("실제 편집기의 입력, 800ms 경과와 이탈 저장을 조합한다", async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const details = await fc.check(
    fc.asyncProperty(
      autosaveContent,
      fc.commands(autosaveActions, { maxCommands: 5 }),
      async (firstContent, commands) => {
        await runAutosaveCommands(
          [
            new EnterAutosaveContent(firstContent),
            new AdvanceAutosaveClock(800),
            ...commands,
          ],
          () => browser.newContext(),
        )
      },
    ),
    { numRuns: 4 },
  )

  expect(details.failed, fc.defaultReportMessage(details)).toBe(false)
})

test("자동 저장 쓰기 누락을 실제 입력과 시간 진행으로 축소하고 재현한다", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000)
  const failures: AutosaveFailure[] = []
  const timerActions = [
    autosaveContent.map((content) => new EnterAutosaveContent(content)),
    fc.constant(new AdvanceAutosaveClock(799)),
    fc.constant(new AdvanceAutosaveClock(1)),
    fc.constant(new AdvanceAutosaveClock(800)),
  ]
  const maxCommands = 6
  const details = await fc.check(
    fc.asyncProperty(
      fc.commands(timerActions, { maxCommands }),
      async (commands) => {
        await runAutosaveCommands(
          commands,
          () => contextWithoutEditedSave(browser),
          failures,
        )
      },
    ),
    { numRuns: 20 },
  )

  expect(details.failed).toBe(true)
  expect(details.interrupted).toBe(false)
  expect(details.numShrinks).toBeGreaterThan(0)
  const reducedSequence = replaySequence(details)
  const reducedFailure = failures.at(-1)
  expect(reducedFailure?.expectedContent).not.toBe(
    reducedFailure?.observedContent,
  )

  const replay = await fc.check(
    fc.asyncProperty(
      fc.commands(timerActions, {
        maxCommands,
        replayPath: reducedSequence.replayPath,
      }),
      async (commands) => {
        await runAutosaveCommands(
          commands,
          () => contextWithoutEditedSave(browser),
          failures,
        )
      },
    ),
    {
      endOnFailure: true,
      numRuns: 1,
      path: reducedSequence.path,
      seed: details.seed,
    },
  )
  expect(replay.failed).toBe(true)
  const replayFailure = failures.at(-1)
  expect(replayFailure?.expectedContent).not.toBe(
    replayFailure?.observedContent,
  )

  const directCommands = [...reducedSequence.commands]
  await runAutosaveCommands(
    directCommands.slice(0, -1),
    () => contextWithoutEditedSave(browser),
  )
  await expect(
    runAutosaveCommands(
      directCommands,
      () => contextWithoutEditedSave(browser),
      failures,
    ),
  ).rejects.toThrow()
  const directFailure = failures.at(-1)
  expect(directFailure?.expectedContent).not.toBe(
    directFailure?.observedContent,
  )
  await runAutosaveCommands(directCommands, () => browser.newContext())

  const report = {
    browser: browser.browserType().name(),
    classification: "controlled-storage-omission",
    feature: "desktop-autosave",
    initialContent: "저장된 메모",
    layer: "note-editor-and-indexeddb",
    minimalCommands: reducedSequence.printed,
    original: failures[0],
    path: reducedSequence.path,
    reduced: reducedFailure,
    replay: replayFailure,
    replayPath: reducedSequence.replayPath,
    seed: details.seed,
    shrinks: details.numShrinks,
    toolVersion: fc.__version,
  }
  await testInfo.attach("desktop-autosave-exploration.json", {
    body: Buffer.from(JSON.stringify(report)),
    contentType: "application/json",
  })
  console.info(JSON.stringify(report))
})

test("모바일 상세 화면의 저장과 이탈 선택을 조합한다", async ({ browser }) => {
  test.setTimeout(120_000)
  const details = await fc.check(
    fc.asyncProperty(
      mobileSavePair,
      fc.commands(mobileSaveActions, { maxCommands: 6 }),
      async ([firstContent, secondContent], commands) => {
        await runMobileSaveCommands(
          [
            new EditMobileContent(firstContent),
            new SaveMobileContent(),
            new EditMobileContent(secondContent),
            new SaveMobileContent(),
            ...commands,
          ],
          () => createMobileSaveContext(browser),
        )
      },
    ),
    { numRuns: 5 },
  )

  expect(details.failed, fc.defaultReportMessage(details)).toBe(false)
})

test("모바일 저장 버튼의 연결이 빠지면 실패 행동을 축소하고 재현한다", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000)
  const failures: MobileSaveFailure[] = []
  const actions = [
    mobileSaveContent.map((content) => new EditMobileContent(content)),
    fc.constant(new SaveMobileContent()),
  ]
  const maxCommands = 6
  const details = await fc.check(
    fc.asyncProperty(
      fc.commands(actions, { maxCommands }),
      async (commands) => {
        await runMobileSaveCommands(
          commands,
          () => createMobileSaveContext(browser),
          failures,
          true,
        )
      },
    ),
    { numRuns: 20 },
  )

  expect(details.failed).toBe(true)
  expect(details.interrupted).toBe(false)
  const reducedSequence = replaySequence(details)
  const reducedFailure = failures.at(-1)
  expect(reducedFailure?.expectedContent).not.toBe(
    reducedFailure?.observedContent,
  )

  const replay = await fc.check(
    fc.asyncProperty(
      fc.commands(actions, {
        maxCommands,
        replayPath: reducedSequence.replayPath,
      }),
      async (commands) => {
        await runMobileSaveCommands(
          commands,
          () => createMobileSaveContext(browser),
          failures,
          true,
        )
      },
    ),
    {
      endOnFailure: true,
      numRuns: 1,
      path: reducedSequence.path,
      seed: details.seed,
    },
  )
  expect(replay.failed).toBe(true)
  const replayFailure = failures.at(-1)
  expect(replayFailure?.expectedContent).not.toBe(
    replayFailure?.observedContent,
  )

  const directCommands = [...reducedSequence.commands]
  await runMobileSaveCommands(
    directCommands.slice(0, -1),
    () => createMobileSaveContext(browser),
    undefined,
    true,
  )
  await expect(
    runMobileSaveCommands(
      directCommands,
      () => createMobileSaveContext(browser),
      failures,
      true,
    ),
  ).rejects.toThrow()
  await runMobileSaveCommands(
    directCommands,
    () => createMobileSaveContext(browser),
  )

  const report = {
    browser: testInfo.project.name,
    classification: "controlled-save-click-omission",
    feature: "mobile-explicit-save",
    initialContent: "저장된 메모",
    layer: "note-detail-and-indexeddb",
    original: failures[0],
    path: reducedSequence.path,
    reduced: reducedFailure,
    replay: replayFailure,
    replayPath: reducedSequence.replayPath,
    seed: details.seed,
    shrinks: details.numShrinks,
    toolVersion: fc.__version,
  }
  await testInfo.attach("mobile-save-exploration.json", {
    body: Buffer.from(JSON.stringify(report)),
    contentType: "application/json",
  })
  console.info(JSON.stringify(report))
})

test("허용하지 않는 주소에서 다시 접속할 방법을 안내한다", async ({ page }) => {
  const unsupportedAddress = new URL(page.url())
  unsupportedAddress.hostname = "localhost."

  await page.goto(unsupportedAddress.toString())
  await expect(
    page.getByRole("heading", { name: "잘못된 접근입니다." }),
  ).toBeVisible()
  await expect(
    page.getByText(
      /HTTPS 주소 또는 http:\/\/localhost 주소로 다시 접속하세요\./u,
    ),
  ).toBeVisible()
  await expect(
    page.getByText("지원하지 않는 접속 주소", { exact: true }),
  ).toHaveCount(0)
})

test("항상 편집할 수 있는 메모 원문을 저장하고 불필요한 조작을 표시하지 않는다", async ({
  page,
}) => {
  const initialContent = "브라우저에서 작성한 메모"
  const revisedContent = "항상 편집할 수 있는 메모\nhttps://example.com"
  const note = await createNoteThroughUi(page, initialContent)
  const editor = note.getByRole("textbox", { name: "메모 내용" })

  await expect(note.getByText("이동", { exact: true })).toHaveCount(0)
  await expect(note.getByText("복사", { exact: true })).toHaveCount(0)
  await expect(note.getByText("일괄 복사", { exact: true })).toHaveCount(0)
  await expect(note.getByText("편집", { exact: true })).toHaveCount(0)
  await expect(note.getByText("크기", { exact: true })).toHaveCount(0)
  await expect(note.getByRole("link")).toHaveCount(0)

  await editor.fill(revisedContent)
  await editor.press("Tab")
  await note.getByRole("button", { name: "메모 동작" }).click({ trial: true })
  await page.reload()

  await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(
    revisedContent,
  )
})

test("선택한 본문을 교체하고 위치 변경과 원문 revision을 구분한다", async ({
  page,
}) => {
  const initialContent = "교체할 원래 메모"
  const note = await createNoteThroughUi(page, initialContent)
  const articleId = await note.getAttribute("id")
  expect(articleId).not.toBeNull()
  const noteId = decodeURIComponent(
    articleId!.slice("note-".length, -"-board".length),
  )
  const editor = note.getByRole("textbox", { name: "메모 내용" })

  await expect.poll(async () => (await readStoredNote(page, noteId))?.content).toBe(
    initialContent,
  )
  const beforeEdit = await readStoredNote(page, noteId)
  expect(beforeEdit).not.toBeNull()

  await editor.focus()
  await editor.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement
    textarea.setSelectionRange(0, textarea.value.length)
  })
  await editor.pressSequentially("  선택 교체 ")
  await editor.press("Enter")
  await editor.pressSequentially("https://example.com?q=메모  ")
  const revisedContent = "  선택 교체 \nhttps://example.com?q=메모  "
  await expect(editor).toHaveValue(revisedContent)
  await expect(note.getByRole("link")).toHaveCount(0)
  await editor.press("Tab")

  await expect.poll(async () => (await readStoredNote(page, noteId))?.content).toBe(
    revisedContent,
  )
  const afterEdit = await readStoredNote(page, noteId)
  expect(afterEdit).toMatchObject({
    content: revisedContent,
    contentRevision: beforeEdit!.contentRevision + 1,
    revision: beforeEdit!.revision + 1,
  })

  const properties = await openPropertiesWithKeyboard(note)
  const xField = properties.getByRole("spinbutton", { name: "X" })
  await xField.fill(String(afterEdit!.geometryX + 7))
  await xField.press("Enter")
  await expect
    .poll(async () => (await readStoredNote(page, noteId))?.geometryX)
    .toBe(afterEdit!.geometryX + 7)
  const afterMove = await readStoredNote(page, noteId)
  expect(afterMove).toMatchObject({
    content: revisedContent,
    contentRevision: afterEdit!.contentRevision,
    revision: afterEdit!.revision + 1,
  })

  const whitespaceOnlyContent = " ".repeat(2)
  await editor.fill(whitespaceOnlyContent)
  await editor.press("Tab")
  await expect
    .poll(async () => (await readStoredNote(page, noteId))?.content)
    .toBe(whitespaceOnlyContent)
  const afterWhitespaceEdit = await readStoredNote(page, noteId)
  expect(afterWhitespaceEdit).toMatchObject({
    content: whitespaceOnlyContent,
    contentRevision: afterMove!.contentRevision + 1,
    revision: afterMove!.revision + 1,
  })

  await page.reload()
  await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(
    whitespaceOnlyContent,
  )
})

test("저장된 Tab 순서로 메모를 선택하고 Enter에서만 속성을 편집한다", async ({
  page,
}) => {
  const first = await createNoteThroughUi(page, "첫 번째 키보드 메모")
  const second = await createNoteThroughUi(page, "두 번째 키보드 메모")
  const batchCopy = page.getByRole("button", { name: "일괄 복사 0개" })
  const topControls = [
    page.getByRole("link", { name: "본문으로 이동" }),
    page.getByRole("link", { exact: true, name: "메모" }),
    page.getByRole("button", { name: "새 메모" }),
    batchCopy,
  ]
  const topTabIndices = await Promise.all(
    topControls.map(readTopControlTabIndex),
  )

  expect(topTabIndices).toEqual([...topTabIndices].sort((left, right) => left - right))
  expect(new Set(topTabIndices).size).toBe(topTabIndices.length)
  await expect(first).toHaveAttribute("tabindex", "1000")
  await expect(second).toHaveAttribute("tabindex", "1001")

  await batchCopy.focus()
  await batchCopy.press("Tab")
  await expect(first).toBeFocused()
  await first.press("Tab")
  await expect(second).toBeFocused()
  await second.press("Shift+Tab")
  await expect(first).toBeFocused()
  await expect(page.getByRole("complementary", { name: "메모 속성" })).toHaveCount(0)

  await runNoteAction(first, "메모를 맨 앞으로")
  await expect(first).toHaveAttribute("tabindex", "1000")
  await expect(second).toHaveAttribute("tabindex", "1001")
  await batchCopy.focus()
  await batchCopy.press("Tab")
  await expect(first).toBeFocused()

  let properties = await openPropertiesWithKeyboard(first)
  const xField = properties.getByRole("spinbutton", { name: "X" })
  await expect(xField).toBeFocused()
  await xField.fill("80")
  await xField.press("Enter")
  await properties.getByRole("button", { name: "메모 속성 패널 닫기" }).click()
  await expect(properties).toHaveCount(0)

  await page.reload()
  properties = await openPropertiesWithKeyboard(first)
  const storedX = properties.getByRole("spinbutton", { name: "X" })
  await expect(storedX).toHaveValue("80")
  await expect(storedX).not.toHaveAttribute("max", /.+/u)
  await storedX.fill("-500")
  await storedX.press("Enter")
  await properties.getByRole("button", { name: "메모 속성 패널 닫기" }).click()
  await page.reload()
  properties = await openPropertiesWithKeyboard(first)
  await expect(properties.getByRole("spinbutton", { name: "X" })).toHaveValue("-500")

  const invalidWidth = properties.getByRole("spinbutton", { name: "너비" })
  await invalidWidth.fill("4096")
  await clickBlankCanvas(page)
  await expect(properties).toBeVisible()
  await expect(properties.getByRole("alert")).toContainText(
    "값의 범위와 위치를 확인하세요.",
  )
  await expect(invalidWidth).not.toBeFocused()
  await properties.getByRole("button", { name: "메모 속성 패널 닫기" }).click()
  await expect(properties).toBeVisible()
  await expect(properties.getByRole("alert")).toContainText(
    "값의 범위와 위치를 확인하세요.",
  )
  await expect(invalidWidth).toBeFocused()
  await invalidWidth.fill("320")
  await invalidWidth.press("Enter")
  const restoredX = properties.getByRole("spinbutton", { name: "X" })
  await restoredX.fill("80")
  await restoredX.press("Enter")
  await properties.getByRole("button", { name: "메모 속성 패널 닫기" }).click()
  await expect(properties).toHaveCount(0)

  await first.dblclick({ position: { x: 12, y: 14 } })
  properties = page.getByRole("complementary", { name: "메모 속성" })
  await expect(properties).toBeVisible()
  await expect(properties.getByRole("spinbutton", { name: "X" })).not.toBeFocused()
  await properties.getByRole("button", { name: "메모 속성 패널 닫기" }).click()

  await first.getByRole("button", { name: "메모 동작" }).dblclick()
  await expect(page.getByRole("complementary", { name: "메모 속성" })).toHaveCount(0)
})

test("같은 메모를 옮긴 뒤 속성 패널에서 최신 위치를 유지한다", async ({
  page,
}) => {
  const note = await createNoteThroughUi(page, "속성 위치를 확인할 메모")
  let properties = await openPropertiesWithKeyboard(note)
  const initialX = Number(
    await properties.getByRole("spinbutton", { name: "X" }).inputValue(),
  )

  await properties.getByRole("button", { name: "메모 속성 패널 닫기" }).click()
  const original = await visibleBox(note)
  const moveHandle = await visibleBox(
    note.getByRole("button", { name: "메모 이동" }),
  )
  await page.mouse.move(
    moveHandle.x + moveHandle.width / 2,
    moveHandle.y + moveHandle.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    moveHandle.x + moveHandle.width / 2 + 80,
    moveHandle.y + moveHandle.height / 2 + 40,
  )
  await page.mouse.up()
  await expect
    .poll(async () => (await visibleBox(note)).x)
    .toBeGreaterThan(original.x + 50)

  await note.dblclick({ position: { x: 12, y: 14 } })
  properties = page.getByRole("complementary", { name: "메모 속성" })
  await expect(properties).toBeVisible()
  const movedX = properties.getByRole("spinbutton", { name: "X" })

  await expect(movedX).toHaveValue(String(initialX + 80))
  await properties.getByRole("button", { name: "메모 속성 패널 닫기" }).click()
  await expect
    .poll(async () => (await visibleBox(note)).x)
    .toBeGreaterThan(original.x + 50)
})

test("이동 핸들, 가장자리 크기 조절과 빈 캔버스 시점 이동을 구분한다", async ({
  page,
}) => {
  const note = await createNoteThroughUi(page, "공간 조작을 확인할 메모")
  const viewControls = page.getByRole("group", { name: "캔버스 보기" })

  await expect(viewControls).toBeVisible()
  for (const name of [
    "왼쪽 보기",
    "오른쪽 보기",
    "위 보기",
    "아래 보기",
    "축소",
    "확대",
    "모두 보기",
  ]) {
    const control = viewControls.getByRole("button", { name })
    await expect(control).toBeVisible()
    await expect(control).toHaveText("")
  }

  const original = await visibleBox(note)
  const moveHandle = await visibleBox(
    note.getByRole("button", { name: "메모 이동" }),
  )
  const moveStart = {
    x: moveHandle.x + moveHandle.width / 2,
    y: moveHandle.y + moveHandle.height / 2,
  }

  await preparePointerCaptureRelease(page)
  await page.mouse.move(moveStart.x, moveStart.y)
  await page.mouse.down()
  await page.mouse.move(moveStart.x + 45, moveStart.y + 40)
  await releasePointerCapture(page)
  await page.mouse.up()
  await expect.poll(async () => (await visibleBox(note)).x).toBe(original.x)

  await page.mouse.move(moveStart.x, moveStart.y)
  await page.mouse.down()
  await page.mouse.move(moveStart.x + 80, moveStart.y + 60)
  await page.mouse.up()
  await expect
    .poll(async () => (await visibleBox(note)).x)
    .toBeGreaterThan(original.x + 50)
  await expect(page.getByRole("complementary", { name: "메모 속성" })).toHaveCount(0)

  const moved = await visibleBox(note)
  await preparePointerCaptureRelease(page)
  await page.mouse.move(moved.x + moved.width - 1, moved.y + moved.height - 1)
  await page.mouse.down()
  await page.mouse.move(moved.x + moved.width + 30, moved.y + moved.height + 24)
  await releasePointerCapture(page)
  await page.mouse.up()
  await expect.poll(async () => (await visibleBox(note)).width).toBe(moved.width)

  await page.mouse.move(moved.x + moved.width - 1, moved.y + moved.height - 1)
  await page.mouse.down()
  await page.mouse.move(moved.x + moved.width + 64, moved.y + moved.height + 48)
  await page.mouse.up()
  await expect
    .poll(async () => (await visibleBox(note)).width)
    .toBeGreaterThan(moved.width + 40)

  const resized = await visibleBox(note)
  const workspace = page.getByRole("region", { name: "메모 작업 영역" })
  const workspaceBox = await visibleBox(workspace)
  const panStart = {
    x: workspaceBox.x + workspaceBox.width * 0.72,
    y: workspaceBox.y + workspaceBox.height * 0.72,
  }
  await preparePointerCaptureRelease(page)
  await page.mouse.move(panStart.x, panStart.y)
  await page.mouse.down()
  await page.mouse.move(panStart.x - 35, panStart.y - 25)
  await releasePointerCapture(page)
  await page.mouse.up()
  await expect
    .poll(async () => (await visibleBox(note)).x)
    .toBeLessThan(resized.x - 20)

  await page.mouse.move(panStart.x, panStart.y)
  await page.mouse.down()
  await page.mouse.move(panStart.x - 30, panStart.y - 20)
  const interruptedView = await visibleBox(note)
  await page.evaluate(() => {
    window.dispatchEvent(new Event("blur"))
  })
  await page.mouse.move(panStart.x - 90, panStart.y - 60)
  await expect.poll(async () => (await visibleBox(note)).x).toBe(interruptedView.x)
  await page.mouse.up()

  await page.mouse.move(panStart.x, panStart.y)
  await page.mouse.down()
  await page.mouse.move(panStart.x - 70, panStart.y - 50)
  await page.mouse.up()
  await expect
    .poll(async () => (await visibleBox(note)).x)
    .toBeLessThan(resized.x - 40)
})

test("확대 뒤에도 메모와 보기 제어를 작업 영역에 유지한다", async ({ page }) => {
  const content = `확대 확인 메모-${crypto.randomUUID()}`
  const note = await createNoteThroughUi(page, content)
  const viewControls = page.getByRole("group", { name: "캔버스 보기" })
  const before = await visibleBox(note)

  await expect(note).toBeInViewport()
  await expect(viewControls).toBeInViewport()
  await viewControls.getByRole("button", { name: "확대" }).click()
  await expect(note).toBeInViewport()
  await expect(viewControls).toBeInViewport()
  await expect
    .poll(async () => (await visibleBox(note)).width)
    .toBeGreaterThan(before.width)
})

test("화면 밖에 새 메모가 생겨도 편집 대상과 보기 제어를 함께 드러낸다", async ({ page }) => {
  const firstNote = await createNoteThroughUi(page, `첫 메모-${crypto.randomUUID()}`)
  const controls = page.getByRole("group", { name: "캔버스 보기" })
  const workspace = page.getByRole("region", { name: "메모 작업 영역" })
  const latestNote = await createUntilFirstNoteLeavesView(
    page,
    firstNote,
    controls,
    workspace,
  )
  const workspaceBox = await visibleBox(workspace)
  const currentFirstBox = await visibleBox(firstNote)
  expect(currentFirstBox.x + currentFirstBox.width).toBeLessThan(workspaceBox.x)
  const beforeMove = await visibleBox(latestNote)
  await controls.getByRole("button", { name: "왼쪽 보기" }).click()
  await expect(controls).toBeInViewport()
  await expect
    .poll(async () => (await visibleBox(latestNote)).x)
    .toBeGreaterThan(beforeMove.x)

  const editor = latestNote.getByRole("textbox", { name: "메모 내용" })
  const revisedContent = `수정한 메모-${crypto.randomUUID()}`
  await editor.fill(revisedContent)
  await expect(editor).toHaveValue(revisedContent)
})

test("캔버스 안의 보조키와 휠은 메모를 확대하고 일반 휠은 확대하지 않는다", async ({ page }) => {
  const content = `휠 확대 메모-${crypto.randomUUID()}`
  const note = await createNoteThroughUi(page, content)
  const editor = note.getByRole("textbox", { name: "메모 내용" })
  const workspace = page.getByRole("region", { name: "메모 작업 영역" })
  const workspaceBox = await visibleBox(workspace)
  const before = await visibleBox(note)
  const wheelChange = workspaceBox.height / 8

  await page.mouse.move(
    workspaceBox.x + workspaceBox.width * 0.65,
    workspaceBox.y + workspaceBox.height * 0.45,
  )
  await page.keyboard.down("Control")
  await page.mouse.wheel(0, -wheelChange)
  await page.keyboard.up("Control")

  await expect
    .poll(async () => (await visibleBox(note)).width)
    .toBeGreaterThan(before.width)
  const zoomed = await visibleBox(note)
  await page.mouse.wheel(0, wheelChange)
  await expect(editor).toHaveValue(content)
  expect((await visibleBox(note)).width).toBeCloseTo(zoomed.width, 2)
  await expect(page.getByRole("group", { name: "캔버스 보기" })).toBeInViewport()
})

test("Escape, 빈 캔버스와 Command는 선택만 해제한다", async ({ page }) => {
  const note = await createNoteThroughUi(page, "선택을 해제할 메모")
  const headerAction = note.getByRole("button", { name: "메모 동작" })
  const noteBox = await visibleBox(note)
  const editorBox = await visibleBox(
    note.getByRole("textbox", { name: "메모 내용" }),
  )

  await note.focus()
  await expect(note).toHaveAccessibleDescription("선택됨")
  await note.press("Escape")
  await expect(note).toBeFocused()
  await expect(note).not.toHaveAccessibleDescription("선택됨")
  await note.press("Enter")
  await expect(page.getByRole("complementary", { name: "메모 속성" })).toHaveCount(0)

  await note.focus()
  await page.keyboard.down("Meta")
  await expect(headerAction).toBeHidden()
  await expect.poll(async () => (await visibleBox(note)).height).toBe(noteBox.height)
  await expect
    .poll(async () => (await visibleBox(note.getByRole("textbox", { name: "메모 내용" }))).y)
    .toBe(editorBox.y)
  await page.keyboard.up("Meta")
  await expect(headerAction).toBeVisible()
  await note.press("Enter")
  await expect(page.getByRole("complementary", { name: "메모 속성" })).toHaveCount(0)

  await note.focus()
  await clickBlankCanvas(page)
  await expect(note).not.toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("complementary", { name: "메모 속성" })).toHaveCount(0)
})

test("누락된 Command keyup 뒤 신뢰할 수 있는 입력에서 헤더를 복원한다", async ({
  page,
}) => {
  const note = await createNoteThroughUi(page, "Command 상태를 복원할 메모")
  const headerAction = note.getByRole("button", { name: "메모 동작" })

  await note.focus()
  await page.keyboard.down("Meta")
  await expect(headerAction).toBeHidden()

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent("keyup", { key: "Meta" }))
    window.dispatchEvent(new Event("blur"))
  })
  await expect(headerAction).toBeHidden()

  await page.evaluate(() => {
    window.addEventListener(
      "keyup",
      (event) => event.stopImmediatePropagation(),
      { capture: true, once: true },
    )
  })
  await page.keyboard.up("Meta")
  await expect(headerAction).toBeHidden()

  await clickBlankCanvas(page)
  await expect(headerAction).toBeVisible()
})

test("가장 최근에 활성화한 오른쪽 패널 하나만 표시한다", async ({ page }) => {
  const note = await createNoteThroughUi(page, "패널 우선순위를 확인할 메모")
  const editor = note.getByRole("textbox", { name: "메모 내용" })

  await editor.click({ modifiers: ["Meta", "Alt"] })
  const batchPanel = page.getByRole("complementary", { name: "일괄 복사" })
  await expect(batchPanel).toBeVisible()
  await expect(
    page.getByRole("status").filter({ hasNotText: /^메모 \d+개$/u }),
  ).toHaveCount(0)

  await note.press("Enter")
  const properties = page.getByRole("complementary", { name: "메모 속성" })
  await expect(properties).toBeVisible()
  await expect(batchPanel).toHaveCount(0)
  const xField = properties.getByRole("spinbutton", { name: "X" })

  await xField.fill("0")
  const batchCopyTrigger = page.getByRole("button", { name: "일괄 복사 1개" })
  await batchCopyTrigger.click()
  await expect(batchPanel).toBeVisible()
  await expect(properties).toHaveCount(0)
  await note.press("Enter")
  await expect(properties).toBeVisible()
  await expect(
    properties.getByRole("spinbutton", { name: "X" }),
  ).toHaveValue("0")
  await properties.getByRole("button", { name: "저장값으로 되돌리기" }).click()
  await expect(properties).toHaveCount(0)

  await batchCopyTrigger.click()
  await expect(batchPanel).toBeVisible()
  await batchPanel.getByRole("button", { name: "일괄 복사 패널 닫기" }).click()
  await expect(batchPanel).toHaveCount(0)
  await expect(properties).toHaveCount(0)
})

test("메모 삭제를 알리고 같은 메모를 취소로 복원한다", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-04T01:00:00.000Z") })
  const content = "삭제 뒤 복원할 메모"
  const note = await createNoteThroughUi(page, content)

  await runNoteAction(note, "메모 삭제")
  const removalNotice = page.getByRole("status").filter({
    hasText: "메모를 삭제했습니다.",
  })
  await expect(note).toHaveCount(0)
  await expect(removalNotice).toBeVisible()
  await removalNotice.getByRole("button", { name: "실행 취소" }).click()
  await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(
    content,
  )

  await note.hover()
  await runNoteAction(note, "메모 삭제")
  await expect(removalNotice).toBeVisible()
  await page.clock.fastForward(3_000)
  await page.getByRole("link", { exact: true, name: "설정" }).click()
  await expect(page).toHaveURL("/settings/")
  await page.getByRole("link", { exact: true, name: "메모" }).click()
  await expect(page).toHaveURL("/")
  await expect(removalNotice).toBeVisible()
  await page.clock.fastForward(1_500)
  await expect(removalNotice).toBeVisible()
  await page.clock.fastForward(1_000)
  await expect(removalNotice).toBeHidden()
})

test("연속 삭제 알림이 사라진 뒤 이전 삭제를 다시 알리지 않는다", async ({
  page,
}) => {
  const firstNote = await createNoteThroughUi(page, "먼저 삭제할 메모")
  await createNoteThroughUi(page, "나중에 삭제할 메모")
  const removalNotice = page.getByRole("status").filter({
    hasText: "메모를 삭제했습니다.",
  })

  await firstNote.hover()
  await runNoteAction(firstNote, "메모 삭제")
  await expect(removalNotice).toBeVisible()
  const remainingNote = page.getByRole("article", {
    exact: true,
    name: "메모",
  })
  await remainingNote.hover()
  await runNoteAction(remainingNote, "메모 삭제")
  await expect(removalNotice).toBeHidden({ timeout: 6_000 })
})

test.describe("320px 메모 화면", () => {
  test.use({ hasTouch: true, viewport: { height: 720, width: 320 } })

  test("목록의 복구 초안을 상세 화면에서 열어도 저장 전 원문을 유지한다", async ({
    page,
  }) => {
    const storedContent = `저장 원문 ${crypto.randomUUID()}`
    const draftContent = `${storedContent} 수정 중`
    const note = await createMobileNoteThroughUi(page, storedContent)
    const noteId = noteIdFromHref(
      await note.getByRole("link", { name: /수정$/u }).getAttribute("href"),
    )
    const storedBeforeOpen = await readStoredNote(page, noteId)
    expect(storedBeforeOpen).not.toBeNull()
    const draft = {
      content: draftContent,
      note: {
        contentRevision: storedBeforeOpen!.contentRevision,
        id: noteId,
      },
      updatedAt: new Date().toISOString(),
    }
    await writeStoredNoteDraft(page, draft)
    await page.clock.install()
    await page.reload()
    await page.getByRole("link", { name: /수정$/u }).click()
    await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(
      draftContent,
    )
    await page.clock.fastForward(800)

    const storedAfterOpen = await readStoredNote(page, noteId)
    expect(storedAfterOpen?.content).toBe(storedBeforeOpen?.content)
    expect(storedAfterOpen?.contentRevision).toBe(
      storedBeforeOpen?.contentRevision,
    )
    expect(await readStoredNoteDraft(page, noteId)).toEqual(draft)
  })

  test("복구한 초안을 저장하고 제거 실패를 다음 저장에서 정리한다", async ({
    page,
  }) => {
    const storedContent = "초안의 기준이 되는 메모"
    const recoveredContent = "복구해서 저장할 메모 초안"
    const savedContent = `${recoveredContent} 저장본`
    const staleContent = "이전 revision에서 남은 초안"
    const note = await createMobileNoteThroughUi(page, storedContent)
    const noteId = noteIdFromHref(
      await note.getByRole("link", { name: / 수정$/u }).getAttribute("href"),
    )
    await page.reload()
    const initialStoredNote = await readStoredNote(page, noteId)
    expect(initialStoredNote).not.toBeNull()

    const recoverableDraft = {
      content: recoveredContent,
      note: {
        contentRevision: initialStoredNote!.contentRevision,
        id: noteId,
      },
      updatedAt: "2026-09-13T12:00:00.000Z",
    }
    await writeStoredNoteDraft(page, recoverableDraft)
    expect(await readStoredNoteDraft(page, noteId)).toEqual(recoverableDraft)

    const detailPage = await page.context().newPage()
    await detailPage.goto(`/notes/${encodeURIComponent(noteId)}/`)
    const editor = detailPage.getByRole("textbox", { name: "메모 내용" })
    await expect(editor).toHaveValue(recoveredContent)
    await editor.fill(savedContent)

    await detailPage.evaluate(() => {
      type DraftRemovalFailureWindow = typeof window & {
        restoreDraftRemoval?: () => void
      }
      const originalDelete = IDBObjectStore.prototype.delete
      const originalTransaction = IDBDatabase.prototype.transaction
      let noteStored = false
      const restore = () => {
        IDBObjectStore.prototype.delete = originalDelete
        IDBDatabase.prototype.transaction = originalTransaction
      }
      const currentWindow = window as DraftRemovalFailureWindow
      currentWindow.restoreDraftRemoval = restore
      IDBDatabase.prototype.transaction = function observeNoteSave(
        storeNames: string | string[],
        mode?: IDBTransactionMode,
      ) {
        const usesNoteStore = Array.isArray(storeNames)
          ? storeNames.includes("notes")
          : storeNames === "notes"
        if (usesNoteStore && mode === "readwrite") {
          noteStored = true
        }

        return originalTransaction.call(this, storeNames, mode)
      }
      IDBObjectStore.prototype.delete = function deleteWithControlledFailure(
        query: IDBValidKey | IDBKeyRange,
      ) {
        if (this.name === "noteDrafts" && noteStored) {
          throw new Error("Controlled draft removal failure")
        }

        return originalDelete.call(this, query)
      }
    })
    await detailPage.getByRole("button", { exact: true, name: "저장" }).click()
    await expect.poll(
      () => readStoredNote(detailPage, noteId),
    ).toMatchObject({
      content: savedContent,
      contentRevision: initialStoredNote!.contentRevision + 1,
    })
    const savedAfterRemovalFailure = await readStoredNote(detailPage, noteId)
    expect(savedAfterRemovalFailure).not.toBeNull()
    const draftAfterRemovalFailure = await readStoredNoteDraft(
      detailPage,
      noteId,
    )
    expect(draftAfterRemovalFailure).not.toBeNull()
    expect(draftAfterRemovalFailure).toMatchObject({
      content: savedContent,
      note: recoverableDraft.note,
    })

    await detailPage.evaluate(() => {
      type DraftRemovalFailureWindow = typeof window & {
        restoreDraftRemoval?: () => void
      }
      const currentWindow = window as DraftRemovalFailureWindow
      currentWindow.restoreDraftRemoval?.()
      delete currentWindow.restoreDraftRemoval
    })
    await detailPage.getByRole("button", { exact: true, name: "저장" }).click()
    await expect.poll(
      () => readStoredNoteDraft(detailPage, noteId),
    ).toBeNull()
    expect(await readStoredNote(detailPage, noteId)).toMatchObject({
      content: savedContent,
      contentRevision: savedAfterRemovalFailure!.contentRevision,
      revision: savedAfterRemovalFailure!.revision,
    })

    const staleDraft = {
      content: staleContent,
      note: {
        contentRevision: savedAfterRemovalFailure!.contentRevision - 1,
        id: noteId,
      },
      updatedAt: "2026-09-13T12:00:01.000Z",
    }
    await writeStoredNoteDraft(detailPage, staleDraft)
    expect(await readStoredNoteDraft(detailPage, noteId)).toEqual(staleDraft)
    await detailPage.reload()
    await expect(editor).toHaveValue(savedContent)
  })

  test("짧게 눌러 상세 화면에서 저장하고 제한된 높이의 목록으로 돌아온다", async ({
    page,
  }) => {
    const initialContent = "작은 화면에서 편집할 메모"
    const revisedContent = `${initialContent}\n두 번째 줄\n세 번째 줄\n네 번째 줄\n다섯 번째 줄\n여섯 번째 줄\n일곱 번째 줄`
    const note = await createMobileNoteThroughUi(page, initialContent)
    const noteId = noteIdFromHref(
      await note.getByRole("link", { name: / 수정$/u }).getAttribute("href"),
    )
    const storedBeforeResize = await readStoredNote(page, noteId)
    expect(storedBeforeResize).not.toBeNull()

    await expect(note.getByText("내용 더 있음")).toHaveCount(0)
    await note.getByRole("link", { name: / 수정$/u }).click()
    const editor = page.getByRole("textbox", { name: "메모 내용" })
    await editor.fill(revisedContent)
    await page.getByRole("button", { exact: true, name: "저장" }).click()
    await expect(page.getByRole("button", { name: "저장됨" })).toBeVisible()
    await page.getByRole("link", { exact: true, name: "메모 목록" }).click()

    const savedNote = page.getByRole("article").filter({ hasText: initialContent })
    const box = await visibleBox(savedNote)
    expect(box.height).toBeLessThanOrEqual(194)
    await expect(savedNote.getByText("내용 더 있음")).toHaveCount(0)
    await page.setViewportSize({ height: 800, width: 1280 })
    await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(
      revisedContent,
    )
    expect((await readStoredNote(page, noteId))?.geometry).toEqual(
      storedBeforeResize!.geometry,
    )
  })

  test("저장하지 않은 상세 입력을 계속 편집하거나 버린다", async ({ page }) => {
    const initialContent = "이동 결정을 확인할 메모"
    const discardedContent = "목록으로 돌아갈 때 버릴 변경사항"
    const note = await createMobileNoteThroughUi(page, initialContent)
    const noteId = noteIdFromHref(
      await note.getByRole("link", { name: / 수정$/u }).getAttribute("href"),
    )

    await note.getByRole("link", { name: / 수정$/u }).click()
    const editor = page.getByRole("textbox", { name: "메모 내용" })
    const backLink = page.getByRole("link", { exact: true, name: "메모 목록" })
    await editor.fill(discardedContent)
    await backLink.click()

    let dialog = page.getByRole("dialog", { name: "저장하지 않은 변경사항" })
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "계속 편집" }).click()
    await expect(editor).toBeFocused()
    await expect(editor).toHaveValue(discardedContent)

    await backLink.click()
    dialog = page.getByRole("dialog", { name: "저장하지 않은 변경사항" })
    await dialog.getByRole("button", { name: "변경사항 버리기" }).click()
    await expect(page).toHaveURL("/")
    await expect.poll(() => readStoredNoteDraft(page, noteId)).toBeNull()

    const restoredNote = page
      .getByRole("article")
      .filter({ hasText: initialContent })
    await restoredNote.getByRole("link", { name: / 수정$/u }).click()
    await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(
      initialContent,
    )
  })

  test("변경사항을 버리는 중에는 대화상자 닫기를 무시하고 원래 목적지로 이동한다", async ({
    page,
  }) => {
    const initialContent = "버리기 진행을 확인할 메모"
    const changedContent = "버리기 전에 작성한 변경사항"
    const note = await createMobileNoteThroughUi(page, initialContent)

    await note.getByRole("link", { name: / 수정$/u }).click()
    const editor = page.getByRole("textbox", { name: "메모 내용" })
    await editor.fill(changedContent)
    await page.getByRole("link", { exact: true, name: "메모 목록" }).click()

    await page.evaluate(() => {
      type DelayedDraftWindow = typeof window & {
        waitForDelayedDraftSave?: Promise<void>
      }
      const currentWindow = window as DelayedDraftWindow
      const originalTransaction = IDBDatabase.prototype.transaction
      let releaseCompletion: (() => void) | null = null

      currentWindow.waitForDelayedDraftSave = new Promise<void>((resolve) => {
        releaseCompletion = resolve
      })
      IDBDatabase.prototype.transaction = function transaction(
        storeNames: string | string[],
        mode?: IDBTransactionMode,
      ) {
        const transaction = originalTransaction.call(this, storeNames, mode)
        const usesDraftStore = Array.isArray(storeNames)
          ? storeNames.includes("noteDrafts")
          : storeNames === "noteDrafts"

        if (!usesDraftStore || mode !== "readwrite") {
          return transaction
        }

        let completionHandler: ((event: Event) => unknown) | null = null
        Object.defineProperty(transaction, "oncomplete", {
          configurable: true,
          get() {
            return completionHandler
          },
          set(handler: ((event: Event) => unknown) | null) {
            completionHandler = handler
          },
        })
        transaction.addEventListener("complete", (event) => {
          window.addEventListener(
            "release-delayed-draft-save",
            () => completionHandler?.call(transaction, event),
            { once: true },
          )
          releaseCompletion?.()
        })
        return transaction
      }
    })

    const dialog = page.getByRole("dialog", { name: "저장하지 않은 변경사항" })
    await dialog.getByRole("button", { name: "변경사항 버리기" }).click()
    await page.evaluate(() => {
      type DelayedDraftWindow = typeof window & {
        waitForDelayedDraftSave?: Promise<void>
      }

      return (window as DelayedDraftWindow).waitForDelayedDraftSave
    })
    await expect(dialog.getByRole("button", { name: "버리는 중" })).toBeDisabled()
    await page.keyboard.press("Escape")
    await expect(dialog).toBeVisible()
    await expect(editor).toHaveValue(changedContent)
    await page.evaluate(() => {
      window.dispatchEvent(new Event("release-delayed-draft-save"))
    })
    await expect(page).toHaveURL("/")
  })

  test("넓은 화면 탐색도 저장하지 않은 상세 입력을 확인한다", async ({
    page,
  }) => {
    const initialContent = "상단 탐색 이동을 확인할 메모"
    const revisedContent = "탐색 전에 확인할 변경사항"
    const note = await createMobileNoteThroughUi(page, initialContent)

    await note.getByRole("link", { name: / 수정$/u }).click()
    await page.setViewportSize({ height: 800, width: 1280 })
    const editor = page.getByRole("textbox", { name: "메모 내용" })
    await editor.fill(revisedContent)
    await expect(editor).toHaveValue(revisedContent)
    await page.getByRole("link", { exact: true, name: "텍스트 분석" }).click()

    const dialog = page.getByRole("dialog", { name: "저장하지 않은 변경사항" })
    await expect(dialog).toBeVisible()
    await expect(page).toHaveURL(/\/notes\//u)
    await expect(editor).toHaveValue(revisedContent)
    await dialog.getByRole("button", { name: "계속 편집" }).click()
    await expect(editor).toBeFocused()
    await expect(editor).toHaveValue(revisedContent)

    await page.getByRole("link", { exact: true, name: "개인 메모" }).click()
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "계속 편집" }).click()
    await expect(editor).toBeFocused()

    await page.getByRole("link", { exact: true, name: "텍스트 분석" }).click()
    await page
      .getByRole("dialog", { name: "저장하지 않은 변경사항" })
      .getByRole("button", { name: "변경사항 버리기" })
      .click()
    await expect(page).toHaveURL("/analysis/")
  })
})
