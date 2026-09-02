import Link from "next/link"

import type { Note } from "@/entities/note"

type MobileNoteCardProps = {
  note: Note
}

export function MobileNoteCard({ note }: MobileNoteCardProps) {
  const text = note.content.length === 0 ? "빈 메모" : note.content
  const href = `/notes/${encodeURIComponent(note.id)}/`

  return (
    <article className="overflow-hidden rounded-note border border-note-line bg-note shadow-note">
      <Link
        aria-label="메모 열기"
        className="block max-h-48 min-h-24 overflow-hidden whitespace-pre-wrap break-words px-4 py-3 text-[0.98rem] leading-7 text-ink"
        href={href}
      >
        {text}
      </Link>
    </article>
  )
}
