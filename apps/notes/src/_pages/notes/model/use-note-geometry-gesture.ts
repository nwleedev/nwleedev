"use client"

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"

import {
  NOTE_HEIGHT_MAX,
  NOTE_HEIGHT_MIN,
  NOTE_WIDTH_MAX,
  NOTE_WIDTH_MIN,
  validateAndClampNoteGeometry,
  type Note,
  type NoteGeometry,
} from "@/entities/note"

export type NoteResizeDirection =
  | "east"
  | "north"
  | "north-east"
  | "north-west"
  | "south"
  | "south-east"
  | "south-west"
  | "west"

type GeometryGesture = {
  action: "move" | NoteResizeDirection
  geometry: NoteGeometry
  moved: boolean
  pointerId: number
  pointerType: string
  startX: number
  startY: number
}

type UseNoteGeometryGestureOptions = {
  note: Note
  scale: number
  disabled: boolean
  onFailure(message: string): void
  onSave(note: Note, geometry: NoteGeometry): Promise<Note>
}

function movementThreshold(pointerType: string) {
  return pointerType === "touch" ? 10 : 5
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

function resizedGeometry(
  geometry: NoteGeometry,
  direction: NoteResizeDirection,
  deltaX: number,
  deltaY: number,
) {
  let height = geometry.height
  let width = geometry.width
  let x = geometry.x
  let y = geometry.y

  if (direction.includes("east")) {
    width = clamp(geometry.width + deltaX, NOTE_WIDTH_MIN, NOTE_WIDTH_MAX)
  }

  if (direction.includes("south")) {
    height = clamp(geometry.height + deltaY, NOTE_HEIGHT_MIN, NOTE_HEIGHT_MAX)
  }

  if (direction.includes("west")) {
    const right = geometry.x + geometry.width

    width = clamp(geometry.width - deltaX, NOTE_WIDTH_MIN, NOTE_WIDTH_MAX)
    x = right - width
  }

  if (direction.includes("north")) {
    const bottom = geometry.y + geometry.height

    height = clamp(geometry.height - deltaY, NOTE_HEIGHT_MIN, NOTE_HEIGHT_MAX)
    y = bottom - height
  }

  return validateAndClampNoteGeometry({ ...geometry, height, width, x, y })
}

function geometryFromGesture(
  event: ReactPointerEvent<HTMLElement>,
  gesture: GeometryGesture,
  scale: number,
) {
  const deltaX = Math.round((event.clientX - gesture.startX) / scale)
  const deltaY = Math.round((event.clientY - gesture.startY) / scale)

  if (gesture.action === "move") {
    return validateAndClampNoteGeometry({
      ...gesture.geometry,
      x: gesture.geometry.x + deltaX,
      y: gesture.geometry.y + deltaY,
    })
  }

  return resizedGeometry(gesture.geometry, gesture.action, deltaX, deltaY)
}

export function useNoteGeometryGesture({
  disabled,
  note,
  onFailure,
  onSave,
  scale,
}: UseNoteGeometryGestureOptions) {
  const [preview, setPreview] = useState<NoteGeometry | null>(null)
  const [saving, setSaving] = useState(false)
  const gesture = useRef<GeometryGesture | null>(null)
  const clickSuppressed = useRef(false)
  const suppressClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const geometry = preview ?? note.geometry

  useEffect(() => {
    return () => {
      if (suppressClickTimer.current !== null) {
        clearTimeout(suppressClickTimer.current)
      }
    }
  }, [])

  function suppressClickSequence() {
    clickSuppressed.current = true

    if (suppressClickTimer.current !== null) {
      clearTimeout(suppressClickTimer.current)
    }

    suppressClickTimer.current = setTimeout(() => {
      clickSuppressed.current = false
      suppressClickTimer.current = null
    }, 0)
  }

  function releasePointer(event: ReactPointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function start(
    event: ReactPointerEvent<HTMLElement>,
    action: GeometryGesture["action"],
  ) {
    if (disabled || saving || event.button !== 0) {
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

  function fail(event: ReactPointerEvent<HTMLElement>) {
    gesture.current = null
    setPreview(null)
    releasePointer(event)
    suppressClickSequence()
    onFailure("메모 위치와 크기를 계산하지 못했습니다. 다시 시도하세요.")
  }

  function calculate(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current

    if (current === null || current.pointerId !== event.pointerId) {
      return null
    }

    try {
      return geometryFromGesture(event, current, scale)
    } catch {
      fail(event)
      return null
    }
  }

  function move(event: ReactPointerEvent<HTMLElement>) {
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
    const nextGeometry = calculate(event)

    if (nextGeometry !== null) {
      setPreview(nextGeometry)
    }
  }

  async function persist(nextGeometry: NoteGeometry) {
    setSaving(true)

    try {
      await onSave(note, nextGeometry)
    } catch {
      onFailure("메모 위치와 크기를 저장하지 못했습니다. 다시 시도하세요.")
    } finally {
      setPreview(null)
      setSaving(false)
    }
  }

  function finish(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    if (!current.moved) {
      gesture.current = null
      releasePointer(event)
      return
    }

    const nextGeometry = calculate(event)

    if (nextGeometry === null) {
      return
    }

    gesture.current = null
    releasePointer(event)
    suppressClickSequence()
    setPreview(nextGeometry)
    void persist(nextGeometry)
  }

  function cancel(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    gesture.current = null
    setPreview(null)
    suppressClickSequence()
  }

  return {
    cancel,
    finish,
    geometry,
    move,
    saving,
    start,
    wasClickSuppressed: () => clickSuppressed.current,
  }
}
