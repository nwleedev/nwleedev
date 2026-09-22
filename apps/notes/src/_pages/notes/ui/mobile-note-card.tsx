"use client"

import Link from "next/link"

import type { Note } from "@/entities/note"
import { joinClassNames } from "@/shared/lib/join-class-names"
import { IconButton } from "@/shared/ui/icon-button"
import { CopyIcon } from "@/shared/ui/icons"

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
  const linkAccessibleName = batchCopyActive
    ? "일괄 복사에 추가"
    : "메모 열기"
  const linkClassName = joinClassNames(
    "block max-h-48 min-h-24 touch-pan-y select-none overflow-hidden whitespace-pre-wrap break-words px-4 py-3 pr-14 text-[0.98rem] leading-7 text-ink",
    disabled ? "pointer-events-none opacity-60" : undefined,
  )
  const longPress = useMobileNoteLongPress({
    disabled,
    longPressEnabled: !batchCopyActive,
    onLongPress: () => void onCopy(note),
    onShortPress: () => void onAddToBatchCopy(note),
    shortPressHandled: batchCopyActive,
  })

  return (
    <article
      aria-label={`메모, ${summary}`}
      className="relative overflow-hidden rounded-note border border-border bg-surface-raised"
    >
      <Link
        aria-disabled={disabled}
        aria-label={linkAccessibleName}
        className={linkClassName}
        href={href}
        {...longPress}
      >
        {text}
      </Link>
      <IconButton
        aria-label={`${summary} 복사`}
        className="absolute right-2 top-2 bg-surface-raised/90 shadow-sm"
        disabled={disabled}
        onClick={() => void onCopy(note)}
        size="compact"
      >
        <CopyIcon />
      </IconButton>
    </article>
  )
}
