import { expect, test, type Page } from "@playwright/test"

import { createNoteThroughUi } from "./support/create-note-through-ui"

async function createAccumulatedNotes(page: Page) {
  const firstContent = "첫 번째 누적 메모"
  const secondContent = "두 번째 누적 메모"
  const firstNote = await createNoteThroughUi(page, firstContent)
  const secondNote = await createNoteThroughUi(page, secondContent)

  await firstNote.getByRole("button", { name: "누적" }).click()
  const panel = page.getByRole("complementary", { name: "누적 텍스트" })

  await expect(panel).toBeVisible()
  await secondNote.getByRole("button", { name: "누적" }).click()
  await expect(panel.getByRole("listitem")).toHaveCount(2)

  return { firstContent, panel, secondContent }
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("누적 순서를 바꾸고 제거를 실행 취소하거나 다시 실행한다", async ({
  page,
}) => {
  const { firstContent, panel, secondContent } =
    await createAccumulatedNotes(page)
  const combinedText = panel.getByRole("region", { name: "합친 텍스트" })
  const firstItem = panel
    .getByRole("listitem")
    .filter({ hasText: firstContent })

  await expect(combinedText).toContainText(
    `${firstContent}\n${secondContent}`,
  )
  await firstItem.getByRole("button", { name: "아래로" }).click()
  await expect(combinedText).toContainText(
    `${secondContent}\n${firstContent}`,
  )

  await firstItem.getByRole("button", { name: "제거" }).click()
  await expect(firstItem).toHaveCount(0)
  await panel.getByRole("button", { name: "실행 취소" }).click()
  await expect(firstItem).toBeVisible()
  await panel.getByRole("button", { name: "다시 실행" }).click()
  await expect(firstItem).toHaveCount(0)
})

test.describe("320px 메모 화면", () => {
  test.use({ viewport: { height: 720, width: 320 } })

  test("누적 항목 수 제어에서 관리 화면으로 이동하고 취소 뒤 선택을 유지한다", async ({
    page,
  }) => {
    const content = "작은 화면에서 누적할 메모"
    const note = await createNoteThroughUi(page, content)

    await note.getByRole("button", { name: "누적" }).click()
    const manageLink = page.getByRole("link", {
      name: "누적 텍스트 1개 관리",
    })

    await expect(manageLink).toBeVisible()
    await manageLink.click()
    await expect(page).toHaveURL(/\/accumulator\/$/u)
    await expect(
      page.getByRole("region", { name: "누적 텍스트 관리" }),
    ).toContainText(content)

    await page.getByRole("link", { exact: true, name: "취소" }).click()
    await expect(page).toHaveURL(/\/$/u)
    await expect(manageLink).toBeVisible()
  })
})
