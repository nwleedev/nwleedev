"use client"

import type { Note, NoteGeometry } from "@/entities/note"

import type { SaveNoteContentResult } from "../model/save-note-content"
import { useNotesBoardView } from "../model/use-notes-board-view"
import { NoteCard } from "./note-card"
import { NotesBoardControls } from "./notes-board-controls"

type NotesBoardProps = {
  batchCopyShortcutEnabled: boolean
  commandPressed: boolean
  draftContentByNote: Readonly<Record<string, string>>
  focusedNoteId: string | null
  notes: readonly Note[]
  propertiesNoteId: string | null
  selectedNoteId: string | null
  onActivateProperties(note: Note, focus: "first-field" | "preserve"): void
  onAddToBatchCopy(note: Note): Promise<void>
  onClearSelection(): void
  onCopy(note: Note): Promise<void>
  onMoveToBack(noteId: string): Promise<readonly Note[]>
  onMoveToFront(noteId: string): Promise<readonly Note[]>
  onRemove(note: Note): Promise<void>
  onSaveContent(
    noteId: string,
    content: string,
  ): Promise<SaveNoteContentResult>
  onSaveFailure(message: string): void
  onSaveGeometry(note: Note, geometry: NoteGeometry): Promise<Note>
  onSelect(noteId: string): void
}

export function NotesBoard({
  batchCopyShortcutEnabled,
  commandPressed,
  draftContentByNote,
  focusedNoteId,
  notes,
  onActivateProperties,
  onAddToBatchCopy,
  onClearSelection,
  onCopy,
  onMoveToBack,
  onMoveToFront,
  onRemove,
  onSaveContent,
  onSaveFailure,
  onSaveGeometry,
  onSelect,
  propertiesNoteId,
  selectedNoteId,
}: NotesBoardProps) {
  const {
    adjustScale,
    boardRef,
    boardStyle,
    cancelPan,
    controlsRef,
    continuePan,
    finishPan,
    fitAllNotes,
    moveView,
    originX,
    originY,
    revealFocusedNote,
    scale,
    scaleText,
    startBackgroundPan,
    startSpacePan,
    viewportRef,
  } = useNotesBoardView({ focusedNoteId, notes, onClearSelection })

  return (
    <div
      className="relative hidden h-full min-h-0 bg-canvas @3xl/note-area:block"
    >
      <div
        className="absolute inset-0 cursor-grab overflow-clip touch-none active:cursor-grabbing"
        onLostPointerCapture={cancelPan}
        onPointerCancel={cancelPan}
        onPointerDown={startBackgroundPan}
        onPointerDownCapture={startSpacePan}
        onPointerMove={continuePan}
        onPointerUp={finishPan}
        ref={viewportRef}
        tabIndex={-1}
      >
        <div
          className="absolute left-0 top-0"
          ref={boardRef}
          style={boardStyle}
        >
          {notes.map((note) => (
            <NoteCard
              batchCopyShortcutEnabled={batchCopyShortcutEnabled}
              commandPressed={commandPressed}
              initialContent={draftContentByNote[note.id] ?? note.content}
              key={note.id}
              note={note}
              onActivateProperties={onActivateProperties}
              onAddToBatchCopy={onAddToBatchCopy}
              onCopy={onCopy}
              onFocusNote={revealFocusedNote}
              onMoveToBack={onMoveToBack}
              onMoveToFront={onMoveToFront}
              onRemove={onRemove}
              onSaveContent={onSaveContent}
              onSaveFailure={onSaveFailure}
              onSaveGeometry={onSaveGeometry}
              onSelect={onSelect}
              propertiesTarget={propertiesNoteId === note.id}
              renderOriginX={originX}
              renderOriginY={originY}
              scale={scale}
              selected={selectedNoteId === note.id}
            />
          ))}
        </div>
      </div>
      <NotesBoardControls
        controlsRef={controlsRef}
        onAdjustScale={adjustScale}
        onFitAllNotes={fitAllNotes}
        onMoveView={moveView}
        scaleText={scaleText}
      />
    </div>
  )
}
