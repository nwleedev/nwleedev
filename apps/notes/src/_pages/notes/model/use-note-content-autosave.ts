"use client"

import { useCallback, useEffect, useEffectEvent, useRef, useState, type RefObject } from "react"

import { openNoteBody, savedNoteBody, type Note } from "@/entities/note"

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
  note: Note
  onContentSaved(content: string): void
  editor: RefObject<HTMLTextAreaElement | null>
  receiveNote(previous: Note, saved: Note): void
  onSave(note: Note, content: string): Promise<SaveNoteContentResult>
  readContent(): string
  saveOnExit?: boolean
}

export function useNoteContentAutosave({
  note,
  onContentSaved,
  editor,
  receiveNote,
  onSave,
  readContent,
  saveOnExit = true,
}: UseNoteContentAutosaveOptions) {
  const [state, setState] = useState(() =>
    createNoteContentSaveState(note),
  )
  const [scheduled, setScheduled] = useState(false)
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
          request.note,
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

  const receiveSavedNote = useEffectEvent((saved: Note) => {
    if (paused.current || stopped.current || stateReference.current.pendingContent !== null) return
    const previous = noteReference.current
    if (previous === saved || readContent() !== previous.content) return
    const before = savedNoteBody(previous)
    const next = openNoteBody(saved)
    if (before && next && !next.contains(before.bytes)) return
    if (saved.content !== previous.content) {
      const field = editor.current
      const range = field && next ? openNoteBody(previous)?.selectionIn(next, field.selectionStart, field.selectionEnd) : null
      const direction = field?.selectionDirection
      receiveNote(previous, saved)
      if (field && range) field.setSelectionRange(range.start, range.end, direction)
    }
    noteReference.current = saved
  })
  useEffect(() => {
    receiveSavedNote(note)
  }, [note, state, scheduled])

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
