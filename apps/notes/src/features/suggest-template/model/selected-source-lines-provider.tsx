"use client"

import type { PropsWithChildren } from "react"

import {
  SelectedSourceLinesContext,
  useSelectedSourceLinesState,
} from "./use-selected-source-lines"

export function SelectedSourceLinesProvider({ children }: PropsWithChildren) {
  const value = useSelectedSourceLinesState()

  return (
    <SelectedSourceLinesContext value={value}>
      {children}
    </SelectedSourceLinesContext>
  )
}

export { useSelectedSourceLines } from "./use-selected-source-lines"
export type {
  SelectedSourceLine,
  SelectedSourceLines,
} from "./use-selected-source-lines"
