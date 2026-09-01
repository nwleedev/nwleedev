import type { EntityIdGenerator } from "@/shared/lib/id-generation"

import {
  AnalysisRequestMessageSchema,
  AnalysisResponseMessageSchema,
  type AnalysisInput,
  type AnalysisResponseMessage,
  type TextAnalyzer,
} from "../model/analysisMessage"
import { analysisResponseMatchesInput } from "../model/analysisRunState"

type PendingAnalysis = {
  input: AnalysisInput
  reject(reason: Error): void
  resolve(result: AnalysisResponseMessage): void
}

function analysisError(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason : new Error(fallback)
}

export class WorkerTextAnalyzer implements TextAnalyzer {
  readonly #identifiers: EntityIdGenerator
  readonly #pending = new Map<string, PendingAnalysis>()
  #worker: Worker | null = null

  constructor(identifiers: EntityIdGenerator) {
    this.#identifiers = identifiers
  }

  analyze(input: AnalysisInput) {
    const requestId = this.#identifiers.create()
    const message = AnalysisRequestMessageSchema.parse({
      ...input,
      requestId,
      type: "analyze",
    })
    const requestInput: AnalysisInput = {
      algorithm: message.algorithm,
      notes: message.notes,
    }
    let worker: Worker

    try {
      worker = this.#getWorker()
    } catch (reason) {
      return Promise.reject(
        analysisError(reason, "Text analysis could not start"),
      )
    }

    return new Promise<AnalysisResponseMessage>((resolve, reject) => {
      this.#pending.set(requestId, {
        input: requestInput,
        reject,
        resolve,
      })

      try {
        worker.postMessage(message)
      } catch (reason) {
        this.#pending.delete(requestId)
        reject(analysisError(reason, "Text analysis could not start"))
      }
    })
  }

  dispose() {
    this.#worker?.terminate()
    this.#worker = null
    this.#rejectPending(new Error("Text analysis was stopped"))
  }

  #getWorker() {
    if (this.#worker !== null) {
      return this.#worker
    }

    const worker = new Worker(new URL("./analysis.worker.ts", import.meta.url), {
      name: "notes-analysis",
      type: "module",
    })
    worker.addEventListener("message", this.#handleMessage)
    worker.addEventListener("error", this.#handleError)
    this.#worker = worker

    return worker
  }

  #handleMessage = (event: MessageEvent<unknown>) => {
    const parsed = AnalysisResponseMessageSchema.safeParse(event.data)

    if (!parsed.success) {
      this.#failWorker(new Error("Text analysis returned invalid data"))
      return
    }

    const pending = this.#pending.get(parsed.data.requestId)

    if (pending === undefined) {
      return
    }

    if (!analysisResponseMatchesInput(parsed.data, pending.input)) {
      this.#failWorker(
        new Error("Text analysis returned data for another request"),
      )
      return
    }

    this.#pending.delete(parsed.data.requestId)
    pending.resolve(parsed.data)
  }

  #handleError = () => {
    this.#failWorker(new Error("Text analysis failed"))
  }

  #failWorker(error: Error) {
    this.#worker?.terminate()
    this.#worker = null
    this.#rejectPending(error)
  }

  #rejectPending(error: Error) {
    for (const pending of this.#pending.values()) {
      pending.reject(error)
    }

    this.#pending.clear()
  }
}
