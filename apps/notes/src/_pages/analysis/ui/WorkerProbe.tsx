"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

type AnalysisStatus = "idle" | "running" | "success" | "failure"

type AnalysisResponse = {
  lineCount: number
  requestId: string
  type: "analysis-result"
}

function isAnalysisResponse(value: unknown): value is AnalysisResponse {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    candidate.type === "analysis-result" &&
    typeof candidate.requestId === "string" &&
    Number.isInteger(candidate.lineCount) &&
    Number(candidate.lineCount) >= 0
  )
}

export function WorkerProbe() {
  const workerRef = useRef<Worker | null>(null)
  const [status, setStatus] = useState<AnalysisStatus>("idle")

  useEffect(() => {
    return () => workerRef.current?.terminate()
  }, [])

  function runAnalysis() {
    setStatus("running")

    const worker =
      workerRef.current ??
      new Worker(new URL("../api/analysis.worker.ts", import.meta.url), {
        name: "notes-analysis",
        type: "module",
      })

    workerRef.current = worker

    const requestId = crypto.randomUUID()

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (
        !isAnalysisResponse(event.data) ||
        event.data.requestId !== requestId
      ) {
        return
      }

      worker.removeEventListener("message", handleMessage)
      worker.removeEventListener("error", handleError)
      setStatus("success")
    }

    const handleError = () => {
      worker.removeEventListener("message", handleMessage)
      worker.removeEventListener("error", handleError)
      setStatus("failure")
    }

    worker.addEventListener("message", handleMessage)
    worker.addEventListener("error", handleError)
    worker.postMessage({ lines: [], requestId, type: "analyze" })
  }

  const statusText = {
    failure: "분석을 완료하지 못했습니다. 다시 시도하세요.",
    idle: null,
    running: "분석 중",
    success: "분석할 텍스트가 없습니다.",
  }[status]

  return (
    <main className="min-h-screen bg-canvas px-5 py-10 text-ink sm:px-10 sm:py-16">
      <section className="mx-auto max-w-2xl rounded-paper border border-line bg-paper p-7 shadow-paper sm:p-11">
        <h1 className="text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
          텍스트 분석
        </h1>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <button
            className="min-h-11 rounded-control bg-action px-5 py-2.5 font-semibold text-white transition-colors hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
            disabled={status === "running"}
            onClick={runAnalysis}
            type="button"
          >
            분석 실행
          </button>
          <Link
            className="rounded-control px-2 py-2 font-semibold text-action underline decoration-2 underline-offset-4"
            href="/"
          >
            메모로 돌아가기
          </Link>
        </div>
        {statusText ? (
          <p
            aria-live={status === "failure" ? "assertive" : "polite"}
            className="mt-6 border-l-4 border-action pl-4 leading-6"
            role={status === "failure" ? "alert" : "status"}
          >
            {statusText}
          </p>
        ) : null}
      </section>
    </main>
  )
}
