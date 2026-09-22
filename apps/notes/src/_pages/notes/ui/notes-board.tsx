"use client"

import type { Note, NoteGeometry } from "@/entities/note"
import { IconButton } from "@/shared/ui/icon-button"
import {
  ArrowBackIcon,
  FitViewIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "@/shared/ui/icons"

import type { SaveNoteContentResult } from "../model/save-note-content"
import { useNotesBoardView } from "../model/use-notes-board-view"
import { NoteCard } from "./note-card"

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

const VIEW_PAN_STEP = 48
const VIEW_SCALE_STEP = 0.1

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
    continuePan,
    finishPan,
    fitAllNotes,
    moveView,
    originX,
    originY,
    resetViewportScroll,
    scale,
    scaleText,
    startBackgroundPan,
    startSpacePan,
    viewportRef,
  } = useNotesBoardView({ focusedNoteId, notes, onClearSelection })

  return (
    <div
      className="relative hidden h-full min-h-0 cursor-grab overflow-hidden touch-none bg-canvas active:cursor-grabbing @3xl/note-area:block"
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
      <div
        aria-label="캔버스 보기"
        className="absolute bottom-3 left-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 rounded-panel border border-border bg-surface-raised p-2 shadow-floating [&_button>svg]:size-5"
        onFocusCapture={resetViewportScroll}
        role="group"
      >
        <IconButton
          aria-label="왼쪽 보기"
          onClick={() => moveView(VIEW_PAN_STEP, 0)}
          title="왼쪽 보기"
        >
          <ArrowBackIcon />
        </IconButton>
        <IconButton
          aria-label="오른쪽 보기"
          onClick={() => moveView(-VIEW_PAN_STEP, 0)}
          title="오른쪽 보기"
        >
          <ArrowBackIcon className="rotate-180" />
        </IconButton>
        <IconButton
          aria-label="위 보기"
          onClick={() => moveView(0, VIEW_PAN_STEP)}
          title="위 보기"
        >
          <ArrowBackIcon className="rotate-90" />
        </IconButton>
        <IconButton
          aria-label="아래 보기"
          onClick={() => moveView(0, -VIEW_PAN_STEP)}
          title="아래 보기"
        >
          <ArrowBackIcon className="-rotate-90" />
        </IconButton>
        <IconButton
          aria-label="축소"
          onClick={() => adjustScale(-VIEW_SCALE_STEP)}
          title="축소"
        >
          <ZoomOutIcon />
        </IconButton>
        <span className="min-w-12 text-center text-xs font-semibold tabular-nums text-soft-ink">
          {scaleText}
        </span>
        <IconButton
          aria-label="확대"
          onClick={() => adjustScale(VIEW_SCALE_STEP)}
          title="확대"
        >
          <ZoomInIcon />
        </IconButton>
        <IconButton
          aria-label="모두 보기"
          onClick={fitAllNotes}
          title="모두 보기"
        >
          <FitViewIcon />
        </IconButton>
      </div>
    </div>
  )
}
