"use client"

import {
  useEffect,
  useEffectEvent,
  useRef,
  type RefObject,
} from "react"

import type { Note } from "@/entities/note"


type NoteDetailDraftOptions = {
  noteReference: RefObject<Note>
  readContent(): string
  saveDraft(noteId: string, content: string): Promise<void>
  discardStoredDraft(noteId: string): Promise<void>
}

export function useNoteDetailDraft({
  noteReference,
  readContent,
  saveDraft,
  discardStoredDraft,
}: NoteDetailDraftOptions) {
  const discardedDraft = useRef(false)
  function discardDraft(noteId: string) {
    discardedDraft.current = true
    return discardStoredDraft(noteId)
  }

  const saveDraftOnExit = useEffectEvent(() => {
    if (!discardedDraft.current) {
      void saveDraft(noteReference.current.id, readContent()).catch(
        () => undefined,
      )
    }
  })

  useEffect(() => {
    function storeDraftWhenHidden() {
      if (document.visibilityState === "hidden") {
        saveDraftOnExit()
      }
    }

    window.addEventListener("pagehide", saveDraftOnExit)
    document.addEventListener("visibilitychange", storeDraftWhenHidden)

    return () => {
      window.removeEventListener("pagehide", saveDraftOnExit)
      document.removeEventListener("visibilitychange", storeDraftWhenHidden)
      saveDraftOnExit()
    }
  }, [])

  return { discardDraft }
}
