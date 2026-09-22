import type { Locator } from "@playwright/test"

export async function selectTextRange(
  field: Locator,
  start: number,
  end: number,
) {
  await field.focus()
  await field.evaluate((element, selection) => {
    if (
      !("setSelectionRange" in element)
      || typeof element.setSelectionRange !== "function"
    ) {
      throw new Error("The selected control does not support text selection")
    }

    element.setSelectionRange(selection.start, selection.end)
  }, { end, start })
}
