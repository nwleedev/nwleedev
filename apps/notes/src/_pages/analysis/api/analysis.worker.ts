import {
  AnalysisRequestMessageSchema,
  type AnalysisResponseMessage,
} from "../model/analysisMessage"

type WorkerScope = {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void
  postMessage(message: AnalysisResponseMessage): void
}

const workerScope = globalThis as unknown as WorkerScope

workerScope.addEventListener("message", (event) => {
  const request = AnalysisRequestMessageSchema.safeParse(event.data)

  if (!request.success) {
    return
  }

  workerScope.postMessage({
    algorithm: request.data.algorithm,
    inputNotes: request.data.notes.map(({ note }) => note),
    requestId: request.data.requestId,
    results: [],
    type: "analysis-result",
  })
})
