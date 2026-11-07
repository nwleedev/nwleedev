"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type RefObject } from "react"

import type { Note } from "@/entities/note"
import { IconButton } from "@/shared/ui/icon-button"
import { ChevronLeftIcon, UndoIcon, RedoIcon } from "@/shared/ui/icons"
import { StatusNotice } from "@/shared/ui/status-notice"

import {
  useNoteDetailEditing,
} from "../model/use-note-detail-editing"
import { useNoteCommands, useNotesData } from "../model/notes-data-context"

import { DeletedNoteDetail } from "./deleted-note-detail"
import { NoteDetailLayout, backLinkClassName, editorClassName } from "./note-detail-layout"
import { UnsavedChangesDialog } from "./unsaved-changes-dialog"
import { NoteStatusLight } from "./note-status-light"

type ReadyNoteDetailProps = {
  editorRef: RefObject<HTMLTextAreaElement | null>
  note: Note
}

function ReadyNoteDetail({
  editorRef,
  note,
}: ReadyNoteDetailProps) {
  const { saveContent } = useNoteCommands()
  const {
    cancelDialog,
    changeContent,
    connectEditor,
    contentName,
    continueButton,
    continueEditing,
    dialog,
    dialogTitleId,
    discardChanges,
    navigationConfirmationVisible,
    onBlur,
    requestBackNavigation,
    saveLabel,
    startComposition,
    endComposition,
    history,
  } = useNoteDetailEditing({
    editorRef,
    note,
    saveContent,
  })

  return (
    <NoteDetailLayout.Page>
      <NoteDetailLayout.Header>
        <NoteDetailLayout.Actions onBack={requestBackNavigation}>
            <IconButton
              aria-label="실행 취소"
              className="h-[var(--notes-touch-target)] w-[var(--notes-touch-target)]"
              disabled={!history.available.undo || history.available.composing}
              onClick={() => history.replay("undo")}
              onPointerDown={(event) => event.preventDefault()}
            >
              <UndoIcon />
            </IconButton>
            <IconButton
              aria-label="다시 실행"
              className="h-[var(--notes-touch-target)] w-[var(--notes-touch-target)]"
              disabled={!history.available.redo || history.available.composing}
              onClick={() => history.replay("redo")}
              onPointerDown={(event) => event.preventDefault()}
            >
              <RedoIcon />
            </IconButton>
        </NoteDetailLayout.Actions>
        <NoteDetailLayout.Status>
          <NoteStatusLight status={saveLabel} />
          {saveLabel}
        </NoteDetailLayout.Status>
      </NoteDetailLayout.Header>
      <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
        <textarea
          aria-label="메모 내용"
          className={editorClassName}
          defaultValue={note.content}
          name={contentName}
          onBlur={onBlur}
          onChange={changeContent}
          onCompositionStart={startComposition}
          onCompositionEnd={endComposition}
          onKeyDown={history.keyDown}
          onSelect={history.select}
          ref={connectEditor}
        />
      </div>
      {navigationConfirmationVisible ? (
        <UnsavedChangesDialog
          continueButton={continueButton}
          dialog={dialog}
          onCancel={cancelDialog}
          onContinue={continueEditing}
          onDiscard={discardChanges}
          titleId={dialogTitleId}
        />
      ) : null}
    </NoteDetailLayout.Page>
  )
}

type NoteDetailPageProps = {
  noteId: string
}

export function NoteDetailPage({ noteId }: NoteDetailPageProps) {
  const notesData = useNotesData()
  const editor = useRef<HTMLTextAreaElement>(null)
  const [removed, setRemoved] = useState<{ note: Note; visible: string } | null>(null)
  const { watchEditor } = notesData
  useEffect(() => watchEditor(noteId, (note) => {
    setRemoved({ note, visible: editor.current?.value ?? note.content })
  }), [noteId, watchEditor])

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

  if (!note && removed?.note.id === noteId) {
    return <DeletedNoteDetail content={removed.visible} restore={() => notesData.restoreNote(removed.note)} />
  }
  if (note === undefined) {
    return (
      <main className="grid h-full place-items-center bg-canvas p-6" id="main-content">
        <div className="grid justify-items-center gap-4 text-center">
          <p>메모를 찾을 수 없습니다.</p>
          <Link aria-label="메모 목록" className={backLinkClassName} href="/">
            <ChevronLeftIcon />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <ReadyNoteDetail
      editorRef={editor}
      key={note.id}
      note={note}
    />
  )
}
