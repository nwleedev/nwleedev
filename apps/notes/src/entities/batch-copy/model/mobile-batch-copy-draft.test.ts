import { describe, expect, it } from "vitest"

import {
  MobileBatchCopyDraftSchema,
  addMobileBatchCopyEntry,
  beginMobileBatchCopy,
  confirmMobileBatchCopy,
  duplicateMobileBatchCopyEntry,
  moveMobileBatchCopyEntry,
  resumeMobileBatchCopyCollection,
  removeMobileBatchCopyEntry,
  resetMobileBatchCopy,
} from "./mobile-batch-copy-draft"

const firstEntry = {
  id: "batch-entry-1",
  sourceNote: { contentRevision: 2, id: "note-1" },
  textSnapshot: "첫 번째 문장",
}

const secondEntry = {
  id: "batch-entry-2",
  sourceNote: { contentRevision: 4, id: "note-1" },
  textSnapshot: "두 번째 문장",
}

const thirdEntry = {
  id: "batch-entry-3",
  sourceNote: { contentRevision: 1, id: "note-2" },
  textSnapshot: "세 번째 문장",
}

function beginDraft() {
  return beginMobileBatchCopy({
    id: "mobile-batch-copy",
    startedAt: "2026-09-02T03:00:00.000Z",
  })
}

describe("모바일 일괄 복사 작업 초안", () => {
  it("같은 메모를 반복해서 눌러도 클릭 당시 원문과 순서를 모두 보존한다", () => {
    const first = addMobileBatchCopyEntry(
      beginDraft(),
      firstEntry,
      "2026-09-02T03:01:00.000Z",
    )
    const second = addMobileBatchCopyEntry(
      first,
      secondEntry,
      "2026-09-02T03:02:00.000Z",
    )

    expect(second.entries).toEqual([firstEntry, secondEntry])
    expect(second.clickCount).toBe(2)
  })

  it("확인 화면 편집 뒤 수집 화면으로 돌아가도 원래 클릭 횟수를 유지한다", () => {
    const draft = addMobileBatchCopyEntry(
      beginDraft(),
      firstEntry,
      "2026-09-02T03:01:00.000Z",
    )
    const confirming = confirmMobileBatchCopy(
      draft,
      "2026-09-02T03:02:00.000Z",
    )
    const duplicated = duplicateMobileBatchCopyEntry(
      confirming,
      firstEntry.id,
      "batch-entry-copy",
      "2026-09-02T03:03:00.000Z",
    )
    const collecting = resumeMobileBatchCopyCollection(
      duplicated,
      "2026-09-02T03:04:00.000Z",
    )

    expect(MobileBatchCopyDraftSchema.safeParse(collecting).success).toBe(true)
    expect(collecting).toMatchObject({
      clickCount: 1,
      entries: [firstEntry, { ...firstEntry, id: "batch-entry-copy" }],
      step: "collecting",
    })
  })

  it("초기화는 단계를 유지하면서 항목과 클릭 횟수를 함께 비운다", () => {
    const draft = addMobileBatchCopyEntry(
      beginDraft(),
      firstEntry,
      "2026-09-02T03:01:00.000Z",
    )

    expect(resetMobileBatchCopy(draft, "2026-09-02T03:02:00.000Z")).toMatchObject({
      clickCount: 0,
      entries: [],
      step: "collecting",
    })
  })

  it("다음 단계는 Clipboard나 목록 자료 없이 확인 단계만 기록한다", () => {
    const draft = addMobileBatchCopyEntry(
      beginDraft(),
      firstEntry,
      "2026-09-02T03:01:00.000Z",
    )

    expect(confirmMobileBatchCopy(draft, "2026-09-02T03:02:00.000Z")).toMatchObject({
      clickCount: 1,
      entries: [firstEntry],
      step: "confirming",
    })
  })

  it("확인 단계에서 순서를 바꿔도 수집 단계 클릭 횟수를 유지한다", () => {
    const collecting = addMobileBatchCopyEntry(
      addMobileBatchCopyEntry(
        addMobileBatchCopyEntry(
          beginDraft(),
          firstEntry,
          "2026-09-02T03:01:00.000Z",
        ),
        secondEntry,
        "2026-09-02T03:02:00.000Z",
      ),
      thirdEntry,
      "2026-09-02T03:03:00.000Z",
    )
    const confirming = confirmMobileBatchCopy(
      collecting,
      "2026-09-02T03:04:00.000Z",
    )
    const moved = moveMobileBatchCopyEntry(
      confirming,
      thirdEntry.id,
      0,
      "2026-09-02T03:05:00.000Z",
    )

    expect(moved.entries).toEqual([thirdEntry, firstEntry, secondEntry])
    expect(moved.clickCount).toBe(3)
  })

  it("복제는 새 ID를 사용해 대상 바로 뒤에 만들고 원본 메모를 바꾸지 않는다", () => {
    const collecting = addMobileBatchCopyEntry(
      beginDraft(),
      firstEntry,
      "2026-09-02T03:01:00.000Z",
    )
    const confirming = confirmMobileBatchCopy(
      collecting,
      "2026-09-02T03:02:00.000Z",
    )
    const duplicated = duplicateMobileBatchCopyEntry(
      confirming,
      firstEntry.id,
      "batch-entry-copy",
      "2026-09-02T03:03:00.000Z",
    )

    expect(duplicated.entries).toEqual([
      firstEntry,
      { ...firstEntry, id: "batch-entry-copy" },
    ])
    expect(duplicated.clickCount).toBe(1)
  })

  it("삭제는 작업 초안의 한 항목만 없애고 클릭 횟수를 유지한다", () => {
    const collecting = addMobileBatchCopyEntry(
      addMobileBatchCopyEntry(
        beginDraft(),
        firstEntry,
        "2026-09-02T03:01:00.000Z",
      ),
      secondEntry,
      "2026-09-02T03:02:00.000Z",
    )
    const confirming = confirmMobileBatchCopy(
      collecting,
      "2026-09-02T03:03:00.000Z",
    )
    const removed = removeMobileBatchCopyEntry(
      confirming,
      firstEntry.id,
      "2026-09-02T03:04:00.000Z",
    )

    expect(removed.entries).toEqual([secondEntry])
    expect(removed.clickCount).toBe(2)
  })
})
