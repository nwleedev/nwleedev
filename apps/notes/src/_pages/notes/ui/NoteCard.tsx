"use client"

import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react"

import type { Note, NoteGeometry } from "@/entities/note"
import { joinClassNames } from "@/shared/lib/join-class-names"
import { Button } from "@/shared/ui/button"

import { NoteEditor } from "./NoteEditor"
import { NoteGeometryControls } from "./NoteGeometryControls"

type GeometryGesture = {
  geometry: NoteGeometry
  mode: "move" | "resize"
  pointerId: number
  startX: number
  startY: number
}

type NoteCardProps = {
  draftContent: string
  editing: boolean
  note: Note
  placement: "board" | "list"
  scale?: number
  selected: boolean
  onBeginEditing(note: Note): void
  onDraftChange(content: string): void
  onFinishEditing(note: Note, content: string): Promise<void>
  onSaveGeometry(note: Note, geometry: NoteGeometry): Promise<void>
  onSelect(noteId: string): void
}

function geometryFromGesture(
  event: ReactPointerEvent<HTMLButtonElement>,
  gesture: GeometryGesture,
  scale: number,
) {
  const deltaX = (event.clientX - gesture.startX) / scale
  const deltaY = (event.clientY - gesture.startY) / scale

  if (gesture.mode === "move") {
    return {
      ...gesture.geometry,
      x: Math.max(0, Math.round(gesture.geometry.x + deltaX)),
      y: Math.max(0, Math.round(gesture.geometry.y + deltaY)),
    }
  }

  return {
    ...gesture.geometry,
    height: Math.max(180, Math.round(gesture.geometry.height + deltaY)),
    width: Math.max(240, Math.round(gesture.geometry.width + deltaX)),
  }
}

export function NoteCard({
  draftContent,
  editing,
  note,
  onBeginEditing,
  onDraftChange,
  onFinishEditing,
  onSaveGeometry,
  onSelect,
  placement,
  scale = 1,
  selected,
}: NoteCardProps) {
  const [errorMessage, setErrorMessage] = useState("")
  const [geometry, setGeometry] = useState(note.geometry)
  const [pending, setPending] = useState(false)
  const gesture = useRef<GeometryGesture | null>(null)
  const boardPlacement = placement === "board"
  const showBoardControls = boardPlacement && !editing
  const showGeometryControls = showBoardControls && selected
  const contentText = note.content || "빈 메모"
  const cardClassName = joinClassNames(
    "flex min-h-40 flex-col gap-3 overflow-auto rounded-note border bg-surface-raised p-3 shadow-note transition-[border-color,box-shadow] duration-[var(--notes-motion-fast)]",
    boardPlacement ? "absolute" : "relative",
    selected ? "border-action shadow-floating" : "border-line",
  )
  const boardStyle: CSSProperties | undefined = boardPlacement
    ? {
        height: geometry.height,
        left: geometry.x,
        top: geometry.y,
        width: geometry.width,
        zIndex: geometry.zIndex,
      }
    : undefined

  function startGesture(
    event: ReactPointerEvent<HTMLButtonElement>,
    mode: GeometryGesture["mode"],
  ) {
    event.preventDefault()
    event.stopPropagation()
    onSelect(note.id)
    gesture.current = {
      geometry,
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveGesture(event: ReactPointerEvent<HTMLButtonElement>) {
    const currentGesture = gesture.current

    if (currentGesture === null || currentGesture.pointerId !== event.pointerId) {
      return
    }

    setGeometry(geometryFromGesture(event, currentGesture, scale))
  }

  async function persistGeometry(nextGeometry: NoteGeometry) {
    setPending(true)
    setErrorMessage("")

    try {
      await onSaveGeometry(note, nextGeometry)
    } catch {
      setErrorMessage("메모 배치를 저장하지 못했습니다. 다시 시도하세요.")
    } finally {
      setPending(false)
    }
  }

  function finishGesture(event: ReactPointerEvent<HTMLButtonElement>) {
    const currentGesture = gesture.current

    if (currentGesture === null || currentGesture.pointerId !== event.pointerId) {
      return
    }

    const nextGeometry = geometryFromGesture(event, currentGesture, scale)
    gesture.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    setGeometry(nextGeometry)
    void persistGeometry(nextGeometry)
  }

  function cancelGesture(event: ReactPointerEvent<HTMLButtonElement>) {
    const currentGesture = gesture.current

    if (currentGesture === null || currentGesture.pointerId !== event.pointerId) {
      return
    }

    gesture.current = null
    setGeometry(currentGesture.geometry)
  }

  async function completeEditing() {
    setPending(true)
    setErrorMessage("")

    try {
      await onFinishEditing(note, draftContent)
    } catch {
      setErrorMessage("메모를 저장하지 못했습니다. 다시 시도하세요.")
    } finally {
      setPending(false)
    }
  }

  function beginEditing() {
    setErrorMessage("")
    onBeginEditing(note)
  }

  return (
    <article
      className={cardClassName}
      onFocusCapture={() => onSelect(note.id)}
      onPointerDown={() => onSelect(note.id)}
      style={boardStyle}
    >
      {editing ? null : (
        <header className="flex items-center justify-end gap-2 border-b border-line pb-2">
          {showBoardControls ? (
            <button
              aria-label="메모 이동"
              className="mr-auto min-h-[var(--notes-control-size)] cursor-grab rounded-control border border-line bg-canvas px-3 text-xs font-semibold text-soft-ink active:cursor-grabbing"
              disabled={pending}
              onPointerCancel={cancelGesture}
              onPointerDown={(event) => startGesture(event, "move")}
              onPointerMove={moveGesture}
              onPointerUp={finishGesture}
              type="button"
            >
              이동
            </button>
          ) : null}
          <Button disabled={pending} onClick={beginEditing} tone="quiet">
            편집
          </Button>
        </header>
      )}
      {editing ? (
        <NoteEditor
          content={draftContent}
          errorMessage={errorMessage}
          onChange={onDraftChange}
          onComplete={completeEditing}
          pending={pending}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <p className="whitespace-pre-wrap break-words text-[0.98rem] leading-7">
            {contentText}
          </p>
        </div>
      )}
      {showGeometryControls ? (
        <NoteGeometryControls
          geometry={geometry}
          onChange={setGeometry}
          onCommit={persistGeometry}
          pending={pending}
        />
      ) : null}
      {errorMessage && !editing ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {showBoardControls ? (
        <button
          aria-label="메모 크기 조절"
          className="absolute bottom-1 right-1 min-h-[var(--notes-control-size)] min-w-[var(--notes-control-size)] cursor-se-resize rounded-control border border-line bg-canvas px-2 text-xs font-bold text-soft-ink"
          disabled={pending}
          onPointerCancel={cancelGesture}
          onPointerDown={(event) => startGesture(event, "resize")}
          onPointerMove={moveGesture}
          onPointerUp={finishGesture}
          type="button"
        >
          크기
        </button>
      ) : null}
    </article>
  )
}
