import * as fc from "fast-check"
import { ExplorationInvariantError } from "@/shared/lib/note-model-exploration"
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test"
import { ok } from "node:assert/strict"
import { createNoteThroughUi } from "./support/create-note-through-ui"
import { noteContent } from "./support/note-content"
import { openPropertiesWithKeyboard } from "./support/run-note-action"
import { preparePointerCaptureRelease, releasePointerCapture } from "./support/pointer-capture"
import { readAppRevision } from "../test-app-revision.js"
import { readStoredNote } from "./support/read-stored-note"
import { runNoteAction } from "./support/run-note-action"
import { visibleBox } from "./support/visible-box"

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

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("본문과 헤더 클릭은 메모를 선택하고 본문 편집은 위치를 바꾸지 않는다", async ({ page }) => {
  const first = await createNoteThroughUi(page, "본문을 편집할 메모")
  const second = await createNoteThroughUi(page, "헤더를 선택할 메모")
  const editor = first.getByRole("textbox", { name: "메모 내용" })
  const original = await visibleBox(first)

  await second.getByRole("button", { name: "메모 이동" }).click()
  await expect(second).toHaveAccessibleDescription("선택됨")
  await editor.click()
  await expect(first).toHaveAccessibleDescription("선택됨")
  await expect(second).not.toHaveAccessibleDescription("선택됨")
  await expect(editor).toBeFocused()
  await editor.press("End")
  await editor.press("Enter")
  await editor.pressSequentially("추가한 본문")
  await expect(editor).toHaveValue("본문을 편집할 메모\n추가한 본문")
  await expect(first).toHaveAccessibleDescription("선택됨")
  expect(await visibleBox(first)).toEqual(original)
  await expect(page.getByRole("complementary", { name: "메모 속성" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "일괄 복사 0개" })).toBeVisible()
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
  for (const interrupt of [
    () => page.keyboard.press("Escape"),
    () => page.evaluate(() => { window.dispatchEvent(new Event("blur")) }),
  ]) {
    await page.mouse.move(moveStart.x, moveStart.y)
    await page.mouse.down()
    await page.mouse.move(moveStart.x + 45, moveStart.y + 40)
    await interrupt()
    await page.mouse.move(moveStart.x + 90, moveStart.y + 80)
    await page.mouse.up()
    await expect.poll(async () => (await visibleBox(note)).x).toBe(original.x)
  }

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

  await expect(note.getByRole("button", { name: "메모 이동" })).toBeEnabled()
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

test("넓은 화면의 새 메모와 일괄 복사 제어는 캔버스 높이를 차지하지 않는다", async ({
  page,
}) => {
  const note = await createNoteThroughUi(page, `캔버스 메모-${crypto.randomUUID()}`)
  const main = page.getByRole("main")
  const workspace = page.getByRole("region", { name: "메모 작업 영역" })
  const createButton = page.getByRole("button", { name: "새 메모" })
  const batchCopyButton = page.getByRole("button", { name: /일괄 복사 \d+개/u })

  await expect(createButton).toBeVisible()
  await expect(batchCopyButton).toBeVisible()
  const mainBox = await visibleBox(main)
  const workspaceBox = await visibleBox(workspace)
  expect(workspaceBox.y).toBe(mainBox.y)
  expect(workspaceBox.height).toBeCloseTo(mainBox.height, 0)

  await createButton.click()
  await expect(page.getByRole("article")).toHaveCount(2)

  await batchCopyButton.click()
  await expect(
    page.getByRole("button", { name: "일괄 복사 패널 닫기" }),
  ).toBeVisible()
  await expect(note).toBeVisible()
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

type CanvasPrelude = "fit" | "view-left" | "zoom-out"

type CanvasScenario = {
  content: string
  panX: number
  panY: number
  prelude: CanvasPrelude[]
  termination: "capture-loss" | "release"
  viewportWidth: number
  wheelDelta: number
  toString(): string
}

function canvasScenarios(blockTermination: boolean) {
  const prelude = blockTermination
    ? fc.array(fc.constant<CanvasPrelude>("view-left"), {
        maxLength: 4,
        size: "max",
      })
    : fc.array(fc.constantFrom<CanvasPrelude>("fit", "view-left", "zoom-out"), {
        maxLength: 3,
      })

  return fc.record({
    content: noteContent,
    panX: fc.integer({ min: 35, max: 95 }),
    panY: fc.integer({ min: 30, max: 75 }),
    prelude,
    termination: blockTermination
      ? fc.constant("release" as const)
      : fc.constantFrom("capture-loss" as const, "release" as const),
    viewportWidth: fc.integer({ min: 1000, max: 1400 }),
    wheelDelta: fc.integer({ min: 30, max: 90 }),
  }).map((scenario): CanvasScenario => ({
    ...scenario,
    toString() {
      return [
        ...this.prelude,
        `wheel-zoom(${this.wheelDelta})`,
        `resize-viewport(${this.viewportWidth})`,
        `pan(${this.panX},${this.panY})`,
        this.termination,
        "hover",
      ].join(",")
    },
  }))
}

async function runCanvasScenario(
  browser: Browser,
  scenario: CanvasScenario,
  blockTermination: boolean,
) {
  const context = await browser.newContext()

  try {
    const page = await context.newPage()
    await page.goto("/")
    const note = await createNoteThroughUi(page, scenario.content)
    const articleId = await note.getAttribute("id")
    if (articleId === null) {
      throw new Error("Expected a note article id")
    }
    const noteId = decodeURIComponent(articleId.slice(5, -6))
    await expect.poll(async () => readStoredNote(page, noteId)).not.toBeNull()
    const storedBefore = await readStoredNote(page, noteId)
    if (storedBefore === null) {
      throw new Error("Expected a stored note")
    }

    const controls = page.getByRole("group", { name: "캔버스 보기" })
    for (const action of scenario.prelude) {
      const before = await visibleBox(note)
      if (action === "view-left") {
        await controls.getByRole("button", { name: "왼쪽 보기" }).click()
        await expect.poll(async () => (await visibleBox(note)).x)
          .toBeGreaterThan(before.x)
      } else if (action === "zoom-out") {
        await controls.getByRole("button", { name: "축소" }).click()
        await expect.poll(async () => (await visibleBox(note)).width)
          .toBeLessThan(before.width)
      } else {
        await controls.getByRole("button", { name: "모두 보기" }).click()
        await expect(note).toBeInViewport()
      }
    }

    const workspace = page.getByRole("region", { name: "메모 작업 영역" })
    const initialWorkspaceBox = await visibleBox(workspace)
    const wheelAnchor = {
      x: initialWorkspaceBox.x + initialWorkspaceBox.width * 0.65,
      y: initialWorkspaceBox.y + initialWorkspaceBox.height * 0.45,
    }
    const beforeWheel = await visibleBox(note)
    await page.mouse.move(wheelAnchor.x, wheelAnchor.y)
    await page.keyboard.down("Control")
    await page.mouse.wheel(0, -scenario.wheelDelta)
    await page.keyboard.up("Control")
    await expect.poll(async () => (await visibleBox(note)).width)
      .toBeGreaterThan(beforeWheel.width)

    await page.setViewportSize({ height: 900, width: scenario.viewportWidth })
    const workspaceBox = await visibleBox(workspace)
    const start = {
      x: workspaceBox.x + workspaceBox.width * 0.72,
      y: workspaceBox.y + workspaceBox.height * 0.72,
    }
    const beforePan = await visibleBox(note)
    if (blockTermination) {
      await page.evaluate(() => {
        for (const eventName of ["pointerup", "lostpointercapture"]) {
          document.addEventListener(eventName, (event) => {
            event.stopImmediatePropagation()
          }, { capture: true, once: true })
        }
      })
    }
    if (scenario.termination === "capture-loss") {
      await preparePointerCaptureRelease(page)
    }
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x - scenario.panX, start.y - scenario.panY)
    await expect.poll(async () => (await visibleBox(note)).x)
      .toBeLessThan(beforePan.x)
    if (scenario.termination === "capture-loss") {
      await releasePointerCapture(page)
    }
    await page.mouse.up()
    const released = await visibleBox(note)
    await page.mouse.move(
      start.x - scenario.panX * 1.5,
      start.y - scenario.panY * 1.5,
    )
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    }))
    const afterHover = await visibleBox(note)
    const movement = Math.hypot(
      afterHover.x - released.x,
      afterHover.y - released.y,
    )
    if (movement > 1) {
      throw new ExplorationInvariantError(
        "canvas-view-stays-fixed-after-pointer-release",
        { x: released.x, y: released.y },
        { x: afterHover.x, y: afterHover.y },
      )
    }

    const storedAfter = await readStoredNote(page, noteId)
    expect(storedAfter?.geometry).toEqual(storedBefore.geometry)
    await expect(controls).toBeInViewport()
  } finally {
    await context.close()
  }
}

test("캔버스 시점 조합에서 입력을 놓은 뒤의 위치와 저장 좌표를 유지한다", async ({
  browser,
}) => {
  test.setTimeout(180_000)
  const normal = await fc.check(
    fc.asyncProperty(canvasScenarios(false), async (scenario) => {
      await runCanvasScenario(browser, scenario, false)
    }),
    { numRuns: 5, verbose: true },
  )
  expect(normal.failed, fc.defaultReportMessage(normal)).toBe(false)
  expect(normal.interrupted).toBe(false)

  const faulty = await fc.check(
    fc.asyncProperty(canvasScenarios(true), async (scenario) => {
      await runCanvasScenario(browser, scenario, true)
    }),
    { numRuns: 10, verbose: true },
  )
  expect(faulty.failed, fc.defaultReportMessage(faulty)).toBe(true)
  expect(faulty.errorInstance).toBeInstanceOf(ExplorationInvariantError)
  expect(faulty.numShrinks).toBeGreaterThan(0)
  const reduced = faulty.counterexample?.[0]
  ok(reduced, "Expected a reduced canvas scenario")

  const replay = await fc.check(
    fc.asyncProperty(canvasScenarios(true), async (scenario) => {
      await runCanvasScenario(browser, scenario, true)
    }),
    {
      endOnFailure: true,
      numRuns: 1,
      path: faulty.counterexamplePath ?? undefined,
      seed: faulty.seed,
    },
  )
  expect(replay.errorInstance).toBeInstanceOf(ExplorationInvariantError)
  await expect(runCanvasScenario(browser, reduced, true)).rejects.toMatchObject({
    invariant: "canvas-view-stays-fixed-after-pointer-release",
  })
  await expect(runCanvasScenario(browser, reduced, false)).resolves.toBeUndefined()

  const failure = faulty.errorInstance as ExplorationInvariantError
  console.info(JSON.stringify({
    appRevision: readAppRevision(),
    browser: browser.browserType().name(),
    expected: failure.expected,
    feature: "canvas-view",
    firstActions: faulty.failures[0]?.[0].toString() ?? null,
    initialContent: reduced.content,
    invariant: failure.invariant,
    minimalActions: reduced.toString(),
    observed: failure.observed,
    path: faulty.counterexamplePath,
    runs: normal.numRuns,
    seed: faulty.seed,
    shrinks: faulty.numShrinks,
    termination: "controlled-defect",
  }))
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
    page.getByRole("status").filter({ hasNotText: /^(?:메모 \d+개|저장됨|저장 중)$/u }),
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

  await page.setViewportSize({ width: 1000, height: 720 })
  await note.press("Enter")
  const propertiesDialog = page.getByRole("dialog", { name: "메모 속성" })
  await expect(propertiesDialog).toBeVisible()
  const storedX = await propertiesDialog.getByRole("spinbutton", { name: "X" }).inputValue()
  await page.keyboard.press("Escape")
  await expect(propertiesDialog).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(propertiesDialog).toHaveCount(0)
  await note.press("Enter")
  await expect(propertiesDialog).toBeVisible()
  await expect(propertiesDialog.getByRole("spinbutton", { name: "X" })).toHaveValue(storedX)
  await page.setViewportSize({ width: 1280, height: 720 })
  await expect(propertiesDialog).toHaveCount(0)
  await expect(properties.getByRole("spinbutton", { name: "X" })).toHaveValue(storedX)
})

test("메모 삭제를 알리고 같은 메모를 취소로 복원한다", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-04T01:00:00.000Z") })
  await page.reload()
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
