"use client"

import {
  createContext,
  useContext,
  type PropsWithChildren,
} from "react"
import {
  useForm,
  type UseFormReturn,
} from "react-hook-form"

import type { NoteGeometryDraft } from "@/entities/note"

type NotePropertiesForm = UseFormReturn<NoteGeometryDraft>

const NotePropertiesFormContext =
  createContext<NotePropertiesForm | null>(null)

const emptyGeometryDraft: NoteGeometryDraft = {
  height: "",
  width: "",
  x: "",
  y: "",
}

export function NotePropertiesFormProvider({ children }: PropsWithChildren) {
  const form = useForm<NoteGeometryDraft>({
    defaultValues: emptyGeometryDraft,
  })

  return (
    <NotePropertiesFormContext value={form}>
      {children}
    </NotePropertiesFormContext>
  )
}

export function useNotePropertiesForm() {
  const form = useContext(NotePropertiesFormContext)

  if (form === null) {
    throw new Error(
      "useNotePropertiesForm must be used within NotePropertiesFormProvider",
    )
  }

  return form
}
