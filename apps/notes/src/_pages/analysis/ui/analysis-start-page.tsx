"use client"

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
  type CompletedTextAnalysis,
} from "../model/text-analysis-provider"
import { AnalysisResults } from "./analysis-results"

type AnalysisContentProps = {
  completed?: CompletedTextAnalysis
  status: "failure" | "idle" | "running" | "stale" | "success"
  onSuggest(selection: SelectedSourceLines): void
}

function AnalysisContent({
  completed,
  onSuggest,
  status,
}: AnalysisContentProps) {
  if (status === "idle") {
    return <p className="text-sm text-soft-ink">아직 분석하지 않았습니다.</p>
  }

  if (status === "running") {
    return (
      <StatusNotice>
        <p>분석 중</p>
      </StatusNotice>
    )
  }

  if (status === "failure") {
    return (
      <StatusNotice kind="error">
        <p>분석을 완료하지 못했습니다. 다시 시도하세요.</p>
      </StatusNotice>
    )
  }

  if (status === "stale") {
    return (
      <StatusNotice kind="error">
        <p>메모가 바뀌어 이전 분석을 표시하지 않습니다. 다시 분석하세요.</p>
      </StatusNotice>
    )
  }

  if (completed === undefined) {
    return null
  }

  return <AnalysisResults completed={completed} onSuggest={onSuggest} />
}

export function AnalysisStartPage() {
  const analysis = useTextAnalysis()
  useValidateTextAnalysis()
  const router = useRouter()
  const sourceLines = useSelectedSourceLines()
  const completed = analysis.status === "success"
    ? analysis.completed
    : undefined

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
        <AnalysisContent
          completed={completed}
          onSuggest={suggestTemplate}
          status={analysis.status}
        />
      </section>
    </main>
  )
}
