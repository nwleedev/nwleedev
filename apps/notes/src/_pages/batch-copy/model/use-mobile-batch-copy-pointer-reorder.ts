"use client"

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"

import type { MobileBatchCopyEntry } from "@/entities/batch-copy"

const LONG_PRESS_DURATION_MS = 500
const LONG_PRESS_MOVEMENT_PX = 10
const EDGE_SCROLL_DISTANCE_PX = 48
const EDGE_SCROLL_STEP_PX = 12

type TouchSession = {
  active: boolean
  entryId: string
  pointerId: number
  sourceIndex: number
  startX: number
  startY: number
  target: HTMLButtonElement
  targetIndex: number | null
  timer: ReturnType<typeof setTimeout>
}

type DragView = Pick<
  TouchSession,
  "entryId" | "sourceIndex" | "targetIndex"
>

type UseMobileBatchCopyPointerReorderOptions = {
  disabled: boolean
  entries: readonly MobileBatchCopyEntry[]
  onMove(entryId: string, index: number): Promise<boolean>
}

function indexAtPoint(
  list: HTMLOListElement,
  clientX: number,
  clientY: number,
) {
  const bounds = list.getBoundingClientRect()
  const outside =
    clientX < bounds.left ||
    clientX > bounds.right ||
    clientY < bounds.top ||
    clientY > bounds.bottom

  if (outside) {
    return null
  }

  const rows = list.querySelectorAll<HTMLElement>("[data-mobile-batch-copy-position]")

  for (const row of rows) {
    const rowBounds = row.getBoundingClientRect()

    if (clientY < rowBounds.top + rowBounds.height / 2) {
      const position = Number(row.dataset.mobileBatchCopyPosition)
      return Number.isInteger(position) ? position : null
    }
  }

  return Math.max(0, rows.length - 1)
}

export function useMobileBatchCopyPointerReorder({
  disabled,
  entries,
  onMove,
}: UseMobileBatchCopyPointerReorderOptions) {
  const list = useRef<HTMLOListElement>(null)
  const session = useRef<TouchSession | null>(null)
  const handles = useRef(new Map<string, HTMLButtonElement>())
  const [announcement, setAnnouncement] = useState("")
  const [drag, setDrag] = useState<DragView | null>(null)

  function clearSession(releaseCapture: boolean) {
    const current = session.current

    if (current !== null) {
      clearTimeout(current.timer)
    }

    session.current = null
    setDrag(null)

    if (
      releaseCapture &&
      current?.target.hasPointerCapture(current.pointerId)
    ) {
      current.target.releasePointerCapture(current.pointerId)
    }
  }

  const cancelActiveSession = useEffectEvent(() => clearSession(true))

  useEffect(() => {
    const element = list.current

    function preventPan(event: TouchEvent) {
      if (session.current?.active) {
        event.preventDefault()
      }
    }

    function cancelWhenHidden() {
      if (document.visibilityState === "hidden") {
        cancelActiveSession()
      }
    }

    element?.addEventListener("touchmove", preventPan, { passive: false })
    window.addEventListener("blur", cancelActiveSession)
    document.addEventListener("visibilitychange", cancelWhenHidden)

    return () => {
      element?.removeEventListener("touchmove", preventPan)
      window.removeEventListener("blur", cancelActiveSession)
      document.removeEventListener("visibilitychange", cancelWhenHidden)
      cancelActiveSession()
    }
  }, [])

  function registerHandle(entryId: string, element: HTMLButtonElement | null) {
    if (element === null) {
      handles.current.delete(entryId)
    } else {
      handles.current.set(entryId, element)
    }
  }

  function onPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    entryId: string,
    sourceIndex: number,
  ) {
    if (entries[sourceIndex]?.id !== entryId) {
      return
    }

    if (
      disabled ||
      event.pointerType !== "touch" ||
      !event.isPrimary
    ) {
      return
    }

    const pointerId = event.pointerId
    const target = event.currentTarget
    const timer = setTimeout(() => {
      const current = session.current

      if (
        current === null ||
        current.pointerId !== pointerId ||
        !current.target.hasPointerCapture(pointerId)
      ) {
        clearSession(false)
        return
      }

      current.active = true
      setDrag({ entryId, sourceIndex, targetIndex: sourceIndex })
    }, LONG_PRESS_DURATION_MS)

    session.current = {
      active: false,
      entryId,
      pointerId,
      sourceIndex,
      startX: event.clientX,
      startY: event.clientY,
      target,
      targetIndex: sourceIndex,
      timer,
    }
    target.setPointerCapture(pointerId)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = session.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    const movement = Math.hypot(
      event.clientX - current.startX,
      event.clientY - current.startY,
    )

    if (!current.active && movement > LONG_PRESS_MOVEMENT_PX) {
      clearSession(true)
      return
    }

    if (!current.active || list.current === null) {
      return
    }

    const listBounds = list.current.getBoundingClientRect()

    if (event.clientY < listBounds.top + EDGE_SCROLL_DISTANCE_PX) {
      list.current.scrollBy({ top: -EDGE_SCROLL_STEP_PX })
    } else if (
      event.clientY > listBounds.bottom - EDGE_SCROLL_DISTANCE_PX
    ) {
      list.current.scrollBy({ top: EDGE_SCROLL_STEP_PX })
    }

    const targetIndex = indexAtPoint(
      list.current,
      event.clientX,
      event.clientY,
    )
    current.targetIndex = targetIndex
    setDrag({
      entryId: current.entryId,
      sourceIndex: current.sourceIndex,
      targetIndex,
    })
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    if (session.current?.pointerId === event.pointerId) {
      clearSession(false)
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = session.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    const targetIndex = current.targetIndex
    const shouldMove =
      current.active &&
      targetIndex !== null &&
      targetIndex !== current.sourceIndex
    clearSession(true)

    if (shouldMove) {
      void onMove(current.entryId, targetIndex).then((saved) => {
        requestAnimationFrame(() => handles.current.get(current.entryId)?.focus())

        if (saved) {
          setAnnouncement(
            `${current.sourceIndex + 1}번째 항목을 ${targetIndex + 1}번째로 옮겼습니다.`,
          )
        }
      })
    }
  }

  function moveBy(entryId: string, position: number, offset: -1 | 1) {
    const targetIndex = position + offset

    if (targetIndex < 0 || targetIndex >= entries.length) {
      return false
    }

    void onMove(entryId, targetIndex).then((saved) => {
      requestAnimationFrame(() => handles.current.get(entryId)?.focus())

      if (saved) {
        setAnnouncement(
          `${position + 1}번째 항목을 ${targetIndex + 1}번째로 옮겼습니다.`,
        )
      }
    })
    return true
  }

  return {
    announcement,
    drag,
    list,
    moveBy,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    registerHandle,
  }
}
