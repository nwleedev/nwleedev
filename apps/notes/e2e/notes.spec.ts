import { expect, test, type Locator, type Page } from "@playwright/test"

import {
  createMobileNoteThroughUi,
  createNoteThroughUi,
} from "./support/create-note-through-ui"

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

  await expect(page.getByRole("link", { name: "본문으로 이동" })).toHaveAttribute(
    "tabindex",
    "1",
  )
  await expect(page.getByRole("link", { exact: true, name: "메모" })).toHaveAttribute(
    "tabindex",
    "11",
  )
  await expect(page.getByRole("button", { name: "새 메모" })).toHaveAttribute(
    "tabindex",
    "100",
  )
  await expect(batchCopy).toHaveAttribute("tabindex", "101")
  await expect(first).toHaveAttribute("tabindex", "1000")
  await expect(second).toHaveAttribute("tabindex", "1001")

  await batchCopy.focus()
  await batchCopy.press("Tab")
  await expect(first).toBeFocused()
  await first.press("Tab")
  await expect(second).toBeFocused()
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
  await expect(properties.getByRole("spinbutton", { name: "X" })).toHaveValue("80")

  const invalidX = properties.getByRole("spinbutton", { name: "X" })
  await invalidX.fill("0")
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

test("헤더 이동, 가장자리 크기 조절과 빈 캔버스 시점 이동을 구분한다", async ({
  page,
}) => {
  const note = await createNoteThroughUi(page, "공간 조작을 확인할 메모")
  const original = await visibleBox(note)

  await page.mouse.move(original.x + 120, original.y + 14)
  await page.mouse.down()
  await page.mouse.move(original.x + 200, original.y + 74)
  await page.mouse.up()
  await expect
    .poll(async () => (await visibleBox(note)).x)
    .toBeGreaterThan(original.x + 50)
  await expect(page.getByRole("complementary", { name: "메모 속성" })).toHaveCount(0)

  const moved = await visibleBox(note)
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

  await page.getByRole("button", { name: "일괄 복사 1개" }).click()
  await expect(batchPanel).toBeVisible()
  await expect(properties).toHaveCount(0)
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

    await note.getByRole("link", { name: "메모 열기" }).click()
    const editor = page.getByRole("textbox", { name: "메모 내용" })
    await editor.fill(revisedContent)
    await page.getByRole("button", { exact: true, name: "저장" }).click()
    await expect(page.getByRole("status")).toContainText("저장했습니다.")
    await page.getByRole("link", { exact: true, name: "메모 목록" }).click()

    const savedNote = page.getByRole("article").filter({ hasText: initialContent })
    const box = await visibleBox(savedNote)
    expect(box.height).toBeLessThanOrEqual(194)
    await page.setViewportSize({ height: 800, width: 1280 })
    await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(
      revisedContent,
    )
  })
})
