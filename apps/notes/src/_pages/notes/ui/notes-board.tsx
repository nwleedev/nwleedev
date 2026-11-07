"use client"

import type { RefObject } from "react"

import type { Note } from "@/entities/note"

import { useNoteCardActions } from "../model/use-note-card-actions"
import { useNotesBoardView } from "../model/use-notes-board-view"
import { NoteCard } from "./note-card"
import { NotesBoardControls } from "./notes-board-controls"

type NotesBoardProps = {
  focusedNoteId: string | null
  notes: readonly Note[]
  propertiesNoteId: string | null
  createButtonRef: RefObject<HTMLButtonElement | null>
  selectedNoteId: string | null
  onClearSelection(): void
}

export function NotesBoard({
  focusedNoteId,
  notes,
  createButtonRef,
  onClearSelection,
  propertiesNoteId,
  selectedNoteId,
}: NotesBoardProps) {
  const actions = useNoteCardActions(notes, createButtonRef)
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
      className="relative h-full min-h-0 bg-canvas"
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
              key={note.id}
              note={note}
              onActivateProperties={actions.activateProperties}
              onAddToBatchCopy={actions.addToBatchCopy}
              onCopy={actions.copy}
              onFocusNote={revealFocusedNote}
              onMoveToBack={actions.moveToBack}
              onMoveToFront={actions.moveToFront}
              onRemove={actions.remove}
              onSaveFailure={actions.saveFailure}
              onSaveGeometry={actions.saveGeometry}
              onSelect={actions.select}
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
