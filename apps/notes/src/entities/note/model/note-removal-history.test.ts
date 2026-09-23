import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import type { Note } from "./note"
import {
  createNoteRemovalHistory,
  dismissNoteRemovalHistory,
  expireNoteRemoval,
  forgetRemovedNote,
  NOTE_REMOVAL_UNDO_DURATION_MS,
  noteRemovalUndoRemainingMs,
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
  it("서로 다른 메모를 연속 삭제하면 최근 원문과 배치부터 복원한다", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 10 }),
        (ids) => {
          const removed = ids.map((id, index): Note => ({
            ...firstNote,
            content: id,
            geometry: {
              ...firstNote.geometry,
              x: firstNote.geometry.x + index * firstNote.geometry.width,
              zIndex: index + 1,
            },
            id,
            tabIndex: firstNote.tabIndex + index,
          }))
          const history = removed.reduce(
            (current, note, index) => rememberRemovedNote(
              current,
              note,
              new Date(Date.parse(firstNote.updatedAt) + index).toISOString(),
            ),
            createNoteRemovalHistory(),
          )
          let remaining = history

          for (const expected of [...removed].reverse()) {
            const restored = restoreMostRecentlyRemovedNote(remaining)
            expect(restored?.note).toEqual(expected)
            if (restored === null) {
              throw new Error("Expected a removed note")
            }
            remaining = restored.history
          }
          expect(remaining.entries).toHaveLength(0)
        },
      ),
    )
  })

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

  it("삭제 완료 시각에서 5초가 지나면 취소 가능 시간을 늘리지 않는다", () => {
    const history = rememberRemovedNote(
      createNoteRemovalHistory(),
      firstNote,
      "2026-09-02T01:00:00.000Z",
    )
    const snapshot = history.entries[0]

    const removedAt = Date.parse(snapshot.removedAt)
    expect(noteRemovalUndoRemainingMs(snapshot, removedAt + NOTE_REMOVAL_UNDO_DURATION_MS - 1)).toBe(1)
    expect(noteRemovalUndoRemainingMs(snapshot, removedAt + NOTE_REMOVAL_UNDO_DURATION_MS)).toBe(0)
  })

  it("삭제 완료 시각과 경과 시간으로 취소 가능 여부를 계산한다", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Date.UTC(2100, 0, 1) }),
        fc.integer({ min: 0, max: NOTE_REMOVAL_UNDO_DURATION_MS - 1 }),
        (removedAt, elapsed) => {
          const history = rememberRemovedNote(
            createNoteRemovalHistory(),
            firstNote,
            new Date(removedAt).toISOString(),
          )
          const snapshot = history.entries[0]
          expect(noteRemovalUndoRemainingMs(snapshot, removedAt + elapsed)).toBe(
            NOTE_REMOVAL_UNDO_DURATION_MS - elapsed,
          )
          expect(expireNoteRemoval(history, snapshot, removedAt + elapsed)).toEqual(history)
          expect(
            expireNoteRemoval(history, snapshot, removedAt + NOTE_REMOVAL_UNDO_DURATION_MS),
          ).toEqual(createNoteRemovalHistory())
        },
      ),
    )
  })

  it("복원을 시작한 삭제만 제거하고 그 뒤에 생긴 삭제는 유지한다", () => {
    const firstRemoval = rememberRemovedNote(
      createNoteRemovalHistory(),
      firstNote,
      "2026-09-02T01:00:00.000Z",
    )
    const firstSnapshot = firstRemoval.entries[0]
    const secondRemoval = rememberRemovedNote(
      firstRemoval,
      secondNote,
      "2026-09-02T02:00:00.000Z",
    )

    const remaining = forgetRemovedNote(secondRemoval, firstSnapshot)

    expect(remaining.entries).toEqual([secondRemoval.entries[1]])
  })

  it("기한이 지난 최근 삭제를 지워도 이전 삭제를 다시 알리지 않는다", () => {
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
    const latestSnapshot = secondRemoval.entries[1]

    const expired = expireNoteRemoval(
      secondRemoval,
      latestSnapshot,
      Date.parse(latestSnapshot.removedAt) + NOTE_REMOVAL_UNDO_DURATION_MS,
    )

    expect(expired.entries).toEqual([])
  })
})
