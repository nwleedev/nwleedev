import { describe, expect, it } from "vitest"

import { addMobileBatchCopyEntry, beginMobileBatchCopy, duplicateMobileBatchCopyEntry, moveMobileBatchCopyEntry, removeMobileBatchCopyEntry, resetMobileBatchCopy, type MobileBatchCopyEntry } from "./mobile-batch-copy-draft"

function entry(textSnapshot: string): MobileBatchCopyEntry {
  return { id: crypto.randomUUID(), sourceNote: { id: crypto.randomUUID(), contentRevision: 1 }, textSnapshot }
}

function draftWith(entries: readonly MobileBatchCopyEntry[]) {
  let draft = beginMobileBatchCopy({ id: crypto.randomUUID(), startedAt: new Date().toISOString() })
  for (const value of entries) draft = addMobileBatchCopyEntry(draft, value, new Date().toISOString())
  return draft
}

describe("모바일 일괄 복사 작업 사본", () => {
  it("반복 추가는 원문 스냅샷과 입력 순서를 보존한다", () => {
    const first = entry("  같은 원문\n다음 줄  ")
    const second = { ...first, id: crypto.randomUUID() }
    const draft = draftWith([first])
    const added = addMobileBatchCopyEntry(draft, second, new Date().toISOString())
    expect(added.entries).toEqual([first, second])
    expect(draft.entries).toEqual([first])
  })

  it("복제와 삭제 후 추가하면 현재 항목을 기준으로 수와 순서를 유지한다", () => {
    const first = entry("첫 원문")
    const second = entry("다른 원문")
    const copyId = crypto.randomUUID()
    const now = new Date().toISOString()
    const duplicated = duplicateMobileBatchCopyEntry(draftWith([first]), first.id, copyId, now)
    expect(duplicated.entries).toEqual([first, { ...first, id: copyId }])
    const removed = removeMobileBatchCopyEntry(duplicated, first.id, now)
    const added = addMobileBatchCopyEntry(removed, second, now)
    expect(added.entries).toEqual([{ ...first, id: copyId }, second])
  })

  it("초기화는 항목을 비우고 같은 작업에서 다시 추가할 수 있다", () => {
    const original = entry("초기화할 원문")
    const next = entry("다시 추가할 원문")
    const draft = draftWith([original])
    const reset = resetMobileBatchCopy(draft, new Date().toISOString())
    expect(reset.entries).toEqual([])
    expect(reset.id).toBe(draft.id)
    expect(addMobileBatchCopyEntry(reset, next, new Date().toISOString()).entries).toEqual([next])
  })

  it("네 항목의 비인접 앞뒤 삽입은 중간 항목의 상대 순서를 유지한다", () => {
    const a = entry("A")
    const b = entry("B")
    const c = entry("C")
    const d = entry("D")
    const draft = draftWith([a, b, c, d])
    const now = new Date().toISOString()
    expect(moveMobileBatchCopyEntry(draft, a.id, 3, now).entries).toEqual([b, c, d, a])
    expect(moveMobileBatchCopyEntry(draft, a.id, 2, now).entries).toEqual([b, c, a, d])
    expect(draft.entries).toEqual([a, b, c, d])
  })

  it("동일한 원문의 삭제는 지정한 항목 ID만 제거한다", () => {
    const first = entry("반복할 원문")
    const second = { ...first, id: crypto.randomUUID() }
    const draft = draftWith([first, second])
    expect(removeMobileBatchCopyEntry(draft, first.id, new Date().toISOString()).entries).toEqual([second])
    expect(draft.entries).toEqual([first, second])
  })
})
