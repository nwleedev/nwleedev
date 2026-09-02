import { describe, expect, it } from "vitest"

import type { Note } from "./note"
import { NoteDraftSchema, isRecoverableNoteDraft } from "./note-draft"

const note: Note = {
  content: "저장한 원문",
  contentRevision: 2,
  createdAt: "2026-09-01T01:00:00.000Z",
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: "note-1",
  revision: 4,
  tabIndex: 1000,
  updatedAt: "2026-09-01T02:00:00.000Z",
}

const draft = {
  content: "저장하지 않은 원문",
  note: { contentRevision: 2, id: "note-1" },
  updatedAt: "2026-09-01T03:00:00.000Z",
}

describe("메모 원문 복구 초안", () => {
  it("기준 원문과 다른 최신 초안을 복구 후보로 판정한다", () => {
    expect(NoteDraftSchema.safeParse(draft).success).toBe(true)
    expect(isRecoverableNoteDraft(draft, note)).toBe(true)
  })

  it("다른 메모나 이미 바뀐 원문을 기준으로 만든 초안은 사용하지 않는다", () => {
    expect(
      isRecoverableNoteDraft(
        { ...draft, note: { ...draft.note, id: "note-2" } },
        note,
      ),
    ).toBe(false)
    expect(
      isRecoverableNoteDraft(
        { ...draft, note: { ...draft.note, contentRevision: 1 } },
        note,
      ),
    ).toBe(false)
  })

  it("저장된 원문과 같은 초안은 복구 후보로 표시하지 않는다", () => {
    expect(isRecoverableNoteDraft({ ...draft, content: note.content }, note)).toBe(
      false,
    )
  })
})
