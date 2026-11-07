import { describe, expect, it } from "vitest"

import type { Note } from "@/entities/note"
import { addNoteToMobileBatchCopy, duplicateMobileBatchCopySessionEntry, moveMobileBatchCopySessionEntry, removeMobileBatchCopySessionEntry, resetMobileBatchCopySession } from "./mobile-batch-copy-session"

function createNote(content: string): Note {
  const timestamp = Date.now()
  return { content, createdAt: timestamp, geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 }, id: crypto.randomUUID(), tabIndex: 1000, updatedAt: timestamp }
}

function createDependencies() {
  return { createId: () => crypto.randomUUID(), now: Date.now }
}

describe("모바일 일괄 복사 명령", () => {
  it("별도 시작 없이 같은 메모 두 번과 다른 메모 한 번을 순서대로 추가한다", () => {
    const dependencies = createDependencies()
    const note = createNote("  첫 원문\n다음 줄  ")
    const other = createNote("다른 메모")
    const first = addNoteToMobileBatchCopy(dependencies, null, note)
    const second = addNoteToMobileBatchCopy(dependencies, first, note)
    const third = addNoteToMobileBatchCopy(dependencies, second, other)
    expect(third.entries.map(({ textSnapshot }) => textSnapshot)).toEqual([note.content, note.content, other.content])
    expect(new Set(third.entries.map(({ id }) => id)).size).toBe(3)
    expect(first.entries).toHaveLength(1)
  })

  it("수정한 메모를 다시 추가하면 수정 전후의 원문을 모두 유지한다", () => {
    const dependencies = createDependencies()
    const note = createNote("수정 전")
    const changed = { ...note, content: "수정 후" }
    const first = addNoteToMobileBatchCopy(dependencies, null, note)
    const second = addNoteToMobileBatchCopy(dependencies, first, changed)
    expect(second.entries.map(({ textSnapshot }) => textSnapshot)).toEqual([note.content, changed.content])
  })

  it("작업 편집과 초기화는 메모 원문을 유지한다", () => {
    const dependencies = createDependencies()
    const firstNote = createNote("첫 메모")
    const secondNote = createNote("두 번째 메모")
    const first = addNoteToMobileBatchCopy(dependencies, null, firstNote)
    const draft = addNoteToMobileBatchCopy(dependencies, first, secondNote)
    const moved = moveMobileBatchCopySessionEntry(draft, draft.entries[1]!.id, 0, dependencies.now)
    const duplicated = duplicateMobileBatchCopySessionEntry(dependencies, moved, moved.entries[1]!.id)
    expect(duplicated.entries.map(({ textSnapshot }) => textSnapshot)).toEqual([secondNote.content, firstNote.content, firstNote.content])
    const removed = removeMobileBatchCopySessionEntry(duplicated, duplicated.entries[2]!.id, dependencies.now)
    expect(removed.entries.map(({ textSnapshot }) => textSnapshot)).toEqual([secondNote.content, firstNote.content])
    const reset = resetMobileBatchCopySession(removed, dependencies.now)
    expect(reset.entries).toEqual([])
    expect(reset.id).toBe(draft.id)
    expect(firstNote.content).toBe("첫 메모")
  })
})
