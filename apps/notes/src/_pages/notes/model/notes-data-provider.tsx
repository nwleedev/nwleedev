"use client"

import type { PropsWithChildren } from "react"

import { useBrowserNoteData } from "../api/use-browser-note-data"
import { NotesStateContext, NoteCommandsContext } from "./notes-data-context"
import { useNotesDataModel } from "./use-notes-data-model"

type NotesDataProviderProps = PropsWithChildren<{
  batchCopyShortcutEnabled: boolean
}>

export function NotesDataProvider({
  children,
  batchCopyShortcutEnabled,
}: NotesDataProviderProps) {
  const data = useBrowserNoteData()
  const { state, commands } = useNotesDataModel({ ...data, batchCopyShortcutEnabled })

  return (
    <NoteCommandsContext value={commands}>
      <NotesStateContext value={state}>{children}</NotesStateContext>
    </NoteCommandsContext>
  )
}
