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
      className="min-h-screen px-4 py-5 sm:px-6 sm:py-7 xl:px-8"
      id="main-content"
    >
      <PageHeading density="compact" title="텍스트 분석">
        <Button disabled={analysis.status === "running"} onClick={runAnalysis}>
          분석 실행
        </Button>
      </PageHeading>
      <section className="mt-5 min-h-[32rem] rounded-panel border border-line bg-surface-raised p-5 shadow-note sm:p-6">
        {statusText ? (
          <StatusNotice
            kind={analysis.status === "failure" ? "error" : "status"}
          >
            <p>{statusText}</p>
          </StatusNotice>
        ) : (
          <p className="text-sm text-soft-ink">아직 분석하지 않았습니다.</p>
        )}
      </section>
    </main>
  )
}
