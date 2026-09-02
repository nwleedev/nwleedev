import { describe, expect, it } from "vitest"

import {
  activateBatchCopyPanel,
  activateNoteProperties,
  clearNoteSelection,
  closeActivePanel,
  createNoteWorkspaceState,
  selectNote,
  updateNoteGeometryDraft,
} from "./note-workspace-state"

describe("메모 작업 상태", () => {
  it("메모를 선택해도 기존 속성 대상과 최근 패널을 유지한다", () => {
    const initial = activateNoteProperties(
      createNoteWorkspaceState(),
      { id: "note-1", revision: 3 },
      { height: "240", width: "320", x: "40", y: "60" },
    )

    expect(selectNote(initial, "note-2")).toEqual({
      activePanel: "note-properties",
      geometryDraft: {
        fields: { height: "240", width: "320", x: "40", y: "60" },
        note: { id: "note-1", revision: 3 },
      },
      propertiesNoteId: "note-1",
      selectedNoteId: "note-2",
    })
  })

  it("속성 패널을 활성화하면 선택한 메모를 대상과 최근 패널에 반영한다", () => {
    const selected = selectNote(createNoteWorkspaceState(), "note-2")
    const activated = activateNoteProperties(
      selected,
      { id: "note-2", revision: 4 },
      { height: "280", width: "360", x: "80", y: "100" },
    )

    expect(activated).toEqual({
      activePanel: "note-properties",
      geometryDraft: {
        fields: { height: "280", width: "360", x: "80", y: "100" },
        note: { id: "note-2", revision: 4 },
      },
      propertiesNoteId: "note-2",
      selectedNoteId: "note-2",
    })
  })

  it("일괄 복사 패널로 전환해도 메모 선택과 속성 초안을 보존한다", () => {
    const properties = activateNoteProperties(
      createNoteWorkspaceState(),
      { id: "note-3", revision: 5 },
      { height: "260", width: "340", x: "120", y: "140" },
    )

    expect(activateBatchCopyPanel(properties)).toEqual({
      activePanel: "batch-copy",
      geometryDraft: {
        fields: { height: "260", width: "340", x: "120", y: "140" },
        note: { id: "note-3", revision: 5 },
      },
      propertiesNoteId: "note-3",
      selectedNoteId: "note-3",
    })
  })

  it("선택을 해제해도 속성 대상과 초안 및 최근 패널을 보존한다", () => {
    const properties = activateNoteProperties(
      createNoteWorkspaceState(),
      { id: "note-4", revision: 6 },
      { height: "220", width: "300", x: "20", y: "30" },
    )
    const batchCopy = activateBatchCopyPanel(properties)

    expect(clearNoteSelection(batchCopy)).toEqual({
      activePanel: "batch-copy",
      geometryDraft: {
        fields: { height: "220", width: "300", x: "20", y: "30" },
        note: { id: "note-4", revision: 6 },
      },
      propertiesNoteId: "note-4",
      selectedNoteId: null,
    })
  })

  it("속성 초안을 고쳐도 다른 작업 상태를 바꾸지 않는다", () => {
    const properties = activateNoteProperties(
      createNoteWorkspaceState(),
      { id: "note-5", revision: 7 },
      { height: "240", width: "320", x: "40", y: "60" },
    )

    expect(updateNoteGeometryDraft(properties, "width", "480")).toEqual({
      activePanel: "note-properties",
      geometryDraft: {
        fields: { height: "240", width: "480", x: "40", y: "60" },
        note: { id: "note-5", revision: 7 },
      },
      propertiesNoteId: "note-5",
      selectedNoteId: "note-5",
    })
  })

  it("최근 패널을 닫아도 선택, 속성 대상과 초안을 유지한다", () => {
    const properties = activateNoteProperties(
      createNoteWorkspaceState(),
      { id: "note-6", revision: 8 },
      { height: "240", width: "320", x: "40", y: "60" },
    )

    expect(closeActivePanel(properties)).toEqual({
      activePanel: null,
      geometryDraft: {
        fields: { height: "240", width: "320", x: "40", y: "60" },
        note: { id: "note-6", revision: 8 },
      },
      propertiesNoteId: "note-6",
      selectedNoteId: "note-6",
    })
  })
})
