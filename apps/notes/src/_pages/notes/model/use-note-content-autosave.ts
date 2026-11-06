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
  SaveNoteContentResult,
} from "./save-note-content"

const NOTE_AUTOSAVE_DELAY_MS = 800
const MAX_RETRY_DELAY_MS = 30_000
const RETRY_DELAY_MULTIPLIER = 2

type UseNoteContentAutosaveOptions = {
  initialContent: string
  note: Note
  onContentSaved(content: string): void
  onSave(noteId: string, content: string): Promise<SaveNoteContentResult>
  readContent(): string
  saveOnExit?: boolean
}

export function useNoteContentAutosave({
  initialContent,
  note,
  onContentSaved,
  onSave,
  readContent,
  saveOnExit = true,
}: UseNoteContentAutosaveOptions) {
  const [state, setState] = useState(() =>
    createNoteContentSaveState(note, initialContent),
  )
  const [scheduled, setScheduled] = useState(initialContent !== note.content)
  const stopped = useRef(false)
  const paused = useRef(false)
  const stateReference = useRef(state)
  const noteReference = useRef(note)
  const saveReference = useRef(onSave)
  const contentSavedReference = useRef(onContentSaved)
  const retryDelay = useRef(NOTE_AUTOSAVE_DELAY_MS)
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

  const schedule = useCallback((delay: number) => {
    if (stopped.current) return
    setScheduled(true)
    if (paused.current) return
    if (timer.current !== null) {
      clearTimeout(timer.current)
    }

    timer.current = setTimeout(() => {
      timer.current = null
      void executeSaveReference.current()
    }, delay)
  }, [])

  const scheduleSave = useCallback(() => schedule(NOTE_AUTOSAVE_DELAY_MS), [schedule])

  const save = useCallback(() => {
    if (stopped.current) return Promise.resolve(null)
    if (paused.current) return pendingSave.current ?? Promise.resolve(null)
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
    if (mounted.current) {
      setScheduled(false)
    }

    if (request === null) {
      return pendingSave.current ?? Promise.resolve(started.state.note)
    }

    function retry() {
      publish(failNoteContentSave(stateReference.current))
      if (!mounted.current || stopped.current || paused.current) return
      if (timer.current !== null) return
      schedule(retryDelay.current)
      retryDelay.current = Math.min(MAX_RETRY_DELAY_MS, retryDelay.current * RETRY_DELAY_MULTIPLIER)
    }

    const operation = (async () => {
      try {
        const result = await saveReference.current(
          request.note.id,
          request.content,
        )

        if (stopped.current) return result.status === "failure" ? null : result.note

        if (result.status === "failure") {
          if (result.reason === "note-missing") {
            publish(failNoteContentSave(stateReference.current))
          } else {
            retry()
          }
          return null
        }

        retryDelay.current = NOTE_AUTOSAVE_DELAY_MS
        const completed = completeNoteContentSave(
          stateReference.current,
          result.note,
          result.draftCleanupRequired,
        )
        noteReference.current = result.note
        publish(completed)
        if (paused.current) return result.note
        const latestContent = readContentReference.current()

        if (latestContent !== result.note.content) {
          return executeSaveReference.current()
        }

        if (mounted.current) {
          contentSavedReference.current(result.note.content)
        }

        return result.note
      } catch {
        if (stopped.current) return null
        retry()
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
  }, [publish, schedule])

  const stop = useCallback(() => {
    stopped.current = true
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }, [])

  const pause = useCallback(() => {
    paused.current = true
    setScheduled(true)
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }, [])

  const resume = useCallback(() => {
    paused.current = false
    scheduleSave()
  }, [scheduleSave])

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
    readContentReference.current = readContent
  }, [readContent])

  useEffect(() => {
    executeSaveReference.current = save
  }, [save])

  useEffect(() => {
    mounted.current = true
    stopped.current = false

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

      if (saveOnExit) saveBeforeLeaving()
      else stop()
    }
  }, [saveOnExit, stop])

  return {
    pause,
    resume,
    save,
    scheduleSave,
    pending: scheduled || state.status !== "idle",
    status: state.status,
    stop,
  }
}
