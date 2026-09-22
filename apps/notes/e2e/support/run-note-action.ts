import type { Locator } from "@playwright/test"

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
  await note.getByRole("button", { exact: true, name }).click()
}
