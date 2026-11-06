import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { page, userEvent } from "vitest/browser"

import type {
  Note,
  NoteDraft,
  NoteDraftRepository,
  NoteRepository,
} from "@/entities/note"
import { NavigationGuardProvider } from "@/features/navigation-guard"

import { NotesDataProvider } from "../model/notes-data-provider"
import type { NoteStorageMonitor } from "../model/note-storage-monitor"
import { NoteDetailPage } from "./note-detail-page"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined }),
}))

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

function createStoredNote(): Note {
  const timestamp = new Date().toISOString()

  return {
    content: "저장된 원문",
    contentRevision: 0,
    createdAt: timestamp,
    geometry: { height: 240, width: 320, x: 20, y: 20, zIndex: 1 },
    id: crypto.randomUUID(),
    revision: 0,
    tabIndex: 1000,
    updatedAt: timestamp,
  }
}

function createStorage(initialNote: Note, rejectFirstSave = true) {
  let storedNote = initialNote
  let storedDraft: NoteDraft | null = null
  let rejectNextNoteSave = rejectFirstSave

  const notes: NoteRepository = {
    getAll: async () => [storedNote],
    remove(note) { return this.get(note.id) },
    openEditor: async () => async () => {},
    deletedNote: async () => null,
    restore(note) { return this.save(note) },
    async save(note) {
      if (rejectNextNoteSave) {
        rejectNextNoteSave = false
        throw new Error("Controlled note save failure")
      }

      storedNote = note
      return note
    },
    async get(id) { return (await this.getAll()).find((record) => record.id === id) ?? null },
    saveGeometry(note, geometry, updatedAt) { return this.save({ ...note, geometry, updatedAt }) },
    saveEdit(_original, edited) { return this.save(edited) },
    async moveInStack() { return { notes: await this.getAll(), changedIds: [] } },
  }
  const drafts: NoteDraftRepository = {
    get: async (reference) =>
      storedDraft?.note.id === reference.id ? storedDraft : null,
    remove: async () => {
      storedDraft = null
    },
    save: async (draft) => {
      storedDraft = draft
      return draft
    },
  }

  return {
    drafts,
    get draft() {
      return storedDraft
    },
    get note() {
      return storedNote
    },
    notes,
  }
}

const monitor: NoteStorageMonitor = {
  subscribe: () => () => undefined,
}

async function unexpectedMobileOrderAccess(): Promise<never> {
  throw new Error("Detail editing must not access mobile ordering")
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function renderDetail(noteId: string, storage: ReturnType<typeof createStorage>) {
  await act(async () => {
    root.render(
      <NavigationGuardProvider>
        <NotesDataProvider
          batchCopyShortcutEnabled={false}
          clipboard={{ writeText: async () => ({ status: "written" }) }}
          createId={crypto.randomUUID}
          drafts={storage.drafts}
          now={() => new Date().toISOString()}
          readMobileOrder={unexpectedMobileOrderAccess}
          moveMobileNote={unexpectedMobileOrderAccess}
          repository={storage.notes}
          storageMonitor={monitor}
          usage={{ recordIndividualCopy: async () => undefined }}
        >
          <NoteDetailPage noteId={noteId} />
        </NotesDataProvider>
      </NavigationGuardProvider>,
    )
  })
}

it("메모 저장 실패 후 다시 열어도 편집 초안을 복구하고 재저장한다", async () => {
  const initialNote = createStoredNote()
  const changedContent = `${initialNote.content} 다음 입력`
  const storage = createStorage(initialNote)
  await renderDetail(initialNote.id, storage)

  const editor = page.getByRole("textbox", { name: "메모 내용" })
  await expect.element(editor).toHaveValue(initialNote.content)
  await act(async () => userEvent.fill(editor, changedContent))

  await act(async () => { await expect.poll(() => storage.draft?.content).toBe(changedContent) })
  expect(page.getByRole("alert").query()).toBeNull()
  expect(storage.note.content).toBe(initialNote.content)
  expect(storage.draft?.content).toBe(changedContent)

  await act(async () => root.unmount())
  root = createRoot(container)
  await renderDetail(initialNote.id, storage)
  await expect.element(editor).toHaveValue(changedContent)

  await act(async () => userEvent.fill(editor, `${changedContent} 재저장`))
  await act(async () => { await expect.poll(() => storage.note.content).toBe(`${changedContent} 재저장`) })
  expect(storage.note.content).toBe(`${changedContent} 재저장`)
  expect(storage.note.contentRevision).toBe(initialNote.contentRevision + 1)
  expect(storage.draft).toBeNull()
})


it("쓰기 실패 뒤 사용자 조작 없이 현재 입력을 저장하고 그동안 저장 중을 표시한다", async () => {
  const initialNote = createStoredNote()
  const storage = createStorage(initialNote)
  await renderDetail(initialNote.id, storage)
  const editor = page.getByRole("textbox", { name: "메모 내용" })
  const status = page.getByRole("status")
  const content = initialNote.content + " 재시도할 입력"
  await act(async () => userEvent.fill(editor, content))
  await act(async () => { await expect.poll(() => storage.draft?.content).toBe(content) })
  expect(storage.note.content).toBe(initialNote.content)
  await expect.element(status).toHaveTextContent("저장 중")
  expect(page.getByRole("button", { name: "다시 시도" }).query()).toBeNull()
  await act(async () => { await expect.poll(() => storage.note.content).toBe(content) })
  await expect.element(status).toHaveTextContent("저장됨")
  await expect.element(editor).toHaveValue(content)
})

it("자동 저장 뒤에도 편집을 되돌리고 다시 실행하며 새 입력은 이전 Redo를 없앤다", async () => {
  const initialNote = createStoredNote()
  const storage = createStorage(initialNote, false)
  await renderDetail(initialNote.id, storage)
  const editor = page.getByRole("textbox", { name: "메모 내용" })
  const undo = page.getByRole("button", { name: "실행 취소", exact: true })
  const redo = page.getByRole("button", { name: "다시 실행", exact: true })
  await expect.element(undo).toBeDisabled()
  await expect.element(redo).toBeDisabled()
  const changed = `${initialNote.content} 수정한 내용`
  await act(async () => userEvent.fill(editor, changed))
  await act(async () => { await expect.poll(() => storage.note.content).toBe(changed) })
  await expect.element(undo).toBeEnabled()
  await act(async () => userEvent.click(undo))
  await expect.element(editor).toHaveValue(initialNote.content)
  await act(async () => { await expect.poll(() => storage.note.content).toBe(initialNote.content) })
  await act(async () => userEvent.click(redo))
  await expect.element(editor).toHaveValue(changed)
  await act(async () => { await expect.poll(() => storage.note.content).toBe(changed) })
  await act(async () => userEvent.click(undo))
  await act(async () => userEvent.fill(editor, "새로운 수정"))
  await expect.element(redo).toBeDisabled()
  await act(async () => { await expect.poll(() => storage.note.content).toBe("새로운 수정") })
  await act(async () => root.unmount())
  root = createRoot(container)
  await renderDetail(initialNote.id, storage)
  await expect.element(editor).toHaveValue("새로운 수정")
  await expect.element(undo).toBeDisabled()
  await expect.element(redo).toBeDisabled()
})

it("이전 저장이 끝나도 최신 입력의 저장이 끝날 때까지 저장 중으로 표시한다", async () => {
  const initialNote = createStoredNote()
  const storage = createStorage(initialNote, false)
  const save = storage.notes.save
  const completions: (() => void)[] = []
  storage.notes.save = async (note) => {
    await new Promise<void>((resolve) => completions.push(resolve))
    return save(note)
  }
  await renderDetail(initialNote.id, storage)
  const editor = page.getByRole("textbox", { name: "메모 내용" })
  const status = page.getByRole("status")
  await act(async () => userEvent.fill(editor, "먼저 저장할 내용"))
  await act(async () => { await expect.poll(() => completions.length).toBe(1) })
  await act(async () => userEvent.fill(editor, "저장 중에 추가한 최신 내용"))
  await expect.element(status).toHaveTextContent("저장 중")
  await act(async () => completions[0]())
  await expect.element(editor).toHaveValue("저장 중에 추가한 최신 내용")
  await expect.element(status).toHaveTextContent("저장 중")
  expect(storage.note.content).toBe("먼저 저장할 내용")
  await act(async () => { await expect.poll(() => completions.length).toBe(2) })
  await act(async () => completions[1]())
  await expect.element(status).toHaveTextContent("저장됨")
  expect(storage.note.content).toBe("저장 중에 추가한 최신 내용")
})

it.each(["", " ㄱ"])("조합 중 추가 본문 %j에서 이전 저장이 완료되어도 조합 완료 후 저장한다", async (suffix) => {
  const initialNote = createStoredNote()
  const storage = createStorage(initialNote, false)
  const save = storage.notes.save
  const completions: (() => void)[] = []
  storage.notes.save = async (note) => {
    await new Promise<void>((resolve) => completions.push(resolve))
    return save(note)
  }
  await renderDetail(initialNote.id, storage)
  const editor = page.getByRole("textbox", { name: "메모 내용" })
  const status = page.getByRole("status")
  await act(async () => userEvent.fill(editor, "저장 요청 본문"))
  await act(async () => { await expect.poll(() => completions.length).toBe(1) })
  const element = editor.element()
  const setContent = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!
  await act(async () => {
    element.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }))
    setContent.call(element, `저장 요청 본문${suffix}`)
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertCompositionText", isComposing: true, data: suffix }))
  })
  await act(async () => completions[0]())
  expect(storage.note.content).toBe("저장 요청 본문")
  expect(completions).toHaveLength(1)
  await expect.element(editor).toHaveValue(`저장 요청 본문${suffix}`)
  await expect.element(status).toHaveTextContent("저장 중")
  await act(async () => {
    setContent.call(element, "저장 요청 본문 가")
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertCompositionText", isComposing: true, data: "가" }))
    element.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "가" }))
  })
  await act(async () => { await expect.poll(() => completions.length).toBe(2) })
  await act(async () => completions[1]())
  expect(storage.note.content).toBe("저장 요청 본문 가")
  await expect.element(status).toHaveTextContent("저장됨")
  await act(async () => userEvent.click(page.getByRole("button", { name: "실행 취소", exact: true })))
  await expect.element(editor).toHaveValue("저장 요청 본문")
})
