import {
  expect,
  test,
  type Page,
} from "@playwright/test"

import { createNoteThroughUi } from "./support/create-note-through-ui"
import { selectTextRange } from "./support/select-text-range"

const applicationOrigin = "http://localhost:4173"

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
  await context.grantPermissions(
    ["clipboard-read", "clipboard-write"],
    { origin: applicationOrigin },
  )
  await page.goto("/")
  const content = "클립보드에 기록할 메모 원문"
  const note = await createNoteThroughUi(page, content)
  const editor = note.getByRole("textbox", { name: "메모 내용" })

  await editor.click({ modifiers: ["Meta"] })
  await editor.click({ modifiers: ["Meta"] })
  await expect(
    page.getByRole("status").filter({ hasText: "복사했습니다." }),
  ).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(content)

  await editor.click({ modifiers: ["Meta", "Alt"] })
  const panel = page.getByRole("complementary", { name: "일괄 복사" })
  await expect(panel).toBeVisible()
  await panel.getByRole("button", { name: "일괄 복사 패널 닫기" }).click()
  await page.setViewportSize({ height: 720, width: 320 })
  await page.getByRole("button", { name: "탐색" }).click()
  await page.getByRole("link", { exact: true, name: "사용 빈도" }).click()

  const usageRow = page.getByRole("row").filter({ hasText: content })
  await expect(usageRow.getByRole("cell", { name: "개별 복사 2회" })).toBeVisible()
  await expect(usageRow.getByRole("cell", { name: "일괄 복사 1회" })).toBeVisible()
  await expect(usageRow.getByRole("cell", { name: "합계 3회" })).toBeVisible()
})

test("클립보드 권한이 거절되면 원인을 알리고 일반 복사 횟수를 늘리지 않는다", async ({
  context,
  page,
}) => {
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

  await editor.click({ modifiers: ["Meta", "Alt"] })
  await page.getByRole("button", { name: "일괄 복사 1개" }).click()
  const panel = page.getByRole("dialog", { name: "일괄 복사" })
  await panel.getByRole("button", { exact: true, name: "복사" }).click()
  const batchCopyAlert = page.getByRole("alert").filter({
    hasText: "브라우저가 클립보드 쓰기를 허용하지 않았습니다.",
  })

  await expect(batchCopyAlert).toBeVisible()

  await panel.getByRole("button", { name: "일괄 복사 패널 닫기" }).click()
  await page.setViewportSize({ height: 720, width: 320 })
  await page.getByRole("button", { name: "탐색" }).click()
  await page.getByRole("link", { exact: true, name: "사용 빈도" }).click()
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
