"use client"

import type { PropsWithChildren } from "react"

import { useInteractionPreferences } from "@/entities/preference/index.browser"

import { useBrowserNoteData } from "../api/use-browser-note-data"
import { NotesStateContext, NoteCommandsContext } from "./notes-data-context"
import { useNotesDataModel } from "./use-notes-data-model"

export function NotesDataProvider({ children }: PropsWithChildren) {
  const preferences = useInteractionPreferences()
  const batchCopyShortcutEnabled = "preferences" in preferences
    ? preferences.preferences.batchCopyShortcutEnabled
    : false
  const data = useBrowserNoteData()
  const { state, commands } = useNotesDataModel({ ...data, batchCopyShortcutEnabled })

  return (
    <NoteCommandsContext value={commands}>
      <NotesStateContext value={state}>{children}</NotesStateContext>
    </NoteCommandsContext>
  )
}
