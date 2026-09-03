import { describe, expect, it } from "vitest"

import type { Note } from "./note"
import {
  createNoteRemovalHistory,
  dismissNoteRemovalHistory,
  rememberRemovedNote,
  restoreMostRecentlyRemovedNote,
} from "./note-removal-history"

const firstNote: Note = {
  content: "첫 번째",
  contentRevision: 2,
  createdAt: "2026-09-01T01:00:00.000Z",
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: "note-1",
  revision: 4,
  tabIndex: 1000,
  updatedAt: "2026-09-01T02:00:00.000Z",
}

const secondNote: Note = {
  ...firstNote,
  content: "두 번째",
  geometry: { ...firstNote.geometry, x: 360, zIndex: 2 },
  id: "note-2",
  tabIndex: 1001,
}

describe("메모 삭제 복구 이력", () => {
  it("가장 최근에 삭제한 메모부터 원문과 배치를 그대로 돌려준다", () => {
    const firstRemoval = rememberRemovedNote(
      createNoteRemovalHistory(),
      firstNote,
      "2026-09-02T01:00:00.000Z",
    )
    const secondRemoval = rememberRemovedNote(
      firstRemoval,
      secondNote,
      "2026-09-02T02:00:00.000Z",
    )
    const firstRestore = restoreMostRecentlyRemovedNote(secondRemoval)

    expect(firstRestore?.note).toEqual(secondNote)
    expect(firstRestore?.history.entries).toHaveLength(1)

    const secondRestore = restoreMostRecentlyRemovedNote(
      firstRestore?.history ?? createNoteRemovalHistory(),
    )
    expect(secondRestore?.note).toEqual(firstNote)
    expect(secondRestore?.history.entries).toHaveLength(0)
  })

  it("삭제 이력이 없으면 복원 대상을 만들지 않는다", () => {
    expect(restoreMostRecentlyRemovedNote(createNoteRemovalHistory())).toBeNull()
  })

  it("제거 알림을 닫으면 이전 삭제도 다시 알리지 않는다", () => {
    const firstRemoval = rememberRemovedNote(
      createNoteRemovalHistory(),
      firstNote,
      "2026-09-02T01:00:00.000Z",
    )
    const secondRemoval = rememberRemovedNote(
      firstRemoval,
      secondNote,
      "2026-09-02T02:00:00.000Z",
    )

    expect(dismissNoteRemovalHistory(secondRemoval).entries).toEqual([])
  })
})
