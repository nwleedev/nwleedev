import type { Note } from "@/entities/note"
import { Button } from "@/shared/ui/button"

import { useNoteSession } from "../model/note-session-provider"
import { useNoteCommands } from "../model/notes-data-context"
import { useCreateNote } from "../model/use-create-note"
import { useLinkedNote } from "../model/use-linked-note"
import { useNotePropertiesSync } from "../model/use-note-properties-sync"
import { useNoteSelectionKeys } from "../model/use-note-selection-keys"
import { useNoteWorkspaceLayout } from "../model/use-note-workspace-layout"
import { MobileNotesWorkspace } from "./mobile-notes-workspace"
import { NotesBoard } from "./notes-board"

type NotesCollectionProps = {
  batchCopyShortcutEnabled: boolean
  notes: readonly Note[]
}

function byTabIndex(left: Note, right: Note) {
  return left.tabIndex - right.tabIndex
}

export function NotesCollection({
  batchCopyShortcutEnabled,
  notes,
}: NotesCollectionProps) {
  const { createNote } = useNoteCommands()
  const session = useNoteSession()
  const {
    clearSelection,
    clearSelections,
    select,
    workspace,
  } = session
  const orderedNotes = [...notes].sort(byTabIndex)
  const {
    createButton,
    createMobileNote,
    createNewNote,
    creationPending,
  } = useCreateNote(createNote, select)
  const linkedNoteId = useLinkedNote(notes, select)
  const commandPressed = useNoteSelectionKeys(clearSelection, clearSelections)
  const createLabel = creationPending ? "메모 만드는 중" : "새 메모"
  const { container, layout } = useNoteWorkspaceLayout()
  const empty = orderedNotes.length === 0
  const selectedNoteId = workspace.selectedNoteId
  const propertiesNoteId = workspace.propertiesTarget?.id ?? null

  useNotePropertiesSync({
    notes,
    target: workspace.propertiesTarget,
  })

  return (
    <div className="relative h-full min-h-0 overflow-clip bg-canvas" data-notes-layout={layout} ref={container}>
      {empty ? (
        <p
          className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-sm text-soft-ink"
          role="status"
        >
          메모가 없습니다.
        </p>
      ) : null}
      {layout === "mobile" ? (
        <MobileNotesWorkspace
          creationPending={creationPending}
          notes={orderedNotes}
          onCreate={createMobileNote}
        />
      ) : null}
      {layout === "desktop" ? (
        <>
          <NotesBoard
            batchCopyShortcutEnabled={batchCopyShortcutEnabled}
            commandPressed={commandPressed}
            focusedNoteId={linkedNoteId}
            notes={orderedNotes}
            onClearSelection={clearSelection}
            createButtonRef={createButton}
            propertiesNoteId={propertiesNoteId}
            selectedNoteId={selectedNoteId}
          />
          <Button
            className="absolute left-[var(--notes-board-action-side)] top-[var(--notes-board-action-top)] z-30 min-w-[var(--notes-create-min-width)] whitespace-nowrap md:text-base"
            disabled={creationPending}
            onClick={createNewNote}
            ref={createButton}
            tabIndex={100}
          >
            {createLabel}
          </Button>
        </>
      ) : null}
    </div>
  )
}
