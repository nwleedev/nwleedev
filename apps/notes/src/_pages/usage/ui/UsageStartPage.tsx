"use client"

import { useEffect, useRef, useState } from "react"

import { Button } from "@/shared/ui/button"
import { PageHeading } from "@/shared/ui/page-heading"
import { StatusNotice } from "@/shared/ui/status-notice"

import {
  readUsage,
  type UsageReadState,
} from "../model/readUsage"
import { useUsageReader } from "../model/UsageReaderProvider"
import { UsageTable } from "./UsageTable"

type UsageContentProps = {
  state: UsageReadState
  onRetry(): void
}

function UsageContent({ onRetry, state }: UsageContentProps) {
  if (state.status === "loading") {
    return (
      <StatusNotice>
        <p>사용 빈도 불러오는 중</p>
      </StatusNotice>
    )
  }

  if (state.status === "failure") {
    return (
      <StatusNotice kind="error">
        <p>사용 빈도를 불러오지 못했습니다.</p>
        <Button onClick={onRetry} tone="quiet">
          다시 시도
        </Button>
      </StatusNotice>
    )
  }

  if (state.rows.length === 0) {
    return (
      <p
        className="rounded-panel border border-line bg-surface-raised px-5 py-12 text-center text-sm text-soft-ink shadow-note"
        role="status"
      >
        복사 기록이 없습니다.
      </p>
    )
  }

  return <UsageTable rows={state.rows} />
}

export function UsageStartPage() {
  const reader = useUsageReader()
  const readSequence = useRef(0)
  const [state, setState] = useState<UsageReadState>({ status: "loading" })

  useEffect(() => {
    const sequence = readSequence.current + 1
    readSequence.current = sequence
    void readUsage(reader).then((nextState) => {
      if (readSequence.current === sequence) {
        setState(nextState)
      }
    })

    return () => {
      if (readSequence.current === sequence) {
        readSequence.current += 1
      }
    }
  }, [reader])

  function retry() {
    const sequence = readSequence.current + 1
    readSequence.current = sequence
    setState({ status: "loading" })
    void readUsage(reader).then((nextState) => {
      if (readSequence.current === sequence) {
        setState(nextState)
      }
    })
  }

  return (
    <main
      className="min-h-screen px-4 py-5 sm:px-6 sm:py-7 xl:px-8"
      id="main-content"
    >
      <PageHeading density="compact" title="사용 빈도" />
      <section aria-label="사용 빈도 기록" className="mt-5">
        <UsageContent onRetry={retry} state={state} />
      </section>
    </main>
  )
}
