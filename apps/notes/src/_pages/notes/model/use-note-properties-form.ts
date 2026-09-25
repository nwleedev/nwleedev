import { createContext, useContext } from "react"
import { useForm, type UseFormReturn } from "react-hook-form"

import type { NoteGeometryDraft } from "@/entities/note"

type NotePropertiesForm = UseFormReturn<NoteGeometryDraft>

export const NotePropertiesFormContext =
  createContext<NotePropertiesForm | null>(null)

const emptyGeometryDraft: NoteGeometryDraft = {
  height: "",
  width: "",
  x: "",
  y: "",
}

export function useNotePropertiesFormModel() {
  return useForm<NoteGeometryDraft>({ defaultValues: emptyGeometryDraft })
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
