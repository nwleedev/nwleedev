"use client"

import Link from "next/link"
import { useLayoutEffect, useRef } from "react"

import type { Note } from "@/entities/note"
import { ActionSheet } from "@/shared/ui/action-sheet"
import { Button } from "@/shared/ui/button"
import { CopyIcon, DuplicateIcon, EditIcon, RemoveIcon } from "@/shared/ui/icons"

import type { useMobileNoteActionSheet } from "../model/use-mobile-note-action-sheet"

type MobileNoteActionSheetProps = {
  sheet: ReturnType<typeof useMobileNoteActionSheet>["view"]
  onCopy(note: Note): Promise<void>
  onAdd(note: Note): Promise<void>
}

const actionClassName = "flex min-h-[var(--notes-mobile-menu-row-height)] w-full items-center gap-5 rounded-control px-3 text-left text-base font-medium text-ink hover:bg-canvas focus-visible:bg-canvas"

export function MobileNoteActionSheet({ sheet, onCopy, onAdd }: MobileNoteActionSheetProps) {
  const body = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => { body.current?.scrollTo({ top: 0 }) }, [sheet.phase])
  const note = sheet.note
  const deleted = sheet.phase === "deleted" || sheet.phase === "restoring"
  const confirmation = sheet.phase === "confirm" || sheet.phase === "deleting"
  let title = "메모"
  if (confirmation) title = "메모 삭제"
  if (deleted) title = "메모 삭제 완료"

  function copy() {
    if (note === undefined) return
    void onCopy(note)
    sheet.close()
  }

  function add() {
    if (note === undefined) return
    void onAdd(note)
    sheet.close()
  }

  return (
    <ActionSheet
      dismissible={!sheet.pending}
      fixedHeight
      label={title}
      onClose={sheet.close}
      open={sheet.phase !== "closed" && note !== undefined}
    >
      <div className="notes-mobile-sheet-content grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4 pt-4">
        <div className="min-h-0 overflow-auto" ref={body}>
          {sheet.phase === "menu" && note !== undefined ? (
            <div className="grid gap-2">
              <button className={actionClassName} onClick={copy} type="button"><CopyIcon className="size-6" />복사</button>
              <button className={actionClassName} onClick={add} type="button"><DuplicateIcon className="size-6" />일괄 복사에 추가</button>
              <Link className={actionClassName} href={`/notes/${encodeURIComponent(note.id)}/`} onClick={sheet.close}><EditIcon className="size-6" />수정</Link>
              <div className="my-2 border-t border-border" />
              <button className="flex min-h-[var(--notes-mobile-menu-row-height)] w-full items-center gap-5 rounded-control px-3 text-left text-base font-medium text-danger hover:bg-danger/10" onClick={sheet.confirmRemoval} type="button"><RemoveIcon className="size-6" />삭제</button>
            </div>
          ) : null}
          {confirmation ? (
            <div className="notes-mobile-sheet-preview grid gap-6 px-2 py-5">
              <h3 className="text-xl font-semibold">메모를 삭제할까요?</h3>
              <p className="whitespace-pre-wrap break-words text-base leading-7 text-soft-ink">{note?.content || "빈 메모"}</p>
            </div>
          ) : null}
          {deleted ? <p className="grid min-h-full place-items-center py-4 text-base" role="status">메모를 삭제했습니다.</p> : null}
          {sheet.failure ? <p className="px-2 py-3 text-sm text-danger" role="alert">{sheet.failure}</p> : null}
        </div>
        {confirmation ? (
          <div className="grid grid-cols-2 gap-3">
            <Button size="large" disabled={sheet.pending} onClick={sheet.cancelRemoval} tone="quiet">취소</Button>
            <Button size="large" disabled={sheet.pending} onClick={sheet.remove} tone="danger">{sheet.pending ? "삭제 중" : "삭제"}</Button>
          </div>
        ) : null}
        {deleted ? (
          <div className="grid grid-cols-2 gap-3">
            <Button size="large" disabled={sheet.pending} onClick={sheet.restore} tone="quiet">{sheet.pending ? "복원 중" : "실행 취소"}</Button>
            <Button size="large" disabled={sheet.pending} onClick={sheet.close} tone="solid">닫기</Button>
          </div>
        ) : null}
      </div>
    </ActionSheet>
  )
}
