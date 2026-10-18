"use client"

import type { ReactNode } from "react"

import type { Note } from "@/entities/note"
import { IconButton } from "@/shared/ui/icon-button"
import { MoreIcon } from "@/shared/ui/icons"

import { useMobileNoteLongPress } from "../model/use-mobile-note-long-press"

type MobileNoteCardProps = {
  disabled: boolean
  dragHandle: ReactNode
  note: Note
  onAddToBatchCopy(note: Note): Promise<void>
  onCopy(note: Note): Promise<void>
  onOpenActions(note: Note, trigger: HTMLButtonElement): void
}

export function MobileNoteCard({
  disabled,
  dragHandle,
  note,
  onAddToBatchCopy,
  onCopy,
  onOpenActions,
}: MobileNoteCardProps) {
  const text = note.content.length === 0 ? "빈 메모" : note.content
  const summary = note.content.split("\n").find((line) => line.trim().length > 0)?.trim() ?? "빈 메모"
  const longPress = useMobileNoteLongPress({
    disabled,
    longPressEnabled: true,
    onLongPress: () => void onAddToBatchCopy(note),
    onShortPress: () => void onCopy(note),
  })

  return (
    <article
      aria-label={`메모, ${summary}`}
      className="relative grid shrink-0 grid-cols-[var(--notes-mobile-handle-size)_minmax(0,1fr)] rounded-note border border-border bg-surface-raised data-[pressed=true]:outline data-[pressed=true]:outline-[length:var(--notes-mobile-pressed-width)] data-[pressed=true]:outline-danger data-[pressed=true]:-outline-offset-[length:var(--notes-mobile-pressed-width)]"
      data-pressed={longPress.pressed}
    >
      <div className="flex items-center justify-center rounded-l-note border-r border-border bg-canvas">
        {dragHandle}
      </div>
      <button
        aria-label={`${summary} 복사`}
        className="block max-h-48 min-h-24 w-full touch-pan-y select-none overflow-hidden whitespace-pre-wrap break-words px-4 py-4 pr-14 text-left text-base leading-7 text-ink"
        disabled={disabled}
        type="button"
        {...longPress.handlers}
      >
        {text}
      </button>
      <IconButton
        aria-label={`${summary} 더보기`}
        className="absolute right-1 top-1 h-[var(--notes-touch-target)] w-[var(--notes-touch-target)]"
        id={`mobile-note-actions-${note.id}`}
        onClick={(event) => onOpenActions(note, event.currentTarget)}
      >
        <MoreIcon className="size-5" />
      </IconButton>
    </article>
  )
}
