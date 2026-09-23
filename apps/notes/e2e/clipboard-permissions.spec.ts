import { ok } from "node:assert/strict"

import {
  expect,
  test,
  type Browser,
  type Page,
} from "@playwright/test"
import * as fc from "fast-check"

import { ExplorationInvariantError } from "@/shared/lib/note-model-exploration"

import { readAppRevision } from "../test-app-revision.js"
import { createNoteThroughUi } from "./support/create-note-through-ui"
import { readStoredNote } from "./support/read-stored-note"
import { selectTextRange } from "./support/select-text-range"

const applicationOrigin = "http://localhost:4173"
const toastLifetimeMs = 5_000

async function runIndividualCopyCandidate(
  browser: Browser,
  content: string,
  alterWrittenText: boolean,
) {
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"],
  })

  try {
    const page = await context.newPage()
    await page.goto("/")
    const note = await createNoteThroughUi(page, content)
    if (alterWrittenText) {
      await page.evaluate(() => {
        const clipboard = navigator.clipboard
        const writeText = clipboard.writeText.bind(clipboard)
        const readText = clipboard.readText.bind(clipboard)
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            readText,
            writeText(text: string) {
              return writeText(text.slice(1))
            },
          },
        })
      })
    }

    await note.getByRole("textbox", { name: "메모 내용" }).click({
      modifiers: ["Meta"],
    })
    await expect(page.getByRole("status").filter({
      hasText: "복사했습니다.",
    })).toBeVisible()
    const observed = await page.evaluate(() => navigator.clipboard.readText())
    if (observed !== content) {
      throw new ExplorationInvariantError(
        "individual-copy-preserves-exact-text",
        content,
        observed,
      )
    }
  } finally {
    await context.close()
  }
}

test("개별 복사는 생성한 원문을 실제 Clipboard에 그대로 쓴다", async ({
  browser,
}) => {
  test.setTimeout(180_000)
  const content = fc.string({
    maxLength: 32,
    minLength: 1,
    unit: "grapheme-ascii",
  })
  const normal = await fc.check(
    fc.asyncProperty(content, async (value) => {
      await runIndividualCopyCandidate(browser, value, false)
    }),
    { numRuns: 5, verbose: true },
  )
  expect(normal.failed, fc.defaultReportMessage(normal)).toBe(false)

  const faulty = await fc.check(
    fc.asyncProperty(content, async (value) => {
      await runIndividualCopyCandidate(browser, value, true)
    }),
    { numRuns: 10, verbose: true },
  )
  expect(faulty.failed, fc.defaultReportMessage(faulty)).toBe(true)
  expect(faulty.errorInstance).toBeInstanceOf(ExplorationInvariantError)
  const reduced = faulty.counterexample?.[0]
  ok(reduced, "Expected a reduced copy input")

  const replay = await fc.check(
    fc.asyncProperty(content, async (value) => {
      await runIndividualCopyCandidate(browser, value, true)
    }),
    {
      endOnFailure: true,
      numRuns: 1,
      path: faulty.counterexamplePath ?? undefined,
      seed: faulty.seed,
    },
  )
  expect(replay.errorInstance).toBeInstanceOf(ExplorationInvariantError)
  await expect(runIndividualCopyCandidate(browser, reduced, true))
    .rejects.toMatchObject({ invariant: "individual-copy-preserves-exact-text" })
  await expect(runIndividualCopyCandidate(browser, reduced, false))
    .resolves.toBeUndefined()

  const failure = faulty.errorInstance as ExplorationInvariantError
  console.info(JSON.stringify({
    appRevision: readAppRevision(),
    browser: browser.browserType().name(),
    expected: failure.expected,
    feature: "individual-copy",
    initialContent: faulty.failures[0]?.[0] ?? null,
    invariant: failure.invariant,
    observed: failure.observed,
    path: faulty.counterexamplePath,
    reducedContent: reduced,
    runs: normal.numRuns,
    seed: faulty.seed,
    shrinks: faulty.numShrinks,
  }))
})

async function createGeneratedTemplate(page: Page) {
  const sourceText = "안녕하세요, 이름"
  const selectedText = "이름"
  const selectionStart = sourceText.indexOf(selectedText)
  const output = "안녕하세요, 민지"

  await page.goto("/templates/")
  await page.getByRole("button", { name: "수동으로 작성" }).click()
  const sourceField = page.getByRole("textbox", { name: "원문" })

  await sourceField.fill(sourceText)
  await selectTextRange(
    sourceField,
    selectionStart,
    selectionStart + selectedText.length,
  )
  await page.getByRole("button", { name: "플레이스홀더로 지정" }).click()
  await page.getByRole("textbox", { name: "템플릿 이름" }).fill("인사")
  await page.getByRole("button", { name: "템플릿 저장" }).click()
  await page.getByRole("textbox", { name: "입력값 1" }).fill("민지")
  await page.getByRole("button", { name: "텍스트 생성" }).click()

  return {
    generatedText: page.getByRole("region", { name: "생성한 텍스트" }),
    output,
  }
}

test("Command 키로 원문을 복사하고 두 사용 횟수를 구분한다", async ({
  context,
  page,
}) => {
  await page.clock.install()
  await context.grantPermissions(
    ["clipboard-read", "clipboard-write"],
    { origin: applicationOrigin },
  )
  await page.goto("/")
  const content = "클립보드에 기록할 메모 원문"
  const note = await createNoteThroughUi(page, content)
  const editor = note.getByRole("textbox", { name: "메모 내용" })

  await editor.focus()
  await editor.click({ modifiers: ["Meta"] })
  await editor.click({ modifiers: ["Meta"] })
  const copyNotice = page.getByRole("status").filter({
    hasText: "복사했습니다.",
  })

  await expect(copyNotice).toBeVisible()
  const dismissNotice = copyNotice.getByRole("button", { name: "알림 닫기" })
  await expect(dismissNotice).toBeVisible()
  await dismissNotice.click()
  await expect(copyNotice).toBeHidden()
  await expect(editor).toBeFocused()
  await editor.click({ modifiers: ["Meta"] })
  await expect(copyNotice).toBeVisible()
  await dismissNotice.focus()
  await page.clock.fastForward(toastLifetimeMs)
  await expect(copyNotice).toBeHidden()
  await expect(editor).toBeFocused()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(content)

  await editor.click({ modifiers: ["Meta", "Alt"] })
  const panel = page.getByRole("complementary", { name: "일괄 복사" })
  await expect(panel).toBeVisible()
  await panel.getByRole("button", { name: "일괄 복사 패널 닫기" }).click()
  await page.getByRole("link", { exact: true, name: "사용 빈도" }).click()
  await page.setViewportSize({ height: 720, width: 320 })

  const usageRow = page.getByRole("row").filter({ hasText: content })
  await expect(usageRow.getByRole("cell", { name: "개별 복사 3회" })).toBeVisible()
  await expect(usageRow.getByRole("cell", { name: "일괄 복사 1회" })).toBeVisible()
  await expect(usageRow.getByRole("cell", { name: "합계 4회" })).toBeVisible()
})

test("클립보드 권한이 거절되면 원인을 알리고 일반 복사 횟수를 늘리지 않는다", async ({
  context,
  page,
}) => {
  await page.clock.install()
  const session = await context.newCDPSession(page)

  await session.send("Browser.setPermission", {
    origin: applicationOrigin,
    permission: { name: "clipboard-write" },
    setting: "denied",
  })
  await page.setViewportSize({ height: 768, width: 1_024 })
  await page.goto("/")
  const content = "클립보드 거절을 확인할 메모"
  const note = await createNoteThroughUi(page, content)
  const editor = note.getByRole("textbox", { name: "메모 내용" })

  await editor.click({ modifiers: ["Meta"] })
  const individualCopyAlert = page.getByRole("alert").filter({
    hasText: "브라우저가 클립보드 쓰기를 허용하지 않았습니다.",
  })
  await expect(individualCopyAlert).toContainText(
    "브라우저가 클립보드 쓰기를 허용하지 않았습니다.",
  )
  await expect(
    individualCopyAlert.getByRole("link", { name: /설정/u }),
  ).toHaveCount(0)
  await page.clock.fastForward(toastLifetimeMs / 2)
  await editor.click({ modifiers: ["Meta"] })
  await page.clock.fastForward(toastLifetimeMs / 2)
  await expect(individualCopyAlert).toBeVisible()

  const retryCopy = individualCopyAlert.getByRole("button", {
    name: "다시 시도",
  })

  await retryCopy.focus()
  await page.clock.fastForward(toastLifetimeMs)
  await expect(individualCopyAlert).toBeVisible()
  await page.keyboard.press("Tab")
  await expect(individualCopyAlert.getByRole("button", { name: "알림 닫기" })).toBeFocused()
  await page.clock.fastForward(toastLifetimeMs)
  await expect(individualCopyAlert).toBeVisible()
  await page.keyboard.press("Tab")
  await page.clock.fastForward(toastLifetimeMs)
  await expect(individualCopyAlert).toBeHidden()

  await editor.click({ modifiers: ["Meta", "Alt"] })
  await page.getByRole("button", { name: "일괄 복사 1개" }).click()
  const panel = page.getByRole("dialog", { name: "일괄 복사" })
  await panel.getByRole("button", { exact: true, name: "복사" }).click()
  const batchCopyAlert = page.getByRole("alert").filter({
    hasText: "브라우저가 클립보드 쓰기를 허용하지 않았습니다.",
  })

  await expect(batchCopyAlert).toBeVisible()

  await panel.getByRole("button", { name: "일괄 복사 패널 닫기" }).click()
  await page.getByRole("link", { exact: true, name: "사용 빈도" }).click()
  await page.setViewportSize({ height: 720, width: 320 })
  const usageRow = page.getByRole("row").filter({ hasText: content })
  await expect(
    usageRow.getByRole("cell", { name: "개별 복사 0회" }),
  ).toBeVisible()
  await expect(
    usageRow.getByRole("cell", { name: "일괄 복사 1회" }),
  ).toBeVisible()
  await expect(
    usageRow.getByRole("cell", { name: "합계 1회" }),
  ).toBeVisible()
})

test("권한 거절 뒤 다시 시도하면 같은 메모 원문을 복사한다", async ({
  context,
  page,
}) => {
  const session = await context.newCDPSession(page)
  await session.send("Browser.setPermission", {
    origin: applicationOrigin,
    permission: { name: "clipboard-write" },
    setting: "denied",
  })
  await page.goto("/")
  const content = `재시도 메모 ${crypto.randomUUID()}`
  const note = await createNoteThroughUi(page, content)

  await note.getByRole("textbox", { name: "메모 내용" }).click({
    modifiers: ["Meta"],
  })
  const alert = page.getByRole("alert").filter({
    hasText: "브라우저가 클립보드 쓰기를 허용하지 않았습니다.",
  })
  await expect(alert).toBeVisible()
  await session.send("Browser.setPermission", {
    origin: applicationOrigin,
    permission: { name: "clipboard-write" },
    setting: "granted",
  })
  await context.grantPermissions(
    ["clipboard-read", "clipboard-write"],
    { origin: applicationOrigin },
  )
  await alert.getByRole("button", { name: "다시 시도" }).click()
  await expect(page.getByRole("status").filter({
    hasText: "복사했습니다.",
  })).toBeVisible()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(content)

  await page.getByRole("link", { exact: true, name: "사용 빈도" }).click()
  await page.setViewportSize({ height: 720, width: 320 })
  const usageRow = page.getByRole("row").filter({ hasText: content })
  await expect(usageRow.getByRole("cell", { name: "개별 복사 1회" })).toBeVisible()
})

test("원문을 수정한 뒤 복사하면 이전 기록과 새 기록을 나누고 실패한 횟수는 더하지 않는다", async ({
  context,
  page,
}) => {
  await context.grantPermissions(
    ["clipboard-read", "clipboard-write"],
    { origin: applicationOrigin },
  )
  await page.goto("/")
  const firstContent = crypto.randomUUID()
  const secondContent = crypto.randomUUID()
  const note = await createNoteThroughUi(page, firstContent)
  const editor = note.getByRole("textbox", { name: "메모 내용" })
  const articleId = await note.getAttribute("id")
  expect(articleId).not.toBeNull()
  const noteId = decodeURIComponent(
    articleId!.slice("note-".length, -"-board".length),
  )

  await note.getByRole("button", { name: "메모 복사" }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(firstContent)
  await editor.click({ modifiers: ["Meta", "Alt"] })
  const batchPanel = page.getByRole("complementary", { name: "일괄 복사" })
  await expect(batchPanel).toBeVisible()
  await batchPanel.getByRole("button", { name: "일괄 복사 패널 닫기" }).click()

  await editor.fill(secondContent)
  await editor.press("Tab")
  await expect.poll(async () => (await readStoredNote(page, noteId))?.content)
    .toBe(secondContent)
  await page.reload()
  const revisedNote = page.getByRole("article", { name: "메모" })
  await expect(revisedNote.getByRole("textbox", { name: "메모 내용" }))
    .toHaveValue(secondContent)
  await revisedNote.getByRole("button", { name: "메모 복사" }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(secondContent)

  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put
    let failOnce = true

    IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
      const request = key === undefined
        ? originalPut.call(this, value)
        : originalPut.call(this, value, key)

      if (this.name === "usage" && failOnce) {
        failOnce = false
        this.transaction.abort()
      }

      return request
    }
  })
  await revisedNote.getByRole("button", { name: "메모 복사" }).click()
  await expect(page.getByRole("alert").filter({
    hasText: "텍스트는 복사했지만 사용 횟수를 기록하지 못했습니다.",
  })).toBeVisible()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(secondContent)

  await page.getByRole("link", { exact: true, name: "사용 빈도" }).click()
  await page.setViewportSize({ height: 720, width: 320 })
  const firstRow = page.getByRole("row").filter({ hasText: firstContent })
  const secondRow = page.getByRole("row").filter({ hasText: secondContent })
  await expect(firstRow.getByRole("cell", { name: "개별 복사 1회" })).toBeVisible()
  await expect(firstRow.getByRole("cell", { name: "일괄 복사 1회" })).toBeVisible()
  await expect(firstRow.getByRole("cell", { name: "합계 2회" })).toBeVisible()
  await expect(secondRow.getByRole("cell", { name: "개별 복사 1회" })).toBeVisible()
  await expect(secondRow.getByRole("cell", { name: "일괄 복사 0회" })).toBeVisible()
  await expect(secondRow.getByRole("cell", { name: "합계 1회" })).toBeVisible()

  const firstLabel = await firstRow.getByText(/원문 버전/u).textContent()
  const secondLabel = await secondRow.getByText(/원문 버전/u).textContent()
  const firstRevision = firstLabel?.match(/원문 버전 ([\d,]+)/u)?.[1]
  const secondRevision = secondLabel?.match(/원문 버전 ([\d,]+)/u)?.[1]
  expect(firstRevision).toBeDefined()
  expect(secondRevision).toBeDefined()
  expect(Number(secondRevision?.replaceAll(",", ""))).toBe(
    Number(firstRevision?.replaceAll(",", "")) + 1,
  )

  await page.reload()
  await expect(page.getByRole("row").filter({ hasText: firstContent }))
    .toHaveCount(1)
  await expect(page.getByRole("row").filter({ hasText: secondContent }))
    .toHaveCount(1)
})

test("템플릿으로 만든 텍스트를 클립보드에 쓴다", async ({
  context,
  page,
}) => {
  await context.grantPermissions(
    ["clipboard-read", "clipboard-write"],
    { origin: applicationOrigin },
  )
  const { generatedText, output } = await createGeneratedTemplate(page)

  await generatedText.getByRole("button", { name: "복사" }).click()
  await expect(generatedText.getByRole("status")).toContainText(
    "복사했습니다.",
  )
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(output)
})

test("템플릿 복사 권한이 거절되면 권한 확인과 재시도를 안내한다", async ({
  context,
  page,
}) => {
  const session = await context.newCDPSession(page)

  await session.send("Browser.setPermission", {
    origin: applicationOrigin,
    permission: { name: "clipboard-write" },
    setting: "denied",
  })
  const { generatedText, output } = await createGeneratedTemplate(page)

  await generatedText.getByRole("button", { name: "복사" }).click()
  await expect(generatedText.getByRole("alert")).toContainText(
    "클립보드 쓰기가 허용되지 않았습니다.",
  )
  await expect(generatedText).toContainText(output)
})

test("Clipboard API가 없으면 생성한 텍스트를 직접 복사하도록 안내한다", async ({
  page,
}) => {
  const { generatedText, output } = await createGeneratedTemplate(page)

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    })
  })

  await generatedText.getByRole("button", { name: "복사" }).click()
  await expect(generatedText.getByRole("alert")).toContainText(
    "자동 복사를 사용할 수 없습니다.",
  )
  await expect(generatedText).toContainText(output)
})

test("템플릿 Clipboard 쓰기 실패는 같은 생성문 재시도를 안내한다", async ({
  page,
}) => {
  const { generatedText, output } = await createGeneratedTemplate(page)

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        async writeText() {
          throw new Error("clipboard write failed")
        },
      },
    })
  })

  await generatedText.getByRole("button", { name: "복사" }).click()
  await expect(generatedText.getByRole("alert")).toContainText(
    "다시 시도하거나 생성한 텍스트를 직접 선택해 복사하세요.",
  )
  await expect(generatedText).toContainText(output)

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        async writeText(text: string) {
          sessionStorage.setItem("template-clipboard-value", text)
        },
      },
    })
  })
  await generatedText.getByRole("button", { name: "복사" }).click()
  await expect(generatedText.getByRole("status")).toContainText(
    "복사했습니다.",
  )
  await expect
    .poll(() => page.evaluate(
      () => sessionStorage.getItem("template-clipboard-value"),
    ))
    .toBe(output)
})

test("이전 생성문의 복사 완료를 현재 생성문에 표시하지 않는다", async ({
  page,
}) => {
  const { generatedText, output } = await createGeneratedTemplate(page)
  const currentOutput = "안녕하세요, 하늘"

  await page.evaluate(() => {
    let complete: (() => void) | null = null

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(text: string) {
          sessionStorage.setItem("delayed-template-clipboard-value", text)
          return new Promise<void>((resolve) => {
            complete = resolve
          })
        },
      },
    })

    window.addEventListener(
      "release-template-copy",
      () => complete?.(),
      { once: true },
    )
  })

  await generatedText.getByRole("button", { name: "복사" }).click()
  await expect
    .poll(() => page.evaluate(
      () => sessionStorage.getItem("delayed-template-clipboard-value"),
    ))
    .toBe(output)

  await page.getByRole("textbox", { name: "입력값 1" }).fill("하늘")
  await page.getByRole("button", { name: "텍스트 생성" }).click()
  await expect(generatedText).toContainText(currentOutput)
  await page.evaluate(() => {
    window.dispatchEvent(new Event("release-template-copy"))
  })
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  )
  await expect(generatedText.getByRole("status")).toHaveCount(0)
})
