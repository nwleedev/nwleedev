"use client"

import Link from "next/link"
import { useState } from "react"

import { useTextAnalyzer } from "../model/TextAnalysisProvider"

type AnalysisStatus = "idle" | "running" | "success" | "failure"

const algorithm = { type: "surface-v1", version: "1" } as const

export function AnalysisStartPage() {
  const textAnalyzer = useTextAnalyzer()
  const [status, setStatus] = useState<AnalysisStatus>("idle")

  async function runAnalysis() {
    setStatus("running")

    try {
      await textAnalyzer.analyze({ algorithm, notes: [] })
      setStatus("success")
    } catch {
      setStatus("failure")
    }
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
