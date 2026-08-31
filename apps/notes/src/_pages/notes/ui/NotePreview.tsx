import type { CSSProperties } from "react"

import type { Note } from "@/entities/note"
import { joinClassNames } from "@/shared/lib/join-class-names"

type NotePreviewProps = {
  note: Note
  placement?: "board" | "list"
}

export function NotePreview({ note, placement = "list" }: NotePreviewProps) {
  const boardStyle: CSSProperties | undefined =
    placement === "board"
      ? {
          height: note.geometry.height,
          left: note.geometry.x,
          top: note.geometry.y,
          width: note.geometry.width,
          zIndex: note.geometry.zIndex,
        }
      : undefined
  const noteClassName = joinClassNames(
    "overflow-auto rounded-note border border-line bg-surface-raised p-4 shadow-note transition-[border-color,box-shadow] duration-[var(--notes-motion-fast)] hover:border-line-strong",
    placement === "board" ? "absolute" : "min-h-40",
  )

  return (
    <article className={noteClassName} style={boardStyle}>
      <p className="whitespace-pre-wrap break-words text-[0.98rem] leading-7">
        {note.content || "빈 메모"}
      </p>
    </article>
  )
}
