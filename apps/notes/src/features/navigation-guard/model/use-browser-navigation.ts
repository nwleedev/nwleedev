import { useLayoutEffect } from "react"

import type { NavigationContinuation } from "./use-guard"

function readPosition(state: unknown): number | null {
  if (state === null || typeof state !== "object") return null
  if (!("notesHistoryPosition" in state)) return null
  const value = state.notesHistoryPosition
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null
}

function withPosition(state: unknown, position: number) {
  const previous = state !== null && typeof state === "object" ? state : {}
  return { ...previous, notesHistoryPosition: position }
}

export function useBrowserNavigation(
  requestNavigation: (continueNavigation: NavigationContinuation) => boolean,
) {
  useLayoutEffect(() => {
    const history = window.history
    const originalPush = history.pushState
    const originalReplace = history.replaceState
    let active = true
    let position = readPosition(history.state) ?? 0
    let restoring = false
    let resumeAfterRestore: NavigationContinuation | null = null
    let acceptedPosition: number | null = null

    function push(data: unknown, unused: string, url?: string | URL | null) {
      if (!active) return originalPush.call(history, data, unused, url)
      const next = position + 1
      originalPush.call(history, withPosition(data, next), unused, url)
      position = next
    }

    function replace(data: unknown, unused: string, url?: string | URL | null) {
      const state = active ? withPosition(data, position) : data
      originalReplace.call(history, state, unused, url)
    }

    function traverse(event: PopStateEvent) {
      const next = readPosition(event.state)
      if (next === null) return
      if (restoring) {
        event.stopImmediatePropagation()
        if (next !== position) {
          history.go(position - next)
          return
        }
        restoring = false
        const resume = resumeAfterRestore
        resumeAfterRestore = null
        resume?.()
        return
      }
      if (next === acceptedPosition) {
        acceptedPosition = null
        position = next
        return
      }
      const delta = next - position
      if (delta === 0) return
      const resume = () => {
        acceptedPosition = next
        history.go(delta)
      }
      const blocked = requestNavigation(() => {
        if (restoring) resumeAfterRestore = resume
        else resume()
      })
      if (!blocked) {
        position = next
        return
      }
      event.stopImmediatePropagation()
      restoring = true
      history.go(-delta)
    }

    originalReplace.call(history, withPosition(history.state, position), "")
    history.pushState = push
    history.replaceState = replace
    window.addEventListener("popstate", traverse, true)
    return () => {
      active = false
      window.removeEventListener("popstate", traverse, true)
      if (history.pushState === push) history.pushState = originalPush
      if (history.replaceState === replace) history.replaceState = originalReplace
    }
  }, [requestNavigation])
}
