import { describe, expect, it } from "vitest"

import { insertMobileNote, mobileNotePosition, moveMobileNoteId, reconcileMobileNoteIds } from "./mobile-note-order"

describe("모바일 메모 순서", () => {
  it("비인접 앞뒤 삽입은 나머지 메모의 상대 순서를 보존한다", () => {
    const ids = Array.from({ length: 4 }, () => crypto.randomUUID())
    const [a, b, c, d] = ids as [string, string, string, string]
    expect(moveMobileNoteId(ids, a, 3)).toEqual([b, c, d, a])
    expect(moveMobileNoteId(ids, a, 2)).toEqual([b, c, a, d])
    expect(ids).toEqual([a, b, c, d])
  })

  it("없는 ID와 중복은 제외하고 저장 순서에 없는 유효 메모를 끝에 표시한다", () => {
    const [a, b, missing] = Array.from({ length: 3 }, () => crypto.randomUUID()) as [string, string, string]
    expect(reconcileMobileNoteIds([b, missing, b], [a, b])).toEqual([b, a])
  })

  it("남은 이웃으로 삭제 위치를 복원하고 이웃이 없으면 끝에 넣는다", () => {
    const [a, b, c, d] = Array.from({ length: 4 }, () => crypto.randomUUID()) as [string, string, string, string]
    const position = mobileNotePosition([a, b, c], b)
    expect(insertMobileNote([a, c, d], b, position)).toEqual([a, b, c, d])
    expect(insertMobileNote([a, d], b, position)).toEqual([a, b, d])
    expect(insertMobileNote([d], b, position)).toEqual([d, b])
  })
})
