"use client"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react"

import { NOTE_CANVAS_SIZE, type Note } from "@/entities/note"

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

type UseNotesBoardViewOptions = {
  focusedNoteId: string | null
  notes: readonly Note[]
  onClearSelection(): void
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

export function useNotesBoardView({
  focusedNoteId,
  notes,
  onClearSelection,
}: UseNotesBoardViewOptions) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const panGesture = useRef<PanGesture | null>(null)
  const [spacePressed, setSpacePressed] = useState(false)
  const [view, setView] = useState<BoardView>(() =>
    initialBoardView(notes, focusedNoteId),
  )

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

  function resetViewportScroll() {
    const element = viewportRef.current

    if (element !== null) {
      element.scrollLeft = 0
      element.scrollTop = 0
    }
  }

  function fitAllNotes() {
    const element = viewportRef.current

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
      event.target === event.currentTarget || event.target === boardRef.current

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

    if (gesture?.pointerId === event.pointerId) {
      panGesture.current = null
    }
  }

  const boardStyle: CSSProperties = {
    height: NOTE_CANVAS_SIZE * view.scale,
    transform: `translate(${view.x}px, ${view.y}px)`,
    transformOrigin: "0 0",
    width: NOTE_CANVAS_SIZE * view.scale,
  }

  return {
    adjustScale,
    boardRef,
    boardStyle,
    cancelPan,
    continuePan,
    finishPan,
    fitAllNotes,
    moveView,
    originX: view.originX,
    originY: view.originY,
    resetViewportScroll,
    scale: view.scale,
    scaleText: `${Math.round(view.scale * 100).toLocaleString("ko-KR")}%`,
    startBackgroundPan,
    startSpacePan,
    viewportRef,
  }
}
