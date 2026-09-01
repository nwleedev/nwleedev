import { expect, test } from "@playwright/test"

import { createNoteThroughUi } from "./support/create-note-through-ui"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("작성하고 편집한 메모를 새로고침 뒤에도 보여준다", async ({ page }) => {
  const initialContent = "브라우저에서 작성한 메모"
  const revisedContent = "Escape로 저장한 메모"
  const note = await createNoteThroughUi(page, initialContent)

  await note.getByRole("button", { name: "편집" }).click()
  const editor = page.getByRole("textbox", { name: "메모 내용" })

  await editor.fill(revisedContent)
  await editor.press("Escape")
  await expect(
    page
      .getByRole("article")
      .filter({ hasText: revisedContent, visible: true }),
  ).toBeVisible()

  await page.reload()
  await expect(
    page
      .getByRole("article")
      .filter({ hasText: revisedContent, visible: true }),
  ).toBeVisible()
})

test("메모 배치를 저장해도 조작 포커스와 저장값을 유지한다", async ({ page }) => {
  const content = "배치를 조정할 메모"
  const note = await createNoteThroughUi(page, content)

  await note.getByRole("button", { name: "메모 이동" }).click()
  await note.getByLabel("가로 위치", { exact: true }).fill("80")
  const applyButton = note.getByRole("button", { name: "배치 적용" })

  await applyButton.focus()
  await applyButton.press("Enter")
  await expect(applyButton).toBeFocused()

  await page.reload()
  const savedNote = page
    .getByRole("article")
    .filter({ hasText: content, visible: true })

  await savedNote.getByRole("button", { name: "메모 이동" }).click()
  await expect(
    savedNote.getByLabel("가로 위치", { exact: true }),
  ).toHaveValue("80")
})

test.describe("320px 사용 빈도 화면", () => {
  test.use({ viewport: { height: 720, width: 320 } })

  test("일반 복사, 누적과 합계를 서로 다른 값으로 보여준다", async ({
    page,
  }) => {
    const content = "사용 빈도를 확인할 메모"
    const note = await createNoteThroughUi(page, content)

    await note.getByText(content, { exact: true }).click()
    await expect(note.getByRole("status")).toContainText("복사했습니다.")
    await note.getByText(content, { exact: true }).click()
    await note.getByRole("button", { name: "누적" }).click()
    await page.getByRole("button", { name: "탐색" }).click()
    await page.getByRole("link", { exact: true, name: "사용 빈도" }).click()

    const usageRow = page.getByRole("row").filter({ hasText: content })

    await expect(usageRow).toBeVisible()
    await expect(
      usageRow.getByRole("cell", { name: "일반 복사 2회" }),
    ).toBeVisible()
    await expect(
      usageRow.getByRole("cell", { name: "누적 1회" }),
    ).toBeVisible()
    await expect(
      usageRow.getByRole("cell", { name: "합계 3회" }),
    ).toBeVisible()
  })
})
