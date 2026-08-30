import type { Note } from "@/entities/note"

import { NotePreview } from "./NotePreview"

type NotesCollectionProps = {
  notes: readonly Note[]
}

function byCreationTime(left: Note, right: Note) {
  return left.createdAt.localeCompare(right.createdAt)
}

export function NotesCollection({ notes }: NotesCollectionProps) {
  const orderedNotes = [...notes].sort(byCreationTime)

  return (
    <div className="@container/note-area">
      <div className="grid gap-4 @3xl/note-area:hidden">
        {orderedNotes.map((note) => (
          <NotePreview key={note.id} note={note} />
        ))}
      </div>
      <div className="relative hidden min-h-[42rem] min-w-[48rem] overflow-auto border border-line bg-canvas @3xl/note-area:block">
        {orderedNotes.map((note) => (
          <NotePreview key={note.id} note={note} placement="board" />
        ))}
      </div>
    </div>
  )
}
