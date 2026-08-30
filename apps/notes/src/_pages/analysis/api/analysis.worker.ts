type AnalysisRequest = {
  lines: string[]
  requestId: string
  type: "analyze"
}

type AnalysisResponse = {
  lineCount: number
  requestId: string
  type: "analysis-result"
}

type WorkerScope = {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void
  postMessage(message: AnalysisResponse): void
}

function isAnalysisRequest(value: unknown): value is AnalysisRequest {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    candidate.type === "analyze" &&
    typeof candidate.requestId === "string" &&
    Array.isArray(candidate.lines) &&
    candidate.lines.every((line) => typeof line === "string")
  )
}

const workerScope = globalThis as unknown as WorkerScope

workerScope.addEventListener("message", (event) => {
  if (!isAnalysisRequest(event.data)) {
    return
  }

  workerScope.postMessage({
    lineCount: event.data.lines.length,
    requestId: event.data.requestId,
    type: "analysis-result",
  })
})
