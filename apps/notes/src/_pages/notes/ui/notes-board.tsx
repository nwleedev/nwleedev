"use client"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react"

import { NOTE_CANVAS_SIZE, type Note, type NoteGeometry } from "@/entities/note"
import { Button } from "@/shared/ui/button"

import type { SaveNoteContentResult } from "../model/save-note-content"
import { NoteCard } from "./note-card"

type BoardView = {
  scale: number
  x: number
  y: number
}

type PanGesture = {
  moved: boolean
  pointerId: number
  pointerType: string
  startView: BoardView
  startX: number
  startY: number
}

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

function initialBoardView(
  notes: readonly Note[],
  focusedNoteId: string | null,
): BoardView {
  const focusedNote = notes.find(({ id }) => id === focusedNoteId)

  if (focusedNote === undefined) {
    return { scale: 1, x: 0, y: 0 }
  }

  return {
    scale: 1,
    x: 48 - focusedNote.geometry.x,
    y: 80 - focusedNote.geometry.y,
  }
}

function isTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  const tagName = target.tagName.toLowerCase()
  return tagName === "input" || tagName === "textarea" || tagName === "select"
}

function panThreshold(pointerType: string) {
  return pointerType === "touch" ? 10 : 5
}

function noteBounds(notes: readonly Note[]) {
  return notes.reduce(
    (bounds, note) => ({
      bottom: Math.max(bounds.bottom, note.geometry.y + note.geometry.height),
      left: Math.min(bounds.left, note.geometry.x),
      right: Math.max(bounds.right, note.geometry.x + note.geometry.width),
      top: Math.min(bounds.top, note.geometry.y),
    }),
    {
      bottom: 1,
      left: NOTE_CANVAS_SIZE,
      right: 1,
      top: NOTE_CANVAS_SIZE,
    },
  )
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
  const viewport = useRef<HTMLDivElement>(null)
  const board = useRef<HTMLDivElement>(null)
  const panGesture = useRef<PanGesture | null>(null)
  const [spacePressed, setSpacePressed] = useState(false)
  const [view, setView] = useState<BoardView>(() =>
    initialBoardView(notes, focusedNoteId),
  )
  const scaleText = `${Math.round(view.scale * 100).toLocaleString("ko-KR")}%`
  const boardStyle: CSSProperties = {
    height: NOTE_CANVAS_SIZE,
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
    transformOrigin: "0 0",
    width: NOTE_CANVAS_SIZE,
  }

  useEffect(() => {
    function pressSpace(event: KeyboardEvent) {
      if (event.code === "Space" && !isTextEditingTarget(event.target)) {
        setSpacePressed(true)
      }
    }

    function releaseSpace(event: KeyboardEvent) {
      if (event.code === "Space") {
        setSpacePressed(false)
      }
    }

    function releaseAllKeys() {
      setSpacePressed(false)
    }

    window.addEventListener("keydown", pressSpace)
    window.addEventListener("keyup", releaseSpace)
    window.addEventListener("blur", releaseAllKeys)

    return () => {
      window.removeEventListener("keydown", pressSpace)
      window.removeEventListener("keyup", releaseSpace)
      window.removeEventListener("blur", releaseAllKeys)
    }
  }, [])

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

    if (element === null || notes.length === 0) {
      setView({ scale: 1, x: 0, y: 0 })
      return
    }

    const bounds = noteBounds(notes)
    const padding = 32
    const contentWidth = Math.max(1, bounds.right - bounds.left)
    const contentHeight = Math.max(1, bounds.bottom - bounds.top)
    const availableWidth = Math.max(1, element.clientWidth - padding * 2)
    const availableHeight = Math.max(1, element.clientHeight - padding * 2)
    const scale = Math.min(
      1,
      availableWidth / contentWidth,
      availableHeight / contentHeight,
    )
    setView({
      scale,
      x: padding - bounds.left * scale,
      y: padding - bounds.top * scale,
    })
  }

  function beginPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return
    }

    panGesture.current = {
      moved: false,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startView: view,
      startX: event.clientX,
      startY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function startSpacePan(event: ReactPointerEvent<HTMLDivElement>) {
    if (!spacePressed) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    beginPan(event)
  }

  function startBackgroundPan(event: ReactPointerEvent<HTMLDivElement>) {
    const backgroundTarget =
      event.target === event.currentTarget || event.target === board.current

    if (spacePressed || !backgroundTarget) {
      return
    }

    beginPan(event)
  }

  function continuePan(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = panGesture.current

    if (gesture === null || gesture.pointerId !== event.pointerId) {
      return
    }

    const movement = Math.hypot(
      event.clientX - gesture.startX,
      event.clientY - gesture.startY,
    )

    if (!gesture.moved && movement < panThreshold(gesture.pointerType)) {
      return
    }

    gesture.moved = true
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

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (!gesture.moved) {
      event.currentTarget.focus()
      onClearSelection()
    }
  }

  function cancelPan(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = panGesture.current

    if (gesture === null || gesture.pointerId !== event.pointerId) {
      return
    }

    panGesture.current = null
  }

  return (
    <div
      className="relative hidden h-full min-h-0 cursor-grab overflow-hidden touch-none active:cursor-grabbing @3xl/note-area:block"
      onLostPointerCapture={cancelPan}
      onPointerCancel={cancelPan}
      onPointerDown={startBackgroundPan}
      onPointerDownCapture={startSpacePan}
      onPointerMove={continuePan}
      onPointerUp={finishPan}
      ref={viewport}
      tabIndex={-1}
    >
      <div className="absolute left-0 top-0" ref={board} style={boardStyle}>
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
            scale={view.scale}
            selected={selectedNoteId === note.id}
          />
        ))}
      </div>
      <div
        aria-label="캔버스 보기"
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
