import type { ClipboardWriter } from "./ClipboardWriter"

export class BrowserClipboardWriter implements ClipboardWriter {
  async writeText(text: string) {
    await navigator.clipboard.writeText(text)
  }
}
