import type { Note } from "@/entities/note"

import { NotePreview } from "./NotePreview"

type NotesCollectionProps = {
  notes: readonly Note[]
}

function byCreationTime(left: Note, right: Note) {
  return left.createdAt.localeCompare(right.createdAt)
}

function NotesList({ notes }: NotesCollectionProps) {
  return (
    <div className="grid min-h-full gap-3 p-4 pt-16 @3xl/note-area:hidden">
      {notes.map((note) => (
        <NotePreview key={note.id} note={note} />
      ))}
    </div>
  )
}

function NotesBoard({ notes }: NotesCollectionProps) {
  return (
    <div className="relative hidden min-h-full min-w-[48rem] @3xl/note-area:block">
      {notes.map((note) => (
        <NotePreview key={note.id} note={note} placement="board" />
      ))}
    </div>
  )
}

export function NotesCollection({ notes }: NotesCollectionProps) {
  const orderedNotes = [...notes].sort(byCreationTime)

  return (
    <div className="notes-workspace-canvas @container/note-area h-full min-h-0 overflow-auto">
      <NotesList notes={orderedNotes} />
      <NotesBoard notes={orderedNotes} />
    </div>
  )
}
