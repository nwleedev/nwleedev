import { describe, expect, it } from "vitest"

import type { Note } from "@/entities/note"
import { addNoteToMobileBatchCopy, duplicateMobileBatchCopySessionEntry, moveMobileBatchCopySessionEntry, removeMobileBatchCopySessionEntry, resetMobileBatchCopySession } from "./mobile-batch-copy-session"

function createNote(content: string): Note {
  const timestamp = new Date().toISOString()
  return { content, contentRevision: 1, createdAt: timestamp, geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 }, id: crypto.randomUUID(), revision: 1, tabIndex: 1000, updatedAt: timestamp }
}

function createDependencies(failFirstUsage = false) {
  const records: Note[] = []
  let failurePending = failFirstUsage
  return {
    createId: () => crypto.randomUUID(),
    now: () => new Date().toISOString(),
    records,
    writer: { async record(note: Note) {
      if (failurePending) {
        failurePending = false
        throw new Error("Controlled usage write failure")
      }
      records.push(note)
    } },
  }
}

function added(result: Awaited<ReturnType<typeof addNoteToMobileBatchCopy>>) {
  if (result.status !== "added") throw new Error("The note was not added")
  return result.draft
}

describe("모바일 일괄 복사 명령", () => {
  it("별도 시작 없이 같은 메모 두 번과 다른 메모 한 번을 순서대로 추가한다", async () => {
    const dependencies = createDependencies()
    const note = createNote("  첫 원문\n다음 줄  ")
    const other = createNote("다른 메모")
    const first = added(await addNoteToMobileBatchCopy(dependencies, null, note))
    const second = added(await addNoteToMobileBatchCopy(dependencies, first, note))
    const third = added(await addNoteToMobileBatchCopy(dependencies, second, other))
    expect(third.entries.map(({ textSnapshot }) => textSnapshot)).toEqual([note.content, note.content, other.content])
    expect(new Set(third.entries.map(({ id }) => id)).size).toBe(3)
    expect(dependencies.records).toEqual([note, note, other])
    expect(first.entries).toHaveLength(1)
  })

  it("첫 기록 실패는 항목을 만들지 않고 같은 의존성으로 재시도할 수 있다", async () => {
    const dependencies = createDependencies(true)
    const note = createNote("재시도할 원문")
    expect(await addNoteToMobileBatchCopy(dependencies, null, note)).toEqual({ status: "failure" })
    expect(dependencies.records).toEqual([])
    const retried = added(await addNoteToMobileBatchCopy(dependencies, null, note))
    expect(retried.entries.map(({ textSnapshot }) => textSnapshot)).toEqual([note.content])
    expect(dependencies.records).toEqual([note])
  })

  it("원문 수정 후 추가는 새 버전을 기록하고 이전 스냅샷을 유지한다", async () => {
    const dependencies = createDependencies()
    const note = createNote("수정 전")
    const changed = { ...note, content: "수정 후", contentRevision: note.contentRevision + 1 }
    const first = added(await addNoteToMobileBatchCopy(dependencies, null, note))
    const second = added(await addNoteToMobileBatchCopy(dependencies, first, changed))
    expect(second.entries.map(({ textSnapshot }) => textSnapshot)).toEqual([note.content, changed.content])
    expect(second.entries.map(({ sourceNote }) => sourceNote.contentRevision)).toEqual([note.contentRevision, changed.contentRevision])
    expect(dependencies.records).toEqual([note, changed])
  })

  it("작업 편집과 초기화는 원문 및 사용 기록을 추가로 바꾸지 않는다", async () => {
    const dependencies = createDependencies()
    const firstNote = createNote("첫 메모")
    const secondNote = createNote("두 번째 메모")
    const first = added(await addNoteToMobileBatchCopy(dependencies, null, firstNote))
    const draft = added(await addNoteToMobileBatchCopy(dependencies, first, secondNote))
    const moved = moveMobileBatchCopySessionEntry(draft, draft.entries[1]!.id, 0, dependencies.now)
    const duplicated = duplicateMobileBatchCopySessionEntry(dependencies, moved, moved.entries[1]!.id)
    expect(duplicated.entries.map(({ textSnapshot }) => textSnapshot)).toEqual([secondNote.content, firstNote.content, firstNote.content])
    const removed = removeMobileBatchCopySessionEntry(duplicated, duplicated.entries[2]!.id, dependencies.now)
    expect(removed.entries.map(({ textSnapshot }) => textSnapshot)).toEqual([secondNote.content, firstNote.content])
    const reset = resetMobileBatchCopySession(removed, dependencies.now)
    expect(reset.entries).toEqual([])
    expect(reset.id).toBe(draft.id)
    expect(dependencies.records).toEqual([firstNote, secondNote])
    expect(firstNote.content).toBe("첫 메모")
  })
})
