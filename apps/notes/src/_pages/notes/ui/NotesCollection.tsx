"use client"

import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react"

import type { Note, NoteGeometry } from "@/entities/note"
import {
  useAccumulator,
  type AccumulateNoteResult,
  type AccumulationRequest,
} from "@/features/accumulate-note"
import { Button } from "@/shared/ui/button"

import type { CopyNoteResult } from "../model/copyNote"
import { useAccumulatorWorkspace } from "./AccumulatorWorkspace"
import { NoteCard } from "./NoteCard"

type NoteChange = {
  content?: string
  geometry?: NoteGeometry
}

type NotesCollectionProps = {
  metaClickEnabled: boolean
  notes: readonly Note[]
  copyNote(note: Note): Promise<CopyNoteResult>
  createNote(): Promise<Note>
  updateNote(note: Note, change: NoteChange): Promise<Note>
}

type EditingDraft = {
  content: string
  noteId: string
}

type NotePresentationProps = {
  accumulatedItemByNote: Readonly<Record<string, string>>
  accumulationReady: boolean
  editingDraft: EditingDraft | null
  metaClickEnabled: boolean
  notes: readonly Note[]
  selectedNoteId: string | null
  onAccumulate(
    note: Note,
    request: AccumulationRequest,
  ): Promise<AccumulateNoteResult>
  onAccumulated(): void
  onBeginEditing(note: Note): void
  onCopy(note: Note): Promise<CopyNoteResult>
  onDraftChange(content: string): void
  onFinishEditing(note: Note, content: string): Promise<void>
  onSaveGeometry(note: Note, geometry: NoteGeometry): Promise<void>
  onSelect(noteId: string): void
}

function NotesList({
  accumulatedItemByNote,
  accumulationReady,
  editingDraft,
  metaClickEnabled,
  notes,
  onAccumulate,
  onAccumulated,
  onBeginEditing,
  onCopy,
  onDraftChange,
  onFinishEditing,
  onSaveGeometry,
  onSelect,
  selectedNoteId,
}: NotePresentationProps) {
  return (
    <div className="grid min-h-full content-start gap-3 p-4 pb-24 pt-16 @3xl/note-area:hidden">
      {notes.map((note) => {
        const editing = editingDraft?.noteId === note.id
        const draftContent =
          editingDraft?.noteId === note.id
            ? editingDraft.content
            : note.content
        const itemKey = `${note.id}:${note.revision}:list`

        return (
          <NoteCard
            accumulatedSelected={
              accumulatedItemByNote[note.id] !== undefined
            }
            accumulationReady={accumulationReady}
            draftContent={draftContent}
            editing={editing}
            key={itemKey}
            metaClickEnabled={metaClickEnabled}
            note={note}
            onAccumulate={onAccumulate}
            onAccumulated={onAccumulated}
            onBeginEditing={onBeginEditing}
            onCopy={onCopy}
            onDraftChange={onDraftChange}
            onFinishEditing={onFinishEditing}
            onSaveGeometry={onSaveGeometry}
            onSelect={onSelect}
            placement="list"
            selected={selectedNoteId === note.id}
          />
        )
      })}
    </div>
  )
}

type BoardDimensions = {
  height: number
  width: number
}

type BoardView = {
  scale: number
  x: number
  y: number
}

type PanGesture = {
  pointerId: number
  startView: BoardView
  startX: number
  startY: number
}

function measureBoard(notes: readonly Note[]): BoardDimensions {
  return notes.reduce(
    (dimensions, note) => ({
      height: Math.max(
        dimensions.height,
        note.geometry.y + note.geometry.height + 160,
      ),
      width: Math.max(
        dimensions.width,
        note.geometry.x + note.geometry.width + 160,
      ),
    }),
    { height: 720, width: 1024 },
  )
}

function NotesBoard(props: NotePresentationProps) {
  const {
    accumulatedItemByNote,
    accumulationReady,
    editingDraft,
    metaClickEnabled,
    notes,
    onAccumulate,
    onAccumulated,
    onBeginEditing,
    onCopy,
    onDraftChange,
    onFinishEditing,
    onSaveGeometry,
    onSelect,
    selectedNoteId,
  } = props
  const viewport = useRef<HTMLDivElement>(null)
  const panGesture = useRef<PanGesture | null>(null)
  const [view, setView] = useState<BoardView>({ scale: 1, x: 0, y: 0 })
  const dimensions = measureBoard(notes)
  const scaleText = `${Math.round(view.scale * 100).toLocaleString("ko-KR")}%`
  const boardStyle: CSSProperties = {
    height: dimensions.height,
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
    transformOrigin: "0 0",
    width: dimensions.width,
  }

  function adjustScale(change: number) {
    setView((current) => ({
      ...current,
      scale: Math.min(2, Math.max(0.5, current.scale + change)),
    }))
  }

  function moveView(x: number, y: number) {
    setView((current) => ({
      ...current,
      x: current.x + x,
      y: current.y + y,
    }))
  }

  function fitAllNotes() {
    const element = viewport.current

    if (element === null) {
      return
    }

    const availableWidth = Math.max(1, element.clientWidth - 32)
    const availableHeight = Math.max(1, element.clientHeight - 32)
    const scale = Math.min(
      1,
      availableWidth / dimensions.width,
      availableHeight / dimensions.height,
    )
    setView({ scale, x: 16, y: 16 })
  }

  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) {
      return
    }

    panGesture.current = {
      pointerId: event.pointerId,
      startView: view,
      startX: event.clientX,
      startY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function continuePan(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = panGesture.current

    if (gesture === null || gesture.pointerId !== event.pointerId) {
      return
    }

    setView({
      ...gesture.startView,
      x: gesture.startView.x + event.clientX - gesture.startX,
      y: gesture.startView.y + event.clientY - gesture.startY,
    })
  }

  function finishPan(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = panGesture.current

    if (gesture === null || gesture.pointerId !== event.pointerId) {
      return
    }

    panGesture.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function cancelPan() {
    const gesture = panGesture.current

    if (gesture === null) {
      return
    }

    panGesture.current = null
    setView(gesture.startView)
  }

  return (
    <div
      className="relative hidden h-full min-h-0 overflow-hidden @3xl/note-area:block"
      ref={viewport}
    >
      <div
        className="absolute left-0 top-0 cursor-grab touch-none active:cursor-grabbing"
        onPointerCancel={cancelPan}
        onPointerDown={startPan}
        onPointerMove={continuePan}
        onPointerUp={finishPan}
        style={boardStyle}
      >
        {notes.map((note) => {
          const editing = editingDraft?.noteId === note.id
          const draftContent =
            editingDraft?.noteId === note.id
              ? editingDraft.content
              : note.content
          const itemKey = `${note.id}:${note.revision}:board`

          return (
            <NoteCard
              accumulatedSelected={
                accumulatedItemByNote[note.id] !== undefined
              }
              accumulationReady={accumulationReady}
              draftContent={draftContent}
              editing={editing}
              key={itemKey}
              metaClickEnabled={metaClickEnabled}
              note={note}
              onAccumulate={onAccumulate}
              onAccumulated={onAccumulated}
              onBeginEditing={onBeginEditing}
              onCopy={onCopy}
              onDraftChange={onDraftChange}
              onFinishEditing={onFinishEditing}
              onSaveGeometry={onSaveGeometry}
              onSelect={onSelect}
              placement="board"
              scale={view.scale}
              selected={selectedNoteId === note.id}
            />
          )
        })}
      </div>
      <div
        aria-label="보드 보기"
        className="absolute bottom-3 left-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 rounded-panel border border-line bg-surface-raised p-2 shadow-floating"
        role="group"
      >
        <Button onClick={() => moveView(48, 0)} tone="quiet">
          왼쪽 보기
        </Button>
        <Button onClick={() => moveView(-48, 0)} tone="quiet">
          오른쪽 보기
        </Button>
        <Button onClick={() => moveView(0, 48)} tone="quiet">
          위 보기
        </Button>
        <Button onClick={() => moveView(0, -48)} tone="quiet">
          아래 보기
        </Button>
        <Button onClick={() => adjustScale(-0.1)} tone="quiet">
          축소
        </Button>
        <span className="min-w-12 text-center text-xs font-semibold tabular-nums text-soft-ink">
          {scaleText}
        </span>
        <Button onClick={() => adjustScale(0.1)} tone="quiet">
          확대
        </Button>
        <Button onClick={fitAllNotes} tone="quiet">
          모두 보기
        </Button>
      </div>
    </div>
  )
}

function byCreationTime(left: Note, right: Note) {
  return left.createdAt.localeCompare(right.createdAt)
}

export function NotesCollection({
  copyNote,
  createNote,
  metaClickEnabled,
  notes,
  updateNote,
}: NotesCollectionProps) {
  const accumulator = useAccumulator()
  const accumulatorWorkspace = useAccumulatorWorkspace()
  const orderedNotes = [...notes].sort(byCreationTime)
  const [creationError, setCreationError] = useState("")
  const [creationPending, setCreationPending] = useState(false)
  const [editingDraft, setEditingDraft] = useState<EditingDraft | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const createLabel = creationPending ? "메모 만드는 중" : "새 메모"
  const empty = orderedNotes.length === 0

  async function createNewNote() {
    setCreationPending(true)
    setCreationError("")

    try {
      const note = await createNote()
      setSelectedNoteId(note.id)
      setEditingDraft({ content: note.content, noteId: note.id })
    } catch {
      setCreationError("메모를 만들지 못했습니다. 다시 시도하세요.")
    } finally {
      setCreationPending(false)
    }
  }

  function beginEditing(note: Note) {
    setEditingDraft({ content: note.content, noteId: note.id })
  }

  function changeDraft(content: string) {
    setEditingDraft((current) => {
      if (current === null) {
        return current
      }

      return { ...current, content }
    })
  }

  async function finishEditing(note: Note, content: string) {
    await updateNote(note, { content })
    setEditingDraft(null)
  }

  async function saveGeometry(note: Note, geometry: NoteGeometry) {
    await updateNote(note, { geometry })
  }

  const presentationProps: NotePresentationProps = {
    accumulatedItemByNote: accumulator.selectedItemByNote,
    accumulationReady: accumulator.status === "ready",
    editingDraft,
    metaClickEnabled,
    notes: orderedNotes,
    onAccumulate: accumulator.accumulate,
    onAccumulated: accumulatorWorkspace.revealNewAccumulation,
    onBeginEditing: beginEditing,
    onCopy: copyNote,
    onDraftChange: changeDraft,
    onFinishEditing: finishEditing,
    onSaveGeometry: saveGeometry,
    onSelect: setSelectedNoteId,
    selectedNoteId,
  }

  return (
    <div className="notes-workspace-canvas @container/note-area relative h-full min-h-0 overflow-hidden">
      <Button
        className="absolute left-3 top-3 z-20 shadow-floating sm:left-4"
        disabled={creationPending}
        onClick={createNewNote}
      >
        {createLabel}
      </Button>
      {creationError ? (
        <p
          className="absolute left-3 top-16 z-20 rounded-control border border-danger bg-surface-raised px-3 py-2 text-sm font-medium text-danger shadow-floating sm:left-4"
          role="alert"
        >
          {creationError}
        </p>
      ) : null}
      {empty ? (
        <p
          className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-sm text-soft-ink"
          role="status"
        >
          메모가 없습니다.
        </p>
      ) : null}
      <NotesList {...presentationProps} />
      <NotesBoard {...presentationProps} />
    </div>
  )
}
