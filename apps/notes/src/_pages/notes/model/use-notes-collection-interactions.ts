"use client"

import { useEffect, useRef, useState } from "react"

import type { Note } from "@/entities/note"

import type { WorkspaceNoticeInput } from "./workspace-notice"

type NotesCollectionInteractionsOptions = {
  notes: readonly Note[]
  clearSelection(): void
  clearSelections(): void
  createNote(): Promise<Note>
  select(noteId: string): void
  showNotice(notice: WorkspaceNoticeInput): void
}

function noteIdFromHash() {
  const prefix = "#note-"

  if (!window.location.hash.startsWith(prefix)) {
    return null
  }

  try {
    return decodeURIComponent(window.location.hash.slice(prefix.length))
  } catch {
    return null
  }
}

export function focusNote(noteId: string) {
  document
    .getElementById(`note-${encodeURIComponent(noteId)}-board`)
    ?.focus({ preventScroll: true })
}

export function useNotesCollectionInteractions({
  clearSelection,
  clearSelections,
  createNote,
  notes,
  select,
  showNotice,
}: NotesCollectionInteractionsOptions) {
  const createButton = useRef<HTMLButtonElement>(null)
  const handledHash = useRef<string | null>(null)
  const [commandPressed, setCommandPressed] = useState(false)
  const [creationPending, setCreationPending] = useState(false)
  const [linkedNoteId, setLinkedNoteId] = useState<string | null>(null)

  useEffect(() => {
    let frame = 0

    function focusLinkedNote() {
      const hash = window.location.hash
      const noteId = noteIdFromHash()

      if (noteId === null) {
        handledHash.current = null
        return
      }

      if (handledHash.current === hash) {
        return
      }

      const noteExists = notes.some(({ id }) => id === noteId)

      if (!noteExists) {
        return
      }

      handledHash.current = hash
      setLinkedNoteId(noteId)
      select(noteId)
      frame = requestAnimationFrame(() => {
        if (window.location.hash === hash) {
          focusNote(noteId)
        }
      })
    }

    focusLinkedNote()
    window.addEventListener("hashchange", focusLinkedNote)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("hashchange", focusLinkedNote)
    }
  }, [notes, select])

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

  async function createNoteOnce() {
    setCreationPending(true)

    try {
      return await createNote()
    } catch {
      showNotice({
        kind: "error",
        message: "메모를 만들지 못했습니다. 다시 시도하세요.",
      })
      return null
    } finally {
      setCreationPending(false)
    }
  }

  async function createNewNote() {
    const note = await createNoteOnce()

    if (note === null) {
      return
    }

    select(note.id)
    requestAnimationFrame(() => {
      document
        .getElementById(`note-${encodeURIComponent(note.id)}-content`)
        ?.focus({ preventScroll: true })
    })
  }

  async function createMobileNote() {
    await createNoteOnce()
  }

  return {
    commandPressed,
    createButton,
    createMobileNote,
    createNewNote,
    creationPending,
    linkedNoteId,
  }
}
