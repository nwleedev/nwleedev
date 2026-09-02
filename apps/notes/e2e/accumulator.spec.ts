import { expect, test, type Page } from "@playwright/test"

import { createNoteThroughUi } from "./support/create-note-through-ui"

async function createAccumulatedNotes(page: Page) {
  const firstContent = "첫 번째 일괄 복사 메모"
  const secondContent = "두 번째 일괄 복사 메모"
  const firstNote = await createNoteThroughUi(page, firstContent)
  const secondNote = await createNoteThroughUi(page, secondContent)

  await firstNote.getByRole("button", { name: "누적" }).click()
  const panel = page.getByRole("complementary", { name: "일괄 복사" })

  await expect(panel).toBeVisible()
  await secondNote.getByRole("button", { name: "누적" }).click()
  await expect(panel.getByRole("listitem")).toHaveCount(2)

  return { firstContent, panel, secondContent }
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("일괄 복사 항목을 끌어 순서를 바꾸고 제거를 단축키로 복구한다", async ({
  page,
}) => {
  const { firstContent, panel, secondContent } =
    await createAccumulatedNotes(page)
  const items = panel.getByRole("listitem")
  const firstItem = panel
    .getByRole("listitem")
    .filter({ hasText: firstContent })
  const secondItem = panel
    .getByRole("listitem")
    .filter({ hasText: secondContent })
  const firstHandle = firstItem.getByRole("button", {
    name: "1번째 일괄 복사 항목 순서 변경",
  })
  const secondBox = await secondItem.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return {
      height: bounds.height,
      width: bounds.width,
      x: bounds.x,
      y: bounds.y,
    }
  })

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
  await firstItem.getByRole("button", { name: "일괄 복사 항목 제거" }).click()
  await expect(firstItem).toHaveCount(0)
  await page.keyboard.press("ControlOrMeta+z")
  await expect(firstItem).toBeVisible()
  await page.keyboard.press("ControlOrMeta+Shift+z")
  await expect(firstItem).toHaveCount(0)
})

test.describe("320px 메모 화면", () => {
  test.use({ viewport: { height: 720, width: 320 } })

  test("일괄 복사 항목 수 제어에서 관리 화면으로 이동하고 취소 뒤 항목을 유지한다", async ({
    page,
  }) => {
    const content = "작은 화면에서 일괄 복사할 메모"
    const note = await createNoteThroughUi(page, content)

    await note.getByRole("button", { name: "누적" }).click()
    const manageLink = page.getByRole("link", {
      name: "일괄 복사 1개 관리",
    })

    await expect(manageLink).toBeVisible()
    await manageLink.click()
    await expect(page).toHaveURL(/\/accumulator\/$/u)
    await expect(
      page.getByRole("region", { name: "일괄 복사 항목 관리" }),
    ).toContainText(content)

    await page.getByRole("link", { exact: true, name: "취소" }).click()
    await expect(page).toHaveURL(/\/$/u)
    await expect(manageLink).toBeVisible()
  })
})
