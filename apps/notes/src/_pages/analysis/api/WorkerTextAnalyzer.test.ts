import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type { EntityIdGenerator } from "@/shared/lib/id-generation"

import type {
  AnalysisInput,
  AnalysisRequestMessage,
  AnalysisResponseMessage,
} from "../model/analysisMessage"
import { WorkerTextAnalyzer } from "./WorkerTextAnalyzer"

type WorkerEventType = "error" | "message"

class ControllableWorker {
  static instances: ControllableWorker[] = []
  static postError: Error | null = null

  readonly messages: unknown[] = []
  readonly listeners: Record<WorkerEventType, EventListener[]> = {
    error: [],
    message: [],
  }

  constructor() {
    ControllableWorker.instances.push(this)
  }

  addEventListener(type: WorkerEventType, listener: EventListener) {
    this.listeners[type].push(listener)
  }

  postMessage(message: unknown) {
    if (ControllableWorker.postError !== null) {
      throw ControllableWorker.postError
    }

    this.messages.push(message)
  }

  terminate() {}

  emitError() {
    for (const listener of this.listeners.error) {
      listener(new Event("error"))
    }
  }

  emitMessage(message: unknown) {
    const event = new MessageEvent("message", { data: message })

    for (const listener of this.listeners.message) {
      listener(event)
    }
  }
}

const input: AnalysisInput = {
  algorithm: { type: "surface-v1", version: "1" },
  notes: [
    {
      content: "첫 줄\n둘째 줄",
      note: { contentRevision: 2, id: "note-one" },
    },
  ],
}

function responseFor(
  request: AnalysisRequestMessage,
): AnalysisResponseMessage {
  return {
    algorithm: request.algorithm,
    inputNotes: request.notes.map(({ note }) => note),
    requestId: request.requestId,
    results: [],
    sourceLines: [],
    type: "analysis-result",
  }
}

function sentRequest(worker: ControllableWorker) {
  return worker.messages[0] as AnalysisRequestMessage
}

describe("WorkerTextAnalyzer", () => {
  let originalWorker: typeof Worker | undefined
  let nextIdentifier: number
  let identifiers: EntityIdGenerator

  beforeEach(() => {
    originalWorker = globalThis.Worker
    nextIdentifier = 0
    identifiers = {
      create() {
        nextIdentifier += 1
        return `request-${nextIdentifier}`
      },
    }
    ControllableWorker.instances = []
    ControllableWorker.postError = null
    Object.assign(globalThis, {
      Worker: ControllableWorker as unknown as typeof Worker,
    })
  })

  afterEach(() => {
    Object.assign(globalThis, { Worker: originalWorker })
  })

  it("rejects a schema-valid response for another note set", async () => {
    const analyzer = new WorkerTextAnalyzer(identifiers)
    const pending = analyzer.analyze(input)
    const worker = ControllableWorker.instances[0]
    const request = sentRequest(worker)

    worker.emitMessage({
      ...responseFor(request),
      inputNotes: [{ contentRevision: 1, id: "note-other" }],
    })

    await expect(pending).rejects.toThrow("another request")
  })

  it("rejects a schema-valid line that is absent from the request", async () => {
    const analyzer = new WorkerTextAnalyzer(identifiers)
    const pending = analyzer.analyze(input)
    const worker = ControllableWorker.instances[0]
    const request = sentRequest(worker)

    worker.emitMessage({
      ...responseFor(request),
      results: [
        {
          algorithm: request.algorithm,
          left: {
            lineIndex: 0,
            note: request.notes[0].note,
          },
          relation: "surface",
          right: {
            lineIndex: 2,
            note: request.notes[0].note,
          },
          score: 0.25,
        },
      ],
      sourceLines: [
        {
          lineIndex: 0,
          note: request.notes[0].note,
          rawText: "첫 줄",
        },
        {
          lineIndex: 2,
          note: request.notes[0].note,
          rawText: "없는 줄",
        },
      ],
    })

    await expect(pending).rejects.toThrow("another request")
  })

  it("rejects Worker errors and accepts a later retry", async () => {
    const analyzer = new WorkerTextAnalyzer(identifiers)
    const failed = analyzer.analyze(input)
    const firstWorker = ControllableWorker.instances[0]

    firstWorker.emitError()
    await expect(failed).rejects.toThrow("Text analysis failed")

    const retried = analyzer.analyze(input)
    const secondWorker = ControllableWorker.instances[1]
    const retryRequest = sentRequest(secondWorker)
    secondWorker.emitMessage(responseFor(retryRequest))

    await expect(retried).resolves.toMatchObject({
      requestId: retryRequest.requestId,
      type: "analysis-result",
    })
  })

  it("rejects a request when Worker messaging cannot start", async () => {
    ControllableWorker.postError = new Error("post failed")
    const analyzer = new WorkerTextAnalyzer(identifiers)

    await expect(analyzer.analyze(input)).rejects.toThrow("post failed")
  })

  it("rejects invalid Worker messages and accepts a later retry", async () => {
    const analyzer = new WorkerTextAnalyzer(identifiers)
    const failed = analyzer.analyze(input)
    const firstWorker = ControllableWorker.instances[0]

    firstWorker.emitMessage({ type: "unexpected" })
    await expect(failed).rejects.toThrow("invalid data")

    const retried = analyzer.analyze(input)
    const secondWorker = ControllableWorker.instances[1]
    const request = sentRequest(secondWorker)
    secondWorker.emitMessage(responseFor(request))

    await expect(retried).resolves.toMatchObject({
      requestId: request.requestId,
      type: "analysis-result",
    })
  })

  it("rejects pending analysis when the application disposes the Worker", async () => {
    const analyzer = new WorkerTextAnalyzer(identifiers)
    const pending = analyzer.analyze(input)

    analyzer.dispose()

    await expect(pending).rejects.toThrow("Text analysis was stopped")
  })
})
