import * as fc from "fast-check"
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test"
import { createMobileNoteThroughUi, openMobileNoteEditor, readMobileNoteEditHref } from "./support/create-note-through-ui"
import { delayNextWriteCompletion } from "./support/delay-write-completion"
import { noteIdFromHref, readStoredNote } from "./support/read-stored-note"
import { replaySequence } from "./support/replay-sequence"
import { visibleBox } from "./support/visible-box"

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
      real.page.getByRole("dialog", { name: "저장하지 않은 내용이 있어요" }),
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

class WaitForMobileAutosave implements fc.AsyncCommand<MobileSaveModel, MobileSaveReal> {
  check(model: Readonly<MobileSaveModel>) {
    return model.view === "detail" && model.input !== model.stored
  }

  async run(model: MobileSaveModel, real: MobileSaveReal) {
    real.actions.push(this.toString())
    await real.page.clock.runFor(800)
    model.stored = model.input
    await expectMobileSaveState(model, real)
  }

  toString() {
    return "wait-for-autosave"
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
      .getByRole("dialog", { name: "저장하지 않은 내용이 있어요" })
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
      .getByRole("dialog", { name: "저장하지 않은 내용이 있어요" })
      .getByRole("button", { name: "나가기" })
      .click()
    model.input = model.stored
    model.view = "list"
    await expectMobileSaveState(model, real)
    expect((await readStoredNote(real.page, real.noteId))?.content).toBe(model.stored)
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
    await openMobileNoteEditor(real.page, real.page.getByRole("article"))
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
  fc.constant(new WaitForMobileAutosave()),
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
    await page.clock.install()
    await page.goto("/")
    const initialContent = "저장된 메모"
    const note = await createMobileNoteThroughUi(page, initialContent)
    const noteId = noteIdFromHref(
      await readMobileNoteEditHref(page, note),
    )
    await openMobileNoteEditor(page, note)
    await page.clock.pauseAt(Date.now() + 60_000)

    if (blockSave) {
      await page.evaluate(() => {
        const originalAdd = IDBObjectStore.prototype.add
        IDBObjectStore.prototype.add = function (value, key) {
          if (this.name === "updates") return this.get([value.id, value.noteId])
          return originalAdd.call(this, value, key)
        }
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
          .getByRole("status")
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

test("모바일 상세 화면의 자동 저장과 이탈 선택을 조합한다", async ({ browser }) => {
  test.setTimeout(120_000)
  const details = await fc.check(
    fc.asyncProperty(
      mobileSavePair,
      fc.commands(mobileSaveActions, { maxCommands: 6 }),
      async ([firstContent, secondContent], commands) => {
        await runMobileSaveCommands(
          [
            new EditMobileContent(firstContent),
            new WaitForMobileAutosave(),
            new EditMobileContent(secondContent),
            new WaitForMobileAutosave(),
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

test("모바일 자동 저장의 쓰기가 누락되면 실패 행동을 축소하고 재현한다", async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000)
  const failures: MobileSaveFailure[] = []
  const actions = [
    mobileSaveContent.map((content) => new EditMobileContent(content)),
    fc.constant(new WaitForMobileAutosave()),
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
    classification: "controlled-autosave-write-omission",
    feature: "mobile-autosave",
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

test.describe("320px 메모 화면", () => {
  test.use({ hasTouch: true, viewport: { height: 720, width: 320 } })

  test("구버전 모바일 초안을 이전한 뒤 다시 열면 맞는 초안만 본문에 반영된다", async ({ page }) => {
    await page.route("**/previous-notes", (route) => route.fulfill({ contentType: "text/html", body: "<title>메모 이전</title>" }))
    await page.goto("/previous-notes")
    await page.evaluate(async () => {
      await new Promise<void>((resolve, reject) => {
        const deletion = indexedDB.deleteDatabase("personal-notes")
        deletion.onsuccess = () => resolve()
        deletion.onerror = () => reject(deletion.error)
      })
      await new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("personal-notes", 2)
        open.onerror = () => reject(open.error)
        open.onsuccess = () => { open.result.close(); resolve() }
        open.onupgradeneeded = () => {
          const db = open.result
          const notes = db.createObjectStore("notes", { keyPath: "id" })
          const drafts = db.createObjectStore("noteDrafts", { keyPath: "note.id" })
          db.createObjectStore("batchCopyLists", { keyPath: "id" })
          db.createObjectStore("templates", { keyPath: "id" })
          db.createObjectStore("preferences")
          db.createObjectStore("usage", { keyPath: "id" }).createIndex("by-note-content", ["note.id", "note.contentRevision", "textSnapshot"], { unique: true })
          const updatedAt = new Date().toISOString()
          for (const [index, id] of ["matched", "stale"].entries()) {
            notes.add({ id, content: id, createdAt: updatedAt, updatedAt, contentRevision: 1, revision: 1, tabIndex: 1000 + index,
              geometry: { x: 20, y: 20, width: 320, height: 240, zIndex: index + 1 } })
            drafts.add({ content: "복구할 본문", updatedAt, note: { id, contentRevision: 1 - index } })
          }
        }
      })
    })
    await page.goto("/notes/matched/")
    const editor = page.getByRole("textbox", { name: "메모 내용" })
    await expect(editor).toHaveValue("복구할 본문")
    await page.reload()
    await expect(editor).toHaveValue("복구할 본문")
    await page.goto("/notes/stale/")
    await expect(editor).toHaveValue("stale")
  })

  test("더보기의 수정으로 상세 화면에서 저장하고 제한된 높이의 목록으로 돌아온다", async ({
    page,
  }) => {
    const initialContent = "작은 화면에서 편집할 메모"
    const revisedContent = `${initialContent}\n두 번째 줄\n세 번째 줄\n네 번째 줄\n다섯 번째 줄\n여섯 번째 줄\n일곱 번째 줄`
    const note = await createMobileNoteThroughUi(page, initialContent)
    const noteId = noteIdFromHref(
      await readMobileNoteEditHref(page, note),
    )
    const storedBeforeResize = await readStoredNote(page, noteId)
    expect(storedBeforeResize).not.toBeNull()

    await expect(note.getByText("내용 더 있음")).toHaveCount(0)
    await openMobileNoteEditor(page, note)
    const editor = page.getByRole("textbox", { name: "메모 내용" })
    await editor.fill(revisedContent)
    await expect(page.getByRole("status")).toHaveText("저장됨")
    await expect.poll(async () => (await readStoredNote(page, noteId))?.content).toBe(revisedContent)
    await page.getByRole("link", { exact: true, name: "메모 목록" }).click()

    const savedNote = page.getByRole("article").filter({ hasText: initialContent })
    const box = await visibleBox(savedNote)
    expect(box.height).toBeLessThanOrEqual(192)
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
      await readMobileNoteEditHref(page, note),
    )

    await page.clock.install()
    await openMobileNoteEditor(page, note)
    await page.clock.pauseAt(Date.now() + 60_000)
    const editor = page.getByRole("textbox", { name: "메모 내용" })
    const backLink = page.getByRole("link", { exact: true, name: "메모 목록" })
    await editor.fill(discardedContent)
    await backLink.click()

    let dialog = page.getByRole("dialog", { name: "저장하지 않은 내용이 있어요" })
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "계속 편집" }).click()
    await page.clock.runFor(17)
    await expect(editor).toBeFocused()
    await expect(editor).toHaveValue(discardedContent)

    await backLink.click()
    dialog = page.getByRole("dialog", { name: "저장하지 않은 내용이 있어요" })
    await dialog.getByRole("button", { name: "나가기" }).click()
    await expect(page).toHaveURL("/")

    expect((await readStoredNote(page, noteId))?.content).toBe(initialContent)
    const restoredNote = page
      .getByRole("article")
      .filter({ hasText: initialContent })
    await openMobileNoteEditor(page, restoredNote)
    await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(
      initialContent,
    )
  })

  test("저장 중 나가면 늦은 저장은 유지하고 이후 입력과 편집 기록은 버린다", async ({ page }) => {
    const initialContent = "편집 전 본문"
    const pendingContent = "이미 요청한 본문"
    const discardedContent = "요청 뒤 추가로 편집한 본문"
    await page.clock.install()
    const note = await createMobileNoteThroughUi(page, initialContent)
    const noteId = noteIdFromHref(await readMobileNoteEditHref(page, note))
    await openMobileNoteEditor(page, note)
    await page.clock.pauseAt(Date.now() + 60_000)
    const completion = await delayNextWriteCompletion(page, "notes")
    const editor = page.getByRole("textbox", { name: "메모 내용" })
    await editor.fill(pendingContent)
    await page.clock.runFor(800)
    await completion.waitUntilCommitted()
    await expect(page.getByRole("status")).toHaveText("저장 중")
    await editor.fill(discardedContent)
    await page.getByRole("link", { exact: true, name: "메모 목록" }).click()
    const dialog = page.getByRole("dialog", { name: "저장하지 않은 내용이 있어요" })
    await dialog.getByRole("button", { name: "나가기" }).click()
    await expect(page).toHaveURL("/")
    await expect(dialog).toBeHidden()
    await completion.release()
    await page.clock.runFor(800)
    expect((await readStoredNote(page, noteId))?.content).toBe(pendingContent)
    const savedNote = page.getByRole("article").filter({ hasText: pendingContent })
    await openMobileNoteEditor(page, savedNote)
    await expect(editor).toHaveValue(pendingContent)
    await expect(page.getByRole("button", { exact: true, name: "실행 취소" })).toBeDisabled()
    await expect(page.getByRole("button", { exact: true, name: "다시 실행" })).toBeDisabled()
  })

  test("브라우저 앞뒤 이동을 취소하면 주소와 입력을 유지하고 나가기는 원래 위치로 이동한다", async ({ page }) => {
    await page.clock.install()
    const initialContent = "브라우저 이동 전 저장 본문"
    const note = await createMobileNoteThroughUi(page, initialContent)
    await openMobileNoteEditor(page, note)
    await expect(page).toHaveURL(/\/notes\/[^/]+\/$/u)
    const detailUrl = page.url()
    await page.setViewportSize({ height: 800, width: 1280 })
    await page.getByRole("link", { exact: true, name: "텍스트 분석" }).click()
    await expect(page).toHaveURL("/analysis/")
    await page.goBack()
    await expect(page).toHaveURL(detailUrl)
    await page.clock.pauseAt(Date.now() + 60_000)
    const editor = page.getByRole("textbox", { name: "메모 내용" })
    const dialog = page.getByRole("dialog", { name: "저장하지 않은 내용이 있어요" })
    const historyLength = await page.evaluate(() => history.length)
    await editor.fill("앞으로가기 전에 편집한 본문")
    await page.goForward()
    await expect(dialog).toBeVisible()
    await expect(page).toHaveURL(detailUrl)
    await dialog.getByRole("button", { name: "계속 편집" }).click()
    await expect(editor).toHaveValue("앞으로가기 전에 편집한 본문")
    expect(await page.evaluate(() => history.length)).toBe(historyLength)
    await page.goForward()
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "나가기" }).click()
    await expect(page).toHaveURL("/analysis/")
    await page.goBack()
    await expect(editor).toHaveValue(initialContent)
    await expect(page.getByRole("button", { exact: true, name: "실행 취소" })).toBeDisabled()
    await editor.fill("뒤로가기 전에 편집한 본문")
    await page.goBack()
    await expect(dialog).toBeVisible()
    await expect(page).toHaveURL(detailUrl)
    await dialog.getByRole("button", { name: "계속 편집" }).click()
    await expect(editor).toHaveValue("뒤로가기 전에 편집한 본문")
    await page.goBack()
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "나가기" }).click()
    await expect(page).toHaveURL("/")
    expect(await page.evaluate(() => history.length)).toBe(historyLength)
  })

  test("넓은 화면 탐색도 저장하지 않은 상세 입력을 확인한다", async ({
    page,
  }) => {
    const initialContent = "상단 탐색 이동을 확인할 메모"
    const revisedContent = "탐색 전에 확인할 변경사항"
    const note = await createMobileNoteThroughUi(page, initialContent)

    await page.clock.install()
    await openMobileNoteEditor(page, note)
    await page.clock.pauseAt(Date.now() + 60_000)
    await expect(page).toHaveURL(/\/notes\/[^/]+\/$/u)
    await page.setViewportSize({ height: 800, width: 1280 })
    const editor = page.getByRole("textbox", { name: "메모 내용" })
    await editor.fill(revisedContent)
    await expect(editor).toHaveValue(revisedContent)
    await page.getByRole("link", { exact: true, name: "텍스트 분석" }).click()

    const dialog = page.getByRole("dialog", { name: "저장하지 않은 내용이 있어요" })
    await expect(dialog).toBeVisible()
    await expect(page).toHaveURL(/\/notes\//u)
    await expect(editor).toHaveValue(revisedContent)
    await dialog.getByRole("button", { name: "계속 편집" }).click()
    await page.clock.runFor(17)
    await expect(editor).toBeFocused()
    await expect(editor).toHaveValue(revisedContent)

    await page.getByRole("link", { exact: true, name: "개인 메모" }).click()
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "계속 편집" }).click()
    await page.clock.runFor(17)
    await expect(editor).toBeFocused()

    await page.getByRole("link", { exact: true, name: "텍스트 분석" }).click()
    await page
      .getByRole("dialog", { name: "저장하지 않은 내용이 있어요" })
      .getByRole("button", { name: "나가기" })
      .click()
    await expect(page).toHaveURL("/analysis/")
  })
})
