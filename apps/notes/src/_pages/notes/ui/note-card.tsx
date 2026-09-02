"use client"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"

import {
  NOTE_CANVAS_SIZE,
  NOTE_HEIGHT_MAX,
  NOTE_HEIGHT_MIN,
  NOTE_WIDTH_MAX,
  NOTE_WIDTH_MIN,
  fitNoteGeometryToCanvas,
  type Note,
  type NoteGeometry,
} from "@/entities/note"
import { joinClassNames } from "@/shared/lib/join-class-names"
import { IconButton } from "@/shared/ui/icon-button"
import {
  BringToFrontIcon,
  RemoveIcon,
  SendToBackIcon,
} from "@/shared/ui/icons"

import type { SaveNoteContentResult } from "../model/save-note-content"
import { useNoteContentAutosave } from "../model/use-note-content-autosave"
import { noteContentFailureMessage } from "./note-content-failure-message"

type ResizeDirection =
  | "east"
  | "north"
  | "north-east"
  | "north-west"
  | "south"
  | "south-east"
  | "south-west"
  | "west"

type GeometryGesture = {
  action: "move" | ResizeDirection
  geometry: NoteGeometry
  moved: boolean
  pointerId: number
  pointerType: string
  startX: number
  startY: number
}

type NoteCardProps = {
  batchCopyShortcutEnabled: boolean
  commandPressed: boolean
  initialContent: string
  note: Note
  propertiesTarget: boolean
  scale: number
  selected: boolean
  onActivateProperties(note: Note, focus: "first-field" | "preserve"): void
  onAddToBatchCopy(note: Note): Promise<void>
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

type ResizeHandleProps = {
  direction: ResizeDirection
  disabled: boolean
  positionClassName: string
  onLostPointerCapture(event: ReactPointerEvent<HTMLSpanElement>): void
  onPointerCancel(event: ReactPointerEvent<HTMLSpanElement>): void
  onPointerDown(
    event: ReactPointerEvent<HTMLSpanElement>,
    direction: ResizeDirection,
  ): void
  onPointerMove(event: ReactPointerEvent<HTMLSpanElement>): void
  onPointerUp(event: ReactPointerEvent<HTMLSpanElement>): void
}

const resizeCursorClassNames: Record<ResizeDirection, string> = {
  east: "cursor-e-resize",
  north: "cursor-n-resize",
  "north-east": "cursor-ne-resize",
  "north-west": "cursor-nw-resize",
  south: "cursor-s-resize",
  "south-east": "cursor-se-resize",
  "south-west": "cursor-sw-resize",
  west: "cursor-w-resize",
}

function movementThreshold(pointerType: string) {
  return pointerType === "touch" ? 10 : 5
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

function resizedGeometry(
  geometry: NoteGeometry,
  direction: ResizeDirection,
  deltaX: number,
  deltaY: number,
) {
  let height = geometry.height
  let width = geometry.width
  let x = geometry.x
  let y = geometry.y

  if (direction.includes("east")) {
    width = clamp(
      geometry.width + deltaX,
      NOTE_WIDTH_MIN,
      Math.min(NOTE_WIDTH_MAX, NOTE_CANVAS_SIZE - geometry.x),
    )
  }

  if (direction.includes("south")) {
    height = clamp(
      geometry.height + deltaY,
      NOTE_HEIGHT_MIN,
      Math.min(NOTE_HEIGHT_MAX, NOTE_CANVAS_SIZE - geometry.y),
    )
  }

  if (direction.includes("west")) {
    const right = geometry.x + geometry.width
    width = clamp(
      geometry.width - deltaX,
      NOTE_WIDTH_MIN,
      Math.min(NOTE_WIDTH_MAX, right - 1),
    )
    x = right - width
  }

  if (direction.includes("north")) {
    const bottom = geometry.y + geometry.height
    height = clamp(
      geometry.height - deltaY,
      NOTE_HEIGHT_MIN,
      Math.min(NOTE_HEIGHT_MAX, bottom - 1),
    )
    y = bottom - height
  }

  return fitNoteGeometryToCanvas({ ...geometry, height, width, x, y })
}

function geometryFromGesture(
  event: ReactPointerEvent<HTMLElement>,
  gesture: GeometryGesture,
  scale: number,
) {
  const deltaX = Math.round((event.clientX - gesture.startX) / scale)
  const deltaY = Math.round((event.clientY - gesture.startY) / scale)

  if (gesture.action === "move") {
    return fitNoteGeometryToCanvas({
      ...gesture.geometry,
      x: gesture.geometry.x + deltaX,
      y: gesture.geometry.y + deltaY,
    })
  }

  return resizedGeometry(gesture.geometry, gesture.action, deltaX, deltaY)
}

function ResizeHandle({
  direction,
  disabled,
  onLostPointerCapture,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  positionClassName,
}: ResizeHandleProps) {
  const handleClassName = joinClassNames(
    "absolute z-20 touch-none",
    resizeCursorClassNames[direction],
    positionClassName,
    disabled ? "pointer-events-none" : undefined,
  )

  return (
    <span
      aria-hidden="true"
      className={handleClassName}
      onLostPointerCapture={onLostPointerCapture}
      onPointerCancel={onPointerCancel}
      onPointerDown={(event) => onPointerDown(event, direction)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="presentation"
    />
  )
}

function stopHeaderAction(event: { stopPropagation(): void }) {
  event.stopPropagation()
}

export function NoteCard({
  batchCopyShortcutEnabled,
  commandPressed,
  initialContent,
  note,
  onActivateProperties,
  onAddToBatchCopy,
  onCopy,
  onMoveToBack,
  onMoveToFront,
  onRemove,
  onSaveContent,
  onSaveFailure,
  onSaveGeometry,
  onSelect,
  propertiesTarget,
  scale,
  selected,
}: NoteCardProps) {
  const [geometryPreview, setGeometryPreview] =
    useState<NoteGeometry | null>(null)
  const [geometryPending, setGeometryPending] = useState(false)
  const gesture = useRef<GeometryGesture | null>(null)
  const suppressClick = useRef(false)
  const suppressClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const article = useRef<HTMLElement>(null)
  const content = useNoteContentAutosave({
    initialContent,
    note,
    onFailure: (reason) => onSaveFailure(noteContentFailureMessage(reason)),
    onSave: onSaveContent,
  })
  const geometry = geometryPreview ?? note.geometry
  const encodedNoteId = encodeURIComponent(note.id)
  const articleId = `note-${encodedNoteId}-board`
  const contentId = `note-${encodedNoteId}-content`
  const interactionPending = geometryPending || content.status === "saving"
  const selectedVisible = selected && !commandPressed
  const headerClassName = joinClassNames(
    "flex h-7 shrink-0 touch-none items-center justify-end gap-0.5 border-b border-note-line bg-note-header px-1",
    commandPressed ? "invisible" : undefined,
  )
  const cardClassName = joinClassNames(
    "absolute flex flex-col overflow-visible rounded-note border bg-note shadow-note transition-[border-color,box-shadow] duration-[var(--notes-motion-fast)]",
    selectedVisible ? "border-selection" : "border-note-line",
    propertiesTarget ? "outline outline-1 outline-offset-2 outline-dashed outline-line-strong" : undefined,
  )
  const cardStyle: CSSProperties = {
    height: geometry.height,
    left: geometry.x,
    top: geometry.y,
    width: geometry.width,
    zIndex: geometry.zIndex,
  }

  useEffect(() => {
    return () => {
      if (suppressClickTimer.current !== null) {
        clearTimeout(suppressClickTimer.current)
      }
    }
  }, [])

  function suppressClickSequence() {
    if (suppressClickTimer.current !== null) {
      clearTimeout(suppressClickTimer.current)
    }

    suppressClick.current = true
    suppressClickTimer.current = setTimeout(() => {
      suppressClick.current = false
      suppressClickTimer.current = null
    }, 0)
  }

  function startGeometryGesture(
    event: ReactPointerEvent<HTMLElement>,
    action: GeometryGesture["action"],
  ) {
    if (interactionPending || event.button !== 0) {
      return
    }

    event.preventDefault()
    gesture.current = {
      action,
      geometry,
      moved: false,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveGeometryGesture(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    const distance = Math.hypot(
      event.clientX - current.startX,
      event.clientY - current.startY,
    )

    if (!current.moved && distance < movementThreshold(current.pointerType)) {
      return
    }

    current.moved = true
    setGeometryPreview(geometryFromGesture(event, current, scale))
  }

  async function persistGeometry(nextGeometry: NoteGeometry) {
    setGeometryPending(true)

    try {
      await onSaveGeometry(note, nextGeometry)
      setGeometryPreview(null)
    } catch {
      setGeometryPreview(null)
      onSaveFailure("메모 위치와 크기를 저장하지 못했습니다. 다시 시도하세요.")
    } finally {
      setGeometryPending(false)
    }
  }

  function finishGeometryGesture(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    gesture.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (!current.moved) {
      return
    }

    suppressClickSequence()
    const nextGeometry = geometryFromGesture(event, current, scale)
    setGeometryPreview(nextGeometry)
    void persistGeometry(nextGeometry)
  }

  function cancelGeometryGesture(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    gesture.current = null
    setGeometryPreview(null)
    suppressClickSequence()
  }

  function selectFromHeader(event: ReactMouseEvent<HTMLElement>) {
    if (suppressClick.current) {
      return
    }

    if (!event.metaKey) {
      onSelect(note.id)
    }
  }

  function openPropertiesFromHeader(event: ReactMouseEvent<HTMLElement>) {
    if (!suppressClick.current && !event.metaKey) {
      onActivateProperties(note, "preserve")
    }
  }

  function selectFromKeyboard(event: ReactFocusEvent<HTMLElement>) {
    if (event.target === event.currentTarget && !commandPressed) {
      onSelect(note.id)
    }
  }

  function openPropertiesFromKeyboard(
    event: ReactKeyboardEvent<HTMLElement>,
  ) {
    const batchCopyEnter =
      event.key === "Enter" &&
      event.altKey &&
      event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey
    const validBatchCopyEnter =
      batchCopyEnter &&
      !event.nativeEvent.isComposing &&
      !event.repeat

    if (event.target === event.currentTarget && validBatchCopyEnter) {
      event.preventDefault()
      const noteSnapshot = { ...note, content: content.content }
      void onAddToBatchCopy(noteSnapshot)
      return
    }

    const plainEnter =
      event.key === "Enter" &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey

    if (event.target !== event.currentTarget || !plainEnter || !selected) {
      return
    }

    event.preventDefault()
    onActivateProperties(note, "first-field")
  }

  function prepareContentShortcut(event: ReactMouseEvent<HTMLTextAreaElement>) {
    const individualCopy =
      event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey
    const batchCopy =
      event.metaKey && event.altKey && !event.ctrlKey && !event.shiftKey

    if (individualCopy || (batchCopy && batchCopyShortcutEnabled)) {
      event.preventDefault()
    }
  }

  function runContentShortcut(event: ReactMouseEvent<HTMLTextAreaElement>) {
    const individualCopy =
      event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey
    const batchCopy =
      event.metaKey && event.altKey && !event.ctrlKey && !event.shiftKey

    if (!individualCopy && !batchCopy) {
      return
    }

    if (batchCopy && !batchCopyShortcutEnabled) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    const noteSnapshot = { ...note, content: content.content }

    if (batchCopy) {
      void onAddToBatchCopy(noteSnapshot)
      return
    }

    void onCopy(noteSnapshot)
  }

  async function moveToFront(event: ReactMouseEvent<HTMLButtonElement>) {
    stopHeaderAction(event)

    try {
      await onMoveToFront(note.id)
    } catch {
      onSaveFailure("메모 순서를 저장하지 못했습니다. 다시 시도하세요.")
    }
  }

  async function moveToBack(event: ReactMouseEvent<HTMLButtonElement>) {
    stopHeaderAction(event)

    try {
      await onMoveToBack(note.id)
    } catch {
      onSaveFailure("메모 순서를 저장하지 못했습니다. 다시 시도하세요.")
    }
  }

  async function remove(event: ReactMouseEvent<HTMLButtonElement>) {
    stopHeaderAction(event)
    const savedNote = await content.save()

    if (savedNote === null) {
      return
    }

    try {
      await onRemove(savedNote)
    } catch {
      onSaveFailure("메모를 제거하지 못했습니다. 다시 시도하세요.")
    }
  }

  return (
    <article
      aria-label="메모"
      className={cardClassName}
      id={articleId}
      onFocus={selectFromKeyboard}
      onKeyDown={openPropertiesFromKeyboard}
      ref={article}
      style={cardStyle}
      tabIndex={note.tabIndex}
    >
      <header
        className={headerClassName}
        onClick={selectFromHeader}
        onDoubleClick={openPropertiesFromHeader}
        onLostPointerCapture={cancelGeometryGesture}
        onPointerCancel={cancelGeometryGesture}
        onPointerDown={(event) => startGeometryGesture(event, "move")}
        onPointerMove={moveGeometryGesture}
        onPointerUp={finishGeometryGesture}
      >
        <IconButton
          aria-label="메모를 맨 앞으로"
          className="h-6 w-6 border-transparent bg-transparent"
          data-note-header-action=""
          disabled={interactionPending}
          onClick={moveToFront}
          onDoubleClick={stopHeaderAction}
          onPointerDown={stopHeaderAction}
          size="compact"
          tabIndex={commandPressed ? -1 : 0}
        >
          <BringToFrontIcon />
        </IconButton>
        <IconButton
          aria-label="메모를 맨 뒤로"
          className="h-6 w-6 border-transparent bg-transparent"
          data-note-header-action=""
          disabled={interactionPending}
          onClick={moveToBack}
          onDoubleClick={stopHeaderAction}
          onPointerDown={stopHeaderAction}
          size="compact"
          tabIndex={commandPressed ? -1 : 0}
        >
          <SendToBackIcon />
        </IconButton>
        <IconButton
          aria-label="메모 삭제"
          className="h-6 w-6 border-transparent bg-transparent"
          data-note-header-action=""
          disabled={interactionPending}
          onClick={remove}
          onDoubleClick={stopHeaderAction}
          onPointerDown={stopHeaderAction}
          size="compact"
          tabIndex={commandPressed ? -1 : 0}
          tone="danger"
        >
          <RemoveIcon />
        </IconButton>
      </header>
      <textarea
        aria-label="메모 내용"
        className="min-h-0 flex-1 resize-none overflow-auto border-0 bg-transparent px-4 py-3 text-[0.98rem] leading-7 text-ink outline-none placeholder:text-soft-ink"
        id={contentId}
        onBlur={content.save}
        onChange={(event) => content.change(event.target.value)}
        onClick={runContentShortcut}
        onMouseDown={prepareContentShortcut}
        placeholder="메모를 입력하세요"
        value={content.content}
      />
      <ResizeHandle
        direction="north"
        disabled={interactionPending}
        onLostPointerCapture={cancelGeometryGesture}
        onPointerCancel={cancelGeometryGesture}
        onPointerDown={startGeometryGesture}
        onPointerMove={moveGeometryGesture}
        onPointerUp={finishGeometryGesture}
        positionClassName="-left-1 -right-1 -top-1 h-2"
      />
      <ResizeHandle
        direction="south"
        disabled={interactionPending}
        onLostPointerCapture={cancelGeometryGesture}
        onPointerCancel={cancelGeometryGesture}
        onPointerDown={startGeometryGesture}
        onPointerMove={moveGeometryGesture}
        onPointerUp={finishGeometryGesture}
        positionClassName="-bottom-1 -left-1 -right-1 h-2"
      />
      <ResizeHandle
        direction="west"
        disabled={interactionPending}
        onLostPointerCapture={cancelGeometryGesture}
        onPointerCancel={cancelGeometryGesture}
        onPointerDown={startGeometryGesture}
        onPointerMove={moveGeometryGesture}
        onPointerUp={finishGeometryGesture}
        positionClassName="-bottom-1 -left-1 -top-1 w-2"
      />
      <ResizeHandle
        direction="east"
        disabled={interactionPending}
        onLostPointerCapture={cancelGeometryGesture}
        onPointerCancel={cancelGeometryGesture}
        onPointerDown={startGeometryGesture}
        onPointerMove={moveGeometryGesture}
        onPointerUp={finishGeometryGesture}
        positionClassName="-bottom-1 -right-1 -top-1 w-2"
      />
      <ResizeHandle
        direction="north-west"
        disabled={interactionPending}
        onLostPointerCapture={cancelGeometryGesture}
        onPointerCancel={cancelGeometryGesture}
        onPointerDown={startGeometryGesture}
        onPointerMove={moveGeometryGesture}
        onPointerUp={finishGeometryGesture}
        positionClassName="-left-1.5 -top-1.5 h-3 w-3"
      />
      <ResizeHandle
        direction="north-east"
        disabled={interactionPending}
        onLostPointerCapture={cancelGeometryGesture}
        onPointerCancel={cancelGeometryGesture}
        onPointerDown={startGeometryGesture}
        onPointerMove={moveGeometryGesture}
        onPointerUp={finishGeometryGesture}
        positionClassName="-right-1.5 -top-1.5 h-3 w-3"
      />
      <ResizeHandle
        direction="south-west"
        disabled={interactionPending}
        onLostPointerCapture={cancelGeometryGesture}
        onPointerCancel={cancelGeometryGesture}
        onPointerDown={startGeometryGesture}
        onPointerMove={moveGeometryGesture}
        onPointerUp={finishGeometryGesture}
        positionClassName="-bottom-1.5 -left-1.5 h-3 w-3"
      />
      <ResizeHandle
        direction="south-east"
        disabled={interactionPending}
        onLostPointerCapture={cancelGeometryGesture}
        onPointerCancel={cancelGeometryGesture}
        onPointerDown={startGeometryGesture}
        onPointerMove={moveGeometryGesture}
        onPointerUp={finishGeometryGesture}
        positionClassName="-bottom-1.5 -right-1.5 h-3 w-3"
      />
    </article>
  )
}
