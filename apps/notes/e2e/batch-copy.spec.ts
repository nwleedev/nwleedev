import { expect, test, type Locator, type Page } from "@playwright/test"
import * as fc from "fast-check"

import { delayNextWriteCompletion } from "./support/delay-write-completion"
import { preparePointerCaptureRelease, releasePointerCapture } from "./support/pointer-capture"
import {
  addMobileNoteToBatch,
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

async function createDesktopBatchCopy(page: Page) {
  const firstContent = "첫 번째 일괄 복사 메모"
  const secondContent = "두 번째 일괄 복사 메모"
  const firstNote = await createNoteThroughUi(page, firstContent)
  const secondNote = await createNoteThroughUi(page, secondContent)

  await firstNote
    .getByRole("textbox", { name: "메모 내용" })
    .click({ modifiers: ["Meta", "Alt"] })
  const panel = page.getByRole("complementary", { name: "일괄 복사" })
  await expect(panel).toBeVisible()
  await secondNote
    .getByRole("textbox", { name: "메모 내용" })
    .click({ modifiers: ["Meta", "Alt"] })
  await expect(panel.getByRole("listitem")).toHaveCount(2)

  return { firstContent, panel, secondContent }
}

const reorderButtonsSetting =
  "모바일과 저장 목록에서 이동 버튼 표시"

async function expectStoredSetting(
  page: Page,
  name: string,
  checked: boolean,
) {
  const storedPage = await page.context().newPage()

  try {
    await expect
      .poll(async () => {
        await storedPage.goto("/settings/")
        return storedPage.getByRole("checkbox", { name }).isChecked()
      })
      .toBe(checked)
  } finally {
    await storedPage.close()
  }
}

async function setReorderButtons(page: Page, enabled: boolean) {
  await page.goto("/settings/")
  const checkbox = page.getByRole("checkbox", {
    name: reorderButtonsSetting,
  })

  if ((await checkbox.isChecked()) !== enabled) {
    await page.getByText(reorderButtonsSetting, { exact: true }).click()
  }

  if (enabled) {
    await expect(checkbox).toBeChecked()
  } else {
    await expect(checkbox).not.toBeChecked()
  }

  await expectStoredSetting(page, reorderButtonsSetting, enabled)
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("설정에서 데스크톱 일괄 복사 단축키를 끄고 새로고침 뒤에도 유지한다", async ({
  page,
}) => {
  await page.goto("/settings/")
  const shortcut = page.getByRole("checkbox", {
    name: "Command+Option+클릭으로 일괄 복사에 추가",
  })

  await expect(shortcut).toBeChecked()
  await page.getByText(
    "Command+Option+클릭으로 일괄 복사에 추가",
    { exact: true },
  ).click()
  await expect(shortcut).not.toBeChecked()
  await expectStoredSetting(
    page,
    "Command+Option+클릭으로 일괄 복사에 추가",
    false,
  )
  await page.reload()
  await expect(
    page.getByRole("checkbox", {
      name: "Command+Option+클릭으로 일괄 복사에 추가",
    }),
  ).not.toBeChecked()

  await page.goto("/")
  const note = await createNoteThroughUi(page, "단축키 설정을 확인할 메모")

  await note
    .getByRole("textbox", { name: "메모 내용" })
    .click({ modifiers: ["Meta", "Alt"] })
  await expect(
    page.getByRole("complementary", { name: "일괄 복사" }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "일괄 복사 0개" }),
  ).toBeVisible()
})

test("설정을 꺼도 데스크탑 패널에서 가능한 방향으로 이동하고 순서를 저장한다", async ({
  page,
}) => {
  await page.goto("/settings/")
  const setting = page.getByRole("checkbox", {
    name: reorderButtonsSetting,
  })
  await expect(setting).not.toBeChecked()
  await page.getByText(reorderButtonsSetting, { exact: true }).click()
  await expect(setting).toBeChecked()
  await expectStoredSetting(page, reorderButtonsSetting, true)
  await page.reload()
  await expect(
    page.getByRole("checkbox", { name: reorderButtonsSetting }),
  ).toBeChecked()

  await setReorderButtons(page, false)
  await page.reload()
  await expect(setting).not.toBeChecked()

  await page.goto("/")
  const createContent = (position: number) =>
    `직접 이동 확인 메모 ${position}-${crypto.randomUUID()}`
  const contents = [
    createContent(1),
    createContent(2),
    createContent(3),
    createContent(4),
  ] as const
  const [firstContent, secondContent, thirdContent, fourthContent] = contents
  const movedDownContents = [
    secondContent,
    firstContent,
    thirdContent,
    fourthContent,
  ]

  for (const content of contents) {
    const note = await createNoteThroughUi(page, content)
    await note
      .getByRole("textbox", { name: "메모 내용" })
      .click({ modifiers: ["Meta", "Alt"] })
  }

  const panel = page.getByRole("complementary", { name: "일괄 복사" })
  const items = panel.getByRole("listitem")
  const firstItem = items.filter({ hasText: firstContent })
  await firstItem
    .getByRole("button", { name: /번째 일괄 복사 항목 동작$/u })
    .click()
  await expect(
    page.getByRole("menu", { name: /번째 일괄 복사 항목 동작$/u }),
  ).toBeInViewport()
  await expect(
    page.getByRole("menuitem", { exact: true, name: "위로 이동" }),
  ).toHaveCount(0)
  await page
    .getByRole("menuitem", { exact: true, name: "아래로 이동" })
    .click()
  await expect(items).toContainText(movedDownContents)
  await expect(
    firstItem.getByRole("button", { name: /번째 일괄 복사 항목 동작$/u }),
  ).toBeFocused()

  await firstItem
    .getByRole("button", { name: /번째 일괄 복사 항목 동작$/u })
    .click()
  await expect(
    page.getByRole("menuitem", { exact: true, name: "위로 이동" }),
  ).toBeVisible()
  await expect(
    page.getByRole("menuitem", { exact: true, name: "아래로 이동" }),
  ).toBeVisible()
  await page
    .getByRole("menuitem", { exact: true, name: "위로 이동" })
    .click()
  await expect(items).toContainText(contents)

  await firstItem
    .getByRole("button", { name: /번째 일괄 복사 항목 동작$/u })
    .click()
  await expect(page.getByRole("menuitem", { exact: true, name: "맨 위로 이동" })).toHaveCount(0)
  await page.getByRole("menuitem", { exact: true, name: "맨 아래로 이동" }).click()
  await expect(items).toContainText([secondContent, thirdContent, fourthContent, firstContent])
  await expect(firstItem.getByRole("button", { name: /번째 일괄 복사 항목 동작$/u })).toBeFocused()
  await firstItem.getByRole("button", { name: /번째 일괄 복사 항목 동작$/u }).click()
  await expect(page.getByRole("menuitem", { exact: true, name: "맨 아래로 이동" })).toHaveCount(0)
  await expect(page.getByRole("menuitem", { exact: true, name: "아래로 이동" })).toHaveCount(0)
  await page.getByRole("menuitem", { exact: true, name: "맨 위로 이동" }).click()
  await expect(items).toContainText(contents)
  await expect(firstItem.getByRole("button", { name: /번째 일괄 복사 항목 동작$/u })).toBeFocused()

  await page.reload()
  await page.goto("/batch-copy/")
  await expect(
    page
      .getByRole("region", { name: "일괄 복사 항목 관리" })
      .getByRole("listitem"),
  ).toContainText(contents)

  await setReorderButtons(page, false)
  await page.goto("/batch-copy/")
  await page
    .getByRole("button", { name: "1번째 일괄 복사 항목 동작" })
    .click()
  await expect(
    page.getByRole("menuitem", { exact: true, name: "위로 이동" }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("menuitem", { exact: true, name: "아래로 이동" }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("menuitem", { exact: true, name: "복제" }),
  ).toBeVisible()
  await expect(
    page.getByRole("menuitem", { exact: true, name: "삭제" }),
  ).toBeVisible()
})

test("패널 너비를 조절하고 취소, 새로고침과 창 크기 변경에서 유지한다", async ({ page }) => {
  const { panel } = await createDesktopBatchCopy(page)
  const resize = page.getByRole("separator", { name: "일괄 복사 너비" })
  await expect.poll(async () => (await visibleBox(panel)).width).toBe(320)
  const headerHeight = await panel.getByRole("heading", { name: "일괄 복사" }).evaluate(
    (heading) => heading.parentElement!.getBoundingClientRect().height,
  )
  expect(headerHeight).toBe(60)
  const edge = await visibleBox(resize)
  const x = edge.x + edge.width / 2
  const y = edge.y + 120
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 120, y, { steps: 12 })
  await page.mouse.up()
  await expect.poll(async () => (await visibleBox(panel)).width).toBe(440)

  const movedEdge = await visibleBox(resize)
  await page.mouse.move(movedEdge.x + movedEdge.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(movedEdge.x - 50, y, { steps: 6 })
  await page.keyboard.press("Escape")
  await page.mouse.up()
  await expect.poll(async () => (await visibleBox(panel)).width).toBe(440)
  await page.reload()
  await page.getByRole("button", { name: "일괄 복사 2개", exact: true }).click()
  await expect.poll(async () => (await visibleBox(panel)).width).toBe(440)

  await resize.press("ArrowLeft")
  await expect.poll(async () => (await visibleBox(panel)).width).toBe(456)
  await resize.press("ArrowRight")
  await expect.poll(async () => (await visibleBox(panel)).width).toBe(440)
  await page.setViewportSize({ width: 1600, height: 720 })
  await expect(resize).toHaveAttribute("aria-valuemax", "640")
  await resize.press("End")
  await expect.poll(async () => (await visibleBox(panel)).width).toBe(640)
  await page.setViewportSize({ width: 1280, height: 720 })
  await expect.poll(async () => (await visibleBox(panel)).width).toBe(512)
  await page.setViewportSize({ width: 1600, height: 720 })
  await expect.poll(async () => (await visibleBox(panel)).width).toBe(640)
  await resize.press("Home")
  await expect.poll(async () => (await visibleBox(panel)).width).toBe(280)
})

test("확대된 일괄 복사 패널은 최소 너비에서도 제목과 항목 조작을 읽을 수 있다", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 2560, height: 1080 })
  const { panel, firstContent } = await createDesktopBatchCopy(page)
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%" })
  const resize = page.getByRole("separator", { name: "일괄 복사 너비" })
  await resize.press("Home")
  await expect.poll(async () => (await visibleBox(panel)).width).toBe(280)
  const title = panel.getByRole("heading", { name: "일괄 복사", exact: true })
  await page.screenshot({ path: testInfo.outputPath("panel-text-200.png") })
  const titleBounds = await title.evaluate((element) => {
    const box = element.getBoundingClientRect()
    const range = document.createRange()
    range.selectNodeContents(element)
    const text = range.getBoundingClientRect()
    return { left: box.left, right: box.right, textLeft: text.left, textRight: text.right, textHeight: text.height, lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight) }
  })
  expect(titleBounds.textLeft).toBeGreaterThanOrEqual(titleBounds.left)
  expect(titleBounds.textRight).toBeLessThanOrEqual(titleBounds.right)
  expect(titleBounds.textHeight).toBeLessThanOrEqual(titleBounds.lineHeight)
  await expect(panel.getByText("2개", { exact: true })).toBeInViewport({ ratio: 1 })
  const item = panel.getByRole("listitem", { name: "1번째 일괄 복사 항목", exact: true })
  const selection = item.getByRole("button", { name: `일괄 복사 항목 선택: ${firstContent}`, exact: true })
  await expect(selection).toBeInViewport({ ratio: 1 })
  const overflow = await selection.evaluate((element) => element.scrollWidth - element.clientWidth)
  expect(overflow).toBe(0)
  await selection.click()
  await expect(selection).toHaveAttribute("aria-pressed", "true")
  await item.getByRole("button", { name: / 항목 동작$/u }).click()
  await page.getByRole("menuitem", { name: "아래로 이동", exact: true }).click()
  await expect(panel.getByRole("listitem", { name: "2번째 일괄 복사 항목", exact: true })).toContainText(firstContent)
  await panel.getByRole("button", { name: "일괄 복사 패널 닫기" }).click()
  await expect(panel).toBeHidden()
  await page.setViewportSize({ width: 1920, height: 720 })
  const trigger = page.getByRole("button", { name: "일괄 복사 2개", exact: true })
  await trigger.click()
  const modal = page.getByRole("dialog", { name: "일괄 복사", exact: true })
  await expect(modal).toBeInViewport({ ratio: 1 })
  await expect(modal.getByRole("heading", { name: "일괄 복사", exact: true })).toBeInViewport({ ratio: 1 })
  await expect(modal.getByRole("button", { name: "복사", exact: true })).toBeInViewport({ ratio: 1 })
  const moved = modal.getByRole("listitem", { name: "2번째 일괄 복사 항목", exact: true })
  await expect(moved).toContainText(firstContent)
  await moved.getByRole("button", { name: / 항목 동작$/u }).click()
  await expect(page.getByRole("menuitem", { name: "위로 이동", exact: true })).toBeInViewport({ ratio: 1 })
  await page.screenshot({ path: testInfo.outputPath("modal-text-200.png") })
  await page.keyboard.press("Escape")
  await modal.getByRole("button", { name: "일괄 복사 패널 닫기" }).click()
  await expect(modal).toBeHidden()
  await expect(trigger).toBeFocused()
})

test("브라우저가 너비 보관을 거부해도 현재 패널의 크기는 조절할 수 있다", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() { throw new DOMException("Storage denied", "SecurityError") },
    })
  })
  await page.reload()
  const { panel } = await createDesktopBatchCopy(page)
  const resize = page.getByRole("separator", { name: "일괄 복사 너비" })
  await expect.poll(async () => (await visibleBox(panel)).width).toBe(320)
  await resize.press("ArrowLeft")
  await expect.poll(async () => (await visibleBox(panel)).width).toBe(336)
  await page.reload()
  await page.getByRole("button", { name: "일괄 복사 2개", exact: true }).click()
  await expect.poll(async () => (await visibleBox(panel)).width).toBe(320)
})

test("항목 메뉴는 크기 조절과 스크롤 뒤에도 첫 프레임부터 버튼 옆에 표시된다", async ({ page }, testInfo) => {
  const { panel } = await createDesktopBatchCopy(page)
  const items = panel.getByRole("listitem")
  const second = panel.getByRole("listitem", { name: "2번째 일괄 복사 항목", exact: true })
  for (let count = 3; count <= 7; count += 1) {
    await second.getByRole("button", { name: / 항목 동작$/u }).click()
    await page.getByRole("menuitem", { name: "복제", exact: true }).click()
    await expect(items).toHaveCount(count)
  }
  const resize = page.getByRole("separator", { name: "일괄 복사 너비" })
  const cases = [
    { position: 1, key: "Home", side: "below" },
    { position: 7, key: "Home", side: "above" },
    { position: 1, key: "End", side: "below" },
    { position: 7, key: "End", side: "above" },
  ] as const

  for (const scenario of cases) {
    await resize.press(scenario.key)
    const expectedWidth = await resize.getAttribute(scenario.key === "Home" ? "aria-valuemin" : "aria-valuemax")
    await expect.poll(async () => (await visibleBox(panel)).width).toBe(Number(expectedWidth))
    const item = panel.getByRole("listitem", { name: `${scenario.position}번째 일괄 복사 항목`, exact: true })
    const trigger = item.getByRole("button", { name: /번째 일괄 복사 항목 동작$/u })
    await trigger.scrollIntoViewIfNeeded()
    const label = await trigger.getAttribute("aria-label")
    const popover = page.getByRole("menu", { name: label! })
    const triggerBounds = await visibleBox(trigger)
    const framesPromise = page.evaluate((menuLabel) => new Promise<{
      right: number
      top: number
      bottom: number
      width: number
    }[]>((resolve) => {
      const frames: { right: number; top: number; bottom: number; width: number }[] = []
      function observe() {
        const menu = Array.from(document.querySelectorAll('[role="menu"]')).find(
          (element) => element.getAttribute("aria-label") === menuLabel,
        )
        const element = menu?.closest('[data-trigger="MenuTrigger"]')
        if (!element) return
        const bounds = element.getBoundingClientRect()
        frames.push({ right: bounds.right, top: bounds.top, bottom: bounds.bottom, width: bounds.width })
        if (frames.length === 3) resolve(frames)
        else requestAnimationFrame(observe)
      }
      const observer = new MutationObserver(() => {
        const menu = Array.from(document.querySelectorAll('[role="menu"]')).find(
          (element) => element.getAttribute("aria-label") === menuLabel,
        )
        if (!menu) return
        observer.disconnect()
        requestAnimationFrame(observe)
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }), label)
    await trigger.click()
    const frames = await framesPromise

    for (const frame of frames) {
      const gaps = {
        below: frame.top - (triggerBounds.y + triggerBounds.height),
        above: triggerBounds.y - frame.bottom,
      }
      const clearance = gaps[scenario.side]
      expect(frame.width).toBeGreaterThan(0)
      expect(frame.right).toBeCloseTo(triggerBounds.x + triggerBounds.width, 0)
      expect(clearance).toBeGreaterThanOrEqual(0)
      expect(clearance).toBeLessThan(triggerBounds.height)
      expect(frame.top).toBeCloseTo(frames[0].top, 1)
    }
    await expect(popover).toBeInViewport({ ratio: 1 })
    await page.screenshot({ path: testInfo.outputPath(`popover-${scenario.key}-${scenario.position}.png`) })
    await page.keyboard.press("Escape")
    await expect(popover).toBeHidden()
    await expect(trigger).toBeFocused()
  }
})

test("오른쪽 패널에서 선택, 방향키, drag와 직접 제거를 구분한다", async ({
  page,
}) => {
  const { firstContent, panel, secondContent } =
    await createDesktopBatchCopy(page)
  const items = panel.getByRole("listitem")
  const firstItem = items.filter({ hasText: firstContent })
  const secondItem = items.filter({ hasText: secondContent })
  const firstSelection = firstItem.getByRole("button", {
    name: `일괄 복사 항목 선택: ${firstContent}`,
  })
  const firstHandle = firstItem.getByRole("button", {
    name: /번째 일괄 복사 항목 이동$/u,
  })

  await firstSelection.click()
  await expect(firstSelection).toHaveAttribute("aria-pressed", "true")
  await firstSelection.press("Shift+Escape")
  await expect(firstSelection).toHaveAttribute("aria-pressed", "true")
  await page.evaluate(() => {
    window.addEventListener("keydown", (event) => event.preventDefault(), {
      capture: true,
      once: true,
    })
  })
  await firstSelection.press("Escape")
  await expect(firstSelection).toHaveAttribute("aria-pressed", "true")
  await firstHandle.press("ArrowDown")
  await expect(items).toContainText([secondContent, firstContent])
  await expect(firstHandle).toBeFocused()
  await firstHandle.press("ArrowUp")
  await expect(items).toContainText([firstContent, secondContent])
  await firstSelection.press("Escape")
  await expect(firstSelection).toHaveAttribute("aria-pressed", "false")

  const secondBox = await visibleBox(secondItem)

  await preparePointerCaptureRelease(page)
  await firstHandle.hover()
  await page.mouse.down()
  await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height - 2)
  const preview = page.getByRole("paragraph", { includeHidden: true }).filter({ hasText: firstContent })
  await expect(preview).toBeVisible()
  const previewBox = await visibleBox(preview)
  const originalBox = await visibleBox(firstItem)
  expect(previewBox.y).toBeGreaterThan(originalBox.y)
  await expect(items).toContainText([firstContent, secondContent])
  await releasePointerCapture(page)
  await page.mouse.up()
  await expect(preview).toHaveCount(0)
  await expect(items).toContainText([firstContent, secondContent])
  await expect(firstSelection).toHaveAttribute("aria-pressed", "false")
  await expect(firstHandle).toBeFocused()

  await firstHandle.hover()
  await page.mouse.down()
  await page.mouse.move(
    secondBox.x + secondBox.width / 2,
    secondBox.y + secondBox.height - 2,
  )
  await page.mouse.up()

  await expect(items).toContainText([secondContent, firstContent])
  await expect(firstSelection).toHaveAttribute("aria-pressed", "true")
  await expect(panel.getByRole("button", { name: "위로" })).toHaveCount(0)
  await expect(panel.getByRole("button", { name: "아래로" })).toHaveCount(0)
  await expect(panel.getByRole("button", { name: "실행 취소" })).toHaveCount(0)
  await expect(panel.getByRole("button", { name: "다시 실행" })).toHaveCount(0)
  await expect(panel.getByRole("region", { name: "합친 텍스트" })).toHaveCount(0)
  await expect(
    panel.getByRole("button", { name: /번째 일괄 복사 항목 동작$/u }),
  ).toHaveCount(2)

  const panelBox = await visibleBox(panel)
  await firstHandle.hover()
  await page.mouse.down()
  await page.mouse.move(panelBox.x + panelBox.width / 2, panelBox.y + 10)
  await page.mouse.up()
  await expect(items).toHaveCount(2)
  await expect(items).toContainText([secondContent, firstContent])

  await firstItem.getByRole("button", {
    name: /번째 일괄 복사 항목 동작$/u,
  }).click()
  await page.getByRole("menuitem", { exact: true, name: "삭제" }).click()
  await expect(firstItem).toHaveCount(0)
  await expect(
    panel.getByRole("button", { exact: true, name: "복사" }),
  ).toBeEnabled()
  await page.keyboard.press("ControlOrMeta+z")
  await expect(firstItem).toBeVisible()
  await expect(firstSelection).toHaveAttribute("aria-pressed", "false")

  await firstHandle.hover()
  await page.mouse.down()
  await page.mouse.move(panelBox.x - 12, panelBox.y + panelBox.height / 2)
  await page.mouse.up()
  await expect(firstItem).toHaveCount(0)
  await expect(
    panel.getByRole("button", { exact: true, name: "복사" }),
  ).toBeEnabled()
  await secondItem.getByRole("button", {
    name: `일괄 복사 항목 선택: ${secondContent}`,
  }).press("ControlOrMeta+z")
  await expect(firstItem).toBeVisible()
  await expect(firstSelection).toHaveAttribute("aria-pressed", "false")
  await firstSelection.click()
  await expect(firstSelection).toHaveAttribute("aria-pressed", "true")
  await page.keyboard.press("ControlOrMeta+Shift+z")
  await expect(firstItem).toHaveCount(0)
  await expect(
    panel.getByRole("button", { exact: true, name: "복사" }),
  ).toBeEnabled()
  await secondItem.getByRole("button", {
    name: `일괄 복사 항목 선택: ${secondContent}`,
  }).press("ControlOrMeta+z")
  await expect(firstItem).toBeVisible()
  await expect(firstSelection).toHaveAttribute("aria-pressed", "false")

  await page.setViewportSize({ height: 720, width: 1000 })
  const dialog = page.getByRole("dialog", { name: "일괄 복사" })
  await expect(dialog).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  const batchCopyTrigger = page.getByRole("button", { name: "일괄 복사 2개" })
  await expect(batchCopyTrigger).toBeFocused()
  await batchCopyTrigger.press("Enter")
  await expect(dialog).toBeVisible()
  const modalSelection = dialog.getByRole("button", {
    name: `일괄 복사 항목 선택: ${secondContent}`,
  })
  await modalSelection.click()
  await modalSelection.press("Escape")
  await expect(modalSelection).toHaveAttribute("aria-pressed", "false")
  await expect(dialog).toBeVisible()
  await modalSelection.press("Escape")
  await expect(dialog).toHaveCount(0)

  await expect(batchCopyTrigger).toBeFocused()
  await batchCopyTrigger.press("Enter")
  const firstModalSelection = dialog.getByRole("button", {
    name: `일괄 복사 항목 선택: ${firstContent}`,
  })
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await expect(firstModalSelection).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)
    await expect(batchCopyTrigger).toBeFocused()
    await batchCopyTrigger.press("Enter")
  }
  const modalHandle = dialog.getByRole("listitem").filter({ hasText: firstContent })
    .getByRole("button", { name: /번째 일괄 복사 항목 이동$/u })
  const modalHandleBox = await visibleBox(modalHandle)
  await modalHandle.hover()
  await page.mouse.down()
  await page.mouse.move(modalHandleBox.x + modalHandleBox.width, modalHandleBox.y + modalHandleBox.height)
  const modalPreview = dialog.getByRole("paragraph", { includeHidden: true })
    .filter({ hasText: firstContent })
  await expect(modalPreview).toBeVisible()
  await expect(modalPreview).toBeInViewport()
  await page.mouse.up()
  await expect(modalPreview).toHaveCount(0)
  await firstModalSelection.click()
  await expect(firstModalSelection).toHaveAttribute("aria-pressed", "true")
  await dialog
    .getByRole("button", { name: "일괄 복사 패널 닫기" })
    .click()
  await expect(dialog).toHaveCount(0)

  await page.setViewportSize({ height: 720, width: 320 })
  await page.getByRole("button", { name: "탐색 열기" }).click()
  const managementLink = page.getByRole("link", { name: "일괄 복사 2개 관리" })
  await expect(managementLink).toBeVisible()
  await managementLink.click()
  await expect(page).toHaveURL("/batch-copy/")
  const management = page.getByRole("region", {
    name: "일괄 복사 항목 관리",
  })
  const managementItems = management.getByRole("listitem")
  await expect(managementItems).toContainText([secondContent, firstContent])
  for (const width of [320, 640, 900, 1280]) {
    await page.setViewportSize({ height: 720, width })
    await expect(page.getByRole("heading", { name: "일괄 복사" })).toBeVisible()
    await expect(managementItems).toContainText([secondContent, firstContent])
    await expect(page.getByRole("link", { exact: true, name: "취소" })).toBeVisible()
    await expect(page.getByRole("button", { exact: true, name: "복사" })).toBeVisible()
  }
  await page.setViewportSize({ height: 720, width: 320 })
  await managementItems
    .filter({ hasText: firstContent })
    .getByRole("button", { name: /번째 일괄 복사 항목 이동$/u })
    .press("ArrowUp")
  await expect(managementItems).toContainText([firstContent, secondContent])

  await managementItems
    .filter({ hasText: firstContent })
    .getByRole("button", { name: /번째 일괄 복사 항목 동작$/u })
    .click()
  const managementSheet = page.getByRole("dialog", {
    name: /번째 일괄 복사 항목$/u,
  })
  await expect(managementSheet).toBeVisible()
  await managementSheet.getByRole("button", { exact: true, name: "삭제" }).click()
  await expect(managementSheet).toBeHidden()
  await page.getByRole("link", { exact: true, name: "취소" }).click()
  await page.setViewportSize({ height: 720, width: 1000 })
  const remainingBatchCopyTrigger = page.getByRole("button", {
    name: "일괄 복사 1개",
  })
  await remainingBatchCopyTrigger.focus()
  await remainingBatchCopyTrigger.press("Enter")
  await expect(dialog).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)

  await page.keyboard.press("ControlOrMeta+z")
  await expect(page.getByRole("button", { name: "일괄 복사 2개" })).toBeVisible()
  await page.setViewportSize({ height: 720, width: 320 })
  await page.getByRole("button", { name: "탐색 열기" }).click()
  await page.getByRole("link", { name: "일괄 복사 2개 관리" }).click()
  await expect(managementItems).toContainText([firstContent, secondContent])
  await page.reload()
  await expect(managementItems).toContainText([firstContent, secondContent])
})

test("이동 카드는 포인터를 연속 추적하고 삽입선은 항목 사이 중앙에 표시된다", async ({ page }, testInfo) => {
  const { firstContent, panel, secondContent } = await createDesktopBatchCopy(page)
  const items = panel.getByRole("listitem")
  await panel.getByRole("listitem", { name: "2번째 일괄 복사 항목", exact: true }).getByRole("button", { name: / 항목 동작$/u }).click()
  await page.getByRole("menuitem", { name: "복제", exact: true }).click()
  await expect(items).toHaveCount(3)
  const handle = panel.getByRole("listitem", { name: "1번째 일괄 복사 항목", exact: true }).getByRole("button", { name: / 항목 이동$/u })
  const middle = await visibleBox(panel.getByRole("listitem", { name: "2번째 일괄 복사 항목", exact: true }))
  const last = await visibleBox(panel.getByRole("listitem", { name: "3번째 일괄 복사 항목", exact: true }))
  const preview = page.getByRole("paragraph", { includeHidden: true }).filter({ hasText: firstContent })
  const x = middle.x + middle.width / 2
  await handle.hover()
  await page.mouse.down()
  const positions: { pointer: number; preview: number }[] = []
  for (const fraction of [0.2, 0.35, 0.5, 0.65, 0.8, 0.65]) {
    const y = Math.round(middle.y + middle.height * fraction)
    await page.mouse.move(x, y)
    const box = await visibleBox(preview)
    positions.push({ pointer: y, preview: box.y })
  }
  for (const [index, position] of positions.slice(1).entries()) {
    const previous = positions[index]
    expect(position.preview - previous.preview).toBeCloseTo(position.pointer - previous.pointer, 0)
  }
  const line = await panel.evaluate((element) => {
    const indicator = element.querySelector(".notes-drop-indicator")!
    const bounds = indicator.getBoundingClientRect()
    const endpoint = getComputedStyle(indicator, "::before")
    return { y: bounds.y, height: bounds.height, dotWidth: Number.parseFloat(endpoint.width), dotHeight: Number.parseFloat(endpoint.height), dotLeft: Number.parseFloat(endpoint.left) }
  })
  expect(line.y + line.height / 2).toBeCloseTo((middle.y + middle.height + last.y) / 2, 1)
  expect(line.dotWidth).toBeGreaterThan(line.height)
  expect(line.dotHeight).toBe(line.dotWidth)
  expect(line.dotLeft).toBeLessThan(0)
  await page.screenshot({ path: testInfo.outputPath("desktop-drag.png") })
  await page.keyboard.press("Escape")
  await page.mouse.up()
  expect(await panel.evaluate((element) => element.querySelector(".notes-drop-indicator") === null)).toBe(true)
  await expect(preview).toHaveCount(0)
  await expect(items).toContainText([firstContent, secondContent, secondContent])
})

test("긴 메모를 잡고 목록 끝까지 자동 스크롤한 뒤 원문과 이동 순서를 저장한다", async ({ page }, testInfo) => {
  const longContent = "검토할 내용\n" + "진행 일정과 전달 자료를 확인합니다.\n".repeat(40)
  const shortContent = "검토 완료"
  const first = await createNoteThroughUi(page, longContent)
  const second = await createNoteThroughUi(page, shortContent)
  await first.getByRole("textbox", { name: "메모 내용" }).click({ modifiers: ["Meta", "Alt"] })
  await second.getByRole("textbox", { name: "메모 내용" }).click({ modifiers: ["Meta", "Alt"] })
  const panel = page.getByRole("complementary", { name: "일괄 복사" })
  const items = panel.getByRole("listitem")
  const longItem = items.filter({ hasText: longContent })
  const shortItem = items.filter({ hasText: shortContent })
  const handle = longItem.getByRole("button", { name: /번째 일괄 복사 항목 이동$/u })
  await expect(items).toHaveCount(2)
  const original = await visibleBox(longItem)
  const viewportHeight = await page.evaluate(() => window.innerHeight)
  expect(original.height).toBeGreaterThan(viewportHeight)
  const scrollBounds = await panel.getByRole("list").evaluate((list) => {
    let parent = list.parentElement
    while (parent !== null) {
      if (getComputedStyle(parent).overflowY === "auto") {
        const bounds = parent.getBoundingClientRect()
        return { left: bounds.left, top: bounds.top, bottom: bounds.bottom }
      }
      parent = parent.parentElement
    }
    throw new Error("The list has no scrolling area")
  })
  await handle.hover()
  await page.mouse.down()
  const intervalsPromise = page.evaluate(() => new Promise<number[]>((resolve) => {
    const intervals: number[] = []
    let previous = performance.now()
    let frame = 0
    function observe(now: number) {
      intervals.push(now - previous)
      previous = now
      frame = requestAnimationFrame(observe)
    }
    frame = requestAnimationFrame(observe)
    window.addEventListener("pointerup", () => {
      cancelAnimationFrame(frame)
      resolve(intervals)
    }, { once: true })
  }))
  await page.mouse.move(scrollBounds.left + 32, scrollBounds.bottom - 2)
  await expect.poll(async () => {
    const bounds = await shortItem.boundingBox()
    return bounds === null ? Infinity : bounds.y + bounds.height
  }, { timeout: 15_000 }).toBeLessThan(scrollBounds.bottom)
  const destination = await visibleBox(shortItem)
  await page.mouse.move(destination.x + 32, destination.y + destination.height - 2)
  const endLine = await shortItem.evaluate((item) => {
    const line = item.querySelector(".notes-drop-indicator")!
    const bounds = line.getBoundingClientRect()
    const dot = getComputedStyle(line, "::before")
    const radius = Number.parseFloat(dot.height) / 2
    return { center: bounds.y + bounds.height / 2, radius }
  })
  expect(endLine.center - endLine.radius).toBeGreaterThan(destination.y + destination.height)
  expect(endLine.center + endLine.radius).toBeLessThan(scrollBounds.bottom)
  await page.screenshot({ path: testInfo.outputPath("long-drag-destination.png") })
  await page.mouse.up()
  const intervals = await intervalsPromise
  await testInfo.attach("auto-scroll-frame-intervals", {
    body: JSON.stringify({ unit: "ms", itemCount: 2, contentLines: longContent.split("\n").length, intervals }),
    contentType: "application/json",
  })
  await expect(items).toContainText([shortContent, longContent])
  await expect(handle).toBeFocused()
  await shortItem.scrollIntoViewIfNeeded()
  const firstBounds = await visibleBox(shortItem)
  await handle.hover()
  await page.mouse.down()
  await page.mouse.move(firstBounds.x + 32, firstBounds.y + 2)
  const startLine = await shortItem.evaluate((item) => {
    const line = item.querySelector(".notes-drop-indicator")!
    const bounds = line.getBoundingClientRect()
    const dot = getComputedStyle(line, "::before")
    return { center: bounds.y + bounds.height / 2, radius: Number.parseFloat(dot.height) / 2 }
  })
  expect(startLine.center + startLine.radius).toBeLessThan(firstBounds.y)
  expect(startLine.center - startLine.radius).toBeGreaterThan(scrollBounds.top)
  await page.screenshot({ path: testInfo.outputPath("first-drop-destination.png") })
  await page.keyboard.press("Escape")
  await page.mouse.up()
  await expect(items).toContainText([shortContent, longContent])
  await page.goto("/batch-copy/")
  await page.reload()
  const savedItems = page.getByRole("region", { name: "일괄 복사 항목 관리" }).getByRole("listitem")
  await expect(savedItems).toContainText([shortContent, longContent])
  const savedContent = savedItems.filter({ hasText: longContent }).getByRole("paragraph")
  await expect.poll(() => savedContent.textContent()).toBe(longContent)
})

test.describe("320px 일괄 복사", () => {
  test.use({ hasTouch: true, viewport: { height: 720, width: 320 } })

  async function openCurrent(page: Page, count: number) {
    await page.getByRole("link", { name: `일괄 복사 확인, ${count}개` }).click()
    await expect(page).toHaveURL("/batch-copy/?view=current")
    await expect(page.getByRole("heading", { name: "일괄 복사 확인" })).toBeVisible()
  }

  test("메인과 확인 목록의 핸들은 클릭 테두리를 남기지 않고 키보드 포커스를 표시한다", async ({ page }) => {
    const content = `포커스 확인 ${crypto.randomUUID()}`
    const note = await createMobileNoteThroughUi(page, content)

    async function inspectFocus(handle: Locator) {
      await handle.click()
      await expect(handle).toHaveCSS("outline-style", "none")
      await handle.press("ArrowDown")
      await expect(handle).toBeFocused()
      await expect(handle).toHaveCSS("outline-style", "solid")
      await handle.click()
      await expect(handle).toHaveCSS("outline-style", "none")
    }

    await inspectFocus(note.getByRole("button", { name: `${content} 이동` }))
    await addMobileNoteToBatch(page, note)
    await openCurrent(page, 1)
    await inspectFocus(page.getByRole("button", { name: "1번째 일괄 복사 항목 이동" }))
    await expect(page.getByRole("article")).toHaveText(content)
    await page.getByRole("button", { exact: true, name: "취소" }).click()
    await expect(note).toBeVisible()
  })

  test("새 메모는 흰색 아이콘과 그림자가 있는 붉은 원형이고 더보기에는 그림자가 없다", async ({ page }) => {
    const content = `아이콘 모양을 확인할 메모 ${crypto.randomUUID()}`
    const note = await createMobileNoteThroughUi(page, content)
    const createStyle = await page.getByRole("button", { name: "새 메모" }).evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      const icon = element.querySelector("svg")
      if (icon === null) throw new Error("New note icon is missing")
      const channels = style.backgroundColor.match(/[\d.]+/gu)
      if (channels === null) throw new Error("New note background has no color channels")
      const [red, green, blue] = channels.map(Number)
      return { blue, green, height: bounds.height, icon: getComputedStyle(icon).color, radius: Number.parseFloat(style.borderTopLeftRadius), red, shadow: style.boxShadow, width: bounds.width }
    })
    const moreShadow = await note.getByRole("button", { name: `${content} 더보기` }).evaluate((element) => getComputedStyle(element).boxShadow)
    expect(createStyle.width).toBeCloseTo(createStyle.height, 0)
    expect(createStyle.radius).toBeGreaterThanOrEqual(createStyle.width / 2)
    expect(createStyle.red).toBeGreaterThan(createStyle.green)
    expect(createStyle.red).toBeGreaterThan(createStyle.blue)
    expect(createStyle.icon).toBe("rgb(255, 255, 255)")
    expect(createStyle.shadow).not.toBe("none")
    expect(moreShadow).toBe("none")
  })

  test("긴 확인 및 저장 목록을 스크롤해도 하단 복사와 취소에 접근한다", async ({ page }) => {
    const contents = fc.sample(fc.uniqueArray(fc.stringMatching(/^[a-z]{64,72}$/u), { minLength: 5, maxLength: 5 }), 1)[0]
    await page.setViewportSize({ height: 720, width: 1000 })
    for (const content of contents) {
      const note = await createNoteThroughUi(page, content)
      await note.getByRole("textbox", { name: "메모 내용" }).click({ modifiers: ["Meta", "Alt"] })
    }
    await expect(page.getByRole("button", { exact: true, name: `일괄 복사 ${contents.length}개` })).toBeVisible()
    await page.setViewportSize({ height: 720, width: 320 })
    await page.goto("/batch-copy/")
    const managed = page.getByRole("region", { name: "일괄 복사 항목 관리" }).getByRole("listitem")
    await expect(managed).toHaveCount(contents.length)
    const managedCopy = page.getByRole("button", { exact: true, name: "복사" })
    const before = await visibleBox(managedCopy)
    await managed.filter({ hasText: contents.at(-1)! }).scrollIntoViewIfNeeded()
    expect((await visibleBox(managedCopy)).y).toBeCloseTo(before.y, 0)
    await managedCopy.click()
    await expect(page.getByRole("button", { name: "알림 닫기" })).toBeVisible()
    await page.goto("/")
    await expect(page.getByRole("link", { name: "일괄 복사 확인, 0개" })).toBeDisabled()
    for (const content of contents) await addMobileNoteToBatch(page, page.getByRole("article").filter({ hasText: content }))
    await openCurrent(page, contents.length)
    const entries = page.getByRole("article", { name: /번째 일괄 복사 항목$/u })
    await expect(entries).toHaveCount(contents.length)
    const cancel = page.getByRole("button", { exact: true, name: "취소" })
    const copy = page.getByRole("button", { name: "일괄 복사하기" })
    const cancelBefore = await visibleBox(cancel)
    const copyBefore = await visibleBox(copy)
    await entries.filter({ hasText: contents.at(-1)! }).scrollIntoViewIfNeeded()
    expect((await visibleBox(cancel)).y).toBeCloseTo(cancelBefore.y, 0)
    expect((await visibleBox(copy)).y).toBeCloseTo(copyBefore.y, 0)
    await copy.click()
    await expect(page.getByRole("button", { name: "알림 닫기" })).toBeVisible()
    await cancel.click()
    await expect(page).toHaveURL("/")
    await page.goto("/batch-copy/")
    await expect(managed).toHaveCount(contents.length)
  })

  test("실제 항목 수를 반영하고 복제, 이동, 삭제와 취소 후 메인 복귀를 유지한다", async ({ page }) => {
    await setReorderButtons(page, true)
    await page.goto("/")
    const firstContent = "모바일 첫 번째 메모"
    const secondContent = "모바일 두 번째 메모"
    const firstNote = await createMobileNoteThroughUi(page, firstContent)
    const secondNote = await createMobileNoteThroughUi(page, secondContent)
    await addMobileNoteToBatch(page, firstNote)
    await addMobileNoteToBatch(page, firstNote)
    await addMobileNoteToBatch(page, secondNote)
    await openCurrent(page, 3)
    const entries = page.getByRole("article", { name: /번째 일괄 복사 항목$/u })
    await expect(entries).toContainText([firstContent, firstContent, secondContent])
    await page.getByRole("button", { name: "1번째 일괄 복사 항목 동작" }).click()
    const sheet = page.getByRole("dialog", { name: /번째 일괄 복사 항목$/u })
    await sheet.getByRole("button", { exact: true, name: "복제" }).click()
    await expect(sheet).toBeHidden()
    await expect(entries).toContainText([firstContent, firstContent, firstContent, secondContent])
    await page.getByRole("button", { name: "메모 목록으로 돌아가기" }).click()
    await expect(page.getByRole("link", { name: "일괄 복사 확인, 4개" })).toHaveText("4")
    await openCurrent(page, 4)
    await page.getByRole("button", { name: "2번째 일괄 복사 항목 동작" }).click()
    await sheet.getByRole("button", { exact: true, name: "삭제" }).click()
    await expect(sheet).toBeHidden()
    await expect(entries).toContainText([firstContent, firstContent, secondContent])
    await page.getByRole("button", { name: "3번째 일괄 복사 항목 동작" }).click()
    await sheet.getByRole("button", { exact: true, name: "위로 이동" }).click()
    await entries.filter({ hasText: secondContent }).getByRole("button", { name: / 항목 동작$/u }).click()
    await sheet.getByRole("button", { exact: true, name: "위로 이동" }).click()
    await expect(entries).toContainText([secondContent, firstContent, firstContent])
    const movedAction = page.getByRole("button", { name: "1번째 일괄 복사 항목 동작" })
    await movedAction.click()
    await page.keyboard.press("Escape")
    await expect(movedAction).toBeFocused()
    await movedAction.click()
    const heading = await visibleBox(page.getByRole("heading", { name: "일괄 복사 확인" }))
    await page.mouse.click(heading.x + heading.width / 2, heading.y + heading.height / 2)
    await expect(movedAction).toBeFocused()
    await movedAction.click()
    await sheet.getByRole("button", { name: "동작 선택창 닫기" }).click()
    await expect(movedAction).toBeFocused()
    await page.getByRole("button", { name: "메모 목록으로 돌아가기" }).click()
    await expect(page.getByRole("link", { name: "일괄 복사 확인, 3개" })).toHaveText("3")
    await openCurrent(page, 3)
    await expect(page.getByRole("button", { exact: true, name: "초기화" })).toHaveCount(0)
    await page.getByRole("button", { exact: true, name: "취소" }).click()
    await expect(page).toHaveURL("/")
    await expect(firstNote).toBeVisible()
    await expect(secondNote).toBeVisible()
    const empty = page.getByRole("link", { name: "일괄 복사 확인, 0개" })
    await expect(empty).toBeDisabled()
    await expect(empty).toHaveText("")
    const box = await visibleBox(empty)
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await expect(page).toHaveURL("/")
    await page.getByRole("button", { name: "탐색 열기" }).focus()
    await page.keyboard.press("Tab")
    await expect(empty).not.toBeFocused()
    await addMobileNoteToBatch(page, firstNote)
    await expect(page.getByRole("link", { name: "일괄 복사 확인, 1개" })).toHaveText("1")
    for (let count = 1; count < 10; count += 1) await addMobileNoteToBatch(page, firstNote)
    const ten = page.getByRole("link", { name: "일괄 복사 확인, 10개" })
    await expect(ten).toHaveText("10")
    await expect(ten).toBeInViewport()
    await openCurrent(page, 10)
    await expect(entries).toHaveCount(10)
    await page.getByRole("button", { name: "메모 목록으로 돌아가기" }).click()
    await expect(page.getByRole("button", { name: "새 메모" })).toBeVisible()
  })

  test("직접 이동 설정이 없어도 항목 시트의 복제와 삭제 및 포커스를 유지한다", async ({ page }) => {
    const firstContent = `시트 첫 메모 ${crypto.randomUUID()}`
    const secondContent = `시트 둘째 메모 ${crypto.randomUUID()}`
    await addMobileNoteToBatch(page, await createMobileNoteThroughUi(page, firstContent))
    await addMobileNoteToBatch(page, await createMobileNoteThroughUi(page, secondContent))
    await openCurrent(page, 2)
    const action = page.getByRole("button", { name: "1번째 일괄 복사 항목 동작" })
    await action.click()
    const sheet = page.getByRole("dialog", { name: "1번째 일괄 복사 항목" })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole("button", { name: "위로 이동" })).toHaveCount(0)
    await expect(sheet.getByRole("button", { name: "아래로 이동" })).toHaveCount(0)
    await expect(sheet.getByRole("button", { name: "복제" })).toBeVisible()
    await expect(sheet.getByRole("button", { name: "삭제" })).toBeVisible()
    await sheet.getByRole("button", { name: "동작 선택창 닫기" }).click()
    await expect(action).toBeFocused()
    await action.click()
    await page.keyboard.press("Escape")
    await expect(action).toBeFocused()
    await expect(page.getByRole("article", { name: /번째 일괄 복사 항목$/u })).toContainText([firstContent, secondContent])
  })

  test("현재 작업은 내부 이동에서 유지하고 새로고침과 명시적 취소에서 비운다", async ({ page }) => {
    const content = `실행 중 원문 ${crypto.randomUUID()}`
    const secondContent = `실행 중 다른 원문 ${crypto.randomUUID()}`
    const note = await createMobileNoteThroughUi(page, content)
    const second = await createMobileNoteThroughUi(page, secondContent)
    await addMobileNoteToBatch(page, note)
    await addMobileNoteToBatch(page, note)
    await addMobileNoteToBatch(page, second)
    await openCurrent(page, 3)
    const entries = page.getByRole("article", { name: /번째 일괄 복사 항목$/u })
    await expect(entries).toContainText([content, content, secondContent])
    await page.goBack()
    await expect(page).toHaveURL("/")
    await expect(page.getByRole("link", { name: "일괄 복사 확인, 3개" })).toBeEnabled()
    await openCurrent(page, 3)
    await expect(entries).toContainText([content, content, secondContent])
    await page.reload()
    await expect(page.getByRole("region", { name: "일괄 복사 항목 관리" })).toBeVisible()
    await expect(entries).toHaveCount(0)
    await page.goto("/")
    await expect(page.getByRole("link", { name: "일괄 복사 확인, 0개" })).toBeDisabled()
    await addMobileNoteToBatch(page, note)
    await openCurrent(page, 1)
    await page.getByRole("button", { exact: true, name: "취소" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByRole("link", { name: "일괄 복사 확인, 0개" })).toBeDisabled()
    await page.reload()
    await expect(page.getByRole("link", { name: "일괄 복사 확인, 0개" })).toBeDisabled()
    await expect(note).toBeVisible()
    await expect(second).toBeVisible()
  })
})

for (const { width, role } of [{ width: 1280, role: "complementary" }, { width: 1000, role: "dialog" }] as const) {
  test(`standard action menu preserves commands and outside navigation at ${width}px`, async ({ page }) => {
    const { firstContent, secondContent } = await createDesktopBatchCopy(page)
    await page.setViewportSize({ width, height: 800 })
    const panel = page.getByRole(role, { name: "일괄 복사", exact: true })
    await expect(panel).toBeVisible()
    const trigger = panel.getByRole("button", { name: "1번째 일괄 복사 항목 동작" })
    const menu = page.getByRole("menu", { name: "1번째 일괄 복사 항목 동작" })
    await trigger.press("Enter")
    await expect(menu.getByRole("menuitem", { name: "복제", exact: true })).toBeFocused()
    await page.keyboard.press("ArrowDown")
    await expect(menu.getByRole("menuitem", { name: "아래로 이동", exact: true })).toBeFocused()
    await expect(panel.getByRole("listitem")).toHaveText([firstContent, secondContent])
    await page.keyboard.press("Escape")
    await expect(menu).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(panel).toBeVisible()

    await trigger.press("Space")
    await page.keyboard.press("Tab")
    await expect(menu).toBeHidden()
    await expect(panel.getByRole("button", { name: `일괄 복사 항목 선택: ${firstContent}`, exact: true })).toBeFocused()

    await trigger.press("Enter")
    await page.keyboard.press("Shift+Tab")
    await expect(menu).toBeHidden()
    await expect(panel.getByRole("button", { name: "1번째 일괄 복사 항목 이동", exact: true })).toBeFocused()

    await trigger.press("Enter")
    await menu.getByRole("menuitem", { name: "아래로 이동", exact: true }).click()
    await expect(menu).toBeHidden()
    await expect(panel.getByRole("listitem")).toHaveText([secondContent, firstContent])
    await expect(panel.getByRole("button", { name: "2번째 일괄 복사 항목 동작" })).toBeFocused()
    await trigger.click()
    await panel.getByRole("button", { name: "일괄 복사 패널 닫기" }).click()
    await expect(panel).toBeHidden()
  })
}

test("이동 저장 중 시작한 메모 입력은 저장 완료 후에도 포커스를 유지한다", async ({ page }) => {
  const { firstContent, panel, secondContent } = await createDesktopBatchCopy(page)
  const note = await createNoteThroughUi(page, "이동 저장 중 편집할 메모")
  const editor = note.getByRole("textbox", { name: "메모 내용" })
  const write = await delayNextWriteCompletion(page, "batchCopyLists")
  await panel.getByRole("button", { name: "1번째 일괄 복사 항목 동작" }).click()
  await page.getByRole("menu").getByRole("menuitem", { name: "아래로 이동", exact: true }).click()
  await write.waitUntilCommitted()
  await expect(panel.getByRole("button", { name: "2번째 일괄 복사 항목 동작" })).toBeDisabled()
  await editor.click()
  await editor.fill("저장 중 입력")
  await expect(editor).toBeFocused()
  await write.release()
  await expect(panel.getByRole("button", { name: "2번째 일괄 복사 항목 동작" })).toBeEnabled()
  await expect(panel.getByRole("listitem")).toHaveText([secondContent, firstContent])
  await expect(editor).toBeFocused()
  await page.keyboard.type(" 계속")
  await expect(editor).toHaveValue("저장 중 입력 계속")
})
