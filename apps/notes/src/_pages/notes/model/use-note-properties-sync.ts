"use client"

import { useEffect } from "react"

import {
  createNoteGeometryDraft,
  noteGeometryDraftFields,
  type Note,
  type NoteReference,
} from "@/entities/note"

import { useNotePropertiesForm } from "./use-note-properties-form"

type NotePropertiesSyncOptions = {
  notes: readonly Note[]
  target: NoteReference | null
}

export function useNotePropertiesSync({
  notes,
  target,
}: NotePropertiesSyncOptions) {
  const { getFieldState, getValues, reset } = useNotePropertiesForm()

  useEffect(() => {
    if (target === null) {
      return
    }

    const targetNote = notes.find(({ id }) => id === target.id)
    const draftChanged = noteGeometryDraftFields.some(
      (field) => getFieldState(field).isDirty,
    )
    const savedDraft = targetNote === undefined
      ? null
      : createNoteGeometryDraft(targetNote.geometry)
    const currentDraft = getValues()
    const draftMatchesSaved = savedDraft !== null &&
      noteGeometryDraftFields.every(
        (field) => currentDraft[field] === savedDraft[field],
      )

    if (savedDraft === null || draftChanged || draftMatchesSaved) {
      return
    }

    reset(savedDraft)
  }, [getFieldState, getValues, notes, reset, target])
}
