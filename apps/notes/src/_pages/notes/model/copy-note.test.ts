import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  NOTE_HEIGHT_MIN,
  NOTE_TAB_INDEX_MIN,
  NOTE_WIDTH_MIN,
  reviseNote,
  type Note,
} from "@/entities/note"
import type { IndividualCopyUsageWriter } from "@/entities/usage"
import type {
  ClipboardWriteResult,
  ClipboardWriter,
} from "@/shared/lib/clipboard"

import { copyNote } from "./copy-note"

const copyableNote = fc.record({
  content: fc.string({ maxLength: 80, unit: "grapheme-ascii" }),
  contentRevision: fc.nat({ max: 1000 }),
  id: fc.uuid(),
}).map(({ content, contentRevision, id }): Note => {
  const timestamp = new Date().toISOString()
  return {
    content,
    contentRevision,
    createdAt: timestamp,
    geometry: {
      height: NOTE_HEIGHT_MIN,
      width: NOTE_WIDTH_MIN,
      x: 0,
      y: 0,
      zIndex: 1,
    },
    id,
    revision: contentRevision,
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

class RecordingUsageWriter implements IndividualCopyUsageWriter {
  inputs: Parameters<IndividualCopyUsageWriter["recordIndividualCopy"]>[0][] = []

  constructor(private readonly failure: Error | null = null) {}

  async recordIndividualCopy(
    input: Parameters<IndividualCopyUsageWriter["recordIndividualCopy"]>[0],
  ) {
    if (this.failure !== null) {
      throw this.failure
    }

    this.inputs.push(input)
  }
}

describe("메모 개별 복사", () => {
  it("현재 원문 전체를 쓴 뒤 개별 복사 횟수를 기록한다", async () => {
    await fc.assert(fc.asyncProperty(copyableNote, async (note) => {
      const clipboard = new RecordingClipboardWriter()
      const usage = new RecordingUsageWriter()

      const result = await copyNote({ clipboard, usage }, note)

      expect(result).toEqual({ status: "copied" })
      expect(clipboard.text).toBe(note.content)
      expect(usage.inputs).toEqual([{
        note: { contentRevision: note.contentRevision, id: note.id },
        textSnapshot: note.content,
      }])
    }))
  })

  it.each([
    "api-unavailable",
    "not-allowed",
    "write-failed",
  ] as const)(
    "%s 오류가 나면 개별 복사 횟수를 기록하지 않는다",
    async (reason) => {
      await fc.assert(fc.asyncProperty(copyableNote, async (note) => {
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
        expect(usage.inputs).toEqual([])
      }))
    },
  )

  it("사용 기록이 실패해도 이미 쓴 Clipboard 원문을 보존한다", async () => {
    await fc.assert(fc.asyncProperty(copyableNote, async (note) => {
      const clipboard = new RecordingClipboardWriter()
      const usage = new RecordingUsageWriter(new Error("storage unavailable"))

      const result = await copyNote({ clipboard, usage }, note)

      expect(result).toEqual({ status: "usage-failure" })
      expect(clipboard.text).toBe(note.content)
      expect(usage.inputs).toEqual([])
    }))
  })

  it("본문을 바꾼 뒤에는 복사 당시의 두 원문 revision을 각각 전달한다", async () => {
    await fc.assert(fc.asyncProperty(
      copyableNote,
      fc.string({ maxLength: 80, unit: "grapheme-ascii" }),
      async (note, nextContent) => {
        const clipboard = new RecordingClipboardWriter()
        const usage = new RecordingUsageWriter()
        const revised = reviseNote(note, {
          content: nextContent,
          updatedAt: new Date().toISOString(),
        })

        await copyNote({ clipboard, usage }, note)
        await copyNote({ clipboard, usage }, revised)

        const nextRevision = note.contentRevision + Number(
          nextContent !== note.content,
        )
        expect(clipboard.text).toBe(nextContent)
        expect(usage.inputs).toEqual([
          {
            note: { contentRevision: note.contentRevision, id: note.id },
            textSnapshot: note.content,
          },
          {
            note: { contentRevision: nextRevision, id: note.id },
            textSnapshot: nextContent,
          },
        ])
      },
    ))
  })
})
