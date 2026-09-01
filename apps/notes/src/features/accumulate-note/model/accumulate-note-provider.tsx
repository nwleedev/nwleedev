"use client"

import {
  createContext,
  useContext,
  type PropsWithChildren,
} from "react"

import type { Note } from "@/entities/note"

import type { AccumulateNoteResult } from "./accumulate-note"

export type AccumulationRequest = {
  selectForMobile: boolean
}

type AccumulateNoteContextValue = {
  ready: boolean
  selectedItemByNote: Readonly<Record<string, string>>
  accumulate(
    note: Note,
    request: AccumulationRequest,
  ): Promise<AccumulateNoteResult>
}

const AccumulateNoteContext =
  createContext<AccumulateNoteContextValue | null>(null)

type AccumulateNoteProviderProps = PropsWithChildren<
  AccumulateNoteContextValue
>

export function AccumulateNoteProvider({
  accumulate,
  children,
  ready,
  selectedItemByNote,
}: AccumulateNoteProviderProps) {
  return (
    <AccumulateNoteContext
      value={{ accumulate, ready, selectedItemByNote }}
    >
      {children}
    </AccumulateNoteContext>
  )
}

export function useAccumulateNote() {
  const context = useContext(AccumulateNoteContext)

  if (context === null) {
    throw new Error(
      "useAccumulateNote must be used within AccumulateNoteProvider",
    )
  }

  return context
}
