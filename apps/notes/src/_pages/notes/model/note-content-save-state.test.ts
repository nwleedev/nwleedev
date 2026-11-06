import { describe, expect, it } from "vitest"

import type { Note } from "@/entities/note"

import {
  beginNoteContentSave,
  completeNoteContentSave,
  createNoteContentSaveState,
  failNoteContentSave,
  type NoteContentSaveRequest,
} from "./note-content-save-state"

const note: Note = {
  content: "저장된 원문",
  createdAt: Date.parse("2026-09-01T00:00:00.000Z"),
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: "note-save-state",
  tabIndex: 1000,
  updatedAt: Date.parse("2026-09-01T01:00:00.000Z"),
}

function requireSaveRequest(
  request: NoteContentSaveRequest | null,
): NoteContentSaveRequest {
  if (request === null) {
    throw new Error("Expected a save request")
  }

  return request
}

describe("note content save state", () => {
  it("starts another save with newer text after an earlier save completes", () => {
    const saving = beginNoteContentSave(
      createNoteContentSaveState(note),
      "먼저 저장할 원문",
    )
    const request = requireSaveRequest(saving.request)
    const savedNote = {
      ...note,
      content: request.content,
    }
    const completed = completeNoteContentSave(saving.state, savedNote)
    const nextSave = beginNoteContentSave(
      completed,
      "저장 중에 추가한 원문",
    )

    expect(nextSave.state).toMatchObject({
      note: { content: "먼저 저장할 원문" },
      status: "saving",
    })
    expect(nextSave.request?.content).toBe("저장 중에 추가한 원문")
  })

  it("offers the current text again after a failed save", () => {
    const saving = beginNoteContentSave(
      createNoteContentSaveState(note),
      "실패 뒤에도 남을 원문",
    )
    const failed = failNoteContentSave(saving.state)
    const retried = beginNoteContentSave(failed, "실패 뒤에도 남을 원문")

    expect(failed).toMatchObject({
      status: "failure",
    })
    expect(retried.request?.content).toBe("실패 뒤에도 남을 원문")
  })

  it("does not create a save request when the text is unchanged", () => {
    const result = beginNoteContentSave(
      createNoteContentSaveState(note),
      note.content,
    )

    expect(result.request).toBeNull()
    expect(result.state.status).toBe("idle")
  })
})
