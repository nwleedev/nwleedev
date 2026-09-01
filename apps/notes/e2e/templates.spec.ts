import { expect, test } from "@playwright/test"

import { selectTextRange } from "./support/select-text-range"

test("플레이스홀더마다 실제로 되돌릴 텍스트를 보여준다", async ({
  page,
}) => {
  const sourceText = "첫째 😀\n반복 😀\n둘째"
  const firstSelection = "😀"
  const secondSelection = "반복 😀\n둘째"
  const firstStart = sourceText.indexOf(firstSelection)
  const secondStart = sourceText.indexOf(secondSelection)

  await page.goto("/templates/")
  await page.getByRole("button", { name: "수동으로 작성" }).click()
  const sourceField = page.getByRole("textbox", { name: "원문" })

  await sourceField.fill(sourceText)
  await selectTextRange(
    sourceField,
    firstStart,
    firstStart + firstSelection.length,
  )
  await page.getByRole("button", { name: "플레이스홀더로 지정" }).click()
  await selectTextRange(
    sourceField,
    secondStart,
    secondStart + secondSelection.length,
  )
  await page.getByRole("button", { name: "플레이스홀더로 지정" }).click()

  const firstRestoreButton = page.getByRole("button", {
    name: "입력값 1: 일반 텍스트로 되돌리기",
  })
  const secondRestoreButton = page.getByRole("button", {
    name: "입력값 2: 일반 텍스트로 되돌리기",
  })
  const firstPlaceholder = page.getByRole("listitem").filter({
    has: firstRestoreButton,
  })
  const secondPlaceholder = page.getByRole("listitem").filter({
    has: secondRestoreButton,
  })

  await expect(firstPlaceholder).toContainText(firstSelection)
  await expect(secondPlaceholder).toContainText(secondSelection)
  await expect(
    firstRestoreButton,
  ).toHaveAccessibleDescription(firstSelection)
  await expect(
    secondRestoreButton,
  ).toHaveAccessibleDescription(secondSelection)
})

test("공백 이름 오류를 고친 템플릿을 저장하고 다시 사용한다", async ({
  page,
}) => {
  const sourceText = "안녕하세요, 이름"
  const selectedText = "이름"
  const selectionStart = sourceText.indexOf(selectedText)
  const templateTitle = "인사 템플릿"

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

  const titleField = page.getByRole("textbox", { name: "템플릿 이름" })

  await titleField.fill("   ")
  await page.getByRole("button", { name: "템플릿 저장" }).click()
  await expect(titleField).toBeFocused()
  await expect(
    page.getByText("템플릿 이름을 입력하세요.", { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText("저장된 템플릿이 없습니다.", { exact: true }),
  ).toBeVisible()

  await titleField.fill(`  ${templateTitle}  `)
  await page.getByRole("button", { name: "템플릿 저장" }).click()
  await expect(page.getByRole("status")).toContainText(
    "템플릿을 저장했습니다.",
  )

  await page.reload()
  const savedTemplate = page.getByRole("listitem").filter({
    hasText: templateTitle,
  })

  await expect(savedTemplate).toBeVisible()
  await savedTemplate.getByRole("button", { name: "사용" }).click()
  await page.getByRole("textbox", { name: "입력값 1" }).fill("민지")
  await page.getByRole("button", { name: "텍스트 생성" }).click()
  await expect(
    page.getByRole("region", { name: "생성한 텍스트" }),
  ).toContainText("안녕하세요, 민지")

  await page.reload()
  await expect(
    page.getByRole("region", { name: "생성한 텍스트" }),
  ).toHaveCount(0)
  await expect(
    page.getByRole("listitem").filter({ hasText: templateTitle }),
  ).toBeVisible()
})
