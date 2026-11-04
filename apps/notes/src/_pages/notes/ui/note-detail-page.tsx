"use client"

import Link from "next/link"
import type { RefObject, SyntheticEvent } from "react"

import type { Note } from "@/entities/note"
import { Button } from "@/shared/ui/button"
import { IconButton } from "@/shared/ui/icon-button"
import { ChevronLeftIcon, UndoIcon, RedoIcon } from "@/shared/ui/icons"
import { StatusNotice } from "@/shared/ui/status-notice"

import type { SaveNoteContentResult } from "../model/save-note-content"
import {
  useNoteDetailEditing,
  type NoteDetailFailure,
} from "../model/use-note-detail-editing"
import { useNotesData } from "../model/notes-data-provider"
import { noteContentFailureMessage } from "./note-content-failure-message"

const backLinkClassName =
  "inline-flex h-[var(--notes-touch-target)] w-[var(--notes-touch-target)] items-center justify-center rounded-control text-icon hover:bg-canvas hover:text-text active:translate-y-px"

type ReadyNoteDetailProps = {
  initialContent: string
  note: Note
  saveContent(
    noteId: string,
    content: string,
  ): Promise<SaveNoteContentResult>
  saveDraft(noteId: string, content: string): Promise<void>
  discardDraft(noteId: string): Promise<void>
}

type UnsavedChangesDialogProps = {
  continueButton: RefObject<HTMLButtonElement | null>
  dialog: RefObject<HTMLDialogElement | null>
  titleId: string
  onCancel(event: SyntheticEvent<HTMLDialogElement>): void
  onContinue(): void
  onDiscard(): void
}

function failureMessage(failure: NoteDetailFailure) {
  if (failure.kind === "save") {
    return noteContentFailureMessage(failure.reason)
  }

  return "편집 중인 내용을 보관하지 못했습니다."
}

function UnsavedChangesDialog({
  continueButton,
  dialog,
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
            저장하지 않은 내용이 있어요
          </h2>
          <p className="text-sm leading-6 text-soft-ink">
            저장되지 않은 내용이 있습니다. 나갈까요?
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onDiscard} tone="quiet">
            나가기
          </Button>
          <Button
            autoFocus
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
  discardDraft,
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
    failure,
    navigationConfirmationVisible,
    onBlur,
    requestBackNavigation,
    retryFailure,
    saveLabel,
    startComposition,
    endComposition,
    history,
  } = useNoteDetailEditing({
    initialContent,
    note,
    saveContent,
    saveDraft,
    discardDraft,
  })

  return (
    <main
      className="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] bg-surface-raised"
      id="main-content"
    >
      <header className="grid min-w-0 gap-2 border-b border-line bg-surface-raised px-3 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            aria-label="메모 목록"
            className={backLinkClassName}
            href="/"
            onClick={requestBackNavigation}
          >
            <ChevronLeftIcon />
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">메모 수정</h1>
          <div className="flex shrink-0 gap-1">
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
          </div>
        </div>
        <p
          aria-live="polite"
          className="px-1 pb-1 text-sm text-soft-ink"
          role="status"
        >
          {saveLabel}
        </p>
      </header>
      <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
        <textarea
          aria-label="메모 내용"
          className="h-full min-h-0 w-full resize-none border-0 bg-surface-raised px-4 py-5 text-base leading-7 outline-none"
          defaultValue={initialContent}
          name={contentName}
          onBlur={onBlur}
          onChange={changeContent}
          onCompositionStart={startComposition}
          onCompositionEnd={endComposition}
          onKeyDown={history.keyDown}
          onSelect={history.select}
          ref={connectEditor}
        />
        {failure !== null ? (
          <StatusNotice kind="error">
            <p>{failureMessage(failure)}</p>
            <Button onClick={retryFailure} tone="quiet">
              다시 시도
            </Button>
          </StatusNotice>
        ) : null}
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
            <ChevronLeftIcon />
          </Link>
        </div>
      </main>
    )
  }

  const initialContent = notesData.draftContentById[note.id] ?? note.content

  return (
    <ReadyNoteDetail
      initialContent={initialContent}
      key={note.id}
      note={note}
      saveContent={notesData.saveContent}
      saveDraft={notesData.saveDraft}
      discardDraft={notesData.discardDraft}
    />
  )
}
