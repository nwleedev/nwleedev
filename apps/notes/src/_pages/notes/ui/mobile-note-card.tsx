"use client"

import type { ReactNode } from "react"

import type { Note } from "@/entities/note"
import { IconButton } from "@/shared/ui/icon-button"
import { MoreIcon } from "@/shared/ui/icons"
import { ReorderableTextCard } from "@/shared/ui/reorderable-text-card"

import { useMobileNoteLongPress } from "../model/use-mobile-note-long-press"

type MobileNoteCardProps = {
  disabled: boolean
  children: ReactNode
  dragging: boolean
  dropPlacement: "after" | "before" | null
  note: Note
  onAddToBatchCopy(note: Note): Promise<void>
  onCopy(note: Note): Promise<void>
  onOpenActions(note: Note, trigger: HTMLButtonElement): void
}

export function MobileNoteCard({
  disabled,
  children,
  dragging,
  dropPlacement,
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
    <ReorderableTextCard
      dragging={dragging}
      dropPlacement={dropPlacement}
      label={`메모, ${summary}`}
      pressed={longPress.pressed}
    >
      {children}
      <button
        aria-label={`${summary} 복사`}
        className="block max-h-48 min-h-[var(--notes-touch-target)] min-w-0 w-full touch-pan-y select-none overflow-hidden whitespace-pre-wrap break-words py-1 text-left"
        disabled={disabled}
        type="button"
        {...longPress.handlers}
      >
        {text}
      </button>
      <IconButton
        aria-label={`${summary} 더보기`}
        className="h-[var(--notes-touch-target)] w-[var(--notes-touch-target)] self-start"
        id={`mobile-note-actions-${note.id}`}
        onClick={(event) => onOpenActions(note, event.currentTarget)}
      >
        <MoreIcon />
      </IconButton>
    </ReorderableTextCard>
  )
}
