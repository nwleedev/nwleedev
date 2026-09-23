import type { Note } from "@/entities/note"

import { MobileNoteCard } from "./mobile-note-card"

type MobileNoteListProps = {
  batchCopyActive: boolean
  disabled: boolean
  notes: readonly Note[]
  onAddToBatchCopy(note: Note): Promise<void>
  onCopy(note: Note): Promise<void>
}

export function MobileNoteList({
  batchCopyActive,
  disabled,
  notes,
  onAddToBatchCopy,
  onCopy,
}: MobileNoteListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
      {notes.map((note) => (
        <MobileNoteCard
          batchCopyActive={batchCopyActive}
          disabled={disabled}
          key={note.id}
          note={note}
          onAddToBatchCopy={onAddToBatchCopy}
          onCopy={onCopy}
        />
      ))}
    </div>
  )
}
