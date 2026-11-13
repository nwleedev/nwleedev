import type { ProjectDocument } from "@/entities/project"

import { writeProject } from "./write-project"

self.addEventListener("message", async ({ data }: MessageEvent<ProjectDocument>) => {
  try {
    self.postMessage(await writeProject(data))
  } catch {
    self.postMessage(null)
  }
}, { once: true })
