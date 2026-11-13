import type { ProjectDocument } from "@/entities/project"

export async function prepareArchive(document: ProjectDocument) {
  const worker = new Worker(new URL("./archive-worker.ts", import.meta.url), { type: "module" })
  try {
    return await new Promise<Blob>((resolve, reject) => {
      function failed() {
        reject(new Error("Archive creation failed"))
      }

      worker.addEventListener("message", ({ data }: MessageEvent<unknown>) => {
        if (data instanceof Blob) resolve(data)
        else failed()
      }, { once: true })
      worker.addEventListener("error", failed, { once: true })
      worker.addEventListener("messageerror", failed, { once: true })
      worker.postMessage(document)
    })
  } finally {
    worker.terminate()
  }
}
