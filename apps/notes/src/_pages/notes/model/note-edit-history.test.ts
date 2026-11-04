import fc from "fast-check"
import { describe, expect, it } from "vitest"

import { createNoteEditHistory, recordNoteEdit, replayNoteEdit } from "./note-edit-history"

function selection(position: number) {
  return { start: position, end: position, direction: "none" as const }
}

describe("메모 본문 편집 이력", () => {
  it("임의의 본문 교체를 되돌리고 다시 적용하면서 선택 영역을 복원한다", () => {
    fc.assert(fc.property(fc.string(), fc.string(), (before, after) => {
      fc.pre(before !== after)
      const history = recordNoteEdit(createNoteEditHistory(), {
        before, after, beforeSelection: selection(before.length), afterSelection: selection(after.length),
        inputType: "insertFromPaste", time: 0,
      })
      const undone = replayNoteEdit(history, after, "undo")!
      expect(undone.content).toBe(before)
      expect(undone.selection).toEqual(selection(before.length))
      const redone = replayNoteEdit(undone.history, undone.content, "redo")!
      expect(redone.content).toBe(after)
      expect(redone.selection).toEqual(selection(after.length))
    }))
  })

  it("이어 쓴 글자는 함께 되돌리고 커서를 옮긴 편집은 따로 되돌린다", () => {
    let history = createNoteEditHistory()
    history = recordNoteEdit(history, { before: "", after: "가", beforeSelection: selection(0), afterSelection: selection(1), inputType: "insertText", time: 0 })
    history = recordNoteEdit(history, { before: "가", after: "가나", beforeSelection: selection(1), afterSelection: selection(2), inputType: "insertText", time: 100 })
    history = recordNoteEdit(history, { before: "가나", after: "다가나", beforeSelection: selection(0), afterSelection: selection(1), inputType: "insertText", time: 200 })
    const first = replayNoteEdit(history, "다가나", "undo")!
    expect(first.content).toBe("가나")
    const second = replayNoteEdit(first.history, first.content, "undo")!
    expect(second.content).toBe("")
    expect(replayNoteEdit(second.history, second.content, "undo")).toBeNull()
  })

  it("되돌린 뒤 새로 입력하면 이전 편집을 다시 실행하지 않는다", () => {
    const history = recordNoteEdit(createNoteEditHistory(), { before: "A", after: "AB", beforeSelection: selection(1), afterSelection: selection(2), inputType: "insertText", time: 0 })
    const undone = replayNoteEdit(history, "AB", "undo")!
    const changed = recordNoteEdit(undone.history, { before: "A", after: "AC", beforeSelection: selection(1), afterSelection: selection(2), inputType: "insertText", time: 100 })
    expect(replayNoteEdit(changed, "AC", "redo")).toBeNull()
    expect(replayNoteEdit(changed, "AC", "undo")?.content).toBe("A")
  })

  it.each(["deleteContentBackward", "deleteContentForward"])("%s 연속 삭제를 한 번에 복원한다", (inputType) => {
    const backward = inputType === "deleteContentBackward"
    const middle = backward ? "ab" : "bc"
    const end = backward ? "a" : "c"
    let history = recordNoteEdit(createNoteEditHistory(), { before: "abc", after: middle, beforeSelection: selection(backward ? 3 : 0), afterSelection: selection(backward ? 2 : 0), inputType, time: 0 })
    history = recordNoteEdit(history, { before: middle, after: end, beforeSelection: selection(backward ? 2 : 0), afterSelection: selection(backward ? 1 : 0), inputType, time: 100 })
    expect(replayNoteEdit(history, end, "undo")?.content).toBe("abc")
  })
})
