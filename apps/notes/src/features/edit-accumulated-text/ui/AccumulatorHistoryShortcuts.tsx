"use client"

import { useEffect } from "react"

import type { EditAccumulatorResult } from "../model/editAccumulatedText"

type AccumulatorHistoryShortcutsProps = {
  canRedo: boolean
  canUndo: boolean
  pending: boolean
  onRedo(): Promise<EditAccumulatorResult>
  onUndo(): Promise<EditAccumulatorResult>
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

export function AccumulatorHistoryShortcuts({
  canRedo,
  canUndo,
  onRedo,
  onUndo,
  pending,
}: AccumulatorHistoryShortcutsProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (pending || event.defaultPrevented) {
        return
      }

      if (isTextEditingTarget(event.target)) {
        return
      }

      const commandModifier = event.metaKey || event.ctrlKey

      if (!commandModifier || event.altKey) {
        return
      }

      if (event.key.toLowerCase() !== "z") {
        return
      }

      if (event.shiftKey && canRedo) {
        event.preventDefault()
        void onRedo()
        return
      }

      if (!event.shiftKey && canUndo) {
        event.preventDefault()
        void onUndo()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [canRedo, canUndo, onRedo, onUndo, pending])

  return null
}
