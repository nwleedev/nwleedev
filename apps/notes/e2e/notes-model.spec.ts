import { expect, test } from "@playwright/test"

import {
  createMobileNoteThroughUi,
  createNoteThroughUi,
} from "./support/create-note-through-ui"
import { readStoredNote } from "./support/read-stored-note"
import { runNoteAction } from "./support/run-note-action"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})


test("메모 작성, 자동 저장, 새로고침과 삭제 복원을 같은 순서로 확인한다", async ({
  page,
}) => {
  const initialContent = "모델 검사 메모"
  const revisedContent = "자동 저장한 모델 검사 메모"
  const note = await createNoteThroughUi(page, initialContent)
  const editor = note.getByRole("textbox", { name: "메모 내용" })

  await page.clock.install()
  await editor.fill(revisedContent)
  await page.clock.fastForward(800)
  await expect(editor).toHaveValue(revisedContent)

  await page.reload()
  const restoredNote = page.getByRole("article", { exact: true, name: "메모" })
  await expect(
    restoredNote.getByRole("textbox", { name: "메모 내용" }),
  ).toHaveValue(revisedContent)

  await runNoteAction(restoredNote, "메모 삭제")
  const removalNotice = page.getByRole("status").filter({
    hasText: "메모를 삭제했습니다.",
  })
  await removalNotice.getByRole("button", { name: "실행 취소" }).click()
  await expect(
    page.getByRole("textbox", { name: "메모 내용" }),
  ).toHaveValue(revisedContent)
})

test("800ms 타이머와 blur 및 내부 이동이 최신 원문을 저장한다", async ({
  browser,
}) => {
  const context = await browser.newContext()

  try {
    const page = await context.newPage()
    await page.clock.install()
    await page.goto("/")
    const initialContent = "자동 저장 기준 원문"
    const note = await createNoteThroughUi(page, initialContent)
    const articleId = await note.getAttribute("id")
    expect(articleId).not.toBeNull()
    const noteId = decodeURIComponent(
      articleId!.slice("note-".length, -"-board".length),
    )
    const editor = note.getByRole("textbox", { name: "메모 내용" })

    await expect
      .poll(async () => (await readStoredNote(page, noteId))?.content)
      .toBe(initialContent)

    await editor.fill("타이머로 저장할 원문")
    await page.clock.fastForward(700)
    expect((await readStoredNote(page, noteId))?.content).toBe(initialContent)
    await page.clock.fastForward(100)
    await expect
      .poll(async () => (await readStoredNote(page, noteId))?.content)
      .toBe("타이머로 저장할 원문")

    await editor.fill("blur로 저장할 원문")
    await editor.press("Tab")
    await expect
      .poll(async () => (await readStoredNote(page, noteId))?.content)
      .toBe("blur로 저장할 원문")

    await editor.fill("내부 이동 전에 저장할 원문")
    await page.getByRole("link", { name: "사용 빈도" }).click()
    await expect(page.getByRole("heading", { name: "사용 빈도" })).toBeVisible()
    await expect
      .poll(async () => (await readStoredNote(page, noteId))?.content)
      .toBe("내부 이동 전에 저장할 원문")
  } finally {
    await context.close()
  }
})


test("삭제 뒤 순서를 바꾸고 복원한 메모를 새로고침 뒤에도 유지한다", async ({
  page,
}) => {
  const first = await createNoteThroughUi(page, "첫 번째 순서 메모")
  const second = await createNoteThroughUi(page, "두 번째 순서 메모")
  await createNoteThroughUi(page, "세 번째 순서 메모")

  await runNoteAction(second, "메모 삭제")
  const removalNotice = page.getByRole("status").filter({
    hasText: "메모를 삭제했습니다.",
  })
  await expect(removalNotice).toBeVisible()
  await runNoteAction(first, "메모를 맨 앞으로")
  await removalNotice.getByRole("button", { name: "실행 취소" }).click()

  await expect(page.getByRole("article", { exact: true, name: "메모" })).toHaveCount(3)

  await page.reload()
  await expect
    .poll(async () => {
      const editors = await page.getByRole("textbox", { name: "메모 내용" }).all()
      return Promise.all(editors.map((editor) => editor.inputValue()))
    })
    .toEqual(
      expect.arrayContaining([
        "첫 번째 순서 메모",
        "두 번째 순서 메모",
        "세 번째 순서 메모",
      ]),
    )
})

test("320px 화면에서는 명시적 저장 뒤 새로고침해도 원문을 유지한다", async ({
  browser,
}) => {
  const context = await browser.newContext({
    isMobile: true,
    viewport: { height: 720, width: 320 },
  })

  try {
    const page = await context.newPage()
    await page.goto("/")
    await createMobileNoteThroughUi(page, "모바일 명시적 저장 메모")
    await page.reload()

    await expect(page.getByRole("article")).toContainText("모바일 명시적 저장 메모")
  } finally {
    await context.close()
  }
})
