import { expect, test } from "@playwright/test"
import * as fc from "fast-check"

import { createMobileNoteThroughUi } from "./support/create-note-through-ui"

test.use({ viewport: { height: 720, width: 320 } })

test("좁은 메모 목록의 탐색을 닫은 뒤 보조 화면으로 이동한다", async ({ page }) => {
  await page.goto("/")
  const trigger = page.getByRole("button", { name: "탐색 열기" })
  const drawer = page.getByRole("dialog", { name: "주요 화면 탐색" })

  await expect(trigger).toBeVisible()
  await expect(page.getByRole("button", { name: "새 메모" })).toBeVisible()
  await trigger.click()
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole("link", { name: "메모" })).toHaveAttribute("aria-current", "page")
  await page.keyboard.press("Escape")
  await expect(drawer).toBeHidden()
  await expect(trigger).toBeFocused()

  await trigger.click()
  await drawer.getByRole("link", { name: "사용 빈도" }).click()
  await expect(page).toHaveURL("/usage/")
  await expect(page.getByRole("heading", { name: "사용 빈도" })).toBeVisible()
  await page.getByRole("button", { name: "탐색 열기" }).click()
  await expect(drawer.getByRole("link", { name: "사용 빈도" })).toHaveAttribute("aria-current", "page")
  await drawer.getByRole("button", { name: "탐색 닫기" }).click()
  await expect(drawer).toBeHidden()
})

test("움직임을 줄인 보조 화면에서도 바깥 영역으로 탐색을 닫는다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/settings/")
  const trigger = page.getByRole("button", { name: "탐색 열기" })
  const drawer = page.getByRole("dialog", { name: "주요 화면 탐색" })
  const viewport = page.viewportSize()

  expect(viewport).not.toBeNull()
  await trigger.click()
  await expect(drawer).toBeVisible()
  await page.mouse.click(viewport!.width - 1, viewport!.height / 2)
  await expect(drawer).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(page).toHaveURL("/settings/")
})

test("메모 본문은 복사하고 수정 아이콘만 상세 화면으로 이동한다", async ({ page }) => {
  const [firstContent, secondContent] = fc.sample(
    fc.uniqueArray(fc.stringMatching(/^[a-z]{10,24}$/u), {
      minLength: 2,
      maxLength: 2,
    }),
    1,
  )[0]

  await page.goto("/")
  const firstNote = await createMobileNoteThroughUi(page, firstContent)
  const secondNote = await createMobileNoteThroughUi(page, secondContent)

  await firstNote.getByRole("button", { name: `${firstContent} 복사` }).click()
  await expect(page).toHaveURL("/")
  await expect(page.getByRole("status").filter({ hasText: "복사했습니다." })).toBeVisible()

  await secondNote.getByRole("button", { name: `${secondContent} 복사` }).click()
  await expect(page.getByRole("status").filter({ hasText: "복사했습니다." })).toBeVisible()
  await firstNote.getByRole("link", { name: `${firstContent} 수정` }).click()
  await expect(page).toHaveURL(/\/notes\/[^/]+\/$/u)
  await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(firstContent)
  await expect(page.getByRole("button", { name: "탐색 열기" })).toHaveCount(0)
})

test("목록 끝까지 이동해도 새 메모 제어가 보이는 화면에 남는다", async ({ page }) => {
  const contents = fc.sample(
    fc.uniqueArray(fc.stringMatching(/^[a-z]{64,72}$/u), {
      minLength: 5,
      maxLength: 5,
    }),
    1,
  )[0]

  await page.goto("/")

  for (const content of contents) {
    await createMobileNoteThroughUi(page, content)
  }

  const notes = page.getByRole("article")
  await expect(notes).toHaveCount(contents.length)
  const lastNote = notes.filter({ hasText: contents[contents.length - 1] })
  await lastNote.scrollIntoViewIfNeeded()
  await expect(lastNote).toBeInViewport()
  await expect(page.getByRole("button", { name: "새 메모" })).toBeInViewport()
})

test("긴 메모를 스크롤해도 저장 제어가 화면 아래쪽에 남는다", async ({ page }) => {
  const content = fc.sample(
    fc.array(fc.stringMatching(/^[a-z]{48,72}$/u), {
      minLength: 50,
      maxLength: 50,
    }),
    1,
  )[0].join("\n")

  await page.goto("/")
  await page.getByRole("button", { name: "새 메모" }).click()
  const editor = page.getByRole("textbox", { name: "메모 내용" })
  const save = page.getByRole("button", { exact: true, name: "저장" })
  await editor.fill(content)
  const viewport = page.viewportSize()
  const before = await save.boundingBox()

  expect(viewport).not.toBeNull()
  expect(before).not.toBeNull()
  expect(viewport!.height - (before!.y + before!.height)).toBeLessThanOrEqual(before!.height)

  await editor.hover()
  await page.mouse.wheel(0, viewport!.height)
  const after = await save.boundingBox()

  expect(after).not.toBeNull()
  expect(after!.y).toBeCloseTo(before!.y, 0)
  await expect(save).toBeInViewport()
  await save.click()
  await expect(page.getByRole("button", { name: "저장됨" })).toBeVisible()
  await expect(editor).toHaveValue(content)
})
