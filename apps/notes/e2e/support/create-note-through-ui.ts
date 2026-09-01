import { expect, type Locator, type Page } from "@playwright/test"

export async function createNoteThroughUi(
  page: Page,
  content: string,
): Promise<Locator> {
  await page.getByRole("button", { name: "새 메모" }).click()
  const editor = page.getByRole("textbox", { name: "메모 내용" })

  await expect(editor).toBeFocused()
  await editor.fill(content)
  await page.getByRole("button", { name: "완료" }).click()

  const note = page
    .getByRole("article")
    .filter({ hasText: content, visible: true })

  await expect(note).toBeVisible()
  return note
}
