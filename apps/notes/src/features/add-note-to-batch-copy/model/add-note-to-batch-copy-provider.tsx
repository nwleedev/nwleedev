"use client"

import {
  createContext,
  useContext,
  type PropsWithChildren,
} from "react"

import type { Note } from "@/entities/note"

import type { AddNoteToBatchCopyResult } from "./add-note-to-batch-copy"

type AddNoteToBatchCopyContextValue = {
  ready: boolean
  add(note: Note): Promise<AddNoteToBatchCopyResult>
}

const AddNoteToBatchCopyContext =
  createContext<AddNoteToBatchCopyContextValue | null>(null)

type AddNoteToBatchCopyProviderProps = PropsWithChildren<
  AddNoteToBatchCopyContextValue
>

export function AddNoteToBatchCopyProvider({
  add,
  children,
  ready,
}: AddNoteToBatchCopyProviderProps) {
  return (
    <AddNoteToBatchCopyContext value={{ add, ready }}>
      {children}
    </AddNoteToBatchCopyContext>
  )
}

export function useAddNoteToBatchCopy() {
  const context = useContext(AddNoteToBatchCopyContext)

  if (context === null) {
    throw new Error(
      "useAddNoteToBatchCopy must be used within AddNoteToBatchCopyProvider",
    )
  }

  return context
}
