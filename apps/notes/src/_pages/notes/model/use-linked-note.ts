"use client"

import { useEffect, useRef, useState } from "react"

import type { Note } from "@/entities/note"

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

export function useLinkedNote(
  notes: readonly Note[],
  select: (noteId: string) => void,
) {
  const handledHash = useRef<string | null>(null)
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

  return linkedNoteId
}
