import { describe, expect, it } from "vitest"

import type { BatchCopyList } from "@/entities/batch-copy"
import type {
  ClipboardWriteResult,
  ClipboardWriter,
} from "@/shared/lib/clipboard"

import { copyBatchText } from "./copy-batch-text"

const list: BatchCopyList = {
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

  constructor(
    private readonly result: ClipboardWriteResult = { status: "written" },
  ) {}

  async writeText(text: string) {
    if (this.result.status === "failed") {
      return this.result
    }

    this.text = text
    return this.result
  }
}

describe("일괄 복사", () => {
  it("현재 목록 순서대로 합친 원문을 Clipboard에 쓴다", async () => {
    const clipboard = new RecordingClipboard()

    const result = await copyBatchText(clipboard, list)

    expect(result).toEqual({ status: "copied" })
    expect(clipboard.text).toBe("첫 문장\n둘째 문장")
  })

  it("reports a Clipboard failure without a copied value", async () => {
    const clipboard = new RecordingClipboard({
      reason: "not-allowed",
      status: "failed",
    })

    const result = await copyBatchText(clipboard, list)

    expect(result).toEqual({
      reason: "not-allowed",
      status: "clipboard-failure",
    })
    expect(clipboard.text).toBeNull()
  })
})
