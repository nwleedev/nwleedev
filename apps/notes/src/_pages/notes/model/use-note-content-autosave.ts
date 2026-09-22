"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { Note } from "@/entities/note"

import {
  beginNoteContentSave,
  completeNoteContentSave,
  createNoteContentSaveState,
  failNoteContentSave,
  type NoteContentSaveState,
} from "./note-content-save-state"
import type {
  SaveNoteContentFailureReason,
  SaveNoteContentResult,
} from "./save-note-content"

const NOTE_AUTOSAVE_DELAY_MS = 800

type UseNoteContentAutosaveOptions = {
  initialContent: string
  note: Note
  onContentSaved(content: string): void
  onFailure?(reason: SaveNoteContentFailureReason): void
  onSave(noteId: string, content: string): Promise<SaveNoteContentResult>
  readContent(): string
}

export function useNoteContentAutosave({
  initialContent,
  note,
  onContentSaved,
  onFailure,
  onSave,
  readContent,
}: UseNoteContentAutosaveOptions) {
  const [state, setState] = useState(() =>
    createNoteContentSaveState(note, initialContent),
  )
  const [failureReason, setFailureReason] =
    useState<SaveNoteContentFailureReason | null>(null)
  const stateReference = useRef(state)
  const noteReference = useRef(note)
  const saveReference = useRef(onSave)
  const contentSavedReference = useRef(onContentSaved)
  const failureReference = useRef(onFailure)
  const readContentReference = useRef(readContent)
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
    const started = beginNoteContentSave(
      currentState,
      readContentReference.current(),
    )
    const request = started.request
    publish(started.state)
    setFailureReason(null)

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
          setFailureReason(result.reason)
          failureReference.current?.(result.reason)
          return null
        }

        const completed = completeNoteContentSave(
          stateReference.current,
          result.note,
          result.draftCleanupRequired,
        )
        noteReference.current = result.note
        publish(completed)
        const latestContent = readContentReference.current()

        if (latestContent !== result.note.content) {
          return executeSaveReference.current()
        }

        if (mounted.current) {
          contentSavedReference.current(result.note.content)
        }

        return result.note
      } catch {
        publish(failNoteContentSave(stateReference.current))
        setFailureReason("note-storage")
        failureReference.current?.("note-storage")
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
    contentSavedReference.current = onContentSaved
  }, [onContentSaved])

  useEffect(() => {
    failureReference.current = onFailure
  }, [onFailure])

  useEffect(() => {
    readContentReference.current = readContent
  }, [readContent])

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

  return {
    failureReason,
    save,
    scheduleSave,
    status: state.status,
  }
}
