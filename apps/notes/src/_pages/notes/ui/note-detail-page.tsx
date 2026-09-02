"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import type { Note } from "@/entities/note"
import { ActionToast } from "@/shared/ui/action-toast"
import { Button } from "@/shared/ui/button"
import { StatusNotice } from "@/shared/ui/status-notice"

import type { SaveNoteContentResult } from "../model/save-note-content"
import { useNotesData } from "../model/notes-data-provider"

const DRAFT_SAVE_DELAY_MS = 800
const backLinkClassName =
  "inline-flex min-h-[var(--notes-control-size)] items-center rounded-control border border-line bg-surface-raised px-3 py-1.5 text-sm font-semibold hover:border-line-strong hover:bg-canvas"

type ReadyNoteDetailProps = {
  initialContent: string
  note: Note
  saveContent(
    noteId: string,
    content: string,
  ): Promise<SaveNoteContentResult>
  saveDraft(noteId: string, content: string): Promise<void>
}

function ReadyNoteDetail({
  initialContent,
  note,
  saveContent,
  saveDraft,
}: ReadyNoteDetailProps) {
  const [content, setContent] = useState(initialContent)
  const [notice, setNotice] = useState<{
    kind: "error" | "status"
    message: string
  } | null>(null)
  const [pending, setPending] = useState(false)
  const contentReference = useRef(content)
  const noteReference = useRef(note)
  const saveDraftReference = useRef(saveDraft)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    noteReference.current = note
  }, [note])

  useEffect(() => {
    saveDraftReference.current = saveDraft
  }, [saveDraft])

  useEffect(() => {
    function storeDraft() {
      void saveDraftReference
        .current(noteReference.current.id, contentReference.current)
        .catch(() => undefined)
    }

    function storeDraftWhenHidden() {
      if (document.visibilityState === "hidden") {
        storeDraft()
      }
    }

    window.addEventListener("pagehide", storeDraft)
    document.addEventListener("visibilitychange", storeDraftWhenHidden)

    return () => {
      window.removeEventListener("pagehide", storeDraft)
      document.removeEventListener("visibilitychange", storeDraftWhenHidden)

      if (timer.current !== null) {
        clearTimeout(timer.current)
      }

      storeDraft()
    }
  }, [])

  function scheduleDraft(nextContent: string) {
    contentReference.current = nextContent
    setContent(nextContent)

    if (timer.current !== null) {
      clearTimeout(timer.current)
    }

    timer.current = setTimeout(() => {
      timer.current = null
      void saveDraft(note.id, contentReference.current).catch(() => {
        setNotice({
          kind: "error",
          message: "편집 중인 내용을 보관하지 못했습니다.",
        })
      })
    }, DRAFT_SAVE_DELAY_MS)
  }

  function storeDraftOnBlur() {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }

    void saveDraft(note.id, contentReference.current).catch(() => {
      setNotice({
        kind: "error",
        message: "편집 중인 내용을 보관하지 못했습니다.",
      })
    })
  }

  async function save() {
    if (pending) {
      return
    }

    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }

    setPending(true)
    const result = await saveContent(note.id, contentReference.current)

    if (result.status === "failure") {
      setNotice({
        kind: "error",
        message: "메모를 저장하지 못했습니다. 다시 시도하세요.",
      })
    } else {
      noteReference.current = result.note
      setNotice({ kind: "status", message: "저장했습니다." })
    }

    setPending(false)
  }

  return (
    <main
      className="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-canvas"
      id="main-content"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line bg-surface-raised px-4 py-3">
        <Link className={backLinkClassName} href="/">
          메모 목록
        </Link>
        <h1 className="text-base font-semibold">메모 편집</h1>
      </header>
      {notice ? (
        <div className="absolute right-3 top-16 z-20 w-[min(24rem,calc(100%-1.5rem))]">
          <ActionToast
            kind={notice.kind}
            message={notice.message}
            onDismiss={() => setNotice(null)}
          />
        </div>
      ) : null}
      <div className="min-h-0 p-4">
        <textarea
          aria-label="메모 내용"
          className="h-full min-h-56 w-full resize-none rounded-note border border-note-line bg-note px-4 py-3 text-base leading-7 shadow-note outline-none"
          onBlur={storeDraftOnBlur}
          onChange={(event) => scheduleDraft(event.target.value)}
          value={content}
        />
      </div>
      <footer className="flex justify-end border-t border-line bg-surface-raised px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button disabled={pending} onClick={save}>
          {pending ? "저장하는 중" : "저장"}
        </Button>
      </footer>
    </main>
  )
}

type NoteDetailPageProps = {
  noteId: string
}

export function NoteDetailPage({ noteId }: NoteDetailPageProps) {
  const notesData = useNotesData()

  if (notesData.status === "loading") {
    return (
      <main className="grid h-full place-items-center bg-canvas p-6" id="main-content">
        <StatusNotice>
          <p>메모 불러오는 중</p>
        </StatusNotice>
      </main>
    )
  }

  if (notesData.status !== "empty" && notesData.status !== "ready") {
    return (
      <main className="grid h-full place-items-center bg-canvas p-6" id="main-content">
        <StatusNotice kind="error">
          <p>메모를 불러오지 못했습니다.</p>
        </StatusNotice>
      </main>
    )
  }

  const note = notesData.notes.find(({ id }) => id === noteId)

  if (note === undefined) {
    return (
      <main className="grid h-full place-items-center bg-canvas p-6" id="main-content">
        <div className="grid justify-items-center gap-4 text-center">
          <p>메모를 찾을 수 없습니다.</p>
          <Link className={backLinkClassName} href="/">
            메모 목록
          </Link>
        </div>
      </main>
    )
  }

  const initialContent = notesData.draftContentByNote[note.id] ?? note.content

  return (
    <ReadyNoteDetail
      initialContent={initialContent}
      key={note.id}
      note={note}
      saveContent={notesData.saveContent}
      saveDraft={notesData.saveDraft}
    />
  )
}
