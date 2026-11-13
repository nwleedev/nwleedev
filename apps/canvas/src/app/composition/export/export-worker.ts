import type { ExportRequest } from "@/pages/editor"

import { render } from "./render"

self.addEventListener("message", async ({ data }: MessageEvent<ExportRequest>) => {
  try {
    self.postMessage(await render(data))
  } catch {
    self.postMessage(null)
  }
}, { once: true })
