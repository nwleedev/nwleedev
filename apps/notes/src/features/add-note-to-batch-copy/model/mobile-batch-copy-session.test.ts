import { describe, expect, it } from "vitest"

import type {
  CollectingMobileBatchCopyDraft,
  ConfirmingMobileBatchCopyDraft,
  MobileBatchCopyDraft,
  MobileBatchCopyDraftRepository,
} from "@/entities/batch-copy"
import type { Note } from "@/entities/note"

import type { MobileBatchCopyEntryWriter } from "./mobile-batch-copy-entry-writer"
import {
  addNoteToMobileBatchCopy,
  cancelMobileBatchCopy,
  confirmMobileBatchCopySession,
  duplicateMobileBatchCopySessionEntry,
  loadMobileBatchCopy,
  moveMobileBatchCopySessionEntry,
  removeMobileBatchCopySessionEntry,
  resetMobileBatchCopySession,
  resumeMobileBatchCopySession,
  startMobileBatchCopy,
  type MobileBatchCopySaveResult,
} from "./mobile-batch-copy-session"

const firstNote: Note = {
  content: "첫 번째 원문",
  contentRevision: 2,
  createdAt: "2026-09-02T01:00:00.000Z",
  geometry: { height: 240, width: 320, x: 20, y: 30, zIndex: 1 },
  id: "note-mobile",
  revision: 4,
  tabIndex: 1000,
  updatedAt: "2026-09-02T02:00:00.000Z",
}

function createDependencies(options?: {
  failSave?: boolean
  failWrite?: boolean
}) {
  let draft: MobileBatchCopyDraft | null = null
  let usageCount = 0
  let identifier = 0
  let minute = 0

  const repository: MobileBatchCopyDraftRepository = {
    async get() {
      return draft
    },
    async remove() {
      draft = null
    },
    async save(nextDraft) {
      if (options?.failSave === true) {
        throw new Error("draft save failed")
      }

      draft = nextDraft
      return nextDraft
    },
  }
  const writer: MobileBatchCopyEntryWriter = {
    async saveAndRecordUsage(nextDraft) {
      if (options?.failWrite === true) {
        throw new Error("transaction aborted")
      }

      draft = nextDraft
      usageCount += 1
      return nextDraft
    },
  }

  return {
    createId() {
      identifier += 1
      return `mobile-item-${identifier}`
    },
    getDraft: () => draft,
    getUsageCount: () => usageCount,
    now() {
      minute += 1
      return `2026-09-02T03:${String(minute).padStart(2, "0")}:00.000Z`
    },
    repository,
    writer,
  }
}

function savedCollectingDraft(
  result: MobileBatchCopySaveResult<CollectingMobileBatchCopyDraft>,
) {
  if (result.status !== "saved") {
    throw new Error("Expected a collecting draft")
  }

  return result.draft
}

function savedConfirmingDraft(
  result: MobileBatchCopySaveResult<ConfirmingMobileBatchCopyDraft>,
) {
  if (result.status !== "saved") {
    throw new Error("Expected a confirming draft")
  }

  return result.draft
}

describe("모바일 일괄 복사 작업", () => {
  it("빈 수집 작업을 시작해 새로고침 뒤 읽을 수 있게 저장한다", async () => {
    const dependencies = createDependencies()

    const result = await startMobileBatchCopy(dependencies)
    const started = savedCollectingDraft(result)
    const loaded = await loadMobileBatchCopy(dependencies.repository)

    expect(result).toMatchObject({
      draft: { clickCount: 0, entries: [], step: "collecting" },
      status: "saved",
    })
    expect(loaded).toEqual({
      draft: started,
      status: "loaded",
    })
  })

  it("같은 메모를 누른 횟수대로 원문 스냅샷과 사용 횟수를 함께 저장한다", async () => {
    const dependencies = createDependencies()
    const started = savedCollectingDraft(
      await startMobileBatchCopy(dependencies),
    )

    const first = await addNoteToMobileBatchCopy(
      dependencies,
      started,
      firstNote,
    )

    const firstDraft = savedCollectingDraft(first)

    const changedNote = {
      ...firstNote,
      content: "두 번째 원문",
      contentRevision: 3,
    }
    const second = await addNoteToMobileBatchCopy(
      dependencies,
      firstDraft,
      changedNote,
    )

    expect(second).toMatchObject({
      draft: {
        clickCount: 2,
        entries: [
          {
            sourceNote: { contentRevision: 2, id: firstNote.id },
            textSnapshot: "첫 번째 원문",
          },
          {
            sourceNote: { contentRevision: 3, id: firstNote.id },
            textSnapshot: "두 번째 원문",
          },
        ],
      },
      status: "saved",
    })
    expect(dependencies.getUsageCount()).toBe(2)
  })

  it("항목과 사용 횟수 저장이 실패하면 이전 작업을 그대로 유지한다", async () => {
    const dependencies = createDependencies({ failWrite: true })
    const started = savedCollectingDraft(
      await startMobileBatchCopy(dependencies),
    )

    const result = await addNoteToMobileBatchCopy(
      dependencies,
      started,
      firstNote,
    )

    expect(result).toEqual({ status: "failure" })
    expect(dependencies.getDraft()).toEqual(started)
    expect(dependencies.getUsageCount()).toBe(0)
  })

  it("초기화하면 빈 수집 작업을 저장한다", async () => {
    const dependencies = createDependencies()
    const started = savedCollectingDraft(
      await startMobileBatchCopy(dependencies),
    )

    const added = await addNoteToMobileBatchCopy(
      dependencies,
      started,
      firstNote,
    )

    const addedDraft = savedCollectingDraft(added)

    const reset = await resetMobileBatchCopySession(
      dependencies,
      addedDraft,
    )

    expect(reset).toMatchObject({
      draft: { clickCount: 0, entries: [], step: "collecting" },
      status: "saved",
    })
  })

  it("확인 단계로 전환한 작업을 저장한다", async () => {
    const dependencies = createDependencies()
    const started = savedCollectingDraft(
      await startMobileBatchCopy(dependencies),
    )

    const confirmed = await confirmMobileBatchCopySession(
      dependencies,
      started,
    )

    expect(confirmed).toMatchObject({
      draft: { step: "confirming" },
      status: "saved",
    })
  })

  it("명시적으로 취소하면 저장한 작업을 제거한다", async () => {
    const dependencies = createDependencies()
    await startMobileBatchCopy(dependencies)

    expect(await cancelMobileBatchCopy(dependencies.repository)).toEqual({
      status: "removed",
    })
    expect(dependencies.getDraft()).toBeNull()
  })

  it("확인 작업 항목의 순서를 바꿔 저장한다", async () => {
    const dependencies = createDependencies()
    const collecting = savedCollectingDraft(
      await startMobileBatchCopy(dependencies),
    )
    const first = savedCollectingDraft(
      await addNoteToMobileBatchCopy(dependencies, collecting, firstNote),
    )
    const second = savedCollectingDraft(
      await addNoteToMobileBatchCopy(
        dependencies,
        first,
        { ...firstNote, content: "두 번째 원문" },
      ),
    )
    const confirmation = savedConfirmingDraft(
      await confirmMobileBatchCopySession(dependencies, second),
    )

    const result = await moveMobileBatchCopySessionEntry(
      dependencies,
      confirmation,
      confirmation.entries[1]?.id ?? "",
      0,
    )

    expect(result).toMatchObject({
      draft: {
        clickCount: 2,
        entries: [
          { textSnapshot: "두 번째 원문" },
          { textSnapshot: "첫 번째 원문" },
        ],
      },
      status: "saved",
    })
  })

  it("확인 작업 항목을 대상 바로 뒤에 새 ID로 복제해 저장한다", async () => {
    const dependencies = createDependencies()
    const collecting = savedCollectingDraft(
      await startMobileBatchCopy(dependencies),
    )
    const added = savedCollectingDraft(
      await addNoteToMobileBatchCopy(dependencies, collecting, firstNote),
    )
    const confirmation = savedConfirmingDraft(
      await confirmMobileBatchCopySession(dependencies, added),
    )

    const source = confirmation.entries[0]
    const result = await duplicateMobileBatchCopySessionEntry(
      dependencies,
      confirmation,
      source?.id ?? "",
    )

    expect(result).toMatchObject({
      draft: {
        clickCount: 1,
        entries: [source, { ...source, id: "mobile-item-3" }],
      },
      status: "saved",
    })
  })

  it("확인 작업에서 지정한 ID의 항목만 삭제해 저장한다", async () => {
    const dependencies = createDependencies()
    const collecting = savedCollectingDraft(
      await startMobileBatchCopy(dependencies),
    )
    const first = savedCollectingDraft(
      await addNoteToMobileBatchCopy(dependencies, collecting, firstNote),
    )
    const second = savedCollectingDraft(
      await addNoteToMobileBatchCopy(dependencies, first, firstNote),
    )
    const confirmation = savedConfirmingDraft(
      await confirmMobileBatchCopySession(dependencies, second),
    )

    const removedId = confirmation.entries[0]?.id ?? ""
    const result = await removeMobileBatchCopySessionEntry(
      dependencies,
      confirmation,
      removedId,
    )

    expect(result).toMatchObject({
      draft: { clickCount: 2, entries: [{ id: "mobile-item-3" }] },
      status: "saved",
    })
  })

  it("저장 실패 시 확인 작업의 이전 순서를 유지한다", async () => {
    const dependencies = createDependencies()
    const collecting = savedCollectingDraft(
      await startMobileBatchCopy(dependencies),
    )
    const first = savedCollectingDraft(
      await addNoteToMobileBatchCopy(dependencies, collecting, firstNote),
    )
    const second = savedCollectingDraft(
      await addNoteToMobileBatchCopy(dependencies, first, firstNote),
    )
    const confirmation = savedConfirmingDraft(
      await confirmMobileBatchCopySession(dependencies, second),
    )

    const failingDependencies = {
      ...dependencies,
      repository: createDependencies({ failSave: true }).repository,
    }
    const result = await moveMobileBatchCopySessionEntry(
      failingDependencies,
      confirmation,
      confirmation.entries[1]?.id ?? "",
      0,
    )

    expect(result).toEqual({ status: "failure" })
    expect(dependencies.getDraft()).toEqual(confirmation)
  })

  it("확인 작업 편집을 유지한 채 수집 화면 단계로 저장한다", async () => {
    const dependencies = createDependencies()
    const collecting = savedCollectingDraft(
      await startMobileBatchCopy(dependencies),
    )
    const added = savedCollectingDraft(
      await addNoteToMobileBatchCopy(dependencies, collecting, firstNote),
    )
    const confirmation = savedConfirmingDraft(
      await confirmMobileBatchCopySession(dependencies, added),
    )

    const result = await resumeMobileBatchCopySession(
      dependencies,
      confirmation,
    )

    expect(result).toMatchObject({
      draft: {
        clickCount: 1,
        entries: [{ textSnapshot: firstNote.content }],
        step: "collecting",
      },
      status: "saved",
    })
  })
})
