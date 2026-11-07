import { expect, type Locator } from "@playwright/test"

export type NoteActionName =
  | "메모 삭제"
  | "메모를 맨 뒤로"
  | "메모를 맨 앞으로"
  | "속성"

export async function runNoteAction(
  note: Locator,
  name: NoteActionName,
) {
  await note.getByRole("button", { name: "메모 동작" }).click()
  await note.page().getByRole("menu", { name: "메모 동작" })
    .getByRole("menuitem", { exact: true, name }).click()
}

export async function openPropertiesWithKeyboard(note: Locator) {
  await note.focus()
  await expect(note).toBeFocused()
  await note.press("Enter")
  return note.page().getByRole("complementary", { name: "메모 속성" })
}
