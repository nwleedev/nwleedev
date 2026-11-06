import { describe, expect, it } from "vitest"

import { NoteBody } from "./note-body"

describe("같은 메모를 여러 창에서 편집", () => {
  it("선택 구간을 지워도 다른 창이 그 안에 넣은 글자는 남고 중복 수신해도 같은 본문을 읽는다", () => {
    const original = NoteBody.fromText("가나다라").snapshot()
    const first = new NoteBody(original)
    const second = new NoteBody(original)

    const deletion = first.replace(1, 3, "")
    const insertion = second.replace(2, 2, "별")

    first.receive(insertion)
    second.receive(deletion)
    const reopened = new NoteBody(first.snapshot())
    reopened.receive(insertion)
    reopened.receive(deletion)
    expect([first.text, second.text, reopened.text]).toEqual(["가별라", "가별라", "가별라"])
  })

  it("먼저 도착한 후속 편집도 누락 없이 복구하고 전체 삭제 후 빈 메모를 유지한다", () => {
    const base = NoteBody.fromText("회의").snapshot()
    const editor = new NoteBody(base)
    const replica = new NoteBody(base)
    const first = editor.replace(2, 2, " 준비")
    const second = editor.replace(3, 5, "완료")
    replica.receive(second)
    replica.receive(first)
    expect(replica.text).toBe("회의 완료")
    const clear = replica.replace(0, replica.text.length, "")
    editor.receive(clear)
    expect(new NoteBody(editor.snapshot()).text).toBe("")
  })
})
