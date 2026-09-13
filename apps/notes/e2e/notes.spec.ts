import { expect, test, type Locator, type Page } from "@playwright/test"
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

async function visibleBox(locator: Locator) {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error("Visible element has no bounding box")
  }

  return box
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
  page: Page
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

  async run(model: NoteCreationModel, { page }: NoteCreationReal) {
    await createNoteThroughUi(page, this.content)
    model.contents.push(this.content)
    await expectVisibleNoteContents(page, model.contents)
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

  async run(model: NoteCreationModel, { page }: NoteCreationReal) {
    await page.getByRole("button", { name: "새 메모" }).click()
    await expect(
      page
        .getByRole("region", { name: "메모 작업 영역" })
        .getByRole("alert"),
    ).toContainText("메모를 만들지 못했습니다. 다시 시도하세요.")
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

  async run(model: NoteCreationModel, { page }: NoteCreationReal) {
    await page.reload()
    await expectVisibleNoteContents(page, model.contents)
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
  await note.getByRole("button", { name: "메모 삭제" }).click({ trial: true })
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

  await first.getByRole("button", { name: "메모를 맨 앞으로" }).click()
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

  await first.getByRole("button", { name: "메모를 맨 뒤로" }).dblclick()
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
  await page.mouse.move(original.x + 120, original.y + 14)
  await page.mouse.down()
  await page.mouse.move(original.x + 200, original.y + 54)
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

test("헤더 이동, 가장자리 크기 조절과 빈 캔버스 시점 이동을 구분한다", async ({
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

  await preparePointerCaptureRelease(page)
  await page.mouse.move(original.x + 120, original.y + 14)
  await page.mouse.down()
  await page.mouse.move(original.x + 165, original.y + 54)
  await releasePointerCapture(page)
  await page.mouse.up()
  await expect.poll(async () => (await visibleBox(note)).x).toBe(original.x)

  await page.mouse.move(original.x + 120, original.y + 14)
  await page.mouse.down()
  await page.mouse.move(original.x + 200, original.y + 74)
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

test("Escape, 빈 캔버스와 Command는 선택만 해제한다", async ({ page }) => {
  const note = await createNoteThroughUi(page, "선택을 해제할 메모")
  const headerAction = note.getByRole("button", { name: "메모를 맨 앞으로" })
  const noteBox = await visibleBox(note)
  const editorBox = await visibleBox(
    note.getByRole("textbox", { name: "메모 내용" }),
  )

  await note.focus()
  await note.press("Escape")
  await expect(note).toBeFocused()
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
  const headerAction = note.getByRole("button", { name: "메모를 맨 앞으로" })

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

  await note.dblclick({ position: { x: 12, y: 14 } })
  const properties = page.getByRole("complementary", { name: "메모 속성" })
  await expect(properties).toBeVisible()
  await expect(batchPanel).toHaveCount(0)
  const xField = properties.getByRole("spinbutton", { name: "X" })

  await xField.fill("0")
  const batchCopyTrigger = page.getByRole("button", { name: "일괄 복사 1개" })
  await batchCopyTrigger.click()
  await expect(batchPanel).toBeVisible()
  await expect(properties).toHaveCount(0)
  await note.dblclick({ position: { x: 12, y: 14 } })
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

  await note.getByRole("button", { name: "메모 삭제" }).click()
  const removalNotice = page.getByRole("status").filter({
    hasText: "메모를 제거했습니다.",
  })
  await expect(note).toHaveCount(0)
  await expect(removalNotice).toBeVisible()
  await removalNotice.getByRole("button", { name: "취소" }).click()
  await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(
    content,
  )

  await note.hover()
  await note.getByRole("button", { name: "메모 삭제" }).click()
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
    hasText: "메모를 제거했습니다.",
  })

  await firstNote.hover()
  await firstNote.getByRole("button", { name: "메모 삭제" }).click()
  await expect(removalNotice).toBeVisible()
  const remainingNote = page.getByRole("article", {
    exact: true,
    name: "메모",
  })
  await remainingNote.hover()
  await remainingNote.getByRole("button", { name: "메모 삭제" }).click()
  await expect(removalNotice).toBeHidden({ timeout: 6_000 })
})

test.describe("320px 메모 화면", () => {
  test.use({ hasTouch: true, viewport: { height: 720, width: 320 } })

  test("복구한 초안을 저장하고 제거 실패를 다음 저장에서 정리한다", async ({
    page,
  }) => {
    const storedContent = "초안의 기준이 되는 메모"
    const recoveredContent = "복구해서 저장할 메모 초안"
    const savedContent = `${recoveredContent} 저장본`
    const staleContent = "이전 revision에서 남은 초안"
    const note = await createMobileNoteThroughUi(page, storedContent)
    const noteId = noteIdFromHref(
      await note.getByRole("link", { name: "메모 열기" }).getAttribute("href"),
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
      await note.getByRole("link", { name: "메모 열기" }).getAttribute("href"),
    )
    const storedBeforeResize = await readStoredNote(page, noteId)
    expect(storedBeforeResize).not.toBeNull()

    await expect(note.getByText("내용 더 있음")).toHaveCount(0)
    await note.getByRole("link", { name: "메모 열기" }).click()
    const editor = page.getByRole("textbox", { name: "메모 내용" })
    await editor.fill(revisedContent)
    await page.getByRole("button", { exact: true, name: "저장" }).click()
    await expect(page.getByRole("status")).toContainText("저장했습니다.")
    await page.getByRole("link", { exact: true, name: "메모 목록" }).click()

    const savedNote = page.getByRole("article").filter({ hasText: initialContent })
    const box = await visibleBox(savedNote)
    expect(box.height).toBeLessThanOrEqual(194)
    await expect(savedNote.getByText("내용 더 있음")).toBeVisible()
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

    await note.getByRole("link", { name: "메모 열기" }).click()
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

    const restoredNote = page
      .getByRole("article")
      .filter({ hasText: initialContent })
    await restoredNote.getByRole("link", { name: "메모 열기" }).click()
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

    await note.getByRole("link", { name: "메모 열기" }).click()
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

  test("상단 탐색의 내부 이동도 저장하지 않은 상세 입력을 확인한다", async ({
    page,
  }) => {
    const initialContent = "상단 탐색 이동을 확인할 메모"
    const revisedContent = "탐색 전에 확인할 변경사항"
    const note = await createMobileNoteThroughUi(page, initialContent)

    await note.getByRole("link", { name: "메모 열기" }).click()
    const editor = page.getByRole("textbox", { name: "메모 내용" })
    await editor.fill(revisedContent)
    await page.getByRole("button", { name: "탐색" }).click()
    await page.getByRole("link", { exact: true, name: "텍스트 분석" }).click()

    const dialog = page.getByRole("dialog", { name: "저장하지 않은 변경사항" })
    await expect(dialog).toBeVisible()
    await expect(page).toHaveURL(/\/notes\//u)
    await dialog.getByRole("button", { name: "계속 편집" }).click()
    await expect(editor).toBeFocused()
    await expect(editor).toHaveValue(revisedContent)

    await page.getByRole("link", { exact: true, name: "개인 메모" }).click()
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "계속 편집" }).click()
    await expect(editor).toBeFocused()

    await page.getByRole("button", { name: "탐색" }).click()
    await page.getByRole("link", { exact: true, name: "텍스트 분석" }).click()
    await page
      .getByRole("dialog", { name: "저장하지 않은 변경사항" })
      .getByRole("button", { name: "변경사항 버리기" })
      .click()
    await expect(page).toHaveURL("/analysis/")
  })
})
