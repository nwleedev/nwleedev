import { describe, expect, it } from "vitest"

import type { ConfirmingMobileBatchCopyDraft } from "@/entities/batch-copy"
import type {
  ClipboardWriteResult,
  ClipboardWriter,
} from "@/shared/lib/clipboard"

import { copyMobileBatchText } from "./copy-mobile-batch-text"

const draft: ConfirmingMobileBatchCopyDraft = {
  clickCount: 2,
  entries: [
    {
      id: "entry-1",
      sourceNote: { contentRevision: 1, id: "note-1" },
      textSnapshot: "첫 문장",
    },
    {
      id: "entry-2",
      sourceNote: { contentRevision: 2, id: "note-2" },
      textSnapshot: "둘째 문장",
    },
  ],
  id: "mobile-batch-copy",
  startedAt: "2026-09-02T03:00:00.000Z",
  step: "confirming",
  updatedAt: "2026-09-02T03:01:00.000Z",
}

class RecordingClipboardWriter implements ClipboardWriter {
  text: string | null = null

  constructor(
    private readonly result: ClipboardWriteResult = { status: "written" },
  ) {}

  async writeText(text: string) {
    if (this.result.status === "written") {
      this.text = text
    }

    return this.result
  }
}

describe("모바일 일괄 복사 결과", () => {
  it("확인 작업 순서대로 줄바꿈한 정확한 문자열을 복사한다", async () => {
    const clipboard = new RecordingClipboardWriter()

    const result = await copyMobileBatchText(clipboard, draft)

    expect(result).toEqual({ status: "copied" })
    expect(clipboard.text).toBe("첫 문장\n둘째 문장")
  })

  it("Clipboard 실패 원인을 보존하고 값을 기록하지 않는다", async () => {
    const clipboard = new RecordingClipboardWriter({
      reason: "not-allowed",
      status: "failed",
    })

    const result = await copyMobileBatchText(clipboard, draft)

    expect(result).toEqual({
      reason: "not-allowed",
      status: "clipboard-failure",
    })
    expect(clipboard.text).toBeNull()
  })
})
