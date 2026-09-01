"use client"

import {
  createContext,
  useContext,
  type PropsWithChildren,
} from "react"

import type {
  AccumulatedTextItem,
  Accumulator,
} from "@/entities/accumulator"

import type { CopyAccumulatedTextResult } from "./copy-accumulated-text"
import type { EditAccumulatorResult } from "./edit-accumulated-text"

type ReadyAccumulatorContext = {
  accumulator: Accumulator
  items: readonly AccumulatedTextItem[]
  separator: string
  status: "ready"
}

type UnavailableAccumulatorContext = {
  status: "failure" | "loading"
}

type AccumulatorCommands = {
  canRedo: boolean
  canUndo: boolean
  pending: boolean
  copyAll(): Promise<CopyAccumulatedTextResult>
  moveItem(itemId: string, index: number): Promise<EditAccumulatorResult>
  redo(): Promise<EditAccumulatorResult>
  removeItem(itemId: string): Promise<EditAccumulatorResult>
  retry(): void
  undo(): Promise<EditAccumulatorResult>
}

export type EditAccumulatedTextContextValue =
  | (ReadyAccumulatorContext & AccumulatorCommands)
  | (UnavailableAccumulatorContext & AccumulatorCommands)

const EditAccumulatedTextContext =
  createContext<EditAccumulatedTextContextValue | null>(null)

type EditAccumulatedTextProviderProps = PropsWithChildren<{
  value: EditAccumulatedTextContextValue
}>

export function EditAccumulatedTextProvider({
  children,
  value,
}: EditAccumulatedTextProviderProps) {
  return (
    <EditAccumulatedTextContext value={value}>
      {children}
    </EditAccumulatedTextContext>
  )
}

export function useAccumulatedTextEditor() {
  const context = useContext(EditAccumulatedTextContext)

  if (context === null) {
    throw new Error(
      "useAccumulatedTextEditor must be used within EditAccumulatedTextProvider",
    )
  }

  return context
}
