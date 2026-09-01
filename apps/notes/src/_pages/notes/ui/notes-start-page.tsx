"use client"

import { Button } from "@/shared/ui/button"
import { StatusNotice } from "@/shared/ui/status-notice"

import { useNotesData } from "../model/notes-data-provider"
import { AccumulatorWorkspace } from "./accumulator-workspace"
import { NotesCollection } from "./notes-collection"

export function NotesStartPage() {
  const notesData = useNotesData()
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

  if (notesData.status === "ready" || notesData.status === "empty") {
    const notes = notesData.status === "ready" ? notesData.notes : []
    const noteCountText = notes.length.toLocaleString("ko-KR")

    return (
      <AccumulatorWorkspace>
        <p aria-live="polite" className="sr-only" role="status">
          메모 {noteCountText}개
        </p>
        <NotesCollection
          copyNote={notesData.copyNote}
          createNote={notesData.createNote}
          metaClickEnabled={notesData.metaClickEnabled}
          notes={notes}
          updateNote={notesData.updateNote}
        />
      </AccumulatorWorkspace>
    )
  }

  return (
    <AccumulatorWorkspace>
      <div className="notes-workspace-canvas grid h-full min-h-0 place-items-center p-6">
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
      </div>
    </AccumulatorWorkspace>
  )
}
