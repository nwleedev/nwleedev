import { describe, expect, it } from "vitest"

import type { Note } from "@/entities/note"

import {
  beginNoteContentSave,
  completeNoteContentSave,
  createNoteContentSaveState,
  failNoteContentSave,
  updateNoteContentDraft,
  type NoteContentSaveRequest,
} from "./note-content-save-state"

const note: Note = {
  content: "저장된 원문",
  contentRevision: 2,
  createdAt: "2026-09-01T00:00:00.000Z",
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: "note-save-state",
  revision: 4,
  tabIndex: 1000,
  updatedAt: "2026-09-01T01:00:00.000Z",
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
  it("keeps newer text dirty when an earlier save completes", () => {
    const edited = updateNoteContentDraft(
      createNoteContentSaveState(note),
      "먼저 저장할 원문",
    )
    const saving = beginNoteContentSave(edited)
    const request = requireSaveRequest(saving.request)

    const editedAgain = updateNoteContentDraft(
      saving.state,
      "저장 중에 추가한 원문",
    )
    const savedNote = {
      ...note,
      content: request.content,
      contentRevision: 3,
      revision: 5,
    }
    const completed = completeNoteContentSave(editedAgain, savedNote)

    expect(completed).toMatchObject({
      draftContent: "저장 중에 추가한 원문",
      note: { content: "먼저 저장할 원문", contentRevision: 3 },
      status: "dirty",
    })
  })

  it("preserves text and offers the same content after a failed save", () => {
    const edited = updateNoteContentDraft(
      createNoteContentSaveState(note),
      "실패 뒤에도 남을 원문",
    )
    const saving = beginNoteContentSave(edited)
    const failed = failNoteContentSave(saving.state)
    const retried = beginNoteContentSave(failed)

    expect(failed).toMatchObject({
      draftContent: "실패 뒤에도 남을 원문",
      status: "failure",
    })
    expect(retried.request?.content).toBe("실패 뒤에도 남을 원문")
  })

  it("does not create a save request when the text is unchanged", () => {
    const result = beginNoteContentSave(createNoteContentSaveState(note))

    expect(result.request).toBeNull()
    expect(result.state.status).toBe("clean")
  })
})
