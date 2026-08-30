"use client"

import { Button } from "@/shared/ui/button"
import { PageHeading } from "@/shared/ui/page-heading"
import { StatusNotice } from "@/shared/ui/status-notice"

import { useTextAnalysis } from "../model/TextAnalysisProvider"

const algorithm = { type: "surface-v1", version: "1" } as const

export function AnalysisStartPage() {
  const analysis = useTextAnalysis()

  function runAnalysis() {
    void analysis.run({ algorithm, notes: [] })
  }

  const statusText = {
    failure: "분석을 완료하지 못했습니다. 다시 시도하세요.",
    idle: null,
    running: "분석 중",
    success: "분석할 텍스트가 없습니다.",
  }[analysis.status]

  return (
    <main
      className="min-h-screen px-4 py-7 sm:px-7 sm:py-10 xl:px-10"
      id="main-content"
    >
      <PageHeading
        action={
          <Button
            disabled={analysis.status === "running"}
            onClick={runAnalysis}
          >
            분석 실행
          </Button>
        }
        title="텍스트 분석"
      />
      <section className="mt-6 min-h-[32rem] border border-line bg-surface p-5 sm:p-7">
        {statusText ? (
          <StatusNotice
            kind={analysis.status === "failure" ? "error" : "status"}
          >
            {statusText}
          </StatusNotice>
        ) : (
          <p className="text-sm text-soft-ink">아직 분석하지 않았습니다.</p>
        )}
      </section>
    </main>
  )
}
