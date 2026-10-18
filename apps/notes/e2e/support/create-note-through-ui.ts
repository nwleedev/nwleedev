import { expect, type Locator, type Page } from "@playwright/test"

export async function openMobileNoteEditor(page: Page, note: Locator) {
  await note.getByRole("button", { name: / 더보기$/u }).click()
  await page.getByRole("dialog", { exact: true, name: "메모" }).getByRole("link", { exact: true, name: "수정" }).click()
}

export async function readMobileNoteEditHref(page: Page, note: Locator) {
  await note.getByRole("button", { name: / 더보기$/u }).click()
  const sheet = page.getByRole("dialog", { exact: true, name: "메모" })
  const href = await sheet.getByRole("link", { exact: true, name: "수정" }).getAttribute("href")
  await sheet.getByRole("button", { name: "동작 선택창 닫기" }).click()
  await expect(sheet).toBeHidden()
  if (href === null) throw new Error("The note edit link is missing")
  return href
}

export async function addMobileNoteToBatch(page: Page, note: Locator) {
  await note.getByRole("button", { name: / 더보기$/u }).click()
  const sheet = page.getByRole("dialog", { exact: true, name: "메모" })
  await sheet.getByRole("button", { exact: true, name: "일괄 복사에 추가" }).click()
  await expect(sheet).toBeHidden()
}

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
  const notes = page.getByRole("article")
  const previousNoteCount = await notes.count()

  await page.getByRole("button", { name: "새 메모" }).click()
  await expect(page).toHaveURL("/")
  await expect(notes).toHaveCount(previousNoteCount + 1)

  await openMobileNoteEditor(page, page.getByRole("article").filter({ has: page.getByRole("button", { exact: true, name: "빈 메모 더보기" }) }))
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
