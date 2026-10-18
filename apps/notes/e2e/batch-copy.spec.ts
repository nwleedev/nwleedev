import { expect, test, type Locator, type Page } from "@playwright/test"
import * as fc from "fast-check"

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
  "일괄 복사 항목에 위로 이동과 아래로 이동 표시"

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

test("직접 이동 설정을 저장하고 현재 항목에서 가능한 방향만 제공한다", async ({
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
    page.getByRole("group", { name: /번째 일괄 복사 항목 동작$/u }),
  ).toBeInViewport()
  await expect(
    page.getByRole("button", { exact: true, name: "위로 이동" }),
  ).toHaveCount(0)
  await page
    .getByRole("button", { exact: true, name: "아래로 이동" })
    .click()
  await expect(items).toContainText(movedDownContents)
  await expect(
    firstItem.getByRole("button", { name: /번째 일괄 복사 항목 이동$/u }),
  ).toBeFocused()

  await firstItem
    .getByRole("button", { name: /번째 일괄 복사 항목 동작$/u })
    .click()
  await expect(
    page.getByRole("button", { exact: true, name: "위로 이동" }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { exact: true, name: "아래로 이동" }),
  ).toBeVisible()
  await page
    .getByRole("button", { exact: true, name: "위로 이동" })
    .click()
  await expect(items).toContainText(contents)

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
    page.getByRole("button", { exact: true, name: "위로 이동" }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("button", { exact: true, name: "아래로 이동" }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("button", { exact: true, name: "복제" }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { exact: true, name: "삭제" }),
  ).toBeVisible()
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
  await releasePointerCapture(page)
  await page.mouse.up()
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
  await page.getByRole("button", { exact: true, name: "삭제" }).click()
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
  await batchCopyTrigger.focus()
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

  await batchCopyTrigger.focus()
  await batchCopyTrigger.press("Enter")
  const firstModalSelection = dialog.getByRole("button", {
    name: `일괄 복사 항목 선택: ${firstContent}`,
  })
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

  test("새 메모 동작은 원형이고 더보기에는 그림자가 없다", async ({ page }) => {
    const content = `아이콘 모양을 확인할 메모 ${crypto.randomUUID()}`
    const note = await createMobileNoteThroughUi(page, content)
    const createStyle = await page.getByRole("button", { name: "새 메모" }).evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return { background: style.backgroundColor, height: bounds.height, radius: Number.parseFloat(style.borderTopLeftRadius), width: bounds.width }
    })
    const noteBackground = await note.evaluate((element) => getComputedStyle(element).backgroundColor)
    const moreShadow = await note.getByRole("button", { name: `${content} 더보기` }).evaluate((element) => getComputedStyle(element).boxShadow)
    expect(createStyle.width).toBeCloseTo(createStyle.height, 0)
    expect(createStyle.radius).toBeGreaterThanOrEqual(createStyle.width / 2)
    expect(createStyle.background).not.toBe(noteBackground)
    expect(moreShadow).toBe("none")
  })

  test("긴 확인 및 저장 목록을 스크롤해도 하단 복사와 취소에 접근한다", async ({ page }) => {
    const contents = fc.sample(fc.uniqueArray(fc.stringMatching(/^[a-z]{64,72}$/u), { minLength: 5, maxLength: 5 }), 1)[0]
    await page.setViewportSize({ height: 720, width: 1000 })
    for (const content of contents) {
      const note = await createNoteThroughUi(page, content)
      await note.getByRole("textbox", { name: "메모 내용" }).click({ modifiers: ["Meta", "Alt"] })
    }
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
