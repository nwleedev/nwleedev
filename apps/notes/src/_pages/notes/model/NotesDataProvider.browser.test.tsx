import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { page, userEvent } from "vitest/browser"

import type { AccumulatorRepository } from "@/entities/accumulator"
import type { Note, NoteRepository } from "@/entities/note"
import type { OrdinaryCopyUsageWriter } from "@/entities/usage"
import {
  AccumulatorProvider,
  type AccumulationWriter,
} from "@/features/accumulate-note"

import type {
  NoteStorageEvent,
  NoteStorageMonitor,
} from "./NoteStorageMonitor"
import { NotesDataProvider } from "./NotesDataProvider"
import { NotesStartPage } from "../ui/NotesStartPage"

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const timestamp = "2026-08-31T01:00:00.000Z"
const clipboard = { writeText: async () => undefined }
const usage: OrdinaryCopyUsageWriter = {
  recordOrdinaryCopy: async () => undefined,
}
const accumulatorRepository: AccumulatorRepository = {
  get: async () => null,
  save: async (accumulator) => accumulator,
}
const accumulationWriter: AccumulationWriter = {
  addAndRecordUsage: async () => undefined,
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
    geometry: { height: 240, width: 320, x: 0, y: 0, zIndex: 0 },
    id,
    revision: 0,
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
        <AccumulatorProvider
          createId={() => "created-note"}
          now={() => timestamp}
          repository={accumulatorRepository}
          writer={accumulationWriter}
        >
          <NotesDataProvider
            clipboard={clipboard}
            createId={() => "created-note"}
            metaClickEnabled
            now={() => timestamp}
            repository={repository}
            storageMonitor={storageMonitor}
            usage={usage}
          >
            <NotesStartPage />
          </NotesDataProvider>
        </AccumulatorProvider>,
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
})
