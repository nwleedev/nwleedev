import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { page, userEvent } from "vitest/browser"

import type { Note, NoteRepository } from "@/entities/note"
import type { NoteDraftRepository } from "@/entities/note"
import type { IndividualCopyUsageWriter } from "@/entities/usage"

import type {
  NoteStorageEvent,
  NoteStorageMonitor,
} from "./note-storage-monitor"
import {
  NotesDataProvider,
  useNotesData,
} from "./notes-data-provider"
import type { SaveNoteContentResult } from "./save-note-content"
import { useNoteContentAutosave } from "./use-note-content-autosave"

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const timestamp = "2026-08-31T01:00:00.000Z"
const clipboard = {
  writeText: async () => ({ status: "written" }) as const,
}
const usage: IndividualCopyUsageWriter = {
  recordIndividualCopy: async () => undefined,
}
const drafts: NoteDraftRepository = {
  get: async () => null,
  remove: async () => undefined,
  save: async (draft) => draft,
}

type AutosaveEditorProps = {
  initialContent: string
  note: Note
  onSave(noteId: string, content: string): Promise<SaveNoteContentResult>
}

function AutosaveEditor({
  initialContent,
  note,
  onSave,
}: AutosaveEditorProps) {
  const content = useNoteContentAutosave({
    initialContent,
    note,
    onFailure: () => undefined,
    onSave,
  })

  return (
    <textarea
      aria-label="메모 내용"
      onBlur={content.save}
      onChange={(event) => content.change(event.target.value)}
      value={content.content}
    />
  )
}

function NotesDataProbe() {
  const notesData = useNotesData()

  if (notesData.status === "loading") {
    return <p>메모 불러오는 중</p>
  }

  if (notesData.status === "blocked") {
    return (
      <>
        <p>다른 탭을 닫고 다시 시도하세요.</p>
        <button onClick={notesData.retry} type="button">다시 시도</button>
      </>
    )
  }

  if (notesData.status === "version-changed") {
    return (
      <>
        <p>다른 탭에서 변경되었습니다. 다시 불러오세요.</p>
        <button onClick={notesData.retry} type="button">다시 시도</button>
      </>
    )
  }

  if (notesData.status === "failure") {
    return (
      <>
        <p>메모를 불러오지 못했습니다.</p>
        <button onClick={notesData.retry} type="button">다시 시도</button>
      </>
    )
  }

  if (notesData.status === "empty") {
    return <p>메모가 없습니다.</p>
  }

  const firstNote = notesData.notes[0]

  return (
    <>
      {notesData.notes.map((note) => (
        <article key={note.id}>{note.content}</article>
      ))}
      {firstNote ? (
        <AutosaveEditor
          initialContent={
            notesData.draftContentByNote[firstNote.id] ?? firstNote.content
          }
          note={firstNote}
          onSave={notesData.saveContent}
        />
      ) : null}
    </>
  )
}

function createDeferred<T>() {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })

  return { promise, resolve }
}

function createNote(id: string, content: string): Note {
  return {
    content,
    contentRevision: 0,
    createdAt: timestamp,
    geometry: { height: 240, width: 320, x: 20, y: 20, zIndex: 1 },
    id,
    revision: 0,
    tabIndex: 1000,
    updatedAt: timestamp,
  }
}

function createRepository(
  reads: readonly Promise<readonly Note[]>[],
): NoteRepository {
  let nextRead = 0

  return {
    getAll() {
      const read = reads[nextRead]
      nextRead += 1

      return read ?? Promise.reject(new Error("Unexpected note read"))
    },
    remove: async () => undefined,
    save: async (note) => note,
    saveAll: async (notes) => notes,
  }
}

function createDelayedSaveRepository(note: Note) {
  const firstSave = createDeferred<void>()
  let currentNote = note
  let saveCount = 0

  const repository: NoteRepository = {
    getAll: async () => [currentNote],
    remove: async () => undefined,
    async save(nextNote) {
      saveCount += 1

      if (saveCount === 1) {
        await firstSave.promise
      }

      currentNote = nextNote
      return nextNote
    },
    saveAll: async (notes) => notes,
  }

  return {
    completeFirstSave: () => firstSave.resolve(),
    readContent: () => currentNote.content,
    repository,
    saveCount: () => saveCount,
  }
}

function createStorageMonitor() {
  let listener: ((event: NoteStorageEvent) => void) | null = null
  const monitor: NoteStorageMonitor = {
    subscribe(nextListener) {
      listener = nextListener

      return () => {
        if (listener === nextListener) {
          listener = null
        }
      }
    },
  }

  return {
    emit(event: NoteStorageEvent) {
      if (listener === null) {
        throw new Error("Storage monitor has no subscriber")
      }

      listener(event)
    },
    monitor,
  }
}

describe("NotesDataProvider", () => {
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

  async function renderNotes(
    repository: NoteRepository,
    storageMonitor: NoteStorageMonitor,
  ) {
    await act(async () => {
      root.render(
        <NotesDataProvider
          batchCopyShortcutEnabled
          clipboard={clipboard}
          createId={() => "created-note"}
          drafts={drafts}
          now={() => timestamp}
          repository={repository}
          storageMonitor={storageMonitor}
          usage={usage}
        >
          <NotesDataProbe />
        </NotesDataProvider>,
      )
    })
  }

  it("keeps waiting after an upgrade is blocked and recovers when it continues", async () => {
    const initialRead = createDeferred<readonly Note[]>()
    const storage = createStorageMonitor()
    await renderNotes(createRepository([initialRead.promise]), storage.monitor)
    await expect
      .element(page.getByText("메모 불러오는 중"))
      .toBeInTheDocument()

    await act(async () => storage.emit("blocked"))
    await expect
      .element(page.getByText("다른 탭을 닫고 다시 시도하세요."))
      .toBeInTheDocument()
    await expect
      .element(page.getByRole("button", { name: "다시 시도" }))
      .toBeEnabled()

    await act(async () => {
      initialRead.resolve([])
      await initialRead.promise
    })
    await expect
      .element(page.getByText("메모가 없습니다."))
      .toBeInTheDocument()
  })

  it("keeps the retried result when an earlier read finishes later", async () => {
    const initialRead = createDeferred<readonly Note[]>()
    const retriedRead = createDeferred<readonly Note[]>()
    const storage = createStorageMonitor()
    const latestNote = createNote("note-latest", "다시 불러온 메모")
    const staleNote = createNote("note-stale", "이전에 요청한 메모")
    await renderNotes(
      createRepository([initialRead.promise, retriedRead.promise]),
      storage.monitor,
    )

    await act(async () => storage.emit("version-changed"))
    const retry = page.getByRole("button", { name: "다시 시도" })
    await expect.element(retry).toBeEnabled()
    await act(async () => userEvent.click(retry))

    await act(async () => {
      retriedRead.resolve([latestNote])
      await retriedRead.promise
    })
    const notePreview = page.getByRole("article").first()
    await expect.element(notePreview).toHaveTextContent(latestNote.content)

    await act(async () => {
      initialRead.resolve([staleNote])
      await initialRead.promise
    })
    await expect.element(notePreview).toHaveTextContent(latestNote.content)
    await expect.element(notePreview).not.toHaveTextContent(staleNote.content)
  })

  it("blur saves the latest text immediately after an earlier save finishes", async () => {
    const storage = createStorageMonitor()
    const delayed = createDelayedSaveRepository(
      createNote("note-autosave", "저장된 메모"),
    )
    await renderNotes(delayed.repository, storage.monitor)
    const editor = page.getByRole("textbox", { name: "메모 내용" })

    await act(async () => {
      await userEvent.fill(editor, "먼저 저장할 메모")
      await userEvent.tab()
    })
    await expect.poll(delayed.saveCount).toBe(1)

    await act(async () => {
      await userEvent.fill(editor, "저장 중에 완성한 메모")
      await userEvent.tab()
      delayed.completeFirstSave()
      await expect.poll(delayed.readContent).toBe("저장 중에 완성한 메모")
    })
  })
})
