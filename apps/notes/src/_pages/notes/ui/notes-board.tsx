"use client"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react"

import { NOTE_CANVAS_SIZE, type Note, type NoteGeometry } from "@/entities/note"
import { IconButton } from "@/shared/ui/icon-button"
import { ArrowBackIcon, FitViewIcon, ZoomInIcon, ZoomOutIcon } from "@/shared/ui/icons"

import type { SaveNoteContentResult } from "../model/save-note-content"
import { NoteCard } from "./note-card"

type BoardView = {
  originX: number
  originY: number
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
    return { originX: 0, originY: 0, scale: 1, x: 0, y: 0 }
  }

  return {
    originX: focusedNote.geometry.x,
    originY: focusedNote.geometry.y,
    scale: 1,
    x: 48,
    y: 80,
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
  const [firstNote, ...remainingNotes] = notes

  if (firstNote === undefined) {
    return { bottom: 0, left: 0, right: 0, top: 0 }
  }

  return remainingNotes.reduce(
    (bounds, note) => ({
      bottom: Math.max(bounds.bottom, note.geometry.y + note.geometry.height),
      left: Math.min(bounds.left, note.geometry.x),
      right: Math.max(bounds.right, note.geometry.x + note.geometry.width),
      top: Math.min(bounds.top, note.geometry.y),
    }),
    {
      bottom: firstNote.geometry.y + firstNote.geometry.height,
      left: firstNote.geometry.x,
      right: firstNote.geometry.x + firstNote.geometry.width,
      top: firstNote.geometry.y,
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
    height: NOTE_CANVAS_SIZE * view.scale,
    transform: `translate(${view.x}px, ${view.y}px)`,
    transformOrigin: "0 0",
    width: NOTE_CANVAS_SIZE * view.scale,
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

    function releaseTransientInput() {
      setSpacePressed(false)
      panGesture.current = null
    }

    window.addEventListener("keydown", pressSpace)
    window.addEventListener("keyup", releaseSpace)
    window.addEventListener("blur", releaseTransientInput)
    window.addEventListener("pageshow", releaseTransientInput)
    document.addEventListener("visibilitychange", releaseTransientInput)

    return () => {
      window.removeEventListener("keydown", pressSpace)
      window.removeEventListener("keyup", releaseSpace)
      window.removeEventListener("blur", releaseTransientInput)
      window.removeEventListener("pageshow", releaseTransientInput)
      document.removeEventListener("visibilitychange", releaseTransientInput)
    }
  }, [])

  function adjustScale(change: number) {
    setView((current) => ({
      ...current,
      scale:
        change < 0
          ? Math.max(Number.EPSILON, current.scale + change)
          : Math.min(2, current.scale + change),
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
      setView({ originX: 0, originY: 0, scale: 1, x: 0, y: 0 })
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
      originX: bounds.left,
      originY: bounds.top,
      scale,
      x: padding,
      y: padding,
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
    panGesture.current = null

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
            renderOriginX={view.originX}
            renderOriginY={view.originY}
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
        <IconButton
          aria-label="왼쪽 보기"
          onClick={() => moveView(48, 0)}
          title="왼쪽 보기"
        >
          <ArrowBackIcon />
        </IconButton>
        <IconButton
          aria-label="오른쪽 보기"
          onClick={() => moveView(-48, 0)}
          title="오른쪽 보기"
        >
          <ArrowBackIcon className="rotate-180" />
        </IconButton>
        <IconButton
          aria-label="위 보기"
          onClick={() => moveView(0, 48)}
          title="위 보기"
        >
          <ArrowBackIcon className="rotate-90" />
        </IconButton>
        <IconButton
          aria-label="아래 보기"
          onClick={() => moveView(0, -48)}
          title="아래 보기"
        >
          <ArrowBackIcon className="-rotate-90" />
        </IconButton>
        <IconButton
          aria-label="축소"
          onClick={() => adjustScale(-0.1)}
          title="축소"
        >
          <ZoomOutIcon />
        </IconButton>
        <span className="min-w-12 text-center text-xs font-semibold tabular-nums text-soft-ink">
          {scaleText}
        </span>
        <IconButton
          aria-label="확대"
          onClick={() => adjustScale(0.1)}
          title="확대"
        >
          <ZoomInIcon />
        </IconButton>
        <IconButton aria-label="모두 보기" onClick={fitAllNotes} title="모두 보기">
          <FitViewIcon />
        </IconButton>
      </div>
    </div>
  )
}
