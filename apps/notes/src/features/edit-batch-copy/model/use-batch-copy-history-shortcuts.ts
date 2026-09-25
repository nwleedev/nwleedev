"use client"

import { useEffect, useEffectEvent } from "react"

import type { EditBatchCopyResult } from "./save-changes"

type BatchCopyHistoryShortcuts = {
  canRedo: boolean
  canUndo: boolean
  pending: boolean
  onRedo(): Promise<EditBatchCopyResult>
  onUndo(): Promise<EditBatchCopyResult>
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

export function useBatchCopyHistoryShortcuts({
  canRedo,
  canUndo,
  onRedo,
  onUndo,
  pending,
}: BatchCopyHistoryShortcuts) {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
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
  })

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])
}
