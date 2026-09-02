"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { Note } from "@/entities/note"

import {
  beginNoteContentSave,
  completeNoteContentSave,
  createNoteContentSaveState,
  failNoteContentSave,
  updateNoteContentDraft,
  type NoteContentSaveState,
} from "./note-content-save-state"
import type { SaveNoteContentResult } from "./save-note-content"

const NOTE_AUTOSAVE_DELAY_MS = 800

type UseNoteContentAutosaveOptions = {
  initialContent: string
  note: Note
  onFailure(): void
  onSave(noteId: string, content: string): Promise<SaveNoteContentResult>
}

export function useNoteContentAutosave({
  initialContent,
  note,
  onFailure,
  onSave,
}: UseNoteContentAutosaveOptions) {
  const [state, setState] = useState(() =>
    createNoteContentSaveState(note, initialContent),
  )
  const stateReference = useRef(state)
  const noteReference = useRef(note)
  const saveReference = useRef(onSave)
  const failureReference = useRef(onFailure)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(false)
  const pendingSave = useRef<Promise<Note | null> | null>(null)
  const executeSaveReference = useRef<() => Promise<Note | null>>(
    async () => null,
  )

  const publish = useCallback((nextState: NoteContentSaveState) => {
    stateReference.current = nextState

    if (mounted.current) {
      setState(nextState)
    }
  }, [])

  const scheduleSave = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
    }

    timer.current = setTimeout(() => {
      timer.current = null
      void executeSaveReference.current()
    }, NOTE_AUTOSAVE_DELAY_MS)
  }, [])

  const save = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }

    const currentState = {
      ...stateReference.current,
      note: noteReference.current,
    }
    const started = beginNoteContentSave(currentState)
    const request = started.request
    publish(started.state)

    if (request === null) {
      return pendingSave.current ?? Promise.resolve(started.state.note)
    }

    const operation = (async () => {
      try {
        const result = await saveReference.current(
          request.note.id,
          request.content,
        )

        if (result.status === "failure") {
          publish(failNoteContentSave(stateReference.current))
          failureReference.current()
          return null
        }

        const completed = completeNoteContentSave(
          stateReference.current,
          result.note,
        )
        publish(completed)

        if (completed.status === "dirty") {
          return executeSaveReference.current()
        }

        return result.note
      } catch {
        publish(failNoteContentSave(stateReference.current))
        failureReference.current()
        return null
      }
    })()

    pendingSave.current = operation
    void operation.finally(() => {
      if (pendingSave.current === operation) {
        pendingSave.current = null
      }
    })
    return operation
  }, [publish])

  useEffect(() => {
    noteReference.current = note
  }, [note])

  useEffect(() => {
    saveReference.current = onSave
  }, [onSave])

  useEffect(() => {
    failureReference.current = onFailure
  }, [onFailure])

  useEffect(() => {
    executeSaveReference.current = save
  }, [save])

  useEffect(() => {
    mounted.current = true

    function saveBeforeLeaving() {
      void executeSaveReference.current()
    }

    function saveWhenHidden() {
      if (document.visibilityState === "hidden") {
        saveBeforeLeaving()
      }
    }

    window.addEventListener("pagehide", saveBeforeLeaving)
    document.addEventListener("visibilitychange", saveWhenHidden)

    return () => {
      mounted.current = false
      window.removeEventListener("pagehide", saveBeforeLeaving)
      document.removeEventListener("visibilitychange", saveWhenHidden)

      if (timer.current !== null) {
        clearTimeout(timer.current)
      }

      saveBeforeLeaving()
    }
  }, [])

  function change(content: string) {
    publish(updateNoteContentDraft(stateReference.current, content))
    scheduleSave()
  }

  return {
    change,
    content: state.draftContent,
    save,
    status: state.status,
  }
}
