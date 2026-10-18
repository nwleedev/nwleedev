import { act, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import { expect, it } from "vitest"
import { page, userEvent } from "vitest/browser"

import type { Note } from "@/entities/note"

import { useMobileNoteActionSheet } from "../model/use-mobile-note-action-sheet"
import { MobileNoteActionSheet } from "./mobile-note-action-sheet"

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

it("삭제와 복원 결과가 도착할 때까지 시트를 닫지 않고 완료 후 조작을 이어간다", async () => {
  const timestamp = new Date().toISOString()
  const note: Note = {
    content: "처리 중에도 보존할 메모",
    contentRevision: 0,
    createdAt: timestamp,
    geometry: { height: 240, width: 320, x: 20, y: 20, zIndex: 1 },
    id: crypto.randomUUID(),
    revision: 0,
    tabIndex: 1000,
    updatedAt: timestamp,
  }
  let finishRemoval: (note: Note) => void = () => { throw new Error("Removal has not started") }
  let finishRestoration: (note: Note) => void = () => { throw new Error("Restoration has not started") }

  function Harness() {
    const [notes, setNotes] = useState([note])
    const createButton = useRef<HTMLButtonElement>(null)
    const actions = useMobileNoteActionSheet({
      createButton,
      noteIds: notes.map(({ id }) => id),
      notes,
      onForget: () => setNotes([]),
      onRemove: () => new Promise<Note>((resolve) => { finishRemoval = resolve }),
      onRestore: () => new Promise<Note>((resolve) => {
        finishRestoration = (restored) => { setNotes([restored]); resolve(restored) }
      }),
    })
    async function unexpectedAction(): Promise<never> { throw new Error("This action is outside the pending deletion scenario") }
    return <>
      <button onClick={(event) => actions.open(note, event.currentTarget)} type="button">메모 더보기</button>
      <button ref={createButton} type="button">새 메모</button>
      <MobileNoteActionSheet onAdd={unexpectedAction} onCopy={unexpectedAction} sheet={actions.view} />
    </>
  }

  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => root.render(<Harness />))
    await act(async () => userEvent.click(page.getByRole("button", { name: "메모 더보기" })))
    await act(async () => userEvent.click(page.getByRole("button", { exact: true, name: "삭제" })))
    await act(async () => userEvent.click(page.getByRole("button", { exact: true, name: "삭제" })))
    const sheet = page.getByRole("dialog")
    const close = page.getByRole("button", { name: "동작 선택창 닫기" })
    await expect.element(page.getByRole("button", { name: "삭제 중" })).toBeDisabled()
    await expect.element(close).toBeDisabled()
    await act(async () => userEvent.keyboard("{Escape}"))
    await expect.element(sheet).toBeVisible()
    await act(async () => finishRemoval(note))
    await expect.element(page.getByRole("button", { name: "실행 취소" })).toBeEnabled()
    await act(async () => userEvent.click(page.getByRole("button", { name: "실행 취소" })))
    await expect.element(page.getByRole("button", { name: "복원 중" })).toBeDisabled()
    await expect.element(close).toBeDisabled()
    await act(async () => userEvent.keyboard("{Escape}"))
    await expect.element(sheet).toBeVisible()
    await act(async () => finishRestoration(note))
    await expect.element(page.getByRole("link", { name: "수정" })).toBeVisible()
    await act(async () => userEvent.click(close))
    await expect.element(sheet).not.toBeInTheDocument()
    await expect.element(page.getByRole("button", { name: "메모 더보기" })).toHaveFocus()
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})
