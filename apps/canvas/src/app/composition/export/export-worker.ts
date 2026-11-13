import type { ExportRequest } from "@/pages/editor"

import { render } from "./render"

self.addEventListener("message", async ({ data }: MessageEvent<{ request: ExportRequest; scale?: number }>) => {
  try {
    self.postMessage(await render(data.request, data.scale))
  } catch {
    self.postMessage(null)
  }
}, { once: true })
