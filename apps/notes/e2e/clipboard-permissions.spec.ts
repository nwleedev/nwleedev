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

test("클립보드 권한이 거절되면 원인을 알리고 사용 횟수를 늘리지 않는다", async ({
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

  await page.getByRole("link", { exact: true, name: "사용 빈도" }).click()
  await expect(page.getByRole("status")).toContainText(
    "복사 기록이 없습니다.",
  )
})
