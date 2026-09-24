import { expect, test, type Locator, type Page } from "@playwright/test"
import * as fc from "fast-check"

import {
  createMobileNoteThroughUi,
  createNoteThroughUi,
} from "./support/create-note-through-ui"

async function visibleBox(locator: Locator) {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error("Visible element has no bounding box")
  }

  return box
}

async function createDesktopBatchCopy(page: Page) {
  const firstContent = "첫 번째 일괄 복사 메모"
  const secondContent = "두 번째 일괄 복사 메모"
  const firstNote = await createNoteThroughUi(page, firstContent)
  const secondNote = await createNoteThroughUi(page, secondContent)

  await firstNote
    .getByRole("textbox", { name: "메모 내용" })
    .click({ modifiers: ["Meta", "Alt"] })
  const panel = page.getByRole("complementary", { name: "일괄 복사" })
  await expect(panel).toBeVisible()
  await secondNote
    .getByRole("textbox", { name: "메모 내용" })
    .click({ modifiers: ["Meta", "Alt"] })
  await expect(panel.getByRole("listitem")).toHaveCount(2)

  return { firstContent, panel, secondContent }
}

const reorderButtonsSetting =
  "일괄 복사 항목에 위로 이동과 아래로 이동 표시"

async function expectStoredSetting(
  page: Page,
  name: string,
  checked: boolean,
) {
  const storedPage = await page.context().newPage()

  try {
    await expect
      .poll(async () => {
        await storedPage.goto("/settings/")
        return storedPage.getByRole("checkbox", { name }).isChecked()
      })
      .toBe(checked)
  } finally {
    await storedPage.close()
  }
}

async function setReorderButtons(page: Page, enabled: boolean) {
  await page.goto("/settings/")
  const checkbox = page.getByRole("checkbox", {
    name: reorderButtonsSetting,
  })

  if ((await checkbox.isChecked()) !== enabled) {
    await page.getByText(reorderButtonsSetting, { exact: true }).click()
  }

  if (enabled) {
    await expect(checkbox).toBeChecked()
  } else {
    await expect(checkbox).not.toBeChecked()
  }

  await expectStoredSetting(page, reorderButtonsSetting, enabled)
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("설정에서 데스크톱 일괄 복사 단축키를 끄고 새로고침 뒤에도 유지한다", async ({
  page,
}) => {
  await page.goto("/settings/")
  const shortcut = page.getByRole("checkbox", {
    name: "Command+Option+클릭으로 일괄 복사에 추가",
  })

  await expect(shortcut).toBeChecked()
  await page.getByText(
    "Command+Option+클릭으로 일괄 복사에 추가",
    { exact: true },
  ).click()
  await expect(shortcut).not.toBeChecked()
  await expectStoredSetting(
    page,
    "Command+Option+클릭으로 일괄 복사에 추가",
    false,
  )
  await page.reload()
  await expect(
    page.getByRole("checkbox", {
      name: "Command+Option+클릭으로 일괄 복사에 추가",
    }),
  ).not.toBeChecked()

  await page.goto("/")
  const note = await createNoteThroughUi(page, "단축키 설정을 확인할 메모")

  await note
    .getByRole("textbox", { name: "메모 내용" })
    .click({ modifiers: ["Meta", "Alt"] })
  await expect(
    page.getByRole("complementary", { name: "일괄 복사" }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "일괄 복사 0개" }),
  ).toBeVisible()
})

test("직접 이동 설정을 저장하고 현재 항목에서 가능한 방향만 제공한다", async ({
  page,
}) => {
  await page.goto("/settings/")
  const setting = page.getByRole("checkbox", {
    name: reorderButtonsSetting,
  })
  await expect(setting).not.toBeChecked()
  await page.getByText(reorderButtonsSetting, { exact: true }).click()
  await expect(setting).toBeChecked()
  await expectStoredSetting(page, reorderButtonsSetting, true)
  await page.reload()
  await expect(
    page.getByRole("checkbox", { name: reorderButtonsSetting }),
  ).toBeChecked()

  await page.goto("/")
  const createContent = (position: number) =>
    `직접 이동 확인 메모 ${position}-${crypto.randomUUID()}`
  const contents = [
    createContent(1),
    createContent(2),
    createContent(3),
    createContent(4),
  ] as const
  const [firstContent, secondContent, thirdContent, fourthContent] = contents
  const movedDownContents = [
    secondContent,
    firstContent,
    thirdContent,
    fourthContent,
  ]

  for (const content of contents) {
    const note = await createNoteThroughUi(page, content)
    await note
      .getByRole("textbox", { name: "메모 내용" })
      .click({ modifiers: ["Meta", "Alt"] })
  }

  const panel = page.getByRole("complementary", { name: "일괄 복사" })
  const items = panel.getByRole("listitem")
  const firstItem = items.filter({ hasText: firstContent })
  await firstItem
    .getByRole("button", { name: /번째 일괄 복사 항목 동작$/u })
    .click()
  await expect(
    page.getByRole("group", { name: /번째 일괄 복사 항목 동작$/u }),
  ).toBeInViewport()
  await expect(
    page.getByRole("button", { exact: true, name: "위로 이동" }),
  ).toHaveCount(0)
  await page
    .getByRole("button", { exact: true, name: "아래로 이동" })
    .click()
  await expect(items).toContainText(movedDownContents)
  await expect(
    firstItem.getByRole("button", { name: /번째 일괄 복사 항목 이동$/u }),
  ).toBeFocused()

  await firstItem
    .getByRole("button", { name: /번째 일괄 복사 항목 동작$/u })
    .click()
  await expect(
    page.getByRole("button", { exact: true, name: "위로 이동" }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { exact: true, name: "아래로 이동" }),
  ).toBeVisible()
  await page
    .getByRole("button", { exact: true, name: "위로 이동" })
    .click()
  await expect(items).toContainText(contents)

  await page.reload()
  await page.goto("/batch-copy/")
  await expect(
    page
      .getByRole("region", { name: "일괄 복사 항목 관리" })
      .getByRole("listitem"),
  ).toContainText(contents)

  await setReorderButtons(page, false)
  await page.goto("/batch-copy/")
  await page
    .getByRole("button", { name: "1번째 일괄 복사 항목 동작" })
    .click()
  await expect(
    page.getByRole("button", { exact: true, name: "위로 이동" }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("button", { exact: true, name: "아래로 이동" }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("button", { exact: true, name: "복제" }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { exact: true, name: "삭제" }),
  ).toBeVisible()
})

test("오른쪽 패널에서 선택, 방향키, drag와 직접 제거를 구분한다", async ({
  page,
}) => {
  const { firstContent, panel, secondContent } =
    await createDesktopBatchCopy(page)
  const items = panel.getByRole("listitem")
  const firstItem = items.filter({ hasText: firstContent })
  const secondItem = items.filter({ hasText: secondContent })
  const firstSelection = firstItem.getByRole("button", {
    name: `일괄 복사 항목 선택: ${firstContent}`,
  })
  const firstHandle = firstItem.getByRole("button", {
    name: /번째 일괄 복사 항목 이동$/u,
  })

  await firstSelection.click()
  await expect(firstSelection).toHaveAttribute("aria-pressed", "true")
  await firstSelection.press("Shift+Escape")
  await expect(firstSelection).toHaveAttribute("aria-pressed", "true")
  await page.evaluate(() => {
    window.addEventListener("keydown", (event) => event.preventDefault(), {
      capture: true,
      once: true,
    })
  })
  await firstSelection.press("Escape")
  await expect(firstSelection).toHaveAttribute("aria-pressed", "true")
  await firstHandle.press("ArrowDown")
  await expect(items).toContainText([secondContent, firstContent])
  await expect(firstHandle).toBeFocused()
  await firstHandle.press("ArrowUp")
  await expect(items).toContainText([firstContent, secondContent])
  await firstSelection.press("Escape")
  await expect(firstSelection).toHaveAttribute("aria-pressed", "false")

  const secondBox = await visibleBox(secondItem)

  await firstHandle.hover()
  await page.mouse.down()
  await page.mouse.move(
    secondBox.x + secondBox.width / 2,
    secondBox.y + secondBox.height - 2,
  )
  await page.mouse.up()

  await expect(items).toContainText([secondContent, firstContent])
  await expect(firstSelection).toHaveAttribute("aria-pressed", "true")
  await expect(panel.getByRole("button", { name: "위로" })).toHaveCount(0)
  await expect(panel.getByRole("button", { name: "아래로" })).toHaveCount(0)
  await expect(panel.getByRole("button", { name: "실행 취소" })).toHaveCount(0)
  await expect(panel.getByRole("button", { name: "다시 실행" })).toHaveCount(0)
  await expect(panel.getByRole("region", { name: "합친 텍스트" })).toHaveCount(0)
  await expect(
    panel.getByRole("button", { name: /번째 일괄 복사 항목 동작$/u }),
  ).toHaveCount(2)

  const panelBox = await visibleBox(panel)
  await firstHandle.hover()
  await page.mouse.down()
  await page.mouse.move(panelBox.x + panelBox.width / 2, panelBox.y + 10)
  await page.mouse.up()
  await expect(items).toHaveCount(2)
  await expect(items).toContainText([secondContent, firstContent])

  await firstItem.getByRole("button", {
    name: /번째 일괄 복사 항목 동작$/u,
  }).click()
  await page.getByRole("button", { exact: true, name: "삭제" }).click()
  await expect(firstItem).toHaveCount(0)
  await expect(
    panel.getByRole("button", { exact: true, name: "복사" }),
  ).toBeEnabled()
  await page.keyboard.press("ControlOrMeta+z")
  await expect(firstItem).toBeVisible()
  await expect(firstSelection).toHaveAttribute("aria-pressed", "false")

  await firstHandle.hover()
  await page.mouse.down()
  await page.mouse.move(panelBox.x - 12, panelBox.y + panelBox.height / 2)
  await page.mouse.up()
  await expect(firstItem).toHaveCount(0)
  await expect(
    panel.getByRole("button", { exact: true, name: "복사" }),
  ).toBeEnabled()
  await secondItem.getByRole("button", {
    name: `일괄 복사 항목 선택: ${secondContent}`,
  }).press("ControlOrMeta+z")
  await expect(firstItem).toBeVisible()
  await expect(firstSelection).toHaveAttribute("aria-pressed", "false")
  await firstSelection.click()
  await expect(firstSelection).toHaveAttribute("aria-pressed", "true")
  await page.keyboard.press("ControlOrMeta+Shift+z")
  await expect(firstItem).toHaveCount(0)
  await expect(
    panel.getByRole("button", { exact: true, name: "복사" }),
  ).toBeEnabled()
  await secondItem.getByRole("button", {
    name: `일괄 복사 항목 선택: ${secondContent}`,
  }).press("ControlOrMeta+z")
  await expect(firstItem).toBeVisible()
  await expect(firstSelection).toHaveAttribute("aria-pressed", "false")

  await page.setViewportSize({ height: 720, width: 1000 })
  const dialog = page.getByRole("dialog", { name: "일괄 복사" })
  await expect(dialog).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  const batchCopyTrigger = page.getByRole("button", { name: "일괄 복사 2개" })
  await batchCopyTrigger.focus()
  await batchCopyTrigger.press("Enter")
  await expect(dialog).toBeVisible()
  const modalSelection = dialog.getByRole("button", {
    name: `일괄 복사 항목 선택: ${secondContent}`,
  })
  await modalSelection.click()
  await modalSelection.press("Escape")
  await expect(modalSelection).toHaveAttribute("aria-pressed", "false")
  await expect(dialog).toBeVisible()
  await modalSelection.press("Escape")
  await expect(dialog).toHaveCount(0)

  await batchCopyTrigger.focus()
  await batchCopyTrigger.press("Enter")
  const firstModalSelection = dialog.getByRole("button", {
    name: `일괄 복사 항목 선택: ${firstContent}`,
  })
  await firstModalSelection.click()
  await expect(firstModalSelection).toHaveAttribute("aria-pressed", "true")
  await dialog
    .getByRole("button", { name: "일괄 복사 패널 닫기" })
    .click()
  await expect(dialog).toHaveCount(0)

  await page.setViewportSize({ height: 720, width: 320 })
  await page.getByRole("button", { name: "탐색 열기" }).click()
  const managementLink = page.getByRole("link", { name: "일괄 복사 2개 관리" })
  await expect(managementLink).toBeVisible()
  await managementLink.click()
  await expect(page).toHaveURL("/batch-copy/")
  const management = page.getByRole("region", {
    name: "일괄 복사 항목 관리",
  })
  const managementItems = management.getByRole("listitem")
  await expect(managementItems).toContainText([secondContent, firstContent])
  await managementItems
    .filter({ hasText: firstContent })
    .getByRole("button", { name: /번째 일괄 복사 항목 이동$/u })
    .press("ArrowUp")
  await expect(managementItems).toContainText([firstContent, secondContent])

  await managementItems
    .filter({ hasText: firstContent })
    .getByRole("button", { name: /번째 일괄 복사 항목 동작$/u })
    .click()
  const managementSheet = page.getByRole("dialog", {
    name: /번째 일괄 복사 항목$/u,
  })
  await expect(managementSheet).toBeVisible()
  await managementSheet.getByRole("button", { exact: true, name: "삭제" }).click()
  await expect(managementSheet).toBeHidden()
  await page.getByRole("link", { exact: true, name: "취소" }).click()
  await page.setViewportSize({ height: 720, width: 1000 })
  const remainingBatchCopyTrigger = page.getByRole("button", {
    name: "일괄 복사 1개",
  })
  await remainingBatchCopyTrigger.focus()
  await remainingBatchCopyTrigger.press("Enter")
  await expect(dialog).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)

  await page.keyboard.press("ControlOrMeta+z")
  await expect(page.getByRole("button", { name: "일괄 복사 2개" })).toBeVisible()
  await page.setViewportSize({ height: 720, width: 320 })
  await page.getByRole("button", { name: "탐색 열기" }).click()
  await page.getByRole("link", { name: "일괄 복사 2개 관리" }).click()
  await expect(managementItems).toContainText([firstContent, secondContent])
  await page.reload()
  await expect(managementItems).toContainText([firstContent, secondContent])
})

test.describe("320px 일괄 복사", () => {
  test.use({ hasTouch: true, viewport: { height: 720, width: 320 } })

  test("긴 목록을 스크롤해도 확인과 관리 화면의 하단 동작을 사용할 수 있다", async ({
    page,
  }) => {
    const contents = fc.sample(
      fc.uniqueArray(fc.stringMatching(/^[a-z]{64,72}$/u), {
        minLength: 5,
        maxLength: 5,
      }),
      1,
    )[0]

    await page.setViewportSize({ height: 720, width: 1000 })

    for (const content of contents) {
      const note = await createNoteThroughUi(page, content)
      await note
        .getByRole("textbox", { name: "메모 내용" })
        .click({ modifiers: ["Meta", "Alt"] })
    }

    await page.setViewportSize({ height: 720, width: 320 })
    await page.goto("/batch-copy/")
    const managementItems = page
      .getByRole("region", { name: "일괄 복사 항목 관리" })
      .getByRole("listitem")
    await expect(managementItems).toHaveCount(contents.length)
    const managementCopy = page.getByRole("button", {
      exact: true,
      name: "복사",
    })
    const managementBefore = await visibleBox(managementCopy)
    const finalManagedItem = managementItems.filter({
      hasText: contents.at(-1)!,
    })
    await finalManagedItem.scrollIntoViewIfNeeded()
    await expect(finalManagedItem).toBeInViewport()
    const managementAfter = await visibleBox(managementCopy)
    expect(managementAfter.y).toBeCloseTo(managementBefore.y, 0)
    await managementCopy.click()
    await expect(page.getByRole("button", { name: "알림 닫기" })).toBeVisible()

    await page.goto("/")
    await page.getByRole("button", { name: "일괄 복사 시작" }).click()

    for (const content of contents) {
      await page
        .getByRole("article")
        .filter({ hasText: content })
        .getByRole("button", { name: `${content} 일괄 복사에 추가` })
        .click()
    }

    await page
      .getByRole("button", { name: `다음, ${contents.length}회 선택` })
      .click()
    await expect(page).toHaveURL("/batch-copy/")
    const confirmationItems = page.getByRole("article", {
      name: /번째 일괄 복사 항목$/u,
    })
    await expect(confirmationItems).toHaveCount(contents.length)
    const cancel = page.getByRole("button", { exact: true, name: "취소" })
    const confirmationCopy = page.getByRole("button", {
      name: "일괄 복사하기",
    })
    const cancelBefore = await visibleBox(cancel)
    const copyBefore = await visibleBox(confirmationCopy)
    const finalConfirmationItem = confirmationItems.filter({
      hasText: contents.at(-1)!,
    })
    await finalConfirmationItem.scrollIntoViewIfNeeded()
    await expect(finalConfirmationItem).toBeInViewport()
    const cancelAfter = await visibleBox(cancel)
    const copyAfter = await visibleBox(confirmationCopy)
    expect(cancelAfter.y).toBeCloseTo(cancelBefore.y, 0)
    expect(copyAfter.y).toBeCloseTo(copyBefore.y, 0)
    await confirmationCopy.click()
    await expect(page.getByRole("button", { name: "알림 닫기" })).toBeVisible()
    await cancel.click()
    await expect(page).toHaveURL("/")
  })

  test("선택 횟수를 초기화하고 확인 화면에서 복제, 이동과 삭제를 적용한다", async ({
    page,
  }) => {
    await setReorderButtons(page, true)
    await page.goto("/")
    const firstContent = "모바일 첫 번째 메모"
    const secondContent = "모바일 두 번째 메모"
    const firstNote = await createMobileNoteThroughUi(page, firstContent)
    const secondNote = await createMobileNoteThroughUi(page, secondContent)

    await page.getByRole("button", { name: "일괄 복사 시작" }).click()
    const firstEntry = firstNote.getByRole("button", { name: `${firstContent} 일괄 복사에 추가` })
    const secondEntry = secondNote.getByRole("button", { name: `${secondContent} 일괄 복사에 추가` })
    await firstEntry.click()
    await expect(page.getByRole("button", { name: "다음, 1회 선택" })).toBeEnabled()
    await page.getByRole("button", { name: "초기화" }).click()
    await expect(page.getByRole("button", { name: "다음, 0회 선택" })).toBeDisabled()

    await firstEntry.click()
    await firstEntry.click()
    await secondEntry.click()
    const next = page.getByRole("button", { name: "다음, 3회 선택" })
    await expect(next).toBeEnabled()
    await next.click()
    await expect(page).toHaveURL("/batch-copy/")

    let entries = page.getByRole("article", {
      name: /번째 일괄 복사 항목$/u,
    })
    await expect(entries).toContainText([
      firstContent,
      firstContent,
      secondContent,
    ])

    const firstAction = page.getByRole("button", {
      name: "1번째 일괄 복사 항목 동작",
    })
    await firstAction.click()
    const sheet = page.getByRole("dialog", {
      name: /번째 일괄 복사 항목$/u,
    })
    await expect(sheet).toBeVisible()
    await sheet.getByRole("button", { exact: true, name: "복제" }).click()
    await expect(sheet).toBeHidden()
    entries = page.getByRole("article", { name: /번째 일괄 복사 항목$/u })
    await expect(entries).toHaveCount(4)
    await expect(entries).toContainText([
      firstContent,
      firstContent,
      firstContent,
      secondContent,
    ])

    const duplicatedAction = page.getByRole("button", {
      name: "2번째 일괄 복사 항목 동작",
    })
    await duplicatedAction.click()
    await sheet.getByRole("button", { exact: true, name: "삭제" }).click()
    await expect(sheet).toBeHidden()
    await expect(entries).toHaveCount(3)
    await expect(entries).toContainText([
      firstContent,
      firstContent,
      secondContent,
    ])

    const lastAction = page.getByRole("button", {
      name: "3번째 일괄 복사 항목 동작",
    })
    await lastAction.click()
    await sheet.getByRole("button", { exact: true, name: "위로 이동" }).click()
    await entries
      .filter({ hasText: secondContent })
      .getByRole("button", { name: /번째 일괄 복사 항목 동작$/u })
      .click()
    await sheet.getByRole("button", { exact: true, name: "위로 이동" }).click()
    await expect(entries).toContainText([
      secondContent,
      firstContent,
      firstContent,
    ])

    const movedAction = page.getByRole("button", {
      name: "1번째 일괄 복사 항목 동작",
    })
    await movedAction.click()
    await page.keyboard.press("Escape")
    await expect(movedAction).toBeFocused()
    await movedAction.click()
    const headingBox = await visibleBox(page.getByRole("heading", {
      name: "일괄 복사 확인",
    }))
    await page.mouse.click(
      headingBox.x + headingBox.width / 2,
      headingBox.y + headingBox.height / 2,
    )
    await expect(movedAction).toBeFocused()

    await movedAction.click()
    await sheet.getByRole("button", { name: "동작 선택창 닫기" }).click()
    await expect(movedAction).toBeFocused()

    await page.getByRole("button", { exact: true, name: "취소" }).click()
    await expect(page).toHaveURL("/")
    await expect(page.getByRole("article").filter({ hasText: firstContent })).toBeVisible()
    await expect(page.getByRole("article").filter({ hasText: secondContent })).toBeVisible()
  })

  test("직접 이동 설정을 켜지 않은 확인 목록은 이동 아이콘 없이 시트 동작을 제공한다", async ({
    page,
  }) => {
    const firstContent = `시트 첫 메모 ${crypto.randomUUID()}`
    const secondContent = `시트 둘째 메모 ${crypto.randomUUID()}`
    const firstNote = await createMobileNoteThroughUi(page, firstContent)
    const secondNote = await createMobileNoteThroughUi(page, secondContent)

    await page.getByRole("button", { name: "일괄 복사 시작" }).click()
    await firstNote.getByRole("button", {
      name: `${firstContent} 일괄 복사에 추가`,
    }).click()
    await secondNote.getByRole("button", {
      name: `${secondContent} 일괄 복사에 추가`,
    }).click()
    await page.getByRole("button", { name: "다음, 2회 선택" }).click()

    const firstAction = page.getByRole("button", {
      name: "1번째 일괄 복사 항목 동작",
    })
    await firstAction.click()
    const sheet = page.getByRole("dialog", {
      name: "1번째 일괄 복사 항목",
    })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole("button", { name: "위로 이동" })).toHaveCount(0)
    await expect(sheet.getByRole("button", { name: "아래로 이동" })).toHaveCount(0)
    await expect(sheet.getByRole("button", { name: "복제" })).toBeVisible()
    await expect(sheet.getByRole("button", { name: "삭제" })).toBeVisible()
    await sheet.getByRole("button", { name: "동작 선택창 닫기" }).click()
    await expect(firstAction).toBeFocused()

    await firstAction.click()
    await page.keyboard.press("Escape")
    await expect(firstAction).toBeFocused()
    await expect(page.getByRole("article", {
      name: /번째 일괄 복사 항목$/u,
    })).toContainText([firstContent, secondContent])
  })

  test("확인 작업을 새로고침 뒤 복원하고 뒤로가기와 취소를 구분한다", async ({
    page,
  }) => {
    const content = "복원할 모바일 일괄 복사 메모"
    const secondContent = "순서를 복원할 두 번째 메모"
    const note = await createMobileNoteThroughUi(page, content)
    const secondNote = await createMobileNoteThroughUi(page, secondContent)

    await page.getByRole("button", { name: "일괄 복사 시작" }).click()
    const entry = note.getByRole("button", { name: `${content} 일괄 복사에 추가` })
    const secondEntry = secondNote.getByRole("button", {
      name: `${secondContent} 일괄 복사에 추가`,
    })
    await entry.click()
    await entry.click()
    await secondEntry.click()
    await expect(
      page.getByRole("button", { name: "다음, 3회 선택" }),
    ).toBeEnabled()
    await page.reload()

    await expect(
      page.getByRole("button", { name: "일괄 복사 이어가기" }),
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "새 메모" })).toBeVisible()
    await expect(page.getByRole("button", { name: "일괄 복사 끝내기" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "초기화" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /다음, \d+회 선택/u })).toHaveCount(0)

    await page.goto("/batch-copy/")
    await expect(page).toHaveURL("/")
    await expect(
      page.getByRole("button", { name: "일괄 복사 이어가기" }),
    ).toBeVisible()
    await expect(
      page.getByRole("region", { name: "일괄 복사 항목 관리" }),
    ).toHaveCount(0)

    await page.getByRole("button", { name: "일괄 복사 이어가기" }).click()
    await page.getByRole("button", { name: "다음, 3회 선택" }).click()
    await expect(page).toHaveURL("/batch-copy/")
    await page.reload()

    let confirmationEntries = page.getByRole("article", {
      name: /번째 일괄 복사 항목$/u,
    })
    await expect(confirmationEntries).toHaveCount(3)
    await expect(confirmationEntries).toContainText([
      content,
      content,
      secondContent,
    ])

    await page
      .getByRole("button", { name: "메모 선택으로 돌아가기" })
      .click()
    await expect(page).toHaveURL("/")
    await expect(page.getByRole("button", { name: "다음, 3회 선택" })).toBeEnabled()

    await page.getByRole("button", { name: "다음, 3회 선택" }).click()
    confirmationEntries = page.getByRole("article", {
      name: /번째 일괄 복사 항목$/u,
    })
    await expect(confirmationEntries).toHaveCount(3)
    await expect(confirmationEntries).toContainText([
      content,
      content,
      secondContent,
    ])

    await page.goBack()
    await expect(page).toHaveURL("/")
    await expect(page.getByRole("button", { name: "새 메모" })).toBeVisible()
    await expect(
      page.getByRole("button", { name: "일괄 복사 계속하기" }),
    ).toBeVisible()
    await expect(
      page.getByRole("region", { name: "일괄 복사 항목 관리" }),
    ).toHaveCount(0)
    await expect(page.getByRole("button", { name: "초기화" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /다음, \d+회 선택/u })).toHaveCount(0)

    await page.getByRole("button", { name: "일괄 복사 계속하기" }).click()
    await expect(page).toHaveURL("/batch-copy/")
    confirmationEntries = page.getByRole("article", {
      name: /번째 일괄 복사 항목$/u,
    })
    await expect(confirmationEntries).toHaveCount(3)
    await expect(confirmationEntries).toContainText([
      content,
      content,
      secondContent,
    ])

    await page.getByRole("button", { exact: true, name: "취소" }).click()
    await expect(page).toHaveURL("/")
    await page.reload()
    await expect(page.getByRole("button", { name: "일괄 복사 시작" })).toBeVisible()
    await expect(page.getByRole("button", { name: /다음, \d+회 선택/u })).toHaveCount(0)
    await expect(page.getByRole("article").filter({ hasText: content })).toBeVisible()
    await expect(page.getByRole("article").filter({ hasText: secondContent })).toBeVisible()
  })
})
