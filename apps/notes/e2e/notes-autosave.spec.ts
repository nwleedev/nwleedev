import * as fc from "fast-check"
import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test"
import { createNoteThroughUi } from "./support/create-note-through-ui"
import { openPropertiesWithKeyboard } from "./support/run-note-action"
import { readStoredNote } from "./support/read-stored-note"
import { replaySequence } from "./support/replay-sequence"

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
    const originalAdd = IDBObjectStore.prototype.add
    const initialEdits = new Map<string, string>()
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name !== "updates") return originalAdd.call(this, value, key)
      const first = initialEdits.get(value.noteId)
      if (first === undefined) initialEdits.set(value.noteId, value.id)
      if (first === undefined || first === value.id) return originalAdd.call(this, value, key)
      return this.get([value.id, value.noteId])
    }
  })
  return context
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
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
  const writeOmissionSeed = -1733444499
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
    { numRuns: 20, seed: writeOmissionSeed },
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

test("선택한 본문을 교체하고 이동할 때 저장된 본문 상태를 유지한다", async ({
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
  })
  expect(afterEdit!.bodyDigest).not.toBe(beforeEdit!.bodyDigest)

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
    bodyDigest: afterEdit!.bodyDigest,
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
  })
  expect(afterWhitespaceEdit!.bodyDigest).not.toBe(afterMove!.bodyDigest)

  await page.reload()
  await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(
    whitespaceOnlyContent,
  )
})
