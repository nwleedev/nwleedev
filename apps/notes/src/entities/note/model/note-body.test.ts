import { describe, expect, it } from "vitest"

import { NoteBody } from "./note-body"

describe("같은 메모를 여러 창에서 편집", () => {
  it("오래된 본문에는 이미 저장한 삭제가 없고 병합된 본문에는 남는다", () => {
    const base = NoteBody.fromText("가나다").snapshot()
    const mobile = new NoteBody(base)
    const desktop = new NoteBody(base)
    const deletion = mobile.replace(1, 2, "")
    desktop.replace(0, 0, "제목 ")
    expect(desktop.contains(mobile.snapshot())).toBe(false)
    desktop.receive(deletion)
    expect(desktop.contains(mobile.snapshot())).toBe(true)
    expect(mobile.contains(desktop.snapshot())).toBe(false)
  })

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

  it("폼에서 바뀐 글자만 반영해 다른 창의 입력과 이모지를 보존한다", () => {
    const base = NoteBody.fromText("앞😀뒤").snapshot()
    const editor = new NoteBody(base)
    const peer = new NoteBody(base)
    const edit = editor.updateText("앞😃뒤")
    const added = peer.replace(0, 0, "새 ")
    editor.receive(added)
    peer.receive(edit)
    expect([editor.text, peer.text]).toEqual(["새 앞😃뒤", "새 앞😃뒤"])
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
