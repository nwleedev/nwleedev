import { describe, expect, it } from "vitest"

import type { Accumulator } from "@/entities/accumulator"
import type { ClipboardWriter } from "@/shared/lib/clipboard"

import { copyAccumulatedText } from "./copyAccumulatedText"

const accumulator: Accumulator = {
  content: {
    items: [
      {
        addedAt: "2026-09-01T01:00:00.000Z",
        id: "item-1",
        sourceNote: { contentRevision: 0, id: "note-1" },
        textSnapshot: "첫 문장",
      },
      {
        addedAt: "2026-09-01T02:00:00.000Z",
        id: "item-2",
        sourceNote: { contentRevision: 1, id: "note-2" },
        textSnapshot: "둘째 문장",
      },
    ],
    separator: "\n",
  },
  id: "primary",
  revision: 2,
  updatedAt: "2026-09-01T02:00:00.000Z",
}

class RecordingClipboard implements ClipboardWriter {
  text: string | null = null

  constructor(private readonly failure: Error | null = null) {}

  async writeText(text: string) {
    if (this.failure !== null) {
      throw this.failure
    }

    this.text = text
  }
}

describe("copying accumulated text", () => {
  it("writes the current combined preview without changing usage data", async () => {
    const clipboard = new RecordingClipboard()

    const result = await copyAccumulatedText(clipboard, accumulator)

    expect(result).toEqual({ status: "copied" })
    expect(clipboard.text).toBe("첫 문장\n둘째 문장")
  })

  it("reports a Clipboard failure without a copied value", async () => {
    const clipboard = new RecordingClipboard(new Error("permission denied"))

    const result = await copyAccumulatedText(clipboard, accumulator)

    expect(result).toEqual({ status: "clipboard-failure" })
    expect(clipboard.text).toBeNull()
  })
})
