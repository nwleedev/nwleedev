import { describe, expect, it } from "vitest"

import type { Note } from "@/entities/note"
import type { IndividualCopyUsageWriter } from "@/entities/usage"
import type {
  ClipboardWriteResult,
  ClipboardWriter,
} from "@/shared/lib/clipboard"

import { copyNote } from "./copy-note"

const note: Note = {
  content: "복사할 메모 원문",
  contentRevision: 3,
  createdAt: "2026-09-01T01:00:00.000Z",
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: "note-copy",
  revision: 5,
  tabIndex: 1000,
  updatedAt: "2026-09-01T02:00:00.000Z",
}

class RecordingClipboardWriter implements ClipboardWriter {
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

class RecordingUsageWriter implements IndividualCopyUsageWriter {
  input: Parameters<IndividualCopyUsageWriter["recordIndividualCopy"]>[0] | null =
    null

  constructor(private readonly failure: Error | null = null) {}

  async recordIndividualCopy(
    input: Parameters<IndividualCopyUsageWriter["recordIndividualCopy"]>[0],
  ) {
    if (this.failure !== null) {
      throw this.failure
    }

    this.input = input
  }
}

describe("메모 개별 복사", () => {
  it("현재 원문 전체를 쓴 뒤 개별 복사 횟수를 기록한다", async () => {
    const clipboard = new RecordingClipboardWriter()
    const usage = new RecordingUsageWriter()

    const result = await copyNote({ clipboard, usage }, note)

    expect(result).toEqual({ status: "copied" })
    expect(clipboard.text).toBe(note.content)
    expect(usage.input).toEqual({
      note: { contentRevision: note.contentRevision, id: note.id },
      textSnapshot: note.content,
    })
  })

  it.each([
    "api-unavailable",
    "not-allowed",
    "write-failed",
  ] as const)(
    "%s 오류가 나면 개별 복사 횟수를 기록하지 않는다",
    async (reason) => {
      const clipboard = new RecordingClipboardWriter({
        reason,
        status: "failed",
      })
      const usage = new RecordingUsageWriter()

      const result = await copyNote({ clipboard, usage }, note)

      expect(result).toEqual({
        reason,
        status: "clipboard-failure",
      })
      expect(clipboard.text).toBeNull()
      expect(usage.input).toBeNull()
    },
  )

  it("keeps the clipboard result distinct when usage recording fails", async () => {
    const clipboard = new RecordingClipboardWriter()
    const usage = new RecordingUsageWriter(new Error("storage unavailable"))

    const result = await copyNote({ clipboard, usage }, note)

    expect(result).toEqual({ status: "usage-failure" })
    expect(clipboard.text).toBe(note.content)
    expect(usage.input).toBeNull()
  })
})
