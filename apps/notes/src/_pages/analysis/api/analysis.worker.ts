import {
  AnalysisRequestMessageSchema,
  type AnalysisResponseMessage,
} from "../model/analysisMessage"
import { analyzeText } from "../model/analyzeText"

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

  const analysis = analyzeText(request.data)

  workerScope.postMessage({
    algorithm: request.data.algorithm,
    inputNotes: request.data.notes.map(({ note }) => note),
    requestId: request.data.requestId,
    results: analysis.results,
    sourceLines: analysis.sourceLines,
    type: "analysis-result",
  })
})
