"use client"

import { useEffect, useState } from "react"

export function useNoteSelectionKeys(
  clearSelection: () => void,
  clearSelections: () => void,
) {
  const [commandPressed, setCommandPressed] = useState(false)

  useEffect(() => {
    function clearSelectionForCommand() {
      const activeElement = document.activeElement

      if (!(activeElement instanceof HTMLElement)) {
        clearSelection()
        return
      }

      if (activeElement.closest("[data-note-header-actions]") === null) {
        clearSelection()
        return
      }

      activeElement
        .closest<HTMLElement>("article")
        ?.focus({ preventScroll: true })
      clearSelection()
    }

    function updateCommandState(event: KeyboardEvent | PointerEvent) {
      if (!event.isTrusted) {
        return
      }

      setCommandPressed(event.metaKey)

      if (event.metaKey) {
        clearSelectionForCommand()
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!event.isTrusted) {
        return
      }

      updateCommandState(event)

      if (event.defaultPrevented || event.key !== "Escape") {
        return
      }

      if (event.isComposing) {
        return
      }

      if (event.metaKey || event.altKey) {
        return
      }

      if (event.ctrlKey || event.shiftKey) {
        return
      }

      clearSelections()
    }

    function handleKeyUp(event: KeyboardEvent) {
      updateCommandState(event)
    }

    function handlePointerDown(event: PointerEvent) {
      updateCommandState(event)
    }

    function resetCommandState(event: Event) {
      if (!event.isTrusted) {
        return
      }

      setCommandPressed(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("pointerdown", handlePointerDown, true)
    window.addEventListener("blur", resetCommandState)
    window.addEventListener("focus", resetCommandState)
    window.addEventListener("pageshow", resetCommandState)
    document.addEventListener("visibilitychange", resetCommandState)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("pointerdown", handlePointerDown, true)
      window.removeEventListener("blur", resetCommandState)
      window.removeEventListener("focus", resetCommandState)
      window.removeEventListener("pageshow", resetCommandState)
      document.removeEventListener("visibilitychange", resetCommandState)
    }
  }, [clearSelection, clearSelections])

  return commandPressed
}
