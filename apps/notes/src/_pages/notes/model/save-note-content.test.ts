import { describe, expect, it } from "vitest"

import type { Note } from "@/entities/note"
import { saveNoteContent } from "./save-note-content"

const timestamp = "2026-09-01T03:00:00.000Z"
const note: Note = {
  content: "저장된 원문",
  contentRevision: 0,
  createdAt: "2026-09-01T00:00:00.000Z",
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: "note-save-command",
  tabIndex: 1000,
  updatedAt: "2026-09-01T01:00:00.000Z",
}

describe("본문 저장", () => {
  it("같은 본문은 쓰지 않고 현재 메모를 반환한다", async () => {
    const result = await saveNoteContent({
      notes: { saveEdit: () => { throw new Error("Unexpected write") } },
      now: () => timestamp,
    }, note, note.content)
    expect(result).toEqual({ status: "unchanged", note })
  })

  it("빈 문자열로 지운 편집과 삭제된 메모에 도착한 편집을 구별한다", async () => {
    const saved = await saveNoteContent({
      notes: { saveEdit: async (_original, edited) => edited },
      now: () => timestamp,
    }, note, "")
    expect(saved).toMatchObject({ status: "saved", note: { id: note.id, content: "" } })
    const deleted = await saveNoteContent({
      notes: { saveEdit: async () => null },
      now: () => timestamp,
    }, note, "")
    expect(deleted).toEqual({ status: "failure", reason: "note-missing" })
  })
})
