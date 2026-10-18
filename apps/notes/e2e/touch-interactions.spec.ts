import {
  chromium,
  expect,
  test,
  type CDPSession,
  type Locator,
  type Page,
} from "@playwright/test"

import { addMobileNoteToBatch, createMobileNoteThroughUi, openMobileNoteEditor, readMobileNoteEditHref } from "./support/create-note-through-ui"
import { noteIdFromHref, readStoredNote } from "./support/read-stored-note"
import {
  preparePointerCaptureRelease,
  releasePointerCapture,
} from "./support/pointer-capture"

type TouchPoint = {
  x: number
  y: number
}

async function center(locator: Locator, verticalFraction = 0.5, horizontalFraction = 0.5): Promise<TouchPoint> {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()

  if (box === null) {
    throw new Error("Visible touch target has no bounding box")
  }

  return {
    x: box.x + box.width * horizontalFraction,
    y: box.y + box.height * verticalFraction,
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

async function holdAndReleaseTouch(
  session: CDPSession,
  page: Page,
  point: TouchPoint,
  duration: number,
  movement: number,
) {
  await startTouch(session, point)
  if (movement > 0) {
    await moveTouch(session, { x: point.x, y: point.y + movement })
  }
  await page.clock.fastForward(duration)
  await endTouch(session)
}

test("짧은 터치는 복사하고 긴 터치는 손을 떼기 전에 한 번씩 추가한다", async ({ context, page }) => {
  await page.clock.install()
  await page.goto("/")
  const firstContent = `짧은 복사 ${crypto.randomUUID()}`
  const secondContent = `긴 추가 ${crypto.randomUUID()}`
  const first = await createMobileNoteThroughUi(page, firstContent)
  const second = await createMobileNoteThroughUi(page, secondContent)
  await first.getByRole("button", { name: `${firstContent} 복사` }).tap()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(firstContent)
  await openMobileNoteEditor(page, second)
  await expect(page.getByRole("textbox", { name: "메모 내용" })).toHaveValue(secondContent)
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(firstContent)
  await page.getByRole("link", { exact: true, name: "메모 목록" }).click()
  const session = await context.newCDPSession(page)
  const body = second.getByRole("button", { name: `${secondContent} 복사` })
  const originalBox = await body.boundingBox()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  for (let count = 1; count <= 2; count += 1) {
    await startTouch(session, await center(body))
    const outline = await second.evaluate((element) => {
      const style = getComputedStyle(element)
      return { color: style.outlineColor, width: Number.parseFloat(style.outlineWidth) }
    })
    expect(outline.width).toBeGreaterThanOrEqual(3)
    expect(outline.color).not.toBe("rgba(0, 0, 0, 0)")
    expect(await body.boundingBox()).toEqual(originalBox)
    await page.clock.fastForward(499)
    await expect(page.getByRole("link", { name: `일괄 복사 확인, ${count - 1}개` })).toBeVisible()
    await page.clock.fastForward(1)
    await expect(page.getByRole("link", { name: `일괄 복사 확인, ${count}개` })).toHaveText(String(count))
    await expect(second).toHaveCSS("outline-width", "3px")
    await page.clock.fastForward(1000)
    await expect(page.getByRole("link", { name: `일괄 복사 확인, ${count}개` })).toHaveText(String(count))
    await endTouch(session)
    await expect(page.getByRole("link", { name: `일괄 복사 확인, ${count}개` })).toHaveText(String(count))
    await expect(second).toHaveCSS("outline-style", "none")
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(firstContent)
  }
  await page.clock.resume()
  await page.getByRole("link", { name: "일괄 복사 확인, 2개" }).tap()
  await expect(page.getByRole("article", { name: /번째 일괄 복사 항목$/u })).toContainText([secondContent, secondContent])
})

test("메인과 확인 카드의 핸들 포커스와 실제 드래그 표시를 통일한다", async ({ context, page }, testInfo) => {
  await page.goto("/")
  const contents = [`카드 ${crypto.randomUUID().slice(0, 8)}`, `여러 줄 카드 비교 원문\n다음 줄 내용 ${crypto.randomUUID()}`]
  const first = await createMobileNoteThroughUi(page, contents[0])
  const second = await createMobileNoteThroughUi(page, contents[1])
  const session = await context.newCDPSession(page)

  async function appearance(card: Locator) {
    return card.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        background: style.backgroundColor,
        border: style.borderColor,
        font: style.fontSize,
        height: element.getBoundingClientRect().height,
        gap: style.gap,
        lineHeight: style.lineHeight,
        padding: style.padding,
        radius: style.borderRadius,
        shadow: style.boxShadow,
      }
    })
  }

  async function inspectDrag(card: Locator, destination: Locator, screenshot: string) {
    const handle = card.getByRole("button", { name: / 이동$/u })
    const [cardCenter, handleCenter] = await Promise.all([center(card), center(handle)])
    expect(handleCenter.y).toBeCloseTo(cardCenter.y, 1)
    async function verticalGap() {
      const [source, target] = await Promise.all([center(card, 0), center(destination, 0)])
      return source.y - target.y
    }
    const idle = await appearance(card)
    await handle.tap()
    await expect(card).toHaveCSS("outline-style", "none")
    await expect(handle).toHaveCSS("outline-style", "none")
    await handle.press("Tab")
    await page.keyboard.press("Shift+Tab")
    await expect(handle).toBeFocused()
    await expect(handle).toHaveCSS("outline-style", "solid")
    const iconColor = await handle.evaluate((element) => getComputedStyle(element).color)
    await expect(handle).toHaveCSS("outline-color", iconColor)
    await handle.tap()
    await expect(handle).toHaveCSS("outline-style", "none")
    const idleGap = await verticalGap()
    await startTouch(session, await center(handle))
    await moveTouch(session, await center(destination, 0.8))
    await expect.poll(verticalGap).toBeLessThan(idleGap)
    await expect(card).not.toHaveCSS("box-shadow", "none")
    await card.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished))
    })
    const dragging = await appearance(card)
    expect(dragging.border).not.toBe(idle.border)
    await page.screenshot({ path: testInfo.outputPath(screenshot) })
    await cancelTouch(session)
    await expect.poll(verticalGap).toBeCloseTo(idleGap, 1)
    await expect(card).toHaveCSS("box-shadow", idle.shadow)
    return { dragging, idle }
  }

  const main = await inspectDrag(first, second, "main-card-drag.png")
  await expect(page.getByRole("article")).toContainText(contents)
  await addMobileNoteToBatch(page, first)
  await addMobileNoteToBatch(page, second)
  await page.getByRole("link", { name: `일괄 복사 확인, ${contents.length}개` }).tap()
  const entries = page.getByRole("article", { name: /번째 일괄 복사 항목$/u })
  const confirmation = await inspectDrag(entries.filter({ hasText: contents[0] }), entries.filter({ hasText: contents[1] }), "confirmation-card-drag.png")
  expect(confirmation).toEqual(main)
  await expect(entries).toContainText(contents)
})

test("메모 누르기의 시간과 이동 기준 및 취소에서 추가와 복사를 구분한다", async ({ context, page }) => {
  await page.clock.install()
  await page.goto("/")
  const content = `누르기 기준 ${crypto.randomUUID()}`
  const note = await createMobileNoteThroughUi(page, content)
  const body = note.getByRole("button", { name: `${content} 복사` })
  const session = await context.newCDPSession(page)
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  await holdAndReleaseTouch(session, page, await center(body), 499, 0)
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(content)
  await expect(page.getByRole("link", { name: "일괄 복사 확인, 0개" })).toBeDisabled()
  await holdAndReleaseTouch(session, page, await center(body), 500, 9)
  await expect(page.getByRole("link", { name: "일괄 복사 확인, 1개" })).toBeEnabled()
  await holdAndReleaseTouch(session, page, await center(body), 500, 11)
  const edge = await center(body, 0.5, 1)
  edge.x -= 2
  await startTouch(session, edge)
  await moveTouch(session, { x: edge.x + 5, y: edge.y })
  await page.clock.fastForward(500)
  await endTouch(session)
  await startTouch(session, await center(body))
  await page.clock.fastForward(499)
  await cancelTouch(session)
  await page.clock.fastForward(1)
  await preparePointerCaptureRelease(page)
  await startTouch(session, await center(body))
  await releasePointerCapture(page)
  await page.clock.fastForward(500)
  await endTouch(session)
  await startTouch(session, await center(body))
  await page.evaluate(() => { window.dispatchEvent(new Event("blur")) })
  await page.clock.fastForward(500)
  await endTouch(session)
  await expect(page.getByRole("link", { name: "일괄 복사 확인, 1개" })).toHaveText("1")
  await startTouch(session, await center(body))
  await page.clock.fastForward(500)
  await expect(page.getByRole("link", { name: "일괄 복사 확인, 2개" })).toHaveText("2")
  await cancelTouch(session)
  await page.clock.fastForward(1000)
  await expect(page.getByRole("link", { name: "일괄 복사 확인, 2개" })).toHaveText("2")
  await expect(note).toHaveCSS("outline-style", "none")
  await page.clock.resume()
  await body.tap()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(content)
  await page.getByRole("button", { name: "탐색 열기" }).tap()
  await page.getByRole("link", { exact: true, name: "사용 빈도" }).tap()
  const row = page.getByRole("row").filter({ hasText: content })
  await expect(row.getByRole("cell", { name: "개별 복사 2회" })).toBeVisible()
  await expect(row.getByRole("cell", { name: "일괄 복사 2회" })).toBeVisible()
})

test("네 메모의 비인접 삽입을 브라우저 재실행 후에도 유지하고 데스크톱 자료를 보존한다", async ({ baseURL }, testInfo) => {
  const profile = testInfo.outputPath("mobile-order-profile")
  const options = { baseURL, hasTouch: true, viewport: { height: 720, width: 320 } }
  let context = await chromium.launchPersistentContext(profile, options)
  try {
  let page = await context.newPage()
  await page.goto("/")
  const contents = Array.from({ length: 4 }, (_, index) => `순서 ${index + 1} ${crypto.randomUUID()}`)
  const before = []
  for (const content of contents) {
    const note = await createMobileNoteThroughUi(page, content)
    const id = noteIdFromHref(await readMobileNoteEditHref(page, note))
    before.push({ id, stored: await readStoredNote(page, id) })
  }
  let notes = page.getByRole("article")
  const session = await context.newCDPSession(page)
  async function dragFirstToLast() {
    const handle = notes.filter({ hasText: contents[0] }).getByRole("button", { name: / 이동$/u })
    const destination = await center(notes.filter({ hasText: contents[3] }), 0.8)
    await startTouch(session, await center(handle))
    await moveTouch(session, destination)
    await endTouch(session)
  }
  await dragFirstToLast()
  const expected = [contents[1], contents[2], contents[3], contents[0]]
  await expect(notes).toContainText(expected)
  await expect(notes.filter({ hasText: contents[0] }).getByRole("button", { name: / 이동$/u })).toHaveCSS("outline-style", "none")
  await page.reload()
  await expect(notes).toContainText(expected)
  for (const { id, stored } of before) expect(await readStoredNote(page, id)).toEqual(stored)
  await context.close()
  context = await chromium.launchPersistentContext(profile, options)
  page = await context.newPage()
  await page.goto("/")
  notes = page.getByRole("article")
  await expect(notes).toContainText(expected)
  await page.setViewportSize({ height: 900, width: 1280 })
  await expect.poll(() => page.getByRole("textbox", { name: "메모 내용" }).evaluateAll((editors) => editors.map((editor) => (editor as HTMLTextAreaElement).value))).toEqual(contents)
  for (const { id, stored } of before) expect(await readStoredNote(page, id)).toEqual(stored)
  } finally { await context.close() }
})

test("확인 목록의 삽입과 취소 후 다음 드래그 및 전체 복사가 동작한다", async ({ context, page }) => {
  await page.goto("/")
  const contents = Array.from({ length: 4 }, (_, index) => `항목 ${index + 1} ${crypto.randomUUID()}`)
  for (const content of contents) await addMobileNoteToBatch(page, await createMobileNoteThroughUi(page, content))
  await page.getByRole("link", { name: "일괄 복사 확인, 4개" }).tap()
  const entries = page.getByRole("article", { name: /번째 일괄 복사 항목$/u })
  const session = await context.newCDPSession(page)
  const handle = entries.filter({ hasText: contents[0] }).getByRole("button", { name: / 항목 이동$/u })
  const destination = await center(entries.filter({ hasText: contents[3] }), 0.8)
  await startTouch(session, await center(handle))
  await moveTouch(session, destination)
  await cancelTouch(session)
  await expect(entries).toContainText(contents)
  await preparePointerCaptureRelease(page)
  await startTouch(session, await center(handle))
  await moveTouch(session, destination)
  await releasePointerCapture(page)
  await endTouch(session)
  await expect(entries).toContainText(contents)
  const start = await center(handle)
  await startTouch(session, start)
  await moveTouch(session, { x: start.x, y: 20 })
  await endTouch(session)
  await expect(entries).toContainText(contents)
  await startTouch(session, await center(handle))
  await moveTouch(session, destination)
  await endTouch(session)
  const expected = [contents[1], contents[2], contents[3], contents[0]]
  await expect(entries).toContainText(expected)
  await expect(handle).toHaveCSS("outline-style", "none")
  await page.getByRole("button", { name: "일괄 복사하기" }).tap()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expected.join("\n"))
})

test("낮은 모바일 화면에서도 항목 동작을 누르고 삭제 뒤 남은 항목으로 돌아간다", async ({ page }) => {
  await page.goto("/")
  const firstContent = `첫 동작 항목 ${crypto.randomUUID()}`
  const secondContent = `둘째 동작 항목 ${crypto.randomUUID()}`
  await addMobileNoteToBatch(page, await createMobileNoteThroughUi(page, firstContent))
  await addMobileNoteToBatch(page, await createMobileNoteThroughUi(page, secondContent))
  await page.getByRole("link", { name: "일괄 복사 확인, 2개" }).tap()
  await page.setViewportSize({ height: 360, width: 320 })
  await page.getByRole("button", { name: "1번째 일괄 복사 항목 동작" }).tap()
  const sheet = page.getByRole("dialog", { name: "1번째 일괄 복사 항목" })
  await sheet.getByRole("button", { name: "삭제" }).tap()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole("article", { name: /번째 일괄 복사 항목$/u })).toContainText([secondContent])
  const remainingAction = page.getByRole("button", { name: "1번째 일괄 복사 항목 동작" })
  await expect(remainingAction).toBeFocused()
  await remainingAction.tap()
  await sheet.getByRole("button", { name: "동작 선택창 닫기" }).tap()
  await expect(remainingAction).toBeFocused()
})

test("메모 삭제 단계는 같은 높이를 유지하고 5초 후에도 복원한다", async ({ page }) => {
  await page.goto("/")
  const content = `삭제와 복원 ${crypto.randomUUID()}`
  const note = await createMobileNoteThroughUi(page, content)
  await page.clock.install()
  const more = note.getByRole("button", { name: / 더보기$/u })
  await more.tap()
  const sheet = page.getByRole("dialog")
  const bounds = await sheet.boundingBox()
  await sheet.getByRole("button", { exact: true, name: "삭제" }).tap()
  await expect(sheet.getByRole("heading", { name: "메모 삭제", exact: true })).toBeVisible()
  expect((await sheet.getByRole("button", { exact: true, name: "삭제" }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
  expect(await sheet.boundingBox()).toEqual(bounds)
  await sheet.getByRole("button", { exact: true, name: "취소" }).tap()
  await expect(sheet.getByRole("link", { name: "수정" })).toBeVisible()
  expect(await sheet.boundingBox()).toEqual(bounds)
  await sheet.getByRole("button", { exact: true, name: "삭제" }).tap()
  await sheet.getByRole("button", { exact: true, name: "삭제" }).tap()
  await expect(sheet.getByText("메모를 삭제했습니다.", { exact: true })).toBeVisible()
  await expect(note).toHaveCount(0)
  expect(await sheet.boundingBox()).toEqual(bounds)
  await page.clock.fastForward(6000)
  await expect(sheet).toBeVisible()
  await sheet.getByRole("button", { name: "실행 취소" }).tap()
  await expect(sheet.getByRole("link", { name: "수정" })).toBeVisible()
  expect(await sheet.boundingBox()).toEqual(bounds)
  await sheet.getByRole("button", { name: "동작 선택창 닫기" }).tap()
  await expect(note).toBeVisible()
  await expect(more).toBeFocused()
  await more.tap()
  await sheet.getByRole("button", { exact: true, name: "삭제" }).tap()
  await sheet.getByRole("button", { exact: true, name: "삭제" }).tap()
  await expect(sheet.getByText("메모를 삭제했습니다.", { exact: true })).toBeVisible()
  await sheet.getByRole("button", { exact: true, name: "닫기" }).tap()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole("button", { name: "새 메모" })).toBeFocused()
})


test("삭제와 복원 저장 실패는 같은 시트에서 재시도하고 원문을 보존한다", async ({ page }) => {
  await page.goto("/")
  const content = `저장 실패 복구 ${crypto.randomUUID()}`
  const note = await createMobileNoteThroughUi(page, content)
  const id = noteIdFromHref(await readMobileNoteEditHref(page, note))
  const original = await readStoredNote(page, id)
  await page.evaluate(() => {
    const remove = IDBObjectStore.prototype.delete
    IDBObjectStore.prototype.delete = function (key) {
      if (this.name === "notes") {
        IDBObjectStore.prototype.delete = remove
        throw new DOMException("Controlled removal failure", "UnknownError")
      }
      return remove.call(this, key)
    }
  })
  await note.getByRole("button", { name: / 더보기$/u }).tap()
  const sheet = page.getByRole("dialog")
  const bounds = await sheet.boundingBox()
  await sheet.getByRole("button", { exact: true, name: "삭제" }).tap()
  await sheet.getByRole("button", { exact: true, name: "삭제" }).tap()
  await expect(sheet.getByRole("alert")).toContainText("삭제하지 못했습니다")
  expect(await sheet.boundingBox()).toEqual(bounds)
  expect(await readStoredNote(page, id)).toEqual(original)
  await sheet.getByRole("button", { exact: true, name: "삭제" }).tap()
  await expect(sheet.getByText("메모를 삭제했습니다.", { exact: true })).toBeVisible()
  expect(await readStoredNote(page, id)).toBeNull()
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore["put"]>) {
      if (this.name === "notes") {
        IDBObjectStore.prototype.put = put
        throw new DOMException("Controlled restoration failure", "UnknownError")
      }
      return put.apply(this, args)
    }
  })
  await sheet.getByRole("button", { name: "실행 취소" }).tap()
  await expect(sheet.getByRole("alert")).toContainText("복원하지 못했습니다")
  expect(await sheet.boundingBox()).toEqual(bounds)
  expect(await readStoredNote(page, id)).toBeNull()
  await sheet.getByRole("button", { name: "실행 취소" }).tap()
  await expect(sheet.getByRole("link", { name: "수정" })).toBeVisible()
  await sheet.getByRole("button", { name: "동작 선택창 닫기" }).tap()
  await expect(note).toContainText(content)
  const restored = await readStoredNote(page, id)
  expect(restored?.content).toBe(original?.content)
  expect(restored?.geometry).toEqual(original?.geometry)
})

test("짧은 화면과 큰 글자에서도 메모 시트의 닫기와 삭제 및 복원에 접근한다", async ({ page }) => {
  await page.goto("/")
  const content = `긴 메모 ${"줄바꿈과 긴 본문\n".repeat(40)}`
  const note = await createMobileNoteThroughUi(page, content)
  await page.setViewportSize({ height: 360, width: 390 })
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%" })
  await note.getByRole("button", { name: / 더보기$/u }).tap()
  const sheet = page.getByRole("dialog")
  const bounds = await sheet.boundingBox()
  await expect(sheet.getByRole("button", { name: "동작 선택창 닫기" })).toBeInViewport()
  await sheet.getByRole("button", { exact: true, name: "삭제" }).tap()
  expect(await sheet.boundingBox()).toEqual(bounds)
  await expect(sheet.getByRole("heading", { name: "메모를 삭제할까요?" })).toBeInViewport({ ratio: 1 })
  await expect(sheet.getByRole("button", { exact: true, name: "삭제" })).toBeInViewport()
  await sheet.getByRole("button", { exact: true, name: "삭제" }).tap()
  await expect(sheet.getByText("메모를 삭제했습니다.", { exact: true })).toBeVisible()
  expect(await sheet.boundingBox()).toEqual(bounds)
  await expect(sheet.getByRole("button", { name: "실행 취소" })).toBeInViewport()
  await sheet.getByRole("button", { name: "실행 취소" }).tap()
  await sheet.getByRole("button", { name: "동작 선택창 닫기" }).tap()
  await expect(note).toBeVisible()
})


test("다른 탭의 순서 저장과 충돌하면 최신 순서를 보여주고 다시 이동한다", async ({ context, page }) => {
  await page.goto("/")
  const contents = Array.from({ length: 4 }, (_, index) => `탭 정렬 ${index + 1} ${crypto.randomUUID()}`)
  for (const content of contents) await createMobileNoteThroughUi(page, content)
  const second = await context.newPage()
  await second.goto("/")
  await expect(second.getByRole("button", { name: `${contents[1]} 이동` })).toBeEnabled()
  async function dragIn(targetPage: Page, source: string, destination: string) {
    const session = await context.newCDPSession(targetPage)
    const articles = targetPage.getByRole("article")
    const from = await center(articles.filter({ hasText: source }).getByRole("button", { name: / 이동$/u }))
    const to = await center(articles.filter({ hasText: destination }), 0.8)
    await startTouch(session, from)
    await moveTouch(session, to)
    await endTouch(session)
  }
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore["put"]>) {
      if (this.name === "mobileNoteOrder") {
        IDBObjectStore.prototype.put = put
        throw new DOMException("Controlled order failure", "UnknownError")
      }
      return put.apply(this, args)
    }
  })
  await dragIn(page, contents[0], contents[3])
  await expect(page.getByRole("alert").filter({ hasText: "메모 순서를 저장하지 못했습니다" })).toBeVisible()
  await expect(page.getByRole("article")).toContainText(contents)
  await dragIn(page, contents[0], contents[3])
  const latest = [contents[1], contents[2], contents[3], contents[0]]
  await expect(page.getByRole("article")).toContainText(latest)
  await dragIn(second, contents[1], contents[3])
  await expect(second.getByRole("alert").filter({ hasText: "다른 탭에서 순서가 바뀌었습니다" })).toBeVisible()
  await expect(second.getByRole("article")).toContainText(latest)
  await dragIn(second, contents[1], contents[0])
  const retried = [contents[2], contents[3], contents[0], contents[1]]
  await expect(second.getByRole("article")).toContainText(retried)
  await page.reload()
  await expect(page.getByRole("article")).toContainText(retried)
})

test("목록 가장자리에 멈춘 손가락으로 자동 스크롤하고 취소하면 멈춘다", async ({ context, page }) => {
  await page.goto("/")
  const contents = Array.from({ length: 9 }, (_, index) => `자동 스크롤 ${index + 1} ${crypto.randomUUID()}`)
  for (const content of contents) await createMobileNoteThroughUi(page, content)
  const notes = page.getByRole("article")
  const first = notes.filter({ hasText: contents[0] })
  await first.scrollIntoViewIfNeeded()
  const handle = first.getByRole("button", { name: / 이동$/u })
  const start = await center(handle)
  const session = await context.newCDPSession(page)
  const scrollTop = () => first.evaluate((element) => {
    let parent = element.parentElement
    while (parent !== null) {
      if (/(auto|scroll)/u.test(getComputedStyle(parent).overflowY)) return parent.scrollTop
      parent = parent.parentElement
    }
    throw new Error("The scrolling list is missing")
  })
  const before = await scrollTop()
  const viewport = page.viewportSize()!
  await startTouch(session, start)
  await moveTouch(session, { x: viewport.width / 2, y: viewport.height - 20 })
  await expect.poll(scrollTop).toBeGreaterThan(before + 100)
  const during = await scrollTop()
  await expect.poll(scrollTop).toBeGreaterThan(during + 100)
  await cancelTouch(session)
  const stopped = await scrollTop()
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  expect(await scrollTop()).toBe(stopped)
  await expect(notes).toContainText(contents)
})
