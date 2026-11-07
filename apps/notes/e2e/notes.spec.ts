import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("초기 화면을 hydration 오류 없이 연다", async ({ context }) => {
  const page = await context.newPage()
  const consoleMessages: string[] = []
  const pageErrors: string[] = []

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleMessages.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on("pageerror", (error) => pageErrors.push(error.message))

  await page.goto("/")
  await expect(page.getByRole("main")).toBeVisible()
  await expect(
    page.getByRole("region", { name: "메모 작업 영역" }),
  ).toBeVisible()
  await expect(
    page.getByText("접속 주소 확인 중", { exact: true }),
  ).toHaveCount(0)
  expect(consoleMessages).toEqual([])
  const observedPageErrors = [...pageErrors]
  const knownPrefetchErrors = observedPageErrors.filter((message) =>
    /^\/localhost:4173\/\S*\?_rsc=\S+ due to access control checks\.$/u.test(
      message,
    ),
  )
  expect(knownPrefetchErrors).toEqual(observedPageErrors)
})

test("허용하지 않는 주소에서 다시 접속할 방법을 안내한다", async ({ page }) => {
  const unsupportedAddress = new URL(page.url())
  unsupportedAddress.hostname = "localhost."

  await page.goto(unsupportedAddress.toString())
  await expect(
    page.getByRole("heading", { name: "잘못된 접근입니다." }),
  ).toBeVisible()
  await expect(
    page.getByText(
      /HTTPS 주소 또는 http:\/\/localhost 주소로 다시 접속하세요\./u,
    ),
  ).toBeVisible()
  await expect(
    page.getByText("지원하지 않는 접속 주소", { exact: true }),
  ).toHaveCount(0)
})
