"use client"

import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react"

import type { NoteContentReference } from "@/entities/note"
import type { AlgorithmReference } from "@/shared/lib/algorithm-reference"

export type SelectedSourceLine = {
  lineIndex: number
  note: NoteContentReference
  textSnapshot: string
}

export type SelectedSourceLines = {
  algorithm: AlgorithmReference
  left: SelectedSourceLine
  right: SelectedSourceLine
}

type SelectedSourceLinesContextValue = {
  selection: SelectedSourceLines | null
  clear(): void
  select(selection: SelectedSourceLines): void
}

const SelectedSourceLinesContext =
  createContext<SelectedSourceLinesContextValue | null>(null)

export function SelectedSourceLinesProvider({ children }: PropsWithChildren) {
  const [selection, setSelection] = useState<SelectedSourceLines | null>(null)

  function clear() {
    setSelection(null)
  }

  return (
    <SelectedSourceLinesContext
      value={{ clear, select: setSelection, selection }}
    >
      {children}
    </SelectedSourceLinesContext>
  )
}

export function useSelectedSourceLines() {
  const context = useContext(SelectedSourceLinesContext)

  if (context === null) {
    throw new Error(
      "useSelectedSourceLines must be used within SelectedSourceLinesProvider",
    )
  }

  return context
}
