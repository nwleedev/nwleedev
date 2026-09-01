import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { page, userEvent } from "vitest/browser"

import type { Note, NoteReader } from "@/entities/note"

import type {
  AnalysisInput,
  AnalysisResponseMessage,
  TextAnalyzer,
} from "./analysisMessage"
import {
  TextAnalysisProvider,
  useTextAnalysis,
} from "./TextAnalysisProvider"

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const timestamp = "2026-09-01T10:00:00.000Z"

function createDeferred<T>() {
  let reject: (reason: Error) => void = () => undefined
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((complete, fail) => {
    reject = fail
    resolve = complete
  })

  return { promise, reject, resolve }
}

function requireValue<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new Error(message)
  }

  return value
}

function createNote(contentRevision: number): Note {
  return {
    content: "같은 줄\n같은 줄",
    contentRevision,
    createdAt: timestamp,
    geometry: { height: 240, width: 320, x: 0, y: 0, zIndex: 0 },
    id: "note-one",
    revision: contentRevision,
    updatedAt: timestamp,
  }
}

function responseFor(
  input: AnalysisInput,
  requestId: string,
): AnalysisResponseMessage {
  return {
    algorithm: input.algorithm,
    inputNotes: input.notes.map(({ note }) => note),
    requestId,
    results: [],
    sourceLines: [],
    type: "analysis-result",
  }
}

function AnalysisStateView() {
  const analysis = useTextAnalysis()
  const requestId = analysis.status === "success"
    ? analysis.completed.response.requestId
    : ""

  return (
    <div>
      <button onClick={() => void analysis.run()} type="button">
        분석 실행
      </button>
      <output aria-label="분석 상태">{analysis.status}</output>
      <output aria-label="분석 요청">{requestId}</output>
    </div>
  )
}

describe("TextAnalysisProvider", () => {
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

  async function renderProvider(analyzer: TextAnalyzer, reader: NoteReader) {
    await act(async () => {
      root.render(
        <TextAnalysisProvider
          analyzer={analyzer}
          now={() => timestamp}
          reader={reader}
        >
          <AnalysisStateView />
        </TextAnalysisProvider>,
      )
    })
  }

  it("keeps the latest analysis when an earlier response finishes later", async () => {
    const first = createDeferred<AnalysisResponseMessage>()
    const second = createDeferred<AnalysisResponseMessage>()
    const pending = [first, second]
    let requestIndex = 0
    const latestInput: { current: AnalysisInput | null } = { current: null }
    const analyzer: TextAnalyzer = {
      analyze(input) {
        latestInput.current = input
        const request = pending[requestIndex]
        requestIndex += 1
        return request.promise
      },
    }
    const reader: NoteReader = { getAll: async () => [createNote(1)] }
    await renderProvider(analyzer, reader)
    const run = page.getByRole("button", { name: "분석 실행" })

    await act(async () => userEvent.click(run))
    await act(async () => userEvent.click(run))
    const input = requireValue(
      latestInput.current,
      "Expected analysis input",
    )

    await act(async () => {
      second.resolve(responseFor(input, "request-two"))
      await second.promise
    })
    await expect.element(page.getByLabelText("분석 요청")).toHaveTextContent(
      "request-two",
    )

    await act(async () => {
      first.resolve(responseFor(input, "request-one"))
      await first.promise
    })
    await expect.element(page.getByLabelText("분석 요청")).toHaveTextContent(
      "request-two",
    )
  })

  it("marks a response stale when note content changes during analysis", async () => {
    const deferred = createDeferred<AnalysisResponseMessage>()
    let notes: readonly Note[] = [createNote(1)]
    const requestInput: { current: AnalysisInput | null } = { current: null }
    const analyzer: TextAnalyzer = {
      analyze(input) {
        requestInput.current = input
        return deferred.promise
      },
    }
    const reader: NoteReader = { getAll: async () => notes }
    await renderProvider(analyzer, reader)

    await act(async () =>
      userEvent.click(page.getByRole("button", { name: "분석 실행" })),
    )
    notes = [createNote(2)]

    const input = requireValue(
      requestInput.current,
      "Expected analysis input",
    )

    await act(async () => {
      deferred.resolve(responseFor(input, "request-one"))
      await deferred.promise
    })

    await expect.element(page.getByLabelText("분석 상태")).toHaveTextContent(
      "stale",
    )
  })

  it("rejects a result without its source line snapshot", async () => {
    const analyzer: TextAnalyzer = {
      async analyze(input) {
        return {
          ...responseFor(input, "request-one"),
          results: [
            {
              algorithm: input.algorithm,
              left: { lineIndex: 0, note: input.notes[0].note },
              relation: "exact",
              right: { lineIndex: 1, note: input.notes[0].note },
              score: null,
            },
          ],
        }
      },
    }
    const reader: NoteReader = { getAll: async () => [createNote(1)] }
    await renderProvider(analyzer, reader)

    await act(async () =>
      userEvent.click(page.getByRole("button", { name: "분석 실행" })),
    )

    await expect.element(page.getByLabelText("분석 상태")).toHaveTextContent(
      "failure",
    )
  })
})
