import { describe, expect, it } from "vitest"

import {
  activateBatchCopyPanel,
  activateNoteProperties,
  clearNoteSelection,
  closeActivePanel,
  closeNoteProperties,
  confirmNoteGeometryDraft,
  createNoteWorkspaceState,
  forgetNote,
  restoreNoteGeometryDraft,
  selectNote,
  updateNoteGeometryDraft,
} from "./note-workspace-state"

const initialFields = {
  height: "240",
  width: "320",
  x: "40",
  y: "60",
}

function activateFirstNote() {
  return activateNoteProperties(
    createNoteWorkspaceState(),
    { id: "note-1", revision: 3 },
    initialFields,
  )
}

describe("메모 작업 상태", () => {
  it("메모를 선택해도 기존 속성 대상과 최근 패널을 유지한다", () => {
    const selected = selectNote(activateFirstNote(), "note-2")

    expect(selected.selectedNoteId).toBe("note-2")
    expect(selected.activePanel).toBe("note-properties")
    expect(selected.geometryDraft?.note.id).toBe("note-1")
  })

  it("속성 패널을 활성화하면 선택한 메모를 대상과 최근 패널에 반영한다", () => {
    const selected = selectNote(createNoteWorkspaceState(), "note-2")
    const activated = activateNoteProperties(
      selected,
      { id: "note-2", revision: 4 },
      { height: "280", width: "360", x: "80", y: "100" },
    )

    expect(activated.selectedNoteId).toBe("note-2")
    expect(activated.activePanel).toBe("note-properties")
    expect(activated.geometryDraft).toMatchObject({
      fields: { height: "280", width: "360", x: "80", y: "100" },
      note: { id: "note-2", revision: 4 },
    })
  })

  it("키보드와 포인터의 속성 활성화가 서로 다른 포커스 요청을 남긴다", () => {
    const initial = activateFirstNote()
    const keyboard = activateNoteProperties(
      initial,
      { id: "note-1", revision: 3 },
      initialFields,
      "first-field",
    )
    const pointer = activateNoteProperties(
      keyboard,
      { id: "note-1", revision: 3 },
      initialFields,
      "preserve",
    )

    expect(keyboard.propertiesFocus).toBe("first-field")
    expect(pointer.propertiesFocus).toBe("preserve")
  })

  it("일괄 복사 패널로 전환해도 메모 선택과 속성 초안을 보존한다", () => {
    const batchCopy = activateBatchCopyPanel(activateFirstNote())

    expect(batchCopy.activePanel).toBe("batch-copy")
    expect(batchCopy.selectedNoteId).toBe("note-1")
    expect(batchCopy.geometryDraft?.fields).toEqual(initialFields)
  })

  it("선택을 해제해도 속성 대상과 초안 및 최근 패널을 보존한다", () => {
    const batchCopy = activateBatchCopyPanel(activateFirstNote())
    const cleared = clearNoteSelection(batchCopy)

    expect(cleared.selectedNoteId).toBeNull()
    expect(cleared.activePanel).toBe("batch-copy")
    expect(cleared.geometryDraft?.note.id).toBe("note-1")
  })

  it("속성 초안을 고쳐도 다른 작업 상태를 바꾸지 않는다", () => {
    const updated = updateNoteGeometryDraft(
      activateFirstNote(),
      "width",
      "480",
    )

    expect(updated.geometryDraft?.fields.width).toBe("480")
    expect(updated.geometryDraft?.note.id).toBe("note-1")
    expect(updated.selectedNoteId).toBe("note-1")
    expect(updated.activePanel).toBe("note-properties")
  })

  it("최근 패널을 닫아도 선택, 속성 대상과 초안을 유지한다", () => {
    const closed = closeActivePanel(activateFirstNote())

    expect(closed.activePanel).toBeNull()
    expect(closed.selectedNoteId).toBe("note-1")
    expect(closed.geometryDraft?.note.id).toBe("note-1")
  })

  it("삭제한 메모가 속성 대상이면 선택, 속성 초안과 패널을 비운다", () => {
    const forgotten = forgetNote(activateFirstNote(), "note-1")

    expect(forgotten.activePanel).toBeNull()
    expect(forgotten.geometryDraft).toBeNull()
    expect(forgotten.selectedNoteId).toBeNull()
  })

  it("다른 메모를 삭제해도 현재 선택과 속성 패널을 유지한다", () => {
    const properties = activateFirstNote()

    expect(forgetNote(properties, "note-2")).toBe(properties)
  })

  it("늦게 끝난 저장은 다른 메모의 속성 대상을 덮지 않는다", () => {
    const first = activateFirstNote()
    const second = activateNoteProperties(
      first,
      { id: "note-2", revision: 5 },
      { height: "260", width: "340", x: "80", y: "90" },
    )
    const completed = confirmNoteGeometryDraft(
      second,
      { id: "note-1", revision: 3 },
      { id: "note-1", revision: 4 },
    )

    expect(completed).toBe(second)
    expect(completed.geometryDraft?.note.id).toBe("note-2")
  })

  it("속성 저장이 끝나도 그 사이에 고친 초안은 유지한다", () => {
    const edited = updateNoteGeometryDraft(
      activateFirstNote(),
      "width",
      "480",
    )
    const completed = confirmNoteGeometryDraft(
      edited,
      { id: "note-1", revision: 3 },
      { id: "note-1", revision: 4 },
    )

    expect(completed.geometryDraft?.fields.width).toBe("480")
    expect(completed.geometryDraft?.note.revision).toBe(4)
  })

  it("속성 저장 뒤 닫기 요청은 다른 최근 패널을 닫지 않는다", () => {
    const batchCopy = activateBatchCopyPanel(activateFirstNote())
    const closed = closeNoteProperties(batchCopy, "note-1")

    expect(closed).toBe(batchCopy)
    expect(closed.activePanel).toBe("batch-copy")
  })

  it("저장값으로 되돌리면 초안을 바꾸고 속성 패널을 닫는다", () => {
    const edited = updateNoteGeometryDraft(
      activateFirstNote(),
      "x",
      "잘못된 값",
    )
    const restored = restoreNoteGeometryDraft(
      edited,
      { id: "note-1", revision: 4 },
      { height: "280", width: "360", x: "70", y: "80" },
    )

    expect(restored.activePanel).toBeNull()
    expect(restored.geometryDraft).toMatchObject({
      fields: { height: "280", width: "360", x: "70", y: "80" },
      note: { id: "note-1", revision: 4 },
    })
  })
})
