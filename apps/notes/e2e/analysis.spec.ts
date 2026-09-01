import { expect, test } from "@playwright/test"

import { createNoteThroughUi } from "./support/create-note-through-ui"

test("명시적인 분석 요청 뒤 Worker 자산을 실행해 분석 후보를 보여준다", async ({
  page,
}) => {
  await page.goto("/analysis/")
  expect(page.workers()).toHaveLength(0)

  const workerStarted = page.waitForEvent("worker")
  const runButton = page.getByRole("button", { name: "분석 실행" })

  await runButton.click()
  const worker = await workerStarted

  await expect(page.getByRole("status")).toContainText(
    "분석 후보가 없습니다.",
  )
  await expect(runButton).toBeEnabled()
  expect(page.workers()).toHaveLength(1)
  expect(worker.url()).toMatch(/\.js$/u)

  const response = await page.request.get(worker.url())

  expect(response.ok()).toBe(true)
  expect(response.headers()["content-type"]).toMatch(
    /^(?:application|text)\/javascript/u,
  )
})

test("Worker 자산을 불러오지 못한 뒤 오류를 알리고 다시 실행한다", async ({
  page,
}) => {
  await page.goto("/analysis/")
  await page.route("**/*.js", (route) => route.abort("failed"))
  const runButton = page.getByRole("button", { name: "분석 실행" })

  await runButton.click()
  await expect(
    page
      .getByRole("region", { name: "텍스트 분석 상태와 결과" })
      .getByRole("alert"),
  ).toContainText("분석을 완료하지 못했습니다. 다시 시도하세요.")

  await page.unroute("**/*.js")
  await runButton.click()
  await expect(page.getByRole("status")).toContainText(
    "분석 후보가 없습니다.",
  )
})

test("분석 요청 직후 메모 화면으로 이동할 수 있다", async ({ page }) => {
  const content = Array.from(
    { length: 160 },
    (_, index) => String.fromCodePoint(0x3400 + index).repeat(16),
  ).join("\n")
  await page.goto("/")
  await createNoteThroughUi(page, content)
  await page.goto("/analysis/")
  const workerStarted = page.waitForEvent("worker")

  await page.getByRole("button", { name: "분석 실행" }).click()
  await workerStarted
  await page.getByRole("link", { exact: true, name: "메모" }).click()

  await expect(page).toHaveURL("/")
  await expect(
    page.getByRole("article").filter({ hasText: content, visible: true }),
  ).toBeVisible()
})
