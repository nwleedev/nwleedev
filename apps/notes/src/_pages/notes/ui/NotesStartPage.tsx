"use client"

import { Button } from "@/shared/ui/button"
import { StatusNotice } from "@/shared/ui/status-notice"

import { useNotesData } from "../model/NotesDataProvider"
import { AccumulatorWorkspace } from "./AccumulatorWorkspace"
import { NotesCollection } from "./NotesCollection"

export function NotesStartPage() {
  const notesData = useNotesData()

  const canRetry =
    notesData.status === "blocked" ||
    notesData.status === "failure" ||
    notesData.status === "version-changed"

  return (
    <AccumulatorWorkspace>
      {notesData.status === "ready" ? (
        <>
          <p
            aria-live="polite"
            className="mb-3 font-mono text-xs tracking-[0.08em] text-soft-ink"
            role="status"
          >
            메모 {notesData.notes.length.toLocaleString("ko-KR")}개
          </p>
          <NotesCollection notes={notesData.notes} />
        </>
      ) : (
        <div className="grid min-h-[32rem] place-items-center border border-line bg-surface p-6">
          {notesData.status === "empty" ? (
            <p aria-live="polite" className="text-sm text-soft-ink" role="status">
              메모가 없습니다.
            </p>
          ) : (
            <StatusNotice
              action={
                canRetry ? (
                  <Button onClick={notesData.retry} tone="quiet">
                    다시 시도
                  </Button>
                ) : undefined
              }
              kind={notesData.status === "failure" ? "error" : "status"}
            >
              {
                {
                  blocked: "다른 탭을 닫고 다시 시도하세요.",
                  failure:
                    "메모를 불러오지 못했습니다. 기존 메모는 변경하지 않았습니다.",
                  loading: "메모 불러오는 중",
                  "version-changed":
                    "다른 탭에서 변경되었습니다. 다시 불러오세요.",
                }[notesData.status]
              }
            </StatusNotice>
          )}
        </div>
      )}
    </AccumulatorWorkspace>
  )
}
