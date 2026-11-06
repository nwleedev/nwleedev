"use client"

import { useRef } from "react"
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
  onSave(note: Note, content: string): Promise<SaveNoteContentResult>
}

export function useNoteCardEditor({
  initialContent,
  note,
  onSave,
}: UseNoteCardEditorOptions) {
  const editor = useRef<HTMLTextAreaElement>(null)
  const { getValues, register, reset, setValue } = useForm<NoteContentFields>({
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
    editor,
    receiveNote: (_previous, saved) => setValue("content", saved.content),
    onSave,
    readContent,
  })
  const registration = register("content", {
    onBlur() {
      void autosave.save()
    },
    onChange() {
      autosave.scheduleSave()
    },
  })

  return {
    autosave,
    readContent,
    registration: {
      ...registration,
      ref(field: HTMLTextAreaElement | null) {
        registration.ref(field)
        editor.current = field
      },
    },
  }
}
