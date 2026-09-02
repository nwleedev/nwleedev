"use client"

import { useEffect } from "react"

import type { EditBatchCopyResult } from "../model/edit-batch-copy"

type BatchCopyHistoryShortcutsProps = {
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

export function BatchCopyHistoryShortcuts({
  canRedo,
  canUndo,
  onRedo,
  onUndo,
  pending,
}: BatchCopyHistoryShortcutsProps) {
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
