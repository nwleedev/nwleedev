import type { Note } from "@/entities/note"

import { MobileNoteCard } from "./mobile-note-card"

type MobileNoteListProps = {
  notes: readonly Note[]
}

export function MobileNoteList({ notes }: MobileNoteListProps) {
  return (
    <div className="grid min-h-full content-start gap-3 overflow-auto p-4 pb-24 pt-16 @3xl/note-area:hidden">
      {notes.map((note) => (
        <MobileNoteCard key={note.id} note={note} />
      ))}
    </div>
  )
}
