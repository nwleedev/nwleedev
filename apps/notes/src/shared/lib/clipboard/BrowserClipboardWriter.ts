import type { ClipboardWriter } from "./ClipboardWriter"

function isNotAllowedError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false
  }

  return "name" in error && error.name === "NotAllowedError"
}

export class BrowserClipboardWriter implements ClipboardWriter {
  async writeText(text: string) {
    const clipboard = typeof navigator === "undefined"
      ? undefined
      : navigator.clipboard

    if (clipboard?.writeText === undefined) {
      return { reason: "api-unavailable", status: "failed" } as const
    }

    try {
      await clipboard.writeText(text)
      return { status: "written" } as const
    } catch (error) {
      if (isNotAllowedError(error)) {
        return { reason: "not-allowed", status: "failed" } as const
      }

      return { reason: "write-failed", status: "failed" } as const
    }
  }
}
