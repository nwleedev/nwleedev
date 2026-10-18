"use client"

import { useRef, useState, type RefObject } from "react"

import { mobileNotePosition, type Note, type MobileNotePosition } from "@/entities/note"

type SheetState =
  | { phase: "closed" }
  | { noteId: string; phase: "menu" | "confirm" }
  | { note: Note; phase: "deleting" | "deleted" | "restoring"; position: MobileNotePosition }

type SheetOptions = {
  createButton: RefObject<HTMLButtonElement | null>
  noteIds: readonly string[]
  notes: readonly Note[]
  onForget(noteId: string): void
  onRemove(note: Note): Promise<Note>
  onRestore(note: Note, position: MobileNotePosition): Promise<Note>
}

export function useMobileNoteActionSheet({ createButton, noteIds, notes, onForget, onRemove, onRestore }: SheetOptions) {
  const [state, setState] = useState<SheetState>({ phase: "closed" })
  const [failure, setFailure] = useState<string | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const returnPosition = useRef<MobileNotePosition>({ nextId: null, previousId: null })
  const working = useRef(false)
  const pending = state.phase === "deleting" || state.phase === "restoring"
  let note: Note | undefined
  if ("noteId" in state) {
    note = notes.find(({ id }) => id === state.noteId)
  } else if ("note" in state) {
    note = state.note
  }

  function close() {
    if (working.current) return
    setState({ phase: "closed" })
    setFailure(null)
    requestAnimationFrame(() => {
      if (trigger.current?.isConnected) {
        trigger.current.focus()
        return
      }
      const restoredTrigger = trigger.current === null ? null : document.getElementById(trigger.current.id)
      const { nextId, previousId } = returnPosition.current
      const next = nextId === null ? null : document.getElementById(`mobile-note-actions-${nextId}`)
      const previous = previousId === null ? null : document.getElementById(`mobile-note-actions-${previousId}`)
      const target = restoredTrigger ?? next ?? previous ?? createButton.current
      target?.focus()
    })
  }

  function open(note: Note, button: HTMLButtonElement) {
    if (working.current) return
    trigger.current = button
    returnPosition.current = mobileNotePosition(noteIds, note.id)
    setFailure(null)
    setState({ noteId: note.id, phase: "menu" })
  }

  function confirmRemoval() {
    if (note === undefined || working.current) return
    setFailure(null)
    setState({ noteId: note.id, phase: "confirm" })
  }

  function cancelRemoval() {
    if (note === undefined || working.current) return
    setFailure(null)
    setState({ noteId: note.id, phase: "menu" })
  }

  async function remove() {
    if (note === undefined || working.current) return
    const target = note
    const position = mobileNotePosition(noteIds, target.id)
    working.current = true
    setFailure(null)
    setState({ note: target, phase: "deleting", position })
    try {
      const removed = await onRemove(target)
      onForget(removed.id)
      setState({ note: removed, phase: "deleted", position })
    } catch {
      setState({ noteId: target.id, phase: "confirm" })
      setFailure("메모를 삭제하지 못했습니다. 다시 시도하세요.")
    } finally {
      working.current = false
    }
  }

  async function restore() {
    if (state.phase !== "deleted" || working.current) return
    working.current = true
    setFailure(null)
    setState({ ...state, phase: "restoring" })
    try {
      await onRestore(state.note, state.position)
      setState({ noteId: state.note.id, phase: "menu" })
    } catch {
      setState(state)
      setFailure("메모를 복원하지 못했습니다. 다시 시도하세요.")
    } finally {
      working.current = false
    }
  }

  return { open, view: { cancelRemoval, close, confirmRemoval, failure, note, pending, phase: state.phase, remove, restore } }
}
