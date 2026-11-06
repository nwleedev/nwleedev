import { expect, test, type Page } from "@playwright/test"
import * as fc from "fast-check"

import { addMobileNoteToBatch, createMobileNoteThroughUi, createNoteThroughUi, openMobileNoteEditor } from "./support/create-note-through-ui"

test.use({ viewport: { height: 720, width: 320 } })

async function createNotesBeyondViewport(page: Page) {
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

  return contents.reverse()
}

test("사용 기록 주소는 서버 구현 전까지 열리지 않는다", async ({ page }) => {
  const response = await page.goto("/usage/")
  expect(response?.status()).toBe(404)
})

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
  await drawer.getByRole("link", { name: "텍스트 분석" }).click()
  await expect(page).toHaveURL("/analysis/")
  await expect(page.getByRole("heading", { name: "텍스트 분석" })).toBeVisible()
  await page.getByRole("button", { name: "탐색 열기" }).click()
  await expect(drawer.getByRole("link", { name: "텍스트 분석" })).toHaveAttribute("aria-current", "page")
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

test("보조 화면은 내용에 맞게 문서 스크롤을 허용한다", async ({ page }) => {
  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()
  const screens = [
    {
      heading: "텍스트 분석",
      endContent: () => page.getByText("아직 분석하지 않았습니다."),
      route: "/analysis/",
    },
    {
      heading: "템플릿",
      endContent: () => page.getByRole("heading", { name: "저장된 템플릿" }),
      route: "/templates/",
    },
    {
      heading: "설정",
      endContent: () =>
        page.getByText(
          "모바일과 저장 목록에서 이동 버튼 표시",
          { exact: true },
        ),
      route: "/settings/",
    },
  ]

  for (const screen of screens) {
    await page.setViewportSize(viewport!)
    await page.goto(screen.route)
    await expect(
      page.getByRole("heading", { exact: true, name: screen.heading }),
    ).toBeVisible()
    await expect(screen.endContent()).toBeVisible()
    const scrollPosition = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight)
      return window.scrollY
    })
    expect(scrollPosition).toBe(0)

    await page.setViewportSize({
      height: Math.floor(viewport!.height / 6),
      width: viewport!.width,
    })
    await screen.endContent().scrollIntoViewIfNeeded()
    await expect(screen.endContent()).toBeInViewport()
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0)
  }
})

test("허용되지 않은 주소의 안내도 보이는 화면 안에 남는다", async ({ page }) => {
  await page.goto("/")
  const address = new URL(page.url())
  address.hostname = "localhost."
  await page.goto(address.toString())
  await expect(page.getByRole("heading", { name: "잘못된 접근입니다." })).toBeInViewport()

  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()
  const scrollPosition = await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight)
    return window.scrollY
  })
  expect(scrollPosition).toBe(0)
})

test("메모 본문은 복사하고 더보기의 수정으로 상세 화면에 이동한다", async ({ page }) => {
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
  await openMobileNoteEditor(page, firstNote)
  await expect(page).toHaveURL(/\/notes\/[^/]+\/$/u)
  await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(firstContent)
  await expect(page.getByRole("button", { name: "탐색 열기" })).toHaveCount(0)
})

test("빈 목록과 메모 한 개의 새 메모 버튼은 화면 아래에 남는다", async ({ page }) => {
  const content = fc.sample(fc.stringMatching(/^[a-z]{12,24}$/u), 1)[0]

  await page.goto("/")
  const createButton = page.getByRole("button", { name: "새 메모" })
  const viewport = page.viewportSize()
  const emptyPosition = await createButton.boundingBox()

  expect(viewport).not.toBeNull()
  expect(emptyPosition).not.toBeNull()
  expect(viewport!.height - (emptyPosition!.y + emptyPosition!.height)).toBeLessThan(emptyPosition!.height)

  const note = await createMobileNoteThroughUi(page, content)
  const singlePosition = await createButton.boundingBox()

  expect(singlePosition).not.toBeNull()
  expect(singlePosition!.y).toBeCloseTo(emptyPosition!.y, 0)
  await note.getByRole("button", { name: `${content} 복사` }).click()
  await expect(page.getByRole("status").filter({ hasText: "복사했습니다." })).toBeVisible()
  await openMobileNoteEditor(page, note)
  await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(content)
})

test("목록 끝까지 이동해도 새 메모 제어가 보이는 화면에 남는다", async ({ page }) => {
  const contents = await createNotesBeyondViewport(page)

  const notes = page.getByRole("article")
  await expect(notes).toHaveCount(contents.length)
  const createButton = page.getByRole("button", { name: "새 메모" })
  const before = await createButton.boundingBox()
  const lastNote = notes.filter({ hasText: contents[contents.length - 1] })
  await lastNote.scrollIntoViewIfNeeded()
  await expect(lastNote).toBeInViewport()
  const after = await createButton.boundingBox()
  expect(before).not.toBeNull()
  expect(after).not.toBeNull()
  expect(after!.y).toBeCloseTo(before!.y, 0)
  await expect(createButton).toBeInViewport()
  await lastNote.getByRole("button", { name: `${contents.at(-1)!} 복사` }).click()
  await expect(page.getByRole("status").filter({ hasText: "복사했습니다." })).toBeVisible()
  await openMobileNoteEditor(page, lastNote)
  await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(contents.at(-1)!)
})

test("목록 끝에서 추가해도 현재 작업 링크와 새 메모 제어에 접근한다", async ({ page }) => {
  const contents = await createNotesBeyondViewport(page)
  const link = page.getByRole("link", { name: "일괄 복사 확인, 0개" })
  await expect(link).toBeDisabled()
  const before = await link.boundingBox()
  const lastContent = contents.at(-1)!
  const lastNote = page.getByRole("article").filter({ hasText: lastContent })
  await lastNote.scrollIntoViewIfNeeded()
  await expect(lastNote).toBeInViewport()
  await addMobileNoteToBatch(page, lastNote)
  const ready = page.getByRole("link", { name: "일괄 복사 확인, 1개" })
  await expect(ready).toBeEnabled()
  const after = await ready.boundingBox()
  expect(before).not.toBeNull()
  expect(after).not.toBeNull()
  expect(after!.y).toBeCloseTo(before!.y, 0)
  await expect(page.getByRole("button", { name: "새 메모" })).toBeInViewport()
  await ready.click()
  await expect(page.getByRole("heading", { name: "일괄 복사 확인" })).toBeVisible()
  await expect(page.getByRole("article", { name: "1번째 일괄 복사 항목" })).toContainText(lastContent)
  await page.getByRole("button", { name: "메모 목록으로 돌아가기" }).click()
  await expect(page.getByRole("button", { name: "새 메모" })).toBeInViewport()
})

test("보이는 화면의 높이가 줄어도 메모 높이를 유지하고 목록 끝까지 스크롤한다", async ({ page }) => {
  const contents = await createNotesBeyondViewport(page)

  const firstNote = page.getByRole("article").filter({ hasText: contents[0] })
  const firstBefore = await firstNote.boundingBox()
  const viewport = page.viewportSize()

  expect(firstBefore).not.toBeNull()
  expect(viewport).not.toBeNull()
  await page.setViewportSize({
    height: Math.floor(viewport!.height / 2),
    width: viewport!.width,
  })

  const firstAfter = await firstNote.boundingBox()
  const lastNote = page.getByRole("article").filter({ hasText: contents.at(-1)! })

  expect(firstAfter).not.toBeNull()
  expect(firstAfter!.height).toBeCloseTo(firstBefore!.height, 0)
  await lastNote.scrollIntoViewIfNeeded()
  await expect(lastNote).toBeInViewport()
  await expect(lastNote.getByRole("button", { name: `${contents.at(-1)!} 더보기` })).toBeVisible()
})

test("빈 목록에서 새 메모를 만들면 목록에 남고 더보기의 수정으로 상세를 연다", async ({ page }) => {
  await page.goto("/")
  const notes = page.getByRole("article")
  const previousNoteCount = await notes.count()

  await page.getByRole("button", { name: "새 메모" }).click()

  await expect(page).toHaveURL("/")
  await expect(notes).toHaveCount(previousNoteCount + 1)
  await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveCount(0)
  await expect(page.getByRole("status").filter({ hasText: "복사했습니다." })).toHaveCount(0)

  await openMobileNoteEditor(page, page.getByRole("article").filter({ has: page.getByRole("button", { exact: true, name: "빈 메모 더보기" }) }))

  await expect(page).toHaveURL(/\/notes\/[^/]+\/$/u)
  await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue("")
})

test("메모가 있는 목록에서 새 메모를 만들어도 기존 메모와 목록을 유지한다", async ({ page }) => {
  const content = fc.sample(fc.stringMatching(/^[a-z]{12,24}$/u), 1)[0]

  await page.goto("/")
  await createMobileNoteThroughUi(page, content)
  const notes = page.getByRole("article")
  const previousNoteCount = await notes.count()

  await page.getByRole("button", { name: "새 메모" }).click()

  await expect(page).toHaveURL("/")
  await expect(notes).toHaveCount(previousNoteCount + 1)
  const menus = notes.getByRole("button", { name: / 더보기$/u })
  await expect.poll(() => menus.evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label"))))
    .toEqual(["빈 메모 더보기", `${content} 더보기`])
  await expect(notes.filter({ hasText: content })).toBeVisible()
  await expect(page.getByRole("button", { name: "빈 메모 더보기" })).toBeVisible()
})

test("긴 메모를 스크롤해도 편집 이력 버튼과 저장 상태가 화면 위쪽에 남는다", async ({ page }) => {
  const content = fc.sample(
    fc.array(fc.stringMatching(/^[a-z]{48,72}$/u), {
      minLength: 50,
      maxLength: 50,
    }),
    1,
  )[0].join("\n")

  await page.goto("/")
  const notes = page.getByRole("article")
  const previousNoteCount = await notes.count()
  await page.getByRole("button", { name: "새 메모" }).click()
  await expect(page).toHaveURL("/")
  await expect(notes).toHaveCount(previousNoteCount + 1)
  await openMobileNoteEditor(page, page.getByRole("article").filter({ has: page.getByRole("button", { exact: true, name: "빈 메모 더보기" }) }))
  const editor = page.getByRole("textbox", { name: "메모 내용" })
  const save = page.getByRole("button", { exact: true, name: "실행 취소" })
  await editor.fill(content)
  const viewport = page.viewportSize()
  const before = await save.boundingBox()

  expect(viewport).not.toBeNull()
  expect(before).not.toBeNull()
  expect(before!.y).toBeLessThanOrEqual(before!.height)

  await editor.hover()
  await page.mouse.wheel(0, viewport!.height)
  const after = await save.boundingBox()

  expect(after).not.toBeNull()
  expect(after!.y).toBeCloseTo(before!.y, 0)
  await expect(save).toBeInViewport()
  await expect(page.getByRole("status").filter({ hasText: "저장됨" })).toBeVisible()
  await expect(editor).toHaveValue(content)
})

test("데스크탑 탐색은 글자를 두 배로 키워도 메뉴를 읽고 이동할 수 있다", async ({ page }, testInfo) => {
  for (const width of [1280, 768]) {
    await page.setViewportSize({ width, height: 720 })
    await page.goto("/analysis/")
    const navigation = page.getByRole("navigation", { name: "주요 화면", exact: true })
    const links = navigation.getByRole("link")
    const originalFont = await navigation.getByRole("link", { name: "메모", exact: true }).evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%" })
    const enlargedFont = await navigation.getByRole("link", { name: "메모", exact: true }).evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
    expect(enlargedFont).toBe(originalFont * 2)
    const bounds = await links.evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(element)
      const text = range.getBoundingClientRect()
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, textLeft: text.left, textRight: text.right, textTop: text.top, textBottom: text.bottom, textHeight: text.height, lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight) }
    }))
    for (const box of bounds) {
      expect(box.left).toBeGreaterThanOrEqual(0)
      expect(box.right).toBeLessThanOrEqual(width)
      expect(box.textLeft).toBeGreaterThanOrEqual(box.left)
      expect(box.textRight).toBeLessThanOrEqual(box.right)
      expect(box.textHeight).toBeLessThanOrEqual(box.lineHeight)
      expect(box.textTop).toBeGreaterThanOrEqual(box.top)
      expect(box.textBottom).toBeLessThanOrEqual(box.bottom)
    }
    const brand = page.getByRole("link", { name: "개인 메모", exact: true })
    const brandBox = (await brand.boundingBox())!
    expect(brandBox.x + brandBox.width).toBeLessThanOrEqual(bounds[0].left)
    await page.screenshot({ path: testInfo.outputPath(`navigation-text-200-${width}.png`) })
    await navigation.getByRole("link", { name: "설정", exact: true }).click()
    await expect(page).toHaveURL("/settings/")
    await expect(navigation.getByRole("link", { name: "설정", exact: true })).toHaveAttribute("aria-current", "page")
    await brand.click()
    await expect(page).toHaveURL("/")
  }
})

test("메모 화면은 글자 확대와 복원에서 탐색 헤더를 중복 표시하지 않는다", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto("/")
  const content = fc.sample(fc.stringMatching(/^[a-z]{16,24}$/u), 1)[0]
  await createNoteThroughUi(page, content)
  const navigation = page.getByRole("navigation", { name: "주요 화면", exact: true })
  const trigger = page.getByRole("button", { name: "탐색 열기", exact: true })
  await expect(navigation).toBeVisible()
  await expect(trigger).toBeHidden()

  await page.evaluate(() => { document.documentElement.style.fontSize = "200%" })
  for (const width of [1280, 768]) {
    await page.setViewportSize({ width, height: 720 })
    await expect(navigation).toBeHidden()
    await expect(trigger).toBeVisible()
    await expect(page.getByRole("article").filter({ hasText: content })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`notes-text-200-${width}.png`) })
  }
  await trigger.click()
  const drawer = page.getByRole("dialog", { name: "주요 화면 탐색" })
  await drawer.getByRole("link", { name: "설정", exact: true }).click()
  await expect(page).toHaveURL("/settings/")
  await expect(navigation.getByRole("link", { name: "설정", exact: true })).toHaveAttribute("aria-current", "page")
  await page.getByRole("link", { name: "개인 메모", exact: true }).click()
  await expect(page).toHaveURL("/")
  await expect(trigger).toBeVisible()
  await expect(navigation).toBeHidden()

  await page.evaluate(() => { document.documentElement.style.fontSize = "100%" })
  await page.setViewportSize({ width: 1280, height: 720 })
  await expect(navigation).toBeVisible()
  await expect(trigger).toBeHidden()
  await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(content)
})


test("모바일 카드는 글자를 확대해도 더보기에서 원문을 편집할 수 있다", async ({ page }, testInfo) => {
  await page.goto("/")
  const content = "확대 화면에서도 메모 원문을 확인합니다.\n".repeat(8).trim()
  const note = await createMobileNoteThroughUi(page, content)
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%" })
  await expect(note.getByRole("button", { name: / 더보기$/u })).toBeInViewport({ ratio: 1 })
  const noteBox = await note.boundingBox()
  expect(noteBox).not.toBeNull()
  expect(noteBox!.x).toBeGreaterThanOrEqual(0)
  expect(noteBox!.x + noteBox!.width).toBeLessThanOrEqual(320)
  await page.screenshot({ path: testInfo.outputPath("mobile-card-text-200.png") })
  await openMobileNoteEditor(page, note)
  const editor = page.getByRole("textbox", { name: "메모 내용" })
  await expect(editor).toHaveValue(content)
  const updated = `${content}\n확대 상태에서 추가한 내용`
  await editor.fill(updated)
  await expect(page.getByRole("status").filter({ hasText: "저장됨" })).toBeVisible()
  const undo = page.getByRole("button", { name: "실행 취소", exact: true })
  const redo = page.getByRole("button", { name: "다시 실행", exact: true })
  await expect(undo).toBeInViewport({ ratio: 1 })
  await undo.click()
  await expect(editor).toHaveValue(content)
  await expect(redo).toBeInViewport({ ratio: 1 })
  await redo.click()
  await expect(editor).toHaveValue(updated)
  await expect(page.getByRole("status").filter({ hasText: "저장됨" })).toBeVisible()
  await expect(page.getByRole("link", { name: "메모 목록", exact: true })).toBeInViewport({ ratio: 1 })
  await page.screenshot({ path: testInfo.outputPath("mobile-editor-text-200.png") })
  await page.getByRole("link", { name: "메모 목록", exact: true }).click()
  await expect(page).toHaveURL("/")
  await expect(note).toBeVisible()
})
