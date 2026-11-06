import * as fc from "fast-check"
import { expect, it } from "vitest"

import type { Note } from "@/entities/note"
import { noteModelSettings } from "@/shared/lib/note-model-settings"

import {
  beginNoteContentSave,
  completeNoteContentSave,
  createNoteContentSaveState,
  failNoteContentSave,
} from "./note-content-save-state"
import { saveNoteContent } from "./save-note-content"

const initialTimestamp = new Date().toISOString()
const initialNote: Note = {
  content: "저장된 원문",
  contentRevision: 0,
  createdAt: initialTimestamp,
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: crypto.randomUUID(),
  revision: 0,
  tabIndex: 1000,
  updatedAt: initialTimestamp,
}

it("연속 편집과 쓰기 실패 뒤 최신 입력을 다시 저장한다", async () => {
  const actions = fc.array(fc.record({ content: fc.string(), fails: fc.boolean() }), { minLength: 1, maxLength: noteModelSettings.maxCommands })
  await fc.assert(fc.asyncProperty(actions, async (edits) => {
    let stored = initialNote
    let state = createNoteContentSaveState(initialNote)
    let expected = initialNote.content

    async function edit(content: string, fails: boolean) {
      const started = beginNoteContentSave(state, content)
      state = started.state
      if (!started.request) return
      const result = await saveNoteContent({
        now: () => initialTimestamp,
        notes: { saveEdit: async (_opened, next) => {
          if (fails) throw new Error("Controlled write failure")
          stored = next
          return next
        } },
      }, started.request.note, started.request.content)
      state = result.status === "failure"
        ? failNoteContentSave(state)
        : completeNoteContentSave(state, result.note)
    }

    for (const action of edits) {
      await edit(action.content, action.fails)
      if (!action.fails) expected = action.content
      expect(stored.content).toBe(expected)
      expect(state.note.content).toBe(expected)
    }
    const latest = edits[edits.length - 1].content
    await edit(latest, false)
    expect(stored.content).toBe(latest)
    expect(state.status).toBe("idle")
  }), { numRuns: noteModelSettings.numRuns })
})
