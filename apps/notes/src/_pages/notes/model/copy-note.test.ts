import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  NOTE_HEIGHT_MIN,
  NOTE_TAB_INDEX_MIN,
  NOTE_WIDTH_MIN,
  reviseNote,
  type Note,
} from "@/entities/note"
import type {
  ClipboardWriteResult,
  ClipboardWriter,
} from "@/shared/lib/clipboard"

import { copyNote } from "./copy-note"

const copyableNote = fc.record({
  content: fc.string({ maxLength: 80, unit: "grapheme-ascii" }),
  id: fc.uuid(),
}).map(({ content, id }): Note => {
  const timestamp = Date.now()
  return {
    content,
    createdAt: timestamp,
    geometry: {
      height: NOTE_HEIGHT_MIN,
      width: NOTE_WIDTH_MIN,
      x: 0,
      y: 0,
      zIndex: 1,
    },
    id,
    tabIndex: NOTE_TAB_INDEX_MIN,
    updatedAt: timestamp,
  }
})

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

describe("메모 개별 복사", () => {
  it("현재 메모의 원문 전체를 복사한다", async () => {
    await fc.assert(fc.asyncProperty(copyableNote, async (note) => {
      const clipboard = new RecordingClipboardWriter()

      const result = await copyNote(clipboard, note)

      expect(result).toEqual({ status: "copied" })
      expect(clipboard.text).toBe(note.content)
    }))
  })

  it.each([
    "api-unavailable",
    "not-allowed",
    "write-failed",
  ] as const)(
    "%s 오류가 나면 복사 실패 사유를 반환한다",
    async (reason) => {
      await fc.assert(fc.asyncProperty(copyableNote, async (note) => {
        const clipboard = new RecordingClipboardWriter({
          reason,
          status: "failed",
        })

        const result = await copyNote(clipboard, note)

        expect(result).toEqual({
          reason,
          status: "clipboard-failure",
        })
        expect(clipboard.text).toBeNull()
      }))
    },
  )

  it("본문을 바꾼 뒤에는 수정한 원문을 복사한다", async () => {
    await fc.assert(fc.asyncProperty(
      copyableNote,
      fc.string({ maxLength: 80, unit: "grapheme-ascii" }),
      async (note, nextContent) => {
        const clipboard = new RecordingClipboardWriter()
        const revised = reviseNote(note, {
          content: nextContent,
          updatedAt: Date.now(),
        })

        await copyNote(clipboard, note)
        await copyNote(clipboard, revised)

        expect(clipboard.text).toBe(nextContent)
      },
    ))
  })
})
