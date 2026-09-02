import {
  expect,
  test,
  type CDPSession,
  type Locator,
} from "@playwright/test"

import { createMobileNoteThroughUi } from "./support/create-note-through-ui"

type TouchPoint = {
  x: number
  y: number
}

async function center(locator: Locator): Promise<TouchPoint> {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error("Visible touch target has no bounding box")
  }

  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  }
}

function startTouch(session: CDPSession, point: TouchPoint) {
  return session.send("Input.dispatchTouchEvent", {
    touchPoints: [point],
    type: "touchStart",
  })
}

function moveTouch(session: CDPSession, point: TouchPoint) {
  return session.send("Input.dispatchTouchEvent", {
    touchPoints: [point],
    type: "touchMove",
  })
}

function endTouch(session: CDPSession) {
  return session.send("Input.dispatchTouchEvent", {
    touchPoints: [],
    type: "touchEnd",
  })
}

test("메모를 길게 눌러 복사하고 확인 항목을 길게 누른 뒤 끌어 순서를 바꾼다", async ({
  context,
  page,
}) => {
  await page.clock.install()
  await page.goto("/")
  const firstContent = "길게 누를 첫 번째 메모"
  const secondContent = "길게 누를 두 번째 메모"
  const firstNote = await createMobileNoteThroughUi(page, firstContent)
  const secondNote = await createMobileNoteThroughUi(page, secondContent)
  const session = await context.newCDPSession(page)
  const firstLink = firstNote.getByRole("link", { name: "메모 열기" })
  const firstPoint = await center(firstLink)

  await startTouch(session, firstPoint)
  await page.clock.fastForward(500)
  await endTouch(session)
  await expect(
    page.getByRole("status").filter({ hasText: "복사했습니다." }),
  ).toBeVisible()
  await expect(page).toHaveURL("/")
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(firstContent)
  await page.getByRole("button", { name: "알림 닫기" }).click()

  await page.getByRole("button", { name: "일괄 복사 시작" }).click()
  await firstNote.getByRole("link", { name: "일괄 복사에 추가" }).click()
  await secondNote.getByRole("link", { name: "일괄 복사에 추가" }).click()
  await page.getByRole("button", { name: "다음, 2회 선택" }).click()

  const firstEntry = page.getByRole("article", {
    name: "1번째 일괄 복사 항목",
  })
  const secondEntry = page.getByRole("article", {
    name: "2번째 일괄 복사 항목",
  })
  const dragStart = await center(firstEntry)
  const dragEnd = await center(secondEntry)

  await startTouch(session, dragStart)
  await page.clock.fastForward(500)
  await expect(page.getByRole("status")).toContainText("1번째 위치로 이동 중")
  await moveTouch(session, dragEnd)
  await expect(page.getByRole("status")).toContainText("2번째 위치로 이동 중")
  await endTouch(session)

  await expect(
    page.getByRole("article", { name: /번째 일괄 복사 항목$/u }),
  ).toContainText([secondContent, firstContent])
})
