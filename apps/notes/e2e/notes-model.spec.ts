import { expect, test } from "@playwright/test"
import * as fc from "fast-check"

import {
  createMobileNoteThroughUi,
  createNoteThroughUi,
} from "./support/create-note-through-ui"

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

  await restoredNote.getByRole("button", { name: "메모 삭제" }).click()
  const removalNotice = page.getByRole("status").filter({
    hasText: "메모를 제거했습니다.",
  })
  await removalNotice.getByRole("button", { name: "취소" }).click()
  await expect(
    page.getByRole("textbox", { name: "메모 내용" }),
  ).toHaveValue(revisedContent)
})

test("생성한 원문은 후보별 새 브라우저 문맥에서 자동 저장 뒤 복원된다", async ({
  browser,
}) => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1, maxLength: 32, unit: "grapheme-ascii" }),
      fc.string({ minLength: 1, maxLength: 32, unit: "grapheme-ascii" }),
      async (initialContent, revisedContent) => {
        const context = await browser.newContext()

        try {
          const page = await context.newPage()
          await page.goto("/")
          await page.clock.install()
          const note = await createNoteThroughUi(page, initialContent)
          const editor = note.getByRole("textbox", { name: "메모 내용" })

          await editor.fill(revisedContent)
          await page.clock.fastForward(800)
          await page.reload()

          await expect(
            page
              .getByRole("article", { exact: true, name: "메모" })
              .getByRole("textbox", { name: "메모 내용" }),
          ).toHaveValue(revisedContent)
        } finally {
          await context.close()
        }
      },
    ),
    { numRuns: 3 },
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
