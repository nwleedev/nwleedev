import { describe, expect, it } from "vitest"

import {
  nextNoteTabIndex,
  normalizeNoteTabIndexes,
  normalizeNoteZIndexes,
  sendNoteToBack,
  sendNoteToFront,
} from "./note-order"
import type { Note } from "./note"

const firstNote: Note = {
  content: "첫 번째",
  contentRevision: 1,
  createdAt: "2026-09-01T01:00:00.000Z",
  geometry: { height: 240, width: 320, x: 20, y: 20, zIndex: 1 },
  id: "note-1",
  revision: 1,
  tabIndex: 1002,
  updatedAt: "2026-09-01T01:00:00.000Z",
}

const secondNote: Note = {
  ...firstNote,
  content: "두 번째",
  createdAt: "2026-09-01T02:00:00.000Z",
  geometry: { ...firstNote.geometry, x: 360, zIndex: 2 },
  id: "note-2",
  tabIndex: 1000,
}

const thirdNote: Note = {
  ...firstNote,
  content: "세 번째",
  createdAt: "2026-09-01T03:00:00.000Z",
  geometry: { ...firstNote.geometry, x: 700, zIndex: 3 },
  id: "note-3",
  tabIndex: 1001,
}

describe("메모 키보드 탐색 순서", () => {
  it("유효한 기존 값과 생성 순서를 이용해 빠짐없는 양의 순서를 만든다", () => {
    const normalized = normalizeNoteTabIndexes([
      { createdAt: "2026-09-01T03:00:00.000Z", id: "missing" },
      { createdAt: "2026-09-01T02:00:00.000Z", id: "duplicate-b", tabIndex: 1005 },
      { createdAt: "2026-09-01T01:00:00.000Z", id: "duplicate-a", tabIndex: 1005 },
      { createdAt: "2026-09-01T00:00:00.000Z", id: "invalid", tabIndex: 0 },
    ])

    expect(normalized.map(({ id, tabIndex }) => ({ id, tabIndex }))).toEqual([
      { id: "duplicate-a", tabIndex: 1000 },
      { id: "duplicate-b", tabIndex: 1001 },
      { id: "invalid", tabIndex: 1002 },
      { id: "missing", tabIndex: 1003 },
    ])
  })

  it("새 메모에는 현재 최댓값 다음 순서를 부여한다", () => {
    expect(nextNoteTabIndex([firstNote, secondNote, thirdNote])).toBe(1003)
  })

  it("허용 구간을 모두 사용하면 새 순서를 만들지 않는다", () => {
    expect(() => nextNoteTabIndex([{ tabIndex: 32767 }])).toThrow(RangeError)
  })
})

describe("메모 겹침 순서", () => {
  it("중복된 겹침 값을 안정된 전체 순서로 정리한다", () => {
    const normalized = normalizeNoteZIndexes([
      { ...thirdNote, geometry: { ...thirdNote.geometry, zIndex: 4 } },
      { ...secondNote, geometry: { ...secondNote.geometry, zIndex: 4 } },
      { ...firstNote, geometry: { ...firstNote.geometry, zIndex: 0 } },
    ])

    expect(normalized.map(({ id, geometry }) => [id, geometry.zIndex])).toEqual([
      ["note-2", 1],
      ["note-3", 2],
      ["note-1", 3],
    ])
  })

  it("맨 앞으로 보내도 나머지 상대 순서와 키보드 순서를 유지한다", () => {
    const reordered = sendNoteToFront(
      [firstNote, secondNote, thirdNote],
      secondNote.id,
      "2026-09-02T01:00:00.000Z",
    )

    expect(reordered.map(({ id, geometry }) => [id, geometry.zIndex])).toEqual([
      ["note-1", 1],
      ["note-3", 2],
      ["note-2", 3],
    ])
    expect(reordered.map(({ tabIndex }) => tabIndex)).toEqual([
      firstNote.tabIndex,
      thirdNote.tabIndex,
      secondNote.tabIndex,
    ])
  })

  it("맨 뒤로 보내도 나머지 상대 순서와 원문 revision을 유지한다", () => {
    const reordered = sendNoteToBack(
      [firstNote, secondNote, thirdNote],
      thirdNote.id,
      "2026-09-02T01:00:00.000Z",
    )

    expect(reordered.map(({ id, geometry }) => [id, geometry.zIndex])).toEqual([
      ["note-3", 1],
      ["note-1", 2],
      ["note-2", 3],
    ])
    expect(reordered.map(({ contentRevision }) => contentRevision)).toEqual([
      thirdNote.contentRevision,
      firstNote.contentRevision,
      secondNote.contentRevision,
    ])
  })
})
