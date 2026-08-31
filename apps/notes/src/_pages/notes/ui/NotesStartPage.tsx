"use client"

import { Button } from "@/shared/ui/button"
import { StatusNotice } from "@/shared/ui/status-notice"

import { useNotesData } from "../model/NotesDataProvider"
import { AccumulatorWorkspace } from "./AccumulatorWorkspace"
import { NotesCollection } from "./NotesCollection"

export function NotesStartPage() {
  const notesData = useNotesData()
  const noteCountText =
    "notes" in notesData
      ? notesData.notes.length.toLocaleString("ko-KR")
      : "0"

  const canRetry =
    notesData.status === "blocked" ||
    notesData.status === "failure" ||
    notesData.status === "version-changed"
  const notesStatusText = {
    blocked: "다른 탭을 닫고 다시 시도하세요.",
    empty: "",
    failure: "메모를 불러오지 못했습니다. 기존 메모는 변경하지 않았습니다.",
    loading: "메모 불러오는 중",
    ready: "",
    "version-changed": "다른 탭에서 변경되었습니다. 다시 불러오세요.",
  }[notesData.status]

  return (
    <AccumulatorWorkspace>
      {notesData.status === "ready" ? (
        <>
          <p
            aria-live="polite"
            className="sr-only"
            role="status"
          >
            메모 {noteCountText}개
          </p>
          <NotesCollection notes={notesData.notes} />
        </>
      ) : (
        <div className="notes-workspace-canvas grid h-full min-h-0 place-items-center p-6">
          {notesData.status === "empty" ? (
            <p
              aria-live="polite"
              className="rounded-control border border-line bg-surface-raised px-4 py-2 text-sm text-soft-ink shadow-note"
              role="status"
            >
              메모가 없습니다.
            </p>
          ) : (
            <StatusNotice
              kind={notesData.status === "failure" ? "error" : "status"}
            >
              <p>{notesStatusText}</p>
              {canRetry ? (
                <Button onClick={notesData.retry} tone="quiet">
                  다시 시도
                </Button>
              ) : null}
            </StatusNotice>
          )}
        </div>
      )}
    </AccumulatorWorkspace>
  )
}
