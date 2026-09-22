"use client"

import { useEffect, useEffectEvent, useRef } from "react"

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
  const dismiss = useEffectEvent(onDismiss)
  const remainingMs = useRef(durationMs)
  const startedAtMs = useRef(0)
  const timer = useRef<number | null>(null)
  const paused = useRef(false)

  function clearTimer() {
    if (timer.current === null) {
      return
    }

    window.clearTimeout(timer.current)
    timer.current = null
  }

  useEffect(() => {
    remainingMs.current = expiresAtMs === undefined
      ? durationMs
      : Math.max(0, expiresAtMs - Date.now())
    paused.current = false
    clearTimer()
    startedAtMs.current = Date.now()
    timer.current = window.setTimeout(() => {
      timer.current = null
      dismiss()
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
      onDismiss()
    }, remainingMs.current)
  }

  return { pause, resume }
}
