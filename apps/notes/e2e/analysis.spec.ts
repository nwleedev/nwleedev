import { expect, test } from "@playwright/test"

test("명시적인 분석 요청 뒤 Worker 자산을 실행해 결과를 보여준다", async ({
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
