"use client"

import type { PropsWithChildren } from "react"

import { NotesStateContext, NoteCommandsContext } from "./notes-data-context"

import {
  useNotesDataModel,
  type NotesDataDependencies,
} from "./use-notes-data-model"

export function TestNotesDataProvider({
  children,
  ...dependencies
}: PropsWithChildren<NotesDataDependencies>) {
  const { state, commands } = useNotesDataModel(dependencies)

  return (
    <NoteCommandsContext value={commands}>
      <NotesStateContext value={state}>{children}</NotesStateContext>
    </NoteCommandsContext>
  )
}
