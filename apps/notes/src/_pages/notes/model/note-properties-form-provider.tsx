"use client"

import type { PropsWithChildren } from "react"

import {
  NotePropertiesFormContext,
  useNotePropertiesFormModel,
} from "./use-note-properties-form"

export function NotePropertiesFormProvider({ children }: PropsWithChildren) {
  const form = useNotePropertiesFormModel()

  return (
    <NotePropertiesFormContext value={form}>
      {children}
    </NotePropertiesFormContext>
  )
}

export { useNotePropertiesForm } from "./use-note-properties-form"
