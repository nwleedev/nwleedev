"use client"

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
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
  target: HTMLButtonElement
  timer: ReturnType<typeof setTimeout>
}

type UseMobileNoteLongPressOptions = {
  disabled: boolean
  longPressEnabled: boolean
  onLongPress(): void
  onShortPress(): void
}

export function useMobileNoteLongPress({
  disabled,
  longPressEnabled,
  onLongPress,
  onShortPress,
}: UseMobileNoteLongPressOptions) {
  const session = useRef<LongPressSession | null>(null)
  const suppressClick = useRef(false)
  const [pressed, setPressed] = useState(false)

  function clearSession(suppressFollowingClick: boolean) {
    setPressed(false)
    const current = session.current

    if (current === null) {
      return
    }

    clearTimeout(current.timer)
    session.current = null
    suppressClick.current = suppressFollowingClick
    if (current.target.hasPointerCapture(current.pointerId)) {
      current.target.releasePointerCapture(current.pointerId)
    }
  }

  const cancelFromWindow = useEffectEvent(() => clearSession(true))
  useEffect(() => {
    function hidden() {
      if (document.visibilityState === "hidden") cancelFromWindow()
    }
    window.addEventListener("blur", cancelFromWindow)
    document.addEventListener("visibilitychange", hidden)
    return () => {
      window.removeEventListener("blur", cancelFromWindow)
      document.removeEventListener("visibilitychange", hidden)
      clearSession(false)
    }
  }, [])

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (session.current !== null) clearSession(true)

    if (event.isPrimary) {
      suppressClick.current = false
      if (!disabled && event.button === 0) setPressed(true)
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
      suppressClick.current = true
      if (longPressEnabled) onLongPress()
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

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = session.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    const movement = Math.hypot(
      event.clientX - current.startX,
      event.clientY - current.startY,
    )

    const inside = current.target.contains(
      document.elementFromPoint(event.clientX, event.clientY),
    )

    if (movement > LONG_PRESS_MOVEMENT_PX || !inside) {
      clearSession(true)
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    setPressed(false)
    const current = session.current

    if (current === null || current.pointerId !== event.pointerId) {
      return
    }

    const releasedInside = event.currentTarget.contains(
      document.elementFromPoint(event.clientX, event.clientY),
    )
    clearTimeout(current.timer)
    session.current = null
    suppressClick.current = current.held || !releasedInside

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
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

  function onClick(event: ReactMouseEvent<HTMLButtonElement>) {
    if (disabled) {
      return
    }

    if (event.detail > 0 && suppressClick.current) {
      suppressClick.current = false
      return
    }

    suppressClick.current = false

    onShortPress()
  }

  function onContextMenu(event: ReactMouseEvent<HTMLButtonElement>) {
    if (session.current !== null) {
      event.preventDefault()
    }
  }

  return {
    pressed,
    handlers: {
    onClick,
    onContextMenu,
    onLostPointerCapture,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave: () => setPressed(false),
    onBlur: () => clearSession(true),
    },
  }
}
