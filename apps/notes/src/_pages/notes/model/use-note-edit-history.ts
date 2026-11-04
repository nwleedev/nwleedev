"use client"

import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent, type RefObject } from "react"

import { createNoteEditHistory, recordNoteEdit, replayNoteEdit, type EditSelection } from "./note-edit-history"

type HistoryOptions = {
  editor: RefObject<HTMLTextAreaElement | null>
  readContent(): string
  replaceContent(content: string): void
}

function readSelection(element: HTMLTextAreaElement): EditSelection {
  return { start: element.selectionStart, end: element.selectionEnd, direction: element.selectionDirection }
}

export function useNoteEditHistory({ editor, readContent, replaceContent }: HistoryOptions) {
  const history = useRef(createNoteEditHistory())
  const selection = useRef<EditSelection>({ start: 0, end: 0, direction: "none" })
  const composition = useRef<{ content: string; selection: EditSelection } | null>(null)
  const [available, setAvailable] = useState({ undo: false, redo: false, composing: false })

  function publish() {
    const next = { undo: history.current.past.length > 0, redo: history.current.future.length > 0, composing: composition.current !== null }
    setAvailable((current) => current.undo === next.undo && current.redo === next.redo && current.composing === next.composing ? current : next)
  }

  function replay(direction: "undo" | "redo") {
    if (composition.current !== null) return
    const result = replayNoteEdit(history.current, readContent(), direction)
    if (result === null) return
    history.current = result.history
    selection.current = result.selection
    replaceContent(result.content)
    const element = editor.current
    if (element) {
      element.focus({ preventScroll: true })
      element.setSelectionRange(result.selection.start, result.selection.end, result.selection.direction)
    }
    publish()
  }

  const beforeInput = useEffectEvent((event: InputEvent) => {
    if (event.inputType === "historyUndo" || event.inputType === "historyRedo") {
      if (event.cancelable) {
        event.preventDefault()
        replay(event.inputType === "historyUndo" ? "undo" : "redo")
      }
      return
    }
    if (editor.current) selection.current = readSelection(editor.current)
  })

  useEffect(() => {
    const element = editor.current
    function capture(event: InputEvent) { beforeInput(event) }
    element?.addEventListener("beforeinput", capture)
    return () => element?.removeEventListener("beforeinput", capture)
  }, [editor])

  function record(element: HTMLTextAreaElement, inputType: string) {
    if (inputType === "historyUndo" || inputType === "historyRedo") {
      element.value = readContent()
      replay(inputType === "historyUndo" ? "undo" : "redo")
      return
    }
    if (composition.current !== null) return
    const afterSelection = readSelection(element)
    history.current = recordNoteEdit(history.current, {
      before: readContent(), after: element.value, beforeSelection: selection.current, afterSelection, inputType, time: performance.now(),
    })
    selection.current = afterSelection
    publish()
  }

  function startComposition() {
    const element = editor.current
    if (!element) return
    composition.current = { content: readContent(), selection: readSelection(element) }
    history.current = { ...history.current, grouping: false }
    publish()
  }

  function endComposition() {
    const start = composition.current
    const element = editor.current
    composition.current = null
    if (start && element) {
      const afterSelection = readSelection(element)
      history.current = recordNoteEdit(history.current, {
        before: start.content, after: element.value, beforeSelection: start.selection, afterSelection, inputType: "insertCompositionText", time: performance.now(),
      })
      selection.current = afterSelection
    }
    publish()
  }

  function select() {
    const element = editor.current
    if (!element) return
    const next = readSelection(element)
    const previous = selection.current
    if (next.start !== previous.start || next.end !== previous.end) history.current = { ...history.current, grouping: false }
    selection.current = next
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || event.altKey) return
    if (!event.metaKey && !event.ctrlKey) return
    const key = event.key.toLowerCase()
    if (key !== "z" && key !== "y") return
    event.preventDefault()
    replay(key === "y" || event.shiftKey ? "redo" : "undo")
  }

  return { available, endComposition, keyDown, record, replay, select, startComposition }
}
