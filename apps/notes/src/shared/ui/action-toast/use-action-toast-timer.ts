"use client"

import { useCallback, useEffect, useRef } from "react"

type UseActionToastTimerOptions = {
  durationMs: number
  expiresAtMs?: number
  onDismiss(): void
  revision: number
}

export function useActionToastTimer({
  durationMs,
  expiresAtMs,
  onDismiss,
  revision,
}: UseActionToastTimerOptions) {
  const remainingMs = useRef(durationMs)
  const startedAtMs = useRef(0)
  const timer = useRef<number | null>(null)
  const paused = useRef(false)
  const pointerInside = useRef(false)
  const closeButton = useRef<HTMLButtonElement | null>(null)
  const toast = useRef<HTMLDivElement | null>(null)
  const returnFocusTarget = useRef<HTMLElement | null>(null)

  const closeButtonRef = useCallback((element: HTMLButtonElement | null) => {
    closeButton.current = element
  }, [])

  const dismissToast = useCallback(() => {
    const restoreFocus = document.activeElement === closeButton.current
    const target = returnFocusTarget.current

    onDismiss()

    if (!restoreFocus || target === null) {
      return
    }

    window.requestAnimationFrame(() => {
      if (!target.isConnected || target.matches(":disabled")) {
        return
      }

      target.focus()
    })
  }, [onDismiss])

  function clearTimer() {
    if (timer.current === null) {
      return
    }

    window.clearTimeout(timer.current)
    timer.current = null
  }

  useEffect(() => {
    const activeElement = document.activeElement

    if (
      activeElement instanceof HTMLElement &&
      activeElement !== document.body &&
      !toast.current?.contains(activeElement)
    ) {
      returnFocusTarget.current = activeElement
    }

    remainingMs.current = expiresAtMs === undefined
      ? durationMs
      : Math.max(0, expiresAtMs - Date.now())
    paused.current = (
      pointerInside.current ||
      (document.activeElement instanceof Node &&
        toast.current?.contains(document.activeElement) === true)
    )
    clearTimer()
    startedAtMs.current = Date.now()

    if (!paused.current) {
      timer.current = window.setTimeout(() => {
        timer.current = null
        dismissToast()
      }, remainingMs.current)
    }

    return clearTimer
  }, [dismissToast, durationMs, expiresAtMs, revision])

  const pause = useCallback(() => {
    if (paused.current || timer.current === null) {
      return
    }

    const elapsedMs = Date.now() - startedAtMs.current

    remainingMs.current = Math.max(0, remainingMs.current - elapsedMs)
    paused.current = true
    clearTimer()
  }, [])

  const resume = useCallback(() => {
    if (!paused.current) {
      return
    }

    const focusWithin =
      document.activeElement instanceof Node &&
      toast.current?.contains(document.activeElement) === true

    if (pointerInside.current || focusWithin) {
      return
    }

    paused.current = false
    clearTimer()
    startedAtMs.current = Date.now()
    timer.current = window.setTimeout(() => {
      timer.current = null
      dismissToast()
    }, remainingMs.current)
  }, [dismissToast])

  useEffect(() => {
    function trackPointer(event: PointerEvent) {
      if (event.pointerType === "touch") {
        return
      }

      const bounds = toast.current?.getBoundingClientRect()
      pointerInside.current = bounds !== undefined &&
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom

      if (pointerInside.current) {
        pause()
      } else {
        resume()
      }
    }

    window.addEventListener("pointermove", trackPointer)

    return () => window.removeEventListener("pointermove", trackPointer)
  }, [pause, resume])

  return { closeButtonRef, dismiss: dismissToast, pause, resume, toastRef: toast }
}
