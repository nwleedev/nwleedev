"use client"

import Link from "next/link"

import type { Note } from "@/entities/note"
import { EditIcon } from "@/shared/ui/icons"

import { useMobileNoteLongPress } from "../model/use-mobile-note-long-press"

type MobileNoteCardProps = {
  batchCopyActive: boolean
  disabled: boolean
  note: Note
  onAddToBatchCopy(note: Note): Promise<void>
  onCopy(note: Note): Promise<void>
}

function noteSummary(content: string) {
  return content.split("\n").find((line) => line.trim().length > 0)?.trim() ?? "빈 메모"
}

export function MobileNoteCard({
  batchCopyActive,
  disabled,
  note,
  onAddToBatchCopy,
  onCopy,
}: MobileNoteCardProps) {
  const text = note.content.length === 0 ? "빈 메모" : note.content
  const summary = noteSummary(note.content)
  const href = `/notes/${encodeURIComponent(note.id)}/`
  const actionName = batchCopyActive
    ? `${summary} 일괄 복사에 추가`
    : `${summary} 복사`
  const longPress = useMobileNoteLongPress({
    disabled,
    longPressEnabled: !batchCopyActive,
    onLongPress: () => void onCopy(note),
    onShortPress: () => {
      if (batchCopyActive) {
        void onAddToBatchCopy(note)
        return
      }

      void onCopy(note)
    },
  })

  return (
    <article
      aria-label={`메모, ${summary}`}
      className="relative shrink-0 overflow-hidden rounded-note border border-border bg-surface-raised"
    >
      <button
        aria-label={actionName}
        className="block max-h-48 min-h-24 w-full touch-pan-y select-none overflow-hidden whitespace-pre-wrap break-words px-4 py-3 pr-14 text-left text-[0.98rem] leading-7 text-ink"
        disabled={disabled}
        type="button"
        {...longPress}
      >
        {text}
      </button>
      <Link
        aria-label={`${summary} 수정`}
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-control bg-surface-raised/90 text-icon hover:bg-canvas hover:text-text"
        href={href}
      >
        <EditIcon />
      </Link>
    </article>
  )
}
