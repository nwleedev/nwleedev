"use client"

import {
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"

const LONG_PRESS_DURATION_MS = 500
const LONG_PRESS_MOVEMENT_PX = 10

type LongPressSession = {
  held: boolean
  pointerId: number
  startX: number
  startY: number
  target: HTMLAnchorElement
  timer: ReturnType<typeof setTimeout>
}

type UseMobileNoteLongPressOptions = {
  disabled: boolean
  longPressEnabled: boolean
  onLongPress(): void
  onShortPress(): void
  shortPressHandled: boolean
}

export function useMobileNoteLongPress({
  disabled,
  longPressEnabled,
  onLongPress,
  onShortPress,
  shortPressHandled,
}: UseMobileNoteLongPressOptions) {
  const session = useRef<LongPressSession | null>(null)
  const suppressClick = useRef(false)

  function clearSession(suppressFollowingClick: boolean) {
    const current = session.current

    if (current === null) {
      return
    }

    clearTimeout(current.timer)
    session.current = null
    suppressClick.current = suppressFollowingClick
  }

  useEffect(() => () => clearSession(false), [])

  function onPointerDown(event: ReactPointerEvent<HTMLAnchorElement>) {
    if (event.isPrimary) {
      suppressClick.current = false
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
        clearSession(true)
        return
      }

      current.held = true
    }, LONG_PRESS_DURATION_MS)

    session.current = {
      held: false,
      pointerId,
      startX: event.clientX,
      startY: event.clientY,
      target,
      timer,
    }
    target.setPointerCapture(pointerId)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLAnchorElement>) {
    const current = session.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    const movement = Math.hypot(
      event.clientX - current.startX,
      event.clientY - current.startY,
    )

    if (movement > LONG_PRESS_MOVEMENT_PX) {
      clearSession(true)
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLAnchorElement>) {
    const current = session.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    const releasedInside = event.currentTarget.contains(
      document.elementFromPoint(event.clientX, event.clientY),
    )
    const shouldRunLongPress =
      current.held && releasedInside && longPressEnabled
    clearTimeout(current.timer)
    session.current = null
    suppressClick.current = current.held || !releasedInside

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (shouldRunLongPress) {
      onLongPress()
    }
  }

  function onPointerCancel() {
    clearSession(true)
  }

  function onLostPointerCapture() {
    if (session.current !== null) {
      clearSession(true)
    }
  }

  function onClick(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (disabled) {
      event.preventDefault()
      return
    }

    if (event.detail > 0 && suppressClick.current) {
      suppressClick.current = false
      event.preventDefault()
      return
    }

    suppressClick.current = false

    if (shortPressHandled) {
      event.preventDefault()
      onShortPress()
    }
  }

  function onContextMenu(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (session.current !== null) {
      event.preventDefault()
    }
  }

  return {
    onClick,
    onContextMenu,
    onLostPointerCapture,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
