import {
  expect,
  test,
  type CDPSession,
  type Locator,
  type Page,
} from "@playwright/test"

import { createMobileNoteThroughUi } from "./support/create-note-through-ui"
import {
  preparePointerCaptureRelease,
  releasePointerCapture,
} from "./support/pointer-capture"

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

function cancelTouch(session: CDPSession) {
  return session.send("Input.dispatchTouchEvent", {
    touchPoints: [],
    type: "touchCancel",
  })
}

async function expectCopyCancelled(page: Page) {
  await expect(page).toHaveURL("/")
  await expect(
    page.getByRole("status").filter({ hasText: "복사했습니다." }),
  ).toHaveCount(0)
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
  const firstLink = firstNote.getByRole("button", { name: `${firstContent} 복사` })

  await secondNote.getByRole("button", { name: `${secondContent} 복사` }).click()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(secondContent)
  await firstNote.getByRole("link", { name: `${firstContent} 수정` }).click()
  await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(firstContent)
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(secondContent)
  await page.getByRole("link", { name: "메모 목록" }).click()
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

  await page.getByRole("button", { name: "일괄 복사 시작" }).click()
  const firstBatchLink = firstNote.getByRole("button", {
    name: `${firstContent} 일괄 복사에 추가`,
  })
  const batchLongPressPoint = await center(firstBatchLink)
  await startTouch(session, batchLongPressPoint)
  await page.clock.fastForward(500)
  await endTouch(session)
  await expect(page.getByRole("button", { name: "다음, 0회 선택" })).toBeDisabled()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(firstContent)

  await firstBatchLink.click()
  await secondNote.getByRole("button", { name: `${secondContent} 일괄 복사에 추가` }).click()
  await page.getByRole("button", { name: "다음, 2회 선택" }).click()

  const firstEntry = page.getByRole("article", {
    name: "1번째 일괄 복사 항목",
  })
  const secondEntry = page.getByRole("article", {
    name: "2번째 일괄 복사 항목",
  })
  const firstHandle = firstEntry.getByRole("button", {
    name: "1번째 일괄 복사 항목 이동",
  })
  const dragStart = await center(firstHandle)
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

  const reorderedEntries = page.getByRole("article", {
    name: /번째 일괄 복사 항목$/u,
  })
  const cancellationTarget = reorderedEntries.filter({
    hasText: secondContent,
  })
  const cancellationHandle = cancellationTarget.getByRole("button", {
    name: "1번째 일괄 복사 항목 이동",
  })
  const outsideDragStart = await center(cancellationHandle)
  await startTouch(session, outsideDragStart)
  await page.clock.fastForward(500)
  await moveTouch(session, { x: outsideDragStart.x, y: 20 })
  await expect(page.getByRole("status")).toContainText("놓을 수 없는 위치")
  await endTouch(session)
  await expect(reorderedEntries).toContainText([secondContent, firstContent])

  const cancellationPoint = await center(cancellationHandle)
  await startTouch(session, cancellationPoint)
  await page.clock.fastForward(500)
  await expect(page.getByRole("status")).toContainText("1번째 위치로 이동 중")
  await cancelTouch(session)
  await expect(page.getByRole("status")).not.toContainText("이동 중")
  await expect(reorderedEntries).toContainText([secondContent, firstContent])

  const capturePoint = await center(cancellationHandle)
  await preparePointerCaptureRelease(page)
  await startTouch(session, capturePoint)
  await page.clock.fastForward(500)
  await releasePointerCapture(page)
  await endTouch(session)
  await expect(page.getByRole("status")).not.toContainText("이동 중")
  await expect(reorderedEntries).toContainText([secondContent, firstContent])

  const scrollPoint = await center(cancellationHandle)
  await startTouch(session, scrollPoint)
  await moveTouch(session, { x: scrollPoint.x, y: scrollPoint.y + 20 })
  await page.clock.fastForward(500)
  await endTouch(session)
  await expect(page.getByRole("status")).not.toContainText("이동 중")
  await expect(reorderedEntries).toContainText([secondContent, firstContent])
})

test("메모 길게 누르기는 이동, 취소와 pointer capture 상실에서 중단된다", async ({
  context,
  page,
}) => {
  await page.clock.install()
  await page.goto("/")
  const content = "취소 조건을 확인할 메모"
  const note = await createMobileNoteThroughUi(page, content)
  const session = await context.newCDPSession(page)
  const link = note.getByRole("button", { name: `${content} 복사` })
  const point = await center(link)

  await startTouch(session, point)
  await moveTouch(session, { x: point.x, y: point.y + 20 })
  await page.clock.fastForward(500)
  await endTouch(session)
  await expectCopyCancelled(page)

  const cancelPoint = await center(link)
  await startTouch(session, cancelPoint)
  await page.clock.fastForward(500)
  await cancelTouch(session)
  await expectCopyCancelled(page)

  const capturePoint = await center(link)
  await preparePointerCaptureRelease(page)
  await startTouch(session, capturePoint)
  await releasePointerCapture(page)
  await page.clock.fastForward(500)
  await endTouch(session)
  await expectCopyCancelled(page)
  await expect(page.getByRole("article").filter({ hasText: content })).toBeVisible()

  const nextTapPoint = await center(link)
  await startTouch(session, nextTapPoint)
  await endTouch(session)
  await expect(page).toHaveURL("/")
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(content)
})
