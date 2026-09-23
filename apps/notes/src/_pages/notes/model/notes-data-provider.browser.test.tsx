import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import * as fc from "fast-check"
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
import { NoteCard } from "../ui/note-card"

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

  const firstNote = notesData.notes[0]

  return (
    <>
      <button
        onClick={() => {
          void notesData.createNote()
        }}
        type="button"
      >
        새 메모
      </button>
      {notesData.status === "empty" ? <p>메모가 없습니다.</p> : null}
      {notesData.notes.map((note) => (
        <article key={note.id}>{note.content}</article>
      ))}
      {firstNote ? (
        <NoteCard
          batchCopyShortcutEnabled={false}
          commandPressed={false}
          initialContent={
            notesData.draftContentByNote[firstNote.id] ?? firstNote.content
          }
          note={firstNote}
          onActivateProperties={() => undefined}
          onAddToBatchCopy={async () => undefined}
          onCopy={async () => undefined}
          onFocusNote={() => undefined}
          onMoveToBack={async () => []}
          onMoveToFront={async () => []}
          onRemove={async () => undefined}
          onSaveContent={notesData.saveContent}
          onSaveFailure={() => undefined}
          onSaveGeometry={async (note) => note}
          onSelect={() => undefined}
          propertiesTarget={false}
          renderOriginX={0}
          renderOriginY={0}
          scale={1}
          selected={false}
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
  const firstSaveStarted = createDeferred<void>()
  const releaseFirstSave = createDeferred<void>()
  const secondSaveStarted = createDeferred<void>()
  const releaseSecondSave = createDeferred<void>()
  const secondSaveFinished = createDeferred<void>()
  let currentNote = note
  let saveCount = 0

  const repository: NoteRepository = {
    getAll: async () => [currentNote],
    remove: async () => undefined,
    async save(nextNote) {
      saveCount += 1

      if (saveCount === 1) {
        firstSaveStarted.resolve()
        await releaseFirstSave.promise
      }

      if (saveCount === 2) {
        secondSaveStarted.resolve()
        await releaseSecondSave.promise
      }

      currentNote = nextNote

      if (saveCount === 2) {
        secondSaveFinished.resolve()
      }

      return nextNote
    },
    saveAll: async (notes) => notes,
  }

  return {
    completeFirstSave: () => releaseFirstSave.resolve(),
    completeSecondSave: () => releaseSecondSave.resolve(),
    repository,
    secondSaveFinished: secondSaveFinished.promise,
    secondSaveStarted: secondSaveStarted.promise,
    firstSaveStarted: firstSaveStarted.promise,
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
    const [firstContent, latestContent] = fc.sample(
      fc.uniqueArray(fc.stringMatching(/^[a-z]{1,16}$/u), {
        minLength: 2,
        maxLength: 2,
      }),
      1,
    )[0]
    const delayed = createDelayedSaveRepository(
      createNote("note-autosave", "저장된 메모"),
    )
    await renderNotes(delayed.repository, storage.monitor)
    const card = page.getByRole("article", { name: "메모", exact: true })
    const editor = card.getByRole("textbox", { name: "메모 내용" })

    await act(async () => {
      await userEvent.fill(editor, firstContent)
      await userEvent.tab()
    })
    await delayed.firstSaveStarted

    await act(async () => {
      await userEvent.fill(editor, latestContent)
      await userEvent.tab()
    })
    await expect.element(editor).toHaveValue(latestContent)
    await act(async () => {
      delayed.completeFirstSave()
      await delayed.secondSaveStarted
    })
    await expect.element(editor).toHaveValue(latestContent)
    await act(async () => {
      delayed.completeSecondSave()
      await delayed.secondSaveFinished
    })

    await expect.element(editor).toHaveValue(latestContent)
    const stored = await delayed.repository.getAll()
    expect(stored[0]?.content).toBe(latestContent)
  })


})
