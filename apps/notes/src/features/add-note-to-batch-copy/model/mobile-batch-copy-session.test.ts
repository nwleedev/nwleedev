import { describe, expect, it } from "vitest"

import type { Note } from "@/entities/note"

import type { MobileBatchCopyUsageWriter } from "./mobile-batch-copy-usage-writer"
import {
  addNoteToMobileBatchCopy,
  confirmMobileBatchCopySession,
  duplicateMobileBatchCopySessionEntry,
  moveMobileBatchCopySessionEntry,
  removeMobileBatchCopySessionEntry,
  resetMobileBatchCopySession,
  resumeMobileBatchCopySession,
  startMobileBatchCopy,
} from "./mobile-batch-copy-session"

function createNote(content: string, contentRevision = 1): Note {
  const timestamp = new Date().toISOString()

  return {
    content,
    contentRevision,
    createdAt: timestamp,
    geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
    id: crypto.randomUUID(),
    revision: 1,
    tabIndex: 1000,
    updatedAt: timestamp,
  }
}

function createDependencies(failUsage = false) {
  const usageRecords: Note[] = []

  const writer: MobileBatchCopyUsageWriter = {
    async record(note) {
      if (failUsage) {
        throw new Error("usage record failed")
      }

      usageRecords.push(note)
    },
  }

  return {
    createId: () => crypto.randomUUID(),
    getUsageRecords: () => usageRecords,
    now: () => new Date().toISOString(),
    writer,
  }
}

function addedDraft(
  result: Awaited<ReturnType<typeof addNoteToMobileBatchCopy>>,
) {
  if (result.status !== "added") {
    throw new Error("The note was not added to the current session")
  }

  return result.draft
}

describe("모바일 일괄 복사 실행 작업", () => {
  it("새 실행은 비어 있는 수집 작업으로 시작한다", () => {
    const draft = startMobileBatchCopy(createDependencies())

    expect(draft).toMatchObject({
      clickCount: 0,
      entries: [],
      step: "collecting",
    })
  })

  it("반복 선택은 당시 원문과 클릭 수를 유지하고 사용 횟수를 기록한다", async () => {
    const dependencies = createDependencies()
    const firstNote = createNote(crypto.randomUUID())
    const started = startMobileBatchCopy(dependencies)
    const first = addedDraft(
      await addNoteToMobileBatchCopy(dependencies, started, firstNote),
    )
    const changedNote = {
      ...firstNote,
      content: crypto.randomUUID(),
      contentRevision: firstNote.contentRevision + 1,
    }
    const second = addedDraft(
      await addNoteToMobileBatchCopy(dependencies, first, changedNote),
    )

    expect(second.entries.map(({ textSnapshot }) => textSnapshot)).toEqual([
      firstNote.content,
      changedNote.content,
    ])
    expect(second.entries.map(({ sourceNote }) => sourceNote.contentRevision))
      .toEqual([firstNote.contentRevision, changedNote.contentRevision])
    expect(second.clickCount).toBe(2)
    expect(dependencies.getUsageRecords()).toEqual([firstNote, changedNote])
  })

  it("사용 횟수 기록에 실패하면 새 항목을 실행 작업에 반영하지 않는다", async () => {
    const dependencies = createDependencies(true)
    const started = startMobileBatchCopy(dependencies)
    const note = createNote(crypto.randomUUID())
    const result = await addNoteToMobileBatchCopy(
      dependencies,
      started,
      note,
    )

    expect(result.status).toBe("failure")
    expect(started).toMatchObject({ clickCount: 0, entries: [] })
    expect(dependencies.getUsageRecords()).toEqual([])
  })

  it("초기화와 확인 전환은 현재 실행 상태만 바꾼다", async () => {
    const dependencies = createDependencies()
    const added = addedDraft(
      await addNoteToMobileBatchCopy(
        dependencies,
        startMobileBatchCopy(dependencies),
        createNote(crypto.randomUUID()),
      ),
    )
    const reset = resetMobileBatchCopySession(added, dependencies.now)
    const confirmed = confirmMobileBatchCopySession(
      reset,
      dependencies.now,
    )

    expect(reset).toMatchObject({ clickCount: 0, entries: [], step: "collecting" })
    expect(confirmed).toMatchObject({
      clickCount: 0,
      entries: [],
      step: "confirming",
    })
  })

  it("확인 작업에서 항목 순서, 복제와 삭제를 반영한다", async () => {
    const dependencies = createDependencies()
    const started = startMobileBatchCopy(dependencies)
    const firstNote = createNote(crypto.randomUUID())
    const secondNote = createNote(crypto.randomUUID())
    const first = addedDraft(
      await addNoteToMobileBatchCopy(dependencies, started, firstNote),
    )
    const second = addedDraft(
      await addNoteToMobileBatchCopy(
        dependencies,
        first,
        secondNote,
      ),
    )
    const confirmation = confirmMobileBatchCopySession(
      second,
      dependencies.now,
    )
    expect(confirmation.entries).toHaveLength(2)
    const secondEntry = confirmation.entries[1]!

    const moved = moveMobileBatchCopySessionEntry(
      confirmation,
      secondEntry.id,
      0,
      dependencies.now,
    )
    const firstEntry = moved.entries[1]!

    const duplicated = duplicateMobileBatchCopySessionEntry(
      dependencies,
      moved,
      firstEntry.id,
    )
    const duplicateEntry = duplicated.entries[2]!

    const removed = removeMobileBatchCopySessionEntry(
      duplicated,
      duplicateEntry.id,
      dependencies.now,
    )

    expect(removed.entries.map(({ textSnapshot }) => textSnapshot)).toEqual([
      secondNote.content,
      firstNote.content,
    ])
    expect(removed.clickCount).toBe(2)
  })

  it("확인 작업에서 수집 화면으로 돌아오면 선택한 원문을 유지한다", async () => {
    const dependencies = createDependencies()
    const started = startMobileBatchCopy(dependencies)
    const note = createNote(crypto.randomUUID())
    const collection = addedDraft(
      await addNoteToMobileBatchCopy(
        dependencies,
        started,
        note,
      ),
    )
    const confirmation = confirmMobileBatchCopySession(
      collection,
      dependencies.now,
    )
    const resumed = resumeMobileBatchCopySession(
      confirmation,
      dependencies.now,
    )

    expect(resumed).toMatchObject({
      clickCount: 1,
      entries: [{ textSnapshot: note.content }],
      step: "collecting",
    })
  })
})
