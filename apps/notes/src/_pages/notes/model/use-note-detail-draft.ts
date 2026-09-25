"use client"

import {
  useEffect,
  useEffectEvent,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react"

import type { Note } from "@/entities/note"

import type { NoteDetailFailure } from "./note-detail-failure"

const DRAFT_SAVE_DELAY_MS = 800

type NoteDetailDraftOptions = {
  noteReference: RefObject<Note>
  readContent(): string
  saveDraft(noteId: string, content: string): Promise<void>
  setFailure: Dispatch<SetStateAction<NoteDetailFailure | null>>
}

export function useNoteDetailDraft({
  noteReference,
  readContent,
  saveDraft,
  setFailure,
}: NoteDetailDraftOptions) {
  const discardedDraft = useRef(false)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearDraftTimer() {
    if (draftTimer.current !== null) {
      clearTimeout(draftTimer.current)
      draftTimer.current = null
    }
  }

  async function storeDraft() {
    if (discardedDraft.current) {
      return
    }

    clearDraftTimer()

    try {
      await saveDraft(noteReference.current.id, readContent())
      setFailure((current) => current?.kind === "draft" ? null : current)
    } catch {
      setFailure({ kind: "draft" })
    }
  }

  async function discardDraft(noteId: string) {
    clearDraftTimer()
    discardedDraft.current = true

    try {
      await saveDraft(noteId, noteReference.current.content)
    } catch (error) {
      discardedDraft.current = false
      throw error
    }
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
      clearDraftTimer()
      saveDraftOnExit()
    }
  }, [])

  function scheduleDraft() {
    clearDraftTimer()
    draftTimer.current = setTimeout(() => {
      draftTimer.current = null
      void storeDraft()
    }, DRAFT_SAVE_DELAY_MS)
  }

  return { clearDraftTimer, discardDraft, scheduleDraft, storeDraft }
}
