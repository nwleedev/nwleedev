"use client"

import Link from "next/link"
import type { RefObject, SyntheticEvent } from "react"

import type { Note } from "@/entities/note"
import { Button } from "@/shared/ui/button"
import { ArrowBackIcon } from "@/shared/ui/icons"
import { StatusNotice } from "@/shared/ui/status-notice"

import type { SaveNoteContentResult } from "../model/save-note-content"
import {
  useNoteDetailEditing,
  type NoteDetailFailure,
} from "../model/use-note-detail-editing"
import { useNotesData } from "../model/notes-data-provider"
import { noteContentFailureMessage } from "./note-content-failure-message"

const backLinkClassName =
  "inline-flex h-[var(--notes-control-size)] w-[var(--notes-control-size)] items-center justify-center rounded-control border border-line bg-surface-raised text-icon hover:border-line-strong hover:bg-canvas hover:text-text"

type ReadyNoteDetailProps = {
  initialContent: string
  note: Note
  saveContent(
    noteId: string,
    content: string,
  ): Promise<SaveNoteContentResult>
  saveDraft(noteId: string, content: string): Promise<void>
}

type UnsavedChangesDialogProps = {
  continueButton: RefObject<HTMLButtonElement | null>
  dialog: RefObject<HTMLDialogElement | null>
  discarding: boolean
  failure: NoteDetailFailure | null
  titleId: string
  onCancel(event: SyntheticEvent<HTMLDialogElement>): void
  onContinue(): void
  onDiscard(): void
}

function failureMessage(failure: NoteDetailFailure) {
  if (failure.kind === "save") {
    return noteContentFailureMessage(failure.reason)
  }

  if (failure.kind === "draft") {
    return "편집 중인 내용을 보관하지 못했습니다."
  }

  return "변경사항을 버리지 못했습니다."
}

function UnsavedChangesDialog({
  continueButton,
  dialog,
  discarding,
  failure,
  onCancel,
  onContinue,
  onDiscard,
  titleId,
}: UnsavedChangesDialogProps) {
  return (
    <dialog
      aria-labelledby={titleId}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] max-w-none rounded-panel border border-line bg-surface-raised p-5 text-ink shadow-floating backdrop:bg-ink/25"
      onCancel={onCancel}
      ref={dialog}
    >
      <div className="grid gap-5">
        <div className="grid gap-2">
          <h2 className="text-base font-semibold" id={titleId}>
            저장하지 않은 변경사항
          </h2>
          <p className="text-sm leading-6 text-soft-ink">
            목록으로 돌아가기 전에 변경사항을 버릴지 선택하세요.
          </p>
        </div>
        {failure?.kind === "discard" ? (
          <StatusNotice kind="error">
            <p>{failureMessage(failure)}</p>
          </StatusNotice>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button disabled={discarding} onClick={onDiscard} tone="quiet">
            {discarding ? "버리는 중" : "변경사항 버리기"}
          </Button>
          <Button
            autoFocus
            disabled={discarding}
            onClick={onContinue}
            ref={continueButton}
          >
            계속 편집
          </Button>
        </div>
      </div>
    </dialog>
  )
}

function ReadyNoteDetail({
  initialContent,
  note,
  saveContent,
  saveDraft,
}: ReadyNoteDetailProps) {
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
    discarding,
    failure,
    navigationConfirmationVisible,
    onBlur,
    requestBackNavigation,
    retryFailure,
    saveLabel,
    savePending,
    submitSave,
  } = useNoteDetailEditing({
    initialContent,
    note,
    saveContent,
    saveDraft,
  })

  return (
    <main
      className="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-canvas"
      id="main-content"
    >
      <header className="flex min-w-0 items-center gap-3 border-b border-line bg-surface-raised px-3 py-2">
        <Link
          aria-label="메모 목록"
          className={backLinkClassName}
          href="/"
          onClick={requestBackNavigation}
        >
          <ArrowBackIcon />
        </Link>
        <h1 className="truncate text-base font-semibold">메모 편집</h1>
      </header>
      <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3 p-4">
        <textarea
          aria-label="메모 내용"
          className="h-full min-h-56 w-full resize-none rounded-note border border-border bg-surface-raised px-4 py-3 text-base leading-7 outline-none"
          name={contentName}
          onBlur={onBlur}
          onChange={changeContent}
          ref={connectEditor}
        />
        {failure !== null && failure.kind !== "discard" ? (
          <StatusNotice kind="error">
            <p>{failureMessage(failure)}</p>
            <Button onClick={retryFailure} tone="quiet">
              다시 시도
            </Button>
          </StatusNotice>
        ) : null}
      </div>
      <footer className="flex justify-end border-t border-line bg-surface-raised px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button disabled={savePending} onClick={submitSave}>
          {saveLabel}
        </Button>
      </footer>
      {navigationConfirmationVisible ? (
        <UnsavedChangesDialog
          continueButton={continueButton}
          dialog={dialog}
          discarding={discarding}
          failure={failure}
          onCancel={cancelDialog}
          onContinue={continueEditing}
          onDiscard={discardChanges}
          titleId={dialogTitleId}
        />
      ) : null}
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
          <Link aria-label="메모 목록" className={backLinkClassName} href="/">
            <ArrowBackIcon />
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
