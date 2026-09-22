import { expect, type Page } from "@playwright/test"

const releaseFunctionName = "releaseActivePointerCapture"

export async function preparePointerCaptureRelease(page: Page) {
  await page.evaluate((functionName) => {
    window.addEventListener(
      "pointerdown",
      (event) => {
        const target = event.target

        if (!(target instanceof Element)) {
          return
        }

        Reflect.set(window, functionName, () => {
          let element: Element | null = target

          while (element !== null) {
            if (element.hasPointerCapture(event.pointerId)) {
              element.releasePointerCapture(event.pointerId)
              return true
            }

            element = element.parentElement
          }

          return false
        })
      },
      { capture: true, once: true },
    )
  }, releaseFunctionName)
}

export async function releasePointerCapture(page: Page) {
  const released = await page.evaluate((functionName) => {
    const release = Reflect.get(window, functionName)
    return typeof release === "function" && release()
  }, releaseFunctionName)

  expect(released).toBe(true)
}
