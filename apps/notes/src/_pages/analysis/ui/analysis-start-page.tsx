"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"

import {
  useSelectedSourceLines,
  type SelectedSourceLines,
} from "@/features/suggest-template"
import { Button } from "@/shared/ui/button"
import { PageHeading } from "@/shared/ui/page-heading"
import { StatusNotice } from "@/shared/ui/status-notice"

import {
  useTextAnalysis,
  useValidateTextAnalysis,
} from "../model/text-analysis-provider"
import { AnalysisResults } from "./analysis-results"

export function AnalysisStartPage() {
  const analysis = useTextAnalysis()
  useValidateTextAnalysis()
  const router = useRouter()
  const sourceLines = useSelectedSourceLines()
  const completed = analysis.status === "success"
    ? analysis.completed
    : undefined
  let content: ReactNode = null

  if (analysis.status === "idle") {
    content = <p className="text-sm text-soft-ink">아직 분석하지 않았습니다.</p>
  }

  if (analysis.status === "running") {
    content = (
      <StatusNotice>
        <p>분석 중</p>
      </StatusNotice>
    )
  }

  if (analysis.status === "failure") {
    content = (
      <StatusNotice kind="error">
        <p>분석을 완료하지 못했습니다. 다시 시도하세요.</p>
      </StatusNotice>
    )
  }

  if (analysis.status === "stale") {
    content = (
      <StatusNotice kind="error">
        <p>메모가 바뀌어 이전 분석을 표시하지 않습니다. 다시 분석하세요.</p>
      </StatusNotice>
    )
  }

  function runAnalysis() {
    void analysis.run()
  }

  function suggestTemplate(selection: SelectedSourceLines) {
    sourceLines.select(selection)
    router.push("/templates/")
  }

  return (
    <main
      className="px-4 py-5 sm:px-6 sm:py-7 xl:px-8"
      id="main-content"
    >
      <PageHeading density="compact" title="텍스트 분석">
        <Button disabled={analysis.status === "running"} onClick={runAnalysis}>
          분석 실행
        </Button>
      </PageHeading>
      <section aria-label="텍스트 분석 상태와 결과" className="mt-5">
        {completed === undefined ? null : (
          <AnalysisResults
            completed={completed}
            onSuggest={suggestTemplate}
          />
        )}
        {completed === undefined ? content : null}
      </section>
    </main>
  )
}
