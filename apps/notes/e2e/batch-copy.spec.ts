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

test("오른쪽 패널에서 항목을 끌어 순서를 바꾸고 제거 이력을 키보드로 복구한다", async ({
  page,
}) => {
  const { firstContent, panel, secondContent } =
    await createDesktopBatchCopy(page)
  const items = panel.getByRole("listitem")
  const firstItem = items.filter({ hasText: firstContent })
  const secondItem = items.filter({ hasText: secondContent })
  const firstHandle = firstItem.getByRole("button", {
    name: "1번째 일괄 복사 항목 순서 변경",
  })
  const secondBox = await visibleBox(secondItem)

  await firstHandle.hover()
  await page.mouse.down()
  await page.mouse.move(
    secondBox.x + secondBox.width / 2,
    secondBox.y + secondBox.height - 2,
  )
  await page.mouse.up()

  await expect(items).toContainText([secondContent, firstContent])
  await expect(panel.getByRole("button", { name: "위로" })).toHaveCount(0)
  await expect(panel.getByRole("button", { name: "아래로" })).toHaveCount(0)
  await expect(panel.getByRole("button", { name: "실행 취소" })).toHaveCount(0)
  await expect(panel.getByRole("button", { name: "다시 실행" })).toHaveCount(0)
  await expect(panel.getByRole("region", { name: "합친 텍스트" })).toHaveCount(0)

  await firstItem.hover()
  await firstItem.getByRole("button", { name: "일괄 복사 항목 동작" }).click()
  await firstItem.getByRole("button", { exact: true, name: "제거" }).click()
  await expect(firstItem).toHaveCount(0)
  await page.keyboard.press("ControlOrMeta+z")
  await expect(firstItem).toBeVisible()
  await page.keyboard.press("ControlOrMeta+Shift+z")
  await expect(firstItem).toHaveCount(0)

  await page.setViewportSize({ height: 720, width: 320 })
  const dialog = page.getByRole("dialog", { name: "일괄 복사" })
  await expect(dialog).toBeVisible()
  await dialog.getByRole("button", { name: "일괄 복사 패널 닫기" }).click()
  const managementLink = page.getByRole("link", { name: "일괄 복사 1개 관리" })
  await expect(managementLink).toBeVisible()
  await managementLink.click()
  await expect(page).toHaveURL("/batch-copy/")
  await expect(
    page.getByRole("region", { name: "일괄 복사 항목 관리" }),
  ).toContainText(secondContent)
})

test.describe("320px 일괄 복사", () => {
  test.use({ hasTouch: true, viewport: { height: 720, width: 320 } })

  test("선택 횟수를 초기화하고 확인 화면에서 복제, 이동과 삭제를 적용한다", async ({
    page,
  }) => {
    const firstContent = "모바일 첫 번째 메모"
    const secondContent = "모바일 두 번째 메모"
    const firstNote = await createMobileNoteThroughUi(page, firstContent)
    const secondNote = await createMobileNoteThroughUi(page, secondContent)

    await page.getByRole("button", { name: "일괄 복사 시작" }).click()
    const firstEntry = firstNote.getByRole("link", { name: "일괄 복사에 추가" })
    const secondEntry = secondNote.getByRole("link", { name: "일괄 복사에 추가" })
    await firstEntry.click()
    await expect(page.getByRole("button", { name: "다음, 1회 선택" })).toBeEnabled()
    await page.getByRole("button", { name: "초기화" }).click()
    await expect(page.getByRole("button", { name: "다음, 0회 선택" })).toBeDisabled()

    await firstEntry.click()
    await firstEntry.click()
    await secondEntry.click()
    const next = page.getByRole("button", { name: "다음, 3회 선택" })
    await expect(next).toBeEnabled()
    await next.click()
    await expect(page).toHaveURL("/batch-copy/")

    let entries = page.getByRole("article", {
      name: /번째 일괄 복사 항목$/u,
    })
    await expect(entries).toContainText([
      firstContent,
      firstContent,
      secondContent,
    ])

    const firstAction = page.getByRole("button", {
      name: "1번째 일괄 복사 항목 동작",
    })
    await firstAction.click()
    await page.getByRole("button", { exact: true, name: "복제" }).click()
    entries = page.getByRole("article", { name: /번째 일괄 복사 항목$/u })
    await expect(entries).toHaveCount(4)
    await expect(entries).toContainText([
      firstContent,
      firstContent,
      firstContent,
      secondContent,
    ])

    const duplicatedAction = page.getByRole("button", {
      name: "2번째 일괄 복사 항목 동작",
    })
    await duplicatedAction.click()
    await page.getByRole("button", { exact: true, name: "삭제" }).click()
    await expect(entries).toHaveCount(3)
    await expect(entries).toContainText([
      firstContent,
      firstContent,
      secondContent,
    ])

    const lastAction = page.getByRole("button", {
      name: "3번째 일괄 복사 항목 동작",
    })
    await lastAction.click()
    await page.getByRole("button", { exact: true, name: "위치 변경" }).click()
    await page.getByRole("button", { name: "1번째 삽입 위치" }).click()
    await expect(page.getByRole("button", { name: /삽입 위치$/u })).toHaveCount(0)
    await expect(entries).toContainText([
      secondContent,
      firstContent,
      firstContent,
    ])

    const movedAction = page.getByRole("button", {
      name: "1번째 일괄 복사 항목 동작",
    })
    await movedAction.click()
    await page.keyboard.press("Escape")
    await expect(movedAction).toBeFocused()
    await movedAction.click()
    await page.getByRole("heading", { name: "일괄 복사 확인" }).click()
    await expect(movedAction).toBeFocused()

    await page.getByRole("button", { exact: true, name: "취소" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByRole("article").filter({ hasText: firstContent })).toBeVisible()
    await expect(page.getByRole("article").filter({ hasText: secondContent })).toBeVisible()
  })

  test("확인 작업을 새로고침 뒤 복원하고 뒤로가기와 취소를 구분한다", async ({
    page,
  }) => {
    const content = "복원할 모바일 일괄 복사 메모"
    const note = await createMobileNoteThroughUi(page, content)

    await page.getByRole("button", { name: "일괄 복사 시작" }).click()
    const entry = note.getByRole("link", { name: "일괄 복사에 추가" })
    await entry.click()
    await entry.click()
    await page.getByRole("button", { name: "다음, 2회 선택" }).click()
    await expect(page).toHaveURL("/batch-copy/")
    await page.reload()

    let confirmationEntries = page.getByRole("article", {
      name: /번째 일괄 복사 항목$/u,
    })
    await expect(confirmationEntries).toHaveCount(2)
    await expect(confirmationEntries).toContainText([content, content])

    await page
      .getByRole("button", { name: "메모 선택으로 돌아가기" })
      .click()
    await expect(page).toHaveURL("/")
    await expect(page.getByRole("button", { name: "다음, 2회 선택" })).toBeEnabled()

    await page.getByRole("button", { name: "다음, 2회 선택" }).click()
    confirmationEntries = page.getByRole("article", {
      name: /번째 일괄 복사 항목$/u,
    })
    await expect(confirmationEntries).toHaveCount(2)
    await page.getByRole("button", { exact: true, name: "취소" }).click()
    await expect(page).toHaveURL("/")
    await page.reload()
    await expect(page.getByRole("button", { name: "일괄 복사 시작" })).toBeVisible()
    await expect(page.getByRole("button", { name: /다음, \d+회 선택/u })).toHaveCount(0)
    await expect(page.getByRole("article").filter({ hasText: content })).toBeVisible()
  })
})
