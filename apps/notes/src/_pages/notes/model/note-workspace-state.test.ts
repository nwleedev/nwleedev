import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  activateBatchCopyPanel,
  activateNoteProperties,
  clearNoteSelection,
  clearWorkspaceSelections,
  closeActivePanel,
  closeNoteProperties,
  confirmNotePropertiesTarget,
  createNoteWorkspaceState,
  forgetBatchCopyItem,
  forgetNote,
  restoreNotePropertiesTarget,
  selectNote,
  toggleBatchCopyItemSelection,
} from "./note-workspace-state"

function activateFirstNote() {
  return activateNoteProperties(
    createNoteWorkspaceState(),
    { id: "note-1", revision: 3 },
  )
}

describe("메모 작업 상태", () => {
  it("선택한 메모를 바꿨다가 해제해도 열린 속성의 메모는 바뀌지 않는다", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 2 }),
        fc.nat(),
        ([propertiesId, selectedId], revision) => {
          const properties = activateNoteProperties(
            createNoteWorkspaceState(),
            { id: propertiesId, revision },
          )
          const selected = selectNote(properties, selectedId)
          const cleared = clearWorkspaceSelections(selected)

          expect(selected.selectedNoteId).toBe(selectedId)
          expect(selected.propertiesTarget).toEqual({ id: propertiesId, revision })
          expect(cleared.selectedNoteId).toBeNull()
          expect(cleared.propertiesTarget).toEqual({ id: propertiesId, revision })
          expect(cleared.activePanel).toBe("note-properties")
        },
      ),
    )
  })

  it("새 작업에는 선택된 메모와 일괄 복사 항목이 없다", () => {
    const workspace = createNoteWorkspaceState()

    expect(workspace.selectedNoteId).toBeNull()
    expect(workspace.selectedBatchCopyItemId).toBeNull()
  })

  it("메모를 선택해도 기존 속성 대상과 최근 패널을 유지한다", () => {
    const selected = selectNote(activateFirstNote(), "note-2")

    expect(selected.selectedNoteId).toBe("note-2")
    expect(selected.activePanel).toBe("note-properties")
    expect(selected.propertiesTarget?.id).toBe("note-1")
  })

  it("속성 패널을 활성화하면 선택한 메모를 대상과 최근 패널에 반영한다", () => {
    const selected = selectNote(createNoteWorkspaceState(), "note-2")
    const activated = activateNoteProperties(
      selected,
      { id: "note-2", revision: 4 },
    )

    expect(activated.selectedNoteId).toBe("note-2")
    expect(activated.activePanel).toBe("note-properties")
    expect(activated.propertiesTarget).toEqual({
      id: "note-2",
      revision: 4,
    })
  })

  it("키보드와 포인터의 속성 활성화가 서로 다른 포커스 요청을 남긴다", () => {
    const initial = activateFirstNote()
    const keyboard = activateNoteProperties(
      initial,
      { id: "note-1", revision: 3 },
      "first-field",
    )
    const pointer = activateNoteProperties(
      keyboard,
      { id: "note-1", revision: 3 },
      "preserve",
    )

    expect(keyboard.propertiesFocus).toBe("first-field")
    expect(pointer.propertiesFocus).toBe("preserve")
  })

  it("일괄 복사 패널로 전환해도 메모 선택과 속성 대상을 보존한다", () => {
    const batchCopy = activateBatchCopyPanel(activateFirstNote())

    expect(batchCopy.activePanel).toBe("batch-copy")
    expect(batchCopy.selectedNoteId).toBe("note-1")
    expect(batchCopy.propertiesTarget?.id).toBe("note-1")
  })

  it("일괄 복사 항목 선택은 메모와 독립적으로 같은 항목을 선택하거나 해제한다", () => {
    const batchCopy = activateBatchCopyPanel(activateFirstNote())
    const selected = toggleBatchCopyItemSelection(batchCopy, "item-1")
    const cleared = toggleBatchCopyItemSelection(selected, "item-1")

    expect(selected.selectedBatchCopyItemId).toBe("item-1")
    expect(selected.selectedNoteId).toBe("note-1")
    expect(selected.activePanel).toBe("batch-copy")
    expect(selected.propertiesTarget?.id).toBe("note-1")
    expect(cleared.selectedBatchCopyItemId).toBeNull()
    expect(cleared.selectedNoteId).toBe("note-1")
  })

  it("Escape를 누르면 두 선택만 해제하고 패널 대상과 활성 상태를 유지한다", () => {
    const properties = activateFirstNote()
    const batchCopy = activateBatchCopyPanel(properties)
    const selected = toggleBatchCopyItemSelection(batchCopy, "item-1")
    const cleared = clearWorkspaceSelections(selected)

    expect(cleared.selectedNoteId).toBeNull()
    expect(cleared.selectedBatchCopyItemId).toBeNull()
    expect(cleared.activePanel).toBe("batch-copy")
    expect(cleared.propertiesTarget).toEqual(properties.propertiesTarget)
    expect(cleared.propertiesFocus).toBe(properties.propertiesFocus)
  })

  it("선택한 일괄 복사 항목을 제거하면 일괄 복사 항목 선택만 지운다", () => {
    const batchCopy = activateBatchCopyPanel(activateFirstNote())
    const selected = toggleBatchCopyItemSelection(batchCopy, "item-1")
    const forgotten = forgetBatchCopyItem(selected, "item-1")

    expect(forgotten.selectedBatchCopyItemId).toBeNull()
    expect(forgotten.selectedNoteId).toBe("note-1")
    expect(forgotten.activePanel).toBe("batch-copy")
    expect(forgotten.propertiesTarget).toEqual(selected.propertiesTarget)
  })

  it("선택을 해제해도 속성 대상과 최근 패널을 보존한다", () => {
    const batchCopy = activateBatchCopyPanel(activateFirstNote())
    const cleared = clearNoteSelection(batchCopy)

    expect(cleared.selectedNoteId).toBeNull()
    expect(cleared.activePanel).toBe("batch-copy")
    expect(cleared.propertiesTarget?.id).toBe("note-1")
  })

  it("최근 패널을 닫아도 선택과 속성 대상을 유지한다", () => {
    const closed = closeActivePanel(activateFirstNote())

    expect(closed.activePanel).toBeNull()
    expect(closed.selectedNoteId).toBe("note-1")
    expect(closed.propertiesTarget?.id).toBe("note-1")
  })

  it("삭제한 메모가 속성 대상이면 선택, 속성 대상과 패널을 비운다", () => {
    const forgotten = forgetNote(activateFirstNote(), "note-1")

    expect(forgotten.activePanel).toBeNull()
    expect(forgotten.propertiesTarget).toBeNull()
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
    )
    const completed = confirmNotePropertiesTarget(
      second,
      { id: "note-1", revision: 3 },
      { id: "note-1", revision: 4 },
    )

    expect(completed).toBe(second)
    expect(completed.propertiesTarget?.id).toBe("note-2")
  })

  it("속성 저장이 끝나면 대상 메모의 최신 판을 반영한다", () => {
    const completed = confirmNotePropertiesTarget(
      activateFirstNote(),
      { id: "note-1", revision: 3 },
      { id: "note-1", revision: 4 },
    )

    expect(completed.propertiesTarget).toEqual({
      id: "note-1",
      revision: 4,
    })
  })

  it("속성 저장 뒤 닫기 요청은 다른 최근 패널을 닫지 않는다", () => {
    const batchCopy = activateBatchCopyPanel(activateFirstNote())
    const closed = closeNoteProperties(batchCopy, "note-1")

    expect(closed).toBe(batchCopy)
    expect(closed.activePanel).toBe("batch-copy")
  })

  it("저장값으로 되돌리면 속성 대상을 갱신하고 패널을 닫는다", () => {
    const restored = restoreNotePropertiesTarget(
      activateFirstNote(),
      { id: "note-1", revision: 4 },
    )

    expect(restored.activePanel).toBeNull()
    expect(restored.propertiesTarget).toEqual({
      id: "note-1",
      revision: 4,
    })
  })
})
