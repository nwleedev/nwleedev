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

test("메모 본문 클릭으로 원문 전체를 클립보드에 쓴다", async ({
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

  await note.getByText(content, { exact: true }).click()
  await expect(note.getByRole("status")).toContainText("복사했습니다.")
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(content)
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
  await page.goto("/")
  const content = "클립보드 거절을 확인할 메모"
  const note = await createNoteThroughUi(page, content)

  await note.getByRole("button", { name: "복사" }).click()
  await expect(note.getByRole("alert")).toContainText(
    "클립보드 쓰기가 허용되지 않았습니다.",
  )
  await expect(
    note.getByRole("link", { name: /설정/u }),
  ).toHaveCount(0)

  await note.getByRole("button", { name: "누적" }).click()
  const panel = page.getByRole("complementary", { name: "누적 텍스트" })
  await panel.getByRole("button", { exact: true, name: "복사" }).click()
  await expect(panel.getByRole("alert")).toContainText(
    "클립보드 쓰기를 허용하지 않았습니다.",
  )

  await panel.getByRole("button", { name: "닫기" }).click()
  await page.setViewportSize({ height: 720, width: 320 })
  await page.getByRole("button", { name: "탐색" }).click()
  await page.getByRole("link", { exact: true, name: "사용 빈도" }).click()
  const usageRow = page.getByRole("row").filter({ hasText: content })
  await expect(
    usageRow.getByRole("cell", { name: "일반 복사 0회" }),
  ).toBeVisible()
  await expect(
    usageRow.getByRole("cell", { name: "누적 1회" }),
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
