import type { Page } from "@playwright/test"

export async function delayNextWriteCompletion(page: Page, storeName: "notes" | "noteDrafts" | "batchCopyLists") {
  await page.evaluate((targetStore) => {
    type DelayedWriteWindow = typeof window & { delayedWriteCommitted?: Promise<void> }
    const currentWindow = window as DelayedWriteWindow
    const originalTransaction = IDBDatabase.prototype.transaction
    let reportCommitted: (() => void) | undefined
    currentWindow.delayedWriteCommitted = new Promise<void>((resolve) => {
      reportCommitted = resolve
    })
    IDBDatabase.prototype.transaction = function (storeNames, mode) {
      const transaction = originalTransaction.call(this, storeNames, mode)
      const usesTarget = Array.isArray(storeNames)
        ? storeNames.includes(targetStore)
        : storeNames === targetStore
      if (!usesTarget || mode !== "readwrite") return transaction
      IDBDatabase.prototype.transaction = originalTransaction
      let completionHandler: ((event: Event) => unknown) | null = null
      Object.defineProperty(transaction, "oncomplete", {
        configurable: true,
        get: () => completionHandler,
        set: (handler: ((event: Event) => unknown) | null) => { completionHandler = handler },
      })
      transaction.addEventListener("complete", (event) => {
        window.addEventListener("release-delayed-write", () => {
          completionHandler?.call(transaction, event)
        }, { once: true })
        reportCommitted?.()
      })
      return transaction
    }
  }, storeName)

  return {
    waitUntilCommitted: () => page.evaluate(() => {
      type DelayedWriteWindow = typeof window & { delayedWriteCommitted?: Promise<void> }
      return (window as DelayedWriteWindow).delayedWriteCommitted
    }),
    release: () => page.evaluate(() => {
      window.dispatchEvent(new Event("release-delayed-write"))
    }),
  }
}
