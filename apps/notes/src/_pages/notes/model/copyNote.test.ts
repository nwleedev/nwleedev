import { describe, expect, it } from "vitest"

import type { Note } from "@/entities/note"
import type { OrdinaryCopyUsageWriter } from "@/entities/usage"

import type { ClipboardWriter } from "./ClipboardWriter"
import { copyNote } from "./copyNote"

const note: Note = {
  content: "복사할 메모 원문",
  contentRevision: 3,
  createdAt: "2026-09-01T01:00:00.000Z",
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: "note-copy",
  revision: 5,
  updatedAt: "2026-09-01T02:00:00.000Z",
}

class RecordingClipboardWriter implements ClipboardWriter {
  text: string | null = null

  constructor(private readonly failure: Error | null = null) {}

  async writeText(text: string) {
    if (this.failure !== null) {
      throw this.failure
    }

    this.text = text
  }
}

class RecordingUsageWriter implements OrdinaryCopyUsageWriter {
  input: Parameters<OrdinaryCopyUsageWriter["recordOrdinaryCopy"]>[0] | null =
    null

  constructor(private readonly failure: Error | null = null) {}

  async recordOrdinaryCopy(
    input: Parameters<OrdinaryCopyUsageWriter["recordOrdinaryCopy"]>[0],
  ) {
    if (this.failure !== null) {
      throw this.failure
    }

    this.input = input
  }
}

describe("copying a note", () => {
  it("writes the complete current text before recording its ordinary use", async () => {
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

  it("does not record use when the clipboard rejects the text", async () => {
    const clipboard = new RecordingClipboardWriter(
      new Error("clipboard unavailable"),
    )
    const usage = new RecordingUsageWriter()

    const result = await copyNote({ clipboard, usage }, note)

    expect(result).toEqual({ status: "clipboard-failure" })
    expect(clipboard.text).toBeNull()
    expect(usage.input).toBeNull()
  })

  it("keeps the clipboard result distinct when usage recording fails", async () => {
    const clipboard = new RecordingClipboardWriter()
    const usage = new RecordingUsageWriter(new Error("storage unavailable"))

    const result = await copyNote({ clipboard, usage }, note)

    expect(result).toEqual({ status: "usage-failure" })
    expect(clipboard.text).toBe(note.content)
    expect(usage.input).toBeNull()
  })
})
