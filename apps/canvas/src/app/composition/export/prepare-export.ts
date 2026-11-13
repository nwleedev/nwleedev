import type { RenderExport } from "@/pages/editor"

import ExportWorker from "./export-worker?worker&inline"

export const prepareExport: RenderExport = async (request, signal) => {
  signal.throwIfAborted()
  const worker = new ExportWorker()
  const abort = () => rejectRequest?.(signal.reason)
  let rejectRequest: ((reason: unknown) => void) | undefined
  try {
    return await new Promise((resolve, reject) => {
      const fail = () => reject(new Error("Image export failed"))
      rejectRequest = reject
      signal.addEventListener("abort", abort, { once: true })
      worker.addEventListener("error", fail, { once: true })
      worker.addEventListener("messageerror", fail, { once: true })
      worker.addEventListener("message", ({ data }) => {
        if (data === null) fail()
        else resolve(data)
      }, { once: true })
      worker.postMessage(request)
    })
  } finally {
    signal.removeEventListener("abort", abort)
    worker.terminate()
  }
}
