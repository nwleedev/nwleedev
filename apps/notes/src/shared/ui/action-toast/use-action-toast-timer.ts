"use client"

import { useCallback, useEffect, useEffectEvent, useRef } from "react"

type UseActionToastTimerOptions = {
  durationMs: number
  expiresAtMs?: number
  onDismiss(): void
  pausable: boolean
  revision: number
}

export function useActionToastTimer({
  durationMs,
  expiresAtMs,
  onDismiss,
  pausable,
  revision,
}: UseActionToastTimerOptions) {
  const remainingMs = useRef(durationMs)
  const startedAtMs = useRef(0)
  const timer = useRef<number | null>(null)
  const paused = useRef(false)
  const closeButton = useRef<HTMLButtonElement | null>(null)
  const toast = useRef<HTMLDivElement | null>(null)
  const returnFocusTarget = useRef<HTMLElement | null>(null)

  const closeButtonRef = useCallback((element: HTMLButtonElement | null) => {
    closeButton.current = element
  }, [])

  function dismissToast() {
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
  }

  const dismissOnTimer = useEffectEvent((scheduledRevision: number) => {
    if (scheduledRevision === revision) {
      dismissToast()
    }
  })

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
    paused.current = false
    clearTimer()
    startedAtMs.current = Date.now()
    timer.current = window.setTimeout(() => {
      timer.current = null
      dismissOnTimer(revision)
    }, remainingMs.current)

    return clearTimer
  }, [durationMs, expiresAtMs, revision])

  function pause() {
    if (!pausable || paused.current || timer.current === null) {
      return
    }

    const elapsedMs = Date.now() - startedAtMs.current

    remainingMs.current = Math.max(0, remainingMs.current - elapsedMs)
    paused.current = true
    clearTimer()
  }

  function resume() {
    if (!pausable || !paused.current) {
      return
    }

    paused.current = false
    clearTimer()
    startedAtMs.current = Date.now()
    timer.current = window.setTimeout(() => {
      timer.current = null
      dismissToast()
    }, remainingMs.current)
  }

  return { closeButtonRef, dismiss: dismissToast, pause, resume, toastRef: toast }
}
