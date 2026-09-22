"use client"

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { useForm } from "react-hook-form"

import type { Note } from "@/entities/note"

import type { SaveNoteContentResult } from "./save-note-content"
import { useNoteContentAutosave } from "./use-note-content-autosave"

type NoteContentFields = {
  content: string
}

type UseNoteCardEditorOptions = {
  initialContent: string
  note: Note
  onSave(noteId: string, content: string): Promise<SaveNoteContentResult>
}

export function useNoteCardEditor({
  initialContent,
  note,
  onSave,
}: UseNoteCardEditorOptions) {
  const [pointerFocused, setPointerFocused] = useState(false)
  const pointerFocusPending = useRef(false)
  const { getValues, register, reset } = useForm<NoteContentFields>({
    defaultValues: { content: initialContent },
  })

  function readContent() {
    return getValues("content")
  }

  function acceptSavedContent(savedContent: string) {
    if (readContent() === savedContent) {
      reset({ content: savedContent })
    }
  }

  const autosave = useNoteContentAutosave({
    initialContent,
    note,
    onContentSaved: acceptSavedContent,
    onSave,
    readContent,
  })
  const registration = register("content", {
    onBlur() {
      setPointerFocused(false)
      void autosave.save()
    },
    onChange() {
      autosave.scheduleSave()
    },
  })

  function markPointerFocus(event: ReactPointerEvent<HTMLTextAreaElement>) {
    const directPointer =
      event.isPrimary &&
      event.button === 0 &&
      !event.metaKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.shiftKey

    pointerFocusPending.current = directPointer
    setPointerFocused(directPointer)
  }

  function settleFocus() {
    if (!pointerFocusPending.current) {
      setPointerFocused(false)
    }

    pointerFocusPending.current = false
  }

  return {
    autosave,
    markPointerFocus,
    pointerFocused,
    readContent,
    registration,
    settleFocus,
  }
}
