"use client"

import { useEffect } from "react"

import {
  createNoteGeometryDraft,
  noteGeometryDraftFields,
  type Note,
  type NoteGeometryDraft,
  type NoteGeometryDraftField,
  type NoteReference,
} from "@/entities/note"

type NotePropertiesSyncOptions = {
  notes: readonly Note[]
  target: NoteReference | null
  getFieldState(field: NoteGeometryDraftField): { isDirty: boolean }
  getValues(): NoteGeometryDraft
  reset(draft: NoteGeometryDraft): void
}

export function useNotePropertiesSync({
  getFieldState,
  getValues,
  notes,
  reset,
  target,
}: NotePropertiesSyncOptions) {
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
