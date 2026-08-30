"use client"

import Link from "next/link"

import { useNotesData } from "../model/NotesDataProvider"

export function NotesStartPage() {
  const notesData = useNotesData()

  const content = {
    blocked: "다른 탭을 닫고 다시 시도하세요.",
    empty: "메모가 없습니다.",
    failure: "메모를 불러오지 못했습니다. 기존 메모는 변경하지 않았습니다.",
    loading: "메모 불러오는 중",
    ready:
      notesData.status === "ready"
        ? `메모 ${notesData.notes.length.toLocaleString("ko-KR")}개`
        : null,
    "version-changed": "다른 탭에서 변경되었습니다. 다시 불러오세요.",
  }[notesData.status]
  const canRetry =
    notesData.status === "blocked" ||
    notesData.status === "failure" ||
    notesData.status === "version-changed"

  return (
    <main className="min-h-screen bg-canvas px-5 py-10 text-ink sm:px-10 sm:py-16">
      <section className="mx-auto max-w-3xl rounded-paper border border-line bg-paper p-7 shadow-paper sm:p-11">
        <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
          메모
        </h1>
        <p
          aria-live={notesData.status === "failure" ? "assertive" : "polite"}
          className="mt-5 text-base leading-7 text-soft-ink sm:text-lg"
          role={notesData.status === "failure" ? "alert" : "status"}
        >
          {content}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {canRetry ? (
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-control bg-action px-5 py-2.5 font-semibold text-white transition-colors hover:bg-action-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--notes-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              onClick={notesData.retry}
              type="button"
            >
              다시 시도
            </button>
          ) : null}
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-control bg-action px-5 py-2.5 font-semibold text-white transition-colors hover:bg-action-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--notes-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            href="/analysis/"
          >
            텍스트 분석
          </Link>
        </div>
      </section>
    </main>
  )
}
