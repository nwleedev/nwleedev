import { expect, type Locator, type Page } from "@playwright/test"

export async function createNoteThroughUi(
  page: Page,
  content: string,
): Promise<Locator> {
  const editors = page.getByRole("textbox", { name: "메모 내용" })
  const previousNoteCount = await editors.count()

  await page.getByRole("button", { name: "새 메모" }).click()
  await expect(editors).toHaveCount(previousNoteCount + 1)

  const editor = editors.nth(previousNoteCount)

  await editor.focus()
  await expect(editor).toBeFocused()
  await editor.fill(content)

  const note = page
    .getByRole("article", { exact: true, name: "메모" })
    .nth(previousNoteCount)
  const actionButton = note.getByRole("button", { name: "메모 동작" })

  await expect(note).toBeVisible()
  await editor.press("Tab")
  await actionButton.click({ trial: true })
  return note
}

export async function createMobileNoteThroughUi(
  page: Page,
  content: string,
): Promise<Locator> {
  await page.getByRole("button", { name: "새 메모" }).click()
  await expect(page).toHaveURL(/\/notes\/[^/]+\/$/u)

  const editor = page.getByRole("textbox", { name: "메모 내용" })
  await editor.fill(content)
  await page.getByRole("button", { exact: true, name: "저장" }).click()
  await expect(page.getByRole("button", { name: "저장됨" })).toBeVisible()
  await page.getByRole("link", { exact: true, name: "메모 목록" }).click()
  await expect(page).toHaveURL("/")

  const note = page.getByRole("article").filter({ hasText: content })
  await expect(note).toBeVisible()
  return note
}
