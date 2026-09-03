import { expect, test, type Locator, type Page } from "@playwright/test"

import {
  createMobileNoteThroughUi,
  createNoteThroughUi,
} from "./support/create-note-through-ui"
import {
  preparePointerCaptureRelease,
  releasePointerCapture,
} from "./support/pointer-capture"

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

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("초기 화면을 hydration 오류 없이 연다", async ({ page }) => {
  const consoleErrors: string[] = []

  page.on("console", (message) => {
    consoleErrors.push(`${message.type()}: ${message.text()}`)
  })

  await page.reload()
  await expect(page.getByRole("main")).toBeVisible()
  const hydrationErrors = consoleErrors.filter((message) =>
    message.includes("error: A tree hydrated but some attributes"),
  )
  expect(hydrationErrors).toEqual([])
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
  await expect(storedX).toHaveAttribute("max", "3776")
  await storedX.fill("3777")
  const validBeyondMaximum = await storedX.evaluate((element) => {
    return element instanceof HTMLInputElement && element.checkValidity()
  })
  expect(validBeyondMaximum).toBe(false)

  const invalidX = storedX
  await invalidX.fill("0")
  await clickBlankCanvas(page)
  await expect(properties).toBeVisible()
  await expect(properties.getByRole("alert")).toContainText(
    "값의 범위와 캔버스 안의 위치를 확인하세요.",
  )
  await expect(invalidX).not.toBeFocused()
  await properties.getByRole("button", { name: "메모 속성 패널 닫기" }).click()
  await expect(properties).toBeVisible()
  await expect(properties.getByRole("alert")).toContainText(
    "값의 범위와 캔버스 안의 위치를 확인하세요.",
  )
  await expect(invalidX).toBeFocused()
  await properties.getByRole("button", { name: "저장값으로 되돌리기" }).click()
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
  await expect.poll(async () => (await visibleBox(note)).x).toBe(resized.x)

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
})

test.describe("320px 메모 화면", () => {
  test.use({ hasTouch: true, viewport: { height: 720, width: 320 } })

  test("짧게 눌러 상세 화면에서 저장하고 제한된 높이의 목록으로 돌아온다", async ({
    page,
  }) => {
    const initialContent = "작은 화면에서 편집할 메모"
    const revisedContent = `${initialContent}\n두 번째 줄\n세 번째 줄\n네 번째 줄\n다섯 번째 줄\n여섯 번째 줄\n일곱 번째 줄`
    const note = await createMobileNoteThroughUi(page, initialContent)

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
})
