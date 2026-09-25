"use client"

import type { PropsWithChildren } from "react"

import {
  NotesDataContext,
  useNotesDataModel,
  type NotesDataDependencies,
} from "./use-notes-data-model"

export function NotesDataProvider({
  children,
  ...dependencies
}: PropsWithChildren<NotesDataDependencies>) {
  const value = useNotesDataModel(dependencies)

  return <NotesDataContext value={value}>{children}</NotesDataContext>
}

export { useNotesData } from "./use-notes-data-model"
