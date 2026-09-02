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
  const removeButton = note.getByRole("button", { name: "메모 삭제" })

  await expect(note).toBeVisible()
  await editor.press("Tab")
  await removeButton.click({ trial: true })
  return note
}
