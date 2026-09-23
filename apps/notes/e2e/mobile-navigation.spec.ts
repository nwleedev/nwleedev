import { expect, test, type Page } from "@playwright/test"
import * as fc from "fast-check"

import { createMobileNoteThroughUi } from "./support/create-note-through-ui"

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

  return contents
}

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

test("보조 화면은 내용에 맞게 문서 스크롤을 허용한다", async ({ page }) => {
  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()
  const screens = [
    {
      heading: "사용 빈도",
      endContent: () =>
        page.getByRole("status").filter({ hasText: "복사 기록이 없습니다." }),
      route: "/usage/",
    },
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
          "일괄 복사 항목에 위로 이동과 아래로 이동 표시",
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
  await note.getByRole("link", { name: `${content} 수정` }).click()
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
  await lastNote.getByRole("link", { name: `${contents.at(-1)!} 수정` }).click()
  await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(contents.at(-1)!)
})

test("일괄 복사 중 마지막 메모와 화면 아래의 작업 버튼에 접근한다", async ({ page }) => {
  const contents = await createNotesBeyondViewport(page)

  await page.getByRole("button", { name: "일괄 복사 시작" }).click()
  await expect(page.getByRole("button", { name: "새 메모" })).toHaveCount(0)
  const next = page.getByRole("button", { name: "다음, 0회 선택" })
  const before = await next.boundingBox()

  const lastContent = contents.at(-1)!
  const lastNote = page.getByRole("article").filter({ hasText: lastContent })

  await lastNote.scrollIntoViewIfNeeded()
  await expect(lastNote).toBeInViewport()
  const after = await next.boundingBox()
  expect(before).not.toBeNull()
  expect(after).not.toBeNull()
  expect(after!.y).toBeCloseTo(before!.y, 0)
  await lastNote.getByRole("button", { name: `${lastContent} 일괄 복사에 추가` }).click()
  await expect(page.getByRole("button", { name: "다음, 1회 선택" })).toBeInViewport()
  await expect(page.getByRole("button", { name: "초기화" })).toBeInViewport()

  await page.getByRole("button", { name: "일괄 복사 끝내기" }).click()
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
  await expect(lastNote.getByRole("link", { name: `${contents.at(-1)!} 수정` })).toBeVisible()
})

test("빈 목록에서 새 메모를 만들면 목록에 남고 수정 아이콘으로 상세를 연다", async ({ page }) => {
  await page.goto("/")
  const notes = page.getByRole("article")
  const previousNoteCount = await notes.count()

  await page.getByRole("button", { name: "새 메모" }).click()

  await expect(page).toHaveURL("/")
  await expect(notes).toHaveCount(previousNoteCount + 1)
  await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveCount(0)
  await expect(page.getByRole("status").filter({ hasText: "복사했습니다." })).toHaveCount(0)

  await page.getByRole("link", { name: "빈 메모 수정" }).click()

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
  await expect(notes.filter({ hasText: content })).toBeVisible()
  await expect(page.getByRole("link", { name: "빈 메모 수정" })).toBeVisible()
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
  const notes = page.getByRole("article")
  const previousNoteCount = await notes.count()
  await page.getByRole("button", { name: "새 메모" }).click()
  await expect(page).toHaveURL("/")
  await expect(notes).toHaveCount(previousNoteCount + 1)
  await page.getByRole("link", { name: "빈 메모 수정" }).click()
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
