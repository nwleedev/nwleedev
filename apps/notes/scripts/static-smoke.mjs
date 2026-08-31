import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtemp, mkdir, rm } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"
import { chromium, expect, firefox, webkit } from "@playwright/test"

import { createStaticServer } from "./static-server.mjs"

const executeFile = promisify(execFile)
const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)))
const repositoryRoot = path.resolve(packageRoot, "../..")
const temporaryRoot = path.join(repositoryRoot, "temps")
const mobileAccumulationHoldMs = 500

async function listen(server, host = "localhost") {
  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, host, resolve)
  })

  const address = server.address()

  if (!address || typeof address === "string") {
    throw new Error("Static server did not provide a TCP port.")
  }

  return address.port
}

async function close(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

async function verifyOrigin(browser, origin, chromiumBrowser) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true })

  if (chromiumBrowser) {
    await context.grantPermissions(
      ["clipboard-read", "clipboard-write"],
      { origin },
    )
  }

  const page = await context.newPage()
  const stylesheets = []
  page.on("response", (response) => {
    if (
      (response.headers()["content-type"] ?? "").startsWith("text/css")
    ) {
      stylesheets.push(response)
    }
  })

  await page.goto(`${origin}/analysis/`)
  await page.getByRole("heading", { level: 1 }).waitFor()
  assert.equal(page.workers().length, 0)
  assert.equal(stylesheets.length > 0, true)
  assert.equal(stylesheets.every((response) => response.ok()), true)

  const button = page.getByRole("button", { name: "분석 실행" })

  const workerStarted = page.waitForEvent("worker")

  await button.click()
  const worker = await workerStarted
  await expect(button).toBeEnabled()
  await page.getByRole("status").waitFor()
  const completedStatus = await page.getByRole("status").textContent()
  assert.equal(page.workers().length, 1)

  const workerUrl = worker.url()
  assert.match(workerUrl ?? "", /\.js$/u)

  const workerResponse = await context.request.get(workerUrl)
  assert.equal(workerResponse.ok(), true)
  assert.match(
    workerResponse.headers()["content-type"] ?? "",
    /^text\/javascript/u,
  )

  await page.getByRole("link", { exact: true, name: "메모" }).click()
  await page.getByRole("region", { name: "메모 작업 영역" }).waitFor()
  await page.getByRole("button", { name: /누적 텍스트/u }).waitFor()
  await page
    .getByRole("link", { exact: true, name: "텍스트 분석" })
    .click()
  await page
    .getByRole("heading", { level: 1, name: "텍스트 분석" })
    .waitFor()
  await expect(
    page.getByText(completedStatus ?? "", { exact: true }),
  ).toBeVisible()
  await page.getByRole("link", { exact: true, name: "메모" }).click()
  await page.getByRole("button", { name: "새 메모" }).click()
  const noteEditor = page.getByRole("textbox", { name: "메모 내용" })
  await noteEditor.fill("브라우저에서 작성한 메모\nhttps://example.com")
  await page.getByRole("button", { name: "완료" }).click()
  await expect(page.getByRole("article")).toContainText(
    "브라우저에서 작성한 메모",
  )
  assert.equal(
    await page.getByRole("link", { name: "https://example.com" }).count(),
    0,
  )

  await page.getByRole("button", { name: "편집" }).click()
  await noteEditor.fill("Escape로 저장한 메모")
  await noteEditor.press("Escape")
  await expect(page.getByRole("article")).toContainText("Escape로 저장한 메모")

  const noteArticle = page.getByRole("article")
  const noteContent = noteArticle.getByText("Escape로 저장한 메모", {
    exact: true,
  })
  const browserName = browser.browserType().name()
  await noteArticle.getByRole("button", { name: "복사" }).click()
  await expect(
    noteArticle.getByText("복사했습니다.", { exact: true }),
  ).toBeVisible()
  await expect
    .poll(() => readUsageCounts(page, "Escape로 저장한 메모"))
    .toEqual({ accumulation: 0, ordinaryCopy: 1 })

  if (chromiumBrowser) {
    const contentBounds = await noteContent.boundingBox()
    assert.notEqual(contentBounds, null)
    await page.mouse.move(contentBounds.x + 4, contentBounds.y + 8)
    await page.mouse.down()
    await page.mouse.move(contentBounds.x + 100, contentBounds.y + 8, {
      steps: 8,
    })
    await page.mouse.up()
  } else if (browserName === "firefox") {
    await noteContent.evaluate((element) => {
      const range = document.createRange()
      const selection = window.getSelection()

      range.selectNodeContents(element)
      selection?.removeAllRanges()
      selection?.addRange(range)
    })
  }

  const selectedText = await page.evaluate(
    () => window.getSelection()?.toString() ?? "",
  )

  if (browserName !== "webkit") {
    assert.notEqual(
      selectedText,
      "",
      `${browserName} did not preserve the note text selection at ${origin}`,
    )
    await expect
      .poll(() => readUsageCounts(page, "Escape로 저장한 메모"))
      .toEqual({ accumulation: 0, ordinaryCopy: 1 })
  }

  const accumulateButton = noteArticle.getByRole("button", { name: "누적" })
  await accumulateButton.click()
  const accumulatorPanel = page.getByRole("complementary", {
    name: "누적 텍스트",
  })
  await expect(accumulatorPanel).toContainText("Escape로 저장한 메모")

  if (browserName === "webkit") {
    const panelContainsFocus = await accumulatorPanel.evaluate((element) =>
      element.contains(document.activeElement),
    )
    assert.equal(panelContainsFocus, false)
  } else {
    await expect(accumulateButton).toBeFocused()
  }

  await expect
    .poll(() => readUsageCounts(page, "Escape로 저장한 메모"))
    .toEqual({ accumulation: 1, ordinaryCopy: 1 })
  await expect.poll(() => readAccumulatorItemCount(page)).toBe(1)

  await page.evaluate(() => window.getSelection()?.removeAllRanges())
  await noteContent.click({ modifiers: ["Meta"] })
  await expect.poll(() => readAccumulatorItemCount(page)).toBe(2)
  await expect
    .poll(() => readUsageCounts(page, "Escape로 저장한 메모"))
    .toEqual({ accumulation: 2, ordinaryCopy: 1 })

  const widthInput = page.getByLabel("너비")
  await widthInput.fill("360")
  await page.getByRole("button", { name: "배치 적용" }).click()
  await expect.poll(() => readNoteWidth(page, "Escape로 저장한 메모")).toBe(360)
  await page.reload()
  await expect(page.getByRole("article")).toContainText("Escape로 저장한 메모")
  await page.getByRole("button", { name: "메모 이동" }).click()
  await expect(page.getByLabel("너비")).toHaveValue("360")

  await page.getByRole("link", { exact: true, name: "설정" }).click()
  const metaClickPreference = page.getByRole("checkbox", {
    name: "Command+클릭으로 누적",
  })
  await expect(metaClickPreference).toBeChecked()
  await page
    .getByText("Command+클릭으로 누적", { exact: true })
    .click()
  await expect(metaClickPreference).not.toBeChecked()
  await expect(page.getByText("설정 저장 중", { exact: true })).toBeHidden()
  await page.getByRole("link", { exact: true, name: "메모" }).click()
  const returnedArticle = page.getByRole("article")
  const returnedContent = returnedArticle.getByText(
    "Escape로 저장한 메모",
    { exact: true },
  )
  await returnedArticle.getByRole("button", { name: "복사" }).click()
  await expect
    .poll(() => readUsageCounts(page, "Escape로 저장한 메모"))
    .toEqual({ accumulation: 2, ordinaryCopy: 2 })
  await page.evaluate(() => window.getSelection()?.removeAllRanges())
  await returnedContent.click({ modifiers: ["Meta"] })
  await expect(
    returnedArticle.getByText("복사했습니다.", { exact: true }),
  ).toBeVisible()
  await expect
    .poll(() => readUsageCounts(page, "Escape로 저장한 메모"))
    .toEqual({ accumulation: 2, ordinaryCopy: 3 })
  await expect.poll(() => readAccumulatorItemCount(page)).toBe(2)
  await returnedArticle.getByRole("button", { name: "편집" }).click()
  await noteEditor.fill("편집 뒤 누적한 메모")
  await page.getByRole("button", { name: "완료" }).click()
  await returnedArticle.getByRole("button", { name: "누적" }).click()
  await expect.poll(() => readAccumulatorItemCount(page)).toBe(3)
  await expect
    .poll(() => readUsageCounts(page, "편집 뒤 누적한 메모"))
    .toEqual({ accumulation: 1, ordinaryCopy: 0 })
  const usageBeforeAccumulatorEditing = await readStoreRecords(page, "usage")

  await page
    .getByRole("button", { name: "누적 텍스트 3개" })
    .click()
  const editingPanel = page.getByRole("complementary", {
    name: "누적 텍스트",
  })
  const editedItem = editingPanel
    .getByRole("listitem")
    .filter({ hasText: "편집 뒤 누적한 메모" })
  await editedItem.getByRole("button", { name: "위로" }).click()
  await editedItem.getByRole("button", { name: "위로" }).click()
  await expect
    .poll(() => readAccumulatorTexts(page))
    .toEqual([
      "편집 뒤 누적한 메모",
      "Escape로 저장한 메모",
      "Escape로 저장한 메모",
    ])
  await editedItem.getByRole("button", { name: "아래로" }).click()
  await editedItem.getByRole("button", { name: "아래로" }).click()
  await expect
    .poll(() => readAccumulatorTexts(page))
    .toEqual([
      "Escape로 저장한 메모",
      "Escape로 저장한 메모",
      "편집 뒤 누적한 메모",
    ])

  const dragHandle = editedItem.getByRole("button", {
    name: "3 누적 텍스트 순서 변경",
  })
  const firstAccumulatedItem = editingPanel.getByRole("listitem").first()
  const dragBounds = await dragHandle.boundingBox()
  const firstItemBounds = await firstAccumulatedItem.boundingBox()
  assert.notEqual(dragBounds, null)
  assert.notEqual(firstItemBounds, null)
  await page.mouse.move(dragBounds.x + 12, dragBounds.y + 12)
  await page.mouse.down()
  await page.mouse.move(
    firstItemBounds.x + 12,
    firstItemBounds.y + 12,
    { steps: 8 },
  )
  await page.mouse.up()
  await expect
    .poll(() => readAccumulatorTexts(page))
    .toEqual([
      "편집 뒤 누적한 메모",
      "Escape로 저장한 메모",
      "Escape로 저장한 메모",
    ])

  const reorderedHandle = editedItem.getByRole("button", {
    name: "1 누적 텍스트 순서 변경",
  })
  const reorderedBounds = await reorderedHandle.boundingBox()
  const editingPanelBounds = await editingPanel.boundingBox()
  assert.notEqual(reorderedBounds, null)
  assert.notEqual(editingPanelBounds, null)
  await page.mouse.move(reorderedBounds.x + 12, reorderedBounds.y + 12)
  await page.mouse.down()
  await page.mouse.move(editingPanelBounds.x - 24, reorderedBounds.y + 12, {
    steps: 6,
  })
  await reorderedHandle.press("Escape")
  await page.mouse.up()
  await expect.poll(() => readAccumulatorItemCount(page)).toBe(3)

  await page.mouse.move(reorderedBounds.x + 12, reorderedBounds.y + 12)
  await page.mouse.down()
  await page.mouse.move(editingPanelBounds.x - 24, reorderedBounds.y + 12, {
    steps: 6,
  })
  await page.mouse.up()
  await expect.poll(() => readAccumulatorItemCount(page)).toBe(2)
  await editingPanel.getByRole("button", { name: "실행 취소" }).click()
  await expect.poll(() => readAccumulatorItemCount(page)).toBe(3)
  await editingPanel.getByRole("button", { name: "다시 실행" }).click()
  await expect.poll(() => readAccumulatorItemCount(page)).toBe(2)
  await editingPanel.getByRole("button", { name: "실행 취소" }).click()
  await expect
    .poll(() => readAccumulatorTexts(page))
    .toEqual([
      "편집 뒤 누적한 메모",
      "Escape로 저장한 메모",
      "Escape로 저장한 메모",
    ])
  assert.deepEqual(
    await readStoreRecords(page, "usage"),
    usageBeforeAccumulatorEditing,
  )
  await editingPanel.getByRole("button", { name: "닫기" }).click()

  await page.setViewportSize({ height: 720, width: 900 })
  await expect(page.getByRole("button", { name: "메모 이동" })).toBeVisible()
  await page
    .getByRole("button", { name: "누적 텍스트 3개" })
    .click()
  const accumulatorDialog = page.getByRole("dialog", {
    name: "누적 텍스트",
  })
  await expect(
    accumulatorDialog.getByRole("button", { name: "다시 실행" }),
  ).toBeEnabled()
  await accumulatorDialog.getByRole("button", { name: "닫기" }).click()
  await page.setViewportSize({ height: 720, width: 767 })
  await expect(page.getByRole("button", { name: "메모 이동" })).toBeHidden()
  await page.setViewportSize({ height: 720, width: 1280 })
  await page
    .getByRole("link", { exact: true, name: "텍스트 분석" })
    .click()
  await page
    .getByRole("heading", { level: 1, name: "텍스트 분석" })
    .waitFor()
  await expect(page.getByText("아직 분석하지 않았습니다.")).toBeVisible()
  await page.getByRole("link", { exact: true, name: "메모" }).click()
  await page
    .getByRole("button", { name: "누적 텍스트 3개" })
    .click()
  const returnedPanel = page.getByRole("complementary", {
    name: "누적 텍스트",
  })
  await expect(
    returnedPanel.getByRole("button", { name: "다시 실행" }),
  ).toBeEnabled()
  await returnedPanel.getByRole("button", { name: "닫기" }).click()

  await page.setViewportSize({ height: 720, width: 320 })
  await page
    .getByRole("link", { name: "누적 텍스트 3개 관리" })
    .click()
  await page
    .getByRole("heading", { level: 1, name: "누적 텍스트" })
    .waitFor()
  assert.equal(await page.locator("aside").count(), 0)
  await expect(page.getByRole("button", { name: "복사" })).toBeEnabled()
  await expect(
    page.getByRole("region", { name: "합친 텍스트" }),
  ).toContainText("편집 뒤 누적한 메모")
  await page.getByRole("button", { name: "복사" }).click()
  await expect(
    page.getByText("합친 텍스트를 복사했습니다.", { exact: true }),
  ).toBeVisible()
  assert.deepEqual(
    await readStoreRecords(page, "usage"),
    usageBeforeAccumulatorEditing,
  )
  const accumulatorOrderBeforeCancel = await readAccumulatorTexts(page)
  await page.getByRole("link", { exact: true, name: "취소" }).click()
  await page.getByRole("region", { name: "메모 작업 영역" }).waitFor()
  assert.deepEqual(
    await readAccumulatorTexts(page),
    accumulatorOrderBeforeCancel,
  )
  await page
    .getByRole("link", { name: "누적 텍스트 3개 관리" })
    .click()
  await expect(
    page.getByRole("button", { name: "다시 실행" }),
  ).toBeEnabled()

  await page.reload()
  await page.getByRole("heading", { level: 1 }).waitFor()
  await expect(
    page.getByRole("button", { name: "다시 실행" }),
  ).toBeDisabled()
  const reloadedStatuses = await page.getByRole("status").allTextContents()
  assert.equal(reloadedStatuses.includes(completedStatus ?? ""), false)

  await context.close()
}

async function verifyUnsupportedOrigin(browser, origin) {
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(origin)
  await page
    .getByRole("heading", { level: 1, name: "지원하지 않는 접속 주소" })
    .waitFor()
  await expect(page.getByText(/HTTPS 주소 또는 http:\/\/localhost/u)).toBeVisible()
  assert.equal(page.workers().length, 0)

  const databaseNames = await page.evaluate(async () =>
    (await indexedDB.databases()).map((database) => database.name),
  )
  assert.equal(databaseNames.includes("personal-notes"), false)

  await context.close()
}

async function createNote(page, content) {
  await page.getByRole("button", { name: "새 메모" }).click()
  const editor = page.getByRole("textbox", { name: "메모 내용" })
  await editor.fill(content)
  await page.getByRole("button", { name: "완료" }).click()
}

async function touchStart(client, bounds) {
  await client.send("Input.dispatchTouchEvent", {
    touchPoints: [{ x: bounds.x + 16, y: bounds.y + 16 }],
    type: "touchStart",
  })
}

async function touchEnd(client) {
  await client.send("Input.dispatchTouchEvent", {
    touchPoints: [],
    type: "touchEnd",
  })
}

async function verifyMobileAccumulation(browser, origin) {
  const context = await browser.newContext({
    hasTouch: true,
    ignoreHTTPSErrors: true,
    isMobile: true,
    viewport: { height: 720, width: 320 },
  })
  await context.grantPermissions(
    ["clipboard-read", "clipboard-write"],
    { origin },
  )
  const page = await context.newPage()
  const client = await context.newCDPSession(page)

  await page.goto(origin)
  await page.getByText("메모가 없습니다.", { exact: true }).waitFor()
  await createNote(page, "첫 번째 모바일 메모")
  await createNote(page, "두 번째 모바일 메모")
  await createNote(page, "취소할 모바일 메모")
  await page.clock.install()

  const firstArticle = page
    .getByRole("article")
    .filter({ hasText: "첫 번째 모바일 메모", visible: true })
  const firstContent = firstArticle.getByText("첫 번째 모바일 메모", {
    exact: true,
  })
  await firstContent.scrollIntoViewIfNeeded()
  const firstBounds = await firstContent.boundingBox()
  assert.notEqual(firstBounds, null)
  await touchStart(client, firstBounds)
  await page.clock.fastForward(mobileAccumulationHoldMs)
  await touchEnd(client)
  await expect.poll(() => readAccumulatorItemCount(page)).toBe(1)
  await expect(
    page.getByRole("link", { name: "누적 텍스트 1개 관리" }),
  ).toBeVisible()
  await expect(
    firstArticle.getByText("누적 선택됨"),
  ).toBeVisible()

  const secondArticle = page
    .getByRole("article")
    .filter({ hasText: "두 번째 모바일 메모", visible: true })
  const secondContent = secondArticle.getByText("두 번째 모바일 메모", {
    exact: true,
  })
  await secondContent.scrollIntoViewIfNeeded()
  const secondBounds = await secondContent.boundingBox()
  assert.notEqual(secondBounds, null)
  await touchStart(client, secondBounds)
  await page.clock.fastForward(mobileAccumulationHoldMs)
  await touchEnd(client)
  await expect.poll(() => readAccumulatorItemCount(page)).toBe(2)
  await expect(
    page.getByRole("link", { name: "누적 텍스트 2개 관리" }),
  ).toBeVisible()
  await page.clock.resume()

  await firstContent.scrollIntoViewIfNeeded()
  const selectedFirstBounds = await firstContent.boundingBox()
  assert.notEqual(selectedFirstBounds, null)
  await touchStart(client, selectedFirstBounds)
  await touchEnd(client)
  await expect.poll(() => readAccumulatorItemCount(page)).toBe(1)
  await expect(firstArticle.getByText("누적 선택됨")).toBeHidden()
  await page
    .getByRole("link", { name: "누적 텍스트 1개 관리" })
    .click()
  await page
    .getByRole("heading", { level: 1, name: "누적 텍스트" })
    .waitFor()
  const usageBeforeMobileEditing = await readStoreRecords(page, "usage")
  await page.getByRole("button", { name: "실행 취소" }).click()
  await expect.poll(() => readAccumulatorItemCount(page)).toBe(2)
  await page.getByRole("button", { name: "다시 실행" }).click()
  await expect.poll(() => readAccumulatorItemCount(page)).toBe(1)
  await page.getByRole("button", { name: "실행 취소" }).click()
  await expect.poll(() => readAccumulatorItemCount(page)).toBe(2)
  const secondListItem = page
    .getByRole("listitem")
    .filter({ hasText: "두 번째 모바일 메모" })
  await secondListItem.getByRole("button", { name: "위로" }).click()
  await expect
    .poll(() => readAccumulatorTexts(page))
    .toEqual(["두 번째 모바일 메모", "첫 번째 모바일 메모"])
  await page.getByRole("button", { name: "복사" }).click()
  await expect(
    page.getByText("합친 텍스트를 복사했습니다.", { exact: true }),
  ).toBeVisible()
  assert.deepEqual(
    await readStoreRecords(page, "usage"),
    usageBeforeMobileEditing,
  )
  await page.getByRole("link", { exact: true, name: "취소" }).click()
  await expect(firstArticle.getByText("누적 선택됨")).toBeVisible()

  const cancelledArticle = page
    .getByRole("article")
    .filter({ hasText: "취소할 모바일 메모", visible: true })
  const cancelledContent = cancelledArticle.getByText("취소할 모바일 메모", {
    exact: true,
  })
  await cancelledContent.scrollIntoViewIfNeeded()
  const cancelledBounds = await cancelledContent.boundingBox()
  assert.notEqual(cancelledBounds, null)
  await touchStart(client, cancelledBounds)
  await client.send("Input.dispatchTouchEvent", {
    touchPoints: [
      { x: cancelledBounds.x + 40, y: cancelledBounds.y + 16 },
    ],
    type: "touchMove",
  })
  await touchEnd(client)
  await expect.poll(() => readAccumulatorItemCount(page)).toBe(2)

  await touchStart(client, cancelledBounds)
  await touchEnd(client)
  await expect
    .poll(() => readUsageCounts(page, "취소할 모바일 메모"))
    .toEqual({ accumulation: 0, ordinaryCopy: 1 })

  await context.close()
}

async function readNoteCount(page) {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("personal-notes", 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction("notes", "readonly")
          const count = transaction.objectStore("notes").count()
          count.onerror = () => reject(count.error)
          count.onsuccess = () => resolve(count.result)
          transaction.oncomplete = () => database.close()
        }
      }),
  )
}

async function readStoreRecords(page, storeName) {
  return page.evaluate(
    (requestedStoreName) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("personal-notes", 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction(
            requestedStoreName,
            "readonly",
          )
          const records = transaction.objectStore(requestedStoreName).getAll()
          records.onerror = () => reject(records.error)
          records.onsuccess = () => resolve(records.result)
          transaction.oncomplete = () => database.close()
        }
      }),
    storeName,
  )
}

async function readAccumulatorItemCount(page) {
  const accumulators = await readStoreRecords(page, "accumulators")
  const primaryAccumulator = accumulators.find(
    (accumulator) => accumulator.id === "primary",
  )
  return primaryAccumulator?.content.items.length ?? 0
}

async function readAccumulatorTexts(page) {
  const accumulators = await readStoreRecords(page, "accumulators")
  const primaryAccumulator = accumulators.find(
    (accumulator) => accumulator.id === "primary",
  )
  return (
    primaryAccumulator?.content.items.map((item) => item.textSnapshot) ?? []
  )
}

async function readUsageCounts(page, textSnapshot) {
  const usageRecords = await readStoreRecords(page, "usage")
  const record = usageRecords.find(
    (usage) => usage.textSnapshot === textSnapshot,
  )
  return record?.counts ?? null
}

async function readNoteWidth(page, content) {
  return page.evaluate(
    (expectedContent) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("personal-notes", 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction("notes", "readonly")
          const notes = transaction.objectStore("notes").getAll()
          notes.onerror = () => reject(notes.error)
          notes.onsuccess = () => {
            const note = notes.result.find(
              (candidate) => candidate.content === expectedContent,
            )
            resolve(note?.geometry.width)
          }
          transaction.oncomplete = () => database.close()
        }
      }),
    content,
  )
}

async function verifyStorageIsolation(browser, httpOrigin, httpsOrigin) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true })
  const page = await context.newPage()

  await page.goto(httpOrigin)
  await page.getByText("메모가 없습니다.", { exact: true }).waitFor()
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("personal-notes", 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction("notes", "readwrite")
          transaction.objectStore("notes").put({
            content: "origin marker",
            contentRevision: 0,
            createdAt: "2026-08-31T01:00:00.000Z",
            geometry: {
              height: 240,
              width: 320,
              x: 0,
              y: 0,
              zIndex: 0,
            },
            id: "origin-marker",
            revision: 0,
            updatedAt: "2026-08-31T01:00:00.000Z",
          })
          transaction.onabort = () => reject(transaction.error)
          transaction.oncomplete = () => {
            database.close()
            resolve()
          }
        }
      }),
  )
  await page.reload()
  await expect(page.getByText("메모 1개", { exact: true })).toHaveText(
    "메모 1개",
  )

  await page.goto(httpsOrigin)
  await page.getByText("메모가 없습니다.", { exact: true }).waitFor()
  assert.equal(await readNoteCount(page), 0)

  await page.goto(httpOrigin)
  await page.getByText("메모 1개", { exact: true }).waitFor({ state: "attached" })
  assert.equal(await readNoteCount(page), 1)

  await context.close()
}

async function run() {
  await mkdir(temporaryRoot, { recursive: true })
  const temporaryDirectory = await mkdtemp(
    path.join(temporaryRoot, "notes-static-smoke-"),
  )
  const certificatePath = path.join(temporaryDirectory, "localhost.crt")
  const keyPath = path.join(temporaryDirectory, "localhost.key")
  const outputRoot = path.join(packageRoot, "out")
  let httpServer
  let httpsServer
  let unsupportedHttpServer
  const browsers = []

  try {
    await executeFile("openssl", [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      keyPath,
      "-out",
      certificatePath,
      "-days",
      "1",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
    ])

    httpServer = await createStaticServer({
      protocol: "http",
      root: outputRoot,
    })
    httpsServer = await createStaticServer({
      cert: certificatePath,
      key: keyPath,
      protocol: "https",
      root: outputRoot,
    })
    unsupportedHttpServer = await createStaticServer({
      protocol: "http",
      root: outputRoot,
    })

    const httpPort = await listen(httpServer)
    const httpsPort = await listen(httpsServer)
    const unsupportedHttpPort = await listen(
      unsupportedHttpServer,
      "127.0.0.1",
    )
    for (const browserType of [chromium, firefox, webkit]) {
      const browser = await browserType.launch()
      browsers.push(browser)

      const httpOrigin = `http://localhost:${httpPort}`
      const httpsOrigin = `https://localhost:${httpsPort}`
      const unsupportedHttpOrigin = `http://127.0.0.1:${unsupportedHttpPort}`
      const chromiumBrowser = browserType === chromium

      await verifyStorageIsolation(browser, httpOrigin, httpsOrigin)
      await verifyOrigin(browser, httpOrigin, chromiumBrowser)
      await verifyOrigin(browser, httpsOrigin, chromiumBrowser)
      await verifyUnsupportedOrigin(browser, unsupportedHttpOrigin)

      if (browserType === chromium) {
        await verifyMobileAccumulation(browser, httpOrigin)
        await verifyMobileAccumulation(browser, httpsOrigin)
      }
    }

    process.stdout.write(
      "Static HTTP and HTTPS storage isolation, Worker, and address checks passed in Chromium, Firefox, and WebKit.\n",
    )
  } finally {
    await Promise.all(browsers.map((browser) => browser.close()))

    if (httpServer?.listening) {
      await close(httpServer)
    }

    if (httpsServer?.listening) {
      await close(httpsServer)
    }

    if (unsupportedHttpServer?.listening) {
      await close(unsupportedHttpServer)
    }

    await rm(temporaryDirectory, { force: true, recursive: true })
  }
}

await run()
