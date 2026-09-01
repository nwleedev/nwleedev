import { expect, test } from "@playwright/test"

import { createNoteThroughUi } from "./support/createNoteThroughUi"

const applicationOrigin = "http://localhost:4173"

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
