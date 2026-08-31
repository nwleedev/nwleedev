"use client"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"

import type { Note, NoteGeometry } from "@/entities/note"
import type {
  AccumulateNoteResult,
  AccumulationRequest,
} from "@/features/accumulate-note"
import { joinClassNames } from "@/shared/lib/join-class-names"

import type { CopyNoteResult } from "../model/copyNote"
import {
  NoteActions,
  type NoteInteractionNotice,
} from "./NoteActions"
import { NoteEditor } from "./NoteEditor"
import { NoteGeometryControls } from "./NoteGeometryControls"

const NOTE_LONG_PRESS_DELAY_MS = 500
const NOTE_LONG_PRESS_MOVEMENT_PX = 10

type GeometryGesture = {
  geometry: NoteGeometry
  mode: "move" | "resize"
  pointerId: number
  startX: number
  startY: number
}

type MobilePressGesture = {
  cancelled: boolean
  pointerId: number
  qualified: boolean
  startX: number
  startY: number
  timer: ReturnType<typeof setTimeout>
}

type NoteCardProps = {
  accumulatedSelected: boolean
  accumulationReady: boolean
  draftContent: string
  editing: boolean
  metaClickEnabled: boolean
  note: Note
  placement: "board" | "list"
  scale?: number
  selected: boolean
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

function hasTextSelection(element: HTMLElement) {
  const selection = window.getSelection()

  if (selection === null || selection.isCollapsed) {
    return false
  }

  const anchorSelected = element.contains(selection.anchorNode)
  const focusSelected = element.contains(selection.focusNode)
  return anchorSelected || focusSelected
}

function isInside(element: HTMLElement, clientX: number, clientY: number) {
  const bounds = element.getBoundingClientRect()
  const withinHorizontal = clientX >= bounds.left && clientX <= bounds.right
  const withinVertical = clientY >= bounds.top && clientY <= bounds.bottom
  return withinHorizontal && withinVertical
}

function isMetaAccumulationClick(
  event: ReactMouseEvent<HTMLDivElement>,
  enabled: boolean,
) {
  if (!enabled || !event.metaKey) {
    return false
  }

  if (event.altKey || event.ctrlKey) {
    return false
  }

  if (event.shiftKey) {
    return false
  }

  return event.button === 0
}

export function NoteCard({
  accumulatedSelected,
  accumulationReady,
  draftContent,
  editing,
  metaClickEnabled,
  note,
  onAccumulate,
  onAccumulated,
  onBeginEditing,
  onCopy,
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
  const [mobilePressActive, setMobilePressActive] = useState(false)
  const [notice, setNotice] = useState<NoteInteractionNotice | null>(null)
  const [pending, setPending] = useState(false)
  const gesture = useRef<GeometryGesture | null>(null)
  const mobilePress = useRef<MobilePressGesture | null>(null)
  const suppressNextClick = useRef(false)
  const boardPlacement = placement === "board"
  const showBoardControls = boardPlacement && !editing
  const showGeometryControls = showBoardControls && selected
  const contentText = note.content || "빈 메모"
  const cardClassName = joinClassNames(
    "flex min-h-40 flex-col gap-3 overflow-auto rounded-note border bg-surface-raised p-3 shadow-note transition-[border-color,box-shadow] duration-[var(--notes-motion-fast)]",
    boardPlacement ? "absolute" : "relative",
    selected ? "border-action shadow-floating" : "border-line",
    accumulatedSelected ? "ring-2 ring-action ring-offset-2" : undefined,
  )
  const contentClassName = joinClassNames(
    "min-h-0 flex-1 cursor-copy touch-pan-y overflow-auto rounded-control p-1",
    mobilePressActive
      ? "select-none [-webkit-touch-callout:none]"
      : "select-text",
    accumulatedSelected ? "bg-action/10" : undefined,
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

  useEffect(() => {
    return () => {
      if (mobilePress.current !== null) {
        clearTimeout(mobilePress.current.timer)
      }
    }
  }, [])

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
    if (pending) {
      return
    }

    setErrorMessage("")
    setNotice(null)
    onBeginEditing(note)
  }

  async function performCopy() {
    if (pending) {
      return
    }

    setPending(true)
    const result = await onCopy(note)

    if (result.status === "copied") {
      setNotice({ kind: "status", message: "복사했습니다.", retry: null })
    } else if (result.status === "usage-failure") {
      setNotice({
        kind: "error",
        message: "텍스트는 복사했지만 사용 횟수를 기록하지 못했습니다.",
        retry: null,
      })
    } else {
      setNotice({
        kind: "error",
        message:
          "복사하지 못했습니다. 브라우저의 클립보드 권한을 확인하세요.",
        retry: "copy",
      })
    }

    setPending(false)
  }

  async function performAccumulation(selectForMobile: boolean) {
    if (pending) {
      return
    }

    setPending(true)
    const result = await onAccumulate(note, { selectForMobile })

    if (result.status === "accumulated") {
      setNotice({ kind: "status", message: "누적했습니다.", retry: null })
      onAccumulated()
    } else {
      setNotice({
        kind: "error",
        message: "누적하지 못했습니다. 다시 시도하세요.",
        retry: "accumulate",
      })
    }

    setPending(false)
  }

  function copyFromButton() {
    void performCopy()
  }

  function accumulateFromButton() {
    void performAccumulation(false)
  }

  function retryInteraction() {
    if (notice?.retry === "copy") {
      void performCopy()
      return
    }

    if (notice?.retry === "accumulate") {
      void performAccumulation(false)
    }
  }

  function startMobilePress(event: ReactPointerEvent<HTMLDivElement>) {
    const unavailable = placement !== "list" || event.pointerType === "mouse"

    if (unavailable || event.button !== 0) {
      return
    }

    const pointerId = event.pointerId
    const timer = setTimeout(() => {
      const current = mobilePress.current

      if (current?.pointerId === pointerId && !current.cancelled) {
        current.qualified = true
      }
    }, NOTE_LONG_PRESS_DELAY_MS)
    mobilePress.current = {
      cancelled: false,
      pointerId,
      qualified: false,
      startX: event.clientX,
      startY: event.clientY,
      timer,
    }
    setMobilePressActive(true)
    event.currentTarget.setPointerCapture(pointerId)
  }

  function moveMobilePress(event: ReactPointerEvent<HTMLDivElement>) {
    const current = mobilePress.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    const movement = Math.hypot(
      event.clientX - current.startX,
      event.clientY - current.startY,
    )

    if (movement <= NOTE_LONG_PRESS_MOVEMENT_PX) {
      return
    }

    clearTimeout(current.timer)
    current.cancelled = true
  }

  function cancelMobilePress(event: ReactPointerEvent<HTMLDivElement>) {
    const current = mobilePress.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    clearTimeout(current.timer)
    current.cancelled = true
    mobilePress.current = null
    setMobilePressActive(false)
    suppressNextClick.current = true
  }

  function finishMobilePress(event: ReactPointerEvent<HTMLDivElement>) {
    const current = mobilePress.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    clearTimeout(current.timer)
    mobilePress.current = null
    setMobilePressActive(false)
    suppressNextClick.current = true

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (current.cancelled) {
      return
    }

    if (!isInside(event.currentTarget, event.clientX, event.clientY)) {
      return
    }

    if (hasTextSelection(event.currentTarget)) {
      return
    }

    if (current.qualified) {
      if (!accumulatedSelected) {
        void performAccumulation(true)
      }

      return
    }

    if (!accumulatedSelected) {
      void performCopy()
    }
  }

  function handleContentClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (suppressNextClick.current) {
      suppressNextClick.current = false
      return
    }

    if (hasTextSelection(event.currentTarget)) {
      return
    }

    if (isMetaAccumulationClick(event, metaClickEnabled)) {
      void performAccumulation(false)
      return
    }

    void performCopy()
  }

  return (
    <article
      className={cardClassName}
      onFocusCapture={() => onSelect(note.id)}
      onPointerDown={() => onSelect(note.id)}
      style={boardStyle}
    >
      {editing ? null : (
        <header className="grid gap-2 border-b border-line pb-2">
          <div className="flex items-start gap-2">
            {showBoardControls ? (
              <button
                aria-label="메모 이동"
                className="min-h-[var(--notes-control-size)] cursor-grab rounded-control border border-line bg-canvas px-3 text-xs font-semibold text-soft-ink active:cursor-grabbing"
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
            <div className="min-w-0 flex-1">
              {accumulatedSelected ? (
                <p className="mb-2 text-right text-xs font-semibold text-action">
                  누적 선택됨
                </p>
              ) : null}
              <NoteActions
                accumulationReady={accumulationReady}
                notice={notice}
                onAccumulate={accumulateFromButton}
                onCopy={copyFromButton}
                onEdit={beginEditing}
                onRetry={retryInteraction}
                pending={pending}
              />
            </div>
          </div>
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
        <div
          className={contentClassName}
          onClick={handleContentClick}
          onLostPointerCapture={cancelMobilePress}
          onPointerCancel={cancelMobilePress}
          onPointerDown={startMobilePress}
          onPointerMove={moveMobilePress}
          onPointerUp={finishMobilePress}
        >
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
