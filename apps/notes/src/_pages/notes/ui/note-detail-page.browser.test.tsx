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

function createStorage(initialNote: Note) {
  let storedNote = initialNote
  let storedDraft: NoteDraft | null = null
  let rejectNextNoteSave = true

  const notes: NoteRepository = {
    getAll: async () => [storedNote],
    remove: async () => undefined,
    async save(note) {
      if (rejectNextNoteSave) {
        rejectNextNoteSave = false
        throw new Error("Controlled note save failure")
      }

      storedNote = note
      return note
    },
    saveAll: async (records) => records,
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
  await act(async () =>
    userEvent.click(page.getByRole("button", { name: "저장", exact: true })),
  )

  await expect.element(page.getByRole("alert")).toBeInTheDocument()
  expect(storage.note.content).toBe(initialNote.content)
  expect(storage.draft?.content).toBe(changedContent)

  await act(async () => root.unmount())
  root = createRoot(container)
  await renderDetail(initialNote.id, storage)
  await expect.element(editor).toHaveValue(changedContent)

  await act(async () =>
    userEvent.click(page.getByRole("button", { name: "저장", exact: true })),
  )
  expect(storage.note.content).toBe(changedContent)
  expect(storage.note.contentRevision).toBe(initialNote.contentRevision + 1)
  expect(storage.draft).toBeNull()
})
