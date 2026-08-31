export class BrowserClipboardWriter {
  async writeText(text: string) {
    await navigator.clipboard.writeText(text)
  }
}
