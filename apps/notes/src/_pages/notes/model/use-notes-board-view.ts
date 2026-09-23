"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react"

import { NOTE_CANVAS_SIZE, type Note } from "@/entities/note"

import {
  fitNotesInView,
  initialBoardView,
  revealNoteInView,
  zoomBoardView,
  type BoardRectangle,
  type BoardView,
} from "./board-view"

const WHEEL_ZOOM_SENSITIVITY = 0.002

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

function wheelDeltaInPixels(event: WheelEvent, viewport: HTMLElement) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
    return event.deltaY
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * viewport.clientHeight
  }

  const typography = getComputedStyle(viewport)
  const lineHeight = Number.parseFloat(typography.lineHeight)
  const fontSize = Number.parseFloat(typography.fontSize)
  const lineStep = Number.isFinite(lineHeight) ? lineHeight : fontSize * 1.2

  return event.deltaY * lineStep
}

export function useNotesBoardView({
  focusedNoteId,
  notes,
  onClearSelection,
}: UseNotesBoardViewOptions) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const lastLinkedNoteId = useRef<string | null>(null)
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

    function releasePanOnDocumentEnd(event: PointerEvent) {
      if (panGesture.current?.pointerId === event.pointerId) {
        panGesture.current = null
      }
    }

    window.addEventListener("keydown", pressSpace)
    window.addEventListener("keyup", releaseSpace)
    window.addEventListener("blur", releaseTransientInput)
    window.addEventListener("pageshow", releaseTransientInput)
    document.addEventListener("pointerup", releasePanOnDocumentEnd)
    document.addEventListener("pointercancel", releasePanOnDocumentEnd)
    document.addEventListener("visibilitychange", releaseTransientInput)

    return () => {
      window.removeEventListener("keydown", pressSpace)
      window.removeEventListener("keyup", releaseSpace)
      window.removeEventListener("blur", releaseTransientInput)
      window.removeEventListener("pageshow", releaseTransientInput)
      document.removeEventListener("pointerup", releasePanOnDocumentEnd)
      document.removeEventListener("pointercancel", releasePanOnDocumentEnd)
      document.removeEventListener("visibilitychange", releaseTransientInput)
    }
  }, [])

  const revealFocusedNote = useCallback((noteId: string) => {
    const viewport = viewportRef.current
    const note = notes.find(({ id }) => id === noteId)

    if (viewport === null || note === undefined) {
      return false
    }

    const viewportBounds = viewport.getBoundingClientRect()
    const controlsBounds = controlsRef.current?.getBoundingClientRect()
    const controls: BoardRectangle | null = controlsBounds === undefined
      ? null
      : {
          bottom: controlsBounds.bottom - viewportBounds.top,
          left: controlsBounds.left - viewportBounds.left,
          right: controlsBounds.right - viewportBounds.left,
          top: controlsBounds.top - viewportBounds.top,
        }

    if (viewport.clientWidth === 0 || viewport.clientHeight === 0) {
      return false
    }

    setView((current) =>
      revealNoteInView(
        current,
        note.geometry,
        { height: viewport.clientHeight, width: viewport.clientWidth },
        controls,
      ),
    )
    return true
  }, [notes])

  useEffect(() => {
    if (focusedNoteId === null) {
      lastLinkedNoteId.current = null
      return
    }

    if (focusedNoteId === lastLinkedNoteId.current) {
      return
    }

    if (revealFocusedNote(focusedNoteId)) {
      lastLinkedNoteId.current = focusedNoteId
    }
  }, [focusedNoteId, revealFocusedNote])

  useEffect(() => {
    const viewport = viewportRef.current

    if (viewport === null) {
      return
    }
    const wheelViewport = viewport

    function handleWheel(event: WheelEvent) {
      if ((!event.ctrlKey && !event.metaKey) || !event.cancelable) {
        return
      }

      event.preventDefault()
      const bounds = wheelViewport.getBoundingClientRect()
      const anchor = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      }
      const pixelDelta = wheelDeltaInPixels(event, wheelViewport)
      const factor = Math.exp(-pixelDelta * WHEEL_ZOOM_SENSITIVITY)

      setView((current) =>
        zoomBoardView(current, current.scale * factor, anchor),
      )
    }

    viewport.addEventListener("wheel", handleWheel, { passive: false })

    return () => viewport.removeEventListener("wheel", handleWheel)
  }, [])

  function adjustScale(change: number) {
    const viewport = viewportRef.current

    if (viewport === null) {
      return
    }

    const anchor = {
      x: viewport.clientWidth / 2,
      y: viewport.clientHeight / 2,
    }

    setView((current) => zoomBoardView(
      current,
      current.scale + change,
      anchor,
    ))
  }

  function moveView(x: number, y: number) {
    setView((current) => ({
      ...current,
      x: current.x + x,
      y: current.y + y,
    }))
  }

  function fitAllNotes() {
    const element = viewportRef.current

    if (element === null) {
      return
    }

    setView(fitNotesInView(notes, {
      height: element.clientHeight,
      width: element.clientWidth,
    }))
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
    controlsRef,
    continuePan,
    finishPan,
    fitAllNotes,
    moveView,
    originX: view.originX,
    originY: view.originY,
    revealFocusedNote,
    scale: view.scale,
    scaleText: `${Math.round(view.scale * 100).toLocaleString("ko-KR")}%`,
    startBackgroundPan,
    startSpacePan,
    viewportRef,
  }
}
