import type { CSSProperties } from "react"

import type { Note } from "@/entities/note"

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

  return (
    <article
      className={`overflow-auto rounded-note border border-line-strong bg-paper p-5 shadow-note ${placement === "board" ? "absolute" : "min-h-44"}`}
      style={boardStyle}
    >
      <p className="whitespace-pre-wrap break-words text-[0.98rem] leading-7">
        {note.content || "빈 메모"}
      </p>
    </article>
  )
}
